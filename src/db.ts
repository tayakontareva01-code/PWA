import Dexie, { type Table } from 'dexie';
import type { Expense, MonthlyRate, StoredMeta } from './types';

class MoneyTimeDatabase extends Dexie {
  expenses!: Table<Expense, number>;
  rates!: Table<MonthlyRate, string>;
  meta!: Table<StoredMeta, string>;

  constructor() {
    super('money-time-db');

    this.version(1).stores({
      expenses: '++id, deviceId, monthKey, categoryId, createdAt, pendingSync',
      rates: '&monthKey, deviceId, updatedAt, pendingSync',
      meta: '&key'
    });
  }
}

export const db = new MoneyTimeDatabase();
