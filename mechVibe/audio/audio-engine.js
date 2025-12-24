// WebVibes Audio Engine - COMPLETE with Real Audio Support
class AudioEngine {
  constructor() {
    this.audioContext = null;
    this.gainNode = null;
    this.soundBuffers = new Map(); // For synthetic sounds
    this.audioFiles = new Map(); // For real audio files
    this.currentSwitch = 'tactile';
    this.settings = null;
    this.isInitialized = false;
    this.lastPlayTime = new Map();
    this.isUsingRealAudio = false;
    
    // Audio file paths for each switch
    this.audioFilePaths = {
      'tactile': {
        'key': '/sounds/tactile/key.wav',
        'spacebar': '/sounds/tactile/spacebar.wav',
        'enter': '/sounds/tactile/enter.wav',
        'backspace': '/sounds/tactile/backspace.wav',
        'shift': '/sounds/tactile/shift.wav',
        'capslock': '/sounds/tactile/capslock.wav',
        'tab': '/sounds/tactile/tab.wav'
      },
      'linear': {
        'key': '/sounds/linear/key.wav',
        'spacebar': '/sounds/linear/spacebar.wav',
        'enter': '/sounds/linear/enter.wav',
        'backspace': '/sounds/linear/backspace.wav'
      },
      'clicky': {
        'key': '/sounds/clicky/key.wav',
        'spacebar': '/sounds/clicky/spacebar.wav',
        'enter': '/sounds/clicky/enter.wav'
      },
      'typewriter': {
        'key': '/sounds/typewriter/key.wav',
        'spacebar': '/sounds/typewriter/spacebar.wav',
        'enter': '/sounds/typewriter/enter.wav',
        'backspace': '/sounds/typewriter/backspace.wav'
      }
    };
    
    // Fallback to synthetic if audio files not found
    this.useSyntheticAsFallback = true;
  }

  async initialize(switchType = 'tactile') {
    if (this.isInitialized) return;
    
    console.log('AudioEngine: Initializing...');
    
    try {
      // Create audio context (must be after user interaction)
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Resume audio context if suspended (Chrome policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = 0.7; // Default volume
      
      // Try to load real audio files first
      try {
        await this.loadRealAudioFiles(switchType);
        this.isUsingRealAudio = true;
        console.log('AudioEngine: Using real audio files for', switchType);
      } catch (audioError) {
        console.warn('AudioEngine: Real audio files not found, using synthetic sounds:', audioError);
        this.isUsingRealAudio = false;
        
        // Load synthetic sounds as fallback
        await this.loadSyntheticSounds(switchType);
      }
      
      this.currentSwitch = switchType;
      this.isInitialized = true;
      
      console.log('AudioEngine: Initialized successfully');
      
      // Test sound on initialization
      setTimeout(() => {
        this.playTestSound();
      }, 100);
      
    } catch (error) {
      console.error('AudioEngine: Failed to initialize:', error);
      // Try to create basic audio context as last resort
      try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.gainNode = this.audioContext.createGain();
        this.gainNode.connect(this.audioContext.destination);
        
        // Load basic synthetic sounds
        await this.loadBasicSyntheticSounds();
        this.isInitialized = true;
        console.log('AudioEngine: Initialized with basic synthetic sounds');
      } catch (fallbackError) {
        console.error('AudioEngine: Complete initialization failure:', fallbackError);
      }
    }
  }

  async loadRealAudioFiles(switchType) {
    const switchAudio = this.audioFilePaths[switchType];
    if (!switchAudio) {
      throw new Error(`No audio files defined for switch: ${switchType}`);
    }
    
    this.audioFiles.clear();
    
    // Load each audio file for the switch
    const loadPromises = Object.entries(switchAudio).map(async ([keyType, filePath]) => {
      try {
        // Get the audio file from extension resources
        const audioUrl = chrome.runtime.getURL(filePath);
        const response = await fetch(audioUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch ${filePath}: ${response.status}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        
        this.audioFiles.set(`${switchType}_${keyType}`, audioBuffer);
        console.log(`Loaded audio: ${switchType}_${keyType}`);
        
      } catch (error) {
        console.warn(`Failed to load audio file ${filePath}:`, error);
        throw error;
      }
    });
    
    await Promise.all(loadPromises);
    
    // If no audio files loaded successfully, throw error
    if (this.audioFiles.size === 0) {
      throw new Error('No audio files could be loaded');
    }
  }

  async loadSyntheticSounds(switchType) {
    // Clear any existing buffers
    this.soundBuffers.clear();
    
    // Use the switch modules to generate synthetic sounds
    const switchModules = {
      'linear': window.LinearSwitch,
      'tactile': window.TactileSwitch,
      'clicky': window.ClickySwitch,
      'typewriter': window.TypewriterSwitch
    };
    
    const switchModule = switchModules[switchType];
    
    if (switchModule && typeof switchModule.generateSound === 'function') {
      // Generate sounds for different key types
      const keyTypes = ['default', 'spacebar', 'enter', 'backspace', 'shift', 'capslock', 'tab'];
      
      keyTypes.forEach(keyType => {
        try {
          const buffer = switchModule.generateSound(
            this.audioContext,
            keyType,
            this.settings?.pitchVariation || 0.1
          );
          this.soundBuffers.set(`${switchType}_${keyType}`, buffer);
        } catch (error) {
          console.warn(`Failed to generate synthetic sound for ${keyType}:`, error);
        }
      });
      
      console.log(`Generated synthetic sounds for ${switchType}`);
    } else {
      // Fallback to basic synthetic sounds
      await this.loadBasicSyntheticSounds();
    }
  }

  async loadBasicSyntheticSounds() {
    // Generate very basic synthetic sounds as last resort
    const keyTypes = ['default', 'spacebar', 'enter', 'backspace'];
    
    keyTypes.forEach(keyType => {
      const buffer = this.createBasicSound(keyType);
      this.soundBuffers.set(`basic_${keyType}`, buffer);
    });
    
    console.log('Loaded basic synthetic sounds');
  }

  createBasicSound(keyType) {
    const duration = keyType === 'spacebar' ? 0.4 : 0.3;
    const frequency = keyType === 'spacebar' ? 80 : 
                     keyType === 'enter' ? 180 :
                     keyType === 'backspace' ? 120 : 150;
    
    const sampleRate = this.audioContext.sampleRate;
    const frameCount = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(2, frameCount, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel);
      
      for (let i = 0; i < frameCount; i++) {
        const time = i / sampleRate;
        
        // Simple ADSR envelope
        let envelope = 0;
        if (time < 0.001) {
          envelope = time / 0.001;
        } else if (time < 0.1) {
          envelope = 1 - (time - 0.001) / 0.099 * 0.7;
        } else if (time < duration - 0.1) {
          envelope = 0.3;
        } else {
          envelope = 0.3 * (1 - (time - (duration - 0.1)) / 0.1);
        }
        
        // Sine wave with slight noise
        const sine = Math.sin(2 * Math.PI * frequency * time);
        const noise = (Math.random() * 2 - 1) * 0.1;
        
        channelData[i] = (sine * 0.8 + noise * 0.2) * envelope;
        
        // Simple panning
        if (channel === 0) {
          channelData[i] *= 0.9; // Slightly quieter in left
        }
      }
    }
    
    return buffer;
  }

  getSoundKey(key, code) {
    if (key === ' ') return 'spacebar';
    if (key === 'Enter') return 'enter';
    if (key === 'Backspace') return 'backspace';
    if (key === 'Shift' || code.includes('Shift')) return 'shift';
    if (key === 'CapsLock') return 'capslock';
    if (key === 'Tab') return 'tab';
    if (key === 'Control' || key === 'Alt' || key === 'Meta') return 'modifier';
    
    // Check for number keys
    if (/^\d$/.test(key)) return 'digit';
    
    // Check for function keys
    if (/^F[1-9]$|^F1[0-2]$/.test(key)) return 'fkey';
    
    return 'default';
  }

  playKeySound(key, code, event = null) {
    if (!this.isInitialized || !this.audioContext) {
      console.warn('AudioEngine not initialized');
      return;
    }
    
    // Anti-spam: prevent playing same key too quickly
    const now = Date.now();
    const soundKey = this.getSoundKey(key, code);
    const lastPlay = this.lastPlayTime.get(soundKey) || 0;
    
    if (now - lastPlay < 10) { // 10ms minimum between same key sounds
      return;
    }
    
    this.lastPlayTime.set(soundKey, now);
    
    try {
      let audioBuffer = null;
      let bufferKey = '';
      
      if (this.isUsingRealAudio && this.audioFiles.size > 0) {
        // Try to get real audio file
        bufferKey = `${this.currentSwitch}_${soundKey}`;
        audioBuffer = this.audioFiles.get(bufferKey);
        
        // Fallback to default key sound if specific one not found
        if (!audioBuffer) {
          bufferKey = `${this.currentSwitch}_default`;
          audioBuffer = this.audioFiles.get(bufferKey);
        }
      }
      
      // If no real audio, try synthetic
      if (!audioBuffer && this.soundBuffers.size > 0) {
        bufferKey = `${this.currentSwitch}_${soundKey}`;
        audioBuffer = this.soundBuffers.get(bufferKey);
        
        // Fallback to default synthetic sound
        if (!audioBuffer) {
          bufferKey = `${this.currentSwitch}_default`;
          audioBuffer = this.soundBuffers.get(bufferKey);
        }
        
        // Last resort: basic sound
        if (!audioBuffer) {
          bufferKey = `basic_${soundKey}`;
          audioBuffer = this.soundBuffers.get(bufferKey);
          
          if (!audioBuffer) {
            bufferKey = 'basic_default';
            audioBuffer = this.soundBuffers.get(bufferKey);
          }
        }
      }
      
      if (!audioBuffer) {
        console.warn('No audio buffer found for:', soundKey);
        return;
      }
      
      // Create source node
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      // Apply pitch variation if enabled
      let playbackRate = this.settings?.pitch || 1.0;
      
      if (this.settings?.pitchVariation && this.settings.pitchVariation > 0) {
        const variation = 1 + (Math.random() * 2 - 1) * this.settings.pitchVariation;
        playbackRate *= variation;
      }
      
      source.playbackRate.value = playbackRate;
      
      // Apply volume with separate gain node for per-sound control
      const gainNode = this.audioContext.createGain();
      let volume = this.settings?.volume || 0.7;
      
      // Adjust volume for different key types
      if (soundKey === 'spacebar') volume *= 1.2;
      if (soundKey === 'enter') volume *= 1.1;
      if (soundKey === 'backspace') volume *= 0.9;
      
      gainNode.gain.value = volume;
      
      // Apply simple panning based on key position
      const panner = this.audioContext.createStereoPanner();
      
      if (event && this.settings?.stereoPanning) {
        // Simple stereo panning based on key position on keyboard
        const keyCode = code || '';
        let panValue = 0;
        
        if (keyCode.includes('Left') || /^[QWEASDZXC]$/.test(key)) {
          panValue = -0.3; // Left side
        } else if (keyCode.includes('Right') || /^[UIOPJKLNM]$/.test(key)) {
          panValue = 0.3; // Right side
        }
        
        panner.pan.value = panValue;
        source.connect(panner);
        panner.connect(gainNode);
      } else {
        source.connect(gainNode);
      }
      
      gainNode.connect(this.gainNode);
      
      // Play immediately
      const startTime = this.audioContext.currentTime;
      source.start(startTime);
      
      // Clean up after playback
      source.onended = () => {
        source.disconnect();
        gainNode.disconnect();
        if (panner) panner.disconnect();
      };
      
      // Log for debugging
      if (this.settings?.debugMode) {
        console.log(`Played: ${soundKey}, Buffer: ${bufferKey}, Volume: ${volume.toFixed(2)}`);
      }
      
    } catch (error) {
      console.error('Error playing key sound:', error);
      
      // Try to recover audio context if needed
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
    }
  }

  playTestSound() {
    if (!this.isInitialized) return;
    
    // Play a test sequence
    const testKeys = [
      { key: 'A', code: 'KeyA' },
      { key: 'S', code: 'KeyS' },
      { key: 'D', code: 'KeyD' },
      { key: ' ', code: 'Space' },
      { key: 'Enter', code: 'Enter' }
    ];
    
    testKeys.forEach((testKey, index) => {
      setTimeout(() => {
        this.playKeySound(testKey.key, testKey.code);
      }, index * 150);
    });
  }

  playAchievementSound() {
    if (!this.isInitialized) return;
    
    try {
      // Create a special achievement sound
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.type = 'sine';
      
      // Ascending sequence for achievement
      const now = this.audioContext.currentTime;
      oscillator.frequency.setValueAtTime(523.25, now); // C5
      oscillator.frequency.exponentialRampToValueAtTime(1046.50, now + 0.3); // C6
      oscillator.frequency.exponentialRampToValueAtTime(1567.98, now + 0.6); // G6
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
      
      oscillator.connect(gainNode);
      gainNode.connect(this.gainNode);
      
      oscillator.start(now);
      oscillator.stop(now + 0.8);
      
      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
      };
      
    } catch (error) {
      console.error('Error playing achievement sound:', error);
    }
  }

  playClickSound() {
    if (!this.isInitialized) return;
    
    try {
      // Simple click sound for mouse clicks
      const buffer = this.audioContext.createBuffer(1, 2205, 44100); // 0.05 seconds
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < 2205; i++) {
        data[i] = Math.random() * 2 - 1;
        data[i] *= Math.exp(-i / 100); // Quick decay
      }
      
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 0.1;
      
      source.connect(gainNode);
      gainNode.connect(this.gainNode);
      
      source.start();
      
      source.onended = () => {
        source.disconnect();
        gainNode.disconnect();
      };
      
    } catch (error) {
      console.error('Error playing click sound:', error);
    }
  }

  updateSettings(settings) {
    this.settings = settings;
    
    // Update volume
    if (this.gainNode && settings.volume !== undefined) {
      this.gainNode.gain.value = settings.volume;
    }
    
    // Switch sounds if changed
    if (settings.currentSwitch && settings.currentSwitch !== this.currentSwitch) {
      this.currentSwitch = settings.currentSwitch;
      
      // Reload sounds for new switch
      setTimeout(async () => {
        try {
          if (this.isUsingRealAudio) {
            await this.loadRealAudioFiles(settings.currentSwitch);
          } else {
            await this.loadSyntheticSounds(settings.currentSwitch);
          }
        } catch (error) {
          console.error('Error switching sounds:', error);
        }
      }, 0);
    }
  }

  mute() {
    if (this.gainNode) {
      this.gainNode.gain.value = 0;
    }
  }

  unmute() {
    if (this.gainNode && this.settings) {
      this.gainNode.gain.value = this.settings.volume || 0.7;
    }
  }

  muteTemporarily() {
    if (this.gainNode) {
      const originalVolume = this.gainNode.gain.value;
      this.gainNode.gain.value = 0;
      
      // Restore after 500ms
      setTimeout(() => {
        if (this.gainNode) {
          this.gainNode.gain.value = originalVolume;
        }
      }, 500);
    }
  }

  suspend() {
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend();
    }
  }

  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  // Check if audio context needs to be resumed
  ensureAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      return this.audioContext.resume();
    }
    return Promise.resolve();
  }

  // Get available switch types
  getAvailableSwitches() {
    return Object.keys(this.audioFilePaths);
  }

  // Check if a switch has real audio files
  hasRealAudio(switchType) {
    return this.audioFiles.has(`${switchType}_default`) || 
           this.audioFiles.has(`${switchType}_key`);
  }

  // Get current audio mode
  getAudioMode() {
    return this.isUsingRealAudio ? 'real' : 'synthetic';
  }
}

// Export for global access
window.AudioEngine = AudioEngine;

// Auto-initialize when included
if (typeof window !== 'undefined') {
  // Create a global instance that can be accessed
  window.webvibesAudioEngine = new AudioEngine();
}