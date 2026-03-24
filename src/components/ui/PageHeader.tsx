import { ReactNode } from 'react';

interface PageHeaderProps {
  icon: any;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

/**
 * Branded page header used across all CDE Manager pages.
 * Provides consistent visual identity with SENIC accent bar.
 */
export default function PageHeader({ icon: Icon, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#1BAE70]/10">
            <Icon size={22} className="text-[#1BAE70]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#14261C]">{title}</h1>
            {subtitle && (
              <p className="text-sm text-[#4E5652] mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
        )}
      </div>
      <div className="mt-3 h-0.5 bg-gradient-to-r from-[#1BAE70] via-[#1BAE70]/40 to-transparent rounded-full" />
    </div>
  );
}
