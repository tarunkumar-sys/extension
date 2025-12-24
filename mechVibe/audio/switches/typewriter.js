// Typewriter Switch Configuration
const TypewriterSwitch = {
  id: 'typewriter',
  name: 'Typewriter',
  description: 'Vintage mechanical',
  icon: 'fas fa-keyboard',
  color: '#8b5cf6',
  
  // Sound configuration
  config: {
    type: 'noise',
    baseFrequency: 100,
    attack: 0.005,
    decay: 0.3,
    sustain: 0.4,
    release: 0.5,
    noiseAmount: 0.4,
    filterFrequency: 1500,
    filterQ: 4,
    mechanical: {
      frequency: 80,
      duration: 0.1,
      intensity: 0.3,
      metalVibration: 0.2
    }
  },
  
  // Key-specific adjustments
  keyAdjustments: {
    default: {
      volume: 1.0,
      frequencyMultiplier: 1.0,
      duration: 0.6,
      mechanicalIntensity: 1.0
    },
    
    spacebar: {
      volume: 1.5,
      frequencyMultiplier: 0.7,
      duration: 0.8,
      noiseAmount: 0.2,
      mechanicalIntensity: 1.5,
      description: 'Heavy typewriter space'
    },
    
    enter: {
      volume: 1.4,
      frequencyMultiplier: 1.2,
      duration: 0.7,
      noiseAmount: 0.6,
      mechanicalIntensity: 1.3,
      description: 'Carriage return'
    },
    
    backspace: {
      volume: 1.1,
      frequencyMultiplier: 0.9,
      duration: 0.65,
      noiseAmount: 0.32,
      mechanicalIntensity: 1.1,
      description: 'Typewriter correction'
    },
    
    shift: {
      volume: 0.95,
      frequencyMultiplier: 1.1,
      duration: 0.62,
      mechanicalIntensity: 1.0,
      description: 'Shift lever'
    },
    
    tab: {
      volume: 1.0,
      frequencyMultiplier: 1.05,
      duration: 0.64,
      mechanicalIntensity: 1.0,
      description: 'Tab mechanism'
    },
    
    capslock: {
      volume: 1.05,
      frequencyMultiplier: 1.15,
      duration: 0.63,
      mechanicalIntensity: 1.1,
      description: 'Caps lock lever'
    },
    
    // Modifier keys
    control: {
      volume: 0.85,
      frequencyMultiplier: 0.95,
      duration: 0.55,
      mechanicalIntensity: 0.9,
      description: 'Modifier lever'
    },
    
    alt: {
      volume: 0.85,
      frequencyMultiplier: 0.95,
      duration: 0.55,
      mechanicalIntensity: 0.9,
      description: 'Modifier lever'
    },
    
    meta: {
      volume: 0.85,
      frequencyMultiplier: 0.95,
      duration: 0.55,
      mechanicalIntensity: 0.9,
      description: 'Modifier lever'
    },
    
    // Number row
    digit: {
      volume: 1.1,
      frequencyMultiplier: 1.05,
      duration: 0.61,
      mechanicalIntensity: 1.0,
      description: 'Typewriter numbers'
    },
    
    // Function keys
    fkey: {
      volume: 0.95,
      frequencyMultiplier: 1.1,
      duration: 0.59,
      mechanicalIntensity: 0.95,
      description: 'Typewriter functions'
    }
  },
  
  // Generate typewriter sound
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
        
        // Complex envelope for typewriter
        let envelope = 0;
        if (time < config.attack) {
          envelope = Math.pow(time / config.attack, 2);
        } else if (time < config.attack + config.decay) {
          const decayTime = time - config.attack;
          const decayProgress = decayTime / config.decay;
          envelope = 1 - decayProgress * (1 - config.sustain);
          envelope *= 0.8 + 0.2 * Math.sin(decayProgress * Math.PI * 2);
        } else if (time < duration - config.release) {
          envelope = config.sustain;
          envelope *= 0.9 + 0.1 * Math.sin(time * 20);
        } else {
          const releaseTime = time - (duration - config.release);
          const releaseProgress = releaseTime / config.release;
          envelope = config.sustain * (1 - releaseProgress);
          envelope *= 0.8 + 0.2 * Math.sin(releaseProgress * Math.PI);
        }
        
        // Typewriter sound is mostly noise-based
        let sample = 0;
        
        // Mechanical vibration
        const mechanicalFreq = config.mechanical.frequency * adjustment.mechanicalIntensity;
        const mechanical = Math.sin(2 * Math.PI * mechanicalFreq * time) * 
                          config.mechanical.intensity * 
                          adjustment.mechanicalIntensity *
                          Math.exp(-time * 10);
        
        // Metal vibration
        const metalFreq = mechanicalFreq * 3;
        const metal = Math.sin(2 * Math.PI * metalFreq * time) * 
                     config.mechanical.metalVibration *
                     Math.exp(-time * 15);
        
        // Key impact noise
        const impactNoise = (Math.random() * 2 - 1) * 
                           config.noiseAmount * 
                           (adjustment.noiseAmount || 1) *
                           Math.exp(-time * 30);
        
        // Spring sound
        const springFreq = frequency * 0.5;
        const spring = Math.sin(2 * Math.PI * springFreq * time) * 
                      Math.exp(-time * 8) * 
                      0.3;
        
        // Combine all components
        sample = mechanical * 0.4 + 
                metal * 0.2 + 
                impactNoise * 0.3 + 
                spring * 0.1;
        
        // Add paper-like noise
        if (time > 0.05 && time < 0.2) {
          const paperNoise = (Math.random() * 2 - 1) * 0.1 * Math.exp(-(time - 0.05) * 20);
          sample += paperNoise;
        }
        
        // Apply envelope and volume
        sample *= envelope * adjustment.volume;
        
        // Low-pass filter for vintage sound
        const filterGain = Math.exp(-time * config.filterFrequency / sampleRate * 2);
        sample *= filterGain;
        
        // Slight stereo delay for mechanical effect
        if (channel === 0) {
          // Left channel - slightly earlier
          channelData[i] = sample;
        } else {
          // Right channel - slightly delayed (2ms)
          const delaySamples = Math.floor(sampleRate * 0.002);
          if (i >= delaySamples) {
            channelData[i] = channelData[i - delaySamples] * 0.9;
          } else {
            channelData[i] = sample * 0.9;
          }
        }
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
    return 'Vintage typewriter sound with mechanical keypress, carriage return simulation, and paper-like noise. Perfect for nostalgic typing experiences.';
  },
  
  // Recommended settings
  getRecommendedSettings() {
    return {
      volume: 0.8,
      pitch: 0.9,
      pitchVariation: 0.25,
      overlap: false // Typewriters don't overlap well
    };
  }
};

// Export for use in audio engine
window.TypewriterSwitch = TypewriterSwitch;