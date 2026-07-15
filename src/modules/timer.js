import { storage, icons, showToast, showDialog } from './utils.js';
import * as audio from './audio.js';

let timers = [];
let timerTicker = null;
let activeZoomTimerId = null;

export function initTimerModule() {
  timers = storage.get('timers', [
    { id: 1, name: '1 Minute Presets', duration: 60, remaining: 60, status: 'idle' },
    { id: 2, name: 'Egg Timer', duration: 180, remaining: 180, status: 'idle' },
    { id: 3, name: 'Tea Timer', duration: 300, remaining: 300, status: 'idle' },
    { id: 4, name: 'Pizza Baking', duration: 720, remaining: 720, status: 'idle' }
  ]);
  
  // Clean up states on boot (load as paused/idle)
  timers = timers.map(t => ({
    ...t,
    status: 'idle',
    remaining: t.duration
  }));
  
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
    return `
      <div class="empty-state-card">
        <div class="empty-icon">${icons.timer}</div>
        <p>No timers configured. Click the "+" button to create one.</p>
      </div>
    `;
  }
  
  return timers.map(timer => {
    const hrs = Math.floor(timer.remaining / 3600);
    const mins = Math.floor((timer.remaining % 3600) / 60);
    const secs = timer.remaining % 60;
    
    const timeDisplay = `${hrs > 0 ? String(hrs).padStart(2, '0') + ':' : ''}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const playPauseIcon = timer.status === 'running' ? icons.pause : icons.play;
    
    return `
      <div class="fluent-card timer-item-card" data-id="${timer.id}">
        <div class="timer-card-header">
          <span class="timer-name-text">${timer.name}</span>
          <button class="fluent-btn-icon timer-delete-btn" data-id="${timer.id}" title="Delete timer">${icons.trash}</button>
        </div>
        
        <div class="timer-body">
          <div class="timer-circle-wrap">
            <svg class="progress-ring" width="120" height="120">
              <circle class="progress-ring__circle-bg" stroke="var(--border-color)" stroke-width="4" fill="transparent" r="50" cx="60" cy="60"/>
              <circle class="progress-ring__circle timer-progress-circle" stroke="var(--accent-color)" stroke-dasharray="314.16" stroke-dashoffset="${getDashOffset(timer)}" stroke-linecap="round" stroke-width="5" fill="transparent" r="50" cx="60" cy="60"/>
            </svg>
            <div class="timer-display-digits">${timeDisplay}</div>
          </div>
        </div>
        
        <div class="timer-card-footer">
          <button class="fluent-btn-icon timer-ctrl-btn btn-timer-toggle" data-id="${timer.id}">${playPauseIcon}</button>
          <button class="fluent-btn-icon timer-ctrl-btn btn-timer-reset" data-id="${timer.id}">${icons.stop}</button>
          <button class="fluent-btn-icon timer-ctrl-btn btn-timer-zoom" data-id="${timer.id}">${icons.zoom}</button>
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
          
          // If in zoom mode, update the full screen clock numbers live
          if (activeZoomTimerId === timer.id) {
            updateZoomTimerDigits(nextVal, timer.duration);
          }
          
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
      // Re-render local page grid without full page flash
      updateGridTimersUI();
    }
  }, 1000);
}

function updateGridTimersUI() {
  timers.forEach(timer => {
    const card = document.querySelector(`.timer-item-card[data-id="${timer.id}"]`);
    if (!card) return;
    
    // Update digits
    const digitsEl = card.querySelector('.timer-display-digits');
    if (digitsEl) {
      const hrs = Math.floor(timer.remaining / 3600);
      const mins = Math.floor((timer.remaining % 3600) / 60);
      const secs = timer.remaining % 60;
      digitsEl.innerText = `${hrs > 0 ? String(hrs).padStart(2, '0') + ':' : ''}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    
    // Update progress circle
    const circle = card.querySelector('.timer-progress-circle');
    if (circle) {
      circle.style.strokeDashoffset = getDashOffset(timer);
    }
  });
}

function toggleTimer(id) {
  timers = timers.map(t => {
    if (t.id === id) {
      const isRunning = t.status === 'running';
      const newStatus = isRunning ? 'idle' : 'running';
      showToast(isRunning ? 'Timer paused' : 'Timer started');
      return { ...t, status: newStatus };
    }
    return t;
  });
  saveTimers();
  
  // Update toggle button icon locally
  const card = document.querySelector(`.timer-item-card[data-id="${id}"]`);
  if (card) {
    const toggleBtn = card.querySelector('.btn-timer-toggle');
    const timer = timers.find(t => t.id === id);
    if (toggleBtn && timer) {
      toggleBtn.innerHTML = timer.status === 'running' ? icons.pause : icons.play;
    }
  }
}

function resetTimer(id) {
  timers = timers.map(t => {
    if (t.id === id) {
      return { ...t, status: 'idle', remaining: t.duration };
    }
    return t;
  });
  saveTimers();
  
  // Reset full screen zoom view too if active
  if (activeZoomTimerId === id) {
    const timer = timers.find(t => t.id === id);
    updateZoomTimerDigits(timer.remaining, timer.duration);
    const zoomPlayBtn = document.getElementById('zoom-btn-play');
    if (zoomPlayBtn) zoomPlayBtn.innerHTML = icons.play;
  }
  
  // Refresh UI
  updateGridTimersUI();
  
  // Restore button state in grid
  const card = document.querySelector(`.timer-item-card[data-id="${id}"]`);
  if (card) {
    const toggleBtn = card.querySelector('.btn-timer-toggle');
    if (toggleBtn) toggleBtn.innerHTML = icons.play;
  }
  
  showToast('Timer reset');
}

function deleteTimer(id) {
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
      <select class="fluent-select picker-select" id="timer-pick-hrs">
        ${Array.from({length: 24}).map((_, i) => `<option value="${i}">${String(i).padStart(2, '0')}</option>`).join('')}
      </select>
      <select class="fluent-select picker-select" id="timer-pick-mins">
        ${Array.from({length: 60}).map((_, i) => `<option value="${i}">${String(i).padStart(2, '0')}</option>`).join('')}
      </select>
      <select class="fluent-select picker-select" id="timer-pick-secs">
        ${Array.from({length: 60}).map((_, i) => `<option value="${i}">${String(i).padStart(2, '0')}</option>`).join('')}
      </select>
    </div>
    <div class="picker-name-row">
      <input type="text" class="fluent-input" id="timer-pick-name" placeholder="Timer name" value="Timer">
    </div>
  `;

  showDialog({
    title: 'Add Timer',
    content,
    buttons: [
      {
        text: 'Add',
        primary: true,
        onClick: (dialog) => {
          const hrs = parseInt(dialog.querySelector('#timer-pick-hrs').value);
          const mins = parseInt(dialog.querySelector('#timer-pick-mins').value);
          const secs = parseInt(dialog.querySelector('#timer-pick-secs').value);
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
          return false; // close dialog
        }
      },
      {
        text: 'Cancel',
        primary: false
      }
    ]
  });
}

// Timer Expiration
function triggerTimerEnd(timer) {
  // Sound alarm
  audio.playAlarmSound('digital');
  
  // Custom timer dialog trigger
  showDialog({
    title: 'Timer Finished',
    content: `
      <div class="timer-end-dialog-body animate-wiggle">
        <div class="timer-end-icon">${icons.timer}</div>
        <div class="timer-end-name">${timer.name}</div>
        <div class="timer-end-desc">Time is up!</div>
      </div>
    `,
    buttons: [
      {
        text: 'Dismiss',
        primary: true,
        onClick: () => {
          audio.stopAlarmSound();
          return false;
        }
      }
    ]
  });
}


// --- FULLSCREEN ZOOM MODE ---

function enterZoomMode(id) {
  const timer = timers.find(t => t.id === id);
  if (!timer) return;
  
  activeZoomTimerId = id;
  
  const zoomOverlay = document.createElement('div');
  zoomOverlay.className = 'fluent-zoom-overlay';
  zoomOverlay.id = 'timer-zoom-overlay';
  
  const hrs = Math.floor(timer.remaining / 3600);
  const mins = Math.floor((timer.remaining % 3600) / 60);
  const secs = timer.remaining % 60;
  const timeDisplay = `${hrs > 0 ? String(hrs).padStart(2, '0') + ':' : ''}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  
  const playPauseIcon = timer.status === 'running' ? icons.pause : icons.play;
  
  zoomOverlay.innerHTML = `
    <div class="zoom-header">
      <span class="zoom-title">${timer.name}</span>
      <button class="fluent-btn-icon zoom-exit-btn" id="zoom-exit-trigger" title="Exit Full Screen">${icons.close}</button>
    </div>
    
    <div class="zoom-clock-container">
      <div class="zoom-ring-wrapper">
        <svg class="progress-ring" width="340" height="340">
          <circle class="progress-ring__circle-bg" stroke="rgba(255,255,255,0.06)" stroke-width="6" fill="transparent" r="150" cx="170" cy="170"/>
          <circle class="progress-ring__circle" id="zoom-progress-circle" stroke="var(--accent-color)" stroke-dasharray="942.48" stroke-dashoffset="${getZoomDashOffset(timer)}" stroke-linecap="round" stroke-width="8" fill="transparent" r="150" cx="170" cy="170"/>
        </svg>
        <div class="zoom-digits" id="zoom-digits-text">${timeDisplay}</div>
      </div>
    </div>
    
    <div class="zoom-footer-controls">
      <button class="fluent-btn-icon zoom-ctrl-btn" id="zoom-btn-play" data-id="${timer.id}">${playPauseIcon}</button>
      <button class="fluent-btn-icon zoom-ctrl-btn" id="zoom-btn-reset" data-id="${timer.id}">${icons.stop}</button>
    </div>
  `;
  
  document.body.appendChild(zoomOverlay);
  
  // Bind overlay controls
  document.getElementById('zoom-exit-trigger').addEventListener('click', exitZoomMode);
  
  document.getElementById('zoom-btn-play').addEventListener('click', () => {
    toggleTimer(id);
    const updatedTimer = timers.find(t => t.id === id);
    document.getElementById('zoom-btn-play').innerHTML = updatedTimer.status === 'running' ? icons.pause : icons.play;
  });
  
  document.getElementById('zoom-btn-reset').addEventListener('click', () => {
    resetTimer(id);
  });
  
  requestAnimationFrame(() => {
    zoomOverlay.classList.add('visible');
  });
}

function updateZoomTimerDigits(remSecs, totalSecs) {
  const digitsEl = document.getElementById('zoom-digits-text');
  if (digitsEl) {
    const hrs = Math.floor(remSecs / 3600);
    const mins = Math.floor((remSecs % 3600) / 60);
    const secs = remSecs % 60;
    digitsEl.innerText = `${hrs > 0 ? String(hrs).padStart(2, '0') + ':' : ''}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  
  const circle = document.getElementById('zoom-progress-circle');
  if (circle) {
    const radius = 150;
    const circumference = 2 * Math.PI * radius; // ~942.48
    const pct = totalSecs > 0 ? (totalSecs - remSecs) / totalSecs : 0;
    circle.style.strokeDashoffset = circumference - pct * circumference;
  }
}

function getZoomDashOffset(timer) {
  const radius = 150;
  const circumference = 2 * Math.PI * radius;
  const pct = timer.duration > 0 ? (timer.duration - timer.remaining) / timer.duration : 0;
  return circumference - pct * circumference;
}

function exitZoomMode() {
  const overlay = document.getElementById('timer-zoom-overlay');
  if (overlay) {
    overlay.classList.remove('visible');
    setTimeout(() => {
      overlay.remove();
      activeZoomTimerId = null;
    }, 200);
  }
}
