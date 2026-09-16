import { QuarkFlavor, QUARK_FLAVORS, SpatialAudioSettings } from '../types';

/**
 * 3D Spatial Audio Engine utilizing Web Audio API
 * Features:
 * 1. HRTF 3D spatialized particle collision tones based on real quark-to-quark interactions
 *    (Up & Down, Strange & Charm, Top & Bottom, and cross-generation CKM pairings)
 * 2. Subtle frequency-shifting dynamically driven by collision impulse magnitude |J|,
 *    relative kinetic energy exchange ΔE, and Doppler line-of-sight velocity
 * 3. Continuous 3D gravitational interaction intensity sonification (gravitational wave strain drone)
 *    modulated by total gravitational potential energy E_G and spacetime curvature (Ricci scalar R)
 * 4. Voice pooling and automatic DynamicsCompressor limiting to maintain a pristine, non-fatiguing mix
 */

export interface QuarkInteractionAcoustic {
  baseFreq: number;
  harmonicRatio: number;
  timbre: 'crystalline' | 'metallic' | 'subbass' | 'harmonic';
  interactionName: string;
  generationPair: string;
  description: string;
}

export class SpatialAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private collisionBus: GainNode | null = null;
  private gravityBus: GainNode | null = null;

  // Gravitational Drone Nodes
  private gravOsc1: OscillatorNode | null = null;
  private gravOsc2: OscillatorNode | null = null;
  private gravFilter: BiquadFilterNode | null = null;
  private gravGain: GainNode | null = null;
  private gravPanner: StereoPannerNode | PannerNode | null = null;
  private gravLfo: OscillatorNode | null = null;
  private gravLfoGain: GainNode | null = null;

  // Settings
  public settings: SpatialAudioSettings = {
    enabled: true,
    masterVolume: 0.7,
    collisionVolume: 0.65,
    gravityVolume: 0.35,
    spatial3d: true,
    resonanceShift: 1.0,
  };

  // Polyphony Voice Pool Management
  private activeVoicesCount = 0;
  private maxPolyphony = 10;
  private lastCollisionSoundTime = 0;
  private minIntervalMs = 12; // throttle to prevent audio queue exhaustion

  // Listener spatial cache
  private listenerX = 0;
  private listenerY = 0;
  private listenerZ = 10;

  // Audio activity indicator for UI
  private isAudioPlaying = false;
  private activityListeners: ((active: boolean) => void)[] = [];
  private activityTimeout: number | null = null;

  constructor() {
    // AudioContext will be initialized on first user interaction to comply with browser autoplay policies
  }

  /**
   * Initializes or resumes the Web Audio Context
   */
  public async ensureContext(): Promise<AudioContext | null> {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) {
        console.warn('Web Audio API is not supported in this browser.');
        return null;
      }

      this.ctx = new AudioCtxClass();

      // Master Compressor (prevents clipping & harsh peaks)
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.settings.masterVolume, this.ctx.currentTime);

      // Sub-busses
      this.collisionBus = this.ctx.createGain();
      this.collisionBus.gain.setValueAtTime(this.settings.collisionVolume, this.ctx.currentTime);

      this.gravityBus = this.ctx.createGain();
      this.gravityBus.gain.setValueAtTime(this.settings.gravityVolume, this.ctx.currentTime);

      // Routing: Sub-busses -> MasterGain -> Compressor -> Destination
      this.collisionBus.connect(this.masterGain);
      this.gravityBus.connect(this.masterGain);
      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);

      // Setup 3D Audio Listener
      this.updateListenerPosition(0, 0, 10);

      // Initialize Gravitational continuous drone
      this.initGravitationalDrone();
    }

    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (e) {
        console.warn('Could not resume AudioContext', e);
      }
    }

    return this.ctx;
  }

  /**
   * Updates 3D listener position in audio coordinates
   */
  public updateListenerPosition(x: number, y: number, z: number): void {
    this.listenerX = x;
    this.listenerY = y;
    this.listenerZ = z;

    if (!this.ctx) return;
    const listener = this.ctx.listener;
    const now = this.ctx.currentTime;

    if (listener.positionX) {
      listener.positionX.setValueAtTime(x, now);
      listener.positionY.setValueAtTime(y, now);
      listener.positionZ.setValueAtTime(z, now);
    } else if ((listener as any).setPosition) {
      (listener as any).setPosition(x, y, z);
    }

    if (listener.forwardX) {
      listener.forwardX.setValueAtTime(0, now);
      listener.forwardY.setValueAtTime(0, now);
      listener.forwardZ.setValueAtTime(-1, now);
      listener.upX.setValueAtTime(0, now);
      listener.upY.setValueAtTime(1, now);
      listener.upZ.setValueAtTime(0, now);
    } else if ((listener as any).setOrientation) {
      (listener as any).setOrientation(0, 0, -1, 0, 1, 0);
    }
  }

  /**
   * Set listener from simulation dimensions and camera
   */
  public syncListenerToSimulation(width: number, height: number, depth = 600): void {
    // Center listener relative to the simulation volume
    this.updateListenerPosition(0, 0, 12);
  }

  /**
   * Computes exact acoustic profile for two interacting quark flavors
   */
  public getQuarkInteractionAcoustic(flavorA: QuarkFlavor, flavorB: QuarkFlavor): QuarkInteractionAcoustic {
    const qA = QUARK_FLAVORS[flavorA] || QUARK_FLAVORS.up;
    const qB = QUARK_FLAVORS[flavorB] || QUARK_FLAVORS.down;

    // Sort flavors to ensure symmetric interaction identification
    const pairKey = [flavorA, flavorB].sort().join('-');

    // Generation 1: Up & Down
    if (pairKey === 'down-up' || pairKey === 'up-up' || pairKey === 'down-down') {
      const base = pairKey === 'down-up' ? 809.99 : pairKey === 'up-up' ? 880.0 : 739.99;
      return {
        baseFreq: base,
        harmonicRatio: 1.5, // Perfect 5th
        timbre: 'crystalline',
        interactionName: 'u ↔ d Light Nucleon Resonance',
        generationPair: 'Gen 1 Light Quarks (Pion / Nucleon)',
        description: 'Crisp, crystalline chime characteristic of light valence quark exchange.',
      };
    }

    // Generation 2: Strange & Charm
    if (pairKey === 'charm-strange' || pairKey === 'strange-strange' || pairKey === 'charm-charm') {
      const base = pairKey === 'charm-strange' ? 366.83 : pairKey === 'strange-strange' ? 440.0 : 293.66;
      return {
        baseFreq: base,
        harmonicRatio: 1.414, // Tritone / augmented 4th metallic resonance
        timbre: 'metallic',
        interactionName: 's ↔ c Charmed Strange Resonance',
        generationPair: 'Gen 2 Heavy Quarks (Kaon / J/ψ)',
        description: 'Warm metallic singing-bowl resonance with non-linear harmonic overtone.',
      };
    }

    // Generation 3: Top & Bottom
    if (pairKey === 'bottom-top' || pairKey === 'bottom-bottom' || pairKey === 'top-top') {
      const base = pairKey === 'bottom-top' ? 110.12 : pairKey === 'bottom-bottom' ? 146.83 : 73.42;
      return {
        baseFreq: base,
        harmonicRatio: 2.0, // Deep octave sub-fundamental
        timbre: 'subbass',
        interactionName: 't ↔ b Electroweak Impact',
        generationPair: 'Gen 3 Ultra-Massive Quarks (Top / Bottom)',
        description: 'Imposing sub-bass thump reflecting the immense mass scale of the top quark (173 GeV).',
      };
    }

    // Cross-generation CKM transitions:
    if (pairKey === 'strange-up' || pairKey === 'down-strange') {
      return {
        baseFreq: 587.33, // D5
        harmonicRatio: 1.333, // Perfect 4th
        timbre: 'harmonic',
        interactionName: 'u/d ↔ s Cabibbo-Favored Transition',
        generationPair: 'Gen 1 ↔ Gen 2 Cross-Coupling',
        description: 'Harmonic mid-register chime reflecting strangeness-changing interaction.',
      };
    }

    if (pairKey === 'charm-up' || pairKey === 'charm-down') {
      return {
        baseFreq: 493.88, // B4
        harmonicRatio: 1.618, // Golden ratio overtone
        timbre: 'metallic',
        interactionName: 'c ↔ u/d Charmed Hadronization',
        generationPair: 'Gen 2 ↔ Gen 1 Cross-Coupling',
        description: 'Resonant bronze overtone from heavy charm into light quarks.',
      };
    }

    if (pairKey === 'bottom-up' || pairKey === 'bottom-down') {
      return {
        baseFreq: 220.0, // A3
        harmonicRatio: 1.5,
        timbre: 'subbass',
        interactionName: 'b ↔ u/d B-Meson Decay Channel',
        generationPair: 'Gen 3 ↔ Gen 1 Weak Coupling',
        description: 'Deep foundational resonance with soft upper harmonic.',
      };
    }

    // Default general reduced-mass calculation
    const fA = qA.baseFrequency;
    const fB = qB.baseFrequency;
    const reducedFreq = (2 * fA * fB) / (fA + fB);

    return {
      baseFreq: reducedFreq,
      harmonicRatio: 1.5,
      timbre: 'harmonic',
      interactionName: `${qA.symbol} ↔ ${qB.symbol} Flavor Interaction`,
      generationPair: `Gen ${qA.generation} ↔ Gen ${qB.generation}`,
      description: 'Quantum chromodynamic flavor interaction tone.',
    };
  }

  /**
   * Triggers a subtle, frequency-shifted 3D spatialized tone for a particle collision
   */
  public playCollisionTone(
    x: number,
    y: number,
    z: number,
    impulseMagnitude: number,
    energyExchange: number,
    flavorA: QuarkFlavor = 'up',
    flavorB: QuarkFlavor = 'down',
    velZ = 0,
    simWidth = 1200,
    simHeight = 800,
    simDepth = 600,
    isHighEnergy = false
  ): number | null {
    if (!this.settings.enabled) return null;

    const nowMs = performance.now();
    if (nowMs - this.lastCollisionSoundTime < this.minIntervalMs && !isHighEnergy) {
      return null; // throttle mild collisions
    }
    if (this.activeVoicesCount >= this.maxPolyphony && !isHighEnergy) {
      return null;
    }

    this.lastCollisionSoundTime = nowMs;

    // Lazily ensure AudioContext
    this.ensureContext().then((ctx) => {
      if (!ctx || ctx.state !== 'running' || !this.collisionBus) return;

      this.activeVoicesCount++;
      this.triggerVoice(
        ctx,
        x,
        y,
        z,
        impulseMagnitude,
        energyExchange,
        flavorA,
        flavorB,
        velZ,
        simWidth,
        simHeight,
        simDepth,
        isHighEnergy
      );
    });

    // Estimate calculated tone frequency for display
    const acoustic = this.getQuarkInteractionAcoustic(flavorA, flavorB);
    const impulseShift = 1.0 + 0.35 * Math.min(1.5, Math.log10(1.0 + impulseMagnitude / 15.0));
    return Math.round(acoustic.baseFreq * impulseShift * 10) / 10;
  }

  /**
   * Synthesizes the single spatialized voice
   */
  private triggerVoice(
    ctx: AudioContext,
    x: number,
    y: number,
    z: number,
    impulseMagnitude: number,
    energyExchange: number,
    flavorA: QuarkFlavor,
    flavorB: QuarkFlavor,
    velZ: number,
    simWidth: number,
    simHeight: number,
    simDepth: number,
    isHighEnergy: boolean
  ): void {
    const now = ctx.currentTime;
    const acoustic = this.getQuarkInteractionAcoustic(flavorA, flavorB);

    // 1. Calculate Frequency Shifting:
    // Base frequency from real quark-to-quark interactions
    let freq = acoustic.baseFreq;

    // Subtle upward microtonal/musical shift proportional to collision impulse magnitude
    // log10 scale ensures gentle scaling across decades of impulse values
    const impulseShift = 1.0 + 0.32 * Math.min(1.4, Math.log10(1.0 + impulseMagnitude / 18.0) * this.settings.resonanceShift);
    freq *= impulseShift;

    // Subtle Doppler shift from longitudinal velocity (z-axis motion towards/away from listener)
    const dopplerFactor = 1.0 + Math.max(-0.15, Math.min(0.15, velZ / 350.0));
    freq *= dopplerFactor;

    // High energy collisions receive an added harmonic sparkle
    if (isHighEnergy) {
      freq *= 1.08;
    }

    // Clamp to audible range [40 Hz, 3500 Hz]
    freq = Math.max(40, Math.min(3500, freq));

    // 2. Spatial 3D Panning:
    // Map simulation coordinates (0..W, 0..H, -D/2..D/2) to audio space (-8..+8, -6..+6, -5..+5)
    const audioX = ((x - simWidth * 0.5) / (simWidth * 0.5)) * 7.5;
    const audioY = -((y - simHeight * 0.5) / (simHeight * 0.5)) * 5.5; // invert Y for screen coords
    const audioZ = (z / (simDepth * 0.5)) * 4.5;

    let spatialNode: AudioNode;

    if (this.settings.spatial3d && typeof ctx.createPanner === 'function') {
      const panner = ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 2.0;
      panner.maxDistance = 30.0;
      panner.rolloffFactor = 1.2;
      panner.coneInnerAngle = 360;

      if (panner.positionX) {
        panner.positionX.setValueAtTime(audioX, now);
        panner.positionY.setValueAtTime(audioY, now);
        panner.positionZ.setValueAtTime(audioZ, now);
      } else if ((panner as any).setPosition) {
        (panner as any).setPosition(audioX, audioY, audioZ);
      }
      spatialNode = panner;
    } else {
      // Fallback to stereo panner if 3D HRTF is disabled
      const stereo = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
      if ((stereo as StereoPannerNode).pan) {
        const panValue = Math.max(-1, Math.min(1, audioX / 7.5));
        (stereo as StereoPannerNode).pan.setValueAtTime(panValue, now);
      }
      spatialNode = stereo;
    }

    // 3. Voice Envelopes & Oscillators
    const voiceGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Duration: subtle decay between 140ms and 360ms
    const duration = isHighEnergy ? 0.38 : Math.max(0.14, Math.min(0.28, 0.14 + impulseMagnitude * 0.002));

    // Dynamic amplitude: subtle, non-intrusive (0.04 to 0.18 peak)
    const peakGain = Math.min(
      0.18,
      0.04 + 0.1 * Math.min(1.0, Math.sqrt(impulseMagnitude) / 10.0) + (isHighEnergy ? 0.04 : 0.0)
    );

    // ADSR Envelope: Fast attack (4ms) to avoid click, smooth exponential decay
    voiceGain.gain.setValueAtTime(0.0001, now);
    voiceGain.gain.exponentialRampToValueAtTime(peakGain, now + 0.004);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    // Primary Carrier Oscillator
    const osc1 = ctx.createOscillator();
    osc1.frequency.setValueAtTime(freq, now);

    // Secondary Harmonic / Shimmer Oscillator
    const osc2 = ctx.createOscillator();
    const harmonicFreq = freq * acoustic.harmonicRatio;
    osc2.frequency.setValueAtTime(harmonicFreq, now);

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.35, now);

    // Tailor timbre according to quark interaction archetype
    if (acoustic.timbre === 'crystalline') {
      // Light quarks (u, d): pure sine + soft high sine overtone
      osc1.type = 'sine';
      osc2.type = 'sine';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(6000, freq * 3.2), now);
      filter.Q.setValueAtTime(2.0, now);
    } else if (acoustic.timbre === 'metallic') {
      // Strange & Charm (s, c): gentle triangle + resonant bandpass metallic chime
      osc1.type = 'triangle';
      osc2.type = 'sine';
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq * 1.25, now);
      filter.Q.setValueAtTime(4.5, now);
    } else if (acoustic.timbre === 'subbass') {
      // Top & Bottom (t, b): deep warm fundamental sine + downward sweeping sub-filter
      osc1.type = 'sine';
      osc2.type = 'triangle';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 2.5, now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(50, freq * 0.8), now + duration);
      filter.Q.setValueAtTime(3.0, now);
    } else {
      // General harmonic pairing
      osc1.type = 'sine';
      osc2.type = 'sine';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 2.8, now);
      filter.Q.setValueAtTime(1.5, now);
    }

    // Connect audio graph:
    // [osc1] -------------> [filter] -> [voiceGain] -> [spatialNode] -> [collisionBus]
    // [osc2] -> [osc2Gain] -> /
    osc1.connect(filter);
    osc2.connect(osc2Gain);
    osc2Gain.connect(filter);
    filter.connect(voiceGain);
    voiceGain.connect(spatialNode);
    if (this.collisionBus) {
      spatialNode.connect(this.collisionBus);
    }

    // Start and cleanup
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration + 0.05);
    osc2.stop(now + duration + 0.05);

    // Notify UI of audio activity
    this.signalActivity();

    // Clean up nodes after completion
    setTimeout(() => {
      try {
        osc1.disconnect();
        osc2.disconnect();
        osc2Gain.disconnect();
        filter.disconnect();
        voiceGain.disconnect();
        spatialNode.disconnect();
      } catch (e) {
        // already disconnected
      }
      this.activeVoicesCount = Math.max(0, this.activeVoicesCount - 1);
    }, (duration + 0.1) * 1000);
  }

  /**
   * Initializes the continuous subtle gravitational interaction ambient field
   * Synthesizes a binaural gravitational wave hum modulated by spacetime curvature & potential
   */
  private initGravitationalDrone(): void {
    if (!this.ctx || !this.gravityBus) return;
    const now = this.ctx.currentTime;

    // Dual low-frequency oscillators for subtle binaural beating (gravitational wave strain)
    this.gravOsc1 = this.ctx.createOscillator();
    this.gravOsc2 = this.ctx.createOscillator();
    this.gravFilter = this.ctx.createBiquadFilter();
    this.gravGain = this.ctx.createGain();

    // Cosmic base frequency: 43.65 Hz (F1 fundamental)
    this.gravOsc1.type = 'sine';
    this.gravOsc1.frequency.setValueAtTime(43.65, now);

    // Detuned by 0.4 Hz for gentle natural breathing binaural pulsation
    this.gravOsc2.type = 'sine';
    this.gravOsc2.frequency.setValueAtTime(44.05, now);

    // Lowpass filter isolating deep sub-audible and warm low-end harmonics
    this.gravFilter.type = 'lowpass';
    this.gravFilter.frequency.setValueAtTime(75.0, now);
    this.gravFilter.Q.setValueAtTime(2.5, now);

    // Subtle background level
    this.gravGain.gain.setValueAtTime(0.06, now);

    // LFO for slow gravitational wave spatial panning
    if (typeof this.ctx.createStereoPanner === 'function') {
      const panner = this.ctx.createStereoPanner();
      this.gravLfo = this.ctx.createOscillator();
      this.gravLfoGain = this.ctx.createGain();

      this.gravLfo.frequency.setValueAtTime(0.12, now); // 8 second cycle
      this.gravLfoGain.gain.setValueAtTime(0.4, now); // pan breadth

      this.gravLfo.connect(this.gravLfoGain);
      this.gravLfoGain.connect(panner.pan);
      this.gravPanner = panner;

      this.gravGain.connect(panner);
      panner.connect(this.gravityBus);
      this.gravLfo.start(now);
    } else {
      this.gravGain.connect(this.gravityBus);
    }

    this.gravOsc1.connect(this.gravFilter);
    this.gravOsc2.connect(this.gravFilter);
    this.gravFilter.connect(this.gravGain);

    this.gravOsc1.start(now);
    this.gravOsc2.start(now);
  }

  /**
   * Continuously updates the continuous gravitational soundscape based on
   * total gravitational potential energy E_G, kinetic energy, and spacetime curvature
   */
  public updateGravitationalField(
    eG: number,
    eKin: number,
    ricciScalar = 0,
    activeParticles = 100
  ): void {
    if (!this.ctx || !this.gravFilter || !this.gravGain || !this.gravOsc1 || !this.gravOsc2) {
      return;
    }

    const now = this.ctx.currentTime;
    const absEg = Math.abs(eG);

    // Normalized gravitational intensity metric [0, 1]
    const gravIntensity = Math.min(1.0, absEg / 25000.0);
    const curvatureIntensity = Math.min(1.0, Math.abs(ricciScalar) / 15.0);

    // Filter frequency opens up smoothly with intense gravitational clustering
    // Base 55 Hz -> reaches up to 180 Hz during tight gravitational collapses
    const targetCutoff = 50.0 + gravIntensity * 110.0 + curvatureIntensity * 30.0;
    this.gravFilter.frequency.setTargetAtTime(targetCutoff, now, 0.3);

    // Subtle pitch modulation: intense gravitational potential causes slight frequency depression (gravitational redshift)
    const basePitch = 43.65 * (1.0 - gravIntensity * 0.08);
    this.gravOsc1.frequency.setTargetAtTime(basePitch, now, 0.4);
    this.gravOsc2.frequency.setTargetAtTime(basePitch + 0.45, now, 0.4);

    // Drone volume smoothly tracks gravitational density
    const targetGain = Math.max(0.02, Math.min(0.12, 0.03 + gravIntensity * 0.08));
    this.gravGain.gain.setTargetAtTime(targetGain, now, 0.25);
  }

  /**
   * Updates audio master settings
   */
  public updateSettings(newSettings: Partial<SpatialAudioSettings>): void {
    Object.assign(this.settings, newSettings);

    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (this.masterGain && newSettings.masterVolume !== undefined) {
      this.masterGain.gain.setTargetAtTime(this.settings.enabled ? this.settings.masterVolume : 0, now, 0.05);
    }

    if (this.collisionBus && newSettings.collisionVolume !== undefined) {
      this.collisionBus.gain.setTargetAtTime(this.settings.collisionVolume, now, 0.05);
    }

    if (this.gravityBus && newSettings.gravityVolume !== undefined) {
      this.gravityBus.gain.setTargetAtTime(this.settings.gravityVolume, now, 0.05);
    }

    if (newSettings.enabled !== undefined && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.settings.enabled ? this.settings.masterVolume : 0, now, 0.05);
    }
  }

  /**
   * Audio activity signal for visualizer UI
   */
  private signalActivity(): void {
    if (!this.isAudioPlaying) {
      this.isAudioPlaying = true;
      this.activityListeners.forEach((cb) => cb(true));
    }
    if (this.activityTimeout) {
      window.clearTimeout(this.activityTimeout);
    }
    this.activityTimeout = window.setTimeout(() => {
      this.isAudioPlaying = false;
      this.activityListeners.forEach((cb) => cb(false));
    }, 250);
  }

  public onActivityChange(cb: (active: boolean) => void): () => void {
    this.activityListeners.push(cb);
    return () => {
      this.activityListeners = this.activityListeners.filter((c) => c !== cb);
    };
  }

  public isContextActive(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }
}

// Global Singleton Instance
export const spatialAudio = new SpatialAudioEngine();
