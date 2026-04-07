import { SPHERES, ZERO_COLOR } from '../constants';
import { describeDonutSlice } from '../lib/chart';
import type { AggregatedSphere } from '../types';

interface CircularChartProps {
  items: AggregatedSphere[];
  totalHours: number;
}

export function CircularChart({ items, totalHours }: CircularChartProps) {
  const cx = 180;
  const cy = 180;

  const trackArcs = SPHERES.map((sphere, index) => {
    const slot = 360 / SPHERES.length;
    const start = index * slot + 2.5;
    const end = start + slot - 5;

    return {
      color: '#ececf1',
      path: describeDonutSlice(cx, cy, 156, 136, start, end),
      key: `${sphere.id}-track`
    };
  });

  const chartArcs =
    totalHours > 0
      ? (() => {
          let cursor = 0;

          return items
            .filter((item) => item.hours > 0)
            .map((item, index, filtered) => {
              const degrees = (item.hours / totalHours) * 360;
              const gap = filtered.length > 1 ? 2 : 0;
              const start = cursor + gap / 2;
              const end = cursor + degrees - gap / 2;
              cursor += degrees;

              return {
                key: `${item.id}-data`,
                color: item.color,
                path: describeDonutSlice(cx, cy, 120, 66, start, Math.max(end, start + 0.2))
              };
            });
        })()
      : SPHERES.map((sphere, index) => {
          const slot = 360 / SPHERES.length;
          const start = index * slot + 2;
          const end = start + slot - 4;

          return {
            key: `${sphere.id}-empty`,
            color: ZERO_COLOR,
            path: describeDonutSlice(cx, cy, 120, 66, start, end)
          };
        });

  return (
    <div className="chart-card">
      <svg className="chart-svg" viewBox="0 0 360 360" role="img" aria-label="Диаграмма трат по сферам">
        {trackArcs.map((arc) => (
          <path key={arc.key} d={arc.path} fill={arc.color} />
        ))}

        {chartArcs.map((arc) => (
          <path key={arc.key} d={arc.path} fill={arc.color} />
        ))}

        <circle cx={cx} cy={cy} r={54} fill="#ffffff" />
      </svg>

      <div className="chart-center">
        <div className="chart-total-value">{totalHours.toFixed(1)}</div>
        <div className="chart-total-label">часов</div>
      </div>
    </div>
  );
}
