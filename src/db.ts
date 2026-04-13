import Dexie, { type Table } from 'dexie';
import type { Expense, MonthlyRate, StoredMeta, UserProfile } from './types';

class MoneyTimeDatabase extends Dexie {
  expenses!: Table<Expense, number>;
  rates!: Table<MonthlyRate, string>;
  meta!: Table<StoredMeta, string>;
  users!: Table<UserProfile, string>;

  constructor() {
    super('money-time-db');

    this.version(1).stores({
      expenses: '++id, deviceId, monthKey, categoryId, createdAt, pendingSync',
      rates: '&monthKey, deviceId, updatedAt, pendingSync',
      meta: '&key'
    });

    this.version(2).stores({
      expenses: '++id, deviceId, profileId, monthKey, categoryId, createdAt, pendingSync',
      rates: '&[profileId+monthKey], profileId, monthKey, deviceId, updatedAt, pendingSync',
      meta: '&key',
      users: '&id, username, createdAt'
    });

    this.version(3).stores({
      expenses: '++id, remoteId, deviceId, profileId, monthKey, categoryId, createdAt, pendingSync',
      rates: '&[profileId+monthKey], profileId, monthKey, deviceId, updatedAt, pendingSync',
      meta: '&key',
      users: '&id, username, createdAt'
    });
  }
}

export const db = new MoneyTimeDatabase();
