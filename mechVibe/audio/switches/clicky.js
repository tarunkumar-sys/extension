// Clicky Switch Configuration
const ClickySwitch = {
  id: 'clicky',
  name: 'Clicky',
  description: 'Loud & satisfying',
  icon: 'fas fa-bullseye',
  color: '#f59e0b',
  
  // Sound configuration
  config: {
    type: 'sawtooth',
    baseFrequency: 220,
    attack: 0.001,
    decay: 0.03,
    sustain: 0.1,
    release: 0.1,
    noiseAmount: 0.3,
    filterFrequency: 3000,
    filterQ: 3,
    click: {
      frequency: 880,
      duration: 0.01,
      intensity: 0.5,
      attack: 0.001,
      decay: 0.009
    }
  },
  
  // Key-specific adjustments
  keyAdjustments: {
    default: {
      volume: 1.0,
      frequencyMultiplier: 1.0,
      duration: 0.3,
      clickIntensity: 1.0
    },
    
    spacebar: {
      volume: 1.4,
      frequencyMultiplier: 0.7,
      duration: 0.5,
      noiseAmount: 0.15,
      clickIntensity: 1.3,
      description: 'Loud clicky thock'
    },
    
    enter: {
      volume: 1.3,
      frequencyMultiplier: 1.2,
      duration: 0.4,
      noiseAmount: 0.45,
      clickIntensity: 1.2,
      description: 'Sharp clicky return'
    },
    
    backspace: {
      volume: 1.0,
      frequencyMultiplier: 0.9,
      duration: 0.35,
      noiseAmount: 0.24,
      clickIntensity: 1.0,
      description: 'Clicky delete'
    },
    
    shift: {
      volume: 0.9,
      frequencyMultiplier: 1.1,
      duration: 0.34,
      clickIntensity: 1.0,
      description: 'Clicky shift'
    },
    
    tab: {
      volume: 0.95,
      frequencyMultiplier: 1.05,
      duration: 0.36,
      clickIntensity: 1.0,
      description: 'Clicky slide'
    },
    
    capslock: {
      volume: 1.0,
      frequencyMultiplier: 1.15,
      duration: 0.35,
      clickIntensity: 1.1,
      description: 'Clicky toggle'
    },
    
    // Modifier keys
    control: {
      volume: 0.8,
      frequencyMultiplier: 0.95,
      duration: 0.3,
      clickIntensity: 0.8,
      description: 'Clicky modifier'
    },
    
    alt: {
      volume: 0.8,
      frequencyMultiplier: 0.95,
      duration: 0.3,
      clickIntensity: 0.8,
      description: 'Clicky modifier'
    },
    
    meta: {
      volume: 0.8,
      frequencyMultiplier: 0.95,
      duration: 0.3,
      clickIntensity: 0.8,
      description: 'Clicky modifier'
    },
    
    // Number row
    digit: {
      volume: 1.05,
      frequencyMultiplier: 1.05,
      duration: 0.33,
      clickIntensity: 1.0,
      description: 'Clicky numbers'
    },
    
    // Function keys
    fkey: {
      volume: 0.9,
      frequencyMultiplier: 1.1,
      duration: 0.31,
      clickIntensity: 0.9,
      description: 'Clicky functions'
    }
  },
  
  // Generate sound buffer with click
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
          case 'sawtooth':
            sample = 2 * (time * frequency - Math.floor(time * frequency + 0.5));
            break;
          case 'square':
            sample = Math.sign(Math.sin(2 * Math.PI * frequency * time));
            break;
          default:
            sample = 2 * (time * frequency - Math.floor(time * frequency + 0.5));
        }
        
        // Add click at the beginning
        if (time < config.click.duration) {
          const clickTime = time;
          let clickEnvelope = 0;
          
          if (clickTime < config.click.attack) {
            clickEnvelope = clickTime / config.click.attack;
          } else if (clickTime < config.click.duration) {
            const decayTime = clickTime - config.click.attack;
            clickEnvelope = 1 - (decayTime / (config.click.duration - config.click.attack));
          }
          
          const clickFreq = config.click.frequency * adjustment.clickIntensity;
          const click = Math.sin(2 * Math.PI * clickFreq * time) * 
                       config.click.intensity * 
                       adjustment.clickIntensity *
                       clickEnvelope;
          
          sample = sample * 0.6 + click * 0.4;
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
        
        // Panning with slight stereo effect for click
        if (channel === 0) {
          // Left channel
          if (time < config.click.duration) {
            sample *= 0.95; // Slightly quieter in left
          } else {
            sample *= 0.9;
          }
        } else {
          // Right channel
          if (time < config.click.duration) {
            sample *= 1.05; // Slightly louder in right
          } else {
            sample *= 0.9;
          }
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
    return 'Clicky switches provide both tactile feedback and an audible click sound. Perfect for typists who love satisfying auditory feedback.';
  },
  
  // Recommended settings
  getRecommendedSettings() {
    return {
      volume: 0.9,
      pitch: 1.0,
      pitchVariation: 0.2,
      overlap: true
    };
  }
};

// Export for use in audio engine
window.ClickySwitch = ClickySwitch;