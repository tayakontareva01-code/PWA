import { useEffect, useState } from 'react';
import { DEFAULT_HOURS_PER_DAY } from '../constants';
import { calculateHourlyRate, formatMonthLabel, getDaysInCurrentMonth } from '../lib/date';
import { formatCurrency, parseNumberInput } from '../lib/number';
import type { IncomeSettings } from '../types';
import { BottomSheet } from './BottomSheet';

interface IncomeCalculatorSheetProps {
  open: boolean;
  anchorDate: Date;
  incomeSettings: IncomeSettings | null;
  onClose: () => void;
  onSave: (monthlyIncomeInput: string, hoursPerDayInput: string) => Promise<boolean>;
}

export function IncomeCalculatorSheet({
  open,
  anchorDate,
  incomeSettings,
  onClose,
  onSave
}: IncomeCalculatorSheetProps) {
  const [monthlyIncomeInput, setMonthlyIncomeInput] = useState('');
  const [hoursPerDayInput, setHoursPerDayInput] = useState(String(DEFAULT_HOURS_PER_DAY));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    setMonthlyIncomeInput(incomeSettings ? String(incomeSettings.monthlyIncome) : '');
    setHoursPerDayInput(
      incomeSettings ? String(incomeSettings.hoursPerDay) : String(DEFAULT_HOURS_PER_DAY)
    );
    setError('');
  }, [incomeSettings, open]);

  const monthlyIncome = parseNumberInput(monthlyIncomeInput);
  const hoursPerDay = parseNumberInput(hoursPerDayInput);
  const hasDraftValues = monthlyIncomeInput.trim() !== '' || hoursPerDayInput.trim() !== '';
  const previewSettings = hasDraftValues
    ? { monthlyIncome, hoursPerDay: hoursPerDayInput.trim() === '' ? DEFAULT_HOURS_PER_DAY : hoursPerDay }
    : incomeSettings;
  const previewRate = calculateHourlyRate(
    previewSettings,
    anchorDate
  );

  async function handleSave() {
    const saved = await onSave(monthlyIncomeInput, hoursPerDayInput);

    if (!saved) {
      setError('Заполните доход и количество часов в сутках числами больше нуля.');
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} labelledBy="calculator-sheet-title">
      <div className="sheet-content">
        <div className="sheet-heading">
          <h2 id="calculator-sheet-title">Калькулятор дохода</h2>
          <p>Ставка считается на выбранный месяц. Прошлые операции сохраняют ставку, которая была в момент траты.</p>
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="monthly-income">
            Доход за месяц
          </label>
          <div className="input-shell">
            <input
              id="monthly-income"
              className="text-input"
              inputMode="decimal"
              placeholder="Например, 120000"
              value={monthlyIncomeInput}
              onChange={(event) => setMonthlyIncomeInput(event.target.value)}
            />
            <span className="input-suffix">₽</span>
          </div>
        </div>

        <div className="calculator-grid">
          <div className="metric-card">
            <span className="metric-value">
              {hoursPerDayInput.trim() === '' ? DEFAULT_HOURS_PER_DAY : hoursPerDay} ч
            </span>
            <span className="metric-label">Часов в сутках</span>
          </div>

          <div className="metric-divider">×</div>

          <div className="metric-card">
            <span className="metric-value">{getDaysInCurrentMonth(anchorDate)} дн</span>
            <span className="metric-label">{formatMonthLabel(anchorDate)}</span>
          </div>
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="hours-per-day">
            Сколько часов учитывать в сутках
          </label>
          <div className="input-shell">
            <input
              id="hours-per-day"
              className="text-input"
              inputMode="decimal"
              placeholder="24"
              value={hoursPerDayInput}
              onChange={(event) => setHoursPerDayInput(event.target.value)}
            />
            <span className="input-suffix">ч</span>
          </div>
        </div>

        <div className="result-card">
          <div className="result-value">{formatCurrency(previewRate)} ₽/ч</div>
          <div className="result-caption">
            Результат для {formatMonthLabel(anchorDate).toLowerCase()} с учётом {getDaysInCurrentMonth(anchorDate)} дней.
          </div>
        </div>

        <button className="primary-button" type="button" onClick={() => void handleSave()}>
          Сохранить ставку
        </button>

        <div className={`status-note ${error ? 'is-error' : ''}`}>
          {error || 'Новые траты будут считать часы по актуальной ставке текущего месяца.'}
        </div>
      </div>
    </BottomSheet>
  );
}
