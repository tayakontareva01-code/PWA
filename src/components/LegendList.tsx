import { formatHours, formatPercent } from '../lib/number';
import type { AggregatedSphere } from '../types';

interface LegendListProps {
  items: AggregatedSphere[];
}

export function LegendList({ items }: LegendListProps) {
  return (
    <div className="legend-list">
      {items.map((item) => (
        <div key={item.id} className="legend-row">
          <div className="legend-main">
            <span className="legend-swatch" style={{ backgroundColor: item.hours > 0 ? item.color : '#e6e7eb' }} />
            <span className="legend-label">{item.label}</span>
          </div>

          <div className="legend-value">
            {formatHours(item.hours)} / {formatPercent(item.percentage)}
          </div>
        </div>
      ))}
    </div>
  );
}
