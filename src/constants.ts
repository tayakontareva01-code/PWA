import type { SphereDefinition } from './types';

export const SPHERES: SphereDefinition[] = [
  { id: 'health', label: 'Здоровье', color: '#2fdca4', tint: 'rgba(47, 220, 164, 0.16)' },
  { id: 'growth', label: 'Развитие', color: '#f5d629', tint: 'rgba(245, 214, 41, 0.16)' },
  { id: 'home', label: 'Быт', color: '#ffb24b', tint: 'rgba(255, 178, 75, 0.16)' },
  { id: 'pleasure', label: 'Удовольствие', color: '#ff6b43', tint: 'rgba(255, 107, 67, 0.16)' },
  { id: 'finance', label: 'Финансы', color: '#ef62a9', tint: 'rgba(239, 98, 169, 0.16)' },
  { id: 'chaos', label: 'Хаос', color: '#a85bee', tint: 'rgba(168, 91, 238, 0.16)' }
];

export const DEFAULT_HOURS_PER_DAY = 24;
export const UI_STORAGE_KEY = 'life-hours-ui';
export const ZERO_COLOR = '#e6e7eb';
