import type { CategoryDefinition, Fact } from './types';

export const DEVICE_COOKIE_NAME = 'money_time_device_id';
export const UI_STORAGE_KEY = 'money-time-ui';
export const DASHBOARD_TUTORIAL_STORAGE_KEY = 'money-time-dashboard-tutorial-seen';
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
  { minMinutes: 0, maxMinutes: 15, text: 'Это время, за которое пельмени ещё только делают вид, что скоро сварятся.' },
  { minMinutes: 16, maxMinutes: 30, text: 'За это время можно начать уборку, устать и торжественно перенести её на завтра.' },
  { minMinutes: 31, maxMinutes: 60, text: 'Столько обычно длится одно “я только быстро посмотрю рилсы”.' },
  { minMinutes: 61, maxMinutes: 90, text: 'Это уже серьёзный отрезок: хватит и на фильм, и на драму, и на поиск, что бы съесть.' },
  { minMinutes: 91, maxMinutes: 130, text: 'За это время можно послушать плейлист, который обещал играть фоном, но стал главным событием дня.' },
  { minMinutes: 131, maxMinutes: 180, text: 'Столько может занять поездка, в которой вы трижды решите, что надо было вообще не выходить из дома.' },
  { minMinutes: 181, maxMinutes: 260, text: 'Это уже мини-эпоха: можно успеть проголодаться, поесть и снова проголодаться.' },
  { minMinutes: 261, maxMinutes: 360, text: 'Такой кусок времени уже ощущается как маленькая отдельная жизнь со своим сюжетом.' },
  { minMinutes: 361, maxMinutes: 720, text: 'Это почти полдня. Организм уже имеет право спросить: “А мы вообще куда идём?”' },
  { minMinutes: 721, maxMinutes: 1440, text: 'Это почти сутки. Ваш внутренний бухгалтер времени уже тихо плачет в углу.' },
  { minMinutes: 1441, maxMinutes: 1000000, text: 'Это уже не трата, а полноценный сериал из часов, решений и лёгкого финансового экстрима.' }
];
