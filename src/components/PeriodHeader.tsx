import { useRef } from 'react';
import {
  formatDayLabel,
  formatMonthLabel,
  formatWeekLabel,
  parseDayInputValue,
  parseMonthInputValue,
  toDayInputValue,
  toMonthInputValue
} from '../lib/date';
import type { PeriodMode } from '../types';

interface PeriodHeaderProps {
  mode: PeriodMode;
  anchorDate: Date;
  onShift: (direction: 1 | -1) => void;
  onChangeDate: (date: Date) => void;
}

export function PeriodHeader({ mode, anchorDate, onShift, onChangeDate }: PeriodHeaderProps) {
  const monthInputRef = useRef<HTMLInputElement>(null);
  const dayInputRef = useRef<HTMLInputElement>(null);

  function openPicker(kind: 'month' | 'day') {
    const target = kind === 'month' ? monthInputRef.current : dayInputRef.current;

    if (!target) {
      return;
    }

    const pickerTarget = target as HTMLInputElement & {
      showPicker?: () => void;
    };

    if (typeof pickerTarget.showPicker === 'function') {
      pickerTarget.showPicker();
      return;
    }

    pickerTarget.focus();
    pickerTarget.click();
  }

  const title =
    mode === 'month'
      ? formatMonthLabel(anchorDate)
      : mode === 'week'
        ? formatWeekLabel(anchorDate)
        : formatDayLabel(anchorDate);

  const pickerButtonLabel =
    mode === 'month' ? 'Выбрать месяц' : mode === 'week' ? 'Выбрать день недели' : 'Выбрать день';

  return (
    <header className="period-header">
      <div className="period-copy">
        <button className="period-title" type="button" onClick={() => openPicker(mode === 'month' ? 'month' : 'day')}>
          {title}
          <span className="period-caret">▾</span>
        </button>

        <div className="period-mode-badge">
          {mode === 'month' ? 'Месяц' : mode === 'week' ? 'Неделя' : 'День'}
        </div>
      </div>

      <div className="period-actions">
        <button className="icon-button" type="button" onClick={() => onShift(-1)} aria-label="Назад">
          ‹
        </button>
        <button className="icon-button" type="button" onClick={() => onShift(1)} aria-label="Вперёд">
          ›
        </button>
      </div>

      <input
        ref={monthInputRef}
        className="hidden-picker"
        aria-label="Выбрать месяц"
        type="month"
        value={toMonthInputValue(anchorDate)}
        onChange={(event) => onChangeDate(parseMonthInputValue(event.target.value))}
      />

      <input
        ref={dayInputRef}
        className="hidden-picker"
        aria-label={pickerButtonLabel}
        type="date"
        value={toDayInputValue(anchorDate)}
        onChange={(event) => onChangeDate(parseDayInputValue(event.target.value))}
      />
    </header>
  );
}
