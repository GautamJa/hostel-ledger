/**
 * Utility functions for billing cycles, month-end calculations,
 * and displaying whole date periods with days.
 */

/**
 * Returns the last day number (e.g. 28, 29, 30, 31) for a given YYYY-MM billing month.
 */
export function getMonthLastDay(billingMonth: string): number {
  if (!billingMonth) return 30;
  const match = billingMonth.match(/^(\d{4})-(\d{2})/);
  if (!match) return 30;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Formats a billing month (e.g. '2026-11' or '2026-11-05 to 2026-12-05') into a complete whole date period with days.
 * If already a date range with days, returns it cleanly.
 */
export function formatBillingMonthFull(billingMonth: string): string {
  if (!billingMonth) return '';
  // If it's already a full date range with days (e.g. '2026-11-05 to 2026-12-05'), preserve it
  if (billingMonth.includes(' to ')) return billingMonth;
  // If single ISO date YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(billingMonth)) {
    return billingMonth;
  }
  const match = billingMonth.match(/^(\d{4})-(\d{2})$/);
  if (!match) return billingMonth;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const startDayStr = `${match[1]}-${match[2]}-01`;
  const endDayStr = `${match[1]}-${match[2]}-${String(lastDay).padStart(2, '0')}`;
  return `${startDayStr} to ${endDayStr}`;
}

/**
 * Returns a default custom 30-day date range starting from today or a given date.
 */
export function getDefaultCustomDateRange(baseDateStr?: string): { startDate: string; endDate: string } {
  const base = baseDateStr ? new Date(baseDateStr) : new Date();
  const startYear = base.getUTCFullYear();
  const startMonth = String(base.getUTCMonth() + 1).padStart(2, '0');
  const startDay = String(base.getUTCDate()).padStart(2, '0');
  const startDate = `${startYear}-${startMonth}-${startDay}`;

  // Next month same day or 30 days later
  const nextMonthDate = new Date(Date.UTC(startYear, base.getUTCMonth() + 1, base.getUTCDate()));
  const endYear = nextMonthDate.getUTCFullYear();
  const endMonth = String(nextMonthDate.getUTCMonth() + 1).padStart(2, '0');
  const endDay = String(nextMonthDate.getUTCDate()).padStart(2, '0');
  const endDate = `${endYear}-${endMonth}-${endDay}`;

  return { startDate, endDate };
}

/**
 * Returns a future or relative month string in YYYY-MM format.
 * offsetMonths = 0: current month (e.g. '2026-11')
 * offsetMonths = 1: next month (e.g. '2026-12')
 * offsetMonths = 2: month after next (e.g. '2027-01')
 */
export function getRelativeMonthString(offsetMonths: number = 0, baseDate: Date = new Date()): string {
  const d = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() + offsetMonths, 1));
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Returns a list of upcoming months for advance fee collection:
 * Current Month, Next Month (+1), Month (+2), Month (+3)
 */
export function getUpcomingBillingMonths(count: number = 4): Array<{
  value: string;
  label: string;
  fullDate: string;
  isCurrent: boolean;
  isNext: boolean;
}> {
  const list = [];
  for (let i = 0; i < count; i++) {
    const monthStr = getRelativeMonthString(i);
    const fullDate = formatBillingMonthFull(monthStr);
    let label = monthStr;
    if (i === 0) {
      label = `${monthStr} (Current Month)`;
    } else if (i === 1) {
      label = `${monthStr} (Next Month - Advance)`;
    } else {
      label = `${monthStr} (Advance +${i} Months)`;
    }
    list.push({
      value: monthStr,
      label,
      fullDate,
      isCurrent: i === 0,
      isNext: i === 1,
    });
  }
  return list;
}
