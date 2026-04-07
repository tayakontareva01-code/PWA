import Dexie, { type Table } from 'dexie';
import type { Expense, IncomeSettings, StoredSetting } from './types';

class LifeHoursDatabase extends Dexie {
  expenses!: Table<Expense, number>;
  settings!: Table<StoredSetting<IncomeSettings>, string>;

  constructor() {
    super('life-hours-db');

    this.version(1).stores({
      expenses: '++id, createdAt, sphere',
      settings: '&key'
    });
  }
}

export const db = new LifeHoursDatabase();
