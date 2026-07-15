import './style.css';
import { icons, storage } from './modules/utils.js';
import { initSettingsModule } from './modules/settings.ts';
import { initFocusModule, renderFocusView } from './modules/focus.ts';
import { initAlarmModule, renderAlarmView } from './modules/alarm.ts';
import { initTimerModule, renderTimerView } from './modules/timer.ts';
import { initStopwatchModule, renderStopwatchView } from './modules/stopwatch.ts';
import { initWorldClockModule, renderWorldClockView } from './modules/worldclock.ts';
import { renderSettingsView } from './modules/settings.ts';
import { oauth } from './modules/oauth.js';

// Elements
const sidebar = document.getElementById('app-sidebar');
const sidebarToggleBtn = document.getElementById('btn-sidebar-toggle');
const mainViewport = document.getElementById('main-view-content');
const navItems = document.querySelectorAll('.nav-item');
const mobileNavItems = document.querySelectorAll('.mobile-nav-item');

// Current active view
let currentView = 'focus';

// Map view names to renderer functions
const viewRenderers = {
  focus: renderFocusView,
  alarm: renderAlarmView,
  timer: renderTimerView,
  stopwatch: renderStopwatchView,
  worldclock: renderWorldClockView,
  settings: renderSettingsView
};

function initApp() {
  // Check if we are returning from an OAuth flow callback
  oauth.checkRedirectCallback();

  // 1. Inject static Icons
  injectIcons();

  // 2. Initialize background modules & state stores
  initSettingsModule();
  initFocusModule();
  initAlarmModule();
  initTimerModule();
  initStopwatchModule();
  initWorldClockModule();

  // 3. Load saved sidebar state
  const sidebarCollapsed = storage.get('sidebar_collapsed', false);
  if (sidebarCollapsed) {
    sidebar.classList.add('collapsed');
  }

  // 4. Bind sidebar and mobile navigation click listeners
  bindNavigation();

  // 5. Load default view (Focus Sessions)
  switchView('focus');
}

function injectIcons() {
  // Title bar logo
  document.getElementById('app-title-logo').innerHTML = icons.focus; // Using focus clock icon for app logo
  
  // Desktop Navigation Icons
  document.getElementById('icon-menu-toggle').innerHTML = icons.menu;
  document.getElementById('icon-nav-focus').innerHTML = icons.focus;
  document.getElementById('icon-nav-alarm').innerHTML = icons.alarm;
  document.getElementById('icon-nav-timer').innerHTML = icons.hourglass;
  document.getElementById('icon-nav-stopwatch').innerHTML = icons.stopwatch;
  document.getElementById('icon-nav-worldclock').innerHTML = icons.globe;
  document.getElementById('icon-nav-settings').innerHTML = icons.settings;

  // Mobile Navigation Icons
  document.getElementById('m-icon-nav-focus').innerHTML = icons.focus;
  document.getElementById('m-icon-nav-alarm').innerHTML = icons.alarm;
  document.getElementById('m-icon-nav-timer').innerHTML = icons.hourglass;
  document.getElementById('m-icon-nav-stopwatch').innerHTML = icons.stopwatch;
  document.getElementById('m-icon-nav-worldclock').innerHTML = icons.globe;
  document.getElementById('m-icon-nav-settings').innerHTML = icons.settings;
}

function bindNavigation() {
  // Sidebar expand/collapse toggle
  sidebarToggleBtn.addEventListener('click', () => {
    const isCollapsed = sidebar.classList.toggle('collapsed');
    storage.set('sidebar_collapsed', isCollapsed);
  });

  // Desktop Nav items click
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const clickedItem = (e.currentTarget as HTMLElement);
      const view = clickedItem.dataset.view;
      if (view && view !== currentView) {
        switchView(view);
      }
    });
  });

  // Mobile Nav items click
  mobileNavItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const clickedItem = (e.currentTarget as HTMLElement);
      const view = clickedItem.dataset.view;
      if (view && view !== currentView) {
        switchView(view);
      }
    });
  });
}

function switchView(view) {
  // Close any fullscreen overlays (like timers) when navigating
  const zoomOverlay = document.getElementById('timer-zoom-overlay');
  if (zoomOverlay) {
    zoomOverlay.remove();
  }

  currentView = view;
  
  // Sync desktop navigation active state
  navItems.forEach(nav => {
    if ((nav as HTMLElement).dataset.view === view) {
      nav.classList.add('active');
    } else {
      nav.classList.remove('active');
    }
  });

  // Sync mobile navigation active state
  mobileNavItems.forEach(nav => {
    if ((nav as HTMLElement).dataset.view === view) {
      nav.classList.add('active');
    } else {
      nav.classList.remove('active');
    }
  });
  
  // Render corresponding view using registered module functions
  const renderer = viewRenderers[view];
  if (renderer && mainViewport) {
    // Add a quick fade transition
    mainViewport.style.opacity = '0';
    
    setTimeout(() => {
      renderer(mainViewport);
      mainViewport.style.opacity = '1';
      
      // Auto-focus first input in target cards if visible for better accessibility
      const firstInput = mainViewport.querySelector('.fluent-input');
      if (firstInput) {
        // Don't auto-focus on mobile to avoid keyboard popup
        if (window.innerWidth > 768) {
          (firstInput as HTMLElement).focus();
        }
      }
    }, 100);
  }
}

// Boot the application on DOM Content Loaded
window.addEventListener('DOMContentLoaded', initApp);
