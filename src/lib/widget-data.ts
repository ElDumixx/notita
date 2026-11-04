import type { State } from '@/store';
import { isPending, remindersForSource } from '@/store/selectors';
import type { WidgetDesign } from '@/store/types';
import { FONTS } from '@/theme/fonts';
import { INKS, PASTELS } from '@/theme/palette';

import { dayDiff, formatTime } from './dates';
import { resolveColors, sourceTitle } from './postit-art';
import { spikeBoard } from './spike-art';

const DAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

/** Etiqueta corta de fecha para el pósit: "18:00", "mañana", "jue 9:00", "10 nov". */
export function compactWhen(dueAt: number | null, hasTime: boolean, now = Date.now()) {
  if (dueAt == null) return '';
  const diff = dayDiff(dueAt, now);
  const d = new Date(dueAt);
  const time = hasTime ? formatTime(dueAt) : '';
  if (diff === 0) return time || 'hoy';
  if (diff === 1) return hasTime ? `mañ. ${time}` : 'mañana';
  if (diff > 1 && diff < 7) return `${DAYS_SHORT[d.getDay()]}${time ? ` ${time}` : ''}`;
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

export type WidgetItem = { id: string; title: string; when: string; overdue: boolean };

export function widgetContent(state: Pick<State, 'reminders' | 'notebooks'>, design: WidgetDesign, now = Date.now()) {
  const list = remindersForSource(state.reminders, design.source, now);
  const items: WidgetItem[] = list.map((r) => ({
    id: r.id,
    title: r.title,
    when: design.showTime ? compactWhen(r.dueAt, r.hasTime, now) : '',
    overdue: r.dueAt != null && dayDiff(r.dueAt, now) < 0,
  }));
  return { title: sourceTitle(design.source, state.notebooks), items };
}

export function emptyMessage(design: WidgetDesign) {
  return design.source === 'hoy' ? '¡Todo listo por hoy! ✨' : 'Nada pendiente ✨';
}

/** Instantánea compartida con el widget de iOS (App Group). */
export function buildSnapshot(state: Pick<State, 'reminders' | 'notebooks' | 'designs' | 'anniversaries'>) {
  return {
    version: 3,
    generatedAt: Date.now(),
    notebooks: state.notebooks.map((n) => {
      const p = PASTELS[n.color];
      return { id: n.id, name: n.name, emoji: n.emoji, paper: p.paper, fold: p.fold, ink: p.ink, line: p.line, strong: p.strong };
    }),
    // El widget de iOS calcula él mismo cuánto falta (así acierta aunque no se abra la app).
    anniversaries: state.anniversaries.map((a) => ({ id: a.id, kind: a.kind, name: a.name, month: a.month, day: a.day, year: a.year, emoji: a.emoji })),
    reminders: state.reminders
      .filter(isPending)
      .slice(0, 400)
      .map((r) => ({
        id: r.id,
        notebookId: r.notebookId,
        title: r.title,
        dueAt: r.dueAt,
        hasTime: r.hasTime,
        important: r.important,
        createdAt: r.createdAt,
      })),
    designs: state.designs.map((d) => {
      const c = resolveColors(d, state.notebooks);
      const f = FONTS[d.font];
      return {
        id: d.id,
        kind: d.kind,
        name: d.name,
        source: d.source,
        // Aguja: «auto» = cada pósit con el color de su libreta; si no, todos con `colors`.
        color: d.color,
        inkColor: INKS[d.ink].color,
        spikeBoard: d.kind === 'aguja' ? spikeBoard(d) : null,
        title: sourceTitle(d.source, state.notebooks),
        board: d.board,
        shape: d.shape,
        paper: d.paper,
        showTime: d.showTime,
        showHeader: d.showHeader,
        font: { key: d.font, regular: f.regular ?? '', bold: f.bold ?? '', scale: f.scale },
        colors: {
          paper: c.paper,
          ink: c.text,
          line: c.line,
          fold: c.fold,
          strong: c.strong,
          board: c.board,
          boardOpacity: c.boardOpacity,
        },
      };
    }),
  };
}
