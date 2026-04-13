import { describeDonutSlice } from '../lib/chart';
import type { CategoryId, CategorySummary, DashboardMode, DashboardSummary } from '../types';

interface MoneyChartProps {
  summary: DashboardSummary;
  mode: DashboardMode;
  onToggle: () => void;
  highlightedCategoryId?: CategoryId | null;
}

function renderSlotArc(category: CategorySummary, index: number) {
  const slotSize = 60;
  const slotGap = 5;
  const start = 330 + index * slotSize + slotGap / 2;
  const end = start + slotSize - slotGap;
  const innerRadius = 72;
  const trackOuterRadius = 126;
  const fillOuterRadius = Math.max(innerRadius + 0.2, innerRadius + (trackOuterRadius - innerRadius) * category.fillRatio);

  return {
    trackPath: describeDonutSlice(180, 180, trackOuterRadius, innerRadius, start, end),
    fillPath:
      category.fillRatio > 0
        ? describeDonutSlice(180, 180, fillOuterRadius, innerRadius, start, end)
        : null
  };
}

export function MoneyChart({
  summary,
  mode,
  onToggle,
  highlightedCategoryId
}: MoneyChartProps) {
  return (
    <button className="dashboard-chart" type="button" onClick={onToggle} aria-label="Переключить режим дашборда">
      <div className="dashboard-chart-orbit dashboard-chart-orbit-a">
        <span className="dashboard-chart-dot small" />
      </div>
      <div className="dashboard-chart-orbit dashboard-chart-orbit-b">
        <span className="dashboard-chart-dot large" />
      </div>

      <svg className="dashboard-chart-svg" viewBox="0 0 360 360" role="img" aria-label="Статистика по категориям">
        <circle cx="180" cy="180" r="156" className="dashboard-chart-ring" />

        {summary.categories.map((category, index) => {
          const arc = renderSlotArc(category, index);
          const isHighlighted = highlightedCategoryId === category.id;
          const isDimmed = highlightedCategoryId !== null && highlightedCategoryId !== undefined && !isHighlighted;

          return (
            <g
              key={category.id}
              className={`dashboard-chart-slot ${isHighlighted ? 'is-highlighted' : ''} ${isDimmed ? 'is-dimmed' : ''}`}
            >
              <path d={arc.trackPath} fill="#eef0f6" className="dashboard-chart-track" />
              {arc.fillPath ? (
                <path
                  d={arc.fillPath}
                  fill={category.color}
                  className="dashboard-chart-fill"
                  style={{ animationDelay: `${index * 70}ms` }}
                />
              ) : null}
            </g>
          );
        })}

        <circle cx="180" cy="180" r="64" fill="#ffffff" />
      </svg>

      <div className="dashboard-chart-center">
        {mode === 'time' ? (
          <>
            <div className="dashboard-chart-primary">{formatMinutes(summary.totalMinutesSpent)}</div>
            <div className="dashboard-chart-secondary">{formatMinutes(summary.totalPeriodMinutes)}</div>
          </>
        ) : null}

        {mode === 'amount' ? (
          <>
            <div className="dashboard-chart-primary dashboard-chart-primary-money">
              <span>{formatRubles(summary.totalExpensesAmount)}</span>
              <span className="currency-mark is-dark">₽</span>
            </div>
            <div className="dashboard-chart-secondary dashboard-chart-secondary-money">
              {formatRubles(summary.incomeLimit)}₽
            </div>
          </>
        ) : null}

        {mode === 'percent' ? (
          <>
            <div className="dashboard-chart-primary dashboard-chart-primary-percent">
              {formatPercent(summary.spentPercent)}
            </div>
            <div className="dashboard-chart-secondary">100%</div>
          </>
        ) : null}
      </div>
    </button>
  );
}

function formatRubles(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0
  }).format(Math.round(value));
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

function formatMinutes(minutes: number): string {
  const absoluteMinutes = Math.abs(minutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const remainder = absoluteMinutes % 60;
  return `${hours} ч ${remainder} м`;
}
