import dayjs, {Dayjs} from 'dayjs';
import calendar from 'dayjs/plugin/calendar';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import localeData from 'dayjs/plugin/localeData';
import 'dayjs/locale/zh-cn';
import {getCurrentLanguage} from '../i18n';

dayjs.extend(calendar);
dayjs.extend(advancedFormat);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(localeData);
dayjs.locale(getCurrentLanguage() === 'en' ? 'en' : 'zh-cn');

const getDayjsLocale = (): 'zh-cn' | 'en' =>
  getCurrentLanguage() === 'en' ? 'en' : 'zh-cn';

const withLocale = (date?: DateInput): Dayjs => parseDate(date).locale(getDayjsLocale());

export type DateInput = string | number | Date | Dayjs | null | undefined;
export type DateUnit =
  | 'day'
  | 'week'
  | 'month'
  | 'year'
  | 'hour'
  | 'minute'
  | 'second';

export const parseDate = (date?: DateInput): Dayjs => {
  return date ? dayjs(date) : dayjs();
};

export const now = (): Dayjs => dayjs();

export const formatDate = (
  date?: DateInput,
  format: string = 'YYYY-MM-DD',
): string => {
  return withLocale(date).format(format);
};

export const getCurrentYear = (): number => dayjs().year();

export const getCurrentMonthName = (): string => dayjs().locale(getDayjsLocale()).format('MMMM');

export const getYear = (date: DateInput): number => parseDate(date).year();

export const getMonthName = (date: DateInput): string =>
  withLocale(date).format('MMMM');

export const getDayOfMonth = (date: DateInput): number =>
  parseDate(date).date();

export const getDayOfWeek = (date: DateInput): number => parseDate(date).day();

export const getMonthNames = (): string[] => dayjs().locale(getDayjsLocale()).localeData().months();
export const getMonthNamesShort = (): string[] => dayjs().locale(getDayjsLocale()).localeData().monthsShort();
export const getWeekdayNames = (): string[] => dayjs().locale(getDayjsLocale()).localeData().weekdays();
export const getWeekdayShortNames = (): string[] => dayjs().locale(getDayjsLocale()).localeData().weekdaysShort();
export const getWeekdayNamesMin = (): string[] => dayjs().locale(getDayjsLocale()).localeData().weekdaysMin();

export const getDaysInMonth = (year: number, month: string): number => {
  const monthIndex = dayjs().month(getMonthIndex(month)).month();
  return dayjs().year(year).month(monthIndex).daysInMonth();
};

export const getMonthIndex = (monthName: string): number => {
  const monthNames = getMonthNames();
  const localizedIndex = monthNames.findIndex(m => m.toLowerCase() === monthName.toLowerCase());
  if (localizedIndex >= 0) {
    return localizedIndex;
  }

  const fallbackLocales: Array<'zh-cn' | 'en'> = ['zh-cn', 'en'];
  for (const locale of fallbackLocales) {
    const names = dayjs().locale(locale).localeData().months();
    const index = names.findIndex(m => m.toLowerCase() === monthName.toLowerCase());
    if (index >= 0) {
      return index;
    }
  }
  return new Date().getMonth();
};

export const getMonthNumber = (monthName: string): string => {
  const index = getMonthIndex(monthName);
  return String(index + 1).padStart(2, '0');
};

export const isSameDate = (
  date1: DateInput,
  date2: DateInput,
  unit: DateUnit = 'day',
): boolean => {
  return parseDate(date1).isSame(parseDate(date2), unit);
};

export const diffDates = (
  date1: DateInput,
  date2: DateInput,
  unit: DateUnit = 'day',
): number => {
  return parseDate(date1).diff(parseDate(date2), unit);
};

export const subtractFromDate = (
  date: DateInput,
  amount: number,
  unit: DateUnit,
): Dayjs => {
  return parseDate(date).subtract(amount, unit);
};

export const addToDate = (
  date: DateInput,
  amount: number,
  unit: DateUnit,
): Dayjs => {
  return parseDate(date).add(amount, unit);
};

export const getYesterday = (): Dayjs => dayjs().subtract(1, 'day');

export const formatCalendar = (date: DateInput): string => {
  const language = getCurrentLanguage();
  if (language === 'en') {
    return withLocale(date).calendar(null, {
      sameDay: '[Today]',
      nextDay: '[Tomorrow]',
      nextWeek: 'dddd',
      lastDay: '[Yesterday]',
      lastWeek: '[Last] dddd',
      sameElse: 'MMM D, YYYY',
    });
  }

  return withLocale(date).calendar(null, {
    sameDay: '[今天]',
    nextDay: '[明天]',
    nextWeek: 'dddd',
    lastDay: '[昨天]',
    lastWeek: '[上]dddd',
    sameElse: 'YYYY年M月D日',
  });
};

export const getFirstDayOfMonth = (year: number, month: string): number => {
  const monthNum = getMonthNumber(month);
  return dayjs(`${year}-${monthNum}-01`).day();
};

export const createDateString = (
  year: number,
  month: string,
  day: number,
): string => {
  return dayjs(`${year}-${month}-${day}`, 'YYYY-MMM-D').format('YYYY-MM-DD');
};

export const getTimestamp = (): string => {
  return dayjs().format('YYYYMMDDHHmmss');
};

export const getISODateTime = (): string => {
  return dayjs().format('YYYY-MM-DDTHH:mm:ss');
};

export const sortByDateDesc = <T extends {date: DateInput}>(
  items: T[],
): T[] => {
  return [...items].sort((a, b) => diffDates(b.date, a.date));
};

export const sortByDateAsc = <T extends {date: DateInput}>(items: T[]): T[] => {
  return [...items].sort((a, b) => diffDates(a.date, b.date));
};

export default {
  now,
  parseDate,
  formatDate,
  getCurrentYear,
  getCurrentMonthName,
  getYear,
  getMonthName,
  getDayOfMonth,
  getDayOfWeek,
  getMonthNames,
  getMonthNamesShort,
  getWeekdayNames,
  getWeekdayShortNames,
  getWeekdayNamesMin,
  getDaysInMonth,
  getMonthIndex,
  getMonthNumber,
  isSameDate,
  diffDates,
  subtractFromDate,
  addToDate,
  getYesterday,
  formatCalendar,
  getFirstDayOfMonth,
  createDateString,
  getTimestamp,
  getISODateTime,
  sortByDateDesc,
  sortByDateAsc,
};
