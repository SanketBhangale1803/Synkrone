/**
 * Dark Mode Toggle Utility
 * Manages dark mode theme with localStorage persistence and system preference detection
 */

(function() {
  // Configuration
  const CONFIG = {
    storageKey: 'darkModeEnabled',
    stylesheetId: 'dark-mode-stylesheet',
    stylesheetPath: '/stylesheets/dark-mode.css',
    toggleButtonId: 'dark-mode-toggle-btn',
    mediaQuery: '(prefers-color-scheme: dark)'
  };

  /**
   * Initialize dark mode on page load
   */
  function init() {
    // Check if user has dark mode preference stored
    const isEnabled = localStorage.getItem(CONFIG.storageKey) === 'true';
    
    // Check for system preference
    const prefersDarkMode = window.matchMedia(CONFIG.mediaQuery).matches;
    
    // Enable if stored preference or system preference
    if (isEnabled || prefersDarkMode) {
      enable();
    }
    
    // Listen for system preference changes
    window.matchMedia(CONFIG.mediaQuery).addEventListener('change', (e) => {
      if (e.matches) {
        enable();
      } else {
        disable();
      }
    });
  }

  /**
   * Enable dark mode
   */
  function enable() {
    // Check if stylesheet already exists
    if (document.getElementById(CONFIG.stylesheetId)) {
      return;
    }

    // Create and inject stylesheet
    const link = document.createElement('link');
    link.id = CONFIG.stylesheetId;
    link.rel = 'stylesheet';
    link.href = CONFIG.stylesheetPath;
    document.head.appendChild(link);

    // Store preference
    localStorage.setItem(CONFIG.storageKey, 'true');

    // Update button state if exists
    updateButtonState(true);

    // Announce to assistive technologies
    announceChange('Dark mode enabled');
  }

  /**
   * Disable dark mode
   */
  function disable() {
    const stylesheet = document.getElementById(CONFIG.stylesheetId);
    if (stylesheet) {
      stylesheet.remove();
    }

    // Store preference
    localStorage.setItem(CONFIG.storageKey, 'false');

    // Update button state if exists
    updateButtonState(false);

    // Announce to assistive technologies
    announceChange('Dark mode disabled');
  }

  /**
   * Toggle dark mode
   */
  function toggle() {
    const isEnabled = isDarkModeEnabled();
    if (isEnabled) {
      disable();
    } else {
      enable();
    }
  }

  /**
   * Check if dark mode is currently enabled
   */
  function isDarkModeEnabled() {
    return document.getElementById(CONFIG.stylesheetId) !== null;
  }

  /**
   * Update toggle button appearance and ARIA attributes
   */
  function updateButtonState(isEnabled) {
    const button = document.getElementById(CONFIG.toggleButtonId);
    if (!button) return;

    button.setAttribute('aria-pressed', isEnabled ? 'true' : 'false');
    
    if (isEnabled) {
      button.classList.add('active');
      button.setAttribute('title', 'Disable dark mode');
    } else {
      button.classList.remove('active');
      button.setAttribute('title', 'Enable dark mode');
    }
  }

  /**
   * Announce changes to screen readers
   */
  function announceChange(message) {
    // Create an aria-live region if it doesn't exist
    let liveRegion = document.getElementById('dm-announcements');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'dm-announcements';
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      document.body.appendChild(liveRegion);
    }
    
    liveRegion.textContent = message;
  }

  /**
   * Setup toggle button event listener
   */
  function setupToggleButton() {
    const button = document.getElementById(CONFIG.toggleButtonId);
    if (!button) return;

    button.addEventListener('click', toggle);
    
    // Set initial button state
    updateButtonState(isDarkModeEnabled());

    // Keyboard accessibility - space and enter keys
    button.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggle();
      }
    });
  }

  /**
   * Wait for DOM to be ready and initialize
   */
  function onDOMReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }

  // Initialize when DOM is ready
  onDOMReady(() => {
    init();
    setupToggleButton();
  });

  // Expose API globally for manual control
  window.darkMode = {
    enable,
    disable,
    toggle,
    isEnabled: isDarkModeEnabled
  };
})();
