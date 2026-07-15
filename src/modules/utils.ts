/**
 * Utility functions, storage helpers, SVG icons, and custom Fluent UI dialog manager
 */

// LocalStorage helpers with fallback
export const storage = {
  get: (key, defaultValue) => {
    try {
      const value = localStorage.getItem(`win11_clock_${key}`);
      return value ? JSON.parse(value) : defaultValue;
    } catch (e) {
      console.error('Error reading localStorage', e);
      return defaultValue;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(`win11_clock_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('Error writing to localStorage', e);
    }
  }
};

// Fluent SVG Icon Library
export const icons = {
  menu: `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" /></svg>`,
  
  focus: `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" /></svg>`,
  
  alarm: `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>`,
  
  timer: `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" /></svg>`, // Will override with actual hourglass shape below
  
  hourglass: `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M10 3a7 7 0 100 14 7 7 0 000-14zm-3 4a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm3 2a1 1 0 00-.707.293l-2 2a1 1 0 101.414 1.414L9 11.414V13a1 1 0 102 0v-1.586l1.293 1.293a1 1 0 101.414-1.414l-2-2A1 1 0 0010 9z" clip-rule="evenodd" /></svg>`,

  stopwatch: `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v5a1 1 0 00.293.707l3 3a1 1 0 001.414-1.414L11 10.586V5z" clip-rule="evenodd" /></svg>`, // Will override stopwatch SVG below

  globe: `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 002 2h1.5a.5.5 0 01.5.5v.5a1.5 1.5 0 01-3 0V10H7a2 2 0 00-2 2v2.189C3.84 12.81 3 11.5 3 10c0-1.892.404-3.693 1.127-5.307zM16.25 10c0 .942-.217 1.833-.602 2.628l-2.062-2.062A1 1 0 0012.878 10H12a2 2 0 00-2 2v2.5a.5.5 0 01-.5.5h-.75a.75.75 0 01-.75-.75v-1.126l-1.129-1.13A5.982 5.982 0 0110 4c1.657 0 3 1.343 3 3a3 3 0 01-.293 1.293l1.414 1.414c.723-1.614 1.129-3.415 1.129-5.307C16.25 10z" clip-rule="evenodd" /></svg>`,

  settings: `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.533 1.533 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.533 1.533 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.533 1.533 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" /></svg>`,
  
  play: `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" /></svg>`,

  pause: `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>`,

  stop: `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clip-rule="evenodd" /></svg>`,

  reset: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>`,

  lap: `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clip-rule="evenodd" /></svg>`,

  plus: `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" /></svg>`,

  trash: `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>`,

  edit: `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>`,

  check: `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>`,

  zoom: `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l3.293 3.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 11-2 0V6.414l-3.293 3.293a1 1 0 11-1.414-1.414L13.586 5H12a1 1 0 01-1-1zM3 12a1 1 0 011-1h1.586l3.293 3.293a1 1 0 11-1.414 1.414L5 13.586V15a1 1 0 01-2 0v-4zm9 1a1 1 0 011-1h1.586l-3.293-3.293a1 1 0 011.414-1.414L15 13.586V12a1 1 0 112 0v4a1 1 0 01-1 1h-4a1 1 0 01-1-1z" clip-rule="evenodd" /></svg>`,

  pin: `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>`,

  spotify: `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.892-.982-.336.076-.67-.135-.746-.47-.077-.337.135-.67.472-.747 3.847-.876 7.14-.5 9.816 1.137.295.18.387.563.21 86.877-.005 0 0 0 0 0zm1.226-2.72c-.226.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.077-1.182-.413.125-.848-.107-.973-.52-.125-.413.107-.847.52-.973 3.67-1.114 8.24-.57 11.35 1.344.366.226.486.707.26 1.072h-.006zm.106-2.833C14.384 8.7 8.527 8.5 5.137 9.53c-.506.153-1.04-.137-1.193-.642-.153-.505.137-1.04.642-1.193 3.885-1.178 10.353-.95 14.413 1.46.456.27.607.86.337 1.317-.27.457-.86.608-1.317.338v-.002z"/></svg>`,

  music: `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.135A3.001 3.001 0 108 17V9l8-1.6V14.135A3.001 3.001 0 1018 17V3z" /></svg>`,

  volume: `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 11-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.895-4.21-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.414 0A5.986 5.986 0 0115 10a5.986 5.986 0 01-1.758 4.243 1 1 0 01-1.414-1.414A3.991 3.991 0 0013 10a3.991 3.991 0 00-1.172-2.828 1 1 0 010-1.414z" clip-rule="evenodd" /></svg>`,

  volumeMute: `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>`,

  close: `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>`,

  chevronDown: `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>`,

  chevronUp: `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" /></svg>`,

  sun: `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464-4.95a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707zm2.414 5.657a1 1 0 01-1-1V9a1 1 0 112 0v1a1 1 0 01-1 1zM14 16a1 1 0 01-1-1v-1a1 1 0 112 0v1a1 1 0 01-1 1zm-4 2a1 1 0 01-1-1v-1a1 1 0 112 0v1a1 1 0 01-1 1zm-5.657-.464a1 1 0 11-1.414-1.414l.707-.707a1 1 0 111.414 1.414l-.707.707zM2 10a1 1 0 011-1h1a1 1 0 110 2H3a1 1 0 01-1-1zm3.05-4.95a1 1 0 111.414-1.414l-.707-.707a1 1 0 01-1.414 1.414l.707.707z" clip-rule="evenodd" /></svg>`,

  moon: `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>`,
  
  compare: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><path d="M16 3h5v5M4 20L21 3M21 21h-5v-5M3 3l18 18"/></svg>`
};

// Date formatters
export function formatTime(date, showSecs = false, ampm = true) {
  let hrs = date.getHours();
  const mins = String(date.getMinutes()).padStart(2, '0');
  const secs = String(date.getSeconds()).padStart(2, '0');
  
  if (ampm) {
    const suffix = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12;
    hrs = hrs ? hrs : 12; // 0 should be 12
    return `${hrs}:${mins}${showSecs ? ':' + secs : ''} ${suffix}`;
  } else {
    return `${String(hrs).padStart(2, '0')}:${mins}${showSecs ? ':' + secs : ''}`;
  }
}

export function formatDate(date) {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString(undefined, options);
}

// Fluent Modal Framework
let dialogCount = 0;
export function showDialog({ title, content, buttons = [] }) {
  dialogCount++;
  const id = `fluent-dialog-${dialogCount}`;
  
  const backdrop = document.createElement('div');
  backdrop.className = 'fluent-dialog-backdrop';
  backdrop.id = id;
  
  const dialog = document.createElement('div');
  dialog.className = 'fluent-dialog-content';
  
  const header = document.createElement('div');
  header.className = 'fluent-dialog-header';
  
  const titleEl = document.createElement('h3');
  titleEl.className = 'fluent-dialog-title';
  titleEl.innerText = title;
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'fluent-dialog-close-btn';
  closeBtn.innerHTML = icons.close;
  closeBtn.onclick = () => closeDialog(id);
  
  header.appendChild(titleEl);
  header.appendChild(closeBtn);
  dialog.appendChild(header);
  
  const body = document.createElement('div');
  body.className = 'fluent-dialog-body';
  if (typeof content === 'string') {
    body.innerHTML = content;
  } else if (content instanceof HTMLElement) {
    body.appendChild(content);
  }
  dialog.appendChild(body);
  
  const footer = document.createElement('div');
  footer.className = 'fluent-dialog-footer';
  
  buttons.forEach(btn => {
    const btnEl = document.createElement('button');
    btnEl.className = `fluent-btn ${btn.primary ? 'fluent-btn-primary' : 'fluent-btn-secondary'}`;
    btnEl.innerText = btn.text;
    btnEl.onclick = async () => {
      if (btn.onClick) {
        const preventClose = await btn.onClick(dialog, backdrop);
        if (preventClose === true) return;
      }
      closeDialog(id);
    };
    footer.appendChild(btnEl);
  });
  
  dialog.appendChild(footer);
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
  
  // Trigger animation after append
  requestAnimationFrame(() => {
    backdrop.classList.add('visible');
  });

  return id;
}

export function closeDialog(id) {
  const backdrop = document.getElementById(id);
  if (backdrop) {
    backdrop.classList.remove('visible');
    setTimeout(() => {
      backdrop.remove();
    }, 200); // match CSS transition duration
  }
}

// Custom Toast notification
export function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('fluent-toast-container') || createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `fluent-toast fluent-toast-${type}`;
  
  const iconSpan = document.createElement('span');
  iconSpan.className = 'fluent-toast-icon';
  if (type === 'success') iconSpan.innerHTML = icons.check;
  else if (type === 'error') iconSpan.innerHTML = icons.close;
  else iconSpan.innerHTML = icons.focus;
  
  const textSpan = document.createElement('span');
  textSpan.className = 'fluent-toast-text';
  textSpan.innerText = message;
  
  toast.appendChild(iconSpan);
  toast.appendChild(textSpan);
  container.appendChild(toast);
  
  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });
  
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, duration);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'fluent-toast-container';
  document.body.appendChild(container);
  return container;
}

// Fluent Custom Dropdown Builder (avoids native system select overlays)
export function createFluentDropdown({ id, options, value, onChange, onPreview, container }) {
  container.innerHTML = '';
  container.className = 'fluent-dropdown-wrapper';
  container.id = id;
  
  const selectedOption = options.find(o => String(o.value) === String(value)) || options[0];
  
  const button = document.createElement('button');
  button.className = 'fluent-dropdown-trigger';
  button.innerHTML = `
    <span class="fluent-dropdown-selected-text">${selectedOption ? selectedOption.text : 'Select...'}</span>
    <span class="fluent-dropdown-arrow">${icons.chevronDown}</span>
  `;
  
  const menu = document.createElement('div');
  menu.className = 'fluent-dropdown-menu';
  
  options.forEach(opt => {
    const item = document.createElement('div');
    item.className = `fluent-dropdown-item ${String(opt.value) === String(value) ? 'selected' : ''}`;
    item.dataset.value = opt.value;
    
    if (onPreview) {
      item.innerHTML = `
        <span class="fluent-dropdown-item-text">${opt.text}</span>
        <button class="fluent-dropdown-item-play-btn" title="Preview sound">${icons.play}</button>
      `;
      
      const playBtn = item.querySelector('.fluent-dropdown-item-play-btn') as HTMLElement;
      playBtn.onclick = (e) => {
        e.stopPropagation(); // prevent selecting
        
        const isPlaying = playBtn.classList.contains('playing');
        
        // Stop all other playing buttons inside this dropdown menu
        menu.querySelectorAll('.fluent-dropdown-item-play-btn.playing').forEach(btn => {
          btn.classList.remove('playing');
          btn.innerHTML = icons.play;
        });
        
        if (isPlaying) {
          playBtn.classList.remove('playing');
          playBtn.innerHTML = icons.play;
          onPreview(opt.value, false);
        } else {
          playBtn.classList.add('playing');
          playBtn.innerHTML = icons.stop;
          onPreview(opt.value, true);
        }
      };
    } else {
      item.innerText = opt.text;
    }
    
    item.onclick = (e) => {
      e.stopPropagation();
      
      menu.querySelectorAll('.fluent-dropdown-item').forEach(el => el.classList.remove('selected'));
      item.classList.add('selected');
      (button.querySelector('.fluent-dropdown-selected-text') as HTMLElement).innerText = opt.text;
      
      menu.classList.remove('visible');
      button.classList.remove('active');
      
      // Stop all active preview states when selecting an item
      if (onPreview) {
        menu.querySelectorAll('.fluent-dropdown-item-play-btn.playing').forEach(btn => {
          btn.classList.remove('playing');
          btn.innerHTML = icons.play;
        });
        onPreview(opt.value, false);
      }
      
      onChange(opt.value);
    };
    
    menu.appendChild(item);
  });
  
  button.onclick = (e) => {
    e.stopPropagation();
    
    document.querySelectorAll('.fluent-dropdown-menu.visible').forEach(m => {
      if (m !== menu) m.classList.remove('visible');
    });
    document.querySelectorAll('.fluent-dropdown-trigger.active').forEach(b => {
      if (b !== button) b.classList.remove('active');
    });
    
    const isOpen = menu.classList.contains('visible');
    if (isOpen) {
      menu.classList.remove('visible');
      button.classList.remove('active');
    } else {
      menu.classList.add('visible');
      button.classList.add('active');
      
      const rect = button.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      if (rect.bottom + 200 > windowHeight) {
        menu.style.bottom = `${button.offsetHeight + 4}px`;
        menu.style.top = 'auto';
      } else {
        menu.style.top = `${button.offsetHeight + 4}px`;
        menu.style.bottom = 'auto';
      }
    }
  };
  
  // Close menu on clicking outside and stop any playing previews
  document.addEventListener('click', () => {
    if (menu.classList.contains('visible') && onPreview) {
      menu.querySelectorAll('.fluent-dropdown-item-play-btn.playing').forEach(btn => {
        btn.classList.remove('playing');
        btn.innerHTML = icons.play;
      });
      // We stop preview when clicking outside
      const selectedItem = menu.querySelector('.fluent-dropdown-item.selected');
      if (selectedItem) {
        onPreview((selectedItem as HTMLElement).dataset.value, false);
      }
    }
    menu.classList.remove('visible');
    button.classList.remove('active');
  });
  
  container.appendChild(button);
  container.appendChild(menu);
}

