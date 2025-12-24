// Tactile Switch Configuration
const TactileSwitch = {
  id: 'tactile',
  name: 'Tactile',
  description: 'Bumpy feedback',
  icon: 'fas fa-mountain',
  color: '#10b981',
  
  // Sound configuration
  config: {
    type: 'triangle',
    baseFrequency: 180,
    attack: 0.001,
    decay: 0.05,
    sustain: 0.2,
    release: 0.15,
    noiseAmount: 0.2,
    filterFrequency: 2500,
    filterQ: 2,
    tactileBump: {
      frequency: 240,
      duration: 0.02,
      intensity: 0.3
    }
  },
  
  // Key-specific adjustments
  keyAdjustments: {
    default: {
      volume: 1.0,
      frequencyMultiplier: 1.0,
      duration: 0.3,
      tactileIntensity: 1.0
    },
    
    spacebar: {
      volume: 1.3,
      frequencyMultiplier: 0.7,
      duration: 0.45,
      noiseAmount: 0.1,
      tactileIntensity: 1.2,
      description: 'Heavy thock with bump'
    },
    
    enter: {
      volume: 1.2,
      frequencyMultiplier: 1.2,
      duration: 0.38,
      noiseAmount: 0.3,
      tactileIntensity: 1.1,
      description: 'Sharp tactile return'
    },
    
    backspace: {
      volume: 0.95,
      frequencyMultiplier: 0.9,
      duration: 0.3,
      noiseAmount: 0.16,
      tactileIntensity: 0.9,
      description: 'Tactile delete'
    },
    
    shift: {
      volume: 0.85,
      frequencyMultiplier: 1.1,
      duration: 0.32,
      tactileIntensity: 1.0,
      description: 'Tactile shift'
    },
    
    tab: {
      volume: 0.9,
      frequencyMultiplier: 1.05,
      duration: 0.35,
      tactileIntensity: 1.0,
      description: 'Tactile slide'
    },
    
    capslock: {
      volume: 0.95,
      frequencyMultiplier: 1.15,
      duration: 0.33,
      tactileIntensity: 1.1,
      description: 'Tactile toggle'
    },
    
    // Modifier keys
    control: {
      volume: 0.75,
      frequencyMultiplier: 0.95,
      duration: 0.25,
      tactileIntensity: 0.8,
      description: 'Tactile modifier'
    },
    
    alt: {
      volume: 0.75,
      frequencyMultiplier: 0.95,
      duration: 0.25,
      tactileIntensity: 0.8,
      description: 'Tactile modifier'
    },
    
    meta: {
      volume: 0.75,
      frequencyMultiplier: 0.95,
      duration: 0.25,
      tactileIntensity: 0.8,
      description: 'Tactile modifier'
    },
    
    // Number row
    digit: {
      volume: 1.0,
      frequencyMultiplier: 1.05,
      duration: 0.31,
      tactileIntensity: 1.0,
      description: 'Tactile numbers'
    },
    
    // Function keys
    fkey: {
      volume: 0.85,
      frequencyMultiplier: 1.1,
      duration: 0.28,
      tactileIntensity: 0.9,
      description: 'Tactile functions'
    }
  },
  
  // Generate sound buffer with tactile bump
  generateSound(audioContext, keyType = 'default', pitchVariation = 0) {
    const config = this.config;
    const adjustment = this.keyAdjustments[keyType] || this.keyAdjustments.default;
    
    // Calculate frequency with variation
    const baseFreq = config.baseFrequency * adjustment.frequencyMultiplier;
    const variation = 1 + (Math.random() * 2 - 1) * pitchVariation;
    const frequency = baseFreq * variation;
    
    const duration = adjustment.duration;
    const sampleRate = audioContext.sampleRate;
    const frameCount = sampleRate * duration;
    
    // Create stereo buffer
    const buffer = audioContext.createBuffer(2, frameCount, sampleRate);
    
    // Generate sound for each channel
    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel);
      
      for (let i = 0; i < frameCount; i++) {
        const time = i / sampleRate;
        
        // ADSR envelope
        let envelope = 0;
        if (time < config.attack) {
          envelope = time / config.attack;
        } else if (time < config.attack + config.decay) {
          envelope = 1 - (time - config.attack) / config.decay * (1 - config.sustain);
        } else if (time < duration - config.release) {
          envelope = config.sustain;
        } else {
          envelope = config.sustain * (1 - (time - (duration - config.release)) / config.release);
        }
        
        // Main waveform
        let sample = 0;
        
        switch (config.type) {
          case 'triangle':
            sample = Math.asin(Math.sin(2 * Math.PI * frequency * time)) * (2 / Math.PI);
            break;
          case 'sine':
            sample = Math.sin(2 * Math.PI * frequency * time);
            break;
          default:
            sample = Math.asin(Math.sin(2 * Math.PI * frequency * time)) * (2 / Math.PI);
        }
        
        // Add tactile bump
        if (time < config.tactileBump.duration) {
          const bumpFreq = config.tactileBump.frequency * adjustment.tactileIntensity;
          const bump = Math.sin(2 * Math.PI * bumpFreq * time) * 
                       config.tactileBump.intensity * 
                       adjustment.tactileIntensity *
                       (1 - time / config.tactileBump.duration);
          sample = sample * 0.7 + bump * 0.3;
        }
        
        // Add noise
        const noiseAmount = config.noiseAmount * (adjustment.noiseAmount || 1);
        const noise = (Math.random() * 2 - 1) * noiseAmount;
        sample = sample * (1 - noiseAmount) + noise * noiseAmount;
        
        // Apply envelope and volume
        sample *= envelope * adjustment.volume;
        
        // Filter
        const filterGain = Math.exp(-time * config.filterFrequency / sampleRate);
        sample *= filterGain;
        
        // Panning
        if (channel === 0) {
          sample *= 0.9;
        } else {
          sample *= 0.9;
        }
        
        channelData[i] = sample;
      }
    }
    
    return buffer;
  },
  
  // Get configuration for a specific key
  getKeyConfig(keyCode, key) {
    if (key === ' ') return this.keyAdjustments.spacebar;
    if (key === 'Enter') return this.keyAdjustments.enter;
    if (key === 'Backspace') return this.keyAdjustments.backspace;
    if (key === 'Shift' || keyCode.includes('Shift')) return this.keyAdjustments.shift;
    if (key === 'Tab') return this.keyAdjustments.tab;
    if (key === 'CapsLock') return this.keyAdjustments.capslock;
    if (key === 'Control' || key === 'Alt' || key === 'Meta') {
      return this.keyAdjustments.control;
    }
    
    if (/^\d$/.test(key)) return this.keyAdjustments.digit;
    if (/^F[1-9]$|^F1[0-2]$/.test(key)) return this.keyAdjustments.fkey;
    
    return this.keyAdjustments.default;
  },
  
  // Description
  getDescription() {
    return 'Tactile switches provide a noticeable bump during the keystroke, giving satisfying feedback without being too loud. Great for typing and programming.';
  },
  
  // Recommended settings
  getRecommendedSettings() {
    return {
      volume: 0.8,
      pitch: 1.0,
      pitchVariation: 0.15,
      overlap: true
    };
  }
};

// Export for use in audio engine
window.TactileSwitch = TactileSwitch;