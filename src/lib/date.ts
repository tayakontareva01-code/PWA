import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  getDaysInMonth,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek
} from 'date-fns';
import { ru } from 'date-fns/locale';
import type { IncomeSettings, PeriodMode } from '../types';
import { roundToOneDecimal } from './number';

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function toDate(value: string | Date): Date {
  return value instanceof Date ? value : parseISO(value);
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

  if (isSameMonth(start, end)) {
    return `${format(start, 'd', { locale: ru })}-${format(end, 'd MMMM yyyy', {
      locale: ru
    })}`;
  }

  return `${format(start, 'd MMM', { locale: ru })} - ${format(end, 'd MMM yyyy', {
    locale: ru
  })}`;
}

export function getIntervalForPeriod(mode: PeriodMode, anchorDate: Date): {
  start: Date;
  end: Date;
} {
  if (mode === 'day') {
    return {
      start: startOfDay(anchorDate),
      end: endOfDay(anchorDate)
    };
  }

  if (mode === 'week') {
    return {
      start: startOfWeek(anchorDate, { weekStartsOn: 1 }),
      end: endOfWeek(anchorDate, { weekStartsOn: 1 })
    };
  }

  return {
    start: startOfMonth(anchorDate),
    end: endOfMonth(anchorDate)
  };
}

export function shiftDateByMode(date: Date, mode: PeriodMode, direction: 1 | -1): Date {
  if (mode === 'day') {
    return addDays(date, direction);
  }

  if (mode === 'week') {
    return addWeeks(date, direction);
  }

  return addMonths(date, direction);
}

export function toMonthInputValue(date: Date): string {
  return format(date, 'yyyy-MM');
}

export function toDayInputValue(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function parseMonthInputValue(value: string): Date {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, 1);
}

export function parseDayInputValue(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

export function getDaysInCurrentMonth(date: Date): number {
  return getDaysInMonth(date);
}

export function calculateHourlyRate(
  settings: Pick<IncomeSettings, 'monthlyIncome' | 'hoursPerDay'> | null,
  date: Date
): number {
  if (!settings || settings.monthlyIncome <= 0 || settings.hoursPerDay <= 0) {
    return 0;
  }

  const totalHoursInMonth = getDaysInMonth(date) * settings.hoursPerDay;

  if (totalHoursInMonth <= 0) {
    return 0;
  }

  return roundToOneDecimal(settings.monthlyIncome / totalHoursInMonth);
}
