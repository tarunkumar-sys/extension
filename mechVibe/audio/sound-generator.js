// WebVibes Sound Generator - Creates realistic keyboard sounds programmatically
class SoundGenerator {
  constructor() {
    this.audioContext = null;
    this.cachedSounds = new Map();
  }

  setAudioContext(audioContext) {
    this.audioContext = audioContext;
  }

  // Generate mechanical keyboard switch sounds
  generateSwitchSound(type, keyType = 'key') {
    if (!this.audioContext) {
      throw new Error('AudioContext not set');
    }

    const cacheKey = `${type}_${keyType}`;
    if (this.cachedSounds.has(cacheKey)) {
      return this.cachedSounds.get(cacheKey);
    }

    let buffer;
    switch (type) {
      case 'linear':
        buffer = this.generateLinearSound(keyType);
        break;
      case 'tactile':
        buffer = this.generateTactileSound(keyType);
        break;
      case 'clicky':
        buffer = this.generateClickySound(keyType);
        break;
      case 'typewriter':
        buffer = this.generateTypewriterSound(keyType);
        break;
      default:
        buffer = this.generateTactileSound(keyType);
    }

    this.cachedSounds.set(cacheKey, buffer);
    return buffer;
  }

  generateLinearSound(keyType) {
    const config = this.getKeyConfig(keyType);
    const duration = config.duration;
    const sampleRate = this.audioContext.sampleRate;
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = this.audioContext.createBuffer(2, frameCount, sampleRate);

    // Linear switches: smooth with subtle thock
    const baseFreq = 120 * config.freqMultiplier;
    const noiseAmount = 0.05;

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      
      for (let i = 0; i < frameCount; i++) {
        const t = i / sampleRate;
        
        // ADSR Envelope
        const attack = 0.001;
        const decay = 0.05;
        const sustain = 0.3;
        const release = 0.15;
        
        let envelope = 0;
        if (t < attack) {
          envelope = t / attack;
        } else if (t < attack + decay) {
          envelope = 1 - (t - attack) / decay * (1 - sustain);
        } else if (t < duration - release) {
          envelope = sustain;
        } else {
          envelope = sustain * (1 - (t - (duration - release)) / release);
        }

        // Main frequency with slight vibrato
        const vibrato = Math.sin(t * 8) * 2;
        const freq = baseFreq + vibrato;
        
        // Sine wave for smoothness
        let sample = Math.sin(2 * Math.PI * freq * t);
        
        // Add subtle harmonics
        sample += Math.sin(2 * Math.PI * freq * 2 * t) * 0.3;
        sample += Math.sin(2 * Math.PI * freq * 3 * t) * 0.1;
        
        // Add noise for texture
        const noise = (Math.random() * 2 - 1) * noiseAmount;
        sample = sample * (1 - noiseAmount) + noise;
        
        // Low-pass filter simulation
        const filter = Math.exp(-t * 30);
        sample *= filter;
        
        // Apply envelope
        sample *= envelope * config.volume;
        
        // Stereo positioning
        if (channel === 0) {
          sample *= 0.95; // Slightly left
        } else {
          sample *= 0.9;  // Slightly right
        }
        
        data[i] = sample;
      }
    }

    return buffer;
  }

  generateTactileSound(keyType) {
    const config = this.getKeyConfig(keyType);
    const duration = config.duration;
    const sampleRate = this.audioContext.sampleRate;
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = this.audioContext.createBuffer(2, frameCount, sampleRate);

    // Tactile switches: bump with feedback
    const baseFreq = 180 * config.freqMultiplier;
    const bumpFreq = 240;
    const noiseAmount = 0.1;

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      
      for (let i = 0; i < frameCount; i++) {
        const t = i / sampleRate;
        
        // ADSR Envelope with tactile bump
        const attack = 0.001;
        const bumpTime = 0.015;
        const decay = 0.03;
        const sustain = 0.2;
        const release = 0.1;
        
        let envelope = 0;
        if (t < attack) {
          envelope = t / attack;
        } else if (t < attack + bumpTime) {
          // Tactile bump
          envelope = 1.2 * (1 - (t - attack) / bumpTime * 0.2);
        } else if (t < attack + bumpTime + decay) {
          envelope = 1 - (t - attack - bumpTime) / decay * (1 - sustain);
        } else if (t < duration - release) {
          envelope = sustain;
        } else {
          envelope = sustain * (1 - (t - (duration - release)) / release);
        }

        // Main frequency
        const freq = baseFreq;
        
        // Triangle wave for tactile feel
        let sample = Math.asin(Math.sin(2 * Math.PI * freq * t)) * (2 / Math.PI);
        
        // Add tactile bump frequency
        if (t < bumpTime) {
          const bump = Math.sin(2 * Math.PI * bumpFreq * t) * 
                      (1 - t / bumpTime) * 0.4;
          sample = sample * 0.6 + bump * 0.4;
        }
        
        // Add harmonics
        sample += Math.sin(2 * Math.PI * freq * 1.5 * t) * 0.2;
        sample += Math.sin(2 * Math.PI * freq * 2.5 * t) * 0.1;
        
        // Add noise
        const noise = (Math.random() * 2 - 1) * noiseAmount;
        sample = sample * (1 - noiseAmount) + noise;
        
        // Apply envelope
        sample *= envelope * config.volume;
        
        // Stereo
        if (channel === 0) {
          sample *= 0.9;
        } else {
          sample *= 0.95;
        }
        
        data[i] = sample;
      }
    }

    return buffer;
  }

  generateClickySound(keyType) {
    const config = this.getKeyConfig(keyType);
    const duration = config.duration;
    const sampleRate = this.audioContext.sampleRate;
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = this.audioContext.createBuffer(2, frameCount, sampleRate);

    // Clicky switches: sharp click with resonance
    const baseFreq = 220 * config.freqMultiplier;
    const clickFreq = 880;
    const noiseAmount = 0.15;

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      
      for (let i = 0; i < frameCount; i++) {
        const t = i / sampleRate;
        
        // ADSR with sharp click
        const attack = 0.001;
        const clickTime = 0.008;
        const decay = 0.02;
        const sustain = 0.1;
        const release = 0.08;
        
        let envelope = 0;
        if (t < attack) {
          envelope = t / attack;
        } else if (t < attack + clickTime) {
          // Sharp click
          envelope = 1.5 * (1 - (t - attack) / clickTime * 0.5);
        } else if (t < attack + clickTime + decay) {
          envelope = 1 - (t - attack - clickTime) / decay * (1 - sustain);
        } else if (t < duration - release) {
          envelope = sustain;
        } else {
          envelope = sustain * (1 - (t - (duration - release)) / release);
        }

        // Main frequency
        const freq = baseFreq;
        
        // Square wave for sharpness
        let sample = Math.sign(Math.sin(2 * Math.PI * freq * t)) * 0.7;
        
        // Add sharp click
        if (t < clickTime) {
          const click = Math.sin(2 * Math.PI * clickFreq * t) * 
                       (1 - t / clickTime) * 0.6;
          sample = sample * 0.4 + click * 0.6;
        }
        
        // Add resonance
        sample += Math.sin(2 * Math.PI * freq * 1.8 * t) * 0.3;
        sample += Math.sin(2 * Math.PI * freq * 2.2 * t) * 0.2;
        
        // Add noise
        const noise = (Math.random() * 2 - 1) * noiseAmount;
        sample = sample * (1 - noiseAmount) + noise;
        
        // Apply envelope
        sample *= envelope * config.volume;
        
        // Stereo with click emphasis
        if (channel === 0) {
          sample *= t < clickTime ? 0.85 : 0.9;
        } else {
          sample *= t < clickTime ? 1.0 : 0.9;
        }
        
        data[i] = sample;
      }
    }

    return buffer;
  }

  generateTypewriterSound(keyType) {
    const config = this.getKeyConfig(keyType);
    const duration = config.duration;
    const sampleRate = this.audioContext.sampleRate;
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = this.audioContext.createBuffer(2, frameCount, sampleRate);

    // Typewriter: mechanical with metal resonance
    const baseFreq = 100 * config.freqMultiplier;
    const metalFreq = 300;
    const noiseAmount = 0.25;

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      
      for (let i = 0; i < frameCount; i++) {
        const t = i / sampleRate;
        
        // Complex envelope for mechanical feel
        const attack = 0.005;
        const metalTime = 0.05;
        const decay = 0.1;
        const sustain = 0.4;
        const release = 0.3;
        
        let envelope = 0;
        if (t < attack) {
          envelope = Math.pow(t / attack, 2); // Faster attack
        } else if (t < attack + metalTime) {
          // Metal resonance
          envelope = 1.1 - (t - attack) / metalTime * 0.1;
        } else if (t < attack + metalTime + decay) {
          envelope = 1 - (t - attack - metalTime) / decay * (1 - sustain);
        } else if (t < duration - release) {
          envelope = sustain * (0.9 + 0.1 * Math.sin(t * 20)); // Slight vibration
        } else {
          envelope = sustain * (1 - (t - (duration - release)) / release);
        }

        // Main mechanical frequency
        const freq = baseFreq;
        
        // Complex waveform
        let sample = Math.sin(2 * Math.PI * freq * t) * 0.5;
        sample += Math.sin(2 * Math.PI * freq * 1.7 * t) * 0.3;
        sample += Math.sin(2 * Math.PI * freq * 2.3 * t) * 0.2;
        
        // Metal resonance
        if (t < metalTime) {
          const metal = Math.sin(2 * Math.PI * metalFreq * t) * 
                       Math.exp(-t * 20) * 0.4;
          sample += metal;
        }
        
        // Spring sound
        const springFreq = freq * 0.8;
        const spring = Math.sin(2 * Math.PI * springFreq * t) * 
                      Math.exp(-t * 10) * 0.3;
        sample += spring;
        
        // Paper-like noise
        if (t > 0.02 && t < 0.1) {
          const paperNoise = (Math.random() * 2 - 1) * 
                           Math.exp(-(t - 0.02) * 30) * 0.2;
          sample += paperNoise;
        }
        
        // General noise
        const noise = (Math.random() * 2 - 1) * noiseAmount;
        sample = sample * (1 - noiseAmount) + noise;
        
        // Apply envelope
        sample *= envelope * config.volume;
        
        // Vintage stereo effect (slight delay)
        if (channel === 0) {
          data[i] = sample;
        } else {
          // Right channel slightly delayed
          const delaySamples = Math.floor(sampleRate * 0.002);
          if (i >= delaySamples) {
            data[i] = data[i - delaySamples] * 0.9;
          } else {
            data[i] = sample * 0.9;
          }
        }
      }
    }

    return buffer;
  }

  getKeyConfig(keyType) {
    const configs = {
      'key': {
        duration: 0.3,
        freqMultiplier: 1.0,
        volume: 1.0
      },
      'spacebar': {
        duration: 0.4,
        freqMultiplier: 0.7,
        volume: 1.2
      },
      'enter': {
        duration: 0.35,
        freqMultiplier: 1.2,
        volume: 1.1
      },
      'backspace': {
        duration: 0.25,
        freqMultiplier: 0.9,
        volume: 0.9
      },
      'shift': {
        duration: 0.28,
        freqMultiplier: 1.1,
        volume: 0.8
      },
      'capslock': {
        duration: 0.3,
        freqMultiplier: 1.15,
        volume: 0.9
      },
      'tab': {
        duration: 0.32,
        freqMultiplier: 1.05,
        volume: 0.85
      },
      'modifier': {
        duration: 0.2,
        freqMultiplier: 0.95,
        volume: 0.7
      },
      'digit': {
        duration: 0.28,
        freqMultiplier: 1.05,
        volume: 0.95
      },
      'fkey': {
        duration: 0.25,
        freqMultiplier: 1.1,
        volume: 0.8
      }
    };

    return configs[keyType] || configs.key;
  }

  // Generate all sounds for a switch type
  generateAllSwitchSounds(switchType) {
    const keyTypes = ['key', 'spacebar', 'enter', 'backspace', 'shift', 'capslock', 'tab'];
    const sounds = {};
    
    keyTypes.forEach(keyType => {
      sounds[`${switchType}_${keyType}`] = this.generateSwitchSound(switchType, keyType);
    });
    
    return sounds;
  }

  // Clear cache to free memory
  clearCache() {
    this.cachedSounds.clear();
  }

  // Get memory usage
  getMemoryUsage() {
    let totalBytes = 0;
    
    this.cachedSounds.forEach(buffer => {
      totalBytes += buffer.length * buffer.numberOfChannels * 4; // 4 bytes per float32
    });
    
    return {
      cachedSounds: this.cachedSounds.size,
      memoryBytes: totalBytes,
      memoryMB: (totalBytes / (1024 * 1024)).toFixed(2)
    };
  }
}

// Export for global access
window.SoundGenerator = SoundGenerator;