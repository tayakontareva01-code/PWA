import { create } from 'zustand';
import { UI_STORAGE_KEY } from '../constants';
import { db } from '../db';
import { initDeviceOnServer, syncExpensesToServer, syncRateToServer } from '../lib/api';
import { getMonthKey, getMonthDate, calculateHourlyRate } from '../lib/date';
import { ensureDeviceId } from '../lib/device';
import { parseNumberInput, toMinutesFromAmount } from '../lib/number';
import type {
  AppScreen,
  CategoryId,
  DashboardMode,
  DashboardPeriod,
  Expense,
  MonthlyRate
} from '../types';

interface UiSnapshot {
  selectedDateIso: string;
  dashboardMode: DashboardMode;
  dashboardPeriod: DashboardPeriod;
}

interface AppStore {
  isReady: boolean;
  deviceId: string;
  activeScreen: AppScreen;
  selectedDateIso: string;
  dashboardMode: DashboardMode;
  dashboardPeriod: DashboardPeriod;
  rates: MonthlyRate[];
  expenses: Expense[];
  initApp: () => Promise<void>;
  openDashboard: () => void;
  openCalculator: () => void;
  openExpense: () => void;
  closeOverlay: () => void;
  setSelectedDate: (date: Date) => void;
  setDashboardPeriod: (period: DashboardPeriod) => void;
  cycleDashboardMode: () => void;
  saveIncome: (monthlyIncomeInput: string, targetMonthDate?: Date) => Promise<boolean>;
  addExpense: (amountInput: string, categoryId: CategoryId) => Promise<boolean>;
  syncPending: () => Promise<void>;
}

function readUiSnapshot(): UiSnapshot {
  const fallback = {
    selectedDateIso: new Date().toISOString(),
    dashboardMode: 'time' as DashboardMode,
    dashboardPeriod: 'month' as DashboardPeriod
  };

  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(UI_STORAGE_KEY);

    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as Partial<UiSnapshot>;
    const legacyMonthKey = typeof parsed.selectedDateIso === 'undefined' && 'monthKey' in parsed ? (parsed as { monthKey?: string }).monthKey : undefined;
    const selectedDateIso = parsed.selectedDateIso ?? (legacyMonthKey ? getMonthDate(legacyMonthKey).toISOString() : fallback.selectedDateIso);

    return {
      selectedDateIso,
      dashboardMode:
        parsed.dashboardMode === 'amount' || parsed.dashboardMode === 'percent'
          ? parsed.dashboardMode
          : 'time',
      dashboardPeriod:
        parsed.dashboardPeriod === 'day' ||
        parsed.dashboardPeriod === 'week' ||
        parsed.dashboardPeriod === 'year'
          ? parsed.dashboardPeriod
          : 'month'
    };
  } catch {
    return fallback;
  }
}

function persistUiSnapshot(partial: Partial<UiSnapshot>) {
  if (typeof window === 'undefined') {
    return;
  }

  const next = { ...readUiSnapshot(), ...partial };
  window.localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(next));
}

function sortRates(rates: MonthlyRate[]): MonthlyRate[] {
  return [...rates].sort((left, right) => right.monthKey.localeCompare(left.monthKey));
}

function sortExpenses(expenses: Expense[]): Expense[] {
  return [...expenses].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function recalculateMonthExpenses(
  expenses: Expense[],
  monthKey: string,
  hourRate: number
): Expense[] {
  return expenses.map((expense) => {
    if (expense.monthKey !== monthKey) {
      return expense;
    }

    return {
      ...expense,
      minutes: toMinutesFromAmount(expense.amount, hourRate),
      pendingSync: true,
      syncedAt: undefined
    };
  });
}

const initialUi = readUiSnapshot();

export const useAppStore = create<AppStore>((set, get) => ({
  isReady: false,
  deviceId: '',
  activeScreen: 'splash',
  selectedDateIso: initialUi.selectedDateIso,
  dashboardMode: initialUi.dashboardMode,
  dashboardPeriod: initialUi.dashboardPeriod,
  rates: [],
  expenses: [],

  async initApp() {
    const deviceId = ensureDeviceId();
    const [rates, expenses] = await Promise.all([db.rates.toArray(), db.expenses.toArray()]);
    const currentRate = rates.find((item) => item.monthKey === getMonthKey(new Date(get().selectedDateIso)));
    const fallbackScreen: AppScreen = currentRate ? 'dashboard' : 'calculator';

    set({
      deviceId,
      rates: sortRates(rates),
      expenses: sortExpenses(expenses),
      activeScreen: fallbackScreen,
      isReady: true
    });

    void initDeviceOnServer(getMonthKey(new Date(get().selectedDateIso)));
    void get().syncPending();
  },

  openDashboard() {
    set({ activeScreen: 'dashboard' });
  },

  openCalculator() {
    set({ activeScreen: 'calculator' });
  },

  openExpense() {
    set({ activeScreen: 'expense' });
  },

  closeOverlay() {
    set({ activeScreen: 'dashboard' });
  },

  setSelectedDate(date) {
    const selectedDateIso = date.toISOString();
    set({ selectedDateIso });
    persistUiSnapshot({ selectedDateIso });
  },

  setDashboardPeriod(dashboardPeriod) {
    set({ dashboardPeriod });
    persistUiSnapshot({ dashboardPeriod });
  },

  cycleDashboardMode() {
    const current = get().dashboardMode;
    const next: DashboardMode =
      current === 'time' ? 'amount' : current === 'amount' ? 'percent' : 'time';

    set({ dashboardMode: next });
    persistUiSnapshot({ dashboardMode: next });
  },

  async saveIncome(monthlyIncomeInput, targetMonthDate) {
    const monthDate = targetMonthDate ?? new Date(get().selectedDateIso);
    const monthKey = getMonthKey(monthDate);
    const monthlyIncome = parseNumberInput(monthlyIncomeInput);
    const hourRate = calculateHourlyRate(monthlyIncome, monthDate);

    if (monthlyIncome <= 0 || hourRate <= 0) {
      return false;
    }

    const rate: MonthlyRate = {
      monthKey,
      year: monthDate.getFullYear(),
      month: monthDate.getMonth() + 1,
      deviceId: get().deviceId,
      monthlyIncome,
      hourRate,
      updatedAt: new Date().toISOString(),
      pendingSync: true
    };

    const recalculatedExpenses = recalculateMonthExpenses(get().expenses, monthKey, hourRate);
    const monthExpenses = recalculatedExpenses.filter((expense) => expense.monthKey === monthKey);

    await db.transaction('rw', db.rates, db.expenses, async () => {
      await db.rates.put(rate);

      for (const expense of monthExpenses) {
        if (!expense.id) {
          continue;
        }

        await db.expenses.put(expense);
      }
    });

    set((state) => {
      const nextExpenses = recalculateMonthExpenses(state.expenses, monthKey, hourRate);

      return {
        rates: sortRates([rate, ...state.rates.filter((item) => item.monthKey !== monthKey)]),
        expenses: sortExpenses(nextExpenses),
        activeScreen: 'dashboard'
      };
    });

    void get().syncPending();

    return true;
  },

  async addExpense(amountInput, categoryId) {
    const selectedDate = new Date(get().selectedDateIso);
    const monthKey = getMonthKey(selectedDate);
    const rate = get().rates.find((item) => item.monthKey === monthKey);
    const amount = parseNumberInput(amountInput);

    if (!rate || amount <= 0) {
      return false;
    }

    const createdAt = new Date().toISOString();
    const monthDate = getMonthDate(monthKey);

    const expense: Expense = {
      deviceId: get().deviceId,
      monthKey,
      year: monthDate.getFullYear(),
      month: monthDate.getMonth() + 1,
      amount,
      minutes: toMinutesFromAmount(amount, rate.hourRate),
      categoryId,
      createdAt,
      pendingSync: true
    };

    const id = await db.expenses.add(expense);

    set((state) => ({
      expenses: sortExpenses([{ ...expense, id }, ...state.expenses]),
      activeScreen: 'dashboard'
    }));

    void get().syncPending();

    return true;
  },

  async syncPending() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    const pendingRates = get().rates.filter((rate) => rate.pendingSync);
    const pendingExpenses = get().expenses.filter((expense) => expense.pendingSync);

    if (pendingRates.length === 0 && pendingExpenses.length === 0) {
      return;
    }

    const syncedRateKeys: string[] = [];

    for (const rate of pendingRates) {
      const synced = await syncRateToServer(rate);

      if (!synced) {
        continue;
      }

      syncedRateKeys.push(rate.monthKey);
      await db.rates.put({ ...rate, pendingSync: false });
    }

    let syncedExpenseIds: number[] = [];

    if (pendingExpenses.length > 0) {
      const synced = await syncExpensesToServer(pendingExpenses);

      if (synced) {
        syncedExpenseIds = pendingExpenses.flatMap((expense) => (expense.id ? [expense.id] : []));

        await db.transaction('rw', db.expenses, async () => {
          for (const expense of pendingExpenses) {
            if (!expense.id) {
              continue;
            }

            await db.expenses.update(expense.id, {
              pendingSync: false,
              syncedAt: new Date().toISOString()
            });
          }
        });
      }
    }

    if (syncedRateKeys.length === 0 && syncedExpenseIds.length === 0) {
      return;
    }

    set((state) => ({
      rates: sortRates(
        state.rates.map((rate) =>
          syncedRateKeys.includes(rate.monthKey) ? { ...rate, pendingSync: false } : rate
        )
      ),
      expenses: sortExpenses(
        state.expenses.map((expense) =>
          expense.id && syncedExpenseIds.includes(expense.id)
            ? { ...expense, pendingSync: false, syncedAt: new Date().toISOString() }
            : expense
        )
      )
    }));
  }
}));
