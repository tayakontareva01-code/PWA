import type { Expense, MonthlyRate } from '../types';

interface DeviceInitResponse {
  deviceId: string;
  hasCurrentMonthRate: boolean;
  hasLastMonthRate: boolean;
}

async function postJson<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function initDeviceOnServer(monthKey: string): Promise<DeviceInitResponse | null> {
  return postJson<DeviceInitResponse>('/api/device/init', { monthKey });
}

export async function syncRateToServer(rate: MonthlyRate): Promise<boolean> {
  const result = await postJson<{ ok: boolean }>('/api/rates/upsert', rate);
  return Boolean(result?.ok);
}

export async function syncExpensesToServer(expenses: Expense[]): Promise<boolean> {
  if (expenses.length === 0) {
    return true;
  }

  const result = await postJson<{ ok: boolean }>('/api/expenses/batch', { expenses });
  return Boolean(result?.ok);
}
