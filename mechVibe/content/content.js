// WebVibes Content Script - FINAL
class ContentScript {
  constructor() {
    this.settings = null;
    this.isBlacklisted = false;
    this.audioEngine = null;
    this.achievementManager = null;
    this.notificationManager = null;
    
    this.typingSession = {
      startTime: null,
      wordCount: 0,
      lastKeyTime: null,
      wpmSamples: [],
      currentStreak: 0,
      accuracy: {
        totalKeys: 0,
        correctKeys: 0,
        lastKey: null
      }
    };
    
    this.isPasswordField = false;
    this.isMediaSite = false;
    this.initialized = false;
    
    this.initialize();
  }

  async initialize() {
    if (this.initialized) return;
    
    console.log('WebVibes content script initializing...');
    
    try {
      // Load settings
      await this.loadSettings();
      
      // Check if extension is enabled
      if (!this.settings?.enabled) {
        console.log('WebVibes is disabled');
        return;
      }
      
      // Check if current site is blacklisted
      await this.checkCurrentSite();
      
      if (this.isBlacklisted) {
        console.log('WebVibes: Site is blacklisted');
        return;
      }
      
      // Initialize audio engine
      await this.initializeAudioEngine();
      
      // Initialize notification manager
      await this.initializeNotificationManager();
      
      // Initialize achievement manager
      await this.initializeAchievementManager();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Set up message listener
      this.setupMessageListener();
      
      // Start session
      this.startSession();
      
      this.initialized = true;
      
      console.log('WebVibes content script initialized successfully');
      
      // Send ready signal to background
      this.sendToBackground('CONTENT_SCRIPT_READY', {
        url: window.location.href,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Failed to initialize WebVibes content script:', error);
    }
  }

  async loadSettings() {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        this.settings = response?.settings || {};
        resolve();
      });
    });
  }

  async checkCurrentSite() {
    try {
      const response = await this.sendToBackground('GET_BLACKLIST_STATUS');
      this.isBlacklisted = response?.blacklisted || false;
      
      // Check if it's a media site
      const mediaSites = ['youtube.com', 'netflix.com', 'spotify.com', 'twitch.tv'];
      const hostname = window.location.hostname.toLowerCase();
      this.isMediaSite = mediaSites.some(site => hostname.includes(site));
      
    } catch (error) {
      console.error('Error checking current site:', error);
      this.isBlacklisted = false;
    }
  }

  async initializeAudioEngine() {
    try {
      // Check if AudioEngine class is available
      if (typeof AudioEngine === 'undefined') {
        console.error('AudioEngine class not found');
        return;
      }
      
      this.audioEngine = new AudioEngine();
      await this.audioEngine.initialize(this.settings.currentSwitch);
      
      // Apply settings
      if (this.settings) {
        this.audioEngine.updateSettings(this.settings);
      }
      
      console.log('Audio engine initialized');
    } catch (error) {
      console.error('Failed to initialize audio engine:', error);
      this.audioEngine = null;
    }
  }

  async initializeNotificationManager() {
    try {
      if (typeof NotificationManager === 'undefined') {
        console.warn('NotificationManager class not found');
        return;
      }
      
      this.notificationManager = new NotificationManager();
      await this.notificationManager.initialize();
      
      console.log('Notification manager initialized');
    } catch (error) {
      console.error('Failed to initialize notification manager:', error);
      this.notificationManager = null;
    }
  }

  async initializeAchievementManager() {
    try {
      if (typeof AchievementManager === 'undefined') {
        console.warn('AchievementManager class not found');
        return;
      }
      
      this.achievementManager = new AchievementManager();
      
      console.log('Achievement manager initialized');
    } catch (error) {
      console.error('Failed to initialize achievement manager:', error);
      this.achievementManager = null;
    }
  }

  setupEventListeners() {
    // Keydown listener
    document.addEventListener('keydown', (event) => {
      this.handleKeyDown(event);
    }, true); // Use capture phase
    
    // Keyup listener for accuracy tracking
    document.addEventListener('keyup', (event) => {
      this.handleKeyUp(event);
    }, true);
    
    // Focus listener for password fields
    document.addEventListener('focusin', (event) => {
      this.handleFocusChange(event);
    }, true);
    
    // Focus out listener
    document.addEventListener('focusout', (event) => {
      this.handleFocusOut(event);
    }, true);
    
    // Mouse down listener for click sounds (optional)
    document.addEventListener('mousedown', (event) => {
      this.handleMouseDown(event);
    }, true);
    
    // Page visibility change
    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });
    
    // Observe dynamically added text areas
    this.observeTextAreas();
    
    // Window unload
    window.addEventListener('beforeunload', () => {
      this.handlePageUnload();
    });
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request).then(sendResponse);
      return true; // Keep message channel open for async response
    });
  }

  async handleMessage(request) {
    try {
      switch (request.type) {
        case 'TOGGLE_SOUNDS':
          await this.handleToggleSounds(request.enabled);
          return { success: true };
        
        case 'SITE_BLACKLIST':
          await this.handleSiteBlacklist(request.blacklisted);
          return { success: true };
        
        case 'UPDATE_SETTINGS':
          await this.handleUpdateSettings(request.settings);
          return { success: true };
        
        case 'SHOW_ACHIEVEMENT':
          await this.handleShowAchievement(request.achievement);
          return { success: true };
        
        case 'PLAY_TEST_SOUND':
          await this.handleTestSound();
          return { success: true };
        
        case 'GET_SESSION_DATA':
          return { session: this.typingSession };
        
        default:
          console.warn('Unknown message type:', request.type);
          return { error: 'Unknown message type' };
      }
    } catch (error) {
      console.error('Error handling message:', error);
      return { error: error.message };
    }
  }

  async handleToggleSounds(enabled) {
    this.settings.enabled = enabled;
    
    if (!enabled && this.audioEngine) {
      this.audioEngine.mute();
    } else if (enabled && this.audioEngine) {
      this.audioEngine.unmute();
    }
  }

  async handleSiteBlacklist(blacklisted) {
    this.isBlacklisted = blacklisted;
    
    if (blacklisted && this.audioEngine) {
      this.audioEngine.mute();
    } else if (!blacklisted && this.audioEngine && this.settings.enabled) {
      this.audioEngine.unmute();
    }
  }

  async handleUpdateSettings(settings) {
    this.settings = settings;
    
    if (this.audioEngine) {
      this.audioEngine.updateSettings(settings);
    }
    
    // Re-check blacklist
    await this.checkCurrentSite();
  }

  async handleShowAchievement(achievement) {
    if (this.notificationManager && this.settings.showNotifications) {
      this.notificationManager.showAchievementNotification(achievement);
      
      // Also play achievement sound
      if (this.audioEngine) {
        this.audioEngine.playAchievementSound();
      }
    }
  }

  async handleTestSound() {
    if (this.audioEngine) {
      this.audioEngine.playTestSound();
    }
  }

  handleKeyDown(event) {
    // Don't process if not initialized or disabled
    if (!this.initialized || !this.settings.enabled || this.isBlacklisted) {
      return;
    }
    
    // Don't process if it's a media site and auto-mute is enabled
    if (this.isMediaSite && this.settings.autoMuteMedia) {
      return;
    }
    
    // Don't play sounds for modifier keys (except we might want Shift, etc.)
    const ignoredKeys = ['Control', 'Alt', 'Meta', 'Escape', 
                        'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 
                        'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
                        'ScrollLock', 'Pause', 'Insert', 'Home',
                        'PageUp', 'Delete', 'End', 'PageDown',
                        'NumLock', 'ContextMenu'];
    
    if (ignoredKeys.includes(event.key)) {
      return;
    }
    
    // Check for password field protection
    if (this.settings.passwordProtection && this.isPasswordField) {
      return;
    }
    
    // Start typing session if not already started
    if (!this.typingSession.startTime) {
      this.startSession();
    }
    
    // Update last key time
    this.typingSession.lastKeyTime = Date.now();
    
    // Update accuracy tracking
    this.typingSession.accuracy.totalKeys++;
    this.typingSession.accuracy.lastKey = event.key;
    
    // Play sound
    if (this.audioEngine) {
      this.audioEngine.playKeySound(event.key, event.code, event);
    }
    
    // Send key press data to background
    this.sendToBackground('KEY_PRESSED', {
      key: event.key,
      code: event.code,
      timestamp: Date.now(),
      target: {
        tagName: event.target.tagName,
        type: event.target.type,
        id: event.target.id,
        className: event.target.className
      }
    });
    
    // Update word count for space and enter keys
    if (event.key === ' ' || event.key === 'Enter') {
      this.typingSession.wordCount++;
      
      // Calculate WPM
      const wpm = this.calculateWPM();
      
      // Update achievement manager
      if (this.achievementManager) {
        this.achievementManager.updateWordCount(this.typingSession.wordCount);
        
        // Check for speed achievements
        if (wpm >= 100) {
          this.achievementManager.checkSpeedAchievement(wpm);
        }
      }
      
      // Send word count update to background
      this.sendToBackground('WORD_COUNT_UPDATE', {
        wordCount: this.typingSession.wordCount,
        sessionDuration: (Date.now() - this.typingSession.startTime) / 1000,
        wpm: wpm
      });
    }
    
    // Check for streak
    this.updateTypingStreak();
    
    // Prevent event propagation if needed (for special keys)
    if (event.key === ' ' && event.target.isContentEditable) {
      // Don't prevent default for space in contenteditable
    }
  }

  handleKeyUp(event) {
    // Update accuracy - mark key as correct if we reached keyup
    if (this.typingSession.accuracy.lastKey === event.key) {
      this.typingSession.accuracy.correctKeys++;
    }
  }

  handleFocusChange(event) {
    const target = event.target;
    
    // Check if focused element is a password field
    const isPasswordField = target.type === 'password' || 
                           target.getAttribute('autocomplete') === 'current-password' ||
                           target.classList.contains('password-field') ||
                           target.id.includes('password') ||
                           target.name.includes('password');
    
    this.isPasswordField = isPasswordField;
    
    if (isPasswordField && this.audioEngine && this.settings.passwordProtection) {
      this.audioEngine.muteTemporarily();
    }
  }

  handleFocusOut(event) {
    // Reset password field flag when focus leaves
    if (this.isPasswordField) {
      setTimeout(() => {
        this.isPasswordField = false;
      }, 100);
    }
  }

  handleMouseDown(event) {
    // Optional: Play click sound for mouse clicks in certain elements
    if (this.settings.enabled && this.audioEngine && !this.isBlacklisted) {
      const target = event.target;
      const isClickable = target.tagName === 'BUTTON' || 
                         target.tagName === 'A' ||
                         target.getAttribute('role') === 'button' ||
                         target.onclick;
      
      if (isClickable) {
        this.audioEngine.playClickSound();
      }
    }
  }

  handleVisibilityChange() {
    if (document.hidden) {
      // Page is hidden, pause audio if playing
      if (this.audioEngine) {
        this.audioEngine.suspend();
      }
    } else {
      // Page is visible again, resume audio
      if (this.audioEngine) {
        this.audioEngine.resume();
      }
    }
  }

  handlePageUnload() {
    // Save session data before page unloads
    this.saveSessionData();
    
    // Send final stats to background
    if (this.typingSession.wordCount > 0) {
      this.sendToBackground('SESSION_END', {
        wordCount: this.typingSession.wordCount,
        duration: (Date.now() - this.typingSession.startTime) / 1000,
        accuracy: this.calculateAccuracy(),
        finalWPM: this.calculateWPM()
      });
    }
  }

  observeTextAreas() {
    // Watch for dynamically added text areas
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              // We're already listening to key events globally,
              // but we can add specific handlers if needed
              if (node.tagName === 'TEXTAREA' || 
                  (node.tagName === 'INPUT' && 
                   ['text', 'email', 'search', 'url'].includes(node.type)) ||
                  node.hasAttribute('contenteditable')) {
                // Mark this as a typing area
                node.dataset.webvibesTypingArea = 'true';
              }
            }
          });
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Also mark existing text areas
    document.querySelectorAll('textarea, input[type="text"], input[type="email"], input[type="search"], input[type="url"], [contenteditable="true"]').forEach(el => {
      el.dataset.webvibesTypingArea = 'true';
    });
  }

  startSession() {
    this.typingSession = {
      startTime: Date.now(),
      wordCount: 0,
      lastKeyTime: null,
      wpmSamples: [],
      currentStreak: 0,
      accuracy: {
        totalKeys: 0,
        correctKeys: 0,
        lastKey: null
      }
    };
    
    console.log('WebVibes: Typing session started');
  }

  calculateWPM() {
    if (!this.typingSession.startTime || this.typingSession.wordCount === 0) {
      return 0;
    }
    
    const now = Date.now();
    const minutesElapsed = (now - this.typingSession.startTime) / 1000 / 60;
    
    if (minutesElapsed > 0) {
      const wpm = Math.round(this.typingSession.wordCount / minutesElapsed);
      
      // Add to samples for moving average
      this.typingSession.wpmSamples.push({
        wpm: wpm,
        timestamp: now
      });
      
      // Keep only last 30 seconds of samples
      const thirtySecondsAgo = now - 30000;
      this.typingSession.wpmSamples = this.typingSession.wpmSamples.filter(
        sample => sample.timestamp > thirtySecondsAgo
      );
      
      return wpm;
    }
    
    return 0;
  }

  calculateAccuracy() {
    if (this.typingSession.accuracy.totalKeys === 0) {
      return 100;
    }
    
    return Math.round((this.typingSession.accuracy.correctKeys / this.typingSession.accuracy.totalKeys) * 100);
  }

  updateTypingStreak() {
    const now = Date.now();
    
    if (!this.typingSession.lastKeyTime || 
        now - this.typingSession.lastKeyTime > 2000) { // 2 second gap breaks streak
      this.typingSession.currentStreak = 1;
    } else {
      this.typingSession.currentStreak++;
      
      // Check for streak-based achievements
      if (this.achievementManager) {
        if (this.typingSession.currentStreak === 30) { // 30 seconds of continuous typing
          this.achievementManager.checkAchievement('typing_streak_30');
        }
      }
    }
  }

  saveSessionData() {
    // Save session data to local storage for persistence
    try {
      const sessionData = {
        ...this.typingSession,
        savedAt: Date.now()
      };
      
      localStorage.setItem('webvibes_session_data', JSON.stringify(sessionData));
    } catch (error) {
      console.error('Error saving session data:', error);
    }
  }

  async sendToBackground(type, data = {}) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type, ...data }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve(response);
      });
    });
  }

  // Public API for other scripts to interact with WebVibes
  getStats() {
    return {
      session: this.typingSession,
      wpm: this.calculateWPM(),
      accuracy: this.calculateAccuracy(),
      streak: this.typingSession.currentStreak,
      isEnabled: this.settings?.enabled || false,
      currentSwitch: this.settings?.currentSwitch || 'tactile'
    };
  }

  toggleEnabled() {
    if (this.settings) {
      this.settings.enabled = !this.settings.enabled;
      this.handleToggleSounds(this.settings.enabled);
      return this.settings.enabled;
    }
    return false;
  }

  changeSwitch(switchType) {
    if (this.settings && this.audioEngine) {
      this.settings.currentSwitch = switchType;
      this.audioEngine.updateSettings(this.settings);
      return true;
    }
    return false;
  }
}

// Initialize content script
let webvibesInstance = null;

function initializeWebVibes() {
  if (!webvibesInstance) {
    webvibesInstance = new ContentScript();
    
    // Expose to window for debugging
    window.webvibes = webvibesInstance;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeWebVibes);
} else {
  initializeWebVibes();
}

// Also initialize for single page apps that load content dynamically
if (typeof MutationObserver !== 'undefined') {
  const observer = new MutationObserver((mutations) => {
    // Re-initialize if our instance was destroyed
    if (!webvibesInstance) {
      initializeWebVibes();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ContentScript };
}