import { storage, icons, showToast } from './utils.js';

let stopwatchStartTime = 0;
let stopwatchElapsedTime = 0;
let stopwatchRunning = false;
let stopwatchAnimationFrameId = null;

let laps = []; // { id, lapNum, lapTimeMs, splitTimeMs }

export function initStopwatchModule() {
  // Read back laps from storage if any (useful if they refresh/reboot, though stopwatch is usually session-based)
  laps = storage.get('stopwatch_laps', []);
  stopwatchElapsedTime = storage.get('stopwatch_elapsed', 0);
  stopwatchStartTime = storage.get('stopwatch_start_time', 0);
  stopwatchRunning = storage.get('stopwatch_running', false);
  
  if (stopwatchRunning) {
    // If it was running, calculate offset
    const now = Date.now();
    stopwatchStartTime = now - stopwatchElapsedTime;
    startLoop();
  }
}

function saveStopwatchState() {
  storage.set('stopwatch_laps', laps);
  storage.set('stopwatch_elapsed', stopwatchElapsedTime);
  storage.set('stopwatch_start_time', stopwatchStartTime);
  storage.set('stopwatch_running', stopwatchRunning);
}

export function renderStopwatchView(container) {
  container.innerHTML = `
    <div class="fluent-page-header">
      <h2>Stopwatch</h2>
    </div>
    
    <div class="stopwatch-layout-grid">
      <!-- Left side: Digital face -->
      <div class="stopwatch-col-left">
        <div class="stopwatch-display-card">
          <div class="stopwatch-time-face" id="stopwatch-digits">00:00.00</div>
          
          <div class="stopwatch-controls">
            <button class="fluent-btn-icon btn-stopwatch-main" id="btn-stopwatch-toggle" title="Play/Pause">${stopwatchRunning ? icons.pause : icons.play}</button>
            <button class="fluent-btn-icon btn-stopwatch-sec" id="btn-stopwatch-lap" ${stopwatchRunning ? '' : 'disabled'} title="Record Lap">${icons.lap}</button>
            <button class="fluent-btn-icon btn-stopwatch-sec" id="btn-stopwatch-reset" ${stopwatchElapsedTime > 0 ? '' : 'disabled'} title="Reset Stopwatch">${icons.reset}</button>
          </div>
        </div>
      </div>
      
      <!-- Right side: Laps List -->
      <div class="stopwatch-col-right">
        <div class="fluent-card stopwatch-laps-card">
          <div class="card-header">
            <h3>Laps</h3>
            <span class="laps-counter-badge" id="laps-count-badge">${laps.length}</span>
          </div>
          
          <div class="laps-table-header">
            <span class="col-num">Lap</span>
            <span class="col-lap">Lap time</span>
            <span class="col-split">Split time</span>
          </div>
          
          <div class="laps-list-body" id="stopwatch-laps-list">
            ${renderLapsList()}
          </div>
        </div>
      </div>
    </div>
  `;

  bindEvents();
  updateDisplay(stopwatchElapsedTime);
}

function renderLapsList() {
  if (laps.length === 0) {
    return `<div class="empty-laps">No laps recorded yet. Start the stopwatch and click the flag icon.</div>`;
  }
  
  // Find min/max lap times to highlight fastest (green) and slowest (red)
  let minIdx = -1;
  let maxIdx = -1;
  
  if (laps.length > 1) {
    let minTime = Infinity;
    let maxTime = -Infinity;
    
    laps.forEach((lap, index) => {
      if (lap.lapTimeMs < minTime) {
        minTime = lap.lapTimeMs;
        minIdx = index;
      }
      if (lap.lapTimeMs > maxTime) {
        maxTime = lap.lapTimeMs;
        maxIdx = index;
      }
    });
  }

  // Render laps in reverse order (newest first)
  return [...laps].reverse().map((lap, index) => {
    // Correct index referencing since we reversed it
    const actualIndex = laps.length - 1 - index;
    let rowClass = '';
    let badgeHtml = '';
    
    if (actualIndex === minIdx) {
      rowClass = 'lap-row-fastest';
      badgeHtml = '<span class="lap-badge fast-badge">Fastest</span>';
    } else if (actualIndex === maxIdx) {
      rowClass = 'lap-row-slowest';
      badgeHtml = '<span class="lap-badge slow-badge">Slowest</span>';
    }
    
    return `
      <div class="lap-table-row ${rowClass}">
        <span class="col-num">${lap.lapNum}</span>
        <span class="col-lap">${formatTimeMs(lap.lapTimeMs)} ${badgeHtml}</span>
        <span class="col-split">${formatTimeMs(lap.splitTimeMs)}</span>
      </div>
    `;
  }).join('');
}

function bindEvents() {
  const toggleBtn = document.getElementById('btn-stopwatch-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleStopwatch);
  }
  
  const lapBtn = document.getElementById('btn-stopwatch-lap');
  if (lapBtn) {
    lapBtn.addEventListener('click', recordLap);
  }
  
  const resetBtn = document.getElementById('btn-stopwatch-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetStopwatch);
  }
}

function toggleStopwatch() {
  const toggleBtn = document.getElementById('btn-stopwatch-toggle');
  const lapBtn = document.getElementById('btn-stopwatch-lap');
  const resetBtn = document.getElementById('btn-stopwatch-reset');
  
  if (stopwatchRunning) {
    // Pause
    stopwatchRunning = false;
    cancelAnimationFrame(stopwatchAnimationFrameId);
    stopwatchElapsedTime = Date.now() - stopwatchStartTime;
    
    if (toggleBtn) toggleBtn.innerHTML = icons.play;
    if (lapBtn) lapBtn.disabled = true;
    if (resetBtn) resetBtn.disabled = false;
    
    showToast('Stopwatch paused');
  } else {
    // Play
    stopwatchRunning = true;
    stopwatchStartTime = Date.now() - stopwatchElapsedTime;
    startLoop();
    
    if (toggleBtn) toggleBtn.innerHTML = icons.pause;
    if (lapBtn) lapBtn.disabled = false;
    if (resetBtn) resetBtn.disabled = false;
    
    showToast('Stopwatch started');
  }
  saveStopwatchState();
}

function recordLap() {
  if (!stopwatchRunning) return;
  
  const now = Date.now();
  const currentSplit = now - stopwatchStartTime;
  
  // Calculate lap time (difference from previous split)
  let lastSplit = 0;
  if (laps.length > 0) {
    lastSplit = laps[laps.length - 1].splitTimeMs;
  }
  const currentLapTime = currentSplit - lastSplit;
  
  const newLap = {
    id: Date.now(),
    lapNum: laps.length + 1,
    lapTimeMs: currentLapTime,
    splitTimeMs: currentSplit
  };
  
  laps.push(newLap);
  saveStopwatchState();
  
  // Update UI list
  const lapsListEl = document.getElementById('stopwatch-laps-list');
  if (lapsListEl) {
    lapsListEl.innerHTML = renderLapsList();
  }
  
  const countBadge = document.getElementById('laps-count-badge');
  if (countBadge) {
    countBadge.innerText = laps.length;
  }
  
  showToast(`Lap ${newLap.lapNum} recorded`, 'info');
}

function resetStopwatch() {
  stopwatchRunning = false;
  cancelAnimationFrame(stopwatchAnimationFrameId);
  stopwatchElapsedTime = 0;
  stopwatchStartTime = 0;
  laps = [];
  saveStopwatchState();
  
  // Reset buttons
  const toggleBtn = document.getElementById('btn-stopwatch-toggle');
  if (toggleBtn) toggleBtn.innerHTML = icons.play;
  
  const lapBtn = document.getElementById('btn-stopwatch-lap');
  if (lapBtn) lapBtn.disabled = true;
  
  const resetBtn = document.getElementById('btn-stopwatch-reset');
  if (resetBtn) resetBtn.disabled = true;
  
  // Reset digital display
  updateDisplay(0);
  
  // Clear lists
  const lapsListEl = document.getElementById('stopwatch-laps-list');
  if (lapsListEl) {
    lapsListEl.innerHTML = renderLapsList();
  }
  
  const countBadge = document.getElementById('laps-count-badge');
  if (countBadge) {
    countBadge.innerText = 0;
  }
  
  showToast('Stopwatch reset');
}

// Precision Loop
function startLoop() {
  function tick() {
    if (!stopwatchRunning) return;
    
    stopwatchElapsedTime = Date.now() - stopwatchStartTime;
    updateDisplay(stopwatchElapsedTime);
    stopwatchAnimationFrameId = requestAnimationFrame(tick);
  }
  stopwatchAnimationFrameId = requestAnimationFrame(tick);
}

function updateDisplay(ms) {
  const digitsEl = document.getElementById('stopwatch-digits');
  if (digitsEl) {
    digitsEl.innerText = formatTimeMs(ms);
  }
}

// Helper to format ms to MM:SS.CC (Minutes, Seconds, Centiseconds)
function formatTimeMs(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);
  
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const cc = String(centiseconds).padStart(2, '0');
  
  return `${mm}:${ss}.${cc}`;
}
