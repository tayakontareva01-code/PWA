import { useEffect, useState, type CSSProperties } from 'react';
import { SPHERES } from '../constants';
import { calculateHourlyRate } from '../lib/date';
import { formatCurrency, formatHours, parseNumberInput, roundToOneDecimal } from '../lib/number';
import type { IncomeSettings, SphereId } from '../types';
import { BottomSheet } from './BottomSheet';

interface ExpenseEntrySheetProps {
  open: boolean;
  incomeSettings: IncomeSettings | null;
  onClose: () => void;
  onOpenCalculator: () => void;
  onSubmit: (amountInput: string, sphere: SphereId) => Promise<boolean>;
}

export function ExpenseEntrySheet({
  open,
  incomeSettings,
  onClose,
  onOpenCalculator,
  onSubmit
}: ExpenseEntrySheetProps) {
  const [amountInput, setAmountInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
    }
  }, [open]);

  const hourlyRate = calculateHourlyRate(incomeSettings, new Date());
  const amount = parseNumberInput(amountInput);
  const previewHours = hourlyRate > 0 ? roundToOneDecimal(amount / hourlyRate) : 0;
  const canPickSphere = amount > 0 && hourlyRate > 0;

  async function handleSpherePick(sphere: SphereId) {
    if (amount <= 0) {
      setError('Введите сумму больше нуля.');
      return;
    }

    if (hourlyRate <= 0) {
      setError('Сначала настройте доход, чтобы приложение знало стоимость часа.');
      return;
    }

    const saved = await onSubmit(amountInput, sphere);

    if (saved) {
      setAmountInput('');
      setError('');
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} labelledBy="entry-sheet-title">
      <div className="sheet-content">
        <div className="sheet-heading">
          <h2 id="entry-sheet-title">Новая трата</h2>
          <p>Добавьте сумму, а затем тапните по сфере. Сохранение произойдёт сразу.</p>
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="expense-amount">
            Сумма в рублях
          </label>
          <div className="input-shell">
            <input
              id="expense-amount"
              className="text-input"
              inputMode="decimal"
              placeholder="Введите сумму"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
            />
            <span className="input-suffix">₽</span>
          </div>
        </div>

        <div className="conversion-card">
          <span className="conversion-arrow">↓</span>
          <div className="conversion-value">{formatHours(previewHours)}</div>
          <div className="conversion-meta">
            {hourlyRate > 0
              ? `${formatCurrency(hourlyRate)} ₽/ч по текущим настройкам`
              : 'Пока нет активной ставки'}
          </div>
        </div>

        <div className="sheet-section">
          <div className="section-row">
            <h3>Сфера</h3>
            <button className="text-link" type="button" onClick={onOpenCalculator}>
              Калькулятор дохода
            </button>
          </div>

          <div className="sphere-grid">
            {SPHERES.map((sphere) => (
              <button
                key={sphere.id}
                className={`sphere-chip ${canPickSphere ? '' : 'is-disabled'}`}
                style={
                  {
                    '--sphere-color': sphere.color,
                    '--sphere-tint': sphere.tint
                  } as CSSProperties
                }
                type="button"
                onClick={() => void handleSpherePick(sphere.id)}
              >
                {sphere.label}
              </button>
            ))}
          </div>
        </div>

        <div className={`status-note ${error ? 'is-error' : ''}`}>
          {error ||
            'История и диаграмма сохраняются локально на устройстве. Старые траты не пересчитываются.'}
        </div>
      </div>
    </BottomSheet>
  );
}
