import { isWithinInterval } from 'date-fns';
import { SPHERES } from '../constants';
import type { AggregatedSphere, Expense, PeriodMode } from '../types';
import { getIntervalForPeriod, toDate } from './date';
import { roundToOneDecimal } from './number';

export function aggregateExpenses(
  expenses: Expense[],
  mode: PeriodMode,
  anchorDate: Date
): { items: AggregatedSphere[]; totalHours: number } {
  const interval = getIntervalForPeriod(mode, anchorDate);

  const totals = new Map<string, number>();

  for (const sphere of SPHERES) {
    totals.set(sphere.id, 0);
  }

  for (const expense of expenses) {
    const createdAt = toDate(expense.createdAt);

    if (isWithinInterval(createdAt, interval)) {
      totals.set(expense.sphere, (totals.get(expense.sphere) ?? 0) + expense.hours);
    }
  }

  const totalHours = roundToOneDecimal(
    Array.from(totals.values()).reduce((sum, hours) => sum + hours, 0)
  );

  const items = SPHERES.map((sphere) => {
    const hours = roundToOneDecimal(totals.get(sphere.id) ?? 0);
    const percentage = totalHours > 0 ? roundToOneDecimal((hours / totalHours) * 100) : 0;

    return {
      ...sphere,
      hours,
      percentage
    };
  });

  return { items, totalHours };
}
