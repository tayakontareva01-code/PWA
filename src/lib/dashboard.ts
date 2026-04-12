import { CATEGORIES } from '../constants';
import type { DashboardPeriod, DashboardSummary, Expense, MonthlyRate } from '../types';
import {
  getDaysInSelectedMonth,
  getMonthKey,
  getPeriodInterval,
  getPeriodTimeMinutes
} from './date';
import { clamp01 } from './number';

export function buildDashboardSummary(
  expenses: Expense[],
  rates: MonthlyRate[],
  period: DashboardPeriod,
  selectedDate: Date
): DashboardSummary {
  const { start, end } = getPeriodInterval(period, selectedDate);
  const periodExpenses = expenses.filter((expense) => {
    const expenseDate = new Date(expense.createdAt);
    return expenseDate >= start && expenseDate <= end;
  });
  const totalPeriodMinutes = getPeriodTimeMinutes(period, selectedDate);
  const currentMonthKey = getMonthKey(selectedDate);
  const currentRate = rates.find((rate) => rate.monthKey === currentMonthKey) ?? null;
  const incomeLimit =
    period === 'week'
      ? (currentRate?.monthlyIncome ?? 0) / 4
      : period === 'day'
        ? (currentRate?.monthlyIncome ?? 0) / Math.max(1, getDaysInSelectedMonth(selectedDate))
        : period === 'year'
          ? rates
              .filter((rate) => rate.year === selectedDate.getFullYear())
              .reduce((sum, rate) => sum + rate.monthlyIncome, 0)
          : currentRate?.monthlyIncome ?? 0;
  const hourRate = currentRate?.hourRate ?? 0;

  const totals = new Map(
    CATEGORIES.map((category) => [category.id, { amount: 0, minutes: 0 }])
  );

  for (const expense of periodExpenses) {
    const current = totals.get(expense.categoryId);

    if (!current) {
      continue;
    }

    current.amount += expense.amount;
    current.minutes += expense.minutes;
  }

  const totalExpensesAmount = Array.from(totals.values()).reduce((sum, item) => sum + item.amount, 0);
  const totalMinutesSpent = Array.from(totals.values()).reduce((sum, item) => sum + item.minutes, 0);
  const spentPercent = incomeLimit > 0 ? (totalExpensesAmount / incomeLimit) * 100 : 0;

  return {
    incomeLimit,
    hourRate,
    totalExpensesAmount,
    totalMinutesSpent,
    totalPeriodMinutes,
    spentPercent,
    remainingAmount: incomeLimit - totalExpensesAmount,
    remainingMinutes: totalPeriodMinutes - totalMinutesSpent,
    remainingPercent: 100 - spentPercent,
    categories: CATEGORIES.map((category) => {
      const current = totals.get(category.id) ?? { amount: 0, minutes: 0 };
      const percent = incomeLimit > 0 ? (current.amount / incomeLimit) * 100 : 0;

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
