import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  getDaysInMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear
} from 'date-fns';
import { ru } from 'date-fns/locale';
import type { DashboardPeriod } from '../types';

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getMonthKey(date: Date): string {
  return format(date, 'yyyy-MM');
}

export function getMonthDate(monthKey: string): Date {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, 1, 12);
}

export function formatMonthLabel(date: Date): string {
  return capitalize(format(date, 'LLLL yyyy', { locale: ru }));
}

export function formatDayLabel(date: Date): string {
  return capitalize(format(date, 'd MMMM yyyy', { locale: ru }));
}

export function formatWeekLabel(date: Date): string {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });

  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${format(start, 'd', { locale: ru })}-${format(end, 'd MMMM yyyy', { locale: ru })}`;
  }

  return `${format(start, 'd MMM', { locale: ru })} - ${format(end, 'd MMM yyyy', { locale: ru })}`;
}

export function formatYearLabel(date: Date): string {
  return format(date, 'yyyy');
}

export function formatPeriodLabel(period: DashboardPeriod, date: Date): string {
  switch (period) {
    case 'day':
      return formatDayLabel(date);
    case 'week':
      return formatWeekLabel(date);
    case 'year':
      return formatYearLabel(date);
    case 'month':
    default:
      return formatMonthLabel(date);
  }
}

export function toMonthInputValue(date: Date): string {
  return format(date, 'yyyy-MM');
}

export function getDaysInSelectedMonth(date: Date): number {
  return getDaysInMonth(date);
}

export function getMonthTimeMinutes(date: Date): number {
  return getDaysInSelectedMonth(date) * 24 * 60;
}

export function getWeekTimeMinutes(date: Date): number {
  return Math.floor(getMonthTimeMinutes(date) / 4);
}

export function getDayTimeMinutes(date: Date): number {
  return Math.floor(getMonthTimeMinutes(date) / getDaysInSelectedMonth(date));
}

export function getYearTimeMinutes(date: Date): number {
  const year = date.getFullYear();
  let total = 0;

  for (let month = 0; month < 12; month += 1) {
    total += getMonthTimeMinutes(new Date(year, month, 1, 12));
  }

  return total;
}

export function getPeriodTimeMinutes(period: DashboardPeriod, date: Date): number {
  switch (period) {
    case 'day':
      return getDayTimeMinutes(date);
    case 'week':
      return getWeekTimeMinutes(date);
    case 'year':
      return getYearTimeMinutes(date);
    case 'month':
    default:
      return getMonthTimeMinutes(date);
  }
}

export function calculateHourlyRate(monthlyIncome: number, date: Date): number {
  const hoursInMonth = getDaysInSelectedMonth(date) * 24;

  if (monthlyIncome <= 0 || hoursInMonth <= 0) {
    return 0;
  }

  return monthlyIncome / hoursInMonth;
}

export function shiftMonth(monthKey: string, offset: number): string {
  const date = getMonthDate(monthKey);
  return getMonthKey(new Date(date.getFullYear(), date.getMonth() + offset, 1, 12));
}

export function getPeriodInterval(period: DashboardPeriod, date: Date): { start: Date; end: Date } {
  switch (period) {
    case 'day':
      return {
        start: startOfDay(date),
        end: endOfDay(date)
      };
    case 'week':
      return {
        start: startOfWeek(date, { weekStartsOn: 1 }),
        end: endOfWeek(date, { weekStartsOn: 1 })
      };
    case 'year':
      return {
        start: startOfYear(date),
        end: endOfYear(date)
      };
    case 'month':
    default:
      return {
        start: startOfMonth(date),
        end: endOfMonth(date)
      };
  }
}
