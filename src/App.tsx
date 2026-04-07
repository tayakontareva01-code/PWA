import { useEffect, useMemo, useRef, type TouchEvent } from 'react';
import { aggregateExpenses } from './lib/aggregation';
import { calculateHourlyRate } from './lib/date';
import { formatCurrency } from './lib/number';
import { useAppStore } from './store/useAppStore';
import { CircularChart } from './components/CircularChart';
import { ExpenseEntrySheet } from './components/ExpenseEntrySheet';
import { IncomeCalculatorSheet } from './components/IncomeCalculatorSheet';
import { LegendList } from './components/LegendList';
import { PeriodHeader } from './components/PeriodHeader';

export default function App() {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const {
    expenses,
    incomeSettings,
    periodMode,
    anchorDate,
    activeSheet,
    isReady,
    loadAppData,
    addExpense,
    saveIncomeSettings,
    closeSheet,
    openCalculator,
    openEntry,
    setAnchorDate,
    setPeriodMode,
    shiftAnchorDate
  } = useAppStore();

  useEffect(() => {
    void loadAppData();
  }, [loadAppData]);

  const anchor = new Date(anchorDate);
  const todayRate = calculateHourlyRate(incomeSettings, new Date());
  const previewRate = calculateHourlyRate(incomeSettings, anchor);

  const summary = useMemo(
    () => aggregateExpenses(expenses, periodMode, anchor),
    [anchor, expenses, periodMode]
  );

  function handleSwipe(direction: 'left' | 'right') {
    if (direction === 'left') {
      if (periodMode === 'month') {
        setPeriodMode('week');
      } else if (periodMode === 'week') {
        setPeriodMode('day');
      }
      return;
    }

    if (periodMode === 'day') {
      setPeriodMode('week');
    } else if (periodMode === 'week') {
      setPeriodMode('month');
    }
  }

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    const touch = event.changedTouches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    const touch = event.changedTouches[0];
    const startX = touchStartX.current;
    const startY = touchStartY.current;

    if (startX === null || startY === null) {
      return;
    }

    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    touchStartX.current = null;
    touchStartY.current = null;

    if (Math.abs(deltaX) < 48 || Math.abs(deltaY) > 56) {
      return;
    }

    handleSwipe(deltaX < 0 ? 'left' : 'right');
  }

  if (!isReady) {
    return (
      <main className="loading-screen">
        <div className="loading-card">
          <h1>Часы жизни</h1>
          <p>Готовим локальную базу и восстанавливаем ваши данные.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <section className="screen-card">
        <PeriodHeader
          mode={periodMode}
          anchorDate={anchor}
          onShift={shiftAnchorDate}
          onChangeDate={setAnchorDate}
        />

        <div className="mode-hint">
          Свайп влево: {periodMode === 'month' ? 'Неделя' : periodMode === 'week' ? 'День' : 'нет следующего режима'}
          {' · '}
          свайп вправо: {periodMode === 'day' ? 'Неделя' : periodMode === 'week' ? 'Месяц' : 'нет предыдущего режима'}
        </div>

        <CircularChart items={summary.items} totalHours={summary.totalHours} />

        <LegendList items={summary.items} />

        <div className="insight-strip">
          <div>
            <span className="insight-label">Ставка для просмотра</span>
            <strong>{formatCurrency(previewRate)} ₽/ч</strong>
          </div>
          <div>
            <span className="insight-label">Новая трата сегодня</span>
            <strong>{formatCurrency(todayRate)} ₽/ч</strong>
          </div>
        </div>

        <div className="floating-actions">
          <button className="primary-button" type="button" onClick={openEntry}>
            + Добавить
          </button>

          <button className="secondary-button" type="button" onClick={openCalculator}>
            Ставка
          </button>
        </div>
      </section>

      <ExpenseEntrySheet
        open={activeSheet === 'entry'}
        incomeSettings={incomeSettings}
        onClose={closeSheet}
        onOpenCalculator={openCalculator}
        onSubmit={addExpense}
      />

      <IncomeCalculatorSheet
        open={activeSheet === 'calculator'}
        anchorDate={anchor}
        incomeSettings={incomeSettings}
        onClose={closeSheet}
        onSave={saveIncomeSettings}
      />
    </main>
  );
}
