import { create } from 'zustand';
import { UI_STORAGE_KEY } from '../constants';
import { db } from '../db';
import { initDeviceOnServer } from '../lib/api';
import { calculateHourlyRate, getMonthDate, getMonthKey } from '../lib/date';
import { ensureDeviceId } from '../lib/device';
import { parseNumberInput, toMinutesFromAmount } from '../lib/number';
import {
  deleteSupabaseProfileData,
  fetchSupabaseExpenses,
  fetchSupabaseRates,
  isEmailValid,
  loadSupabaseProfile,
  supabase,
  upsertSupabaseProfile,
  upsertSupabaseExpenses,
  upsertSupabaseRate
} from '../lib/supabase';
import type {
  AppScreen,
  CategoryId,
  DashboardMode,
  DashboardPeriod,
  Expense,
  MonthlyRate,
  UserProfile
} from '../types';

const SESSION_PROFILE_META_KEY = 'sessionProfileId';

interface UiSnapshot {
  selectedDateIso: string;
  dashboardMode: DashboardMode;
  dashboardPeriod: DashboardPeriod;
}

interface AuthResult {
  ok: boolean;
  error?: string;
}

interface AppStore {
  isReady: boolean;
  deviceId: string;
  activeScreen: AppScreen;
  selectedDateIso: string;
  dashboardMode: DashboardMode;
  dashboardPeriod: DashboardPeriod;
  currentUser: UserProfile | null;
  users: UserProfile[];
  rates: MonthlyRate[];
  expenses: Expense[];
  initApp: () => Promise<void>;
  openDashboard: () => void;
  openCalculator: () => void;
  openExpense: () => void;
  openProfile: () => void;
  closeOverlay: () => void;
  setSelectedDate: (date: Date) => void;
  setDashboardPeriod: (period: DashboardPeriod) => void;
  cycleDashboardMode: () => void;
  saveIncome: (monthlyIncomeInput: string, targetMonthDate?: Date) => Promise<boolean>;
  addExpense: (amountInput: string, categoryId: CategoryId) => Promise<boolean>;
  login: (username: string, password: string) => Promise<AuthResult>;
  register: (username: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  deleteProfile: () => Promise<void>;
  updateProfilePhoto: (photoDataUrl: string) => Promise<void>;
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
    const legacyMonthKey =
      typeof parsed.selectedDateIso === 'undefined' && 'monthKey' in parsed
        ? (parsed as { monthKey?: string }).monthKey
        : undefined;
    const selectedDateIso =
      parsed.selectedDateIso ??
      (legacyMonthKey ? getMonthDate(legacyMonthKey).toISOString() : fallback.selectedDateIso);

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

function sortUsers(users: UserProfile[]): UserProfile[] {
  return [...users].sort((left, right) => left.username.localeCompare(right.username, 'ru'));
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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

function mergeRates(localRates: MonthlyRate[], remoteRates: MonthlyRate[]): MonthlyRate[] {
  const map = new Map<string, MonthlyRate>();

  for (const rate of remoteRates) {
    map.set(rate.monthKey, rate);
  }

  for (const rate of localRates) {
    const current = map.get(rate.monthKey);

    if (!current) {
      map.set(rate.monthKey, rate);
      continue;
    }

    if (rate.pendingSync) {
      map.set(rate.monthKey, rate);
      continue;
    }

    if (new Date(rate.updatedAt).getTime() > new Date(current.updatedAt).getTime()) {
      map.set(rate.monthKey, rate);
    }
  }

  return sortRates(Array.from(map.values()));
}

function expenseKey(expense: Expense): string {
  if (expense.remoteId) {
    return `remote:${expense.remoteId}`;
  }

  return `local:${expense.createdAt}:${expense.categoryId}:${expense.amount}:${expense.monthKey}`;
}

function mergeExpenses(localExpenses: Expense[], remoteExpenses: Expense[]): Expense[] {
  const map = new Map<string, Expense>();

  for (const expense of remoteExpenses) {
    map.set(expenseKey(expense), expense);
  }

  for (const expense of localExpenses) {
    const key = expenseKey(expense);
    const current = map.get(key);

    if (!current) {
      map.set(key, expense);
      continue;
    }

    if (expense.pendingSync) {
      map.set(key, expense);
    }
  }

  return sortExpenses(Array.from(map.values()));
}

async function hydrateProfileData(profileId: string, deviceId: string) {
  const local = await loadProfileData(profileId);

  if (!supabase || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return local;
  }

  const [remoteRates, remoteExpenses] = await Promise.all([
    fetchSupabaseRates(profileId, deviceId),
    fetchSupabaseExpenses(profileId, deviceId)
  ]);

  const mergedRates = mergeRates(local.rates, remoteRates);
  const mergedExpenses = mergeExpenses(local.expenses, remoteExpenses);

  await db.transaction('rw', db.rates, db.expenses, async () => {
    for (const rate of mergedRates) {
      await db.rates.put(rate);
    }

    for (const expense of mergedExpenses) {
      await db.expenses.put(expense);
    }
  });

  return {
    rates: mergedRates,
    expenses: mergedExpenses
  };
}

async function saveSessionProfileId(profileId: string | null) {
  await db.meta.put({
    key: SESSION_PROFILE_META_KEY,
    value: profileId
  });
}

async function readSessionProfileId(): Promise<string | null> {
  const record = await db.meta.get(SESSION_PROFILE_META_KEY);
  return typeof record?.value === 'string' ? record.value : null;
}

async function loadProfileData(profileId: string) {
  const [rates, expenses] = await Promise.all([
    db.rates.where('profileId').equals(profileId).toArray(),
    db.expenses.where('profileId').equals(profileId).toArray()
  ]);

  return {
    rates: sortRates(rates),
    expenses: sortExpenses(expenses)
  };
}

const initialUi = readUiSnapshot();

export const useAppStore = create<AppStore>((set, get) => ({
  isReady: false,
  deviceId: '',
  activeScreen: 'splash',
  selectedDateIso: initialUi.selectedDateIso,
  dashboardMode: initialUi.dashboardMode,
  dashboardPeriod: initialUi.dashboardPeriod,
  currentUser: null,
  users: [],
  rates: [],
  expenses: [],

  async initApp() {
    try {
      const deviceId = ensureDeviceId();
      const cachedUsers = sortUsers(await db.users.toArray());
      const sessionProfileId = await readSessionProfileId();
      let currentUser = cachedUsers.find((user) => user.id === sessionProfileId) ?? null;

      if (supabase) {
        const {
          data: { session }
        } = await supabase.auth.getSession();
        const authUser = session?.user ?? null;

        if (authUser?.id && authUser.email) {
          const remoteProfile = await loadSupabaseProfile(authUser.id, authUser.email);
          currentUser = remoteProfile;
          await db.users.put(remoteProfile);
          await saveSessionProfileId(remoteProfile.id);
        }
      }

      const users = sortUsers(
        currentUser
          ? [...cachedUsers.filter((user) => user.id !== currentUser.id), currentUser]
          : cachedUsers
      );
      const profileData = currentUser
        ? await hydrateProfileData(currentUser.id, deviceId)
        : { rates: [], expenses: [] };
      const currentRate = profileData.rates.find(
        (item) => item.monthKey === getMonthKey(new Date(get().selectedDateIso))
      );

      set({
        deviceId,
        users,
        currentUser,
        rates: profileData.rates,
        expenses: profileData.expenses,
        activeScreen: currentUser ? (currentRate ? 'dashboard' : 'calculator') : 'auth',
        isReady: true
      });

      if (currentUser) {
        void initDeviceOnServer(getMonthKey(new Date(get().selectedDateIso)));
        void get().syncPending();
      }
    } catch (error) {
      console.error('Money Time init failed', error);

      set({
        deviceId: '',
        users: [],
        currentUser: null,
        rates: [],
        expenses: [],
        activeScreen: 'auth',
        isReady: true
      });
    }
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

  openProfile() {
    set({ activeScreen: 'profile' });
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
    const currentUser = get().currentUser;

    if (!currentUser) {
      return false;
    }

    const monthDate = targetMonthDate ?? new Date(get().selectedDateIso);
    const monthKey = getMonthKey(monthDate);
    const monthlyIncome = parseNumberInput(monthlyIncomeInput);
    const hourRate = calculateHourlyRate(monthlyIncome, monthDate);

    if (monthlyIncome <= 0 || hourRate <= 0) {
      return false;
    }

    const rate: MonthlyRate = {
      monthKey,
      profileId: currentUser.id,
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
    const currentUser = get().currentUser;

    if (!currentUser) {
      return false;
    }

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
      profileId: currentUser.id,
      monthKey,
      year: monthDate.getFullYear(),
      month: monthDate.getMonth() + 1,
      amount,
      minutes: toMinutesFromAmount(amount, rate.hourRate),
      categoryId,
      createdAt,
      pendingSync: true
    };

    const remoteId = crypto.randomUUID();
    const id = await db.expenses.add({
      ...expense,
      remoteId
    });

    set((state) => ({
      expenses: sortExpenses([{ ...expense, id, remoteId }, ...state.expenses]),
      activeScreen: 'dashboard'
    }));

    void get().syncPending();

    return true;
  },

  async login(username, password) {
    const normalized = normalizeEmail(username);
    const trimmedPassword = password.trim();

    if (!normalized || !trimmedPassword) {
      return { ok: false, error: 'Введите email и пароль.' };
    }

    if (!isEmailValid(normalized)) {
      return { ok: false, error: 'Введите корректный email.' };
    }

    if (!supabase) {
      return { ok: false, error: 'Supabase не настроен в приложении.' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalized,
      password: trimmedPassword
    });

    if (error || !data.user?.id || !data.user.email) {
      return { ok: false, error: 'Неверный email или пароль.' };
    }

    const profile = await loadSupabaseProfile(data.user.id, data.user.email);
    await upsertSupabaseProfile(profile);
    await db.users.put(profile);
    const users = sortUsers([
      ...((await db.users.toArray()).filter((item) => item.id !== profile.id)),
      profile
    ]);
    const profileData = await hydrateProfileData(profile.id, get().deviceId);
    await saveSessionProfileId(profile.id);
    const hasCurrentRate = profileData.rates.some(
      (item) => item.monthKey === getMonthKey(new Date(get().selectedDateIso))
    );

    set({
      currentUser: profile,
      users,
      rates: profileData.rates,
      expenses: profileData.expenses,
      activeScreen: hasCurrentRate ? 'dashboard' : 'calculator'
    });

    void initDeviceOnServer(getMonthKey(new Date(get().selectedDateIso)));
    void get().syncPending();

    return { ok: true };
  },

  async register(username, password) {
    const normalized = normalizeEmail(username);
    const trimmedPassword = password.trim();

    if (!normalized || !trimmedPassword) {
      return { ok: false, error: 'Введите email и пароль.' };
    }

    if (!isEmailValid(normalized)) {
      return { ok: false, error: 'Введите корректный email.' };
    }

    if (trimmedPassword.length < 6) {
      return { ok: false, error: 'Пароль должен быть не короче 6 символов.' };
    }

    if (!supabase) {
      return { ok: false, error: 'Supabase не настроен в приложении.' };
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalized,
      password: trimmedPassword,
      options: {
        data: {
          username: normalized
        }
      }
    });

    if (error) {
      if (error.message.toLowerCase().includes('already')) {
        return { ok: false, error: 'Такой email уже зарегистрирован.' };
      }

      return { ok: false, error: error.message };
    }

    if (!data.user?.id || !data.user.email) {
      return { ok: false, error: 'Не удалось создать пользователя.' };
    }

    if (!data.session) {
      return {
        ok: false,
        error: 'Отключите подтверждение email в Supabase: Authentication -> Providers -> Email.'
      };
    }

    const user: UserProfile = {
      id: data.user.id,
      email: data.user.email,
      username: normalized,
      createdAt: new Date().toISOString()
    };

    await upsertSupabaseProfile(user);
    await db.users.put(user);
    const users = sortUsers(await db.users.toArray());
    await saveSessionProfileId(user.id);

    set({
      currentUser: user,
      users,
      rates: [],
      expenses: [],
      activeScreen: 'calculator'
    });

    void initDeviceOnServer(getMonthKey(new Date(get().selectedDateIso)));

    return { ok: true };
  },

  async logout() {
    await supabase?.auth.signOut();
    await saveSessionProfileId(null);

    set({
      currentUser: null,
      rates: [],
      expenses: [],
      activeScreen: 'auth'
    });
  },

  async deleteProfile() {
    const currentUser = get().currentUser;

    if (!currentUser) {
      return;
    }

    await deleteSupabaseProfileData(currentUser.id);
    await supabase?.auth.signOut();

    await db.transaction('rw', db.users, db.rates, db.expenses, db.meta, async () => {
      await db.users.delete(currentUser.id);
      await db.rates.where('profileId').equals(currentUser.id).delete();
      await db.expenses.where('profileId').equals(currentUser.id).delete();
      await saveSessionProfileId(null);
    });

    const users = sortUsers(await db.users.toArray());

    set({
      currentUser: null,
      users,
      rates: [],
      expenses: [],
      activeScreen: 'auth'
    });
  },

  async updateProfilePhoto(photoDataUrl) {
    const currentUser = get().currentUser;

    if (!currentUser) {
      return;
    }

    const nextUser = {
      ...currentUser,
      photoDataUrl
    };

    await db.users.put(nextUser);
    await upsertSupabaseProfile(nextUser);

    const users = sortUsers(
      get().users.map((user) => (user.id === currentUser.id ? nextUser : user))
    );

    set({
      currentUser: nextUser,
      users
    });
  },

  async syncPending() {
    const currentUser = get().currentUser;

    if (!currentUser) {
      return;
    }

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
      const synced = await upsertSupabaseRate(rate);

      if (!synced) {
        continue;
      }

      syncedRateKeys.push(rate.monthKey);
      await db.rates.put({ ...rate, pendingSync: false });
    }

    let syncedExpenseIds: number[] = [];

    if (pendingExpenses.length > 0) {
      const expensesToSync = pendingExpenses.map((expense) =>
        expense.remoteId
          ? expense
          : {
              ...expense,
              remoteId: crypto.randomUUID()
            }
      );

      await db.transaction('rw', db.expenses, async () => {
        for (const expense of expensesToSync) {
          if (!expense.id) {
            continue;
          }

          await db.expenses.update(expense.id, {
            remoteId: expense.remoteId
          });
        }
      });

      const synced = await upsertSupabaseExpenses(expensesToSync);

      if (synced) {
        syncedExpenseIds = expensesToSync.flatMap((expense) => (expense.id ? [expense.id] : []));

        await db.transaction('rw', db.expenses, async () => {
          for (const expense of expensesToSync) {
            if (!expense.id) {
              continue;
            }

            await db.expenses.update(expense.id, {
              remoteId: expense.remoteId,
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

    const hydrated = await hydrateProfileData(currentUser.id, get().deviceId);

    set((state) => ({
      rates: mergeRates(
        state.rates.map((rate) =>
          syncedRateKeys.includes(rate.monthKey) ? { ...rate, pendingSync: false } : rate
        ),
        hydrated.rates
      ),
      expenses: mergeExpenses(
        state.expenses.map((expense) =>
          expense.id && syncedExpenseIds.includes(expense.id)
            ? { ...expense, pendingSync: false, syncedAt: new Date().toISOString() }
            : expense
        ),
        hydrated.expenses
      )
    }));
  }
}));
