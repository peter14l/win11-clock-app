import { storage, icons, showToast, showDialog, closeDialog } from './utils.js';
import * as audio from './audio.js';

let alarms = [];
let alarmCheckInterval = null;
let activeTriggeredAlarm = null;
let snoozeTimers = []; // { id, alarmId, triggerTime }

export function initAlarmModule() {
  alarms = storage.get('alarms', [
    { id: 1, name: 'Morning Wakeup', time: '07:00', enabled: true, repeat: [1, 2, 3, 4, 5], sound: 'chime', snooze: 10, expanded: false },
    { id: 2, name: 'Workout Time', time: '18:30', enabled: false, repeat: [1, 3, 5], sound: 'digital', snooze: 5, expanded: false }
  ]);
  
  // Start background monitoring for alarms
  startAlarmScheduler();
}

function saveAlarms() {
  storage.set('alarms', alarms);
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
    const timeParts = alarm.time.split(':');
    let hrs = parseInt(timeParts[0]);
    const mins = timeParts[1];
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12;
    hrs = hrs ? hrs : 12; // 0 is 12
    const timeDisplay = `${hrs}:${mins} <span class="ampm-text">${ampm}</span>`;
    
    const repeatLabel = getRepeatLabel(alarm.repeat);
    
    if (alarm.expanded) {
      return renderExpandedAlarm(alarm);
    }
    
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
  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // Sunday to Saturday
  
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
            <select class="fluent-select" id="edit-sound-${alarm.id}">
              <option value="digital" ${alarm.sound === 'digital' ? 'selected' : ''}>Digital Beeps</option>
              <option value="chime" ${alarm.sound === 'chime' ? 'selected' : ''}>Classic Chime</option>
              <option value="zen" ${alarm.sound === 'zen' ? 'selected' : ''}>Zen Bowl</option>
            </select>
          </div>
          
          <div class="dropdown-group">
            <label class="form-label">Snooze</label>
            <select class="fluent-select" id="edit-snooze-${alarm.id}">
              <option value="5" ${alarm.snooze === 5 ? 'selected' : ''}>5 minutes</option>
              <option value="10" ${alarm.snooze === 10 ? 'selected' : ''}>10 minutes</option>
              <option value="15" ${alarm.snooze === 15 ? 'selected' : ''}>15 minutes</option>
              <option value="30" ${alarm.snooze === 30 ? 'selected' : ''}>30 minutes</option>
            </select>
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
      const toggle = e.target.closest('.alarm-toggle-checkbox');
      if (toggle) {
        const id = parseInt(toggle.dataset.id);
        toggleAlarm(id, toggle.checked);
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
      
      // If clicked on the card itself, expand it
      const card = e.target.closest('.alarm-item-card');
      if (card && !card.classList.contains('expanded-alarm-card')) {
        const id = parseInt(card.dataset.id);
        expandAlarm(id);
      }
    });
  }
}

function addAlarm() {
  // Collapse others
  alarms = alarms.map(a => ({ ...a, expanded: false }));
  
  // Set current time as base
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
    return { ...a, expanded: false }; // Collapse others
  });
  refreshList();
}

function closeAlarmEdit(id) {
  alarms = alarms.map(a => {
    if (a.id === id) return { ...a, expanded: false };
    return a;
  });
  // Clean up if it was a newly added and cancelled
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
  
  // Remove from snooze lists if toggled off
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
  
  // Gather repeat days
  const activeDots = card.querySelectorAll('.day-dot-btn.active');
  const repeatVal = Array.from(activeDots).map(dot => parseInt(dot.dataset.day));
  
  const soundVal = card.querySelector(`#edit-sound-${id}`).value;
  const snoozeVal = parseInt(card.querySelector(`#edit-snooze-${id}`).value);
  
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
  }
}

// Background scheduler running alarms
function startAlarmScheduler() {
  if (alarmCheckInterval) clearInterval(alarmCheckInterval);
  
  alarmCheckInterval = setInterval(() => {
    const now = new Date();
    const currentHrs = now.getHours();
    const currentMins = now.getMinutes();
    const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday...
    const timeStr = `${String(currentHrs).padStart(2, '0')}:${String(currentMins).padStart(2, '0')}`;
    
    // Check normal alarms
    alarms.forEach(alarm => {
      if (!alarm.enabled) return;
      if (alarm.expanded) return; // don't trigger while user is actively editing
      
      // Match time
      if (alarm.time === timeStr) {
        // Match day if repeats are set
        const matchesDay = alarm.repeat.length === 0 || alarm.repeat.includes(currentDay);
        if (matchesDay) {
          // Avoid triggering multiple times in the same minute
          if (activeTriggeredAlarm && activeTriggeredAlarm.id === alarm.id && activeTriggeredAlarm.triggerTime === timeStr) {
            return;
          }
          triggerAlarm(alarm, timeStr);
        }
      }
    });
    
    // Check snooze timers
    snoozeTimers.forEach((snooze, idx) => {
      if (now.getTime() >= snooze.triggerTime) {
        const alarm = alarms.find(a => a.id === snooze.alarmId);
        if (alarm && alarm.enabled) {
          triggerAlarm(alarm, timeStr, true);
        }
        snoozeTimers.splice(idx, 1); // remove snooze timer
      }
    });
    
  }, 5000); // Check every 5 seconds
}

function triggerAlarm(alarm, timeStr, isSnoozed = false) {
  activeTriggeredAlarm = {
    ...alarm,
    triggerTime: timeStr,
    isSnoozed
  };
  
  // Play buzzer sound based on alarm settings
  audio.playAlarmSound(alarm.sound);
  
  // Construct dialog body HTML
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
          return false; // Allow dialog to close
        }
      },
      {
        text: 'Dismiss',
        primary: false,
        onClick: () => {
          dismissAlarm(alarm);
          return false; // Allow dialog to close
        }
      }
    ]
  });
  
  activeTriggeredAlarm.dialogId = dialogId;
}

function snoozeAlarm(alarm) {
  audio.stopAlarmSound();
  
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
  audio.stopAlarmSound();
  
  // If it is a one-time alarm (no repeats), toggle it off
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
