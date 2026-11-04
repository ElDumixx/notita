import { createElement } from 'react';

import { useTheme } from '@/theme';

type Props = {
  value: Date;
  mode?: 'date' | 'time';
  minimumDate?: Date;
  maximumDate?: Date;
  accentColor?: string;
  display?: string;
  locale?: string;
  is24Hour?: boolean;
  onChange: (event: { type: 'set' | 'dismissed' }, date?: Date) => void;
};

const pad = (n: number) => String(n).padStart(2, '0');
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isoTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/**
 * Web: campo de fecha u hora del navegador. En Safari para iPhone abre las mismas ruedas que
 * el selector de iOS, así que se ve y se usa igual que en la app.
 */
export function DateTimePicker({ value, mode = 'date', minimumDate, maximumDate, accentColor, onChange }: Props) {
  const theme = useTheme();
  return createElement('input', {
    type: mode,
    value: mode === 'date' ? isoDate(value) : isoTime(value),
    min: mode === 'date' && minimumDate ? isoDate(minimumDate) : undefined,
    max: mode === 'date' && maximumDate ? isoDate(maximumDate) : undefined,
    onChange: (e: { target: { value: string } }) => {
      const v = e.target.value;
      if (!v) return;
      const next = new Date(value);
      if (mode === 'date') {
        const [y, m, d] = v.split('-').map(Number);
        next.setFullYear(y, m - 1, d);
      } else {
        const [h, min] = v.split(':').map(Number);
        next.setHours(h, min, 0, 0);
      }
      onChange({ type: 'set' }, next);
    },
    style: {
      boxSizing: 'border-box',
      width: '100%',
      minHeight: 48,
      padding: '10px 14px',
      border: 'none',
      borderRadius: 14,
      font: 'inherit',
      fontSize: 17,
      fontWeight: 500,
      color: theme.text,
      background: theme.surfaceAlt,
      accentColor: accentColor ?? theme.tint,
      colorScheme: theme.scheme,
      WebkitAppearance: 'none',
    },
  });
}
