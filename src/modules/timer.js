import { storage, icons, showDialog, closeDialog, showToast, createFluentDropdown } from './utils.js';
import * as audio from './audio.js';

let timers = [];
let timerTicker = null;
let activeZoomTimerId = null;

export function initTimerModule() {
  timers = storage.get('timers', [
    { id: 1, name: 'Tea Timer', duration: 300, remaining: 300, status: 'idle' },
    { id: 2, name: 'Egg Timer', duration: 180, remaining: 180, status: 'idle' },
    { id: 3, name: 'Pizza Bake', duration: 900, remaining: 900, status: 'idle' }
  ]);
  
  // Listen for native Android notification actions for timers
  if (window.Capacitor && window.Capacitor.Plugins.DeviceSoundPlugin) {
    window.Capacitor.Plugins.DeviceSoundPlugin.addListener('notificationAction', (event) => {
      const id = event.id;
      const action = event.action;
      
      const timer = timers.find(t => t.id === id);
      if (!timer) return;
      
      if (action === 'com.win11.clock.TIMER_PAUSE') {
        pauseTimerInternal(id);
      } else if (action === 'com.win11.clock.TIMER_RESUME') {
        resumeTimerInternal(id);
      } else if (action === 'com.win11.clock.TIMER_RESET') {
        resetTimer(id);
      }
    });
  }
  
  startTimerTicker();
}

function saveTimers() {
  storage.set('timers', timers);
}

export function renderTimerView(container) {
  container.innerHTML = `
    <div class="fluent-page-header">
      <h2>Timers</h2>
      <button class="fluent-btn-icon header-action-btn" id="btn-add-timer" title="Add new timer">${icons.plus}</button>
    </div>
    
    <div class="timers-grid" id="timers-list-grid">
      ${renderTimersGrid()}
    </div>
  `;
  
  bindEvents();
}

function renderTimersGrid() {
  if (timers.length === 0) {
    return `<div class="empty-timers">No timers configured. Click the '+' button to add one.</div>`;
  }
  
  return timers.map(timer => {
    const isRunning = timer.status === 'running';
    const hrs = Math.floor(timer.remaining / 3600);
    const mins = Math.floor((timer.remaining % 3600) / 60);
    const secs = timer.remaining % 60;
    const timeDisplay = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
    // Progress Ring offset calculations
    const dashOffset = getDashOffset(timer);
    
    return `
      <div class="fluent-card timer-item-card ${isRunning ? 'running' : ''}" data-id="${timer.id}">
        <div class="timer-card-header">
          <span class="timer-card-title">${timer.name}</span>
          <button class="timer-delete-btn" data-id="${timer.id}" title="Delete timer">${icons.trash}</button>
        </div>
        
        <div class="timer-card-body">
          <div class="timer-progress-ring-container">
            <svg class="timer-progress-ring" width="112" height="112">
              <circle class="progress-ring__circle-bg" stroke="var(--border-color)" stroke-width="4" fill="transparent" r="50" cx="56" cy="56"/>
              <circle class="progress-ring__circle" stroke="var(--accent-color)" stroke-width="5" stroke-linecap="round" stroke-dasharray="314.16" stroke-dashoffset="${dashOffset}" fill="transparent" r="50" cx="56" cy="56"/>
            </svg>
            <div class="timer-card-digits">${timeDisplay}</div>
          </div>
        </div>
        
        <div class="timer-card-footer">
          <button class="fluent-btn-icon btn-timer-toggle ${isRunning ? 'active' : ''}" data-id="${timer.id}" title="${isRunning ? 'Pause' : 'Start'}">
            ${isRunning ? icons.pause : icons.play}
          </button>
          <button class="fluent-btn-icon btn-timer-reset" data-id="${timer.id}" title="Reset">${icons.reset}</button>
          <button class="fluent-btn-icon btn-timer-zoom" data-id="${timer.id}" title="Fullscreen Desk Mode">${icons.zoom}</button>
        </div>
      </div>
    `;
  }).join('');
}

function getDashOffset(timer) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius; // ~314.16
  const pct = timer.duration > 0 ? (timer.duration - timer.remaining) / timer.duration : 0;
  return circumference - pct * circumference;
}

function bindEvents() {
  const btnAdd = document.getElementById('btn-add-timer');
  if (btnAdd) {
    btnAdd.addEventListener('click', showAddTimerDialog);
  }
  
  const gridEl = document.getElementById('timers-list-grid');
  if (gridEl) {
    gridEl.addEventListener('click', (e) => {
      const toggle = e.target.closest('.btn-timer-toggle');
      const reset = e.target.closest('.btn-timer-reset');
      const zoom = e.target.closest('.btn-timer-zoom');
      const del = e.target.closest('.timer-delete-btn');
      
      if (toggle) {
        toggleTimer(parseInt(toggle.dataset.id));
      } else if (reset) {
        resetTimer(parseInt(reset.dataset.id));
      } else if (zoom) {
        enterZoomMode(parseInt(zoom.dataset.id));
      } else if (del) {
        deleteTimer(parseInt(del.dataset.id));
      }
    });
  }
}

// Timer Ticks
function startTimerTicker() {
  if (timerTicker) clearInterval(timerTicker);
  
  timerTicker = setInterval(() => {
    let changed = false;
    
    timers = timers.map(timer => {
      if (timer.status === 'running') {
        changed = true;
        if (timer.remaining > 0) {
          const nextVal = timer.remaining - 1;
          
          if (activeZoomTimerId === timer.id) {
            updateZoomTimerDigits(nextVal, timer.duration);
          }
          
          // Update native ongoing notification
          updateNativeTimerNotification(timer.id, timer.name, nextVal, false);
          
          return { ...timer, remaining: nextVal };
        } else {
          // Timer finished!
          triggerTimerEnd(timer);
          return { ...timer, remaining: timer.duration, status: 'idle' };
        }
      }
      return timer;
    });
    
    if (changed) {
      const grid = document.getElementById('timers-list-grid');
      if (grid) grid.innerHTML = renderTimersGrid();
    }
  }, 1000);
}

function updateNativeTimerNotification(id, name, remainingSeconds, isPaused) {
  if (window.Capacitor && window.Capacitor.Plugins.DeviceSoundPlugin) {
    const hrs = Math.floor(remainingSeconds / 3600);
    const mins = Math.floor((remainingSeconds % 3600) / 60);
    const secs = remainingSeconds % 60;
    const timeDisplay = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
    window.Capacitor.Plugins.DeviceSoundPlugin.showTimerNotification({
      id,
      name,
      remaining: timeDisplay,
      paused: isPaused,
      finished: false
    });
  }
}

function toggleTimer(id) {
  const timer = timers.find(t => t.id === id);
  if (!timer) return;
  
  if (timer.status === 'running') {
    pauseTimerInternal(id);
  } else {
    resumeTimerInternal(id);
  }
}

function pauseTimerInternal(id) {
  timers = timers.map(t => {
    if (t.id === id) {
      updateNativeTimerNotification(t.id, t.name, t.remaining, true);
      return { ...t, status: 'paused' };
    }
    return t;
  });
  saveTimers();
  const grid = document.getElementById('timers-list-grid');
  if (grid) grid.innerHTML = renderTimersGrid();
  showToast('Timer paused');
}

function resumeTimerInternal(id) {
  timers = timers.map(t => {
    if (t.id === id) {
      updateNativeTimerNotification(t.id, t.name, t.remaining, false);
      return { ...t, status: 'running' };
    }
    return t;
  });
  saveTimers();
  const grid = document.getElementById('timers-list-grid');
  if (grid) grid.innerHTML = renderTimersGrid();
  showToast('Timer started');
}

function resetTimer(id) {
  timers = timers.map(t => {
    if (t.id === id) {
      // Clear native timer notification
      if (window.Capacitor && window.Capacitor.Plugins.DeviceSoundPlugin) {
        window.Capacitor.Plugins.DeviceSoundPlugin.cancelTimerNotification({ id: t.id });
      }
      return { ...t, remaining: t.duration, status: 'idle' };
    }
    return t;
  });
  saveTimers();
  const grid = document.getElementById('timers-list-grid');
  if (grid) grid.innerHTML = renderTimersGrid();
  
  if (activeZoomTimerId === id) {
    const active = timers.find(t => t.id === id);
    updateZoomTimerDigits(active.duration, active.duration);
  }
  
  showToast('Timer reset');
}

function deleteTimer(id) {
  if (window.Capacitor && window.Capacitor.Plugins.DeviceSoundPlugin) {
    window.Capacitor.Plugins.DeviceSoundPlugin.cancelTimerNotification({ id });
  }
  timers = timers.filter(t => t.id !== id);
  saveTimers();
  const grid = document.getElementById('timers-list-grid');
  if (grid) grid.innerHTML = renderTimersGrid();
  showToast('Timer deleted');
}

function showAddTimerDialog() {
  const content = document.createElement('div');
  content.className = 'add-timer-dialog';
  content.innerHTML = `
    <div class="picker-headers">
      <span>Hours</span>
      <span>Minutes</span>
      <span>Seconds</span>
    </div>
    <div class="picker-spinners">
      <div id="timer-pick-hrs-container" style="flex: 1;"></div>
      <div id="timer-pick-mins-container" style="flex: 1;"></div>
      <div id="timer-pick-secs-container" style="flex: 1;"></div>
    </div>
    <div class="picker-name-row">
      <input type="text" class="fluent-input" id="timer-pick-name" placeholder="Timer name" value="Timer" style="margin-top: 12px; width: 100%;">
    </div>
  `;

  const dialogId = showDialog({
    title: 'Add Timer',
    content,
    buttons: [
      {
        text: 'Add',
        primary: true,
        onClick: (dialog) => {
          // Read selected values from the custom Fluent dropdown options
          const hrsItem = dialog.querySelector('#timer-pick-hrs .fluent-dropdown-item.selected');
          const hrs = hrsItem ? parseInt(hrsItem.dataset.value) : 0;
          
          const minsItem = dialog.querySelector('#timer-pick-mins .fluent-dropdown-item.selected');
          const mins = minsItem ? parseInt(minsItem.dataset.value) : 0;
          
          const secsItem = dialog.querySelector('#timer-pick-secs .fluent-dropdown-item.selected');
          const secs = secsItem ? parseInt(secsItem.dataset.value) : 0;
          
          const name = dialog.querySelector('#timer-pick-name').value.trim() || 'Timer';
          const duration = (hrs * 3600) + (mins * 60) + secs;
          
          if (duration <= 0) {
            showToast('Duration must be greater than 0', 'error');
            return true; // prevent close
          }
          
          const newTimer = {
            id: Date.now(),
            name,
            duration,
            remaining: duration,
            status: 'idle'
          };
          
          timers.push(newTimer);
          saveTimers();
          
          const grid = document.getElementById('timers-list-grid');
          if (grid) grid.innerHTML = renderTimersGrid();
          showToast('Timer created!', 'success');
          return false;
        }
      },
      {
        text: 'Cancel',
        primary: false
      }
    ]
  });

  // Construct custom Fluent dropdown selections inside the dialog placeholder containers
  const dialogEl = document.getElementById(dialogId);
  if (dialogEl) {
    const hrsOptions = Array.from({length: 24}).map((_, i) => ({ value: String(i), text: String(i).padStart(2, '0') }));
    const minsOptions = Array.from({length: 60}).map((_, i) => ({ value: String(i), text: String(i).padStart(2, '0') }));
    const secsOptions = Array.from({length: 60}).map((_, i) => ({ value: String(i), text: String(i).padStart(2, '0') }));
    
    createFluentDropdown({
      id: 'timer-pick-hrs',
      options: hrsOptions,
      value: '0',
      onChange: () => {},
      container: dialogEl.querySelector('#timer-pick-hrs-container')
    });
    
    createFluentDropdown({
      id: 'timer-pick-mins',
      options: minsOptions,
      value: '15', // default 15 minutes
      onChange: () => {},
      container: dialogEl.querySelector('#timer-pick-mins-container')
    });
    
    createFluentDropdown({
      id: 'timer-pick-secs',
      options: secsOptions,
      value: '0',
      onChange: () => {},
      container: dialogEl.querySelector('#timer-pick-secs-container')
    });
  }
}

function triggerTimerEnd(timer) {
  // Trigger finished notification (makes system sound and vibration)
  if (window.Capacitor && window.Capacitor.Plugins.DeviceSoundPlugin) {
    window.Capacitor.Plugins.DeviceSoundPlugin.showTimerNotification({
      id: timer.id,
      name: timer.name,
      remaining: "00:00:00",
      paused: false,
      finished: true
    });
  }
  
  audio.playAlarmSound('digital');
  
  const content = document.createElement('div');
  content.className = 'timer-alert-trigger';
  content.innerHTML = `
    <div class="timer-trigger-bell animate-wiggle">${icons.hourglass}</div>
    <div class="timer-trigger-title">${timer.name}</div>
    <div class="timer-trigger-desc">Countdown complete!</div>
  `;
  
  showDialog({
    title: 'Timer Finished',
    content,
    buttons: [
      {
        text: 'Dismiss',
        primary: true,
        onClick: () => {
          audio.stopAlarmSound();
          if (window.Capacitor && window.Capacitor.Plugins.DeviceSoundPlugin) {
            window.Capacitor.Plugins.DeviceSoundPlugin.cancelTimerNotification({ id: timer.id });
          }
          return false;
        }
      }
    ]
  });
}

// Zoom / Fullscreen Desk Clock Overlay Mode
function enterZoomMode(id) {
  const timer = timers.find(t => t.id === id);
  if (!timer) return;
  
  activeZoomTimerId = id;
  
  const overlay = document.createElement('div');
  overlay.className = 'fullscreen-zoom-overlay';
  overlay.id = 'timer-zoom-overlay';
  
  const hrs = Math.floor(timer.remaining / 3600);
  const mins = Math.floor((timer.remaining % 3600) / 60);
  const secs = timer.remaining % 60;
  const timeDisplay = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  
  overlay.innerHTML = `
    <button class="zoom-close-btn" id="btn-zoom-close" title="Exit Fullscreen">${icons.close}</button>
    <div class="zoom-content-center">
      <div class="zoom-timer-title">${timer.name}</div>
      <div class="zoom-timer-digits" id="zoom-digits-text">${timeDisplay}</div>
      
      <div class="zoom-progress-container">
        <div class="zoom-progress-bar-bg">
          <div class="zoom-progress-bar-fill" id="zoom-progress-fill" style="width: ${((timer.duration - timer.remaining) / timer.duration) * 100}%;"></div>
        </div>
      </div>
      
      <div class="zoom-controls">
        <button class="fluent-btn-icon btn-zoom-play" id="btn-zoom-play" title="Play/Pause">
          ${timer.status === 'running' ? icons.pause : icons.play}
        </button>
        <button class="fluent-btn-icon btn-zoom-reset" id="btn-zoom-reset" title="Reset">${icons.reset}</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Bind zoom close
  document.getElementById('btn-zoom-close').onclick = () => {
    activeZoomTimerId = null;
    overlay.remove();
  };
  
  const playBtn = document.getElementById('btn-zoom-play');
  playBtn.onclick = () => {
    toggleTimer(id);
    // Sync icon with new state
    const t = timers.find(x => x.id === id);
    playBtn.innerHTML = t.status === 'running' ? icons.pause : icons.play;
  };
  
  document.getElementById('btn-zoom-reset').onclick = () => {
    resetTimer(id);
    const t = timers.find(x => x.id === id);
    playBtn.innerHTML = icons.play;
    updateZoomTimerDigits(t.duration, t.duration);
  };
}

function updateZoomTimerDigits(remaining, duration) {
  const digitsEl = document.getElementById('zoom-digits-text');
  if (digitsEl) {
    const hrs = Math.floor(remaining / 3600);
    const mins = Math.floor((remaining % 3600) / 60);
    const secs = remaining % 60;
    digitsEl.innerText = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  
  const fillEl = document.getElementById('zoom-progress-fill');
  if (fillEl && duration > 0) {
    fillEl.style.width = `${((duration - remaining) / duration) * 100}%`;
  }
}
