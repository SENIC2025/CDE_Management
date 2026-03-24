import { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Bell,
  BellOff,
  Settings
} from 'lucide-react';

interface ReportingPeriod {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
}

interface ScheduledCheck {
  id: string;
  periodId: string;
  periodLabel: string;
  scheduledDate: string;
  status: 'upcoming' | 'due' | 'overdue' | 'completed';
  score?: number;
  issuesCount?: number;
}

interface CheckHistory {
  checkId: string;
  checkedAt: string;
  status: string;
  issuesCount: number;
  score: number;
}

interface ComplianceCalendarProps {
  periods: ReportingPeriod[];
  history: CheckHistory[];
  lastCheckDate: string | null;
  onRunCheck: () => void;
  running: boolean;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// How many days before period end to schedule checks
const CHECK_OFFSETS = [
  { daysBefore: 30, label: 'Early check' },
  { daysBefore: 14, label: 'Mid-period check' },
  { daysBefore: 3, label: 'Final check' }
];

export default function ComplianceCalendar({
  periods,
  history,
  lastCheckDate,
  onRunCheck,
  running
}: ComplianceCalendarProps) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [showSettings, setShowSettings] = useState(false);
  const [reminderDays, setReminderDays] = useState([30, 14, 3]);
  const [remindersEnabled, setRemindersEnabled] = useState(true);

  // Generate scheduled checks from reporting periods
  const scheduledChecks = useMemo(() => {
    const checks: ScheduledCheck[] = [];
    const todayStr = today.toISOString().split('T')[0];
    const completedDates = new Set(
      history.map(h => h.checkedAt.split('T')[0])
    );

    periods.forEach(period => {
      const endDate = new Date(period.end_date);

      reminderDays.forEach((daysBefore, idx) => {
        const checkDate = new Date(endDate);
        checkDate.setDate(checkDate.getDate() - daysBefore);
        const checkDateStr = checkDate.toISOString().split('T')[0];

        // Find if a check was run on or near this date (within 2 days)
        const nearbyCheck = history.find(h => {
          const hDate = h.checkedAt.split('T')[0];
          const diff = Math.abs(new Date(hDate).getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24);
          return diff <= 2;
        });

        let status: ScheduledCheck['status'] = 'upcoming';
        if (nearbyCheck) {
          status = 'completed';
        } else if (checkDateStr < todayStr) {
          status = 'overdue';
        } else if (checkDateStr === todayStr) {
          status = 'due';
        }

        checks.push({
          id: `${period.id}-${idx}`,
          periodId: period.id,
          periodLabel: period.label,
          scheduledDate: checkDateStr,
          status,
          score: nearbyCheck?.score,
          issuesCount: nearbyCheck?.issuesCount
        });
      });
    });

    return checks.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  }, [periods, history, reminderDays]);

  // Calendar grid for the current view month
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);

    // Adjust to start on Monday
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;

    const days: Array<{
      date: Date;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      checks: ScheduledCheck[];
      periodHighlight: ReportingPeriod | null;
    }> = [];

    // Fill from previous month
    for (let i = startDay - 1; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth, -i);
      days.push({
        date: d,
        dayNum: d.getDate(),
        isCurrentMonth: false,
        isToday: false,
        checks: [],
        periodHighlight: null
      });
    }

    // Current month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(viewYear, viewMonth, d);
      const dateStr = date.toISOString().split('T')[0];
      const isToday = dateStr === today.toISOString().split('T')[0];

      const dayChecks = scheduledChecks.filter(c => c.scheduledDate === dateStr);
      const activePeriod = periods.find(p => p.start_date <= dateStr && p.end_date >= dateStr) || null;

      days.push({
        date,
        dayNum: d,
        isCurrentMonth: true,
        isToday,
        checks: dayChecks,
        periodHighlight: activePeriod
      });
    }

    // Fill to end of grid (complete weeks)
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const date = new Date(viewYear, viewMonth + 1, d);
        days.push({
          date,
          dayNum: d,
          isCurrentMonth: false,
          isToday: false,
          checks: [],
          periodHighlight: null
        });
      }
    }

    return days;
  }, [viewYear, viewMonth, scheduledChecks, periods]);

  // Upcoming checks (next 60 days)
  const upcomingChecks = useMemo(() => {
    const todayStr = today.toISOString().split('T')[0];
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 60);
    const futureStr = futureDate.toISOString().split('T')[0];

    return scheduledChecks.filter(c =>
      (c.status === 'upcoming' || c.status === 'due' || c.status === 'overdue') &&
      c.scheduledDate <= futureStr
    );
  }, [scheduledChecks]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  function goToToday() {
    setViewMonth(today.getMonth());
    setViewYear(today.getFullYear());
  }

  const statusIcon = (status: ScheduledCheck['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'overdue': return <XCircle className="h-3 w-3 text-red-600" />;
      case 'due': return <AlertTriangle className="h-3 w-3 text-amber-600" />;
      default: return <Clock className="h-3 w-3 text-blue-500" />;
    }
  };

  const statusColor = (status: ScheduledCheck['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 border-green-300 text-green-800';
      case 'overdue': return 'bg-red-100 border-red-300 text-red-800';
      case 'due': return 'bg-amber-100 border-amber-300 text-amber-800';
      default: return 'bg-blue-50 border-blue-200 text-blue-700';
    }
  };

  // Count stats
  const overdueCount = scheduledChecks.filter(c => c.status === 'overdue').length;
  const dueCount = scheduledChecks.filter(c => c.status === 'due').length;
  const completedCount = scheduledChecks.filter(c => c.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
            <Calendar className="h-4 w-4" />
            Reporting Periods
          </div>
          <div className="text-2xl font-bold text-slate-900">{periods.length}</div>
          <div className="text-xs text-slate-500 mt-1">configured</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm text-green-700 mb-1">
            <CheckCircle className="h-4 w-4" />
            Completed
          </div>
          <div className="text-2xl font-bold text-green-700">{completedCount}</div>
          <div className="text-xs text-slate-500 mt-1">checks done</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm text-amber-700 mb-1">
            <AlertTriangle className="h-4 w-4" />
            Due Today
          </div>
          <div className="text-2xl font-bold text-amber-700">{dueCount}</div>
          <div className="text-xs text-slate-500 mt-1">need attention</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm text-red-700 mb-1">
            <XCircle className="h-4 w-4" />
            Overdue
          </div>
          <div className="text-2xl font-bold text-red-700">{overdueCount}</div>
          <div className="text-xs text-slate-500 mt-1">missed checks</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <ChevronLeft className="h-5 w-5 text-slate-600" />
              </button>
              <h3 className="text-lg font-semibold text-slate-900 min-w-[180px] text-center">
                {MONTHS[viewMonth]} {viewYear}
              </h3>
              <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <ChevronRight className="h-5 w-5 text-slate-600" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                title="Calendar settings"
              >
                <Settings className="h-4 w-4 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-700">Check Schedule</span>
                <button
                  onClick={() => setRemindersEnabled(!remindersEnabled)}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-full transition-colors ${
                    remindersEnabled
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {remindersEnabled ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
                  {remindersEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              <div className="text-xs text-slate-600 space-y-2">
                <p>Checks are auto-scheduled relative to each reporting period's end date:</p>
                <div className="flex flex-wrap gap-2">
                  {CHECK_OFFSETS.map((offset, idx) => (
                    <span key={idx} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs">
                      {offset.daysBefore} days before &mdash; {offset.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {DAYS.map(day => (
              <div key={day} className="p-2 text-center text-xs font-medium text-slate-500 uppercase">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => (
              <div
                key={idx}
                className={`min-h-[80px] p-1.5 border-b border-r border-slate-100 ${
                  !day.isCurrentMonth ? 'bg-slate-50' : ''
                } ${day.isToday ? 'bg-blue-50' : ''} ${
                  day.periodHighlight ? 'bg-gradient-to-b from-indigo-50/40 to-transparent' : ''
                }`}
              >
                <div className={`text-xs mb-1 ${
                  day.isToday
                    ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold'
                    : day.isCurrentMonth
                      ? 'text-slate-700 font-medium'
                      : 'text-slate-400'
                }`}>
                  {day.dayNum}
                </div>

                {/* Checks on this day */}
                {day.checks.map(check => (
                  <div
                    key={check.id}
                    className={`mb-0.5 px-1.5 py-0.5 rounded border text-[10px] leading-tight flex items-center gap-1 ${statusColor(check.status)}`}
                    title={`${check.periodLabel} — ${check.status}`}
                  >
                    {statusIcon(check.status)}
                    <span className="truncate">{check.periodLabel}</span>
                  </div>
                ))}

                {/* Period end marker */}
                {day.isCurrentMonth && periods.some(p => p.end_date === day.date.toISOString().split('T')[0]) && (
                  <div className="px-1.5 py-0.5 rounded bg-indigo-100 border border-indigo-300 text-[10px] text-indigo-700 font-medium">
                    Period end
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="p-3 border-t border-slate-200 flex flex-wrap gap-3 text-[11px] text-slate-600">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-50 border border-blue-200"></div>
              Upcoming
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-amber-100 border border-amber-300"></div>
              Due today
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-100 border border-red-300"></div>
              Overdue
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
              Completed
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-indigo-100 border border-indigo-300"></div>
              Period end
            </div>
          </div>
        </div>

        {/* Upcoming Checks Sidebar */}
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Upcoming Checks</h3>
            <p className="text-xs text-slate-500 mt-0.5">Next 60 days</p>
          </div>

          {upcomingChecks.length === 0 ? (
            <div className="p-6 text-center">
              <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <div className="text-sm text-slate-600">All checks completed</div>
              <div className="text-xs text-slate-500 mt-1">No pending checks in the next 60 days</div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcomingChecks.map(check => {
                const checkDate = new Date(check.scheduledDate);
                const daysUntil = Math.ceil(
                  (checkDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                );

                return (
                  <div key={check.id} className="p-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        {statusIcon(check.status)}
                        <span className="text-sm font-medium text-slate-900">
                          {check.periodLabel}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        check.status === 'overdue'
                          ? 'bg-red-100 text-red-700'
                          : check.status === 'due'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}>
                        {check.status === 'overdue'
                          ? `${Math.abs(daysUntil)} days overdue`
                          : check.status === 'due'
                            ? 'Due today'
                            : `In ${daysUntil} days`
                        }
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {checkDate.toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </div>

                    {(check.status === 'due' || check.status === 'overdue') && (
                      <button
                        onClick={onRunCheck}
                        disabled={running}
                        className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        <Play className="h-3 w-3" />
                        Run Check Now
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Period Summary */}
          {periods.length > 0 && (
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <div className="text-xs font-medium text-slate-700 mb-2">Reporting Periods</div>
              <div className="space-y-1.5">
                {periods.map(period => {
                  const todayStr = today.toISOString().split('T')[0];
                  const isActive = period.start_date <= todayStr && period.end_date >= todayStr;
                  const isPast = period.end_date < todayStr;

                  return (
                    <div key={period.id} className="flex items-center justify-between text-xs">
                      <span className={`font-medium ${isActive ? 'text-blue-700' : isPast ? 'text-slate-400' : 'text-slate-600'}`}>
                        {period.label}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded ${
                        isActive ? 'bg-blue-100 text-blue-700' : isPast ? 'bg-slate-100 text-slate-400' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isActive ? 'Active' : isPast ? 'Past' : 'Upcoming'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
