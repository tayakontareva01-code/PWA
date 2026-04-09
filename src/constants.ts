import type { CategoryDefinition, Fact } from './types';

export const DEVICE_COOKIE_NAME = 'money_time_device_id';
export const UI_STORAGE_KEY = 'money-time-ui';
export const SPLASH_MS = 1350;

export const CATEGORIES: CategoryDefinition[] = [
  {
    id: 'growth',
    label: 'Развитие',
    color: '#ffc81d',
    softColor: '#fff1ca'
  },
  {
    id: 'home',
    label: 'Быт',
    color: '#37adff',
    softColor: '#d9efff'
  },
  {
    id: 'pleasure',
    label: 'Удовольствие',
    color: '#ff8b5a',
    softColor: '#ffe8de'
  },
  {
    id: 'finance',
    label: 'Финансы',
    color: '#ff8ddd',
    softColor: '#ffe0f5'
  },
  {
    id: 'spontaneity',
    label: 'Спонтанность',
    color: '#9b6dff',
    softColor: '#efe2ff'
  },
  {
    id: 'health',
    label: 'Здоровье',
    color: '#46dc98',
    softColor: '#d8f8ea'
  }
];

export const FACTS: Fact[] = [
  { minMinutes: 0, maxMinutes: 15, text: 'Это почти как короткая прогулка вокруг дома.' },
  { minMinutes: 16, maxMinutes: 30, text: 'За это время можно успеть навести порядок на рабочем столе.' },
  { minMinutes: 31, maxMinutes: 60, text: 'Столько длится хороший эпизод сериала без рекламы.' },
  { minMinutes: 61, maxMinutes: 90, text: 'Это время полноценной тренировки или долгой прогулки.' },
  { minMinutes: 91, maxMinutes: 130, text: 'За это время можно послушать примерно 40 песен.' },
  { minMinutes: 131, maxMinutes: 180, text: 'Это почти как дорога между городами на электричке.' },
  { minMinutes: 181, maxMinutes: 260, text: 'Столько может занять большой фильм с попкорном и титрами.' },
  { minMinutes: 261, maxMinutes: 360, text: 'За это время реально прожить маленький выходной без телефона.' },
  { minMinutes: 361, maxMinutes: 720, text: 'Это уже половина рабочего дня или длинная поездка.' },
  { minMinutes: 721, maxMinutes: 1440, text: 'Это почти целые сутки вашей жизни.' },
  { minMinutes: 1441, maxMinutes: 1000000, text: 'Эта трата уже сравнима с заметным куском месяца.' }
];
