import { useEffect, useState, type ReactNode } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy: string;
}

export function BottomSheet({ open, onClose, children, labelledBy }: BottomSheetProps) {
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setVisible(true);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setVisible(false);
    }, 260);

    return () => window.clearTimeout(timeoutId);
  }, [open]);

  if (!visible) {
    return null;
  }

  return (
    <div className={`sheet-root ${open ? 'is-open' : 'is-closing'}`} aria-hidden={!open}>
      <button className="sheet-backdrop" aria-label="Закрыть" onClick={onClose} />
      <section className="sheet-panel" aria-labelledby={labelledBy} aria-modal="true" role="dialog">
        <div className="sheet-handle" />
        {children}
      </section>
    </div>
  );
}
