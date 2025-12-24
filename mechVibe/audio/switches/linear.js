// Linear Switch Configuration
const LinearSwitch = {
  id: 'linear',
  name: 'Linear',
  description: 'Smooth & quiet typing',
  icon: 'fas fa-wave-square',
  color: '#6366f1',
  
  // Sound configuration
  config: {
    type: 'sine',
    baseFrequency: 120,
    attack: 0.001,
    decay: 0.1,
    sustain: 0.3,
    release: 0.2,
    noiseAmount: 0.1,
    filterFrequency: 2000,
    filterQ: 1
  },
  
  // Key-specific adjustments
  keyAdjustments: {
    default: {
      volume: 1.0,
      frequencyMultiplier: 1.0,
      duration: 0.3
    },
    
    spacebar: {
      volume: 1.2,
      frequencyMultiplier: 0.7,
      duration: 0.4,
      noiseAmount: 0.05,
      description: 'Deep thock'
    },
    
    enter: {
      volume: 1.1,
      frequencyMultiplier: 1.2,
      duration: 0.35,
      noiseAmount: 0.15,
      description: 'Sharp return'
    },
    
    backspace: {
      volume: 0.9,
      frequencyMultiplier: 0.9,
      duration: 0.25,
      noiseAmount: 0.08,
      description: 'Soft delete'
    },
    
    shift: {
      volume: 0.8,
      frequencyMultiplier: 1.1,
      duration: 0.28,
      description: 'Subtle shift'
    },
    
    tab: {
      volume: 0.85,
      frequencyMultiplier: 1.05,
      duration: 0.32,
      description: 'Tab slide'
    },
    
    capslock: {
      volume: 0.9,
      frequencyMultiplier: 1.15,
      duration: 0.3,
      description: 'Toggle click'
    },
    
    // Modifier keys
    control: {
      volume: 0.7,
      frequencyMultiplier: 0.95,
      duration: 0.2,
      description: 'Modifier'
    },
    
    alt: {
      volume: 0.7,
      frequencyMultiplier: 0.95,
      duration: 0.2,
      description: 'Modifier'
    },
    
    meta: {
      volume: 0.7,
      frequencyMultiplier: 0.95,
      duration: 0.2,
      description: 'Modifier'
    },
    
    // Number row
    digit: {
      volume: 0.95,
      frequencyMultiplier: 1.05,
      duration: 0.28,
      description: 'Number keys'
    },
    
    // Function keys
    fkey: {
      volume: 0.8,
      frequencyMultiplier: 1.1,
      duration: 0.25,
      description: 'Function keys'
    }
  },
  
  // Generate sound buffer for a specific key
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
        
        // Generate waveform
        let sample = 0;
        
        switch (config.type) {
          case 'sine':
            sample = Math.sin(2 * Math.PI * frequency * time);
            break;
          case 'triangle':
            sample = Math.asin(Math.sin(2 * Math.PI * frequency * time)) * (2 / Math.PI);
            break;
          case 'sawtooth':
            sample = 2 * (time * frequency - Math.floor(time * frequency + 0.5));
            break;
          default:
            sample = Math.sin(2 * Math.PI * frequency * time);
        }
        
        // Add noise
        const noise = (Math.random() * 2 - 1) * config.noiseAmount * adjustment.noiseAmount;
        sample = sample * (1 - config.noiseAmount) + noise * config.noiseAmount;
        
        // Apply envelope and volume
        sample *= envelope * adjustment.volume;
        
        // Simple filter simulation
        const filterGain = Math.exp(-time * config.filterFrequency / sampleRate);
        sample *= filterGain;
        
        // Apply simple panning (left/right balance)
        if (channel === 0) {
          // Left channel - slight emphasis
          sample *= 0.9;
        } else {
          // Right channel
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
    
    // Check for number keys
    if (/^\d$/.test(key)) return this.keyAdjustments.digit;
    
    // Check for function keys
    if (/^F[1-9]$|^F1[0-2]$/.test(key)) return this.keyAdjustments.fkey;
    
    return this.keyAdjustments.default;
  },
  
  // Description for the switch
  getDescription() {
    return 'Linear switches provide a smooth keystroke with no tactile bump or audible click. Perfect for fast typing and gaming.';
  },
  
  // Recommended settings
  getRecommendedSettings() {
    return {
      volume: 0.7,
      pitch: 1.0,
      pitchVariation: 0.1,
      overlap: true
    };
  }
};

// Export for use in audio engine
window.LinearSwitch = LinearSwitch;