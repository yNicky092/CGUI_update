export type CollisionMode = 'elastic' | 'inelastic' | 'none';
export type TrailColorMode = 'particle' | 'cyan' | 'monochrome';
export type VectorColorMode = 'combined' | 'magnitude' | 'direction';
export type CGUIMode = 'emergence' | 'axiomatic';
export type ViewMode = '2d' | '3d';
export type DimensionMode = '2d_projection' | '8d_complexified';
export type CGUIStage =
  | 'CGUI-0'
  | 'CGUI-1'
  | 'CGUI-2'
  | 'CGUI-3'
  | 'CGUI-4'
  | 'CGUI-5'
  | 'CGUI-6';

export type QuarkFlavor = 'up' | 'down' | 'strange' | 'charm' | 'bottom' | 'top';

export interface QuarkFlavorData {
  flavor: QuarkFlavor;
  id: number; // 0=up, 1=down, 2=strange, 3=charm, 4=bottom, 5=top
  symbol: string;
  name: string;
  generation: 1 | 2 | 3;
  massMeV: number;
  charge: number; // electric charge (+2/3 or -1/3)
  colorHex: string;
  baseFrequency: number; // Hz for sonification
  description: string;
}

export const QUARK_FLAVORS: Record<QuarkFlavor, QuarkFlavorData> = {
  up: {
    flavor: 'up',
    id: 0,
    symbol: 'u',
    name: 'Up Quark',
    generation: 1,
    massMeV: 2.16,
    charge: 2 / 3,
    colorHex: '#ef4444',
    baseFrequency: 880.0, // A5
    description: 'Light 1st gen quark (+2/3e). Forms protons (uud) and pions.',
  },
  down: {
    flavor: 'down',
    id: 1,
    symbol: 'd',
    name: 'Down Quark',
    generation: 1,
    massMeV: 4.67,
    charge: -1 / 3,
    colorHex: '#3b82f6',
    baseFrequency: 739.99, // F#5
    description: 'Light 1st gen quark (-1/3e). Forms neutrons (udd) and pions.',
  },
  strange: {
    flavor: 'strange',
    id: 2,
    symbol: 's',
    name: 'Strange Quark',
    generation: 2,
    massMeV: 93.4,
    charge: -1 / 3,
    colorHex: '#10b981',
    baseFrequency: 440.0, // A4
    description: '2nd gen quark with S=-1. Forms kaons and hyperons with resonant harmonics.',
  },
  charm: {
    flavor: 'charm',
    id: 3,
    symbol: 'c',
    name: 'Charm Quark',
    generation: 2,
    massMeV: 1270.0,
    charge: 2 / 3,
    colorHex: '#f59e0b',
    baseFrequency: 293.66, // D4
    description: 'Heavy 2nd gen quark (+2/3e). Forms J/ψ charmonium with rich metallic overtones.',
  },
  bottom: {
    flavor: 'bottom',
    id: 4,
    symbol: 'b',
    name: 'Bottom Quark',
    generation: 3,
    massMeV: 4180.0,
    charge: -1 / 3,
    colorHex: '#8b5cf6',
    baseFrequency: 146.83, // D3
    description: 'Massive 3rd gen quark (-1/3e). Forms B-mesons with deep foundational bass.',
  },
  top: {
    flavor: 'top',
    id: 5,
    symbol: 't',
    name: 'Top Quark',
    generation: 3,
    massMeV: 172760.0,
    charge: 2 / 3,
    colorHex: '#ec4899',
    baseFrequency: 73.42, // D2
    description: 'Heaviest known fundamental particle (173 GeV). Decays electroweakly prior to hadronization.',
  },
};

export const QUARK_RGB_MAP: Record<QuarkFlavor, [number, number, number]> = {
  up: [239, 68, 68], // #ef4444 Crimson
  down: [59, 130, 246], // #3b82f6 Azure
  strange: [16, 185, 129], // #10b981 Emerald
  charm: [245, 158, 11], // #f59e0b Amber
  bottom: [139, 92, 246], // #8b5cf6 Purple
  top: [236, 72, 153], // #ec4899 Pink
};

export const QUARK_FLAVOR_LIST: QuarkFlavorData[] = Object.values(QUARK_FLAVORS);

export interface SimulationParams {
  width: number;
  height: number;
  depth: number; // 3D volume depth (e.g. 600)
  maxParticles: number;
  initialParticles: number;
  cellSize: number;
  g0: number; // Re(G): Microscopic Gravitational Coupling
  sigmaColor: number; // Im(G): Color Confinement String Tension
  r0: number; // Asymptotic Freedom Scale
  epsilon: number; // Softening Parameter
  thetaBH: number; // Barnes-Hut Opening Angle Threshold
  kElectro: number; // Emergent U(1) Electromagnetism from Metric Phase
  restMassEnergy: number; // Thermodynamic energy cost to manifest mass from vacuum
  frictionCoeff: number; // Kinetic Temperature Dissipation
  particleMass: number;
  particleRadius: number;
  maxTrailPoints: number; // Max capacity buffer per particle
  trailLength: number; // N frames to draw (active length)
  trailColorMode: TrailColorMode;
  collisionMode: CollisionMode; // 'elastic' | 'inelastic' | 'none'
  collisionRestitution: number; // Elastic coefficient (1.0 = perfectly elastic)
  lambdaC: number; // Complexification Parameter
  cguiMode: CGUIMode; // 'emergence' (derived from 8D metric reduction) vs 'axiomatic'
  cguiStage: CGUIStage; // CGUI-0 through CGUI-6
  compactificationRy: number; // Internal radius on K_4 manifold
  vectorScale: number; // Velocity arrow length multiplier
  vectorColorMode: VectorColorMode; // 'combined' | 'magnitude' | 'direction'
  highEnergyThreshold: number; // Kinetic energy threshold for high-energy collision alerts
  enable3DPhysics: boolean; // Enables 3D z-axis dispersion & dynamics
}

export interface FluxTube {
  i: number;
  j: number;
  r: number;
  vC: number;
  isBaryonBond?: boolean;
}

export interface Thermodynamics {
  fps: number;
  activeParticles: number;
  maxParticles: number;
  pairProductionsCount: number;
  collisionCount: number;
  collisionMode: CollisionMode;
  trailLength: number;
  lambdaC: number;
  cguiMode: CGUIMode;
  cguiStage: CGUIStage;
  compactificationRy: number;
  ricciScalar: number;
  eKin: number;
  eG: number;
  eEM: number;
  eC: number;
  eRest: number;
  eTotal: number;
  eInitial: number;
  eDrift: number;
  entropy: number; // S = -k_B sum p_i ln p_i
  entropyRate: number; // dS/dt
  temperature: number; // 2D equipartition temperature
  momentumMagnitude: number; // |P_total|
  angularMomentum: number; // L_z about COM
  netElectricCharge: number; // Total Q
  colorNeutralityIndex: number; // Gauge invariant SU(3) charge balance
  baryonsCount?: number;
  mesonsCount?: number;
  equilibriumIndex?: number; // 0 to 100%
  equilibriumState?: 'equilibrium' | 'quasi_equilibrium' | 'non_equilibrium';
  equilibriumLabel?: string;
}

export interface ParticleInfo {
  index: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  speed: number;
  mass: number;
  radius: number;
  colorCharge: number; // 0=Red, 1=Green, 2=Blue
  colorName: string;
  quarkFlavor: QuarkFlavor;
  quarkSymbol: string;
  qEm: number;
  kineticEnergy: number;
  bondsCount: number;
  hadronType?: 'free' | 'meson' | 'baryon';
  baryonId?: number;
  extraDimCoordinates?: [number, number, number, number]; // [y1, y2, y3, y4] in K_4
  extraDimColor?: string;
}

export interface CollisionEvent {
  id: string;
  frame: number;
  timestamp: number;
  particleA: {
    index: number;
    color: number;
    colorName: string;
    flavor: QuarkFlavor;
    flavorSymbol: string;
    mass: number;
    qEm: number;
    speed: number;
  };
  particleB: {
    index: number;
    color: number;
    colorName: string;
    flavor: QuarkFlavor;
    flavorSymbol: string;
    mass: number;
    qEm: number;
    speed: number;
  };
  x: number;
  y: number;
  z: number;
  impulseMagnitude: number;
  energyExchange: number; // ΔE kinetic energy exchange
  collisionType: 'elastic' | 'inelastic';
  isHighEnergy: boolean;
  interactionName?: string;
  toneFrequency?: number;
}

export interface SpatialAudioSettings {
  enabled: boolean;
  masterVolume: number;
  collisionVolume: number;
  gravityVolume: number;
  spatial3d: boolean;
  resonanceShift: number;
}

export interface CollisionHighlight {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  maxRadius: number;
  magnitude: number;
  color: string;
  startTime: number;
  duration: number; // in milliseconds
}

export interface EnergyFrameSample {
  frame: number;
  time: number;
  eTotal: number;
  eKin: number;
  eG: number;
  eEM: number;
  eC: number;
  eRest: number;
}

export interface QuadTreeNodeData {
  x: number;
  y: number;
  w: number;
  h: number;
  depth: number;
  mass: number;
  comX: number;
  comY: number;
  isLeaf: boolean;
}

export interface EnergyHistoryPoint {
  time: number;
  eTotal: number;
  eKin: number;
  ePot: number;
  eRest: number;
}

export interface SimulationSnapshot {
  frameIndex: number;
  timestamp: number;
  numParticles: number;
  posX: Float32Array;
  posY: Float32Array;
  velX: Float32Array;
  velY: Float32Array;
  mass: Float32Array;
  radius: Float32Array;
  colorCharge: Int8Array;
  qEm: Int8Array;
  fluxTubes: FluxTube[];
  thermo: Thermodynamics;
  lambdaC: number;
}

export interface PlaybackStatus {
  isRecording: boolean;
  isReplaying: boolean;
  isPlayingReplay: boolean;
  currentFrame: number;
  totalFrames: number;
  speed: number; // 0.1, 0.25, 0.5, 1.0, 2.0, 4.0
  loop: boolean;
  maxFrames: number;
}
