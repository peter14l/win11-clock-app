/**
 * Central TypeScript type definitions for Windows 11 Clock App
 */

// ─── Alarm Module ────────────────────────────────────────────────────────────

export interface Alarm {
  id: number;
  name: string;
  time: string; // "HH:MM"
  enabled: boolean;
  repeat: number[]; // 0=Sun, 1=Mon … 6=Sat
  sound: string; // local key or content:// URI
  snooze: number; // minutes
  expanded?: boolean;
}

export interface SnoozeTimer {
  id: number;
  alarmId: number;
  triggerTime: number; // Date.now() ms
}

export interface ActiveAlarm extends Alarm {
  triggerTime: string;
  isSnoozed: boolean;
  dialogId?: string;
}

// ─── Timer Module ────────────────────────────────────────────────────────────

export type TimerStatus = 'idle' | 'running' | 'paused';

export interface AppTimer {
  id: number;
  name: string;
  duration: number; // seconds
  remaining: number; // seconds
  status: TimerStatus;
}

// ─── Stopwatch Module ────────────────────────────────────────────────────────

export interface LapRecord {
  lapNumber: number;
  lapTime: number; // ms for this lap
  total: number; // cumulative ms
}

// ─── Focus / Pomodoro Module ─────────────────────────────────────────────────

export type FocusPhase = 'focus' | 'short-break' | 'long-break';

export interface FocusSettings {
  focusDuration: number; // minutes
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
  skipBreaks: boolean;
}

export interface FocusTask {
  id: number;
  text: string;
  completed: boolean;
  source?: 'local' | 'microsoft';
  msId?: string;
}

// ─── World Clock Module ──────────────────────────────────────────────────────

export interface WorldCity {
  id: number;
  name: string;
  timezone: string; // IANA tz string e.g. "America/New_York"
  lat: number;
  lng: number;
}

// ─── System Ringtone ─────────────────────────────────────────────────────────

export interface SystemRingtone {
  value: string; // content:// URI or local key
  text: string; // display title
}

// ─── Capacitor Native Plugin Bridge ─────────────────────────────────────────

export interface NotificationActionEvent {
  action: string;
  id: number;
}

export interface LaunchIntentResult {
  alarmTriggered: boolean;
  alarmId: number;
}

export interface RingtonesResult {
  ringtones: Array<{ title: string; uri: string }>;
}

export interface AlarmNotificationParams {
  id: number;
  name: string;
  time: string;
}

export interface TimerNotificationParams {
  id: number;
  name: string;
  remaining: string;
  paused: boolean;
  finished: boolean;
}

// ─── Fluent Dropdown Builder ─────────────────────────────────────────────────

export interface DropdownOption {
  value: string;
  text: string;
}

export interface FluentDropdownConfig {
  id: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  onPreview?: (value: string, isPlaying: boolean) => void;
  container: HTMLElement;
}

// ─── Dialog Builder ──────────────────────────────────────────────────────────

export interface DialogButton {
  text: string;
  primary: boolean;
  onClick?: (dialog: HTMLElement, backdrop: HTMLElement) => boolean | void | Promise<boolean | void>;
}

export interface DialogConfig {
  title: string;
  content: string | HTMLElement;
  buttons?: DialogButton[];
}
