interface Tab {
  id: string;
  label: string;
  icon?: any;
  count?: number;
}

interface TabGroupProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  size?: 'sm' | 'md';
}

/**
 * Standardized pill-style tab group used across all CDE Manager pages.
 * Replaces inconsistent border-b and pill styles with one consistent component.
 */
export default function TabGroup({ tabs, activeTab, onChange, size = 'md' }: TabGroupProps) {
  const containerClass = size === 'sm'
    ? 'bg-slate-100 rounded-lg p-0.5 inline-flex gap-0.5'
    : 'bg-slate-100 rounded-lg p-1 inline-flex gap-1';

  const tabClass = (isActive: boolean) => {
    const base = size === 'sm'
      ? 'px-3 py-1 text-xs font-medium rounded-md transition-all duration-150'
      : 'px-4 py-2 text-sm font-medium rounded-md transition-all duration-150';

    return isActive
      ? `${base} bg-white text-[#14261C] shadow-sm`
      : `${base} text-[#4E5652] hover:text-[#14261C] hover:bg-white/50`;
  };

  return (
    <div className={containerClass}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={tabClass(activeTab === tab.id)}
          >
            <span className="flex items-center gap-1.5">
              {Icon && <Icon size={size === 'sm' ? 14 : 16} />}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id
                    ? 'bg-[#1BAE70]/10 text-[#06752E]'
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
