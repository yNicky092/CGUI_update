import { PhysicsEngine } from './engine';

export interface ScenarioPreset {
  id: string;
  name: string;
  description: string;
  lambdaC: number;
  particleCount: number;
  setup: (engine: PhysicsEngine) => void;
}

export const PRESETS: ScenarioPreset[] = [
  {
    id: 'default',
    name: 'Uniform Cosmic Hadronization',
    description: 'Initial 800 uniform quarks with Barnes-Hut gravity, color confinement, and emergent U(1) EM.',
    lambdaC: 1.0,
    particleCount: 800,
    setup: (engine: PhysicsEngine) => {
      engine.params.lambdaC = 1.0;
      engine.resetSimulation(800);
    },
  },
  {
    id: 'gravity',
    name: 'Pure Newtonian Gravity (λ = 0)',
    description: 'Complexification parameter λ = 0. Gauge fields vanish; pure Barnes-Hut gravitational collapse.',
    lambdaC: 0.0,
    particleCount: 750,
    setup: (engine: PhysicsEngine) => {
      engine.params.lambdaC = 0.0;
      engine.resetSimulation(750);
      // Give particles orbital tangential velocity around center
      const cx = engine.params.width / 2;
      const cy = engine.params.height / 2;
      for (let i = 0; i < engine.numParticles; i++) {
        const dx = engine.posX[i] - cx;
        const dy = engine.posY[i] - cy;
        const r = Math.hypot(dx, dy) + 20;
        const vOrbital = Math.min(30, Math.sqrt((engine.params.g0 * 1500) / r));
        engine.velX[i] = (-dy / r) * vOrbital + (Math.random() - 0.5) * 5;
        engine.velY[i] = (dx / r) * vOrbital + (Math.random() - 0.5) * 5;
      }
    },
  },
  {
    id: 'mesons',
    name: 'Meson Lattice Pairs',
    description: 'Structured pairs of opposing quarks connected by linear color flux tubes, oscillating in equilibrium.',
    lambdaC: 1.2,
    particleCount: 300,
    setup: (engine: PhysicsEngine) => {
      engine.params.lambdaC = 1.2;
      engine.numParticles = 0;
      engine.pairProductionsCount = 0;
      engine.eInitial = null;

      const w = engine.params.width;
      const h = engine.params.height;
      const numPairs = 150;

      for (let p = 0; p < numPairs; p++) {
        const cx = 80 + Math.random() * (w - 160);
        const cy = 80 + Math.random() * (h - 160);
        const angle = Math.random() * Math.PI * 2;
        const sep = 28; // slightly above R_0 (18) to engage flux tube
        const vx = (Math.random() - 0.5) * 6;
        const vy = (Math.random() - 0.5) * 6;

        // Quark 1 (Red)
        engine.spawnParticle(
          cx - Math.cos(angle) * (sep / 2),
          cy - Math.sin(angle) * (sep / 2),
          vx,
          vy,
          0 // Red
        );
        // Quark 2 (Green)
        engine.spawnParticle(
          cx + Math.cos(angle) * (sep / 2),
          cy + Math.sin(angle) * (sep / 2),
          vx,
          vy,
          1 // Green
        );
      }
    },
  },
  {
    id: 'baryons',
    name: 'Baryon Triplets (RGB)',
    description: '3-quark bound clusters (Red + Green + Blue) in color-singlet configurations with emergent EM neutrality.',
    lambdaC: 1.3,
    particleCount: 360,
    setup: (engine: PhysicsEngine) => {
      engine.params.lambdaC = 1.3;
      engine.numParticles = 0;
      engine.pairProductionsCount = 0;
      engine.eInitial = null;

      const w = engine.params.width;
      const h = engine.params.height;
      const numTriplets = 120;

      for (let t = 0; t < numTriplets; t++) {
        const cx = 80 + Math.random() * (w - 160);
        const cy = 80 + Math.random() * (h - 160);
        const baseAngle = Math.random() * Math.PI * 2;
        const radius = 24;
        const vClusterX = (Math.random() - 0.5) * 10;
        const vClusterY = (Math.random() - 0.5) * 10;

        for (let c = 0; c < 3; c++) {
          const a = baseAngle + (c * (2 * Math.PI)) / 3;
          engine.spawnParticle(
            cx + Math.cos(a) * radius,
            cy + Math.sin(a) * radius,
            vClusterX + (Math.random() - 0.5) * 2,
            vClusterY + (Math.random() - 0.5) * 2,
            c // 0=Red, 1=Green, 2=Blue
          );
        }
      }
    },
  },
  {
    id: 'schwinger',
    name: 'Schwinger String Snapping Testbed',
    description: 'Stretched high-energy flux tubes exceeding 2*mc² vacuum creation cost, generating real-time pair production cascades.',
    lambdaC: 1.8,
    particleCount: 200,
    setup: (engine: PhysicsEngine) => {
      engine.params.lambdaC = 1.8;
      engine.numParticles = 0;
      engine.pairProductionsCount = 0;
      engine.eInitial = null;

      const w = engine.params.width;
      const h = engine.params.height;
      const chains = 25;

      for (let c = 0; c < chains; c++) {
        const cx = 150 + Math.random() * (w - 300);
        const cy = 100 + (c * (h - 200)) / chains;

        // Two quarks pulled apart with high divergence speed
        const sep = 32;
        engine.spawnParticle(cx - sep, cy, -25, 0, 0); // Red moving left fast
        engine.spawnParticle(cx + sep, cy, 25, 0, 1);  // Green moving right fast
      }
    },
  },
  {
    id: 'collider',
    name: 'Binary Elastic Collider',
    description: 'Two counter-propagating quark clusters that collide head-on, showcasing elastic momentum conservation and trajectory trails.',
    lambdaC: 0.5,
    particleCount: 400,
    setup: (engine: PhysicsEngine) => {
      engine.params.lambdaC = 0.5;
      engine.params.collisionMode = 'elastic';
      engine.params.collisionRestitution = 1.0;
      engine.params.trailLength = 30;
      engine.numParticles = 0;
      engine.pairProductionsCount = 0;
      engine.collisionCount = 0;
      engine.eInitial = null;

      const w = engine.params.width;
      const h = engine.params.height;
      const count = 200;

      // Cluster A (Left, moving right)
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const rad = Math.sqrt(Math.random()) * 90;
        const x = w * 0.25 + Math.cos(angle) * rad;
        const y = h * 0.5 + Math.sin(angle) * rad;
        const c = i % 3;
        engine.spawnParticle(x, y, 40 + (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 12, c);
      }

      // Cluster B (Right, moving left)
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const rad = Math.sqrt(Math.random()) * 90;
        const x = w * 0.75 + Math.cos(angle) * rad;
        const y = h * 0.5 + Math.sin(angle) * rad;
        const c = (i + 1) % 3;
        engine.spawnParticle(x, y, -40 + (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 12, c);
      }
    },
  },
  {
    id: 'qgp',
    name: 'Quark-Gluon Plasma (QGP)',
    description: 'High kinetic temperature deconfined quark matter exhibiting continuous flux tube reconnection.',
    lambdaC: 0.9,
    particleCount: 1100,
    setup: (engine: PhysicsEngine) => {
      engine.params.lambdaC = 0.9;
      engine.resetSimulation(1100);
      // High thermal velocity
      for (let i = 0; i < engine.numParticles; i++) {
        engine.velX[i] = (Math.random() - 0.5) * 90.0;
        engine.velY[i] = (Math.random() - 0.5) * 90.0;
      }
    },
  },
  {
    id: 'updown',
    name: 'Up & Down Nucleon Resonance (u ↔ d)',
    description: 'Generation 1 light quark plasma. Collisions trigger crisp, crystalline harmonic acoustic chimes (740 Hz - 880 Hz).',
    lambdaC: 1.1,
    particleCount: 450,
    setup: (engine: PhysicsEngine) => {
      engine.params.lambdaC = 1.1;
      engine.params.collisionMode = 'elastic';
      engine.numParticles = 0;
      engine.pairProductionsCount = 0;
      engine.collisionCount = 0;
      engine.eInitial = null;

      const w = engine.params.width;
      const h = engine.params.height;
      const count = 450;
      for (let i = 0; i < count; i++) {
        const isUp = i % 2 === 0;
        const color = isUp ? 0 : 1;
        const flavor = isUp ? 'up' : 'down';
        const x = 60 + Math.random() * (w - 120);
        const y = 60 + Math.random() * (h - 120);
        const z = (Math.random() - 0.5) * 300;
        engine.spawnParticle(
          x,
          y,
          (Math.random() - 0.5) * 45,
          (Math.random() - 0.5) * 45,
          color,
          isUp ? 1.0 : 1.15,
          z,
          (Math.random() - 0.5) * 30,
          flavor
        );
      }
    },
  },
  {
    id: 'strangecharm',
    name: 'Strange & Charm Heavy Resonance (s ↔ c)',
    description: 'Generation 2 medium-heavy quark collisions generating rich metallic, singing-bowl overtones (294 Hz - 440 Hz).',
    lambdaC: 1.25,
    particleCount: 380,
    setup: (engine: PhysicsEngine) => {
      engine.params.lambdaC = 1.25;
      engine.params.collisionMode = 'elastic';
      engine.numParticles = 0;
      engine.pairProductionsCount = 0;
      engine.collisionCount = 0;
      engine.eInitial = null;

      const w = engine.params.width;
      const h = engine.params.height;
      const count = 380;
      for (let i = 0; i < count; i++) {
        const isStrange = i % 2 === 0;
        const color = isStrange ? 2 : 0;
        const flavor = isStrange ? 'strange' : 'charm';
        const x = 80 + Math.random() * (w - 160);
        const y = 80 + Math.random() * (h - 160);
        const z = (Math.random() - 0.5) * 250;
        engine.spawnParticle(
          x,
          y,
          (Math.random() - 0.5) * 40,
          (Math.random() - 0.5) * 40,
          color,
          isStrange ? 1.4 : 2.2,
          z,
          (Math.random() - 0.5) * 25,
          flavor
        );
      }
    },
  },
  {
    id: 'topbottom',
    name: 'Top & Bottom Electroweak Shower (t ↔ b)',
    description: 'Generation 3 ultra-massive quark collider (b = 4.2 GeV, t = 173 GeV). Produces thunderous sub-bass acoustic thumps (73 Hz - 147 Hz).',
    lambdaC: 1.4,
    particleCount: 300,
    setup: (engine: PhysicsEngine) => {
      engine.params.lambdaC = 1.4;
      engine.params.collisionMode = 'elastic';
      engine.numParticles = 0;
      engine.pairProductionsCount = 0;
      engine.collisionCount = 0;
      engine.eInitial = null;

      const w = engine.params.width;
      const h = engine.params.height;
      const count = 300;
      for (let i = 0; i < count; i++) {
        const isTop = i % 2 === 0;
        const color = isTop ? 0 : 1;
        const flavor = isTop ? 'top' : 'bottom';
        const x = 100 + Math.random() * (w - 200);
        const y = 100 + Math.random() * (h - 200);
        const z = (Math.random() - 0.5) * 200;
        engine.spawnParticle(
          x,
          y,
          (Math.random() - 0.5) * 35,
          (Math.random() - 0.5) * 35,
          color,
          isTop ? 3.5 : 2.5,
          z,
          (Math.random() - 0.5) * 20,
          flavor
        );
      }
    },
  },
];
