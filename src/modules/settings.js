import { storage, showToast, showDialog } from './utils.js';
import { oauth } from './oauth.js';

let theme = 'dark';
let accentColor = '#60cdff'; // default blue

export function initSettingsModule() {
  theme = storage.get('app_theme', 'dark');
  accentColor = storage.get('app_accent_color', '#60cdff');
  
  applyTheme(theme);
  applyAccentColor(accentColor);
}

export function renderSettingsView(container) {
  const isSpotifyLinked = oauth.getSpotifyToken() !== null;
  const isMicrosoftLinked = oauth.getMicrosoftToken() !== null;
  
  container.innerHTML = `
    <div class="fluent-page-header">
      <h2>Settings</h2>
    </div>
    
    <div class="settings-container">
      <!-- Theme Selection Card -->
      <div class="fluent-card settings-card">
        <h3>App theme</h3>
        <p class="settings-desc">Select which theme to display in the application.</p>
        <div class="theme-options-group">
          <label class="fluent-radio-option">
            <input type="radio" name="settings-theme" value="light" ${theme === 'light' ? 'checked' : ''}>
            <span>Light</span>
          </label>
          <label class="fluent-radio-option">
            <input type="radio" name="settings-theme" value="dark" ${theme === 'dark' ? 'checked' : ''}>
            <span>Dark</span>
          </label>
          <label class="fluent-radio-option">
            <input type="radio" name="settings-theme" value="system" ${theme === 'system' ? 'checked' : ''}>
            <span>Use system setting</span>
          </label>
        </div>
      </div>
      
      <!-- Accent Color Selection Card -->
      <div class="fluent-card settings-card">
        <h3>Accent color</h3>
        <p class="settings-desc">Choose your favorite Fluent accent highlight color.</p>
        <div class="accent-colors-grid">
          <button class="accent-color-circle ${accentColor === '#60cdff' || accentColor === '#0078d4' ? 'active' : ''}" data-color-dark="#60cdff" data-color-light="#0078d4" style="background-color: #0078d4;" title="Windows Blue"></button>
          <button class="accent-color-circle ${accentColor === '#107c41' ? 'active' : ''}" data-color-dark="#107c41" data-color-light="#107c41" style="background-color: #107c41;" title="Emerald Green"></button>
          <button class="accent-color-circle ${accentColor === '#d83b01' ? 'active' : ''}" data-color-dark="#d83b01" data-color-light="#d83b01" style="background-color: #d83b01;" title="Sunset Orange"></button>
          <button class="accent-color-circle ${accentColor === '#8764b8' ? 'active' : ''}" data-color-dark="#8764b8" data-color-light="#5c2d91" style="background-color: #5c2d91;" title="Purple Blossom"></button>
          <button class="accent-color-circle ${accentColor === '#e81123' ? 'active' : ''}" data-color-dark="#e81123" data-color-light="#b30021" style="background-color: #b30021;" title="Crimson Red"></button>
        </div>
      </div>

      <!-- Cloud Accounts Integrations Card -->
      <div class="fluent-card settings-card">
        <h3>Connected services</h3>
        <p class="settings-desc">Link your real Microsoft To-Do and Spotify accounts to unlock live API integrations.</p>
        
        <div class="settings-integration-rows" style="display: flex; flex-direction: column; gap: 16px; margin-top: 8px;">
          <!-- Spotify integration row -->
          <div class="integration-row" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
            <div class="integration-info" style="display: flex; flex-direction: column;">
              <span class="integration-name" style="font-weight: 600; font-size: 13px;">Spotify Integration</span>
              <span class="integration-status" style="font-size: 11px; color: ${isSpotifyLinked ? '#107c41' : 'var(--text-secondary)'};">
                ${isSpotifyLinked ? 'Linked & Authorized' : 'Not Connected (using procedural lofi fallback)'}
              </span>
            </div>
            <button class="fluent-btn ${isSpotifyLinked ? 'fluent-btn-secondary' : 'fluent-btn-primary'}" id="btn-settings-spotify">
              ${isSpotifyLinked ? 'Disconnect' : 'Connect Spotify'}
            </button>
          </div>

          <!-- Microsoft integration row -->
          <div class="integration-row" style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 4px;">
            <div class="integration-info" style="display: flex; flex-direction: column;">
              <span class="integration-name" style="font-weight: 600; font-size: 13px;">Microsoft To-Do Sync</span>
              <span class="integration-status" style="font-size: 11px; color: ${isMicrosoftLinked ? '#107c41' : 'var(--text-secondary)'};">
                ${isMicrosoftLinked ? 'Linked & Authorized' : 'Not Connected (using local tasks fallback)'}
              </span>
            </div>
            <button class="fluent-btn ${isMicrosoftLinked ? 'fluent-btn-secondary' : 'fluent-btn-primary'}" id="btn-settings-microsoft">
              ${isMicrosoftLinked ? 'Disconnect' : 'Connect Microsoft'}
            </button>
          </div>
        </div>
      </div>

      <!-- Developer Credentials Card -->
      <div class="fluent-card settings-card">
        <h3>Developer API credentials</h3>
        <p class="settings-desc">Customize your own OAuth 2.0 Client IDs for self-hosting or development redirects.</p>
        <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <label class="form-label" style="font-size: 10px;">Spotify Client ID</label>
            <input type="text" class="fluent-input" id="setting-spotify-client-id" value="${oauth.getSpotifyClientId()}" style="width: 100%;">
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <label class="form-label" style="font-size: 10px;">Microsoft Client ID</label>
            <input type="text" class="fluent-input" id="setting-microsoft-client-id" value="${oauth.getMicrosoftClientId()}" style="width: 100%;">
          </div>
          <button class="fluent-btn fluent-btn-secondary" id="btn-save-credentials" style="width: max-content; margin-top: 6px;">Save credentials</button>
        </div>
      </div>
      
      <!-- Data Card -->
      <div class="fluent-card settings-card">
        <h3>Reset application</h3>
        <p class="settings-desc">Delete all custom alarms, tasks, timers, focus streaks, settings, and start fresh.</p>
        <button class="fluent-btn fluent-btn-secondary btn-danger" id="btn-reset-data">Clear all data</button>
      </div>
      
      <!-- About Card -->
      <div class="fluent-card settings-card settings-about-card">
        <h3>About</h3>
        <div class="about-row">
          <span class="about-label">Application name</span>
          <span class="about-value">Windows 11 Clock App</span>
        </div>
        <div class="about-row">
          <span class="about-label">Version</span>
          <span class="about-value">1.0.0 (Initial Release)</span>
        </div>
        <div class="about-row">
          <span class="about-label">Developer</span>
          <span class="about-value">Google Deepmind Antigravity Pair Programmer</span>
        </div>
        <div class="about-row">
          <span class="about-label">Packaging</span>
          <span class="about-value">Capacitor Android Hybrid APK</span>
        </div>
      </div>
    </div>
  `;

  bindEvents();
}

function bindEvents() {
  // Theme change
  const radios = document.querySelectorAll('input[name="settings-theme"]');
  radios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const selectedTheme = e.target.value;
      theme = selectedTheme;
      storage.set('app_theme', selectedTheme);
      applyTheme(selectedTheme);
      showToast(`Theme changed to ${selectedTheme}`, 'success');
    });
  });
  
  // Accent color change
  const colorBtns = document.querySelectorAll('.accent-color-circle');
  colorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      colorBtns.forEach(b => b.classList.remove('active'));
      const isLightTheme = document.body.classList.contains('light-theme');
      const selectedColor = isLightTheme ? btn.dataset.colorLight : btn.dataset.colorDark;
      
      accentColor = selectedColor;
      storage.set('app_accent_color', selectedColor);
      btn.classList.add('active');
      applyAccentColor(selectedColor);
      showToast('Accent color updated', 'success');
    });
  });
  
  // Spotify login/logout
  const btnSpotify = document.getElementById('btn-settings-spotify');
  if (btnSpotify) {
    btnSpotify.addEventListener('click', () => {
      const isLinked = oauth.getSpotifyToken() !== null;
      if (isLinked) {
        oauth.logoutSpotify();
        btnSpotify.className = 'fluent-btn fluent-btn-primary';
        btnSpotify.innerText = 'Connect Spotify';
        refreshView();
      } else {
        oauth.loginSpotify();
      }
    });
  }

  // Microsoft login/logout
  const btnMicrosoft = document.getElementById('btn-settings-microsoft');
  if (btnMicrosoft) {
    btnMicrosoft.addEventListener('click', () => {
      const isLinked = oauth.getMicrosoftToken() !== null;
      if (isLinked) {
        oauth.logoutMicrosoft();
        btnMicrosoft.className = 'fluent-btn fluent-btn-primary';
        btnMicrosoft.innerText = 'Connect Microsoft';
        refreshView();
      } else {
        oauth.loginMicrosoft();
      }
    });
  }

  // Save Developer Credentials
  const btnSaveCreds = document.getElementById('btn-save-credentials');
  if (btnSaveCreds) {
    btnSaveCreds.addEventListener('click', () => {
      const spotifyId = document.getElementById('setting-spotify-client-id').value.trim();
      const microsoftId = document.getElementById('setting-microsoft-client-id').value.trim();
      
      if (!spotifyId || !microsoftId) {
        showToast('Client IDs cannot be empty', 'error');
        return;
      }
      
      oauth.setSpotifyClientId(spotifyId);
      oauth.setMicrosoftClientId(microsoftId);
      showToast('Developer credentials saved', 'success');
    });
  }
  
  // Reset Data
  const btnReset = document.getElementById('btn-reset-data');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      showDialog({
        title: 'Clear All Data?',
        content: '<p>This action is irreversible. All alarms, tasks, timers, and focus logs will be permanently deleted and the app will reload.</p>',
        buttons: [
          {
            text: 'Delete Everything',
            primary: true,
            onClick: () => {
              Object.keys(localStorage).forEach(key => {
                if (key.startsWith('win11_clock_')) {
                  localStorage.removeItem(key);
                }
              });
              showToast('Data deleted. Restarting...');
              setTimeout(() => {
                window.location.reload();
              }, 1000);
              return false;
            }
          },
          {
            text: 'Cancel',
            primary: false
          }
        ]
      });
    });
  }
}

function refreshView() {
  const container = document.getElementById('main-view-content');
  if (container) {
    renderSettingsView(container);
  }
}

export function applyTheme(selectedTheme) {
  const body = document.body;
  body.classList.remove('light-theme');
  
  if (selectedTheme === 'light') {
    body.classList.add('light-theme');
  } else if (selectedTheme === 'system') {
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    if (prefersLight) {
      body.classList.add('light-theme');
    }
  }
  const accentHex = storage.get('app_accent_color', '#60cdff');
  applyAccentColor(accentHex);
}

function applyAccentColor(hex) {
  document.documentElement.style.setProperty('--accent-color', hex);
  const rgb = hexToRgb(hex);
  if (rgb) {
    document.documentElement.style.setProperty('--accent-glow', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`);
    document.documentElement.style.setProperty('--accent-glow-strong', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`);
  }
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}
