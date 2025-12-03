/* High-Contrast Mode Toggle Utility*/
(function() {
  //config
  const CONFIG = {
    storageKey: 'highContrastMode',
    stylesheetId: 'high-contrast-stylesheet',
    stylesheetPath: '/stylesheets/vision-contrast.css',
    toggleButtonId: 'high-contrast-toggle-btn'
  };

  /* Initialize high-contrast mode on page load */
  function init() {
    // Safe access to localStorage
    function safeGet(key) {
      try { return localStorage.getItem(key); } catch (e) { return null; }
    }

    // Check if user has high-contrast preference stored (null = not set)
    const stored = safeGet(CONFIG.storageKey);

    // Check for system preference
    const mql = window.matchMedia('(prefers-contrast: more)');
    const prefersDarkHighContrast = mql.matches;

    // If user explicitly stored a preference, respect it; otherwise fall back to system
    if (stored !== null) {
      if (stored === 'true') enable(); else disable();
    } else if (prefersDarkHighContrast) {
      enable();
    }

    // Listen for system preference changes with fallback
    const handleChange = (e) => {
      if (e.matches) {
        if (safeGet(CONFIG.storageKey) === null) enable();
      } else {
        if (safeGet(CONFIG.storageKey) === null) disable();
      }
    };

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handleChange);
    } else if (typeof mql.addListener === 'function') {
      mql.addListener(handleChange);
    }
  }

  /*enable high contrast */
  function enable() {
    // Check if stylesheet already exists
    if (document.getElementById(CONFIG.stylesheetId)) {
      return;
    }


    const link = document.createElement('link');
    link.id = CONFIG.stylesheetId;
    link.rel = 'stylesheet';
    link.href = CONFIG.stylesheetPath;
    document.head.appendChild(link);

    try { localStorage.setItem(CONFIG.storageKey, 'true'); } catch (e) {}

    updateButtonState(true);

    announceChange('High contrast mode enabled');
  }

  function disable() {
    const stylesheet = document.getElementById(CONFIG.stylesheetId);
    if (stylesheet) {
      stylesheet.remove();
    }

    try { localStorage.setItem(CONFIG.storageKey, 'false'); } catch (e) {}

    //update button state if exists
    updateButtonState(false);

    //status assistive technologies
    announceChange('High contrast mode disabled');
  }

  //toggle high-contrast mode
  function toggle() {
    const isEnabled = isHighContrastEnabled();
    if (isEnabled) {
      disable();
    } else {
      enable();
    }
  }

  //check if high-contrast mode is enabled
  function isHighContrastEnabled() {
    return document.getElementById(CONFIG.stylesheetId) !== null;
  }

  //update toggle button appearance& aria attributes
  function updateButtonState(isEnabled) {
    const button = document.getElementById(CONFIG.toggleButtonId);
    if (!button) return;

    button.setAttribute('aria-pressed', isEnabled ? 'true' : 'false');
    
    if (isEnabled) {
      button.classList.add('active');
      button.setAttribute('title', 'Disable high-contrast mode');
    } else {
      button.classList.remove('active');
      button.setAttribute('title', 'Enable high-contrast mode');
    }
  }

  //changes to screen readers
  function announceChange(message) {
    //create an aria-live region (not exist)
    let liveRegion = document.getElementById('a11y-announcements');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'a11y-announcements';
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      document.body.appendChild(liveRegion);
    }
    
    liveRegion.textContent = message;
  }

  //toggle button event listener
  function setupToggleButton() {
    const button = document.getElementById(CONFIG.toggleButtonId);
    if (!button) return;

    button.addEventListener('click', toggle);
    
    //set initial button state
    updateButtonState(isHighContrastEnabled());

    //keyboard accessibility - space and enter keys
    button.addEventListener('keydown', (e) => {
      const key = e.key || e.code || '';
      if (key === ' ' || key === 'Spacebar' || key === 'Enter' || key === 'Space') {
        e.preventDefault();
        toggle();
      }
    });
  }

  function onDOMReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }

  onDOMReady(() => {
    init();
    setupToggleButton();
  });

// manual control for API
  window.highContrastMode = {
    enable,
    disable,
    toggle,
    isEnabled: isHighContrastEnabled
  };
})();
