/**
 * Main audio controller class for WebVibes extension
 * Handles audio playback, key event detection, and settings management
 */
class WebVibesAudio {
  constructor() {
    this.audioContext = null;
    this.gainNode = null;
    this.buffers = {};
    // Default settings object
    this.settings = {
      enabled: true,
      volume: 0.5, // Default 50%
      soundProfile: "linear",
      siteBlacklist: [],
      keySettings: {}, // Key-specific sound enable/disable settings
    };
    this.isBlacklisted = false;
    this.isPasswordField = false;
    this.initialized = false;

    this.init();
  }

  /**
   * Initializes the WebVibes audio system
   * Loads settings, checks blacklist, initializes audio context, and sets up event listeners
   */
  async init() {
    try {
      await this.loadSettings();
      await this.checkBlacklist();
      await this.initAudio();
      this.setupEventListeners();
      this.initialized = true;
    } catch (error) {
      // Silently handle initialization errors
    }
  }

  /**
   * Loads settings from Chrome storage via background script
   * @returns {Promise} Promise that resolves when settings are loaded
   */
  async loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (response) => {
        if (response) {
          this.settings = { ...this.settings, ...response };
          // Ensure keySettings exists
          if (!this.settings.keySettings) {
            this.settings.keySettings = {};
          }
          // Ensure enabled is a proper boolean
          if (typeof this.settings.enabled !== "boolean") {
            this.settings.enabled = this.settings.enabled !== false;
          }
        }
        resolve();
      });
    });
  }

  /**
   * Checks if the current site is blacklisted
   * @returns {Promise} Promise that resolves with blacklist status
   */
  async checkBlacklist() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: "CHECK_BLACKLIST",
          url: window.location.href,
        },
        (response) => {
          this.isBlacklisted = response?.blacklisted || false;
          resolve();
        }
      );
    });
  }

  /**
   * Initializes the Web Audio API context and gain node
   * Preloads sound files for the current profile
   */
  async initAudio() {
    try {
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = this.settings.volume;

      await this.preloadSounds();
    } catch (error) {
      // Silently handle audio initialization errors
    }
  }

  /**
   * Preloads sound files for the current sound profile
   * Attempts to load sounds in multiple formats (mp3, wav, ogg)
   * Falls back to generated sounds if files are not found
   */
  /**
   * Loads a sound file on-demand (lazy loading for better performance)
   * @param {string} bufferKey - The buffer key ('key', 'spacebar', 'enter', 'backspace')
   * @returns {Promise<AudioBuffer>} The loaded audio buffer
   */
  async loadSound(bufferKey) {
    // Return cached buffer if already loaded
    if (this.buffers[bufferKey]) {
      return this.buffers[bufferKey];
    }

    const profile = this.settings.soundProfile;
    const extensions = ["mp3", "wav", "ogg"];

    // Try to load specific key file first
    for (const ext of extensions) {
      try {
        const url = chrome.runtime.getURL(
          `audio/${profile}/${bufferKey}.${ext}`
        );
        const response = await fetch(url);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await this.audioContext.decodeAudioData(
            arrayBuffer
          );
          this.buffers[bufferKey] = audioBuffer;
          return audioBuffer;
        }
      } catch (error) {
        continue;
      }
    }

    // If specific file not found, try profile sound file
    for (const ext of extensions) {
      try {
        const url = chrome.runtime.getURL(`audio/${profile}/${profile}.${ext}`);
        const response = await fetch(url);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await this.audioContext.decodeAudioData(
            arrayBuffer
          );
          // Cache profile sound for all keys (since it's the profile sound)
          this.buffers["key"] = audioBuffer;
          this.buffers["spacebar"] = audioBuffer;
          this.buffers["enter"] = audioBuffer;
          this.buffers["backspace"] = audioBuffer;
          return audioBuffer;
        }
      } catch (error) {
        continue;
      }
    }

    // Last resort: generate fallback
    const fallback = this.generateFallbackSound(bufferKey);
    this.buffers[bufferKey] = fallback;
    return fallback;
  }

  /**
   * Preloads only the main profile sound for faster initial load
   */
  async preloadSounds() {
    // Clear all buffers when profile changes
    this.buffers = {};

    const profile = this.settings.soundProfile;
    const extensions = ["mp3", "wav", "ogg"];

    // Load only the profile sound file (used as fallback for all keys)
    for (const ext of extensions) {
      try {
        const url = chrome.runtime.getURL(`audio/${profile}/${profile}.${ext}`);
        const response = await fetch(url);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await this.audioContext.decodeAudioData(
            arrayBuffer
          );
          // Store as 'key' buffer (will be used for all keys if specific files don't exist)
          this.buffers["key"] = audioBuffer;
          this.buffers["spacebar"] = audioBuffer;
          this.buffers["enter"] = audioBuffer;
          this.buffers["backspace"] = audioBuffer;
          return;
        }
      } catch (error) {
        continue;
      }
    }
  }

  /**
   * Generates a fallback sound using Web Audio API if sound files are not available
   * Creates a simple sine wave tone with exponential decay
   * @param {string} key - The key type ('key', 'spacebar', 'enter', 'backspace')
   * @returns {AudioBuffer} Generated audio buffer
   */
  generateFallbackSound(key) {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.05;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    let frequency = 200;
    if (key === "spacebar") frequency = 150;
    else if (key === "enter") frequency = 250;
    else if (key === "backspace") frequency = 180;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      data[i] = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 10);
    }

    return buffer;
  }

  /**
   * Plays an audio buffer through the Web Audio API
   * Checks if audio is enabled and not blacklisted before playing
   * @param {AudioBuffer} buffer - The audio buffer to play
   */
  playSound(buffer) {
    // Explicitly check enabled state - don't play if disabled
    if (
      !this.audioContext ||
      !buffer ||
      this.settings.enabled === false ||
      this.isBlacklisted ||
      this.isPasswordField
    ) {
      return;
    }

    // If enabled is not explicitly true, don't play
    if (this.settings.enabled !== true) {
      return;
    }

    try {
      // Resume audio context if suspended (browser autoplay policy)
      if (this.audioContext.state === "suspended") {
        this.audioContext.resume();
      }

      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.gainNode);
      source.start(0);
    } catch (error) {
      // Silently handle playback errors
    }
  }

  /**
   * Plays the appropriate sound for a key press
   * Checks if the key is enabled in settings before playing
   * Maps key codes to sound buffer keys
   * @param {string} key - The key value (e.g., 'a', 'Enter')
   * @param {string} code - The key code (e.g., 'KeyA', 'Enter')
   */
  async playKeySound(key, code) {
    if (!this.initialized) return;

    // Check if this specific key is enabled in settings
    if (this.settings.keySettings) {
      if (
        this.settings.keySettings.hasOwnProperty(code) &&
        this.settings.keySettings[code] === false
      ) {
        return; // Key is disabled
      }
    }

    // Determine which sound buffer to use based on the key
    let bufferKey = "key";
    if (key === " " || code === "Space") {
      bufferKey = "spacebar";
    } else if (key === "Enter" || code === "Enter") {
      bufferKey = "enter";
    } else if (key === "Backspace" || code === "Backspace") {
      bufferKey = "backspace";
    }

    // Load sound on-demand (lazy loading)
    const buffer = await this.loadSound(bufferKey);
    if (buffer) {
      this.playSound(buffer);
    }
  }

  /**
   * Sets up all event listeners for key detection and message handling
   * Listens for keydown events, password field focus, and messages from popup/background
   */
  setupEventListeners() {
    // Listen for keydown events on the document
    document.addEventListener(
      "keydown",
      (e) => {
        if (this.shouldPlaySound(e)) {
          // Don't await - fire and forget for instant response
          this.playKeySound(e.key, e.code).catch(() => {});
        }
      },
      true
    );

    // Track when password fields are focused to disable sounds
    document.addEventListener(
      "focusin",
      (e) => {
        const target = e.target;
        if (target && target.type === "password") {
          this.isPasswordField = true;
        }
      },
      true
    );

    // Track when password fields lose focus to re-enable sounds
    document.addEventListener(
      "focusout",
      (e) => {
        const target = e.target;
        if (target && target.type === "password") {
          setTimeout(() => {
            this.isPasswordField = false;
          }, 100);
        }
      },
      true
    );

    // Listen for messages from popup/background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === "UPDATE_SETTINGS") {
        const oldProfile = this.settings.soundProfile;
        this.settings = { ...this.settings, ...request.settings };
        // Ensure keySettings exists
        if (!this.settings.keySettings) {
          this.settings.keySettings = {};
        }
        // Update volume if gain node exists
        if (this.gainNode) {
          this.gainNode.gain.value = this.settings.volume;
        }
        // Reload sounds if profile changed - clear buffers and reload
        if (
          request.settings.soundProfile &&
          request.settings.soundProfile !== oldProfile
        ) {
          this.buffers = {};
          this.preloadSounds().catch(() => {});
        }
        sendResponse({ success: true });
      }

      if (request.type === "TOGGLE_ENABLED") {
        this.settings.enabled = request.enabled;
        sendResponse({ success: true });
      }

      if (request.type === "UPDATE_BLACKLIST") {
        this.checkBlacklist();
        sendResponse({ success: true });
      }

      return true;
    });
  }

  /**
   * Determines if a sound should be played for a key event
   * Checks various conditions: enabled state, blacklist, password fields, input context
   * Note: Key-specific enable/disable is checked in playKeySound()
   * @param {KeyboardEvent} event - The keyboard event
   * @returns {boolean} True if sound should be played, false otherwise
   */
  shouldPlaySound(event) {
    // Don't play if extension is disabled, site is blacklisted, or in password field
    // Explicitly check enabled state - if undefined, default to false for safety
    if (
      this.settings.enabled === false ||
      this.isBlacklisted ||
      this.isPasswordField
    ) {
      return false;
    }

    // If enabled is not explicitly true, don't play
    if (this.settings.enabled !== true) {
      return false;
    }

    // List of keys that are ignored by default (modifier keys, function keys, etc.)
    const ignoredKeys = [
      "Control",
      "Alt",
      "Meta",
      "Shift",
      "Escape",
      "F1",
      "F2",
      "F3",
      "F4",
      "F5",
      "F6",
      "F7",
      "F8",
      "F9",
      "F10",
      "F11",
      "F12",
      "ScrollLock",
      "Pause",
      "Insert",
      "Home",
      "PageUp",
      "Delete",
      "End",
      "PageDown",
      "NumLock",
      "ContextMenu",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ];

    // Don't play for ignored keys (unless user has explicitly enabled them in settings)
    if (ignoredKeys.includes(event.key)) {
      // Check if user has explicitly enabled this key in settings
      if (
        this.settings.keySettings &&
        this.settings.keySettings.hasOwnProperty(event.code)
      ) {
        return this.settings.keySettings[event.code] === true;
      }
      return false;
    }

    // Only play sounds when typing in input fields
    const target = event.target;
    if (!target) return false;

    const isInput =
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable;

    return isInput;
  }
}

// Global instance of WebVibesAudio
let webVibesInstance = null;

/**
 * Initializes the WebVibes audio instance
 * Ensures only one instance exists per page
 */
function initWebVibes() {
  if (!webVibesInstance) {
    webVibesInstance = new WebVibesAudio();
  }
}

// Initialize when DOM is ready or immediately if already loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initWebVibes);
} else {
  initWebVibes();
}
