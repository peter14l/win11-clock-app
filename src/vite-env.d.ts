/// <reference types="vite/client" />

// ─── Capacitor Native Bridge ────────────────────────────────────────────────

interface DeviceSoundPlugin {
  getRingtones(): Promise<{ ringtones: Array<{ title: string; uri: string }> }>;
  startAlarmLoop(options: { uri: string }): Promise<void>;
  stopAlarmLoop(): Promise<void>;
  showAlarmNotification(options: { id: number; name: string; time: string }): Promise<void>;
  cancelAlarmNotification(options: { id: number }): Promise<void>;
  showTimerNotification(options: { id: number; name: string; remaining: string; paused: boolean; finished: boolean }): Promise<void>;
  cancelTimerNotification(options: { id: number }): Promise<void>;
  getLaunchIntent(): Promise<{ alarmTriggered: boolean; alarmId: number }>;
  addListener(event: 'notificationAction', handler: (event: { action: string; id: number }) => void): Promise<void>;
}

interface CapacitorPlugins {
  DeviceSoundPlugin: DeviceSoundPlugin;
}

interface CapacitorGlobal {
  Plugins: CapacitorPlugins;
}

interface Window {
  Capacitor?: CapacitorGlobal;
}
