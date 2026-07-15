import { storage, icons, showToast } from './utils.js';
import { oauth } from './oauth.js';
import * as audio from './audio.js';

let focusTimerInterval = null;
let focusSecondsRemaining = 0;
let focusTotalSeconds = 0;
let focusState = 'idle'; // idle, running, paused, break
let focusMode = 'focus'; // focus, break
let focusMinutesConfig = 25;
let skipBreaks = false;
let activeTaskId = null;
let currentLofiBeatSource = null;
let visualizerAnimationId = null;

// Local states
let tasks = [];
let focusHistory = []; // { date: 'YYYY-MM-DD', minutes: 25 }
let currentPlayingTrack = null; // { id, name, artist, type, sound }
let spotifyVolume = 0.5;

// Microsoft Graph specific
let activeMicrosoftListId = null;
let isMicrosoftLoading = false;

// Local fallback lists
const localPlaylists = [
  { id: 'lofi', name: 'Procedural Lofi Flow', artist: 'Antigravity Synth', type: 'lofi' },
  { id: 'rain', name: 'Gentle Rain Shower', artist: 'Nature Focus', type: 'ambient', sound: 'rain' },
  { id: 'waves', name: 'Deep Blue Waves', artist: 'Ocean Calm', type: 'ambient', sound: 'waves' },
  { id: 'white', name: 'Pure White Noise', artist: 'Zen Static', type: 'ambient', sound: 'white-noise' }
];

let activePlaylists = [...localPlaylists];

export function initFocusModule() {
  tasks = storage.get('focus_tasks', [
    { id: 1, text: 'Design Windows 11 Clock UI', completed: false, active: true },
    { id: 2, text: 'Implement synthesized audio engines', completed: false, active: false },
    { id: 3, text: 'Build world clock time comparison', completed: false, active: false }
  ]);
  
  focusHistory = storage.get('focus_history', [
    { date: new Date().toISOString().split('T')[0], minutes: 15 }
  ]);
  
  skipBreaks = storage.get('skip_breaks', false);
  focusMinutesConfig = storage.get('focus_minutes', 25);
  
  const activeTask = tasks.find(t => t.active);
  if (activeTask) activeTaskId = activeTask.id;
  
  resetTimer();
  
  // Auto-sync Microsoft To-Do if token exists
  if (oauth.getMicrosoftToken()) {
    syncMicrosoftTasks();
  }
}

function saveTasks() {
  storage.set('focus_tasks', tasks);
}

function saveHistory() {
  storage.set('focus_history', focusHistory);
}

// --- MICROSOFT GRAPH API IMPLEMENTATION ---

async function msGraphRequest(endpoint, options = {}) {
  const token = oauth.getMicrosoftToken();
  if (!token) return null;
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  try {
    const res = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
      ...options,
      headers
    });
    if (res.status === 204) return true; // DELETE returns 204
    if (!res.ok) {
      if (res.status === 401) {
        oauth.logoutMicrosoft();
        showToast('Microsoft session expired. Please sign in again.', 'error');
        refreshTasksUI();
      }
      throw new Error(`MS Graph API Error: ${res.statusText}`);
    }
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

async function syncMicrosoftTasks() {
  isMicrosoftLoading = true;
  refreshTasksUI();
  
  try {
    // 1. Get task lists
    const listsData = await msGraphRequest('/me/todo/lists');
    if (!listsData || !listsData.value || listsData.value.length === 0) {
      isMicrosoftLoading = false;
      refreshTasksUI();
      return;
    }
    
    // Pick default list or first
    const defaultList = listsData.value.find(l => l.wellKnownName === 'defaultList') || listsData.value[0];
    activeMicrosoftListId = defaultList.id;
    
    // 2. Fetch tasks from list
    const tasksData = await msGraphRequest(`/me/todo/lists/${activeMicrosoftListId}/tasks?$top=30`);
    if (tasksData && tasksData.value) {
      tasks = tasksData.value.map((t, idx) => ({
        id: t.id,
        text: t.title,
        completed: t.status === 'completed',
        active: idx === 0 // make first active
      }));
      
      const active = tasks.find(t => t.active);
      activeTaskId = active ? active.id : null;
      
      saveTasks();
      showToast('Synced with Microsoft To-Do', 'success');
    }
  } catch (e) {
    console.error('Error syncing Microsoft tasks', e);
  } finally {
    isMicrosoftLoading = false;
    refreshTasksUI();
  }
}

// --- SPOTIFY WEB API IMPLEMENTATION ---

async function spotifyRequest(endpoint, options = {}) {
  const token = oauth.getSpotifyToken();
  if (!token) return null;
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };
  
  try {
    const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
      ...options,
      headers
    });
    if (!res.ok) {
      if (res.status === 401) {
        oauth.logoutSpotify();
        showToast('Spotify session expired. Please sign in again.', 'error');
        refreshSpotifyUI();
      }
      throw new Error(`Spotify API Error: ${res.statusText}`);
    }
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

async function loadSpotifyUserPlaylists() {
  try {
    const data = await spotifyRequest('/me/playlists?limit=6');
    if (data && data.items) {
      const apiPlaylists = data.items.map(p => ({
        id: p.id,
        name: p.name,
        artist: p.owner.display_name || 'Spotify Playlist',
        type: 'spotify_api'
      }));
      
      // Combine API playlists with local fallbacks
      activePlaylists = [...apiPlaylists, ...localPlaylists];
    }
  } catch (e) {
    console.error(e);
    activePlaylists = [...localPlaylists];
  }
  refreshSpotifyUI();
}

// --- VIEW RENDERING ---

export function renderFocusView(container) {
  container.innerHTML = `
    <div class="fluent-page-header">
      <h2>Focus sessions</h2>
    </div>
    
    <div class="focus-layout-grid">
      <!-- Left side: Timer -->
      <div class="focus-col-left">
        <div class="fluent-card focus-timer-card">
          <div class="timer-task-indicator" id="timer-task-text">
            ${getActiveTaskText()}
          </div>
          
          <div class="circular-progress-container">
            <svg class="progress-ring" width="220" height="220">
              <circle class="progress-ring__circle-bg" stroke="var(--border-color)" stroke-width="6" fill="transparent" r="95" cx="110" cy="110"/>
              <circle class="progress-ring__circle" id="focus-progress-circle" stroke="var(--accent-color)" stroke-dasharray="596.9" stroke-dashoffset="596.9" stroke-linecap="round" stroke-width="8" fill="transparent" r="95" cx="110" cy="110"/>
            </svg>
            <div class="timer-display-content">
              <span class="timer-clock-digits" id="focus-timer-text">25:00</span>
              <span class="timer-state-label" id="focus-state-label">Ready</span>
            </div>
          </div>
          
          <div class="timer-controls">
            <button class="fluent-btn-icon btn-timer-main" id="btn-focus-start" title="Start Focus Session">${icons.play}</button>
            <button class="fluent-btn-icon btn-timer-sec" id="btn-focus-reset" title="Stop & Reset">${icons.stop}</button>
            <button class="fluent-btn-icon btn-timer-sec" id="btn-focus-skip" title="Skip Session" style="display: none;">${icons.reset}</button>
          </div>
          
          <div class="focus-duration-control" id="focus-config-inputs">
            <div class="control-row">
              <label>Focus period</label>
              <div class="number-stepper">
                <button class="stepper-btn" id="focus-dec-btn">-</button>
                <input type="number" id="focus-time-input" min="5" max="240" step="5" value="${focusMinutesConfig}">
                <button class="stepper-btn" id="focus-inc-btn">+</button>
              </div>
              <span class="unit-label">mins</span>
            </div>
            
            <div class="control-row checkbox-row">
              <input type="checkbox" id="chk-skip-breaks" ${skipBreaks ? 'checked' : ''}>
              <label for="chk-skip-breaks">Skip breaks</label>
            </div>
            
            <div class="break-duration-info" id="break-info-text">
              Will include a ${getBreakLength(focusMinutesConfig)} minute break
            </div>
          </div>
        </div>
      </div>
      
      <!-- Right side: Spotify, Tasks, Progress -->
      <div class="focus-col-right">
        <!-- Spotify Integration Card -->
        <div class="fluent-card spotify-card" id="spotify-card-container">
          ${renderSpotifyCard()}
        </div>
        
        <!-- Tasks Card -->
        <div class="fluent-card tasks-card">
          <div class="card-header">
            <h3>Tasks</h3>
            <div class="tasks-header-actions">
              ${oauth.getMicrosoftToken() ? `<button class="fluent-btn-icon" id="btn-sync-tasks" title="Sync with Microsoft To-Do">${icons.reset}</button>` : ''}
              <button class="fluent-btn-text" id="btn-add-task">${icons.plus} Add task</button>
            </div>
          </div>
          <div class="task-input-container" id="task-input-form" style="display: none;">
            <input type="text" id="new-task-input" placeholder="What are you working on?" class="fluent-input">
            <div class="input-actions">
              <button class="fluent-btn fluent-btn-primary" id="btn-task-save">Add</button>
              <button class="fluent-btn fluent-btn-secondary" id="btn-task-cancel">Cancel</button>
            </div>
          </div>
          <div class="tasks-list" id="focus-tasks-list">
            ${renderTasksList()}
          </div>
        </div>
        
        <!-- Daily Progress Card -->
        <div class="fluent-card progress-card">
          <h3>Daily progress</h3>
          <div class="progress-details">
            <div class="progress-stat">
              <span class="stat-value" id="focused-today-value">${getTodayFocusMinutes()}m</span>
              <span class="stat-label">focused today</span>
            </div>
            <div class="progress-stat">
              <span class="stat-value" id="focus-streak-value">${getStreakDays()} days</span>
              <span class="stat-label">streak</span>
            </div>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" id="focus-progress-bar-fill" style="width: ${Math.min(100, (getTodayFocusMinutes() / 45) * 100)}%;"></div>
            </div>
            <div class="progress-bar-target">Target: 45 min</div>
          </div>
          <div id="focus-weekly-chart-container">
            ${renderWeeklyChart()}
          </div>
        </div>
      </div>
    </div>
  `;

  // Bind Events
  bindEvents();
  updateTimerUI();
  
  // Trigger background updates
  if (oauth.getSpotifyToken()) {
    loadSpotifyUserPlaylists();
  }
}

function getActiveTaskText() {
  const active = tasks.find(t => t.id === activeTaskId);
  return active ? `Focusing on: <strong>${active.text}</strong>` : 'Select a task to focus on';
}

function getBreakLength(focusMins) {
  if (focusMins < 25) return 5;
  if (focusMins < 50) return 5;
  return 10;
}

function renderSpotifyCard() {
  const isLinked = oauth.getSpotifyToken() !== null;
  
  if (!isLinked) {
    return `
      <div class="spotify-unlinked">
        <div class="spotify-logo-large">${icons.spotify}</div>
        <h3>Link Spotify</h3>
        <p>Connect your real Spotify account to play your focus tracks directly.</p>
        <button class="fluent-btn fluent-btn-primary" id="btn-link-spotify">Link Spotify</button>
      </div>
    `;
  }
  
  // Render active playlist tiles
  let playlistHtml = '';
  activePlaylists.forEach(pl => {
    const isPlayingThis = currentPlayingTrack && currentPlayingTrack.id === pl.id;
    playlistHtml += `
      <div class="playlist-tile ${isPlayingThis ? 'active' : ''}" data-id="${pl.id}">
        <div class="playlist-icon">${icons.music}</div>
        <div class="playlist-info">
          <div class="playlist-name">${pl.name}</div>
          <div class="playlist-artist">${pl.artist}</div>
        </div>
        ${isPlayingThis ? '<div class="playlist-playing-indicator"></div>' : ''}
      </div>
    `;
  });

  // Spotify player view
  let playerEmbedHtml = '';
  if (currentPlayingTrack) {
    if (currentPlayingTrack.type === 'spotify_api') {
      playerEmbedHtml = `
        <div class="spotify-embed-wrapper" style="width: 100%; margin-top: 12px;">
          <iframe src="https://open.spotify.com/embed/playlist/${currentPlayingTrack.id}?utm_source=generator&theme=0" width="100%" height="80" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" style="border-radius: 8px;"></iframe>
        </div>
      `;
    } else {
      playerEmbedHtml = `
        <div class="spotify-player-footer">
          <div class="spotify-track-meta">
            <div class="track-thumbnail">${icons.music}</div>
            <div class="track-details">
              <div class="track-title" id="spotify-current-title">${currentPlayingTrack.name}</div>
              <div class="track-artist" id="spotify-current-artist">${currentPlayingTrack.artist}</div>
            </div>
          </div>
          
          <div class="spotify-visualizer-container" id="visualizer-bars">
            <div class="v-bar"></div><div class="v-bar"></div><div class="v-bar"></div>
            <div class="v-bar"></div><div class="v-bar"></div><div class="v-bar"></div>
            <div class="v-bar"></div><div class="v-bar"></div><div class="v-bar"></div>
          </div>
          
          <div class="spotify-controls">
            <button class="fluent-btn-icon" id="btn-spotify-playpause" title="Play/Pause">${icons.pause}</button>
            <div class="spotify-volume-slider">
              <span class="vol-icon">${icons.volume}</span>
              <input type="range" id="spotify-vol-control" min="0" max="100" value="${spotifyVolume * 100}">
            </div>
          </div>
        </div>
      `;
    }
  }

  return `
    <div class="spotify-linked-header">
      <div class="spotify-brand">
        <span class="spotify-logo-icon">${icons.spotify}</span>
        <h3>Spotify Focus Music</h3>
      </div>
      <button class="fluent-btn-icon" id="btn-unlink-spotify" title="Unlink Spotify account">${icons.close}</button>
    </div>
    
    <div class="spotify-playlists-grid">
      ${playlistHtml}
    </div>
    
    ${playerEmbedHtml}
  `;
}

function renderTasksList() {
  if (isMicrosoftLoading) {
    return `<div class="empty-tasks">Syncing with Microsoft To-Do...</div>`;
  }
  
  if (tasks.length === 0) {
    const isMSLinked = oauth.getMicrosoftToken() !== null;
    return `
      <div class="empty-tasks">
        ${isMSLinked ? 'No tasks found. Click "Add task" to create one.' : 'All tasks completed! Link Microsoft To-Do in Settings to pull your real task lists.'}
      </div>
    `;
  }
  
  return tasks.map(task => `
    <div class="task-item ${task.completed ? 'completed' : ''} ${task.id === activeTaskId ? 'selected' : ''}" data-id="${task.id}">
      <div class="task-checkbox" data-id="${task.id}">
        ${task.completed ? icons.check : ''}
      </div>
      <div class="task-text" data-id="${task.id}">${task.text}</div>
      <div class="task-actions">
        <button class="task-action-btn btn-delete-task" data-id="${task.id}" title="Delete task">${icons.trash}</button>
      </div>
    </div>
  `).join('');
}

function refreshTasksUI() {
  const listEl = document.getElementById('focus-tasks-list');
  if (listEl) {
    listEl.innerHTML = renderTasksList();
  }
  const taskInd = document.getElementById('timer-task-text');
  if (taskInd) {
    taskInd.innerHTML = getActiveTaskText();
  }
}

function refreshSpotifyUI() {
  const container = document.getElementById('spotify-card-container');
  if (container) {
    container.innerHTML = renderSpotifyCard();
    bindEvents();
    if (currentPlayingTrack && currentPlayingTrack.type !== 'spotify_api') {
      startVisualizer();
    }
  }
}

function bindEvents() {
  // Timer Actions
  const btnStart = document.getElementById('btn-focus-start');
  if (btnStart) btnStart.addEventListener('click', toggleTimer);
  
  const btnReset = document.getElementById('btn-focus-reset');
  if (btnReset) btnReset.addEventListener('click', resetTimer);
  
  const btnSkip = document.getElementById('btn-focus-skip');
  if (btnSkip) btnSkip.addEventListener('click', skipSession);
  
  // Timer config inputs
  const timeInput = document.getElementById('focus-time-input');
  if (timeInput) {
    timeInput.addEventListener('change', (e) => {
      let val = parseInt(e.target.value);
      if (isNaN(val) || val < 5) val = 5;
      if (val > 240) val = 240;
      e.target.value = val;
      focusMinutesConfig = val;
      storage.set('focus_minutes', focusMinutesConfig);
      document.getElementById('break-info-text').innerText = `Will include a ${getBreakLength(val)} minute break`;
      if (focusState === 'idle') resetTimer();
    });
  }
  
  const decBtn = document.getElementById('focus-dec-btn');
  if (decBtn) {
    decBtn.addEventListener('click', () => {
      const input = document.getElementById('focus-time-input');
      let val = parseInt(input.value) - 5;
      if (val >= 5) {
        input.value = val;
        input.dispatchEvent(new Event('change'));
      }
    });
  }
  
  const incBtn = document.getElementById('focus-inc-btn');
  if (incBtn) {
    incBtn.addEventListener('click', () => {
      const input = document.getElementById('focus-time-input');
      let val = parseInt(input.value) + 5;
      if (val <= 240) {
        input.value = val;
        input.dispatchEvent(new Event('change'));
      }
    });
  }
  
  const chkSkipBreaks = document.getElementById('chk-skip-breaks');
  if (chkSkipBreaks) {
    chkSkipBreaks.addEventListener('change', (e) => {
      skipBreaks = e.target.checked;
      storage.set('skip_breaks', skipBreaks);
    });
  }
  
  // Task add panel
  const btnAddTask = document.getElementById('btn-add-task');
  if (btnAddTask) {
    btnAddTask.addEventListener('click', () => {
      document.getElementById('task-input-form').style.display = 'block';
      document.getElementById('new-task-input').focus();
    });
  }
  
  const btnTaskCancel = document.getElementById('btn-task-cancel');
  if (btnTaskCancel) {
    btnTaskCancel.addEventListener('click', () => {
      document.getElementById('task-input-form').style.display = 'none';
      document.getElementById('new-task-input').value = '';
    });
  }
  
  const btnTaskSave = document.getElementById('btn-task-save');
  if (btnTaskSave) btnTaskSave.addEventListener('click', saveNewTask);
  
  const newTaskInput = document.getElementById('new-task-input');
  if (newTaskInput) {
    newTaskInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') saveNewTask();
    });
  }
  
  const btnSyncTasks = document.getElementById('btn-sync-tasks');
  if (btnSyncTasks) {
    btnSyncTasks.addEventListener('click', syncMicrosoftTasks);
  }
  
  // Tasks list clicks
  const tasksListEl = document.getElementById('focus-tasks-list');
  if (tasksListEl) {
    tasksListEl.addEventListener('click', (e) => {
      const checkbox = e.target.closest('.task-checkbox');
      const text = e.target.closest('.task-text');
      const deleteBtn = e.target.closest('.btn-delete-task');
      
      if (checkbox) {
        toggleTaskComplete(checkbox.dataset.id);
      } else if (text) {
        selectActiveTask(text.dataset.id);
      } else if (deleteBtn) {
        deleteTask(deleteBtn.dataset.id);
      }
    });
  }
  
  // Spotify Account Link
  const btnLinkSpotify = document.getElementById('btn-link-spotify');
  if (btnLinkSpotify) {
    btnLinkSpotify.addEventListener('click', () => oauth.loginSpotify());
  }
  
  const btnUnlinkSpotify = document.getElementById('btn-unlink-spotify');
  if (btnUnlinkSpotify) {
    btnUnlinkSpotify.addEventListener('click', () => {
      oauth.logoutSpotify();
      activePlaylists = [...localPlaylists];
      refreshSpotifyUI();
    });
  }
  
  // Playlist select
  const spotifyContainer = document.getElementById('spotify-card-container');
  if (spotifyContainer) {
    // Only bind to playlist tile clicks
    const tiles = spotifyContainer.querySelectorAll('.playlist-tile');
    tiles.forEach(tile => {
      tile.addEventListener('click', () => {
        playPlaylist(tile.dataset.id);
      });
    });
  }
  
  // Spotify procedural player controls
  const btnPlayPause = document.getElementById('btn-spotify-playpause');
  if (btnPlayPause) btnPlayPause.addEventListener('click', toggleSpotifyMusic);
  
  const volControl = document.getElementById('spotify-vol-control');
  if (volControl) {
    volControl.addEventListener('input', (e) => {
      spotifyVolume = parseFloat(e.target.value) / 100;
      audio.setVolume(spotifyVolume);
    });
  }
}

// Timer Logic
function toggleTimer() {
  const btnStart = document.getElementById('btn-focus-start');
  
  if (focusState === 'running') {
    focusState = 'paused';
    clearInterval(focusTimerInterval);
    if (btnStart) btnStart.innerHTML = icons.play;
    document.getElementById('focus-state-label').innerText = 'Paused';
    showToast('Focus session paused');
  } else {
    focusState = 'running';
    if (btnStart) btnStart.innerHTML = icons.pause;
    
    document.getElementById('focus-config-inputs').style.opacity = '0.3';
    document.getElementById('focus-config-inputs').style.pointerEvents = 'none';
    document.getElementById('btn-focus-skip').style.display = 'inline-flex';
    
    document.getElementById('focus-state-label').innerText = focusMode === 'focus' ? 'Focusing' : 'Short Break';
    
    focusTimerInterval = setInterval(tickTimer, 1000);
    showToast(focusMode === 'focus' ? 'Focus session started!' : 'Break started!');
  }
}

function tickTimer() {
  if (focusSecondsRemaining > 0) {
    focusSecondsRemaining--;
    updateTimerUI();
  } else {
    clearInterval(focusTimerInterval);
    audio.playAlarmSound('chime');
    
    if (focusMode === 'focus') {
      logFocusMinutes(Math.round(focusTotalSeconds / 60));
      
      if (!skipBreaks) {
        focusMode = 'break';
        focusSecondsRemaining = getBreakLength(focusMinutesConfig) * 60;
        focusTotalSeconds = focusSecondsRemaining;
        focusState = 'idle';
        document.getElementById('focus-state-label').innerText = 'Short Break';
        showToast('Great job! Time for a short break.', 'success');
      } else {
        resetTimer();
        showToast('Focus session complete!', 'success');
      }
    } else {
      focusMode = 'focus';
      resetTimer();
      showToast('Break finished! Ready to focus?', 'success');
    }
    
    updateTimerUI();
    const btnStart = document.getElementById('btn-focus-start');
    if (btnStart) btnStart.innerHTML = icons.play;
    
    setTimeout(() => audio.stopAlarmSound(), 5000);
  }
}

function resetTimer() {
  clearInterval(focusTimerInterval);
  focusState = 'idle';
  focusMode = 'focus';
  focusSecondsRemaining = focusMinutesConfig * 60;
  focusTotalSeconds = focusSecondsRemaining;
  
  const btnStart = document.getElementById('btn-focus-start');
  if (btnStart) btnStart.innerHTML = icons.play;
  
  const skipBtn = document.getElementById('btn-focus-skip');
  if (skipBtn) skipBtn.style.display = 'none';
  
  const config = document.getElementById('focus-config-inputs');
  if (config) {
    config.style.opacity = '1';
    config.style.pointerEvents = 'auto';
  }
  
  const label = document.getElementById('focus-state-label');
  if (label) label.innerText = 'Ready';
  
  updateTimerUI();
}

function skipSession() {
  clearInterval(focusTimerInterval);
  if (focusMode === 'focus') {
    if (!skipBreaks) {
      focusMode = 'break';
      focusSecondsRemaining = getBreakLength(focusMinutesConfig) * 60;
      focusTotalSeconds = focusSecondsRemaining;
      focusState = 'idle';
      showToast('Skipped focus. Time for break!');
    } else {
      resetTimer();
    }
  } else {
    focusMode = 'focus';
    resetTimer();
    showToast('Skipped break. Ready to focus!');
  }
  
  updateTimerUI();
  const btnStart = document.getElementById('btn-focus-start');
  if (btnStart) btnStart.innerHTML = icons.play;
}

function updateTimerUI() {
  const timerTextEl = document.getElementById('focus-timer-text');
  if (timerTextEl) {
    const mins = Math.floor(focusSecondsRemaining / 60);
    const secs = focusSecondsRemaining % 60;
    timerTextEl.innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  
  const circle = document.getElementById('focus-progress-circle');
  if (circle) {
    const radius = 95;
    const circumference = 2 * Math.PI * radius;
    let pct = 0;
    if (focusTotalSeconds > 0) {
      pct = (focusTotalSeconds - focusSecondsRemaining) / focusTotalSeconds;
    }
    circle.style.strokeDashoffset = circumference - pct * circumference;
    circle.style.stroke = focusMode === 'break' ? '#107c41' : 'var(--accent-color)';
  }
}

// Tasks Management CRUD Operations
async function saveNewTask() {
  const input = document.getElementById('new-task-input');
  const text = input.value.trim();
  if (text === '') return;
  
  const isMSLinked = oauth.getMicrosoftToken() !== null;
  
  if (isMSLinked) {
    // Save to Microsoft To-Do API
    showToast('Adding task to Microsoft To-Do...');
    const result = await addMicrosoftTask(text);
    if (result) {
      tasks.push({
        id: result.id,
        text: result.title,
        completed: false,
        active: tasks.length === 0
      });
      if (tasks.length === 1) activeTaskId = result.id;
      saveTasks();
      showToast('Task added to Microsoft To-Do', 'success');
    }
  } else {
    // Offline local tasks
    const newTask = {
      id: Date.now().toString(),
      text: text,
      completed: false,
      active: tasks.length === 0
    };
    tasks.push(newTask);
    if (tasks.length === 1) activeTaskId = newTask.id;
    saveTasks();
    showToast('Local task created', 'success');
  }
  
  document.getElementById('task-input-form').style.display = 'none';
  input.value = '';
  refreshTasksUI();
}

async function addMicrosoftTask(text) {
  if (!activeMicrosoftListId) return null;
  return await msGraphRequest(`/me/todo/lists/${activeMicrosoftListId}/tasks`, {
    method: 'POST',
    body: JSON.stringify({ title: text })
  });
}

async function toggleTaskComplete(id) {
  const isMSLinked = oauth.getMicrosoftToken() !== null;
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  
  const newState = !task.completed;
  task.completed = newState;
  saveTasks();
  refreshTasksUI();
  
  if (isMSLinked) {
    showToast('Updating Microsoft To-Do...');
    await msGraphRequest(`/me/todo/lists/${activeMicrosoftListId}/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newState ? 'completed' : 'notStarted' })
    });
    showToast('Microsoft To-Do updated', 'success');
  } else {
    showToast(newState ? 'Task completed!' : 'Task uncompleted');
  }
}

function selectActiveTask(id) {
  tasks = tasks.map(task => ({
    ...task,
    active: task.id === id
  }));
  activeTaskId = id;
  saveTasks();
  refreshTasksUI();
}

async function deleteTask(id) {
  const isMSLinked = oauth.getMicrosoftToken() !== null;
  tasks = tasks.filter(task => task.id !== id);
  
  if (activeTaskId === id) {
    activeTaskId = tasks.length > 0 ? tasks[0].id : null;
    if (activeTaskId) tasks[0].active = true;
  }
  
  saveTasks();
  refreshTasksUI();
  
  if (isMSLinked) {
    showToast('Deleting from Microsoft To-Do...');
    await msGraphRequest(`/me/todo/lists/${activeMicrosoftListId}/tasks/${id}`, {
      method: 'DELETE'
    });
    showToast('Task deleted from Microsoft To-Do', 'success');
  } else {
    showToast('Local task deleted');
  }
}

// Spotify Playlists Play / Embed Handler
function playPlaylist(id) {
  const pl = activePlaylists.find(p => p.id === id);
  if (!pl) return;
  
  // Toggle off if already playing this one
  if (currentPlayingTrack && currentPlayingTrack.id === pl.id) {
    toggleSpotifyMusic();
    return;
  }
  
  stopSpotifyMusic();
  currentPlayingTrack = pl;
  
  if (pl.type === 'spotify_api') {
    // Real Spotify Playlist: Embed Player Widget
    refreshSpotifyUI();
    showToast(`Loading Spotify playlist: ${pl.name}...`);
  } else {
    // Local procedurally synthesized lofi/ambient preset
    audio.setVolume(spotifyVolume);
    if (pl.type === 'lofi') {
      currentLofiBeatSource = audio.startLofiBeats();
    } else if (pl.type === 'ambient') {
      audio.startAmbientSound(pl.sound);
    }
    
    refreshSpotifyUI();
    startVisualizer();
    showToast(`Playing synthesized track: ${pl.name}...`);
  }
}

function stopSpotifyMusic() {
  if (currentPlayingTrack) {
    if (currentPlayingTrack.type !== 'spotify_api') {
      if (currentPlayingTrack.type === 'lofi' && currentLofiBeatSource) {
        currentLofiBeatSource.stop();
        currentLofiBeatSource = null;
      } else {
        audio.stopAmbientSound();
      }
    }
  }
  cancelAnimationFrame(visualizerAnimationId);
  currentPlayingTrack = null;
}

function toggleSpotifyMusic() {
  if (!currentPlayingTrack) return;
  
  // Only controls local procedural player (Spotify Widget handles itself)
  if (currentPlayingTrack.type === 'spotify_api') return;
  
  const playBtn = document.getElementById('btn-spotify-playpause');
  
  if (currentLofiBeatSource || audio.isAmbientPlaying()) {
    // Pause procedural beats
    if (currentPlayingTrack.type === 'lofi' && currentLofiBeatSource) {
      currentLofiBeatSource.stop();
      currentLofiBeatSource = null;
    } else {
      audio.stopAmbientSound();
    }
    if (playBtn) playBtn.innerHTML = icons.play;
    cancelAnimationFrame(visualizerAnimationId);
    showToast('Music paused');
  } else {
    // Resume procedural beats
    audio.setVolume(spotifyVolume);
    if (currentPlayingTrack.type === 'lofi') {
      currentLofiBeatSource = audio.startLofiBeats();
    } else {
      audio.startAmbientSound(currentPlayingTrack.sound);
    }
    if (playBtn) playBtn.innerHTML = icons.pause;
    startVisualizer();
    showToast('Music resumed');
  }
}

function startVisualizer() {
  cancelAnimationFrame(visualizerAnimationId);
  const bars = document.querySelectorAll('#visualizer-bars .v-bar');
  if (bars.length === 0) return;
  
  function draw() {
    visualizerAnimationId = requestAnimationFrame(draw);
    const data = audio.getVisualizerData();
    if (data.length === 0) return;
    
    bars.forEach((bar, index) => {
      const dataIdx = Math.floor(index * (data.length / bars.length));
      const val = data[dataIdx] || 0;
      const heightPercent = Math.max(5, (val / 255) * 100);
      bar.style.height = `${heightPercent}%`;
      bar.style.backgroundColor = `hsl(200, 100%, ${Math.min(80, 50 + (val/5))}%`;
    });
  }
  
  draw();
}

// Focus Logger Statistics
function logFocusMinutes(mins) {
  if (mins <= 0) return;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = focusHistory.find(h => h.date === todayStr);
  
  if (todayRecord) {
    todayRecord.minutes += mins;
  } else {
    focusHistory.push({ date: todayStr, minutes: mins });
  }
  saveHistory();
  
  const todayMinsEl = document.getElementById('focused-today-value');
  if (todayMinsEl) todayMinsEl.innerText = `${getTodayFocusMinutes()}m`;
  
  const streakEl = document.getElementById('focus-streak-value');
  if (streakEl) streakEl.innerText = `${getStreakDays()} days`;
  
  const progressFill = document.getElementById('focus-progress-bar-fill');
  if (progressFill) {
    progressFill.style.width = `${Math.min(100, (getTodayFocusMinutes() / 45) * 100)}%`;
  }
  
  const chartContainer = document.getElementById('focus-weekly-chart-container');
  if (chartContainer) {
    chartContainer.innerHTML = renderWeeklyChart();
  }
}

function getTodayFocusMinutes() {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = focusHistory.find(h => h.date === todayStr);
  return todayRecord ? todayRecord.minutes : 0;
}

function getStreakDays() {
  if (focusHistory.length === 0) return 0;
  const sorted = [...focusHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
  const todayStr = new Date().toISOString().split('T')[0];
  
  let streak = 0;
  let currentDate = new Date(todayStr);
  
  const hasFocusToday = sorted.some(h => h.date === todayStr);
  if (!hasFocusToday) {
    currentDate.setDate(currentDate.getDate() - 1);
  }
  
  while (true) {
    const curDateStr = currentDate.toISOString().split('T')[0];
    const found = sorted.find(h => h.date === curDateStr);
    if (found && found.minutes > 0) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function renderWeeklyChart() {
  const today = new Date();
  let barsHtml = '';
  const targetMins = 45;
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const record = focusHistory.find(h => h.date === dateStr);
    const mins = record ? record.minutes : 0;
    
    const pct = Math.min(100, (mins / targetMins) * 100);
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'narrow' });
    const tooltip = `${mins} mins focused on ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    const isToday = i === 0;
    
    barsHtml += `
      <div class="chart-col" title="${tooltip}">
        <div class="chart-bar-wrapper">
          <div class="chart-bar-fill ${isToday ? 'today' : ''}" style="height: ${Math.max(4, pct)}%;"></div>
        </div>
        <div class="chart-day-label ${isToday ? 'today' : ''}">${dayLabel}</div>
      </div>
    `;
  }
  
  return `
    <div class="focus-weekly-chart">
      ${barsHtml}
    </div>
  `;
}
