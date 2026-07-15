import { storage, icons, showDialog, closeDialog, showToast, createFluentDropdown } from './utils.js';
import * as audio from './audio.js';

let alarms = [];
let snoozeTimers = []; // { id, alarmId, triggerTime }
let alarmCheckInterval = null;
let activeTriggeredAlarm = null; // Currently ringing alarm

// Array of loaded system ringtones
let systemRingtones = [];
let previewTimeout = null;

export function initAlarmModule() {
  alarms = storage.get('alarms', [
    { id: 1, name: 'Daily Standup', time: '09:00', enabled: true, repeat: [1, 2, 3, 4, 5], sound: 'digital', snooze: 10 },
    { id: 2, name: 'Morning Gym', time: '07:30', enabled: false, repeat: [1, 3, 5], sound: 'zen', snooze: 10 }
  ]);
  
  // Load preinstalled phone ringtones
  loadSystemRingtones();

  // Listen for native Android notification button actions
  if (window.Capacitor && window.Capacitor.Plugins.DeviceSoundPlugin) {
    window.Capacitor.Plugins.DeviceSoundPlugin.addListener('notificationAction', (event) => {
      const id = event.id;
      const action = event.action;
      
      const alarm = alarms.find(a => a.id === id);
      if (!alarm) return;
      
      if (action === 'com.win11.clock.ALARM_SNOOZE') {
        snoozeAlarm(alarm);
        window.Capacitor.Plugins.DeviceSoundPlugin.cancelAlarmNotification({ id });
        if (activeTriggeredAlarm && activeTriggeredAlarm.dialogId) {
          closeDialog(activeTriggeredAlarm.dialogId);
        }
      } else if (action === 'com.win11.clock.ALARM_DISMISS') {
        dismissAlarm(alarm);
        window.Capacitor.Plugins.DeviceSoundPlugin.cancelAlarmNotification({ id });
        if (activeTriggeredAlarm && activeTriggeredAlarm.dialogId) {
          closeDialog(activeTriggeredAlarm.dialogId);
        }
      }
    });

    // Check if the app was launched by a ringing alarm on top of lock screen
    window.Capacitor.Plugins.DeviceSoundPlugin.getLaunchIntent().then((intent) => {
      if (intent && intent.alarmTriggered && intent.alarmId !== -1) {
        const alarm = alarms.find(a => a.id === intent.alarmId);
        if (alarm) {
          // Immediately display full-screen overlay alert
          triggerAlarm(alarm, alarm.time);
        }
      }
    });
  }
  
  startAlarmScheduler();
}

function saveAlarms() {
  storage.set('alarms', alarms);
}

async function loadSystemRingtones() {
  try {
    if (window.Capacitor && window.Capacitor.Plugins.DeviceSoundPlugin) {
      const res = await window.Capacitor.Plugins.DeviceSoundPlugin.getRingtones();
      if (res && res.ringtones) {
        systemRingtones = res.ringtones.map(r => ({
          value: r.uri,
          text: r.title
        }));
      }
    }
  } catch (e) {
    console.error('Failed to load system ringtones', e);
  }
}

export function renderAlarmView(container) {
  container.innerHTML = `
    <div class="fluent-page-header">
      <h2>Alarms</h2>
      <button class="fluent-btn-icon header-action-btn" id="btn-add-alarm" title="Add new alarm">${icons.plus}</button>
    </div>
    
    <div class="alarms-container" id="alarms-list">
      ${renderAlarmsList()}
    </div>
  `;
  
  bindEvents();
  
  // Initialize dropdowns for any pre-expanded cards
  const expanded = container.querySelector('.expanded-alarm-card');
  if (expanded) {
    const id = parseInt(expanded.dataset.id);
    const alarm = alarms.find(a => a.id === id);
    if (alarm) initExpandedDropdowns(alarm);
  }
}

function renderAlarmsList() {
  if (alarms.length === 0) {
    return `
      <div class="empty-state-card">
        <div class="empty-icon">${icons.alarm}</div>
        <p>No alarms configured. Click the "+" button to add one.</p>
      </div>
    `;
  }
  
  return alarms.map(alarm => {
    if (alarm.expanded) {
      return renderExpandedAlarm(alarm);
    }
    
    const timeParts = alarm.time.split(':');
    let hrs = parseInt(timeParts[0]);
    const mins = timeParts[1];
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12;
    hrs = hrs ? hrs : 12; // 0 should be 12
    const timeDisplay = `${hrs}:${mins} <span class="ampm-text">${ampm}</span>`;
    
    const repeatLabel = getRepeatLabel(alarm.repeat);
    
    return `
      <div class="fluent-card alarm-item-card ${alarm.enabled ? '' : 'alarm-disabled'}" data-id="${alarm.id}">
        <div class="alarm-item-clickable">
          <div class="alarm-time-block">
            <span class="alarm-digital-time">${timeDisplay}</span>
            <span class="alarm-meta-info">${alarm.name ? alarm.name + ' • ' : ''}${repeatLabel}</span>
          </div>
          <div class="alarm-switch-container">
            <label class="fluent-switch">
              <input type="checkbox" class="alarm-toggle-checkbox" data-id="${alarm.id}" ${alarm.enabled ? 'checked' : ''}>
              <span class="fluent-switch-slider"></span>
            </label>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderExpandedAlarm(alarm) {
  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  
  const repeatHtml = daysOfWeek.map((day, idx) => {
    const isSelected = alarm.repeat.includes(idx);
    return `<button class="day-dot-btn ${isSelected ? 'active' : ''}" data-day="${idx}">${day}</button>`;
  }).join('');

  return `
    <div class="fluent-card alarm-item-card expanded-alarm-card" id="expanded-alarm-${alarm.id}" data-id="${alarm.id}">
      <div class="edit-alarm-form">
        <div class="edit-alarm-row time-edit-row">
          <div class="time-picker-wheels">
            <input type="time" class="fluent-time-picker" id="edit-time-${alarm.id}" value="${alarm.time}">
          </div>
          <input type="text" class="fluent-input alarm-name-input" id="edit-name-${alarm.id}" placeholder="Alarm name" value="${alarm.name}">
        </div>
        
        <div class="edit-alarm-row repeat-days-row">
          <label class="form-label">Repeat</label>
          <div class="day-dots-container" data-id="${alarm.id}">
            ${repeatHtml}
          </div>
        </div>
        
        <div class="edit-alarm-row dropdown-edit-row">
          <div class="dropdown-group">
            <label class="form-label">Sound</label>
            <div id="alarm-sound-dropdown-container-${alarm.id}"></div>
          </div>
          
          <div class="dropdown-group">
            <label class="form-label">Snooze</label>
            <div id="alarm-snooze-dropdown-container-${alarm.id}"></div>
          </div>
        </div>
        
        <div class="edit-alarm-actions">
          <button class="fluent-btn fluent-btn-primary btn-save-alarm" data-id="${alarm.id}">Save</button>
          <button class="fluent-btn fluent-btn-secondary btn-cancel-alarm" data-id="${alarm.id}">Cancel</button>
          <button class="fluent-btn-icon btn-delete-alarm" data-id="${alarm.id}" title="Delete alarm">${icons.trash}</button>
        </div>
      </div>
    </div>
  `;
}

function initExpandedDropdowns(alarm) {
  const soundContainer = document.getElementById(`alarm-sound-dropdown-container-${alarm.id}`);
  const snoozeContainer = document.getElementById(`alarm-snooze-dropdown-container-${alarm.id}`);
  
  if (soundContainer && snoozeContainer) {
    const localSounds = [
      { value: 'digital', text: 'Digital Beeps' },
      { value: 'chime', text: 'Classic Chime' },
      { value: 'zen', text: 'Zen Bowl' }
    ];
    
    // Combine local Web Audio API tones with native device ringtones
    const allSounds = [...localSounds, ...systemRingtones];
    
    createFluentDropdown({
      id: `edit-sound-dropdown-${alarm.id}`,
      options: allSounds,
      value: alarm.sound,
      onChange: (val) => {
        // Value updated, no automatic trigger (requires preview button click)
      },
      onPreview: (val, isPlaying) => {
        handleAlarmSoundPreview(val, isPlaying);
      },
      container: soundContainer
    });

    const snoozeOptions = [
      { value: '5', text: '5 minutes' },
      { value: '10', text: '10 minutes' },
      { value: '15', text: '15 minutes' },
      { value: '30', text: '30 minutes' }
    ];
    
    createFluentDropdown({
      id: `edit-snooze-dropdown-${alarm.id}`,
      options: snoozeOptions,
      value: String(alarm.snooze),
      onChange: (val) => {
        // Value updated
      },
      container: snoozeContainer
    });
  }
}

function handleAlarmSoundPreview(val, isPlaying) {
  if (previewTimeout) clearTimeout(previewTimeout);
  
  if (isPlaying) {
    if (val.startsWith('content://')) {
      if (window.Capacitor && window.Capacitor.Plugins.DeviceSoundPlugin) {
        window.Capacitor.Plugins.DeviceSoundPlugin.startAlarmLoop({ uri: val });
      }
    } else {
      audio.playAlarmSound(val);
    }
    
    // Auto-stop preview after 4 seconds and restore play icons visually in dropdown
    previewTimeout = setTimeout(() => {
      audio.stopAlarmSound();
      if (window.Capacitor && window.Capacitor.Plugins.DeviceSoundPlugin) {
        window.Capacitor.Plugins.DeviceSoundPlugin.stopAlarmLoop();
      }
      document.querySelectorAll('.fluent-dropdown-item-play-btn.playing').forEach(btn => {
        btn.classList.remove('playing');
        btn.innerHTML = icons.play;
      });
    }, 4000);
  } else {
    audio.stopAlarmSound();
    if (window.Capacitor && window.Capacitor.Plugins.DeviceSoundPlugin) {
      window.Capacitor.Plugins.DeviceSoundPlugin.stopAlarmLoop();
    }
  }
}

function getRepeatLabel(repeatDays) {
  if (repeatDays.length === 0) return 'Once';
  if (repeatDays.length === 7) return 'Every day';
  if (repeatDays.length === 5 && !repeatDays.includes(0) && !repeatDays.includes(6)) return 'Weekdays';
  if (repeatDays.length === 2 && repeatDays.includes(0) && repeatDays.includes(6)) return 'Weekends';
  
  const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return repeatDays.map(d => daysShort[d]).join(', ');
}

function bindEvents() {
  const btnAdd = document.getElementById('btn-add-alarm');
  if (btnAdd) {
    btnAdd.addEventListener('click', addAlarm);
  }
  
  const listEl = document.getElementById('alarms-list');
  if (listEl) {
    listEl.addEventListener('click', (e) => {
      // 1. Intercept switch toggles and stop event propagation!
      const switchEl = e.target.closest('.fluent-switch');
      if (switchEl) {
        const checkbox = switchEl.querySelector('.alarm-toggle-checkbox');
        if (checkbox) {
          if (e.target !== checkbox) {
            checkbox.checked = !checkbox.checked;
          }
          toggleAlarm(parseInt(checkbox.dataset.id), checkbox.checked);
        }
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      
      const dayDot = e.target.closest('.day-dot-btn');
      if (dayDot) {
        dayDot.classList.toggle('active');
        return;
      }
      
      const saveBtn = e.target.closest('.btn-save-alarm');
      if (saveBtn) {
        const id = parseInt(saveBtn.dataset.id);
        saveAlarmDetails(id);
        return;
      }
      
      const cancelBtn = e.target.closest('.btn-cancel-alarm');
      if (cancelBtn) {
        const id = parseInt(cancelBtn.dataset.id);
        closeAlarmEdit(id);
        return;
      }
      
      const deleteBtn = e.target.closest('.btn-delete-alarm');
      if (deleteBtn) {
        const id = parseInt(deleteBtn.dataset.id);
        deleteAlarm(id);
        return;
      }
      
      // If clicked on the card itself (excluding buttons/dropdown triggers), expand it
      const card = e.target.closest('.alarm-item-card');
      const isDropdownClick = e.target.closest('.fluent-dropdown-wrapper') !== null;
      if (card && !card.classList.contains('expanded-alarm-card') && !isDropdownClick) {
        const id = parseInt(card.dataset.id);
        expandAlarm(id);
      }
    });
  }
}

function addAlarm() {
  alarms = alarms.map(a => ({ ...a, expanded: false }));
  
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  const newAlarm = {
    id: Date.now(),
    name: 'Alarm',
    time: timeStr,
    enabled: true,
    repeat: [],
    sound: 'digital',
    snooze: 10,
    expanded: true
  };
  
  alarms.unshift(newAlarm);
  saveAlarms();
  refreshList();
}

function expandAlarm(id) {
  alarms = alarms.map(a => {
    if (a.id === id) return { ...a, expanded: true };
    return { ...a, expanded: false };
  });
  refreshList();
}

function closeAlarmEdit(id) {
  alarms = alarms.map(a => {
    if (a.id === id) return { ...a, expanded: false };
    return a;
  });
  alarms = alarms.filter(a => !(a.id === id && a.name === 'Alarm' && a.repeat.length === 0 && a.time === ''));
  refreshList();
}

function toggleAlarm(id, state) {
  alarms = alarms.map(a => {
    if (a.id === id) {
      showToast(state ? 'Alarm enabled' : 'Alarm disabled');
      return { ...a, enabled: state };
    }
    return a;
  });
  saveAlarms();
  
  if (!state) {
    snoozeTimers = snoozeTimers.filter(s => s.alarmId !== id);
  }
  
  refreshList();
}

function saveAlarmDetails(id) {
  const card = document.getElementById(`expanded-alarm-${id}`);
  if (!card) return;
  
  const timeVal = card.querySelector(`#edit-time-${id}`).value;
  const nameVal = card.querySelector(`#edit-name-${id}`).value.trim() || 'Alarm';
  
  const activeDots = card.querySelectorAll('.day-dot-btn.active');
  const repeatVal = Array.from(activeDots).map(dot => parseInt(dot.dataset.day));
  
  // Read value from custom Fluent dropdown elements
  const soundItem = card.querySelector(`#edit-sound-dropdown-${id} .fluent-dropdown-item.selected`);
  const soundVal = soundItem ? soundItem.dataset.value : 'digital';
  
  const snoozeItem = card.querySelector(`#edit-snooze-dropdown-${id} .fluent-dropdown-item.selected`);
  const snoozeVal = snoozeItem ? parseInt(snoozeItem.dataset.value) : 10;
  
  alarms = alarms.map(a => {
    if (a.id === id) {
      return {
        ...a,
        time: timeVal,
        name: nameVal,
        repeat: repeatVal,
        sound: soundVal,
        snooze: snoozeVal,
        enabled: true,
        expanded: false
      };
    }
    return a;
  });
  
  saveAlarms();
  refreshList();
  showToast('Alarm saved successfully', 'success');
}

function deleteAlarm(id) {
  alarms = alarms.filter(a => a.id !== id);
  snoozeTimers = snoozeTimers.filter(s => s.alarmId !== id);
  saveAlarms();
  refreshList();
  showToast('Alarm deleted');
}

function refreshList() {
  const listEl = document.getElementById('alarms-list');
  if (listEl) {
    listEl.innerHTML = renderAlarmsList();
    
    const expandedCard = listEl.querySelector('.expanded-alarm-card');
    if (expandedCard) {
      const alarmId = parseInt(expandedCard.dataset.id);
      const alarm = alarms.find(a => a.id === alarmId);
      if (alarm) {
        initExpandedDropdowns(alarm);
      }
    }
  }
}

function startAlarmScheduler() {
  if (alarmCheckInterval) clearInterval(alarmCheckInterval);
  
  alarmCheckInterval = setInterval(() => {
    const now = new Date();
    const currentHrs = now.getHours();
    const currentMins = now.getMinutes();
    const currentDay = now.getDay();
    const timeStr = `${String(currentHrs).padStart(2, '0')}:${String(currentMins).padStart(2, '0')}`;
    
    alarms.forEach(alarm => {
      if (!alarm.enabled) return;
      if (alarm.expanded) return;
      
      if (alarm.time === timeStr) {
        const matchesDay = alarm.repeat.length === 0 || alarm.repeat.includes(currentDay);
        if (matchesDay) {
          if (activeTriggeredAlarm && activeTriggeredAlarm.id === alarm.id && activeTriggeredAlarm.triggerTime === timeStr) {
            return;
          }
          triggerAlarm(alarm, timeStr);
        }
      }
    });
    
    snoozeTimers.forEach((snooze, idx) => {
      if (now.getTime() >= snooze.triggerTime) {
        const alarm = alarms.find(a => a.id === snooze.alarmId);
        if (alarm && alarm.enabled) {
          triggerAlarm(alarm, timeStr, true);
        }
        snoozeTimers.splice(idx, 1);
      }
    });
    
  }, 5000);
}

function triggerAlarm(alarm, timeStr, isSnoozed = false) {
  activeTriggeredAlarm = {
    ...alarm,
    triggerTime: timeStr,
    isSnoozed
  };
  
  // 1. Play ringing loop: check if it is a system ringtone URI or a local synthesized beep
  if (alarm.sound.startsWith('content://')) {
    if (window.Capacitor && window.Capacitor.Plugins.DeviceSoundPlugin) {
      window.Capacitor.Plugins.DeviceSoundPlugin.startAlarmLoop({ uri: alarm.sound });
    }
  } else {
    audio.playAlarmSound(alarm.sound);
  }
  
  // 2. Show native system notification with controls (Snooze/Dismiss) and fullScreenIntent
  if (window.Capacitor && window.Capacitor.Plugins.DeviceSoundPlugin) {
    window.Capacitor.Plugins.DeviceSoundPlugin.showAlarmNotification({
      id: alarm.id,
      name: alarm.name,
      time: alarm.time
    });
  }
  
  const ampm = parseInt(alarm.time.split(':')[0]) >= 12 ? 'PM' : 'AM';
  let hrs = parseInt(alarm.time.split(':')[0]) % 12;
  hrs = hrs ? hrs : 12;
  const timeDisplay = `${hrs}:${alarm.time.split(':')[1]} ${ampm}`;

  const dialogContent = document.createElement('div');
  dialogContent.className = 'alarm-dialog-trigger';
  dialogContent.innerHTML = `
    <div class="alarm-trigger-bell animate-wiggle">${icons.alarm}</div>
    <div class="alarm-trigger-time">${timeDisplay}</div>
    <div class="alarm-trigger-title">${alarm.name}</div>
    ${isSnoozed ? '<div class="alarm-trigger-snoozed-tag">Snooze active</div>' : ''}
  `;

  const dialogId = showDialog({
    title: 'Alarm Triggered',
    content: dialogContent,
    buttons: [
      {
        text: `Snooze (${alarm.snooze}m)`,
        primary: true,
        onClick: () => {
          snoozeAlarm(alarm);
          // Dismiss native notification if any
          if (window.Capacitor && window.Capacitor.Plugins.DeviceSoundPlugin) {
            window.Capacitor.Plugins.DeviceSoundPlugin.cancelAlarmNotification({ id: alarm.id });
          }
          return false;
        }
      },
      {
        text: 'Dismiss',
        primary: false,
        onClick: () => {
          dismissAlarm(alarm);
          // Dismiss native notification if any
          if (window.Capacitor && window.Capacitor.Plugins.DeviceSoundPlugin) {
            window.Capacitor.Plugins.DeviceSoundPlugin.cancelAlarmNotification({ id: alarm.id });
          }
          return false;
        }
      }
    ]
  });
  
  activeTriggeredAlarm.dialogId = dialogId;
}

function snoozeAlarm(alarm) {
  // Stop ringing loop (local or system)
  audio.stopAlarmSound();
  if (window.Capacitor && window.Capacitor.Plugins.DeviceSoundPlugin) {
    window.Capacitor.Plugins.DeviceSoundPlugin.stopAlarmLoop();
  }
  
  const snoozeTimeMs = alarm.snooze * 60 * 1000;
  const triggerTime = Date.now() + snoozeTimeMs;
  
  snoozeTimers.push({
    id: Date.now(),
    alarmId: alarm.id,
    triggerTime
  });
  
  showToast(`Alarm snoozed for ${alarm.snooze} minutes`, 'info');
  activeTriggeredAlarm = null;
}

function dismissAlarm(alarm) {
  // Stop ringing loop (local or system)
  audio.stopAlarmSound();
  if (window.Capacitor && window.Capacitor.Plugins.DeviceSoundPlugin) {
    window.Capacitor.Plugins.DeviceSoundPlugin.stopAlarmLoop();
  }
  
  if (alarm.repeat.length === 0) {
    alarms = alarms.map(a => {
      if (a.id === alarm.id) return { ...a, enabled: false };
      return a;
    });
    saveAlarms();
    refreshList();
  }
  
  showToast('Alarm dismissed', 'success');
  activeTriggeredAlarm = null;
}
