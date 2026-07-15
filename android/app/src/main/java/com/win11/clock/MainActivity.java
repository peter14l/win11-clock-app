package com.win11.clock;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {
    private static final String ALARM_CHANNEL_ID = "win11_alarms_channel";
    private static final String TIMER_CHANNEL_ID = "win11_timers_channel";
    
    public static final String ACTION_ALARM_SNOOZE = "com.win11.clock.ALARM_SNOOZE";
    public static final String ACTION_ALARM_DISMISS = "com.win11.clock.ALARM_DISMISS";
    public static final String ACTION_TIMER_PAUSE = "com.win11.clock.TIMER_PAUSE";
    public static final String ACTION_TIMER_RESUME = "com.win11.clock.TIMER_RESUME";
    public static final String ACTION_TIMER_RESET = "com.win11.clock.TIMER_RESET";

    public static boolean alarmTriggeredOnLaunch = false;
    public static int alarmIdOnLaunch = -1;

    private AlarmActionReceiver alarmActionReceiver;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // 1. Configure native Edge-to-Edge window display flags
        Window window = getWindow();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
            window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);
            window.getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | 
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | 
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            );
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(Color.TRANSPARENT);
            window.setNavigationBarColor(Color.TRANSPARENT);
        }
        
        // 2. Clear Capacitor WebView margins so it expands behind status bars
        if (this.bridge != null && this.bridge.getWebView() != null) {
            View webView = this.bridge.getWebView();
            webView.setFitsSystemWindows(false);
            ViewGroup.LayoutParams params = webView.getLayoutParams();
            if (params instanceof ViewGroup.MarginLayoutParams) {
                ViewGroup.MarginLayoutParams marginParams = (ViewGroup.MarginLayoutParams) params;
                marginParams.topMargin = 0;
                marginParams.bottomMargin = 0;
                webView.setLayoutParams(marginParams);
            }
        }
        
        // 3. Register notification channels
        createNotificationChannels();

        // 4. Register broadcast receiver for notification actions
        alarmActionReceiver = new AlarmActionReceiver();
        IntentFilter filter = new IntentFilter();
        filter.addAction(ACTION_ALARM_SNOOZE);
        filter.addAction(ACTION_ALARM_DISMISS);
        filter.addAction(ACTION_TIMER_PAUSE);
        filter.addAction(ACTION_TIMER_RESUME);
        filter.addAction(ACTION_TIMER_RESET);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(alarmActionReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(alarmActionReceiver, filter);
        }

        // 5. Handle starting locked overlay if opened from alarm trigger intent
        handleIntent(getIntent());

        // 6. Request notification permission automatically on startup for Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent != null && intent.getBooleanExtra("alarmTriggered", false)) {
            alarmTriggeredOnLaunch = true;
            alarmIdOnLaunch = intent.getIntExtra("alarmId", -1);
            
            // Force turn screen on and bypass lockscreen
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                setShowWhenLocked(true);
                setTurnScreenOn(true);
            } else {
                getWindow().addFlags(
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                );
            }
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (alarmActionReceiver != null) {
            unregisterReceiver(alarmActionReceiver);
        }
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                // High Importance channel for Alarms (Head-up alerts)
                NotificationChannel alarmChannel = new NotificationChannel(
                    ALARM_CHANNEL_ID,
                    "Alarms Alert Channel",
                    NotificationManager.IMPORTANCE_HIGH
                );
                alarmChannel.setDescription("Displays notifications for ringing alarms with snooze/dismiss actions.");
                alarmChannel.enableLights(true);
                alarmChannel.setLightColor(Color.BLUE);
                alarmChannel.setSound(null, null); // sound is handled dynamically by our MediaPlayer
                manager.createNotificationChannel(alarmChannel);

                // Low Importance channel for active Timers (Silent background ticker updates)
                NotificationChannel timerChannel = new NotificationChannel(
                    TIMER_CHANNEL_ID,
                    "Active Timers Channel",
                    NotificationManager.IMPORTANCE_LOW
                );
                timerChannel.setDescription("Displays active stopwatch and countdown timer notifications.");
                timerChannel.setSound(null, null);
                manager.createNotificationChannel(timerChannel);
            }
        }
    }

    // BroadcastReceiver to route lock screen notification click actions back into Web/JS
    public class AlarmActionReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            int id = intent.getIntExtra("id", -1);
            
            if (DeviceSoundPlugin.instance != null) {
                DeviceSoundPlugin.instance.triggerNotificationAction(action, id);
            }
        }
    }

    // --- CUSTOM CAPACITOR NATIVE PLUGIN ---
    @CapacitorPlugin(name = "DeviceSoundPlugin")
    public static class DeviceSoundPlugin extends Plugin {
        public static DeviceSoundPlugin instance;
        private MediaPlayer mediaPlayer;

        @Override
        public void load() {
            super.load();
            instance = this;
        }

        // Expose a public method to trigger event listeners inside the plugin instance
        public void triggerNotificationAction(String action, int id) {
            JSObject response = new JSObject();
            response.put("action", action);
            response.put("id", id);
            notifyListeners("notificationAction", response);
        }

        // 0. Expose launch intent check to JS
        @PluginMethod
        public void getLaunchIntent(PluginCall call) {
            JSObject result = new JSObject();
            result.put("alarmTriggered", MainActivity.alarmTriggeredOnLaunch);
            result.put("alarmId", MainActivity.alarmIdOnLaunch);
            
            // Clear once read so it is one-shot
            MainActivity.alarmTriggeredOnLaunch = false;
            MainActivity.alarmIdOnLaunch = -1;
            
            call.resolve(result);
        }

        // 1. Fetch system alarm and notification ringtone titles & URIs
        @PluginMethod
        public void getRingtones(PluginCall call) {
            RingtoneManager manager = new RingtoneManager(getContext());
            manager.setType(RingtoneManager.TYPE_ALARM | RingtoneManager.TYPE_NOTIFICATION | RingtoneManager.TYPE_RINGTONE);
            Cursor cursor = manager.getCursor();
            
            com.getcapacitor.JSArray array = new com.getcapacitor.JSArray();
            try {
                while (cursor.moveToNext()) {
                    String title = cursor.getString(RingtoneManager.TITLE_COLUMN_INDEX);
                    Uri uri = manager.getRingtoneUri(cursor.getPosition());
                    
                    if (uri != null) {
                        JSObject tone = new JSObject();
                        tone.put("title", title);
                        tone.put("uri", uri.toString());
                        array.put(tone);
                    }
                }
                
                JSObject result = new JSObject();
                result.put("ringtones", array);
                call.resolve(result);
            } catch (Exception e) {
                call.reject("Failed to query ringtones", e);
            }
        }

        // 2. Play a system ringtone in a loop on the Alarm channel
        @PluginMethod
        public void startAlarmLoop(PluginCall call) {
            String uriStr = call.getString("uri");
            if (uriStr == null || uriStr.isEmpty()) {
                call.reject("URI parameter is required");
                return;
            }
            
            try {
                stopAlarmLoopInternal();
                
                Uri uri = Uri.parse(uriStr);
                mediaPlayer = new MediaPlayer();
                mediaPlayer.setDataSource(getContext(), uri);
                mediaPlayer.setLooping(true);
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    mediaPlayer.setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build());
                } else {
                    mediaPlayer.setAudioStreamType(AudioManager.STREAM_ALARM);
                }
                
                mediaPlayer.prepare();
                mediaPlayer.start();
                call.resolve();
            } catch (Exception e) {
                call.reject("Error playing alarm loop", e);
            }
        }

        @PluginMethod
        public void stopAlarmLoop(PluginCall call) {
            stopAlarmLoopInternal();
            call.resolve();
        }

        private void stopAlarmLoopInternal() {
            if (mediaPlayer != null) {
                try {
                    if (mediaPlayer.isPlaying()) {
                        mediaPlayer.stop();
                    }
                } catch (Exception ignored) {}
                mediaPlayer.release();
                mediaPlayer = null;
            }
        }

        // 3. Show a system Alarm notification with Snooze & Dismiss controls
        @PluginMethod
        public void showAlarmNotification(PluginCall call) {
            int id = call.getInt("id", -1);
            String name = call.getString("name", "Alarm");
            String timeStr = call.getString("time", "--:--");
            
            Context context = getContext();
            
            // Intent to open full-screen MainActivity when clicking notification or drawing over lockscreen
            Intent fullScreenIntent = new Intent(context, MainActivity.class);
            fullScreenIntent.putExtra("alarmTriggered", true);
            fullScreenIntent.putExtra("alarmId", id);
            fullScreenIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            
            PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
                context, 
                id, 
                fullScreenIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            // Intents for action buttons (broadcasts caught by AlarmActionReceiver)
            Intent snoozeIntent = new Intent(ACTION_ALARM_SNOOZE);
            snoozeIntent.putExtra("id", id);
            PendingIntent snoozePendingIntent = PendingIntent.getBroadcast(
                context, 
                id, 
                snoozeIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            Intent dismissIntent = new Intent(ACTION_ALARM_DISMISS);
            dismissIntent.putExtra("id", id);
            PendingIntent dismissPendingIntent = PendingIntent.getBroadcast(
                context, 
                id, 
                dismissIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, ALARM_CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle("Alarm Ringing")
                .setContentText(name + " (" + timeStr + ")")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setFullScreenIntent(fullScreenPendingIntent, true) // forces fullscreen activity if screen is locked
                .setOngoing(true)
                .setAutoCancel(false)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .addAction(android.R.drawable.ic_menu_today, "Snooze", snoozePendingIntent)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Dismiss", dismissPendingIntent);

            NotificationManagerCompat manager = NotificationManagerCompat.from(context);
            try {
                manager.notify(id, builder.build());
                call.resolve();
            } catch (SecurityException e) {
                call.reject("Notification permission denied", e);
            }
        }

        @PluginMethod
        public void cancelAlarmNotification(PluginCall call) {
            int id = call.getInt("id", -1);
            if (id != -1) {
                NotificationManagerCompat.from(getContext()).cancel(id);
            }
            call.resolve();
        }

        // 4. Show/update an ongoing Timer notification with dynamic controls (Pause, Resume, Reset)
        @PluginMethod
        public void showTimerNotification(PluginCall call) {
            int id = call.getInt("id", -1);
            String name = call.getString("name", "Timer");
            String remainingTime = call.getString("remaining", "00:00:00");
            boolean isPaused = call.getBoolean("paused", false);
            boolean isFinished = call.getBoolean("finished", false);
            
            Context context = getContext();
            
            // Pending intent when tapping notification to open main app
            Intent contentIntent = new Intent(context, MainActivity.class);
            PendingIntent contentPendingIntent = PendingIntent.getActivity(
                context, 
                id, 
                contentIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, TIMER_CHANNEL_ID)
                .setContentTitle(isFinished ? "Timer Finished!" : name)
                .setContentText(isFinished ? name + " countdown complete" : "Time remaining: " + remainingTime)
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setContentIntent(contentPendingIntent)
                .setOngoing(!isFinished)
                .setAutoCancel(isFinished)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

            if (isFinished) {
                // Clear any action buttons and sound notifications
                builder.setPriority(NotificationCompat.PRIORITY_HIGH)
                       .setDefaults(NotificationCompat.DEFAULT_ALL);
            } else {
                builder.setPriority(NotificationCompat.PRIORITY_LOW);
                
                // Add actions for live notification control
                if (isPaused) {
                    Intent resumeIntent = new Intent(ACTION_TIMER_RESUME);
                    resumeIntent.putExtra("id", id);
                    PendingIntent resumePending = PendingIntent.getBroadcast(
                        context, id, resumeIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    );
                    builder.addAction(android.R.drawable.ic_media_play, "Resume", resumePending);
                } else {
                    Intent pauseIntent = new Intent(ACTION_TIMER_PAUSE);
                    pauseIntent.putExtra("id", id);
                    PendingIntent pausePending = PendingIntent.getBroadcast(
                        context, id, pauseIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    );
                    builder.addAction(android.R.drawable.ic_media_pause, "Pause", pausePending);
                }

                Intent resetIntent = new Intent(ACTION_TIMER_RESET);
                resetIntent.putExtra("id", id);
                PendingIntent resetPending = PendingIntent.getBroadcast(
                    context, id, resetIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );
                builder.addAction(android.R.drawable.ic_menu_rotate, "Reset", resetPending);
            }

            NotificationManagerCompat manager = NotificationManagerCompat.from(context);
            try {
                manager.notify(id, builder.build());
                call.resolve();
            } catch (SecurityException e) {
                call.reject("Notification permission denied", e);
            }
        }

        @PluginMethod
        public void cancelTimerNotification(PluginCall call) {
            int id = call.getInt("id", -1);
            if (id != -1) {
                NotificationManagerCompat.from(getContext()).cancel(id);
            }
            call.resolve();
        }
    }
}
