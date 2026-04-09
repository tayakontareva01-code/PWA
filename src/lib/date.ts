import { format, getDaysInMonth } from 'date-fns';
import { ru } from 'date-fns/locale';

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

export function toMonthInputValue(date: Date): string {
  return format(date, 'yyyy-MM');
}

export function getDaysInSelectedMonth(date: Date): number {
  return getDaysInMonth(date);
}

export function getMonthTimeMinutes(date: Date): number {
  return getDaysInSelectedMonth(date) * 24 * 60;
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
