import type { FontKey } from '@/theme/fonts';
import type { InkKey, PastelKey, PostitColor } from '@/theme/palette';

export type NotebookKind = 'personal' | 'trabajo' | 'compras' | 'estudios' | 'salud' | 'hogar' | 'ideas' | 'viajes';

export type Notebook = {
  id: string;
  name: string;
  emoji: string;
  color: PastelKey;
  kind: NotebookKind;
  createdAt: number;
};

export type RepeatRule = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

/** Cuándo avisar respecto a la hora del recordatorio (un único aviso por recordatorio). */
export type AlertOffset = 'none' | 'atTime' | 'm5' | 'm15' | 'm30' | 'h1' | 'd1';

export type Reminder = {
  id: string;
  notebookId: string;
  title: string;
  notes: string;
  /** Fecha y hora (ms). null = sin fecha. */
  dueAt: number | null;
  /** false = solo día (sin hora concreta). */
  hasTime: boolean;
  repeat: RepeatRule;
  alert: AlertOffset;
  /** Los importantes ignoran las horas de silencio. */
  important: boolean;
  completedAt: number | null;
  /** Aviso extra puntual al posponer desde la notificación. */
  snoozeUntil: number | null;
  createdAt: number;
  updatedAt: number;
};

export type WidgetSource = 'hoy' | 'proximos' | 'importantes' | 'todos' | `libreta:${string}`;
export type WidgetBoard = 'completo' | 'blanco' | 'pastel' | 'cristal' | 'oscuro';
export type PostitShape = 'clasico' | 'doblado' | 'cinta' | 'rasgado' | 'redondo';
export type PaperPattern = 'liso' | 'rayas' | 'cuadricula' | 'puntos';

export type WidgetDesign = {
  id: string;
  name: string;
  source: WidgetSource;
  board: WidgetBoard;
  shape: PostitShape;
  paper: PaperPattern;
  color: PostitColor;
  font: FontKey;
  ink: InkKey;
  showTime: boolean;
  showHeader: boolean;
  /** Transparencia del fondo «Cristal» (0 = casi opaco, 1 = casi invisible). */
  glass: number;
  createdAt: number;
};

export type AppIconKey = 'original' | 'oscuro' | 'cristal' | 'minimal' | 'rosa' | 'menta' | 'lavanda' | 'cielo';

export type Settings = {
  defaultAlert: AlertOffset;
  /** Junta en una sola notificación los avisos que caen en la misma ventana de 10 minutos. */
  groupNearby: boolean;
  quietHours: { enabled: boolean; start: number; end: number };
  digest: { enabled: boolean; at: number };
  theme: 'system' | 'light' | 'dark';
  /** Estilo cristal (Liquid Glass) y su grado de transparencia (0 = opaco, 1 = muy transparente). */
  glass: { enabled: boolean; transparency: number };
  haptics: boolean;
  appIcon: AppIconKey;
};

export type AnniversaryKind = 'cumple' | 'aniversario' | 'otro';

/** Cumpleaños, aniversario u otra fecha que se repite cada año. */
export type Anniversary = {
  id: string;
  kind: AnniversaryKind;
  /** Persona o pareja ("Ana", "Ana y Luis"); en «Otra fecha», lo que se celebra. */
  name: string;
  /** Mes (0–11) y día del mes. */
  month: number;
  day: number;
  /** Año de nacimiento o de inicio; null si no se sabe (entonces no se cuentan los años). */
  year: number | null;
  emoji: string;
  color: PastelKey;
  /** Días de antelación de cada aviso (0 = el mismo día). */
  notify: number[];
  /** Hora de los avisos (minutos desde medianoche). */
  notifyAt: number;
  createdAt: number;
  updatedAt: number;
};

export type Trash = {
  reminders: Reminder[];
  notebook: Notebook | null;
  anniversary?: Anniversary | null;
  at: number;
} | null;
