import { storage, icons, showToast, showDialog, closeDialog } from './utils.ts';

let pinnedClocks = [];
let localClockInterval = null;
let isCompareMode = false;
let compareHourOffset = 0; // Offset in hours from current time

// City database with approx coordinates on our abstract world map (x: 0-100%, y: 0-100%)
const cityDatabase = [
  { name: 'London', timezone: 'Europe/London', country: 'United Kingdom', x: 48, y: 25 },
  { name: 'New York', timezone: 'America/New_York', country: 'United States', x: 30, y: 35 },
  { name: 'Tokyo', timezone: 'Asia/Tokyo', country: 'Japan', x: 85, y: 38 },
  { name: 'Sydney', timezone: 'Australia/Sydney', country: 'Australia', x: 90, y: 80 },
  { name: 'Paris', timezone: 'Europe/Paris', country: 'France', x: 49, y: 27 },
  { name: 'Cairo', timezone: 'Africa/Cairo', country: 'Egypt', x: 56, y: 44 },
  { name: 'Dubai', timezone: 'Asia/Dubai', country: 'United Arab Emirates', x: 63, y: 42 },
  { name: 'Mumbai', timezone: 'Asia/Kolkata', country: 'India', x: 70, y: 48 },
  { name: 'Beijing', timezone: 'Asia/Shanghai', country: 'China', x: 81, y: 36 },
  { name: 'Moscow', timezone: 'Europe/Moscow', country: 'Russia', x: 57, y: 22 },
  { name: 'Los Angeles', timezone: 'America/Los_Angeles', country: 'United States', x: 20, y: 38 },
  { name: 'Rio de Janeiro', timezone: 'America/Sao_Paulo', country: 'Brazil', x: 38, y: 68 },
  { name: 'Singapore', timezone: 'Asia/Singapore', country: 'Singapore', x: 78, y: 57 },
  { name: 'Reykjavik', timezone: 'Atlantic/Reykjavik', country: 'Iceland', x: 43, y: 18 }
];

export function initWorldClockModule() {
  pinnedClocks = storage.get('pinned_clocks', [
    { name: 'London', timezone: 'Europe/London', country: 'United Kingdom', x: 48, y: 25 },
    { name: 'Tokyo', timezone: 'Asia/Tokyo', country: 'Japan', x: 85, y: 38 }
  ]);
  
  startWorldClockTicker();
}

function savePinnedClocks() {
  storage.set('pinned_clocks', pinnedClocks);
}

export function renderWorldClockView(container) {
  const now = new Date();
  
  container.innerHTML = `
    <div class="fluent-page-header">
      <h2>World clock</h2>
      <button class="fluent-btn-icon header-action-btn" id="btn-add-city" title="Pin new city">${icons.plus}</button>
    </div>
    
    <div class="worldclock-grid">
      <!-- Left side: Local time & map -->
      <div class="worldclock-col-left">
        <div class="fluent-card local-time-card">
          <div class="local-time-label">Local Time</div>
          <div class="local-time-display" id="wc-local-time">--:--:-- --</div>
          <div class="local-date-display" id="wc-local-date">Loading date...</div>
        </div>
        
        <div class="fluent-card map-card">
          <!-- Abstract stylized SVG World Map background -->
          <div class="world-map-svg-wrapper">
            <svg class="world-map-svg" viewBox="0 0 1000 500" fill="none" xmlns="http://www.w3.org/2000/svg">
              <!-- Outline of main landmasses (stylized paths) -->
              <path d="M150 150 L200 120 L250 130 L300 180 L350 200 L320 250 L280 280 L250 350 L260 400 L240 450 L210 420 L200 320 L160 250 L110 200 Z" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>
              <path d="M400 120 L480 80 L520 70 L600 80 L680 70 L780 90 L850 120 L920 160 L900 240 L840 280 L800 220 L750 260 L780 320 L840 350 L810 390 L750 360 L720 400 L680 350 L630 320 L660 280 L600 240 L550 280 L500 200 L440 220 Z" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>
              <path d="M430 250 L470 240 L500 260 L530 290 L520 340 L480 380 L490 420 L460 450 L440 380 L420 300 Z" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>
              <path d="M780 360 L830 380 L860 420 L830 460 L780 440 L760 390 Z" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>
              <!-- Grid lines -->
              <line x1="500" y1="0" x2="500" y2="500" stroke="rgba(255,255,255,0.03)" stroke-dasharray="5,5" />
              <line x1="0" y1="250" x2="1000" y2="250" stroke="rgba(255,255,255,0.03)" stroke-dasharray="5,5" />
            </svg>
            <div id="map-pins-container">
              ${renderMapPins()}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Right side: Pinned City Clocks -->
      <div class="worldclock-col-right">
        <div class="worldclocks-list" id="pinned-clocks-container">
          ${renderPinnedClocks()}
        </div>
      </div>
    </div>
    
    <!-- Time Comparison Slider card -->
    <div class="fluent-card compare-card">
      <div class="compare-header">
        <div class="compare-title">
          <span>Time comparison</span>
        </div>
        <div class="compare-actions">
          <label class="compare-toggle-label">
            <input type="checkbox" id="chk-compare-mode" ${isCompareMode ? 'checked' : ''}>
            <span>Compare meeting times</span>
          </label>
          <button class="fluent-btn fluent-btn-secondary" id="btn-compare-reset" style="${isCompareMode ? '' : 'display:none;'}">Reset</button>
        </div>
      </div>
      
      <div class="compare-slider-wrapper" id="compare-slider-container" style="${isCompareMode ? 'opacity:1; pointer-events:auto;' : 'opacity:0.3; pointer-events:none;'}">
        <input type="range" id="compare-time-slider" min="-12" max="12" value="${compareHourOffset}" step="1">
        <div class="slider-labels">
          <span>-12h</span>
          <span>-6h</span>
          <span>Current Time</span>
          <span>+6h</span>
          <span>+12h</span>
        </div>
        <div class="current-slider-val" id="slider-offset-display">Offset: ${compareHourOffset > 0 ? '+' : ''}${compareHourOffset} hours</div>
      </div>
    </div>
  `;

  bindEvents();
  updateClocks();
}

function renderMapPins() {
  const localX = 66; // Estimated coordinates of center of local (approx based on user/system)
  
  // Local pin
  let pinsHtml = `<div class="map-pin map-pin-local" style="left: 45%; top: 30%;" title="You are here"><div class="pulse-ring"></div></div>`;
  
  // Pinned cities pins
  pinnedClocks.forEach(city => {
    if (city.x && city.y) {
      pinsHtml += `
        <div class="map-pin" style="left: ${city.x}%; top: ${city.y}%;" title="${city.name}">
          <div class="pulse-ring bg-accent"></div>
          <span class="pin-label">${city.name}</span>
        </div>
      `;
    }
  });
  
  return pinsHtml;
}

function renderPinnedClocks() {
  if (pinnedClocks.length === 0) {
    return `
      <div class="empty-state-card">
        <div class="empty-icon">${icons.globe}</div>
        <p>No pinned clocks. Click the "+" button to pin cities.</p>
      </div>
    `;
  }
  
  return pinnedClocks.map(city => {
    const cityTime = getCityTimeData(city.timezone);
    const offsetLabel = getOffsetLabel(city.timezone);
    
    // Day night background styling
    const isNight = cityTime.hours < 6 || cityTime.hours >= 18;
    const bgClass = isNight ? 'wc-card-night' : 'wc-card-day';
    
    return `
      <div class="fluent-card wc-item-card ${bgClass}" data-timezone="${city.timezone}">
        <div class="wc-card-left">
          <span class="wc-city-name">${city.name}</span>
          <span class="wc-country-name">${city.country}</span>
          <span class="wc-offset-text">${offsetLabel}</span>
        </div>
        
        <div class="wc-card-right">
          <div class="wc-digital-time">${cityTime.timeStr}</div>
          <div class="wc-date-text">${cityTime.dateStr}</div>
          <button class="fluent-btn-icon wc-delete-btn" data-timezone="${city.timezone}" title="Unpin city">${icons.trash}</button>
        </div>
      </div>
    `;
  }).join('');
}

function getCityTimeData(timezone) {
  let date = new Date();
  
  if (isCompareMode) {
    // Add offset in hours
    date.setHours(date.getHours() + compareHourOffset);
  }
  
  const optionsTime: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  };
  
  const optionsDate: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
    weekday: 'short'
  };
  
  // Formatters
  const timeStr = date.toLocaleTimeString(undefined, optionsTime);
  const dateStr = date.toLocaleDateString(undefined, optionsDate);
  
  // Extract hours for day/night check (using 24hr check)
  const formatter24 = new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    hour: '2-digit',
    hour12: false
  });
  
  const hours = parseInt(formatter24.format(date));
  
  return { timeStr, dateStr, hours };
}

function getOffsetLabel(timezone) {
  const localDate = new Date();
  
  // Get time strings in both zones
  const formatterLocal = new Intl.DateTimeFormat(undefined, { hour: '2-digit', hour12: false });
  const formatterDest = new Intl.DateTimeFormat(undefined, { timeZone: timezone, hour: '2-digit', hour12: false });
  
  const localHrs = parseInt(formatterLocal.format(localDate));
  const destHrs = parseInt(formatterDest.format(localDate));
  
  // Simpler and extremely robust way to compute timezone offset diff
  const localDateString = localDate.toLocaleString('en-US', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  const destDateString = localDate.toLocaleString('en-US', { timeZone: timezone });
  
  const localDiff = new Date(localDateString);
  const destDiff = new Date(destDateString);
  
  const offsetDiffHours = Math.round((Number(destDiff) - Number(localDiff)) / 3600000);
  
  if (offsetDiffHours === 0) return 'Same time';
  
  const prefix = offsetDiffHours > 0 ? 'ahead' : 'behind';
  const val = Math.abs(offsetDiffHours);
  
  // Tomorrow/Yesterday check
  const localDay = localDiff.getDate();
  const destDay = destDiff.getDate();
  let dayIndicator = 'Today';
  if (destDay > localDay) dayIndicator = 'Tomorrow';
  if (destDay < localDay) dayIndicator = 'Yesterday';
  
  return `${dayIndicator}, ${val} ${val === 1 ? 'hour' : 'hours'} ${prefix}`;
}

function bindEvents() {
  const btnAdd = document.getElementById('btn-add-city');
  if (btnAdd) {
    btnAdd.addEventListener('click', showAddCityDialog);
  }
  
  // Timeline comparison toggle
  const chkCompare = document.getElementById('chk-compare-mode');
  if (chkCompare) {
    chkCompare.addEventListener('change', (e) => {
      isCompareMode = (e.target as HTMLInputElement).checked;
      
      const sliderContainer = document.getElementById('compare-slider-container');
      const resetBtn = document.getElementById('btn-compare-reset');
      
      if (isCompareMode) {
        sliderContainer.style.opacity = '1';
        sliderContainer.style.pointerEvents = 'auto';
        if (resetBtn) resetBtn.style.display = 'inline-block';
        showToast('Time comparison mode enabled');
      } else {
        sliderContainer.style.opacity = '0.3';
        sliderContainer.style.pointerEvents = 'none';
        if (resetBtn) resetBtn.style.display = 'none';
        compareHourOffset = 0;
        const slider = document.getElementById('compare-time-slider');
        if (slider) (slider as HTMLInputElement).value = '0';
        showToast('Resumed live time');
      }
      updateClocks();
    });
  }
  
  // Timeline comparison slider
  const slider = document.getElementById('compare-time-slider');
  if (slider) {
    slider.addEventListener('input', (e) => {
      compareHourOffset = parseInt((e.target as HTMLInputElement).value);
      const display = document.getElementById('slider-offset-display');
      if (display) {
        display.innerText = `Offset: ${compareHourOffset > 0 ? '+' : ''}${compareHourOffset} hours`;
      }
      updateClocks();
    });
  }
  
  const btnReset = document.getElementById('btn-compare-reset');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      compareHourOffset = 0;
      const slider = document.getElementById('compare-time-slider');
      if (slider) (slider as HTMLInputElement).value = '0';
      const display = document.getElementById('slider-offset-display');
      if (display) display.innerText = 'Offset: 0 hours';
      updateClocks();
    });
  }
  
  // Delegation for unpin
  const container = document.getElementById('pinned-clocks-container');
  if (container) {
    container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const delBtn = target.closest('.wc-delete-btn') as HTMLElement | null;
      if (delBtn) {
        const tz = delBtn.dataset.timezone;
        unpinCity(tz);
      }
    });
  }
}

function unpinCity(timezone) {
  pinnedClocks = pinnedClocks.filter(c => c.timezone !== timezone);
  savePinnedClocks();
  
  // Re-render
  const container = document.getElementById('pinned-clocks-container');
  if (container) container.innerHTML = renderPinnedClocks();
  
  const pinsContainer = document.getElementById('map-pins-container');
  if (pinsContainer) pinsContainer.innerHTML = renderMapPins();
  
  showToast('City unpinned');
}

function showAddCityDialog() {
  const content = document.createElement('div');
  content.className = 'add-city-dialog-body';
  
  // Render search list
  let listItems = '';
  // Exclude already pinned
  const unpinned = cityDatabase.filter(dbCity => !pinnedClocks.some(p => p.timezone === dbCity.timezone));
  
  if (unpinned.length === 0) {
    listItems = `<div class="search-no-results">All cities are already pinned!</div>`;
  } else {
    listItems = unpinned.map(city => `
      <div class="search-city-row" data-timezone="${city.timezone}">
        <span class="row-city-name">${city.name}</span>
        <span class="row-city-country">${city.country}</span>
      </div>
    `).join('');
  }

  content.innerHTML = `
    <input type="text" class="fluent-input" id="city-search-input" placeholder="Type a city name..." autocomplete="off">
    <div class="city-search-results" id="city-results-list">
      ${listItems}
    </div>
  `;

  const dialogId = showDialog({
    title: 'Pin a city',
    content,
    buttons: [
      {
        text: 'Close',
        primary: false
      }
    ]
  });
  
  // Add interactive filtering
  const input = content.querySelector('#city-search-input');
  const resultsContainer = content.querySelector('#city-results-list');
  
  (input as HTMLElement).focus();
  input.addEventListener('input', (e) => {
    const q = (e.target as HTMLInputElement).value.toLowerCase().trim();
    const filtered = cityDatabase.filter(city => {
      const isAlreadyPinned = pinnedClocks.some(p => p.timezone === city.timezone);
      const matchesQuery = city.name.toLowerCase().includes(q) || city.country.toLowerCase().includes(q);
      return !isAlreadyPinned && matchesQuery;
    });
    
    if (filtered.length === 0) {
      resultsContainer.innerHTML = `<div class="search-no-results">No unpinned cities found</div>`;
    } else {
      resultsContainer.innerHTML = filtered.map(city => `
        <div class="search-city-row" data-timezone="${city.timezone}">
          <span class="row-city-name">${city.name}</span>
          <span class="row-city-country">${city.country}</span>
        </div>
      `).join('');
    }
  });
  
  // Select row
  resultsContainer.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const row = target.closest('.search-city-row') as HTMLElement | null;
    if (row) {
      const tz = row.dataset.timezone;
      const city = cityDatabase.find(c => c.timezone === tz);
      if (city) {
        pinnedClocks.push(city);
        savePinnedClocks();
        
        // Refresh World Clock UI
        const container = document.getElementById('pinned-clocks-container');
        if (container) container.innerHTML = renderPinnedClocks();
        
        const pinsContainer = document.getElementById('map-pins-container');
        if (pinsContainer) pinsContainer.innerHTML = renderMapPins();
        
        showToast(`${city.name} pinned!`, 'success');
        closeDialog(dialogId);
      }
    }
  });
}

function startWorldClockTicker() {
  if (localClockInterval) clearInterval(localClockInterval);
  
  localClockInterval = setInterval(() => {
    updateClocks();
  }, 1000);
}

function updateClocks() {
  // Update local clock numbers
  const localTimeEl = document.getElementById('wc-local-time');
  const localDateEl = document.getElementById('wc-local-date');
  
  const now = new Date();
  if (isCompareMode) {
    now.setHours(now.getHours() + compareHourOffset);
  }
  
  if (localTimeEl) {
    const hrs = now.getHours();
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    const hrs12 = hrs % 12 || 12;
    localTimeEl.innerHTML = `${hrs12}:${mins}:${secs} <span class="ampm-text">${ampm}</span>`;
  }
  
  if (localDateEl) {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    localDateEl.innerText = now.toLocaleDateString(undefined, options);
  }
  
  // Update pinned clocks numbers and night backgrounds
  pinnedClocks.forEach(city => {
    const card = document.querySelector(`.wc-item-card[data-timezone="${city.timezone}"]`);
    if (!card) return;
    
    const timeData = getCityTimeData(city.timezone);
    
    const timeDigits = card.querySelector('.wc-digital-time') as HTMLElement | null;
    if (timeDigits) timeDigits.innerText = timeData.timeStr;
    
    const dateText = card.querySelector('.wc-date-text') as HTMLElement | null;
    if (dateText) dateText.innerText = timeData.dateStr;
    
    // Toggle class based on time comparison hour
    const isNight = timeData.hours < 6 || timeData.hours >= 18;
    if (isNight) {
      card.classList.add('wc-card-night');
      card.classList.remove('wc-card-day');
    } else {
      card.classList.add('wc-card-day');
      card.classList.remove('wc-card-night');
    }
  });
}
