import { create } from 'zustand';
import { DEFAULT_HOURS_PER_DAY, UI_STORAGE_KEY } from '../constants';
import { db } from '../db';
import { calculateHourlyRate } from '../lib/date';
import { parseNumberInput, roundToOneDecimal } from '../lib/number';
import type { Expense, IncomeSettings, PeriodMode, SphereId } from '../types';

type SheetMode = 'entry' | 'calculator' | null;

interface UIStateSnapshot {
  periodMode: PeriodMode;
  anchorDate: string;
}

interface AppStore {
  expenses: Expense[];
  incomeSettings: IncomeSettings | null;
  periodMode: PeriodMode;
  anchorDate: string;
  activeSheet: SheetMode;
  isReady: boolean;
  loadAppData: () => Promise<void>;
  addExpense: (amountInput: string, sphere: SphereId) => Promise<boolean>;
  saveIncomeSettings: (monthlyIncomeInput: string, hoursPerDayInput: string) => Promise<boolean>;
  openEntry: () => void;
  openCalculator: () => void;
  closeSheet: () => void;
  setPeriodMode: (mode: PeriodMode) => void;
  setAnchorDate: (date: Date) => void;
  shiftAnchorDate: (direction: 1 | -1) => void;
}

function readUiSnapshot(): UIStateSnapshot {
  if (typeof window === 'undefined') {
    return { periodMode: 'month', anchorDate: new Date().toISOString() };
  }

  try {
    const raw = window.localStorage.getItem(UI_STORAGE_KEY);

    if (!raw) {
      return { periodMode: 'month', anchorDate: new Date().toISOString() };
    }

    const parsed = JSON.parse(raw) as Partial<UIStateSnapshot>;

    return {
      periodMode: parsed.periodMode === 'day' || parsed.periodMode === 'week' ? parsed.periodMode : 'month',
      anchorDate: parsed.anchorDate ?? new Date().toISOString()
    };
  } catch {
    return { periodMode: 'month', anchorDate: new Date().toISOString() };
  }
}

function persistUiSnapshot(partial: Partial<UIStateSnapshot>) {
  if (typeof window === 'undefined') {
    return;
  }

  const current = readUiSnapshot();
  const next = { ...current, ...partial };
  window.localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(next));
}

const initialUi = readUiSnapshot();

export const useAppStore = create<AppStore>((set, get) => ({
  expenses: [],
  incomeSettings: null,
  periodMode: initialUi.periodMode,
  anchorDate: initialUi.anchorDate,
  activeSheet: 'entry',
  isReady: false,
  async loadAppData() {
    const [expenses, storedSettings] = await Promise.all([
      db.expenses.toArray(),
      db.settings.get('incomeSettings')
    ]);

    set({
      expenses,
      incomeSettings: storedSettings?.value ?? null,
      activeSheet: 'entry',
      isReady: true
    });
  },
  async addExpense(amountInput, sphere) {
    const settings = get().incomeSettings;
    const amount = parseNumberInput(amountInput);
    const createdAt = new Date();
    const hourlyRateAtExpenseTime = calculateHourlyRate(settings, createdAt);

    if (!settings || amount <= 0 || hourlyRateAtExpenseTime <= 0) {
      return false;
    }

    const expense: Expense = {
      amount: roundToOneDecimal(amount),
      hours: roundToOneDecimal(amount / hourlyRateAtExpenseTime),
      sphere,
      createdAt: createdAt.toISOString(),
      hourlyRateAtExpenseTime
    };

    const id = await db.expenses.add(expense);

    set((state) => ({
      expenses: [...state.expenses, { ...expense, id }],
      activeSheet: null,
      anchorDate: createdAt.toISOString()
    }));

    persistUiSnapshot({ anchorDate: createdAt.toISOString() });

    return true;
  },
  async saveIncomeSettings(monthlyIncomeInput, hoursPerDayInput) {
    const monthlyIncome = parseNumberInput(monthlyIncomeInput);
    const hoursPerDay =
      hoursPerDayInput.trim() === ''
        ? DEFAULT_HOURS_PER_DAY
        : parseNumberInput(hoursPerDayInput);

    if (monthlyIncome <= 0 || hoursPerDay <= 0) {
      return false;
    }

    const value: IncomeSettings = {
      monthlyIncome: roundToOneDecimal(monthlyIncome),
      hoursPerDay: roundToOneDecimal(hoursPerDay),
      updatedAt: new Date().toISOString()
    };

    await db.settings.put({ key: 'incomeSettings', value });

    set({ incomeSettings: value, activeSheet: null });

    return true;
  },
  openEntry() {
    set({ activeSheet: 'entry' });
  },
  openCalculator() {
    set({ activeSheet: 'calculator' });
  },
  closeSheet() {
    set({ activeSheet: null });
  },
  setPeriodMode(mode) {
    set({ periodMode: mode });
    persistUiSnapshot({ periodMode: mode });
  },
  setAnchorDate(date) {
    const iso = date.toISOString();
    set({ anchorDate: iso });
    persistUiSnapshot({ anchorDate: iso });
  },
  shiftAnchorDate(direction) {
    const currentDate = new Date(get().anchorDate);
    const mode = get().periodMode;
    const nextDate =
      mode === 'day'
        ? new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + direction, 12)
        : mode === 'week'
          ? new Date(
              currentDate.getFullYear(),
              currentDate.getMonth(),
              currentDate.getDate() + direction * 7,
              12
            )
          : new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1, 12);

    const iso = nextDate.toISOString();
    set({ anchorDate: iso });
    persistUiSnapshot({ anchorDate: iso });
  }
}));
