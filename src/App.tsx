import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { MoneyChart } from './components/MoneyChart';
import { CategoryIcon, CalculatorIcon, ChevronDownIcon } from './components/Icons';
import { MonthPicker } from './components/MonthPicker';
import { CATEGORIES, SPLASH_MS } from './constants';
import { buildDashboardSummary } from './lib/dashboard';
import {
  formatMonthLabel,
  formatPeriodLabel,
  getDaysInSelectedMonth,
  getMonthKey
} from './lib/date';
import { getFactForMinutes } from './lib/facts';
import {
  formatMinutes,
  formatMinutesFull,
  formatPercent,
  formatRubles,
  parseNumberInput,
  toMinutesFromAmount
} from './lib/number';
import { useAppStore } from './store/useAppStore';
import { playExpenseDoneSound } from './lib/sound';
import type {
  CategoryId,
  CategorySummary,
  DashboardMode,
  DashboardPeriod,
  DashboardSummary,
  MonthlyRate
} from './types';

function useHorizontalSwipe({
  onSwipeLeft,
  onSwipeRight
}: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}) {
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const isTracking = useRef(false);

  return {
    onTouchStart(event: React.TouchEvent<HTMLElement>) {
      const touch = event.changedTouches[0];

      if (!touch) {
        return;
      }

      startPoint.current = { x: touch.clientX, y: touch.clientY };
      isTracking.current = true;
    },
    onTouchMove(event: React.TouchEvent<HTMLElement>) {
      const touch = event.changedTouches[0];
      const start = startPoint.current;

      if (!touch || !start || !isTracking.current) {
        return;
      }

      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 12) {
        event.preventDefault();
      }
    },
    onTouchEnd(event: React.TouchEvent<HTMLElement>) {
      const touch = event.changedTouches[0];
      const start = startPoint.current;
      startPoint.current = null;
      isTracking.current = false;

      if (!touch || !start) {
        return;
      }

      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;

      if (Math.abs(deltaX) < 56 || Math.abs(deltaY) > 44) {
        return;
      }

      if (deltaX < 0) {
        onSwipeLeft?.();
        return;
      }

      onSwipeRight?.();
    }
  };
}

function MoneyAmount({ value, className = '' }: { value: number; className?: string }) {
  return (
    <span className={className}>
      <span>{formatRubles(value)}</span>
      <span className="currency-mark">₽</span>
    </span>
  );
}

function InputField({
  value,
  placeholder,
  suffix,
  inputRef,
  onChange
}: {
  value: string;
  placeholder: string;
  suffix: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (value: string) => void;
}) {
  const hasValue = value.trim() !== '';

  return (
    <div className="money-input">
      <input
        ref={inputRef}
        className={`money-input-control ${hasValue ? '' : 'is-placeholder'}`}
        value={hasValue ? formatRubles(parseNumberInput(value)) : ''}
        placeholder={placeholder}
        inputMode="numeric"
        enterKeyHint="done"
        autoComplete="off"
        onChange={(event) => onChange(event.target.value.replace(/[^\d]/g, ''))}
      />
      <span className="money-input-suffix">{suffix}</span>
    </div>
  );
}

function SplashScreen() {
  return (
    <main className="app-page splash-page">
      <div className="splash-scene">
        <div className="splash-title">
          <img src="/splash-logo.svg" alt="Money Time" />
        </div>
        <div className="splash-mascot">
          <img src="/splash-mascot.svg" alt="" aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}

function DashboardScreen({
  periodLabel,
  hasIncome,
  summary,
  mode,
  selectedCategoryId,
  onOpenPeriodPicker,
  onToggleMode,
  onAdd,
  onOpenCalculator,
  onSelectCategory
}: {
  periodLabel: string;
  hasIncome: boolean;
  summary: DashboardSummary;
  mode: DashboardMode;
  selectedCategoryId: CategoryId | null;
  onOpenPeriodPicker: () => void;
  onToggleMode: () => void;
  onAdd: () => void;
  onOpenCalculator: () => void;
  onSelectCategory: (categoryId: CategoryId) => void;
}) {
  const swipeHandlers = useHorizontalSwipe({
    onSwipeLeft: onOpenCalculator
  });

  return (
    <main className="app-page dashboard-page swipe-screen" {...swipeHandlers}>
      <section className="dashboard-screen">
        <button className="month-select" type="button" onClick={onOpenPeriodPicker}>
          <span>{periodLabel}</span>
          <span className="month-caret">
            <ChevronDownIcon />
          </span>
        </button>

        <MoneyChart
          summary={summary}
          mode={mode}
          onToggle={onToggleMode}
          highlightedCategoryId={selectedCategoryId}
        />

        <div className="remaining-card">
          <span className="remaining-label">Остаток</span>
          <span className="remaining-value">
            {mode === 'time' ? getRemainingTimeLabel(summary.remainingMinutes) : null}
            {mode === 'amount' ? <MoneyAmount value={Math.max(0, summary.remainingAmount)} /> : null}
            {mode === 'percent' ? formatPercent(Math.max(0, summary.remainingPercent)) : null}
          </span>
        </div>

        <div className="category-grid">
          {summary.categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              mode={mode}
              active={selectedCategoryId === category.id}
              onSelect={onSelectCategory}
            />
          ))}
        </div>

        {!hasIncome ? (
          <div className="dashboard-note">
            Для выбранного периода ещё нет лимита дохода. Свайпните влево или нажмите на иконку справа, чтобы открыть калькулятор.
          </div>
        ) : null}

        <div className="dashboard-actions">
          <button className="primary-action" type="button" onClick={onAdd}>
            Добавить
          </button>

          <button className="icon-action" type="button" onClick={onOpenCalculator} aria-label="Открыть калькулятор">
            <CalculatorIcon />
          </button>
        </div>
      </section>
    </main>
  );
}

function CategoryCard({
  category,
  mode,
  active,
  onSelect
}: {
  category: CategorySummary;
  mode: DashboardMode;
  active: boolean;
  onSelect: (categoryId: CategoryId) => void;
}) {
  return (
    <button
      className={`category-card ${active ? 'is-active' : ''}`}
      style={{ background: category.softColor }}
      type="button"
      onClick={() => onSelect(category.id)}
    >
      <div className="category-card-top">
        <span className="category-label">{category.label}</span>
        <span className="category-icon">
          <CategoryIcon categoryId={category.id} size={20} />
        </span>
      </div>
      <div className="category-value">
        {mode === 'time' ? formatMinutes(category.minutes) : null}
        {mode === 'amount' ? <MoneyAmount value={category.amount} /> : null}
        {mode === 'percent' ? formatPercent(category.percent) : null}
      </div>
    </button>
  );
}

function CalculatorScreen({
  monthDate,
  initialIncome,
  showWelcome,
  onOpenMonthPicker,
  onSubmit,
  onSwipeBack
}: {
  monthDate: Date;
  initialIncome: number;
  showWelcome: boolean;
  onOpenMonthPicker: () => void;
  onSubmit: (value: string, monthDate: Date) => Promise<boolean>;
  onSwipeBack: () => void;
}) {
  const [incomeInput, setIncomeInput] = useState(initialIncome > 0 ? String(Math.round(initialIncome)) : '');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const swipeHandlers = useHorizontalSwipe({
    onSwipeRight: onSwipeBack
  });

  useEffect(() => {
    setIncomeInput(initialIncome > 0 ? String(Math.round(initialIncome)) : '');
    setError('');
  }, [initialIncome, monthDate]);

  useEffect(() => {
    inputRef.current?.focus();
    const length = inputRef.current?.value.length ?? 0;
    inputRef.current?.setSelectionRange(length, length);
  }, []);

  const incomeValue = parseNumberInput(incomeInput);
  const hourRate = incomeValue > 0 ? incomeValue / (24 * getDaysInSelectedMonth(monthDate)) : 0;

  async function handleDone() {
    const saved = await onSubmit(incomeInput, monthDate);

    if (!saved) {
      setError('Введите доход больше нуля.');
    }
  }

  return (
    <main className="app-page entry-page swipe-screen" {...swipeHandlers}>
      <section className="entry-screen calculator-screen">
        <div className="screen-top-row">
          <button className="month-select calculator-month-select" type="button" onClick={onOpenMonthPicker}>
            <span>{formatMonthLabel(monthDate)}</span>
            <span className="month-caret">
              <ChevronDownIcon />
            </span>
          </button>
        </div>

        {showWelcome ? (
          <section className="welcome-card welcome-card-asset">
            <img src="/welcome-first.svg" alt="Привет! Ты узнаешь, сколько стоит час твоей жизни и на что ты обмениваешь время" />
          </section>
        ) : (
          <h1 className="screen-title">Сколько вы зарабатываете?</h1>
        )}

        <div className="input-block">
          <InputField
            value={incomeInput}
            placeholder="Введите доход"
            suffix="₽/мес"
            inputRef={inputRef}
            onChange={setIncomeInput}
          />
          <div className="input-underline" />
        </div>

        <div className="formula-grid">
          <div className="formula-card">
            <strong>24 ч</strong>
            <span>Сутки</span>
          </div>

          <div className="formula-sign-single">×</div>

          <div className="formula-card formula-card-button">
            <strong>{getDaysInSelectedMonth(monthDate)} дн</strong>
            <span>{formatMonthLabel(monthDate)}</span>
          </div>
        </div>

        <div className="equal-sign">=</div>

        <div className="result-field">
          <MoneyAmount value={hourRate} className="result-money" />
          <span className="result-field-suffix">/ч</span>
        </div>
        <p className="result-caption">Цена часа жизни с учётом сна, отдыха, всего</p>

        {error ? <div className="error-text">{error}</div> : <div className="error-spacer" />}

        <button className="done-button" type="button" onClick={() => void handleDone()}>
          Готово
        </button>
      </section>
    </main>
  );
}

function ExpenseScreen({
  currentRate,
  onClose,
  onSubmit
}: {
  currentRate: MonthlyRate | null;
  onClose: () => void;
  onSubmit: (value: string, categoryId: CategoryId) => Promise<boolean>;
}) {
  const [amountInput, setAmountInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const amountValue = parseNumberInput(amountInput);
  const minutes = currentRate ? toMinutesFromAmount(amountValue, currentRate.hourRate) : 0;
  const factText = getFactForMinutes(minutes);

  useEffect(() => {
    inputRef.current?.focus();
    const length = inputRef.current?.value.length ?? 0;
    inputRef.current?.setSelectionRange(length, length);
  }, []);

  async function handleDone() {
    if (amountInput.trim() === '' && selectedCategory === null) {
      onClose();
      return;
    }

    if (!selectedCategory) {
      setError('Выберите категорию.');
      return;
    }

    const saved = await onSubmit(amountInput, selectedCategory);

    if (!saved) {
      setError('Введите сумму больше нуля.');
      return;
    }

    playExpenseDoneSound();
    setAmountInput('');
    setSelectedCategory(null);
    setError('');
  }

  return (
    <main className="app-page entry-page">
      <section className="entry-screen expense-screen">
        <div className="screen-top-row" />

        <div className="input-block">
          <InputField
            value={amountInput}
            placeholder="Введите сумму"
            suffix="₽"
            inputRef={inputRef}
            onChange={setAmountInput}
          />
        </div>

        <div className="swap-mark" aria-hidden="true">
          <img src="/switch-arrow.svg" alt="" />
        </div>

        <div className="time-preview">{formatMinutesFull(minutes)}</div>

        <div className="category-pill-grid">
          {CATEGORIES.map((category) => {
            const active = selectedCategory === category.id;

            return (
              <button
                key={category.id}
                className={`category-pill ${active ? 'is-selected' : ''}`}
                style={
                  {
                    '--pill-color': category.color,
                    '--pill-bg': category.softColor
                  } as CSSProperties
                }
                type="button"
                onClick={() => {
                  setSelectedCategory(category.id);
                  setError('');
                }}
              >
                <span>{category.label}</span>
                <span className="category-pill-icon">
                  <CategoryIcon categoryId={category.id} active={active} />
                </span>
              </button>
            );
          })}
        </div>

        {factText ? (
          <div className="fact-card">
            <div className="fact-copy">{factText}</div>
            <div className="fact-face">
              <img src="/fact-character.svg" alt="" aria-hidden="true" />
            </div>
          </div>
        ) : (
          <div className="fact-placeholder" />
        )}

        {error ? <div className="error-text">{error}</div> : <div className="error-spacer" />}

        <button className="done-button" type="button" onClick={() => void handleDone()}>
          Готово
        </button>
      </section>
    </main>
  );
}

function getRemainingTimeLabel(remainingMinutes: number) {
  if (remainingMinutes <= 0) {
    return '0 - все потрачено';
  }

  return formatMinutes(remainingMinutes);
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [monthPickerTarget, setMonthPickerTarget] = useState<'dashboard' | 'calculator' | null>(null);
  const [calculatorMonthDate, setCalculatorMonthDate] = useState(() => new Date());
  const [selectedCategoryId, setSelectedCategoryId] = useState<CategoryId | null>(null);

  const {
    isReady,
    activeScreen,
    selectedDateIso,
    dashboardMode,
    dashboardPeriod,
    rates,
    expenses,
    initApp,
    openDashboard,
    openCalculator,
    openExpense,
    setSelectedDate,
    setDashboardPeriod,
    cycleDashboardMode,
    saveIncome,
    addExpense,
    syncPending
  } = useAppStore();

  useEffect(() => {
    void initApp();
  }, [initApp]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const timer = window.setTimeout(() => setShowSplash(false), SPLASH_MS);
    return () => window.clearTimeout(timer);
  }, [isReady]);

  useEffect(() => {
    function handleOnline() {
      void syncPending();
    }

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncPending]);

  const selectedDate = useMemo(() => new Date(selectedDateIso), [selectedDateIso]);

  useEffect(() => {
    if (activeScreen !== 'calculator') {
      return;
    }

    setCalculatorMonthDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12));
  }, [activeScreen, selectedDate]);

  const currentRate = useMemo(
    () => rates.find((rate) => rate.monthKey === getMonthKey(selectedDate)) ?? null,
    [rates, selectedDate]
  );
  const calculatorRate = useMemo(
    () => rates.find((rate) => rate.monthKey === getMonthKey(calculatorMonthDate)) ?? null,
    [calculatorMonthDate, rates]
  );
  const latestRate = useMemo(() => rates[0] ?? null, [rates]);
  const summary = useMemo(
    () => buildDashboardSummary(expenses, rates, dashboardPeriod, selectedDate),
    [dashboardPeriod, expenses, rates, selectedDate]
  );
  const dashboardLabel = useMemo(
    () => formatPeriodLabel(dashboardPeriod, selectedDate),
    [dashboardPeriod, selectedDate]
  );

  useEffect(() => {
    setSelectedCategoryId(null);
  }, [dashboardPeriod, selectedDateIso]);

  function handlePeriodPick(next: { mode: DashboardPeriod; date: Date }) {
    if (monthPickerTarget === 'calculator') {
      setCalculatorMonthDate(new Date(next.date.getFullYear(), next.date.getMonth(), 1, 12));
      return;
    }

    setDashboardPeriod(next.mode);
    setSelectedDate(next.date);
  }

  if (!isReady || showSplash) {
    return <SplashScreen />;
  }

  return (
    <>
      {activeScreen === 'calculator' ? (
        <CalculatorScreen
          monthDate={calculatorMonthDate}
          initialIncome={calculatorRate?.monthlyIncome ?? latestRate?.monthlyIncome ?? 0}
          showWelcome={rates.length === 0}
          onOpenMonthPicker={() => setMonthPickerTarget('calculator')}
          onSubmit={saveIncome}
          onSwipeBack={openDashboard}
        />
      ) : null}

      {activeScreen === 'expense' ? (
        <ExpenseScreen currentRate={currentRate} onClose={openDashboard} onSubmit={addExpense} />
      ) : null}

      {activeScreen === 'dashboard' ? (
        <DashboardScreen
          periodLabel={dashboardLabel}
          hasIncome={summary.incomeLimit > 0}
          summary={summary}
          mode={dashboardMode}
          selectedCategoryId={selectedCategoryId}
          onOpenPeriodPicker={() => setMonthPickerTarget('dashboard')}
          onToggleMode={cycleDashboardMode}
          onAdd={() => {
            if (!currentRate) {
              openCalculator();
              return;
            }

            openExpense();
          }}
          onOpenCalculator={openCalculator}
          onSelectCategory={(categoryId) =>
            setSelectedCategoryId((current) => (current === categoryId ? null : categoryId))
          }
        />
      ) : null}

      <MonthPicker
        open={monthPickerTarget !== null}
        value={monthPickerTarget === 'calculator' ? calculatorMonthDate : selectedDate}
        mode={monthPickerTarget === 'calculator' ? 'month' : dashboardPeriod}
        allowedModes={monthPickerTarget === 'calculator' ? ['month'] : ['year', 'month', 'week', 'day']}
        onClose={() => setMonthPickerTarget(null)}
        onChange={handlePeriodPick}
      />
    </>
  );
}
