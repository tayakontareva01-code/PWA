export type SphereId =
  | 'health'
  | 'growth'
  | 'home'
  | 'pleasure'
  | 'finance'
  | 'chaos';

export type PeriodMode = 'month' | 'week' | 'day';

export interface Expense {
  id?: number;
  amount: number;
  hours: number;
  sphere: SphereId;
  createdAt: string;
  hourlyRateAtExpenseTime: number;
}

export interface IncomeSettings {
  monthlyIncome: number;
  hoursPerDay: number;
  updatedAt: string;
}

export interface StoredSetting<T> {
  key: string;
  value: T;
}

export interface SphereDefinition {
  id: SphereId;
  label: string;
  color: string;
  tint: string;
}

export interface AggregatedSphere {
  id: SphereId;
  label: string;
  color: string;
  tint: string;
  hours: number;
  percentage: number;
}
