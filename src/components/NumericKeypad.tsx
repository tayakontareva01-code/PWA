interface NumericKeypadProps {
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
}

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9']
];

const LETTERS: Record<string, string> = {
  '1': '',
  '2': 'ABC',
  '3': 'DEF',
  '4': 'GHI',
  '5': 'JKL',
  '6': 'MNO',
  '7': 'PQRS',
  '8': 'TUV',
  '9': 'WXYZ'
};

export function NumericKeypad({ onKeyPress, onBackspace }: NumericKeypadProps) {
  return (
    <div className="numeric-pad">
      {KEYS.map((row) => (
        <div key={row.join('-')} className="numeric-pad-row">
          {row.map((key) => (
            <button
              key={key}
              className="numeric-key"
              type="button"
              onClick={() => onKeyPress(key)}
              aria-label={`Набрать ${key}`}
            >
              <span className="numeric-key-main">{key}</span>
              <span className="numeric-key-sub">{LETTERS[key]}</span>
            </button>
          ))}
        </div>
      ))}

      <div className="numeric-pad-row">
        <button className="numeric-key numeric-key-muted" type="button" aria-hidden="true">
          <span className="numeric-key-main">+*#</span>
        </button>

        <button className="numeric-key" type="button" onClick={() => onKeyPress('0')} aria-label="Набрать 0">
          <span className="numeric-key-main">0</span>
        </button>

        <button className="numeric-key numeric-key-delete" type="button" onClick={onBackspace} aria-label="Удалить">
          <span className="numeric-key-main">⌫</span>
        </button>
      </div>
    </div>
  );
}
