import { HardDrive, AlertTriangle, XCircle, ArrowUpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { calculateStorageUsage, formatStorageSize, type StorageUsage } from '../../lib/entitlements';

interface StorageMeterProps {
  /** Current usage in megabytes */
  usedMb: number;
  /** Limit in gigabytes (null = unlimited) */
  limitGb: number | null;
  /** Compact mode for sidebars and small spaces */
  compact?: boolean;
  /** Show upgrade CTA when storage is high */
  showUpgradeCta?: boolean;
}

export default function StorageMeter({ usedMb, limitGb, compact = false, showUpgradeCta = true }: StorageMeterProps) {
  if (limitGb === null) {
    // Unlimited storage — show simple usage display
    return compact ? null : (
      <div className="flex items-center gap-2 text-xs text-[#4E5652]">
        <HardDrive size={14} className="text-[#1BAE70]" />
        <span>{formatStorageSize(usedMb * 1024 * 1024)} used</span>
      </div>
    );
  }

  const usage = calculateStorageUsage(usedMb, limitGb);
  const usedDisplay = formatStorageSize(usedMb * 1024 * 1024);
  const limitDisplay = `${limitGb} GB`;

  const barColor =
    usage.tier === 'exceeded' ? 'bg-red-500' :
    usage.tier === 'critical' ? 'bg-red-500' :
    usage.tier === 'warning' ? 'bg-amber-500' :
    'bg-[#1BAE70]';

  const textColor =
    usage.tier === 'exceeded' ? 'text-red-700' :
    usage.tier === 'critical' ? 'text-red-600' :
    usage.tier === 'warning' ? 'text-amber-600' :
    'text-[#4E5652]';

  if (compact) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px]">
          <span className={textColor}>
            {usedDisplay} / {limitDisplay}
          </span>
          <span className={`font-medium ${textColor}`}>{usage.percentage}%</span>
        </div>
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.min(usage.percentage, 100)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDrive size={16} className={
            usage.tier === 'exceeded' || usage.tier === 'critical' ? 'text-red-500' :
            usage.tier === 'warning' ? 'text-amber-500' :
            'text-[#1BAE70]'
          } />
          <span className="text-sm font-medium text-[#14261C]">Storage</span>
        </div>
        <span className={`text-sm font-medium ${textColor}`}>
          {usedDisplay} / {limitDisplay}
        </span>
      </div>

      {/* Bar */}
      <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(usage.percentage, 100)}%` }}
        />
      </div>

      {/* Percentage + status */}
      <div className="flex items-center justify-between text-xs">
        <span className={textColor}>{usage.percentage}% used</span>
        {usage.percentage < 70 && (
          <span className="text-[#4E5652]">{formatStorageSize((limitGb * 1024 - usedMb) * 1024 * 1024)} remaining</span>
        )}
      </div>

      {/* Alerts */}
      {usage.tier === 'warning' && (
        <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg mt-1">
          <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-amber-800">Storage reaching limit</p>
            <p className="text-[11px] text-amber-700">You&apos;re using {usage.percentage}% of your storage. Consider upgrading or cleaning up unused files.</p>
          </div>
        </div>
      )}

      {usage.tier === 'critical' && (
        <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg mt-1">
          <XCircle size={14} className="text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-red-800">Storage almost full</p>
            <p className="text-[11px] text-red-700">You&apos;re using {usage.percentage}% of your storage. Uploads may fail soon.</p>
          </div>
        </div>
      )}

      {usage.tier === 'exceeded' && (
        <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg mt-1">
          <XCircle size={14} className="text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-red-800">Storage limit exceeded</p>
            <p className="text-[11px] text-red-700">New uploads are blocked. Please upgrade your plan or remove unused files.</p>
          </div>
        </div>
      )}

      {/* Upgrade CTA */}
      {showUpgradeCta && (usage.tier === 'warning' || usage.tier === 'critical' || usage.tier === 'exceeded') && (
        <Link
          to="/plans"
          className="flex items-center justify-center gap-1.5 mt-1 py-2 bg-[#1BAE70] text-white text-xs font-medium rounded-lg hover:bg-[#06752E] transition-colors"
        >
          <ArrowUpCircle size={14} />
          Upgrade Plan
        </Link>
      )}
    </div>
  );
}
