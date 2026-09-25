/**
 * Procedural Web Audio API sound synthesizer for Top-Down City Simulator
 * Multi-layered realistic synthesis engine for vehicles, environment, and actions.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  
  // Engine audio nodes (Multi-layered engine)
  private engineSubOsc: OscillatorNode | null = null;
  private engineHarmonicOsc: OscillatorNode | null = null;
  private engineNoiseSource: AudioBufferSourceNode | null = null;
  private engineTurboOsc: OscillatorNode | null = null;

  private engineSubGain: GainNode | null = null;
  private engineHarmonicGain: GainNode | null = null;
  private engineNoiseGain: GainNode | null = null;
  private engineTurboGain: GainNode | null = null;

  private engineFilter: BiquadFilterNode | null = null;
  private engineMasterGain: GainNode | null = null;
  
  // Screech audio nodes
  private screechGain: GainNode | null = null;
  private screechSource: AudioBufferSourceNode | null = null;
  private screechWhistle: OscillatorNode | null = null;
  private screechLfo: OscillatorNode | null = null;
  
  // Horn nodes
  private hornGain: GainNode | null = null;
  private hornOsc1: OscillatorNode | null = null;
  private hornOsc2: OscillatorNode | null = null;
  private hornOsc3: OscillatorNode | null = null;

  private isEngineRunning: boolean = false;
  private isScreeching: boolean = false;
  private isHornPlaying: boolean = false;

  private distortionCurve: Float32Array | null = null;

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
      this.updateEngineFireSound(false, 0);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private getDistortionCurve(): Float32Array {
    if (this.distortionCurve) return this.distortionCurve;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const k = 45; // overdrive amount
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    this.distortionCurve = curve;
    return curve;
  }

  // --- MULTI-LAYERED ENGINE SOUND ---
  public startEngine() {
    if (!this.ctx || this.isMuted || this.isEngineRunning) return;
    try {
      const now = this.ctx.currentTime;

      // Master engine bus
      this.engineMasterGain = this.ctx.createGain();
      this.engineMasterGain.gain.setValueAtTime(0.22, now);

      // Lowpass cabinet filter for deep body exhaust resonance
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(320, now);
      this.engineFilter.Q.setValueAtTime(2.0, now);

      // Layer 1: Sub Piston Pulse (Low frequency square/saw pulse)
      this.engineSubOsc = this.ctx.createOscillator();
      this.engineSubOsc.type = 'sawtooth';
      this.engineSubOsc.frequency.setValueAtTime(28, now);

      this.engineSubGain = this.ctx.createGain();
      this.engineSubGain.gain.setValueAtTime(0.35, now);

      // Layer 2: Harmonic Combustion Growl (Sawtooth with waveshaper overdrive)
      this.engineHarmonicOsc = this.ctx.createOscillator();
      this.engineHarmonicOsc.type = 'triangle';
      this.engineHarmonicOsc.frequency.setValueAtTime(56, now);

      this.engineHarmonicGain = this.ctx.createGain();
      this.engineHarmonicGain.gain.setValueAtTime(0.25, now);

      // Layer 3: Mechanical Valve / Exhaust Noise (Looping noise buffer)
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.3;
      }
      this.engineNoiseSource = this.ctx.createBufferSource();
      this.engineNoiseSource.buffer = buffer;
      this.engineNoiseSource.loop = true;

      this.engineNoiseGain = this.ctx.createGain();
      this.engineNoiseGain.gain.setValueAtTime(0.08, now);

      // Layer 4: Turbocharger / Intake Whine
      this.engineTurboOsc = this.ctx.createOscillator();
      this.engineTurboOsc.type = 'sine';
      this.engineTurboOsc.frequency.setValueAtTime(800, now);

      this.engineTurboGain = this.ctx.createGain();
      this.engineTurboGain.gain.setValueAtTime(0.001, now);

      // Connect sub & harmonic to main filter
      this.engineSubOsc.connect(this.engineSubGain);
      this.engineSubGain.connect(this.engineFilter);

      this.engineHarmonicOsc.connect(this.engineHarmonicGain);
      this.engineHarmonicGain.connect(this.engineFilter);

      this.engineNoiseSource.connect(this.engineNoiseGain);
      this.engineNoiseGain.connect(this.engineFilter);

      this.engineTurboOsc.connect(this.engineTurboGain);
      this.engineTurboGain.connect(this.engineMasterGain);

      this.engineFilter.connect(this.engineMasterGain);
      this.engineMasterGain.connect(this.ctx.destination);

      this.engineSubOsc.start(now);
      this.engineHarmonicOsc.start(now);
      this.engineNoiseSource.start(now);
      this.engineTurboOsc.start(now);

      this.isEngineRunning = true;
    } catch (e) {
      console.warn('Error starting multi-layer engine audio', e);
    }
  }

  public updateEngine(speedRatio: number, isAccelerating: boolean) {
    if (!this.ctx || this.isMuted || !this.isEngineRunning) return;
    
    const now = this.ctx.currentTime;
    const normSpeed = Math.max(0, Math.min(speedRatio, 1.3));
    
    // Pitch scaling
    const subFreq = 26 + normSpeed * 120 + (isAccelerating ? 22 : 0);
    const harmFreq = subFreq * 2.1;
    const cutoff = 280 + normSpeed * 1100 + (isAccelerating ? 350 : 0);
    const turboFreq = 1200 + normSpeed * 2800 + (isAccelerating ? 600 : 0);

    // Dynamic gains
    const masterVol = 0.16 + normSpeed * 0.12 + (isAccelerating ? 0.05 : 0);
    const turboVol = isAccelerating && normSpeed > 0.15 ? Math.min(0.06, (normSpeed - 0.1) * 0.08) : 0.0001;

    if (this.engineSubOsc) this.engineSubOsc.frequency.setTargetAtTime(subFreq, now, 0.07);
    if (this.engineHarmonicOsc) this.engineHarmonicOsc.frequency.setTargetAtTime(harmFreq, now, 0.07);
    if (this.engineFilter) this.engineFilter.frequency.setTargetAtTime(cutoff, now, 0.08);
    if (this.engineTurboOsc) this.engineTurboOsc.frequency.setTargetAtTime(turboFreq, now, 0.09);
    if (this.engineTurboGain) this.engineTurboGain.gain.setTargetAtTime(turboVol, now, 0.1);
    if (this.engineMasterGain) this.engineMasterGain.gain.setTargetAtTime(masterVol, now, 0.08);
  }

  public stopEngine() {
    if (!this.isEngineRunning) return;
    try {
      const now = this.ctx ? this.ctx.currentTime : 0;
      if (this.engineMasterGain && this.ctx) {
        this.engineMasterGain.gain.setTargetAtTime(0, now, 0.08);
      }
      setTimeout(() => {
        if (this.engineSubOsc) { try { this.engineSubOsc.stop(); this.engineSubOsc.disconnect(); } catch {} this.engineSubOsc = null; }
        if (this.engineHarmonicOsc) { try { this.engineHarmonicOsc.stop(); this.engineHarmonicOsc.disconnect(); } catch {} this.engineHarmonicOsc = null; }
        if (this.engineNoiseSource) { try { this.engineNoiseSource.stop(); this.engineNoiseSource.disconnect(); } catch {} this.engineNoiseSource = null; }
        if (this.engineTurboOsc) { try { this.engineTurboOsc.stop(); this.engineTurboOsc.disconnect(); } catch {} this.engineTurboOsc = null; }
        if (this.engineMasterGain) { try { this.engineMasterGain.disconnect(); } catch {} this.engineMasterGain = null; }
        this.isEngineRunning = false;
      }, 90);
    } catch {
      this.isEngineRunning = false;
    }
  }

  // --- MULTI-LAYERED TIRE SCREECH SOUND (DRIFT / HARDBRAKE) ---
  public startTireScreech(intensity: number = 0.5) {
    if (!this.ctx || this.isMuted) return;
    
    const targetVol = Math.min(intensity * 0.18, 0.22);
    if (this.isScreeching && this.screechGain) {
      this.screechGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.05);
      return;
    }

    try {
      const now = this.ctx.currentTime;
      // 1. Friction noise layer
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
      bandpass.frequency.setValueAtTime(1450, now);
      bandpass.Q.setValueAtTime(4.5, now);

      // 2. High-pitched tread squeal oscillator with vibrato LFO
      this.screechWhistle = this.ctx.createOscillator();
      this.screechWhistle.type = 'sawtooth';
      this.screechWhistle.frequency.setValueAtTime(1850, now);

      this.screechLfo = this.ctx.createOscillator();
      this.screechLfo.frequency.setValueAtTime(22, now); // Fast squeal vibrato
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(65, now);

      this.screechLfo.connect(lfoGain);
      lfoGain.connect(this.screechWhistle.frequency);

      const whistleFilter = this.ctx.createBiquadFilter();
      whistleFilter.type = 'bandpass';
      whistleFilter.frequency.setValueAtTime(1850, now);
      whistleFilter.Q.setValueAtTime(6.0, now);

      const whistleGain = this.ctx.createGain();
      whistleGain.gain.setValueAtTime(0.05, now);

      this.screechWhistle.connect(whistleFilter);
      whistleFilter.connect(whistleGain);

      // Master screech gain
      this.screechGain = this.ctx.createGain();
      this.screechGain.gain.setValueAtTime(targetVol, now);

      this.screechSource.connect(bandpass);
      bandpass.connect(this.screechGain);
      whistleGain.connect(this.screechGain);

      this.screechGain.connect(this.ctx.destination);

      this.screechSource.start(now);
      this.screechWhistle.start(now);
      this.screechLfo.start(now);

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
        if (this.screechSource) { try { this.screechSource.stop(); this.screechSource.disconnect(); } catch {} this.screechSource = null; }
        if (this.screechWhistle) { try { this.screechWhistle.stop(); this.screechWhistle.disconnect(); } catch {} this.screechWhistle = null; }
        if (this.screechLfo) { try { this.screechLfo.stop(); this.screechLfo.disconnect(); } catch {} this.screechLfo = null; }
        this.isScreeching = false;
      }, 60);
    } catch {
      this.isScreeching = false;
    }
  }

  // --- MULTI-TONE REALISTIC BRASS HORN ---
  public playHorn(carType?: string) {
    if (!this.ctx || this.isMuted || this.isHornPlaying) return;
    try {
      const now = this.ctx.currentTime;

      const isTruckHorn = carType ? (carType === 'truck' || carType.startsWith('truck') || carType.startsWith('tractor') || ['bus', 'cement_mixer', 'garbage_truck', 'pickup_heavy', 'fire_engine'].includes(carType)) : false;

      // Pitch definitions (High-low dual pneumatic horn + upper harmonic)
      const f1 = isTruckHorn ? 220 : 435;
      const f2 = isTruckHorn ? 175 : 345;
      const f3 = isTruckHorn ? 290 : 520;

      this.hornOsc1 = this.ctx.createOscillator();
      this.hornOsc2 = this.ctx.createOscillator();
      this.hornOsc3 = this.ctx.createOscillator();

      this.hornOsc1.type = 'sawtooth';
      this.hornOsc2.type = 'triangle';
      this.hornOsc3.type = 'sawtooth';

      // Slight initial pitch bend attack
      this.hornOsc1.frequency.setValueAtTime(f1 - 15, now);
      this.hornOsc1.frequency.exponentialRampToValueAtTime(f1, now + 0.04);

      this.hornOsc2.frequency.setValueAtTime(f2 - 12, now);
      this.hornOsc2.frequency.exponentialRampToValueAtTime(f2, now + 0.04);

      this.hornOsc3.frequency.setValueAtTime(f3 - 18, now);
      this.hornOsc3.frequency.exponentialRampToValueAtTime(f3, now + 0.04);

      const hornFilter = this.ctx.createBiquadFilter();
      hornFilter.type = 'lowpass';
      hornFilter.frequency.setValueAtTime(carType === 'truck' ? 850 : 1600, now);

      this.hornGain = this.ctx.createGain();
      this.hornGain.gain.setValueAtTime(0.22, now);

      this.hornOsc1.connect(hornFilter);
      this.hornOsc2.connect(hornFilter);
      this.hornOsc3.connect(hornFilter);

      hornFilter.connect(this.hornGain);
      this.hornGain.connect(this.ctx.destination);

      this.hornOsc1.start(now);
      this.hornOsc2.start(now);
      this.hornOsc3.start(now);
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
        if (this.hornOsc1) { try { this.hornOsc1.stop(); this.hornOsc1.disconnect(); } catch {} this.hornOsc1 = null; }
        if (this.hornOsc2) { try { this.hornOsc2.stop(); this.hornOsc2.disconnect(); } catch {} this.hornOsc2 = null; }
        if (this.hornOsc3) { try { this.hornOsc3.stop(); this.hornOsc3.disconnect(); } catch {} this.hornOsc3 = null; }
        this.isHornPlaying = false;
      }, 50);
    } catch {
      this.isHornPlaying = false;
    }
  }

  // --- MULTI-LAYERED CAR DOOR THUD ---
  public playCarDoor() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;

      // Layer 1: Metal handle latch click
      const latchOsc = this.ctx.createOscillator();
      const latchGain = this.ctx.createGain();
      latchOsc.type = 'sine';
      latchOsc.frequency.setValueAtTime(1400, now);
      latchOsc.frequency.exponentialRampToValueAtTime(400, now + 0.02);

      latchGain.gain.setValueAtTime(0.22, now);
      latchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      latchOsc.connect(latchGain);
      latchGain.connect(this.ctx.destination);
      latchOsc.start(now);
      latchOsc.stop(now + 0.03);

      // Layer 2: Hollow door panel resonance
      const panelOsc = this.ctx.createOscillator();
      const panelGain = this.ctx.createGain();
      const panelFilter = this.ctx.createBiquadFilter();

      panelOsc.type = 'triangle';
      panelOsc.frequency.setValueAtTime(160, now + 0.01);
      panelOsc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

      panelFilter.type = 'lowpass';
      panelFilter.frequency.setValueAtTime(260, now);

      panelGain.gain.setValueAtTime(0.35, now + 0.01);
      panelGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

      panelOsc.connect(panelFilter);
      panelFilter.connect(panelGain);
      panelGain.connect(this.ctx.destination);
      panelOsc.start(now + 0.01);
      panelOsc.stop(now + 0.14);

      // Layer 3: Solid rubber seal sub-thud
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(85, now + 0.015);
      subOsc.frequency.exponentialRampToValueAtTime(22, now + 0.14);

      subGain.gain.setValueAtTime(0.4, now + 0.015);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(now + 0.015);
      subOsc.stop(now + 0.16);
    } catch {}
  }

  // --- MULTI-LAYERED CRASH / IMPACT THUD ---
  public playCollision(intensity: number = 0.5) {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const normIntensity = Math.min(1.0, Math.max(0.1, intensity));

      // Layer 1: Sub-bass body impact
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(180, now);
      subOsc.frequency.exponentialRampToValueAtTime(20, now + 0.22);

      const subVol = 0.12 + normIntensity * 0.35;
      subGain.gain.setValueAtTime(subVol, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.26);

      // Layer 2: Sheet metal crunch (Distorted Noise Burst)
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.2);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const crunchSource = this.ctx.createBufferSource();
      crunchSource.buffer = buffer;

      const crunchFilter = this.ctx.createBiquadFilter();
      crunchFilter.type = 'bandpass';
      crunchFilter.frequency.setValueAtTime(750 + normIntensity * 400, now);
      crunchFilter.Q.setValueAtTime(2.0, now);

      const crunchGain = this.ctx.createGain();
      crunchGain.gain.setValueAtTime(0.1 + normIntensity * 0.3, now);
      crunchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      crunchSource.connect(crunchFilter);
      crunchFilter.connect(crunchGain);
      crunchGain.connect(this.ctx.destination);
      crunchSource.start(now);

      // Layer 3: Glass / debris high crackle (for strong hits)
      if (normIntensity > 0.4) {
        const glassOsc = this.ctx.createOscillator();
        const glassGain = this.ctx.createGain();
        glassOsc.type = 'sawtooth';
        glassOsc.frequency.setValueAtTime(2200, now);
        glassOsc.frequency.exponentialRampToValueAtTime(600, now + 0.15);

        glassGain.gain.setValueAtTime(0.12 * normIntensity, now);
        glassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        glassOsc.connect(glassGain);
        glassGain.connect(this.ctx.destination);
        glassOsc.start(now);
        glassOsc.stop(now + 0.18);
      }
    } catch {}
  }

  // --- TURN SIGNAL RELAY TICK ---
  public playTurnSignalTick(isTick: boolean) {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isTick ? 1250 : 920, now);
      osc.frequency.exponentialRampToValueAtTime(isTick ? 600 : 450, now + 0.025);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.03);
    } catch {}
  }

  // --- EMERGENCY POLICE / AMBULANCE SIREN ---
  private sirenOsc: OscillatorNode | null = null;
  private sirenOsc2: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private isSirenActive: boolean = false;
  private sirenPhase: number = 0;

  public startSiren() {
    if (!this.ctx || this.isMuted || this.isSirenActive) return;
    try {
      const now = this.ctx.currentTime;
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc2 = this.ctx.createOscillator();
      this.sirenGain = this.ctx.createGain();

      this.sirenOsc.type = 'sawtooth';
      this.sirenOsc.frequency.setValueAtTime(650, now);

      this.sirenOsc2.type = 'triangle';
      this.sirenOsc2.frequency.setValueAtTime(1300, now);

      this.sirenGain.gain.setValueAtTime(0.14, now);

      this.sirenOsc.connect(this.sirenGain);
      this.sirenOsc2.connect(this.sirenGain);
      this.sirenGain.connect(this.ctx.destination);

      this.sirenOsc.start(now);
      this.sirenOsc2.start(now);
      this.isSirenActive = true;
    } catch {}
  }

  public updateSiren(dt: number) {
    if (!this.ctx || this.isMuted || !this.isSirenActive || !this.sirenOsc) return;
    this.sirenPhase += dt * 3.8;
    const freq = 620 + Math.sin(this.sirenPhase) * 380;
    this.sirenOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.04);
    if (this.sirenOsc2) this.sirenOsc2.frequency.setTargetAtTime(freq * 2, this.ctx.currentTime, 0.04);
  }

  public stopSiren() {
    if (!this.isSirenActive || !this.ctx) return;
    try {
      if (this.sirenGain) {
        this.sirenGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      }
      setTimeout(() => {
        if (this.sirenOsc) { try { this.sirenOsc.stop(); this.sirenOsc.disconnect(); } catch {} this.sirenOsc = null; }
        if (this.sirenOsc2) { try { this.sirenOsc2.stop(); this.sirenOsc2.disconnect(); } catch {} this.sirenOsc2 = null; }
        this.isSirenActive = false;
      }, 70);
    } catch {
      this.isSirenActive = false;
    }
  }

  public playHeartMonitorBeep() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(940, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.095);
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
        filter.frequency.setValueAtTime(1100, this.ctx.currentTime);

        this.rainGain = this.ctx.createGain();
        this.rainGain.gain.setValueAtTime(0.07, this.ctx.currentTime);

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
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(65, now);
      osc.frequency.exponentialRampToValueAtTime(15, now + 1.3);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(160, now);

      gain.gain.setValueAtTime(0.38, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 1.7);
    } catch {}
  }

  // --- HYDRANT WATER FOUNTAIN SPRAY ---
  public playWaterSpray() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.4);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.4;
      }

      const src = this.ctx.createBufferSource();
      src.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      src.start(now);
    } catch {}
  }

  // --- PROP BREAK / SHATTER SOUND ---
  public playPropBreak(type: string) {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const isMetal = type === 'hydrant' || type === 'trash_can' || type === 'dumpster' || type === 'bollard' || type === 'lamp_highway';
      const isGlass = type === 'bus_stop' || type === 'traffic_light' || type === 'lamp' || type === 'kiosk';
      const isWood = type === 'bench';

      osc.type = isMetal ? 'square' : (isWood ? 'sawtooth' : 'triangle');
      const startFreq = isMetal ? 290 : (isWood ? 170 : 440);
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.18);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);

      if (isGlass) {
        const noise = this.ctx.createOscillator();
        const noiseGain = this.ctx.createGain();
        noise.type = 'sawtooth';
        noise.frequency.setValueAtTime(1700, now);
        noise.frequency.exponentialRampToValueAtTime(450, now + 0.16);
        noiseGain.gain.setValueAtTime(0.18, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        noise.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start(now);
        noise.stop(now + 0.2);
      }
    } catch {}
  }

  // --- MANHOLE COVER RUMBLE / CLANK ---
  public playManholeClank() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(125, now);
      osc.frequency.exponentialRampToValueAtTime(48, now + 0.08);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {}
  }

  // --- BIRD FLAP ---
  public playBirdFlap() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch {}
  }

  // --- PEDESTRIAN ALERT CHIRP ---
  public playAlert() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.linearRampToValueAtTime(820, now + 0.08);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
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
        osc.frequency.setValueAtTime(290 + Math.random() * 100, now + i * 0.08);
        osc.frequency.exponentialRampToValueAtTime(120, now + i * 0.08 + 0.06);

        gain.gain.setValueAtTime(0.14, now + i * 0.08);
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
        osc.frequency.setValueAtTime(460 + i * 85, now + i * 0.14);
        osc.frequency.exponentialRampToValueAtTime(220, now + i * 0.14 + 0.1);

        gain.gain.setValueAtTime(0.16, now + i * 0.14);
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
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.linearRampToValueAtTime(780, now + 0.15);

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    } catch {}
  }

  // --- CASH REGISTER / PAYMENT SOUND ---
  public playBuySell() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      // High-pitched register bell + coin chime
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(987.77, now); // B5
      osc1.frequency.setValueAtTime(1318.51, now + 0.08); // E6

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1975.53, now); // B6

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.42);
      osc2.stop(now + 0.42);
    } catch {}
  }

  // --- TACTILE GEAR SHIFT SOUND ---
  public playGearShift() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      // Mechanical notch click
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(85, now + 0.05);

      gain.gain.setValueAtTime(0.15, now);
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
          osc2.frequency.setValueAtTime(480, this.ctx.currentTime);
          osc2.frequency.exponentialRampToValueAtTime(170, this.ctx.currentTime + 0.04);
          gain2.gain.setValueAtTime(0.09, this.ctx.currentTime);
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
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(115, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);

      setTimeout(() => {
        if (!this.ctx || this.isMuted) return;
        try {
          const osc2 = this.ctx.createOscillator();
          const gain2 = this.ctx.createGain();
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(70, this.ctx.currentTime);
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

  // --- PICKUP ITEM SOUND (3-note pleasant chime) ---
  public playPickup() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const freqs = [698.46, 880.00, 1046.50]; // F5 -> A5 -> C6
      freqs.forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.04);

        gain.gain.setValueAtTime(0.12, now + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + i * 0.04);
        osc.stop(now + i * 0.04 + 0.13);
      });
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
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(170, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.18);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.23);
    } catch {}
  }

  // --- TINNITUS (EAR RINGING) SOUND ---
  public playTinnitus(durationSec: number = 2.5) {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(3850, now);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + durationSec);
    } catch {}
  }

  // --- COUGH SOUND ---
  public playCough() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.25);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450, now);
      filter.Q.setValueAtTime(3.0, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start(now);
    } catch {}
  }

  // --- TEETH CHATTER / SHIVER SOUND ---
  public playShiver() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
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

  // --- TACTILE BUTTON / HUD CLICK ---
  public playButtonPress() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(850, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.035);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch {}
  }

  // --- PAIN GROAN SOUND ---
  public playGroan() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(210, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.35);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch {}
  }

  // --- HEAVY BREATHING SOUND ---
  public playHeavyBreathing() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.45);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, now);
      filter.frequency.linearRampToValueAtTime(600, now + 0.2);
      filter.frequency.linearRampToValueAtTime(250, now + 0.45);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.2);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.45);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
    } catch {}
  }

  // --- BREAKDOWN & DAMAGE PROCEDURAL SOUND SYNTHESIS ---

  // 1. ENGINE KNOCKING
  private knockTimer: number = 0;

  public updateEngineKnocking(active: boolean, engineRPM: number = 1000, dt: number = 0.016) {
    if (!this.ctx || this.isMuted || !active || engineRPM <= 0) return;
    
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

  // 2. OVERHEATING STEAM
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

  // 3. EXHAUST BACKFIRE / DETONATION
  public playDetonation() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.06);

      const waveShaper = this.ctx.createWaveShaper();
      waveShaper.curve = this.getDistortionCurve() as Float32Array<ArrayBuffer>;
      waveShaper.oversample = '4x';

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

  // 3.5 CATASTROPHIC DIESEL RUNAWAY ENGINE EXPLOSION ("КУЛАК ДРУЖБЫ")
  public playEngineExplosion() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;

      // Deep explosive sub-bass punch (low impact boom)
      const subOsc = this.ctx.createOscillator();
      subOsc.type = 'sawtooth';
      subOsc.frequency.setValueAtTime(140, now);
      subOsc.frequency.exponentialRampToValueAtTime(18, now + 0.7);

      const subFilter = this.ctx.createBiquadFilter();
      subFilter.type = 'lowpass';
      subFilter.frequency.setValueAtTime(450, now);
      subFilter.frequency.exponentialRampToValueAtTime(60, now + 0.7);

      const subGain = this.ctx.createGain();
      subGain.gain.setValueAtTime(1.0, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      subOsc.connect(subFilter);
      subFilter.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.7);

      // High metallic explosion crackle & shrapnel blast
      const bufSize = Math.floor(this.ctx.sampleRate * 0.5);
      const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.15));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buf;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(1800, now);
      noiseFilter.Q.setValueAtTime(1.2, now);

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.9, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      noise.connect(noiseFilter);
      noiseFilter.connect(nGain);
      nGain.connect(this.ctx.destination);
      noise.start(now);
    } catch {}
  }

  // 4. SCRAPING OF FENDER AGAINST WHEEL
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

  // 5. ROARING ENGINE FIRE SOUND
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

  public click() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.03);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.035);
    } catch {}
  }

  // --- SMARTPHONE SOUND EFFECTS ---
  public playPhoneChime() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      // Dual-tone harmonic glass chime (e.g. C6 -> G6)
      const freqs = [1046.5, 1567.98];
      freqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(0.08, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.26);
      });
    } catch {}
  }

  public playPhoneKeypad(digitFreq?: number) {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const f1 = digitFreq || 697;
      const f2 = f1 * 1.63;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(f1, now);
      osc2.frequency.setValueAtTime(f2, now);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.095);
      osc2.stop(now + 0.095);
    } catch {}
  }

  public playCameraShutter() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      // Double click optical shutter simulation
      [0, 0.045].forEach((offset) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(2400, now + offset);
        osc.frequency.exponentialRampToValueAtTime(400, now + offset + 0.025);
        gain.gain.setValueAtTime(0.12, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.03);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.035);
      });
    } catch {}
  }

  public playNotificationPing() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.19);
    } catch {}
  }

  public playPaperRustle() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.15);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.15;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2500, now);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(now);
    } catch {}
  }

  // --- TOW ROPE & STRAP SOUND EFFECTS ---
  public playRopeTension() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      // Straining nylon strap groaning pitch
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.exponentialRampToValueAtTime(145, now + 0.15);
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(320, now);
      filter.Q.setValueAtTime(4.0, now);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.23);
    } catch {}
  }

  public playRopeJerk(intensity: number = 1.0) {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const safeIntensity = Math.min(2.0, Math.max(0.2, intensity));

      // 1. Heavy dynamic low-end thud
      const thudOsc = this.ctx.createOscillator();
      const thudGain = this.ctx.createGain();
      thudOsc.type = 'sine';
      thudOsc.frequency.setValueAtTime(120, now);
      thudOsc.frequency.exponentialRampToValueAtTime(45, now + 0.18);
      thudGain.gain.setValueAtTime(0.22 * safeIntensity, now);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      thudOsc.connect(thudGain);
      thudGain.connect(this.ctx.destination);
      thudOsc.start(now);
      thudOsc.stop(now + 0.23);

      // 2. Metallic shackle & hook clank
      const clankOsc = this.ctx.createOscillator();
      const clankGain = this.ctx.createGain();
      clankOsc.type = 'triangle';
      clankOsc.frequency.setValueAtTime(1650, now);
      clankOsc.frequency.exponentialRampToValueAtTime(380, now + 0.09);
      clankGain.gain.setValueAtTime(0.14 * safeIntensity, now);
      clankGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      clankOsc.connect(clankGain);
      clankGain.connect(this.ctx.destination);
      clankOsc.start(now);
      clankOsc.stop(now + 0.13);
    } catch {}
  }

  public playRopeSnap() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      // High energy whip-like rupture crack
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.25);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.04));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, now);
      filter.frequency.exponentialRampToValueAtTime(400, now + 0.2);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(now);

      // Metallic recoil ring
      const ringOsc = this.ctx.createOscillator();
      const ringGain = this.ctx.createGain();
      ringOsc.type = 'sine';
      ringOsc.frequency.setValueAtTime(2200, now);
      ringGain.gain.setValueAtTime(0.15, now);
      ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      ringOsc.connect(ringGain);
      ringGain.connect(this.ctx.destination);
      ringOsc.start(now);
      ringOsc.stop(now + 0.36);
    } catch {}
  }

  // =========================================================================
  // REALISTIC RAILWAY & TRAIN SOUND SYNTHESIZER
  // =========================================================================

  /**
   * Powerful Soviet/RZD Typhon T-9 Locomotive Horn (370 Hz + 440 Hz Major Third)
   */
  public playTrainHorn(duration: number = 1.6, distanceGain: number = 1.0) {
    if (!this.ctx || this.isMuted || distanceGain <= 0.01) return;
    try {
      const now = this.ctx.currentTime;
      const safeDist = Math.max(0, Math.min(1, distanceGain));

      // Main Chord: 370Hz + 440Hz + 660Hz Harmonic
      const freqs = [370, 440, 660];
      const masterGain = this.ctx.createGain();
      masterGain.gain.setValueAtTime(0.001, now);
      masterGain.gain.linearRampToValueAtTime(0.35 * safeDist, now + 0.08);
      masterGain.gain.setValueAtTime(0.35 * safeDist, now + duration - 0.15);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, now);

      masterGain.connect(filter);
      filter.connect(this.ctx.destination);

      for (const f of freqs) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.linearRampToValueAtTime(f * 1.008, now + duration);
        osc.connect(masterGain);
        osc.start(now);
        osc.stop(now + duration + 0.05);
      }
    } catch {}
  }

  /**
   * Shunting ChME3/TGK2 Locomotive High-Pitch Whistle
   */
  public playTrainShuntWhistle(distanceGain: number = 1.0) {
    if (!this.ctx || this.isMuted || distanceGain <= 0.01) return;
    try {
      const now = this.ctx.currentTime;
      const safeDist = Math.max(0, Math.min(1, distanceGain));
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(920, now + 0.5);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.25 * safeDist, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.65);
    } catch {}
  }

  /**
   * Steel Wheel-on-Rail Joint Click-Clack (Перестук колес на стыках рельсов)
   */
  public playTrainWheelClick(distanceGain: number = 1.0) {
    if (!this.ctx || this.isMuted || distanceGain <= 0.01) return;
    try {
      const now = this.ctx.currentTime;
      const safeDist = Math.max(0, Math.min(1, distanceGain));

      // Click 1 (Leading axle)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(120, now);
      osc1.frequency.exponentialRampToValueAtTime(45, now + 0.04);
      gain1.gain.setValueAtTime(0.18 * safeDist, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.06);

      // Click 2 (Trailing axle 70ms later)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(140, now + 0.065);
      osc2.frequency.exponentialRampToValueAtTime(50, now + 0.105);
      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.setValueAtTime(0.15 * safeDist, now + 0.065);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.115);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.065);
      osc2.stop(now + 0.125);
    } catch {}
  }

  private trainBrakeBuffer: AudioBuffer | null = null;

  /**
   * Brake Pipe Air Discharge (Пневматический сброс тормозов)
   */
  public playTrainBrakeAir(distanceGain: number = 1.0) {
    if (!this.ctx || this.isMuted || distanceGain <= 0.01) return;
    try {
      const now = this.ctx.currentTime;
      const safeDist = Math.max(0, Math.min(1, distanceGain));

      if (!this.trainBrakeBuffer) {
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.35);
        this.trainBrakeBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = this.trainBrakeBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.12));
        }
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = this.trainBrakeBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.Q.value = 1.2;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.22 * safeDist, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(now);
    } catch {}
  }

  /**
   * Railroad Level Crossing Electronic Bell (Звонок переездной сигнализации СП1/СП2)
   */
  public playCrossingBell(distanceGain: number = 1.0) {
    if (!this.ctx || this.isMuted || distanceGain <= 0.01) return;
    try {
      const now = this.ctx.currentTime;
      const safeDist = Math.max(0, Math.min(1, distanceGain));
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1050, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.12);

      gain.gain.setValueAtTime(0.18 * safeDist, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } catch {}
  }

  /**
   * Differential Lock Engagement Sound (Механическое / пневматическое включение блокировки дифференциала)
   */
  public playDiffLockEngage(isPneumatic: boolean = false) {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      if (isPneumatic) {
        // 1. Pressurized pneumatic valve discharge hiss ("Пссшш-клац")
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.14);
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.04));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2600, now);
        filter.Q.value = 1.4;

        const pGain = this.ctx.createGain();
        pGain.gain.setValueAtTime(0.28, now);
        pGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

        noise.connect(filter);
        filter.connect(pGain);
        pGain.connect(this.ctx.destination);
        noise.start(now);
      }

      // 2. Heavy mechanical dog clutch snap into axle splines ("КЛАЦ-ТУК")
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now + 0.02);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.10);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.setValueAtTime(0.25, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + 0.02);
      osc.stop(now + 0.13);

      // Deep secondary metallic housing thud
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(140, now + 0.04);
      subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
      subGain.gain.setValueAtTime(0.22, now + 0.04);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(now + 0.04);
      subOsc.stop(now + 0.15);
    } catch {}
  }

  /**
   * Differential Lock Disengagement Sound (Пружинный щелчок выключения кулачковой муфты)
   */
  public playDiffLockDisengage(isPneumatic: boolean = false) {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      if (isPneumatic) {
        // Quick short air puff
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.02));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1800, now);
        const pGain = this.ctx.createGain();
        pGain.gain.setValueAtTime(0.18, now);
        pGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        noise.connect(filter);
        filter.connect(pGain);
        pGain.connect(this.ctx.destination);
        noise.start(now);
      }

      // Crisp return spring release click
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(190, now + 0.06);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }

  /**
   * Mechanical Teeth Grind / Lock Warning (Хруст шлицев при попытке включить на скорости)
   */
  public playDiffLockWarning() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.linearRampToValueAtTime(280, now + 0.12);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {}
  }

  /**
   * Railway Electro-Mechanical Signaling Relay Click (Срабатывание сигнального реле НМШ / КМШ в релейном шкафу)
   * Authentic transient armature impact and metal relay cabinet enclosure resonance.
   */
  public playRailwayRelayClick(volume: number = 0.3) {
    if (!this.ctx || this.isMuted || volume <= 0.005) return;
    try {
      const now = this.ctx.currentTime;
      const masterVol = Math.min(1.0, Math.max(0.01, volume));

      // 1. Sharp transient armature impact (металлический переброс якоря)
      const noiseLen = 0.025;
      const bufferSize = Math.floor(this.ctx.sampleRate * noiseLen);
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.005));
      }
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const bandFilter = this.ctx.createBiquadFilter();
      bandFilter.type = 'bandpass';
      bandFilter.frequency.setValueAtTime(1400 + Math.random() * 300, now);
      bandFilter.Q.setValueAtTime(3.5, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.25 * masterVol, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseLen);

      noiseSource.connect(bandFilter);
      bandFilter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noiseSource.start(now);

      // 2. Relay core & iron frame resonance clack (резонанс сердечника и ярма реле)
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.045);

      oscGain.gain.setValueAtTime(0.22 * masterVol, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch {}
  }

  /**
   * Railway Level Crossing Acoustic Alarm Chime (Акустический звонок переездной сигнализации)
   * High-metallic impact with twin bell tone harmonic decay.
   */
  public playLevelCrossingChime(volume: number = 0.3) {
    if (!this.ctx || this.isMuted || volume <= 0.005) return;
    try {
      const now = this.ctx.currentTime;
      const masterVol = Math.min(1.0, Math.max(0.01, volume));

      // Dual harmonic bell strike (основной тон ~880 Hz и обертон ~1760 Hz)
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      const gain2 = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1760, now);

      gain1.gain.setValueAtTime(0.35 * masterVol, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      gain2.gain.setValueAtTime(0.18 * masterVol, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc1.connect(gain1);
      osc2.connect(gain2);
      gain1.connect(this.ctx.destination);
      gain2.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.3);
      osc2.stop(now + 0.18);
    } catch {}
  }
}

export const sound = new SoundEngine();
