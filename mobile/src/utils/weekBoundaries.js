// src/utils/weekBoundaries.js
// Centralized Thursday-to-Wednesday week boundary calculations
// Business Rule: The business trading week starts on THURSDAY and ends on WEDNESDAY.

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Parses year and month from arguments.
 * Accepts:
 *   (year, month) where month is 1-12
 *   ("2026-09")
 *   (new Date())
 * @returns {{ year: number, month: number }} month is 1-indexed (1 to 12)
 */
export const parseYearMonth = (yearOrKey, month) => {
  if (typeof yearOrKey === 'string' && yearOrKey.includes('-')) {
    const parts = yearOrKey.split('-');
    return {
      year: parseInt(parts[0], 10),
      month: parseInt(parts[1], 10),
    };
  }
  if (yearOrKey instanceof Date) {
    return {
      year: yearOrKey.getFullYear(),
      month: yearOrKey.getMonth() + 1,
    };
  }
  const y = Number(yearOrKey) || new Date().getFullYear();
  let m = Number(month);
  if (isNaN(m) || m < 1) m = 1;
  return { year: y, month: m };
};

/**
 * Computes the Thursday-to-Wednesday week blocks for a given month.
 *
 * Algorithm:
 * - A standard week runs Thursday -> Wednesday (7 days).
 * - If the 1st of the month is NOT Thursday:
 *   The 1st week is a partial week from day 1 to the day before the first Thursday.
 * - Subsequent weeks run Thursday to the following Wednesday (or end of month).
 * - The last week may be partial if the month ends before Wednesday.
 *
 * @param {number|string|Date} yearOrMonthKey - Year number or "YYYY-MM" string or Date
 * @param {number} [monthNum] - 1-indexed month number (1 to 12) if year passed as first param
 * @returns {Array<{
 *   weekNum: number,
 *   startDay: number,
 *   endDay: number,
 *   label: string,
 *   dateRange: string,
 *   isPartial: boolean,
 * }>}
 */
export const getWeeksInMonth = (yearOrMonthKey, monthNum) => {
  const { year, month } = parseYearMonth(yearOrMonthKey, monthNum);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const monthShort = MONTH_NAMES_SHORT[month - 1] || '';

  // Determine day-of-month of the first Thursday
  let firstThursday;
  if (firstDayOfWeek === 4) {
    firstThursday = 1;
  } else if (firstDayOfWeek < 4) {
    firstThursday = 1 + (4 - firstDayOfWeek);
  } else {
    firstThursday = 1 + (11 - firstDayOfWeek);
  }

  const weeks = [];
  let weekNum = 1;

  // Partial first week (if month doesn't start on Thursday)
  if (firstThursday > 1) {
    const endDay = firstThursday - 1;
    weeks.push({
      weekNum: weekNum++,
      startDay: 1,
      endDay,
      label: `Week 1`,
      dateRange: `${1} - ${endDay} ${monthShort}`,
      isPartial: true,
    });
  }

  // Full and trailing partial weeks starting on Thursdays
  let curStart = firstThursday;
  while (curStart <= daysInMonth) {
    const curEnd = Math.min(curStart + 6, daysInMonth);
    const isPartial = curEnd - curStart < 6;
    const currentWeekNum = weekNum++;
    weeks.push({
      weekNum: currentWeekNum,
      startDay: curStart,
      endDay: curEnd,
      label: `Week ${currentWeekNum}`,
      dateRange: `${curStart} - ${curEnd} ${monthShort}`,
      isPartial,
    });
  }

  return weeks;
};

/**
 * Finds the week object that contains a specific day of the month.
 * @param {Array<Object>} weeks
 * @param {number} day - 1-31
 * @returns {Object|null}
 */
export const findWeekForDay = (weeks, day) => {
  if (!Array.isArray(weeks) || weeks.length === 0) return null;
  const numDay = Number(day);
  return weeks.find((w) => numDay >= w.startDay && numDay <= w.endDay) || weeks[0];
};

/**
 * Defensive fallback to get startDay and endDay for a weekNum within a month.
 * Used when navigation params are missing or directly opened.
 * @param {string|number} monthKeyOrYear
 * @param {number} weekNum
 * @returns {{ startDay: number, endDay: number }}
 */
export const getWeekFallback = (monthKeyOrYear, weekNum) => {
  try {
    const weeks = getWeeksInMonth(monthKeyOrYear);
    const target = weeks.find((w) => w.weekNum === Number(weekNum));
    if (target) {
      return { startDay: target.startDay, endDay: target.endDay };
    }
    if (weeks.length > 0) {
      return { startDay: weeks[0].startDay, endDay: weeks[0].endDay };
    }
  } catch (e) {
    console.warn('Error computing week fallback:', e);
  }
  return { startDay: 1, endDay: 31 };
};

export default {
  getWeeksInMonth,
  findWeekForDay,
  getWeekFallback,
  parseYearMonth,
};
