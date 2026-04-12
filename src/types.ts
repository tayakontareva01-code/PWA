export type CategoryId =
  | 'growth'
  | 'home'
  | 'pleasure'
  | 'finance'
  | 'spontaneity'
  | 'health';

export type DashboardMode = 'time' | 'amount' | 'percent';
export type DashboardPeriod = 'year' | 'month' | 'week' | 'day';
export type AppScreen = 'splash' | 'calculator' | 'expense' | 'dashboard';

export interface Expense {
  id?: number;
  deviceId: string;
  monthKey: string;
  year: number;
  month: number;
  amount: number;
  minutes: number;
  categoryId: CategoryId;
  createdAt: string;
  pendingSync: boolean;
  syncedAt?: string;
}

export interface MonthlyRate {
  monthKey: string;
  year: number;
  month: number;
  deviceId: string;
  monthlyIncome: number;
  hourRate: number;
  updatedAt: string;
  pendingSync: boolean;
}

export interface StoredMeta {
  key: string;
  value: string;
}

export interface CategoryDefinition {
  id: CategoryId;
  label: string;
  color: string;
  softColor: string;
}

export interface Fact {
  minMinutes: number;
  maxMinutes: number;
  text: string;
}

export interface CategorySummary extends CategoryDefinition {
  amount: number;
  minutes: number;
  percent: number;
  fillRatio: number;
}

export interface DashboardSummary {
  incomeLimit: number;
  hourRate: number;
  totalExpensesAmount: number;
  totalMinutesSpent: number;
  totalPeriodMinutes: number;
  spentPercent: number;
  remainingAmount: number;
  remainingMinutes: number;
  remainingPercent: number;
  categories: CategorySummary[];
}
