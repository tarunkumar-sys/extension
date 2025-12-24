class WebVibesAudio {
  constructor() {
    this.audioContext = null;
    this.gainNode = null;
    this.buffers = {};
    this.settings = {
      enabled: true,
      volume: 0.7,
      soundProfile: 'linear',
      siteBlacklist: []
    };
    this.isBlacklisted = false;
    this.isPasswordField = false;
    this.initialized = false;
    
    this.init();
  }
  
  async init() {
    try {
      await this.loadSettings();
      await this.checkBlacklist();
      await this.initAudio();
      this.setupEventListeners();
      this.initialized = true;
    } catch (error) {
    }
  }
  
  async loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
        if (response) {
          this.settings = { ...this.settings, ...response };
        }
        resolve();
      });
    });
  }
  
  async checkBlacklist() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        type: 'CHECK_BLACKLIST', 
        url: window.location.href 
      }, (response) => {
        this.isBlacklisted = response?.blacklisted || false;
        resolve();
      });
    });
  }
  
  async initAudio() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = this.settings.volume;
      
      await this.preloadSounds();
    } catch (error) {
    }
  }
  
  async preloadSounds() {
    const profile = this.settings.soundProfile;
    const soundFiles = [
      { name: 'key', key: 'key' },
      { name: 'spacebar', key: 'spacebar' },
      { name: 'enter', key: 'enter' },
      { name: 'backspace', key: 'backspace' }
    ];
    
    const extensions = ['mp3', 'wav', 'ogg'];
    let profileSound = null;
    
    for (const ext of extensions) {
      try {
        const url = chrome.runtime.getURL(`audio/${profile}/${profile}.${ext}`);
        const response = await fetch(url);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          profileSound = await this.audioContext.decodeAudioData(arrayBuffer);
          break;
        }
      } catch (error) {
        continue;
      }
    }
    
    for (const file of soundFiles) {
      let loaded = false;
      
      for (const ext of extensions) {
        try {
          const url = chrome.runtime.getURL(`audio/${profile}/${file.name}.${ext}`);
          const response = await fetch(url);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.buffers[file.key] = audioBuffer;
            loaded = true;
            break;
          }
        } catch (error) {
          continue;
        }
      }
      
      if (!loaded) {
        if (profileSound) {
          this.buffers[file.key] = profileSound;
        } else {
          this.buffers[file.key] = this.generateFallbackSound(file.key);
        }
      }
    }
  }
  
  generateFallbackSound(key) {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.05;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    let frequency = 200;
    if (key === 'spacebar') frequency = 150;
    else if (key === 'enter') frequency = 250;
    else if (key === 'backspace') frequency = 180;
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      data[i] = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 10);
    }
    
    return buffer;
  }
  
  playSound(buffer) {
    if (!this.audioContext || !buffer || !this.settings.enabled || this.isBlacklisted || this.isPasswordField) {
      return;
    }
    
    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.gainNode);
      source.start(0);
    } catch (error) {
    }
  }
  
  playKeySound(key, code) {
    if (!this.initialized) return;
    
    let bufferKey = 'key';
    
    if (key === ' ' || code === 'Space') {
      bufferKey = 'spacebar';
    } else if (key === 'Enter' || code === 'Enter') {
      bufferKey = 'enter';
    } else if (key === 'Backspace' || code === 'Backspace') {
      bufferKey = 'backspace';
    }
    
    const buffer = this.buffers[bufferKey] || this.buffers['key'];
    if (buffer) {
      this.playSound(buffer);
    }
  }
  
  setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      if (this.shouldPlaySound(e)) {
        this.playKeySound(e.key, e.code);
      }
    }, true);
    
    document.addEventListener('focusin', (e) => {
      const target = e.target;
      if (target && target.type === 'password') {
        this.isPasswordField = true;
      }
    }, true);
    
    document.addEventListener('focusout', (e) => {
      const target = e.target;
      if (target && target.type === 'password') {
        setTimeout(() => {
          this.isPasswordField = false;
        }, 100);
      }
    }, true);
    
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'UPDATE_SETTINGS') {
        const oldProfile = this.settings.soundProfile;
        this.settings = { ...this.settings, ...request.settings };
        if (this.gainNode) {
          this.gainNode.gain.value = this.settings.volume;
        }
        if (request.settings.soundProfile && request.settings.soundProfile !== oldProfile) {
          this.buffers = {};
          this.preloadSounds();
        }
        sendResponse({ success: true });
      }
      
      if (request.type === 'TOGGLE_ENABLED') {
        this.settings.enabled = request.enabled;
        sendResponse({ success: true });
      }
      
      if (request.type === 'UPDATE_BLACKLIST') {
        this.checkBlacklist();
        sendResponse({ success: true });
      }
      
      return true;
    });
  }
  
  shouldPlaySound(event) {
    if (!this.settings.enabled || this.isBlacklisted || this.isPasswordField) {
      return false;
    }
    
    const ignoredKeys = [
      'Control', 'Alt', 'Meta', 'Shift', 'Escape',
      'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
      'ScrollLock', 'Pause', 'Insert', 'Home', 'PageUp', 'Delete', 'End', 'PageDown',
      'NumLock', 'ContextMenu', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'
    ];
    
    if (ignoredKeys.includes(event.key)) {
      return false;
    }
    
    const target = event.target;
    if (!target) return false;
    
    const isInput = target.tagName === 'INPUT' || 
                   target.tagName === 'TEXTAREA' || 
                   target.isContentEditable;
    
    return isInput;
  }
}

let webVibesInstance = null;

function initWebVibes() {
  if (!webVibesInstance) {
    webVibesInstance = new WebVibesAudio();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWebVibes);
} else {
  initWebVibes();
}

