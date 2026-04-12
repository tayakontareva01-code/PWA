import { useEffect, useMemo, useState } from 'react';
import Calendar from 'react-calendar';
import { format, isSameDay, isSameMonth, isSameWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { DashboardPeriod } from '../types';

const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  year: 'Год',
  month: 'Месяц',
  week: 'Неделя',
  day: 'День'
};

export function MonthPicker({
  open,
  value,
  mode,
  allowedModes,
  onClose,
  onChange
}: {
  open: boolean;
  value: Date;
  mode: DashboardPeriod;
  allowedModes?: DashboardPeriod[];
  onClose: () => void;
  onChange: (next: { mode: DashboardPeriod; date: Date }) => void;
}) {
  const modes: DashboardPeriod[] =
    allowedModes && allowedModes.length > 0 ? allowedModes : ['year', 'month', 'week', 'day'];
  const [activeMode, setActiveMode] = useState<DashboardPeriod>(
    modes.includes(mode) ? mode : modes[0] ?? 'month'
  );
  const [yearPageStart, setYearPageStart] = useState(value.getFullYear() - 5);
  const [calendarPageDate, setCalendarPageDate] = useState(value);

  useEffect(() => {
    if (!open) {
      return;
    }

    setActiveMode(modes.includes(mode) ? mode : modes[0] ?? 'month');
    setYearPageStart(value.getFullYear() - 5);
    setCalendarPageDate(value);
  }, [mode, modes, open, value]);

  const yearOptions = useMemo(
    () => Array.from({ length: 12 }, (_, index) => yearPageStart + index),
    [yearPageStart]
  );

  if (!open) {
    return null;
  }

  function commit(nextMode: DashboardPeriod, date: Date) {
    onChange({ mode: nextMode, date });
    onClose();
  }

  return (
    <div className="month-picker-backdrop" onClick={onClose}>
      <div className="month-picker-modal" onClick={(event) => event.stopPropagation()}>
        <div className="month-picker-header">
          <strong>{modes.length === 1 ? 'Выберите месяц' : 'Выберите период'}</strong>
          <button type="button" className="month-picker-close" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>

        {modes.length > 1 ? (
          <div className="period-mode-tabs">
            {modes.map((item) => (
              <button
                key={item}
                type="button"
                className={`period-mode-tab ${activeMode === item ? 'is-active' : ''}`}
                onClick={() => setActiveMode(item)}
              >
                {PERIOD_LABELS[item]}
              </button>
            ))}
          </div>
        ) : null}

        {activeMode === 'year' ? (
          <div className="year-picker">
            <div className="year-picker-nav">
              <button type="button" className="year-picker-arrow" onClick={() => setYearPageStart((current) => current - 12)}>
                ‹
              </button>
              <span>
                {yearOptions[0]} - {yearOptions[yearOptions.length - 1]}
              </span>
              <button type="button" className="year-picker-arrow" onClick={() => setYearPageStart((current) => current + 12)}>
                ›
              </button>
            </div>

            <div className="year-picker-grid">
              {yearOptions.map((year) => {
                const active = value.getFullYear() === year;

                return (
                  <button
                    key={year}
                    type="button"
                    className={`year-picker-tile ${active ? 'is-active' : ''}`}
                    onClick={() => commit('year', new Date(year, value.getMonth(), value.getDate(), 12))}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {activeMode === 'month' ? (
          <Calendar
            locale="ru-RU"
            activeStartDate={calendarPageDate}
            defaultView="year"
            minDetail="year"
            maxDetail="year"
            next2Label={null}
            prev2Label={null}
            nextLabel="›"
            prevLabel="‹"
            navigationLabel={({ date }) => format(date, 'yyyy', { locale: ru })}
            onActiveStartDateChange={({ activeStartDate }) => {
              if (activeStartDate) {
                setCalendarPageDate(activeStartDate);
              }
            }}
            value={value}
            onChange={(nextValue) => {
              const nextDate = Array.isArray(nextValue) ? nextValue[0] : nextValue;

              if (!nextDate) {
                return;
              }

              commit('month', new Date(nextDate.getFullYear(), nextDate.getMonth(), value.getDate(), 12));
            }}
            formatMonth={(_, date) => format(date, 'LLL', { locale: ru })}
          />
        ) : null}

        {activeMode === 'week' || activeMode === 'day' ? (
          <Calendar
            locale="ru-RU"
            activeStartDate={calendarPageDate}
            defaultView="month"
            minDetail="month"
            maxDetail="month"
            next2Label={null}
            prev2Label={null}
            nextLabel="›"
            prevLabel="‹"
            navigationLabel={({ date }) => format(date, 'LLLL yyyy', { locale: ru })}
            onActiveStartDateChange={({ activeStartDate }) => {
              if (activeStartDate) {
                setCalendarPageDate(activeStartDate);
              }
            }}
            value={value}
            onChange={(nextValue) => {
              const nextDate = Array.isArray(nextValue) ? nextValue[0] : nextValue;

              if (!nextDate) {
                return;
              }

              commit(activeMode, new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate(), 12));
            }}
            tileClassName={({ date, view }) => {
              if (view !== 'month') {
                return undefined;
              }

              if (activeMode === 'day' && isSameDay(date, value)) {
                return 'react-calendar__tile--active';
              }

              if (activeMode === 'week' && isSameWeek(date, value, { weekStartsOn: 1 })) {
                return 'react-calendar__tile--range';
              }

              if (activeMode === 'week' || activeMode === 'day') {
                return isSameMonth(date, value) ? undefined : 'react-calendar__tile--neighboringMonth';
              }

              return undefined;
            }}
            formatShortWeekday={(_, date) => format(date, 'EEEEE', { locale: ru })}
          />
        ) : null}
      </div>
    </div>
  );
}
