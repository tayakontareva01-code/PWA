import { create } from 'zustand';
import { UI_STORAGE_KEY } from '../constants';
import { db } from '../db';
import { initDeviceOnServer, syncExpensesToServer, syncRateToServer } from '../lib/api';
import { getMonthKey, getMonthDate, calculateHourlyRate } from '../lib/date';
import { ensureDeviceId } from '../lib/device';
import { parseNumberInput, toMinutesFromAmount } from '../lib/number';
import type { AppScreen, CategoryId, DashboardMode, Expense, MonthlyRate } from '../types';

interface UiSnapshot {
  monthKey: string;
  dashboardMode: DashboardMode;
}

interface AppStore {
  isReady: boolean;
  deviceId: string;
  activeScreen: AppScreen;
  selectedMonthKey: string;
  dashboardMode: DashboardMode;
  rates: MonthlyRate[];
  expenses: Expense[];
  initApp: () => Promise<void>;
  openDashboard: () => void;
  openCalculator: () => void;
  openExpense: () => void;
  closeOverlay: () => void;
  setSelectedMonthKey: (monthKey: string) => void;
  cycleDashboardMode: () => void;
  saveIncome: (monthlyIncomeInput: string) => Promise<boolean>;
  addExpense: (amountInput: string, categoryId: CategoryId) => Promise<boolean>;
  syncPending: () => Promise<void>;
}

function readUiSnapshot(): UiSnapshot {
  const fallback = {
    monthKey: getMonthKey(new Date()),
    dashboardMode: 'time' as DashboardMode
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

    return {
      monthKey: parsed.monthKey ?? fallback.monthKey,
      dashboardMode:
        parsed.dashboardMode === 'amount' || parsed.dashboardMode === 'percent'
          ? parsed.dashboardMode
          : 'time'
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

const initialUi = readUiSnapshot();

export const useAppStore = create<AppStore>((set, get) => ({
  isReady: false,
  deviceId: '',
  activeScreen: 'splash',
  selectedMonthKey: initialUi.monthKey,
  dashboardMode: initialUi.dashboardMode,
  rates: [],
  expenses: [],

  async initApp() {
    const deviceId = ensureDeviceId();
    const [rates, expenses] = await Promise.all([db.rates.toArray(), db.expenses.toArray()]);
    const currentRate = rates.find((item) => item.monthKey === get().selectedMonthKey);
    const fallbackScreen: AppScreen = currentRate ? 'dashboard' : 'calculator';

    set({
      deviceId,
      rates: sortRates(rates),
      expenses: sortExpenses(expenses),
      activeScreen: fallbackScreen,
      isReady: true
    });

    void initDeviceOnServer(get().selectedMonthKey);
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

  setSelectedMonthKey(monthKey) {
    set({ selectedMonthKey: monthKey });
    persistUiSnapshot({ monthKey });
  },

  cycleDashboardMode() {
    const current = get().dashboardMode;
    const next: DashboardMode =
      current === 'time' ? 'amount' : current === 'amount' ? 'percent' : 'time';

    set({ dashboardMode: next });
    persistUiSnapshot({ dashboardMode: next });
  },

  async saveIncome(monthlyIncomeInput) {
    const monthKey = get().selectedMonthKey;
    const monthDate = getMonthDate(monthKey);
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

    await db.rates.put(rate);

    set((state) => ({
      rates: sortRates([rate, ...state.rates.filter((item) => item.monthKey !== monthKey)]),
      activeScreen: 'dashboard'
    }));

    void get().syncPending();

    return true;
  },

  async addExpense(amountInput, categoryId) {
    const monthKey = get().selectedMonthKey;
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
