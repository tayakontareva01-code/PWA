import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { MoneyChart } from './components/MoneyChart';
import { CategoryIcon, CalculatorIcon, ChevronDownIcon } from './components/Icons';
import { MonthPicker } from './components/MonthPicker';
import { CATEGORIES, SPLASH_MS } from './constants';
import { buildDashboardSummary } from './lib/dashboard';
import { formatMonthLabel, getDaysInSelectedMonth, getMonthDate, getMonthKey } from './lib/date';
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
import type { CategoryId, CategorySummary, DashboardMode, DashboardSummary, MonthlyRate } from './types';

function MoneyAmount({ value, className = '' }: { value: number; className?: string }) {
  return (
    <span className={className}>
      <span>{formatRubles(value)}</span>
      <span className="currency-mark">₽</span>
    </span>
  );
}

function StatusBar() {
  return (
    <div className="status-bar">
      <span>9:41</span>
      <div className="status-icons" aria-hidden="true">
        <span className="status-signal" />
        <span className="status-wifi" />
        <span className="status-battery" />
      </div>
    </div>
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
  monthDate,
  currentRate,
  summary,
  mode,
  onOpenMonthPicker,
  onToggleMode,
  onAdd,
  onOpenCalculator
}: {
  monthDate: Date;
  currentRate: MonthlyRate | null;
  summary: DashboardSummary;
  mode: DashboardMode;
  onOpenMonthPicker: () => void;
  onToggleMode: () => void;
  onAdd: () => void;
  onOpenCalculator: () => void;
}) {
  return (
    <main className="app-page dashboard-page">
      <StatusBar />

      <section className="dashboard-screen">
        <button className="month-select" type="button" onClick={onOpenMonthPicker}>
          <span>{formatMonthLabel(monthDate)}</span>
          <span className="month-caret"><ChevronDownIcon /></span>
        </button>

        <MoneyChart summary={summary} mode={mode} onToggle={onToggleMode} />

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
            <CategoryCard key={category.id} category={category} mode={mode} />
          ))}
        </div>

        {!currentRate ? (
          <div className="dashboard-note">
            Для этого месяца ставка ещё не задана. Нажмите на иконку справа, чтобы сохранить доход.
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

function CategoryCard({ category, mode }: { category: CategorySummary; mode: DashboardMode }) {
  return (
    <article className="category-card" style={{ background: category.softColor }}>
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
    </article>
  );
}

function CalculatorScreen({
  monthDate,
  initialIncome,
  showWelcome,
  onOpenMonthPicker,
  onSubmit
}: {
  monthDate: Date;
  initialIncome: number;
  showWelcome: boolean;
  onOpenMonthPicker: () => void;
  onSubmit: (value: string) => Promise<boolean>;
}) {
  const [incomeInput, setIncomeInput] = useState(initialIncome > 0 ? String(Math.round(initialIncome)) : '');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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
    const saved = await onSubmit(incomeInput);

    if (!saved) {
      setError('Введите доход больше нуля.');
    }
  }

  return (
    <main className="app-page entry-page">
      <StatusBar />

      <section className="entry-screen calculator-screen">
        <div className="screen-top-row" />

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

          <button className="formula-card formula-card-button" type="button" onClick={onOpenMonthPicker}>
            <strong>{getDaysInSelectedMonth(monthDate)} дн</strong>
            <span>{formatMonthLabel(monthDate)}</span>
          </button>
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
  onBack,
  onSubmit
}: {
  currentRate: MonthlyRate | null;
  onBack: () => void;
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
    if (!selectedCategory) {
      setError('Выберите категорию.');
      return;
    }

    const saved = await onSubmit(amountInput, selectedCategory);

    if (!saved) {
      setError('Введите сумму больше нуля.');
      return;
    }

    setAmountInput('');
    setSelectedCategory(null);
    setError('');
  }

  return (
    <main className="app-page entry-page">
      <StatusBar />

      <section className="entry-screen expense-screen">
        <div className="screen-top-row">
          <button className="back-button" type="button" onClick={onBack} aria-label="Назад">
            ‹
          </button>
        </div>

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

  const {
    isReady,
    activeScreen,
    selectedMonthKey,
    dashboardMode,
    rates,
    expenses,
    initApp,
    openDashboard,
    openCalculator,
    openExpense,
    setSelectedMonthKey,
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

  const monthDate = useMemo(() => getMonthDate(selectedMonthKey), [selectedMonthKey]);
  const currentRate = useMemo(
    () => rates.find((rate) => rate.monthKey === selectedMonthKey) ?? null,
    [rates, selectedMonthKey]
  );
  const latestRate = useMemo(() => rates[0] ?? null, [rates]);
  const monthExpenses = useMemo(
    () => expenses.filter((expense) => expense.monthKey === selectedMonthKey),
    [expenses, selectedMonthKey]
  );
  const summary = useMemo(
    () => buildDashboardSummary(monthExpenses, currentRate, monthDate),
    [monthExpenses, currentRate, monthDate]
  );

  function handleMonthPick(date: Date) {
    setSelectedMonthKey(getMonthKey(date));
  }

  if (!isReady || showSplash) {
    return <SplashScreen />;
  }

  return (
    <>
      {activeScreen === 'calculator' ? (
        <CalculatorScreen
          monthDate={monthDate}
          initialIncome={currentRate?.monthlyIncome ?? latestRate?.monthlyIncome ?? 0}
          showWelcome={rates.length === 0}
          onOpenMonthPicker={() => setMonthPickerTarget('calculator')}
          onSubmit={saveIncome}
        />
      ) : null}

      {activeScreen === 'expense' ? (
        <ExpenseScreen currentRate={currentRate} onBack={openDashboard} onSubmit={addExpense} />
      ) : null}

      {activeScreen === 'dashboard' ? (
        <DashboardScreen
          monthDate={monthDate}
          currentRate={currentRate}
          summary={summary}
          mode={dashboardMode}
          onOpenMonthPicker={() => setMonthPickerTarget('dashboard')}
          onToggleMode={cycleDashboardMode}
          onAdd={() => {
            if (!currentRate) {
              openCalculator();
              return;
            }

            openExpense();
          }}
          onOpenCalculator={openCalculator}
        />
      ) : null}

      <MonthPicker
        open={monthPickerTarget !== null}
        value={monthDate}
        onClose={() => setMonthPickerTarget(null)}
        onChange={handleMonthPick}
      />
    </>
  );
}
