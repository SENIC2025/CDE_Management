import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../contexts/ProjectContext';
import { Plus, Radio, Search, AlertCircle, RefreshCw, Megaphone } from 'lucide-react';
import { PageHeader, PageSkeleton, ConfirmDialog, CopyLinkButton, ShareButton } from '../components/ui';
import useConfirm from '../hooks/useConfirm';
import useDeepLink from '../hooks/useDeepLink';
import ChannelCard, { type Channel } from '../components/channels/ChannelCard';
import CampaignCard, { type Campaign } from '../components/channels/CampaignCard';
import AddChannelModal from '../components/channels/AddChannelModal';
import AddCampaignModal from '../components/channels/AddCampaignModal';
import ChannelEditPanel from '../components/channels/ChannelEditPanel';
import CampaignEditPanel from '../components/channels/CampaignEditPanel';
import ChannelEffectiveness from '../components/ChannelEffectiveness';

export default function Channels() {
  const { currentProject } = useProject();
  const [confirmProps, confirm] = useConfirm();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [activeTab, setActiveTab] = useState<'channels' | 'campaigns'>('channels');

  // Modals & panels
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [showAddCampaign, setShowAddCampaign] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  // Deep link support: ?view=<channelId>
  const { openItem: openChannel, closeItem: closeChannel, copyDeepLink: copyChannelLink } = useDeepLink({
    items: channels,
    onOpen: setEditingChannel,
    onClose: () => setEditingChannel(null),
    loading,
  });

  // Deep link for campaigns: ?campaign=<campaignId>
  const { openItem: openCampaign, closeItem: closeCampaign, copyDeepLink: copyCampaignLink } = useDeepLink({
    items: campaigns,
    onOpen: setEditingCampaign,
    onClose: () => setEditingCampaign(null),
    loading,
    paramName: 'campaign',
  });

  // Linked activity counts per channel
  const [linkedActivityCounts, setLinkedActivityCounts] = useState<Record<string, number>>({});

  // Name maps for campaign linked entities
  const [objectiveTitles, setObjectiveTitles] = useState<Record<string, string>>({});
  const [channelNameMap, setChannelNameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (currentProject) {
      loadAll();
      loadEntityNames();
    }
  }, [currentProject]);

  async function loadEntityNames() {
    const [objRes, chRes] = await Promise.all([
      supabase.from('project_objectives').select('id, title').eq('project_id', currentProject!.id),
      supabase.from('channels').select('id, name').eq('project_id', currentProject!.id),
    ]);
    if (objRes.data) {
      const map: Record<string, string> = {};
      objRes.data.forEach(o => { map[o.id] = o.title; });
      setObjectiveTitles(map);
    }
    if (chRes.data) {
      const map: Record<string, string> = {};
      chRes.data.forEach(c => { map[c.id] = c.name; });
      setChannelNameMap(map);
    }
  }

  async function loadAll() {
    try {
      setLoading(true);
      setError(null);
      const [chRes, campRes] = await Promise.all([
        supabase.from('channels').select('*').eq('project_id', currentProject!.id).order('created_at', { ascending: false }),
        supabase.from('campaigns').select('*').eq('project_id', currentProject!.id).order('created_at', { ascending: false }),
      ]);
      if (chRes.error) throw chRes.error;
      if (campRes.error) throw campRes.error;
      setChannels(chRes.data || []);
      setCampaigns(campRes.data || []);
      loadLinkedActivityCounts(chRes.data || []);
    } catch (err: any) {
      console.error('[Channels] Error loading:', err);
      setError(err.message || 'Failed to load channels');
    } finally {
      setLoading(false);
    }
  }

  async function loadLinkedActivityCounts(channelList: Channel[]) {
    if (channelList.length === 0) return;
    try {
      const { data: activities } = await supabase
        .from('activities')
        .select('channel_ids')
        .eq('project_id', currentProject!.id)
        .is('deleted_at', null);
      if (!activities) return;

      const counts: Record<string, number> = {};
      for (const act of activities) {
        const ids = act.channel_ids || [];
        if (Array.isArray(ids)) {
          for (const id of ids) {
            counts[id] = (counts[id] || 0) + 1;
          }
        }
      }
      setLinkedActivityCounts(counts);
    } catch {
      // Non-critical — just won't show counts
    }
  }

  async function handleDeleteChannel(id: string) {
    const ok = await confirm({ title: 'Delete channel?', message: 'This channel will be permanently removed. This cannot be undone.' });
    if (!ok) return;
    const { error } = await supabase.from('channels').delete().eq('id', id);
    if (!error) {
      setChannels(prev => prev.filter(c => c.id !== id));
    }
  }

  async function handleDeleteCampaign(id: string) {
    const ok = await confirm({ title: 'Delete campaign?', message: 'This campaign will be permanently removed. This cannot be undone.' });
    if (!ok) return;
    const { error } = await supabase.from('campaigns').delete().eq('id', id);
    if (!error) {
      setCampaigns(prev => prev.filter(c => c.id !== id));
    }
  }

  async function handleCampaignStatusChange(campaignId: string, newStatus: string) {
    const { error } = await supabase
      .from('campaigns')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', campaignId);
    if (!error) {
      setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: newStatus } : c));
    }
  }

  // Filters
  const filteredChannels = channels.filter(c => {
    const matchesSearch = !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase()) || (c.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || c.type === filterType;
    return matchesSearch && matchesType;
  });

  const filteredCampaigns = campaigns.filter(c => {
    return !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase()) || (c.description || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Stats
  const totalChannels = channels.length;
  const totalCampaigns = campaigns.length;
  const avgFitScore = totalChannels > 0
    ? Math.round((channels.reduce((sum, c) => sum + (c.audience_fit_score || 0), 0) / totalChannels) * 10) / 10
    : 0;
  const totalLinkedActivities = Object.values(linkedActivityCounts).reduce((sum, c) => sum + c, 0);

  // Type breakdown
  const typeCounts: Record<string, number> = {};
  channels.forEach(c => { typeCounts[c.type] = (typeCounts[c.type] || 0) + 1; });

  const typeColors: Record<string, string> = {
    website: 'bg-blue-500',
    social: 'bg-purple-500',
    newsletter: 'bg-green-500',
    event: 'bg-orange-500',
    press: 'bg-red-500',
  };
  const typeLabels: Record<string, string> = {
    website: 'Website',
    social: 'Social Media',
    newsletter: 'Newsletter',
    event: 'Event',
    press: 'Press',
  };

  if (!currentProject) {
    return (
      <div className="text-center py-12">
        <Radio className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600">Select a project to manage channels</p>
      </div>
    );
  }

  if (loading && channels.length === 0) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Radio}
        title="Channels & Campaigns"
        subtitle="Manage communication channels and track campaigns"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddCampaign(true)}
              className="flex items-center gap-2 bg-white text-[#14261C] border border-slate-300 px-4 py-2.5 rounded-lg hover:bg-slate-50 font-medium transition-colors"
            >
              <Plus size={18} />
              Campaign
            </button>
            <button
              onClick={() => setShowAddChannel(true)}
              className="flex items-center gap-2 bg-[#1BAE70] text-white px-4 py-2.5 rounded-lg hover:bg-[#06752E] font-medium transition-colors"
            >
              <Plus size={18} />
              Channel
            </button>
          </div>
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Channels</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalChannels}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Avg. Audience Fit</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{avgFitScore}/10</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Campaigns</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{totalCampaigns}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Linked Activities</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalLinkedActivities}</p>
        </div>
      </div>

      {/* Type Breakdown Bar */}
      {totalChannels > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <span className="text-sm font-medium text-gray-700 mb-2 block">Channel Type Distribution</span>
          <div className="flex rounded-full overflow-hidden h-3 bg-gray-100">
            {Object.entries(typeCounts).map(([type, count]) => (
              <div
                key={type}
                className={typeColors[type] || 'bg-gray-400'}
                style={{ width: `${(count / totalChannels) * 100}%` }}
                title={`${typeLabels[type] || type}: ${count}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {Object.entries(typeCounts).map(([type, count]) => (
              <div key={type} className="flex items-center gap-1.5 text-xs text-gray-600">
                <div className={`w-2.5 h-2.5 rounded-full ${typeColors[type] || 'bg-gray-400'}`} />
                <span>{typeLabels[type] || type}: {count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Channel Effectiveness (existing component) */}
      <ChannelEffectiveness />

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('channels')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'channels' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Radio className="w-4 h-4 inline mr-1.5" />
          Channels ({totalChannels})
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'campaigns' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Megaphone className="w-4 h-4 inline mr-1.5" />
          Campaigns ({totalCampaigns})
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="relative col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={activeTab === 'channels' ? 'Search channels...' : 'Search campaigns...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          {activeTab === 'channels' && (
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Types</option>
              <option value="website">Website</option>
              <option value="social">Social Media</option>
              <option value="newsletter">Newsletter</option>
              <option value="event">Event</option>
              <option value="press">Press</option>
            </select>
          )}
          {activeTab === 'campaigns' && (
            <div /> // Spacer to keep grid
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-700">{error}</span>
          </div>
          <button onClick={loadAll} className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium">
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading channels...</p>
        </div>
      )}

      {/* Channels Tab */}
      {!loading && !error && activeTab === 'channels' && (
        <>
          {filteredChannels.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Radio className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {channels.length === 0 ? 'No channels yet' : 'No matching channels'}
              </h3>
              <p className="text-gray-500 mb-4 max-w-md mx-auto">
                {channels.length === 0
                  ? 'Add your communication channels — websites, social media accounts, newsletters, events, and press contacts. These link to your activities for effectiveness analysis.'
                  : 'Try adjusting your search or type filter.'}
              </p>
              {channels.length === 0 && (
                <button
                  onClick={() => setShowAddChannel(true)}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Add Your First Channel
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredChannels.map(channel => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  linkedActivityCount={linkedActivityCounts[channel.id] || 0}
                  onEdit={() => openChannel(channel)}
                  onDelete={() => handleDeleteChannel(channel.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Campaigns Tab */}
      {!loading && !error && activeTab === 'campaigns' && (
        <>
          {filteredCampaigns.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {campaigns.length === 0 ? 'No campaigns yet' : 'No matching campaigns'}
              </h3>
              <p className="text-gray-500 mb-4 max-w-md mx-auto">
                {campaigns.length === 0
                  ? 'Create campaigns to group related activities and track them over time.'
                  : 'Try adjusting your search.'}
              </p>
              {campaigns.length === 0 && (
                <button
                  onClick={() => setShowAddCampaign(true)}
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Create Your First Campaign
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCampaigns.map(campaign => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  objectiveTitles={objectiveTitles}
                  channelNames={channelNameMap}
                  onEdit={() => openCampaign(campaign)}
                  onDelete={() => handleDeleteCampaign(campaign.id)}
                  onStatusChange={(newStatus) => handleCampaignStatusChange(campaign.id, newStatus)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Add Channel Modal */}
      {showAddChannel && (
        <AddChannelModal
          projectId={currentProject.id}
          onClose={() => setShowAddChannel(false)}
          onCreated={loadAll}
        />
      )}

      {/* Add Campaign Modal */}
      {showAddCampaign && (
        <AddCampaignModal
          projectId={currentProject.id}
          onClose={() => setShowAddCampaign(false)}
          onCreated={loadAll}
        />
      )}

      {/* Edit Panels */}
      {editingChannel && (
        <ChannelEditPanel
          channel={editingChannel}
          onClose={closeChannel}
          onUpdate={() => { closeChannel(); loadAll(); }}
          deepLinkActions={
            <div className="flex items-center gap-2">
              <CopyLinkButton itemId={editingChannel.id} onCopy={copyChannelLink} />
              <ShareButton
                entityType="channel"
                entityId={editingChannel.id}
                projectId={currentProject.id}
                entityTitle={editingChannel.name}
              />
            </div>
          }
        />
      )}

      {editingCampaign && (
        <CampaignEditPanel
          projectId={currentProject.id}
          campaign={editingCampaign}
          onClose={closeCampaign}
          onUpdate={() => { closeCampaign(); loadAll(); }}
          deepLinkActions={
            <div className="flex items-center gap-2">
              <CopyLinkButton itemId={editingCampaign.id} onCopy={copyCampaignLink} />
              <ShareButton
                entityType="campaign"
                entityId={editingCampaign.id}
                projectId={currentProject.id}
                entityTitle={editingCampaign.name}
              />
            </div>
          }
        />
      )}
      <ConfirmDialog {...confirmProps} />
    </div>
  );
}
