import { FACTS } from '../constants';

export function getFactForMinutes(minutes: number): string | null {
  if (minutes <= 0) {
    return null;
  }

  const matched = FACTS.filter((fact) => fact.minMinutes <= minutes && minutes <= fact.maxMinutes);

  if (matched.length === 0) {
    return null;
  }

  return matched[Math.floor(Math.random() * matched.length)]?.text ?? null;
}
