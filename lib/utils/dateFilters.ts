/**
 * Date Filter Utilities
 * Common date range presets for reports
 */

export interface DateRange {
  from: string; // ISO date string
  to: string; // ISO date string
  label: string;
}

/**
 * Get today's date range
 */
export function getTodayRange(): DateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const to = new Date(today);
  to.setHours(23, 59, 59, 999);

  return {
    from: today.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
    label: 'Today',
  };
}

/**
 * Get this week's date range (Monday to Sunday)
 */
export function getThisWeekRange(): DateRange {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
  const monday = new Date(today.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    from: monday.toISOString().split('T')[0],
    to: sunday.toISOString().split('T')[0],
    label: 'This Week',
  };
}

/**
 * Get this month's date range
 */
export function getThisMonthRange(): DateRange {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  firstDay.setHours(0, 0, 0, 0);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  lastDay.setHours(23, 59, 59, 999);

  return {
    from: firstDay.toISOString().split('T')[0],
    to: lastDay.toISOString().split('T')[0],
    label: 'This Month',
  };
}

/**
 * Get last month's date range
 */
export function getLastMonthRange(): DateRange {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  firstDay.setHours(0, 0, 0, 0);
  const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
  lastDay.setHours(23, 59, 59, 999);

  return {
    from: firstDay.toISOString().split('T')[0],
    to: lastDay.toISOString().split('T')[0],
    label: 'Last Month',
  };
}

/**
 * Get this year's date range
 */
export function getThisYearRange(): DateRange {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), 0, 1);
  firstDay.setHours(0, 0, 0, 0);
  const lastDay = new Date(today.getFullYear(), 11, 31);
  lastDay.setHours(23, 59, 59, 999);

  return {
    from: firstDay.toISOString().split('T')[0],
    to: lastDay.toISOString().split('T')[0],
    label: 'This Year',
  };
}

/**
 * Get custom date range
 */
export function getCustomRange(from: Date, to: Date): DateRange {
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
    label: 'Custom',
  };
}

/**
 * Get all preset ranges
 */
export function getPresetRanges(): DateRange[] {
  return [
    getTodayRange(),
    getThisWeekRange(),
    getThisMonthRange(),
    getLastMonthRange(),
    getThisYearRange(),
  ];
}

