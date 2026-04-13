import { createClient } from '@supabase/supabase-js';
import type { Expense, MonthlyRate, UserProfile } from '../types';

interface SupabaseProfileRow {
  id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

interface SupabaseMonthlyRateRow {
  user_id: string;
  month_key: string;
  year: number;
  month: number;
  monthly_income: number;
  hour_rate: number;
  updated_at: string;
}

interface SupabaseExpenseRow {
  id: string;
  user_id: string;
  month_key: string;
  year: number;
  month: number;
  amount: number;
  minutes: number;
  category_id: Expense['categoryId'];
  created_at: string;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null;

export function isEmailValid(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function fallbackUsername(email: string) {
  return email.trim().toLowerCase();
}

export async function loadSupabaseProfile(userId: string, email: string): Promise<UserProfile> {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  const fallbackProfile: UserProfile = {
    id: userId,
    email,
    username: fallbackUsername(email),
    createdAt: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, created_at')
    .eq('id', userId)
    .maybeSingle<SupabaseProfileRow>();

  if (error) {
    console.warn('Profiles table is unavailable or blocked by RLS, using fallback profile', error.message);
    return fallbackProfile;
  }

  if (!data) {
    return fallbackProfile;
  }

  return {
    id: userId,
    email,
    username: data.username || fallbackUsername(email),
    photoDataUrl: data.avatar_url ?? undefined,
    createdAt: data.created_at ?? fallbackProfile.createdAt
  };
}

export async function upsertSupabaseProfile(profile: UserProfile): Promise<void> {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from('profiles').upsert(
    {
      id: profile.id,
      username: profile.username,
      avatar_url: profile.photoDataUrl ?? null,
      created_at: profile.createdAt
    },
    {
      onConflict: 'id'
    }
  );

  if (error) {
    console.warn('Failed to upsert profile in Supabase', error.message);
  }
}

export async function deleteSupabaseProfileData(profileId: string): Promise<void> {
  if (!supabase) {
    return;
  }

  const operations = [
    supabase.from('expenses').delete().eq('user_id', profileId),
    supabase.from('monthly_rates').delete().eq('user_id', profileId),
    supabase.from('profiles').delete().eq('id', profileId)
  ];

  const results = await Promise.allSettled(operations);

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.error) {
      console.warn('Failed to delete remote profile data', result.value.error.message);
    }
  }
}

export async function fetchSupabaseRates(
  profileId: string,
  deviceId: string
): Promise<MonthlyRate[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('monthly_rates')
    .select('user_id, month_key, year, month, monthly_income, hour_rate, updated_at')
    .eq('user_id', profileId)
    .order('updated_at', { ascending: false })
    .returns<SupabaseMonthlyRateRow[]>();

  if (error || !data) {
    console.warn('Failed to fetch monthly_rates from Supabase', error?.message);
    return [];
  }

  return data.map((row) => ({
    monthKey: row.month_key,
    profileId: row.user_id,
    year: row.year,
    month: row.month,
    deviceId,
    monthlyIncome: Number(row.monthly_income),
    hourRate: Number(row.hour_rate),
    updatedAt: row.updated_at,
    pendingSync: false
  }));
}

export async function fetchSupabaseExpenses(
  profileId: string,
  deviceId: string
): Promise<Expense[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('expenses')
    .select('id, user_id, month_key, year, month, amount, minutes, category_id, created_at')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false })
    .returns<SupabaseExpenseRow[]>();

  if (error || !data) {
    console.warn('Failed to fetch expenses from Supabase', error?.message);
    return [];
  }

  return data.map((row) => ({
    remoteId: row.id,
    deviceId,
    profileId: row.user_id,
    monthKey: row.month_key,
    year: row.year,
    month: row.month,
    amount: Number(row.amount),
    minutes: row.minutes,
    categoryId: row.category_id,
    createdAt: row.created_at,
    pendingSync: false,
    syncedAt: row.created_at
  }));
}

export async function upsertSupabaseRate(rate: MonthlyRate): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  const { error } = await supabase.from('monthly_rates').upsert(
    {
      user_id: rate.profileId,
      month_key: rate.monthKey,
      year: rate.year,
      month: rate.month,
      monthly_income: rate.monthlyIncome,
      hour_rate: rate.hourRate,
      updated_at: rate.updatedAt
    },
    {
      onConflict: 'user_id,month_key'
    }
  );

  if (error) {
    console.warn('Failed to upsert monthly_rate in Supabase', error.message);
  }

  return !error;
}

export async function upsertSupabaseExpenses(expenses: Expense[]): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  if (expenses.length === 0) {
    return true;
  }

  const payload = expenses.map((expense) => ({
    id: expense.remoteId,
    user_id: expense.profileId,
    month_key: expense.monthKey,
    year: expense.year,
    month: expense.month,
    amount: expense.amount,
    minutes: expense.minutes,
    category_id: expense.categoryId,
    created_at: expense.createdAt
  }));

  const { error } = await supabase.from('expenses').upsert(payload, {
    onConflict: 'id'
  });

  if (error) {
    console.warn('Failed to upsert expenses in Supabase', error.message);
  }

  return !error;
}
