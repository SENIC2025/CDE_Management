import { useState, useEffect } from 'react';
import { Plus, MessageSquare, AlertCircle, Send, FileText, CheckCircle, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useProject } from '../contexts/ProjectContext';
import SearchBar from '../components/SearchBar';
import MessageCard, { type Message } from '../components/messages/MessageCard';
import AddMessageModal from '../components/messages/AddMessageModal';
import MessageEditPanel from '../components/messages/MessageEditPanel';
import { PageHeader, PageSkeleton, ConfirmDialog, CopyLinkButton, ShareButton } from '../components/ui';
import useConfirm from '../hooks/useConfirm';
import useDeepLink from '../hooks/useDeepLink';

export default function Messages() {
  const { currentProject } = useProject();
  const [confirmProps, confirm] = useConfirm();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  // Deep link support: ?view=<messageId>
  const { openItem, closeItem, copyDeepLink } = useDeepLink({
    items: messages,
    onOpen: setEditingMessage,
    onClose: () => setEditingMessage(null),
    loading,
  });

  // Map of objective ID → title for displaying linked objectives
  const [objectiveTitles, setObjectiveTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (currentProject) {
      loadMessages();
      loadObjectiveTitles();
    }
  }, [currentProject]);

  const loadMessages = async () => {
    if (!currentProject) return;

    try {
      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from('messages')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      // Normalize the data to ensure linked_objective_ids is always an array
      const normalized = (data || []).map(msg => ({
        ...msg,
        linked_objective_ids: Array.isArray(msg.linked_objective_ids) ? msg.linked_objective_ids : [],
      }));

      setMessages(normalized);
    } catch (err: any) {
      console.error('[Messages] Error loading messages:', err);
      setError(err?.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const loadObjectiveTitles = async () => {
    if (!currentProject) return;
    try {
      const { data } = await supabase
        .from('project_objectives')
        .select('id, title')
        .eq('project_id', currentProject.id);

      if (data) {
        const titleMap: Record<string, string> = {};
        data.forEach(obj => { titleMap[obj.id] = obj.title; });
        setObjectiveTitles(titleMap);
      }
    } catch (err) {
      console.error('[Messages] Error loading objective titles:', err);
    }
  };

  const handleDelete = async (messageId: string) => {
    const ok = await confirm({ title: 'Delete message?', message: 'This message will be permanently removed. This cannot be undone.' });
    if (!ok) return;

    try {
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (deleteError) throw deleteError;
      await loadMessages();
    } catch (err: any) {
      console.error('[Messages] Error deleting message:', err);
      alert('Failed to delete message');
    }
  };

  const filteredMessages = messages.filter(msg => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesTitle = msg.title.toLowerCase().includes(term);
      const matchesBody = msg.body?.toLowerCase().includes(term);
      const matchesValue = msg.value_proposition?.toLowerCase().includes(term);
      if (!matchesTitle && !matchesBody && !matchesValue) return false;
    }

    if (domainFilter && msg.domain !== domainFilter) return false;
    if (statusFilter && msg.status !== statusFilter) return false;

    return true;
  });

  const stats = {
    total: messages.length,
    published: messages.filter(m => m.status === 'published').length,
    approved: messages.filter(m => m.status === 'approved').length,
    draft: messages.filter(m => m.status === 'draft').length,
    byDomain: {
      communication: messages.filter(m => m.domain === 'communication').length,
      dissemination: messages.filter(m => m.domain === 'dissemination').length,
      exploitation: messages.filter(m => m.domain === 'exploitation').length,
    }
  };

  if (!currentProject) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Select a project to manage messages</p>
      </div>
    );
  }

  if (loading && messages.length === 0) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={MessageSquare}
        title="Messages & Value Library"
        subtitle="Create and manage key messages, value propositions, and link them to your CDE objectives"
        actions={
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-[#1BAE70] text-white px-4 py-2.5 rounded-lg hover:bg-[#06752E] font-medium transition-colors"
          >
            <Plus size={18} />
            New Message
          </button>
        }
      />

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm text-red-800 mb-2">{error}</div>
            <button
              onClick={loadMessages}
              className="text-sm text-red-700 font-medium hover:text-red-800 underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total</span>
            <MessageSquare className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Published</span>
            <Send className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-600">{stats.published}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Approved</span>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">In Review</span>
            <Eye className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{messages.filter(m => m.status === 'review').length}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Drafts</span>
            <FileText className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
        </div>
      </div>

      {/* Domain breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-6">
          <span className="text-sm font-medium text-gray-500">By domain:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-400"></span>
            <span className="text-sm text-gray-700">Communication <span className="font-semibold">{stats.byDomain.communication}</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
            <span className="text-sm text-gray-700">Dissemination <span className="font-semibold">{stats.byDomain.dissemination}</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-400"></span>
            <span className="text-sm text-gray-700">Exploitation <span className="font-semibold">{stats.byDomain.exploitation}</span></span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search messages..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Domain</label>
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Domains</option>
              <option value="communication">Communication</option>
              <option value="dissemination">Dissemination</option>
              <option value="exploitation">Exploitation</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="review">In Review</option>
              <option value="approved">Approved</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>
        {(searchTerm || domainFilter || statusFilter) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setDomainFilter('');
              setStatusFilter('');
            }}
            className="mt-3 text-sm text-blue-600 hover:text-blue-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Message List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredMessages.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          {messages.length === 0 ? (
            <>
              <p className="text-gray-700 font-medium mb-2">No messages yet</p>
              <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
                Start by creating key messages for each CDE domain. Link them to your objectives
                and target audiences for a complete messaging strategy.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-5 h-5" />
                <span>Create your first message</span>
              </button>
            </>
          ) : (
            <p className="text-gray-600">No messages match your filters</p>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredMessages.map((message) => (
            <MessageCard
              key={message.id}
              message={message}
              objectiveTitles={objectiveTitles}
              onEdit={() => openItem(message)}
              onDelete={() => handleDelete(message.id)}
            />
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddMessageModal
          projectId={currentProject.id}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadMessages();
            loadObjectiveTitles();
          }}
        />
      )}

      {/* Edit Panel */}
      {editingMessage && (
        <MessageEditPanel
          projectId={currentProject.id}
          message={editingMessage}
          onClose={closeItem}
          onUpdate={() => {
            closeItem();
            loadMessages();
            loadObjectiveTitles();
          }}
          deepLinkActions={
            <div className="flex items-center gap-2">
              <CopyLinkButton itemId={editingMessage.id} onCopy={copyDeepLink} />
              <ShareButton
                entityType="message"
                entityId={editingMessage.id}
                projectId={currentProject.id}
                entityTitle={editingMessage.title}
              />
            </div>
          }
        />
      )}
      <ConfirmDialog {...confirmProps} />
    </div>
  );
}
