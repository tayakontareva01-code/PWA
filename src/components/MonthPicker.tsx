import Calendar from 'react-calendar';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export function MonthPicker({
  open,
  value,
  onClose,
  onChange
}: {
  open: boolean;
  value: Date;
  onClose: () => void;
  onChange: (date: Date) => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="month-picker-backdrop" onClick={onClose}>
      <div className="month-picker-modal" onClick={(event) => event.stopPropagation()}>
        <div className="month-picker-header">
          <strong>Выберите месяц</strong>
          <button type="button" className="month-picker-close" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>

        <Calendar
          locale="ru-RU"
          activeStartDate={new Date(value.getFullYear(), 0, 1)}
          defaultView="year"
          minDetail="year"
          maxDetail="year"
          next2Label={null}
          prev2Label={null}
          nextLabel="›"
          prevLabel="‹"
          navigationLabel={({ date }) => format(date, 'yyyy', { locale: ru })}
          value={value}
          onChange={(nextValue) => {
            const date = Array.isArray(nextValue) ? nextValue[0] : nextValue;

            if (!date) {
              return;
            }

            onChange(date);
            onClose();
          }}
          formatMonth={(_, date) => format(date, 'LLL', { locale: ru })}
        />
      </div>
    </div>
  );
}
