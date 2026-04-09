import { CATEGORIES } from '../constants';
import type { DashboardSummary, Expense, MonthlyRate } from '../types';
import { getMonthTimeMinutes } from './date';
import { clamp01 } from './number';

export function buildDashboardSummary(
  expenses: Expense[],
  rate: MonthlyRate | null,
  monthDate: Date
): DashboardSummary {
  const totalMonthMinutes = getMonthTimeMinutes(monthDate);
  const monthlyIncome = rate?.monthlyIncome ?? 0;
  const hourRate = rate?.hourRate ?? 0;

  const totals = new Map(
    CATEGORIES.map((category) => [category.id, { amount: 0, minutes: 0 }])
  );

  for (const expense of expenses) {
    const current = totals.get(expense.categoryId);

    if (!current) {
      continue;
    }

    current.amount += expense.amount;
    current.minutes += expense.minutes;
  }

  const totalExpensesAmount = Array.from(totals.values()).reduce((sum, item) => sum + item.amount, 0);
  const totalMinutesSpent = Array.from(totals.values()).reduce((sum, item) => sum + item.minutes, 0);
  const spentPercent = monthlyIncome > 0 ? (totalExpensesAmount / monthlyIncome) * 100 : 0;

  return {
    monthlyIncome,
    hourRate,
    totalExpensesAmount,
    totalMinutesSpent,
    totalMonthMinutes,
    spentPercent,
    remainingAmount: monthlyIncome - totalExpensesAmount,
    remainingMinutes: totalMonthMinutes - totalMinutesSpent,
    remainingPercent: 100 - spentPercent,
    categories: CATEGORIES.map((category) => {
      const current = totals.get(category.id) ?? { amount: 0, minutes: 0 };
      const percent = monthlyIncome > 0 ? (current.amount / monthlyIncome) * 100 : 0;

      return {
        ...category,
        amount: current.amount,
        minutes: current.minutes,
        percent,
        fillRatio: clamp01(percent / 100)
      };
    })
  };
}
