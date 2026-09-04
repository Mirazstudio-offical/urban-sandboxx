/**
 * Procedural Web Audio API sound synthesizer for Top-Down City Simulator
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  
  // Engine audio nodes
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  
  // Screech audio nodes
  private screechGain: GainNode | null = null;
  private screechSource: AudioBufferSourceNode | null = null;
  
  // Horn nodes
  private hornGain: GainNode | null = null;
  private hornOsc1: OscillatorNode | null = null;
  private hornOsc2: OscillatorNode | null = null;

  private isEngineRunning: boolean = false;
  private isScreeching: boolean = false;
  private isHornPlaying: boolean = false;

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopEngine();
      this.stopTireScreech();
      this.stopHorn();
      this.updateOverheatingSteam(false, 0);
      this.updateWheelRubScrape(0, 0);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // --- ENGINE SOUND ---
  public startEngine() {
    if (!this.ctx || this.isMuted || this.isEngineRunning) return;
    try {
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();
      this.engineFilter = this.ctx.createBiquadFilter();

      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(320, this.ctx.currentTime);

      this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      this.engineOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc.start();
      this.isEngineRunning = true;
    } catch (e) {
      console.warn('Error starting engine audio', e);
    }
  }

  public updateEngine(speedRatio: number, isAccelerating: boolean) {
    if (!this.ctx || this.isMuted || !this.isEngineRunning || !this.engineOsc || !this.engineGain || !this.engineFilter) return;
    
    const now = this.ctx.currentTime;
    const baseFreq = 42 + Math.min(speedRatio, 1.2) * 140 + (isAccelerating ? 20 : 0);
    const cutoff = 280 + Math.min(speedRatio, 1.2) * 800 + (isAccelerating ? 250 : 0);
    const targetGain = 0.05 + Math.min(speedRatio, 1.0) * 0.10 + (isAccelerating ? 0.05 : 0);

    this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.08);
    this.engineFilter.frequency.setTargetAtTime(cutoff, now, 0.1);
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.1);
  }

  public stopEngine() {
    if (!this.isEngineRunning) return;
    try {
      if (this.engineOsc) {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
        this.engineOsc = null;
      }
      if (this.engineGain) {
        this.engineGain.disconnect();
        this.engineGain = null;
      }
      this.isEngineRunning = false;
    } catch {
      // Ignore
    }
  }

  // --- TIRE SCREECH SOUND (DRIFT / HARDBRAKE) ---
  public startTireScreech(intensity: number = 0.5) {
    if (!this.ctx || this.isMuted) return;
    if (this.isScreeching && this.screechGain) {
      this.screechGain.gain.setTargetAtTime(Math.min(intensity * 0.18, 0.2), this.ctx.currentTime, 0.05);
      return;
    }

    try {
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.8;
      }

      this.screechSource = this.ctx.createBufferSource();
      this.screechSource.buffer = buffer;
      this.screechSource.loop = true;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(1400, this.ctx.currentTime);
      bandpass.Q.setValueAtTime(4.0, this.ctx.currentTime);

      this.screechGain = this.ctx.createGain();
      this.screechGain.gain.setValueAtTime(Math.min(intensity * 0.16, 0.18), this.ctx.currentTime);

      this.screechSource.connect(bandpass);
      bandpass.connect(this.screechGain);
      this.screechGain.connect(this.ctx.destination);

      this.screechSource.start();
      this.isScreeching = true;
    } catch {
      // Ignore
    }
  }

  public stopTireScreech() {
    if (!this.isScreeching) return;
    try {
      if (this.screechGain && this.ctx) {
        this.screechGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      }
      setTimeout(() => {
        if (this.screechSource) {
          try {
            this.screechSource.stop();
            this.screechSource.disconnect();
          } catch {}
          this.screechSource = null;
        }
        this.isScreeching = false;
      }, 60);
    } catch {
      this.isScreeching = false;
    }
  }

  // --- CAR HORN ---
  public playHorn(carType?: string) {
    if (!this.ctx || this.isMuted || this.isHornPlaying) return;
    try {
      this.hornOsc1 = this.ctx.createOscillator();
      this.hornOsc2 = this.ctx.createOscillator();
      this.hornGain = this.ctx.createGain();

      this.hornOsc1.type = 'triangle';
      this.hornOsc1.frequency.setValueAtTime(435, this.ctx.currentTime);

      this.hornOsc2.type = 'triangle';
      this.hornOsc2.frequency.setValueAtTime(345, this.ctx.currentTime);

      this.hornGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

      this.hornOsc1.connect(this.hornGain);
      this.hornOsc2.connect(this.hornGain);
      this.hornGain.connect(this.ctx.destination);

      this.hornOsc1.start();
      this.hornOsc2.start();
      this.isHornPlaying = true;
    } catch {
      // Ignore
    }
  }

  public stopHorn() {
    if (!this.isHornPlaying || !this.ctx) return;
    try {
      if (this.hornGain) {
        this.hornGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
      }
      setTimeout(() => {
        if (this.hornOsc1) {
          try { this.hornOsc1.stop(); this.hornOsc1.disconnect(); } catch {}
          this.hornOsc1 = null;
        }
        if (this.hornOsc2) {
          try { this.hornOsc2.stop(); this.hornOsc2.disconnect(); } catch {}
          this.hornOsc2 = null;
        }
        this.isHornPlaying = false;
      }, 50);
    } catch {
      this.isHornPlaying = false;
    }
  }

  // --- CAR DOOR THUD ---
  public playCarDoor() {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'square';
      osc.frequency.setValueAtTime(90, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.12);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(250, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.14);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch {}
  }

  // --- CRASH / IMPACT THUD ---
  public playCollision(intensity: number = 0.5) {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(25, this.ctx.currentTime + 0.18);

      const vol = Math.min(0.08 + intensity * 0.25, 0.35);
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.22);
    } catch {}
  }

  // --- TURN SIGNAL RELAY TICK ---
  public playTurnSignalTick(isTick: boolean) {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(isTick ? 1200 : 900, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.035);
    } catch {}
  }

  // --- EMERGENCY POLICE / AMBULANCE SIREN ---
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private isSirenActive: boolean = false;
  private sirenPhase: number = 0;

  public startSiren() {
    if (!this.ctx || this.isMuted || this.isSirenActive) return;
    try {
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenGain = this.ctx.createGain();

      this.sirenOsc.type = 'sawtooth';
      this.sirenOsc.frequency.setValueAtTime(650, this.ctx.currentTime);

      this.sirenGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.ctx.destination);

      this.sirenOsc.start();
      this.isSirenActive = true;
    } catch {}
  }

  public updateSiren(dt: number) {
    if (!this.ctx || this.isMuted || !this.isSirenActive || !this.sirenOsc) return;
    this.sirenPhase += dt * 3.5;
    const freq = 600 + Math.sin(this.sirenPhase) * 350;
    this.sirenOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
  }

  public stopSiren() {
    if (!this.isSirenActive || !this.ctx) return;
    try {
      if (this.sirenGain) {
        this.sirenGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      }
      setTimeout(() => {
        if (this.sirenOsc) {
          try { this.sirenOsc.stop(); this.sirenOsc.disconnect(); } catch {}
          this.sirenOsc = null;
        }
        this.isSirenActive = false;
      }, 70);
    } catch {
      this.isSirenActive = false;
    }
  }

  public playHeartMonitorBeep() {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(920, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    } catch {}
  }

  // --- WEATHER RAIN & THUNDER AUDIO ---
  private rainNoiseSource: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;
  private isRainPlaying: boolean = false;

  public setRainAudio(active: boolean) {
    if (!this.ctx || this.isMuted) return;
    if (active && !this.isRainPlaying) {
      try {
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.3;
        }

        this.rainNoiseSource = this.ctx.createBufferSource();
        this.rainNoiseSource.buffer = buffer;
        this.rainNoiseSource.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.ctx.currentTime);

        this.rainGain = this.ctx.createGain();
        this.rainGain.gain.setValueAtTime(0.06, this.ctx.currentTime);

        this.rainNoiseSource.connect(filter);
        filter.connect(this.rainGain);
        this.rainGain.connect(this.ctx.destination);

        this.rainNoiseSource.start();
        this.isRainPlaying = true;
      } catch {}
    } else if (!active && this.isRainPlaying) {
      try {
        if (this.rainGain) {
          this.rainGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
        }
        setTimeout(() => {
          if (this.rainNoiseSource) {
            try { this.rainNoiseSource.stop(); this.rainNoiseSource.disconnect(); } catch {}
            this.rainNoiseSource = null;
          }
          this.isRainPlaying = false;
        }, 220);
      } catch {
        this.isRainPlaying = false;
      }
    }
  }

  public playThunder() {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(60, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(15, this.ctx.currentTime + 1.2);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(150, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 1.6);
    } catch {}
  }

  // --- HYDRANT WATER FOUNTAIN SPRAY ---
  public playWaterSpray() {
    if (!this.ctx || this.isMuted) return;
    try {
      const bufferSize = this.ctx.sampleRate * 0.4;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.4;
      }

      const src = this.ctx.createBufferSource();
      src.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.38);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      src.start();
    } catch {}
  }

  // --- PROP BREAK / SHATTER SOUND ---
  public playPropBreak(type: string) {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type === 'hydrant' || type === 'trash_can' || type === 'traffic_light' ? 'square' : 'triangle';
      osc.frequency.setValueAtTime(type === 'hydrant' ? 240 : (type === 'traffic_light' ? 180 : 380), this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.22, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);

      // Extra glass shatter crunch for traffic light lenses
      if (type === 'traffic_light') {
        const noise = this.ctx.createOscillator();
        const noiseGain = this.ctx.createGain();
        noise.type = 'sawtooth';
        noise.frequency.setValueAtTime(1400, this.ctx.currentTime);
        noise.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.1);
        noiseGain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
        noise.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start();
        noise.stop(this.ctx.currentTime + 0.15);
      }
    } catch {}
  }

  // --- BIRD FLAP ---
  public playBirdFlap() {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.07);
    } catch {}
  }

  // --- PEDESTRIAN ALERT CHIRP ---
  public playAlert() {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(820, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.13);
    } catch {}
  }

  // --- EATING SOUND ---
  public playEat() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(280 + Math.random() * 100, now + i * 0.08);
        osc.frequency.exponentialRampToValueAtTime(120, now + i * 0.08 + 0.06);

        gain.gain.setValueAtTime(0.12, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.07);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.08);
      }
    } catch {}
  }

  // --- DRINKING SOUND ---
  public playDrink() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      for (let i = 0; i < 2; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450 + i * 80, now + i * 0.14);
        osc.frequency.exponentialRampToValueAtTime(220, now + i * 0.14 + 0.1);

        gain.gain.setValueAtTime(0.15, now + i * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.14 + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.14);
        osc.stop(now + i * 0.14 + 0.13);
      }
    } catch {}
  }

  // --- ITEM USE / MEDKIT SOUND ---
  public playUseItem() {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(780, this.ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.14, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.26);
    } catch {}
  }

  // --- GEAR SHIFT SOUND ---
  public playGearShift() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      // Mechanical notch click
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.05);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);

      // Follow-up latch tap
      setTimeout(() => {
        if (!this.ctx || this.isMuted) return;
        try {
          const osc2 = this.ctx.createOscillator();
          const gain2 = this.ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(450, this.ctx.currentTime);
          osc2.frequency.exponentialRampToValueAtTime(160, this.ctx.currentTime + 0.04);
          gain2.gain.setValueAtTime(0.08, this.ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
          osc2.connect(gain2);
          gain2.connect(this.ctx.destination);
          osc2.start();
          osc2.stop(this.ctx.currentTime + 0.055);
        } catch {}
      }, 35);
    } catch {}
  }

  // --- ENGINE STALL SOUND ---
  public playEngineStall() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      // Low coughing chug sound
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.35);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);

      // Sputter shudder
      setTimeout(() => {
        if (!this.ctx || this.isMuted) return;
        try {
          const osc2 = this.ctx.createOscillator();
          const gain2 = this.ctx.createGain();
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(65, this.ctx.currentTime);
          osc2.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.22);
          gain2.gain.setValueAtTime(0.18, this.ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
          osc2.connect(gain2);
          gain2.connect(this.ctx.destination);
          osc2.start();
          osc2.stop(this.ctx.currentTime + 0.26);
        } catch {}
      }, 70);
    } catch {}
  }

  // --- PICKUP ITEM SOUND ---
  public playPickup() {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.11);
    } catch {}
  }

  // --- SLEEP / REST CHIME SOUND ---
  public playSleep() {
    if (!this.ctx || this.isMuted) return;
    try {
      const notes = [261.63, 329.63, 392.00, 523.25]; // C major chord
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.12);

        gain.gain.setValueAtTime(0.15, this.ctx!.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.12 + 1.2);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(this.ctx!.currentTime + idx * 0.12);
        osc.stop(this.ctx!.currentTime + idx * 0.12 + 1.3);
      });
    } catch {}
  }

  // --- PLAYER HURT SOUND ---
  public playHurt() {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.18);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.23);
    } catch {}
  }

  // --- TINNITUS (EAR RINGING) SOUND ---
  public playTinnitus(durationSec: number = 2.5) {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(3850, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + durationSec);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + durationSec);
    } catch {}
  }

  // --- COUGH SOUND (COLD/FLU) ---
  public playCough() {
    if (!this.ctx || this.isMuted) return;
    try {
      const bufferSize = this.ctx.sampleRate * 0.25;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450, this.ctx.currentTime);
      filter.Q.setValueAtTime(3.0, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.22);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start();
    } catch {}
  }

  // --- TEETH CHATTER / SHIVER SOUND (HYPOTHERMIA & COLD) ---
  public playShiver() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      // Fast rhythmic shudder/chattering pulses
      for (let i = 0; i < 4; i++) {
        const t = now + i * 0.08 + Math.random() * 0.015;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1300 + Math.random() * 300, t);
        osc.frequency.exponentialRampToValueAtTime(700, t + 0.025);

        filter.type = 'highpass';
        filter.frequency.setValueAtTime(650, t);

        gain.gain.setValueAtTime(0.09, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.03);
      }
    } catch {}
  }

  // --- BUTTON / HUD CLICK SOUND ---
  public playButtonPress() {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(450, this.ctx.currentTime + 0.035);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.035);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch {}
  }

  // --- PAIN GROAN SOUND ---
  public playGroan() {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(210, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(110, this.ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.38);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.4);
    } catch {}
  }

  // --- HEAVY BREATHING SOUND (DEHYDRATION/EXHAUSTION) ---
  public playHeavyBreathing() {
    if (!this.ctx || this.isMuted) return;
    try {
      const bufferSize = this.ctx.sampleRate * 0.45;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, this.ctx.currentTime);
      filter.frequency.linearRampToValueAtTime(600, this.ctx.currentTime + 0.2);
      filter.frequency.linearRampToValueAtTime(250, this.ctx.currentTime + 0.45);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 0.2);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start();
    } catch {}
  }

  // --- BREAKDOWN & DAMAGE PROCEDURAL SOUND SYNTHESIS ---

  // 1. ENGINE KNOCKING (Metallic dull knock synchronized with engineRPM)
  private knockTimer: number = 0;

  public updateEngineKnocking(active: boolean, engineRPM: number = 1000, dt: number = 0.016) {
    if (!this.ctx || this.isMuted || !active || engineRPM <= 0) return;
    
    // Knock frequency scaled with RPM (~4-stroke cylinder firing rate)
    const knocksPerSec = Math.max(6, Math.min(45, (engineRPM / 60) * 0.8));
    const interval = 1 / knocksPerSec;
    
    this.knockTimer += dt;
    if (this.knockTimer >= interval) {
      this.knockTimer %= interval;
      this.playEngineKnock(engineRPM);
    }
  }

  public playEngineKnock(engineRPM: number = 1000) {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Short triangle impulse with fast pitch drop & exponential gain decay
      osc.type = 'triangle';
      const basePitch = 180 + Math.min(250, (engineRPM / 6000) * 200);
      osc.frequency.setValueAtTime(basePitch, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.03);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(750, now);
      filter.Q.setValueAtTime(2.5, now);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {}
  }

  // 2. OVERHEATING STEAM (Bandpass White Noise with smooth volume modulation)
  private steamNoiseSource: AudioBufferSourceNode | null = null;
  private steamFilter: BiquadFilterNode | null = null;
  private steamGain: GainNode | null = null;
  private isSteamPlaying: boolean = false;

  public updateOverheatingSteam(active: boolean, intensity: number = 0.5) {
    if (!this.ctx || this.isMuted) return;

    if (active) {
      const targetGain = Math.min(0.25, Math.max(0.03, intensity * 0.22));
      const targetFreq = 1800 + Math.min(800, intensity * 1000);

      if (!this.isSteamPlaying) {
        try {
          const bufferSize = this.ctx.sampleRate * 2;
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.7;
          }

          this.steamNoiseSource = this.ctx.createBufferSource();
          this.steamNoiseSource.buffer = buffer;
          this.steamNoiseSource.loop = true;

          this.steamFilter = this.ctx.createBiquadFilter();
          this.steamFilter.type = 'bandpass';
          this.steamFilter.frequency.setValueAtTime(targetFreq, this.ctx.currentTime);
          this.steamFilter.Q.setValueAtTime(2.8, this.ctx.currentTime);

          this.steamGain = this.ctx.createGain();
          this.steamGain.gain.setValueAtTime(targetGain, this.ctx.currentTime);

          this.steamNoiseSource.connect(this.steamFilter);
          this.steamFilter.connect(this.steamGain);
          this.steamGain.connect(this.ctx.destination);

          this.steamNoiseSource.start();
          this.isSteamPlaying = true;
        } catch {}
      } else {
        const now = this.ctx.currentTime;
        if (this.steamGain) this.steamGain.gain.setTargetAtTime(targetGain, now, 0.1);
        if (this.steamFilter) this.steamFilter.frequency.setTargetAtTime(targetFreq, now, 0.1);
      }
    } else if (this.isSteamPlaying) {
      try {
        if (this.steamGain) {
          this.steamGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.12);
        }
        setTimeout(() => {
          if (this.steamNoiseSource) {
            try { this.steamNoiseSource.stop(); this.steamNoiseSource.disconnect(); } catch {}
            this.steamNoiseSource = null;
          }
          this.isSteamPlaying = false;
        }, 150);
      } catch {
        this.isSteamPlaying = false;
      }
    }
  }

  // 3. EXHAUST BACKFIRE / DETONATION (Sharp dry backfire pop with low-freq impulse + waveShaper overdrive)
  private distortionCurve: Float32Array | null = null;

  private getDistortionCurve(): Float32Array {
    if (this.distortionCurve) return this.distortionCurve;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const k = 50; // overdrive amount
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    this.distortionCurve = curve;
    return curve;
  }

  public playDetonation() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;

      // Low frequency explosive pulse
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.06);

      // Waveshaper distortion for raw dry backfire crunch
      const waveShaper = this.ctx.createWaveShaper();
      waveShaper.curve = this.getDistortionCurve() as Float32Array<ArrayBuffer>;
      waveShaper.oversample = '4x';

      // Short noise burst for backfire crackle
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
      }
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.setValueAtTime(800, now);

      const mainGain = this.ctx.createGain();
      mainGain.gain.setValueAtTime(0.35, now);
      mainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(waveShaper);
      waveShaper.connect(mainGain);
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(mainGain);

      mainGain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
      noiseSource.start(now);
    } catch {}
  }

  // 4. SCRAPING OF CRUMPLED FENDER AGAINST WHEEL (wheelRubResistance > 0 & speed > 5)
  private rubNoiseSource: AudioBufferSourceNode | null = null;
  private rubFilter: BiquadFilterNode | null = null;
  private rubGain: GainNode | null = null;
  private isRubPlaying: boolean = false;

  public updateWheelRubScrape(rubResistance: number, speed: number) {
    if (!this.ctx || this.isMuted) return;

    const absSpeed = Math.abs(speed);
    const active = rubResistance > 0 && absSpeed > 5;

    if (active) {
      const speedFactor = Math.min(1.0, absSpeed / 120);
      const resistanceFactor = Math.min(1.0, rubResistance / 40);
      const targetGain = Math.min(0.22, 0.04 + speedFactor * resistanceFactor * 0.18);
      const targetFreq = 2200 + speedFactor * 1800;

      if (!this.isRubPlaying) {
        try {
          const bufferSize = this.ctx.sampleRate * 2;
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.8;
          }

          this.rubNoiseSource = this.ctx.createBufferSource();
          this.rubNoiseSource.buffer = buffer;
          this.rubNoiseSource.loop = true;

          this.rubFilter = this.ctx.createBiquadFilter();
          this.rubFilter.type = 'bandpass';
          this.rubFilter.frequency.setValueAtTime(targetFreq, this.ctx.currentTime);
          this.rubFilter.Q.setValueAtTime(4.5, this.ctx.currentTime);

          this.rubGain = this.ctx.createGain();
          this.rubGain.gain.setValueAtTime(targetGain, this.ctx.currentTime);

          this.rubNoiseSource.connect(this.rubFilter);
          this.rubFilter.connect(this.rubGain);
          this.rubGain.connect(this.ctx.destination);

          this.rubNoiseSource.start();
          this.isRubPlaying = true;
        } catch {}
      } else {
        const now = this.ctx.currentTime;
        if (this.rubGain) this.rubGain.gain.setTargetAtTime(targetGain, now, 0.08);
        if (this.rubFilter) this.rubFilter.frequency.setTargetAtTime(targetFreq, now, 0.08);
      }
    } else if (this.isRubPlaying) {
      try {
        if (this.rubGain) {
          this.rubGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.06);
        }
        setTimeout(() => {
          if (this.rubNoiseSource) {
            try { this.rubNoiseSource.stop(); this.rubNoiseSource.disconnect(); } catch {}
            this.rubNoiseSource = null;
          }
          this.isRubPlaying = false;
        }, 80);
      } catch {
        this.isRubPlaying = false;
      }
    }
  }

  // 5. ROARING ENGINE FIRE SOUND (Low-pass filtered white noise + crackling low oscillator)
  private fireNoiseSource: AudioBufferSourceNode | null = null;
  private fireFilter: BiquadFilterNode | null = null;
  private fireGain: GainNode | null = null;
  private isFirePlaying: boolean = false;

  public updateEngineFireSound(active: boolean, intensity: number = 1.0) {
    if (!this.ctx || this.isMuted) return;

    if (active) {
      const normIntensity = Math.min(1.0, Math.max(0.1, intensity));
      const targetGain = 0.15 + normIntensity * 0.35;
      const targetFreq = 450 + normIntensity * 850;

      if (!this.isFirePlaying) {
        try {
          const bufferSize = this.ctx.sampleRate * 2;
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.9;
          }

          this.fireNoiseSource = this.ctx.createBufferSource();
          this.fireNoiseSource.buffer = buffer;
          this.fireNoiseSource.loop = true;

          this.fireFilter = this.ctx.createBiquadFilter();
          this.fireFilter.type = 'lowpass';
          this.fireFilter.frequency.setValueAtTime(targetFreq, this.ctx.currentTime);
          this.fireFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

          this.fireGain = this.ctx.createGain();
          this.fireGain.gain.setValueAtTime(targetGain, this.ctx.currentTime);

          this.fireNoiseSource.connect(this.fireFilter);
          this.fireFilter.connect(this.fireGain);
          this.fireGain.connect(this.ctx.destination);

          this.fireNoiseSource.start();
          this.isFirePlaying = true;
        } catch {}
      } else {
        if (this.fireFilter && this.fireGain) {
          this.fireFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
          this.fireGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
        }
      }
    } else if (this.isFirePlaying) {
      try {
        if (this.fireGain) {
          this.fireGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
        }
        setTimeout(() => {
          if (this.fireNoiseSource) {
            try { this.fireNoiseSource.stop(); this.fireNoiseSource.disconnect(); } catch {}
            this.fireNoiseSource = null;
          }
          this.isFirePlaying = false;
        }, 250);
      } catch {
        this.isFirePlaying = false;
      }
    }
  }
}


export const sound = new SoundEngine();
