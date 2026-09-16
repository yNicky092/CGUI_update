import {
  SimulationParams,
  FluxTube,
  Thermodynamics,
  QuadTreeNodeData,
  ParticleInfo,
  SimulationSnapshot,
  CGUIMode,
  CGUIStage,
  CollisionEvent,
  CollisionHighlight,
  EnergyFrameSample,
  QuarkFlavor,
  QUARK_FLAVORS,
} from '../types';
import { CGUI8DModule, ThermodynamicConservation } from './cgui8d';
import { spatialAudio } from '../audio/spatialAudioEngine';
import { EntropyHeatmapCalculator, EntropyHeatmapStats } from './entropyHeatmap';
import { quadtree, Quadtree } from 'd3-quadtree';
import Matter from 'matter-js';
const { Vector } = Matter;

export interface BHPoint {
  x: number;
  y: number;
  mass: number;
  idx: number;
}

/**
 * Barnes-Hut quadtree powered by d3-quadtree for mature, O(N log N) spatial acceleration.
 */
export class D3BarnesHutTree {
  tree: Quadtree<BHPoint>;
  rootNode: any;
  extentX0: number = 0;
  extentY0: number = 0;
  extentX1: number = 1200;
  extentY1: number = 800;

  constructor(points: BHPoint[], width: number, height: number) {
    this.tree = quadtree<BHPoint>()
      .x((p) => p.x)
      .y((p) => p.y)
      .extent([
        [0, 0],
        [Math.max(width, 100), Math.max(height, 100)],
      ])
      .addAll(points);
    this.rootNode = this.tree.root();
    const ext = this.tree.extent();
    this.extentX0 = ext[0][0];
    this.extentY0 = ext[0][1];
    this.extentX1 = ext[1][0];
    this.extentY1 = ext[1][1];

    if (this.rootNode) {
      this.accumulate(this.rootNode);
    }
  }

  private accumulate(node: any): void {
    let totalMass = 0;
    let cx = 0;
    let cy = 0;

    if (node.length) {
      for (let i = 0; i < 4; ++i) {
        const child = node[i];
        if (child) {
          this.accumulate(child);
          totalMass += child.mass;
          cx += child.mass * child.comX;
          cy += child.mass * child.comY;
        }
      }
    } else {
      let d = node;
      do {
        const p = d.data as BHPoint;
        totalMass += p.mass;
        cx += p.mass * p.x;
        cy += p.mass * p.y;
      } while ((d = d.next));
    }

    node.mass = totalMass;
    node.comX = totalMass > 0 ? cx / totalMass : 0;
    node.comY = totalMass > 0 ? cy / totalMass : 0;
  }

  computeGravityForce(
    pIdx: number,
    px: number,
    py: number,
    pMass: number,
    theta: number,
    G: number,
    eps: number,
    out: { fx: number; fy: number; vg: number }
  ): void {
    if (!this.rootNode || this.rootNode.mass <= 0) return;

    this.tree.visit((node: any, x0: number, y0: number, x1: number, y1: number) => {
      if (!node.mass) return true;

      // If leaf containing only the particle itself, skip
      if (!node.length) {
        let isOnlySelf = true;
        let d = node;
        do {
          if ((d.data as BHPoint).idx !== pIdx) {
            isOnlySelf = false;
            break;
          }
        } while ((d = d.next));
        if (isOnlySelf) return true;
      }

      const dx = node.comX - px;
      const dy = node.comY - py;
      const dSq = dx * dx + dy * dy + eps * eps;
      const d = Math.sqrt(dSq);
      const s = Math.max(x1 - x0, y1 - y0);

      // Monopole approximation condition
      if (!node.length || s / d < theta) {
        let nodeMass = node.mass;
        let effectiveComX = node.comX;
        let effectiveComY = node.comY;

        if (!node.length) {
          let hasSelf = false;
          let d = node;
          do {
            if ((d.data as BHPoint).idx === pIdx) {
              hasSelf = true;
              break;
            }
          } while ((d = d.next));

          if (hasSelf) {
            nodeMass -= pMass;
            if (nodeMass <= 0) return true;
          }
        }

        const effDx = effectiveComX - px;
        const effDy = effectiveComY - py;
        const effDSq = effDx * effDx + effDy * effDy + eps * eps;
        const effD = Math.sqrt(effDSq);

        const fMag = (G * pMass * nodeMass) / effDSq;
        const vG = -(G * pMass * nodeMass) / effD;
        out.fx += (fMag * effDx) / effD;
        out.fy += (fMag * effDy) / effD;
        out.vg += vG;
        return true;
      }

      return false;
    });
  }

  collectNodes(list: QuadTreeNodeData[], maxCollectedDepth = 6): void {
    if (!this.rootNode) return;

    const stack: { node: any; x0: number; y0: number; x1: number; y1: number; depth: number }[] = [
      {
        node: this.rootNode,
        x0: this.extentX0,
        y0: this.extentY0,
        x1: this.extentX1,
        y1: this.extentY1,
        depth: 0,
      },
    ];

    while (stack.length > 0) {
      const item = stack.pop()!;
      const { node, x0, y0, x1, y1, depth } = item;
      if (!node || node.mass <= 0) continue;

      if (depth <= maxCollectedDepth) {
        list.push({
          x: x0,
          y: y0,
          w: Math.max(1, x1 - x0),
          h: Math.max(1, y1 - y0),
          depth,
          mass: node.mass,
          comX: node.comX,
          comY: node.comY,
          isLeaf: !node.length,
        });
      }

      if (node.length && depth < maxCollectedDepth) {
        const xm = (x0 + x1) / 2;
        const ym = (y0 + y1) / 2;
        if (node[3]) stack.push({ node: node[3], x0: xm, y0: ym, x1, y1, depth: depth + 1 });
        if (node[2]) stack.push({ node: node[2], x0, y0: ym, x1: xm, y1, depth: depth + 1 });
        if (node[1]) stack.push({ node: node[1], x0: xm, y0, x1, y1: ym, depth: depth + 1 });
        if (node[0]) stack.push({ node: node[0], x0, y0, x1: xm, y1: ym, depth: depth + 1 });
      }
    }
  }
}

/**
 * Hadron Topological Connection Manager
 * Strictly enforces user directives:
 * 1. Baryons must be limited to a maximum of two connections to the surround particles not more.
 * 2. If a baryon has more than one connection, it must only be allowed to connect the second body
 *    which locks the particles into a three particle baryon only.
 */
export class HadronTopologyManager {
  n: number;
  bondsCount: Int32Array;
  parent: Int32Array;
  clusterSize: Int32Array;
  adjacency: Set<number>[];

  constructor(n: number) {
    this.n = n;
    this.bondsCount = new Int32Array(n);
    this.parent = new Int32Array(n);
    this.clusterSize = new Int32Array(n);
    this.adjacency = [];
    for (let i = 0; i < n; i++) {
      this.parent[i] = i;
      this.clusterSize[i] = 1;
      this.adjacency.push(new Set<number>());
    }
  }

  find(i: number): number {
    let root = i;
    while (root !== this.parent[root]) {
      root = this.parent[root];
    }
    let curr = i;
    while (curr !== root) {
      const nxt = this.parent[curr];
      this.parent[curr] = root;
      curr = nxt;
    }
    return root;
  }

  canFormBond(i: number, j: number): boolean {
    if (i === j) return false;

    // Rule 1: Maximum 2 connections per particle strictly enforced
    if (this.bondsCount[i] >= 2 || this.bondsCount[j] >= 2) {
      return false;
    }

    // No duplicate direct bonds
    if (this.adjacency[i].has(j)) {
      return false;
    }

    const rootI = this.find(i);
    const rootJ = this.find(j);

    if (rootI === rootJ) {
      // Both particles belong to the same cluster.
      // If the cluster has 3 particles (open triangle), connecting them completes the closed 3-particle baryon.
      // After this, each of the 3 particles will have at most 2 connections (all 2),
      // and the cluster stays strictly at 3 particles.
      return this.clusterSize[rootI] === 3;
    }

    // Different clusters:
    // Rule 2: Connecting the second body locks the particles into a three particle baryon ONLY.
    // The merged cluster cannot exceed 3 particles!
    const mergedSize = this.clusterSize[rootI] + this.clusterSize[rootJ];
    if (mergedSize > 3) {
      return false;
    }

    return true;
  }

  addBond(i: number, j: number): boolean {
    if (!this.canFormBond(i, j)) return false;

    this.bondsCount[i]++;
    this.bondsCount[j]++;
    this.adjacency[i].add(j);
    this.adjacency[j].add(i);

    const rootI = this.find(i);
    const rootJ = this.find(j);

    if (rootI !== rootJ) {
      this.parent[rootJ] = rootI;
      this.clusterSize[rootI] += this.clusterSize[rootJ];
    }

    return true;
  }

  getHadronType(i: number): 'free' | 'meson' | 'baryon' {
    const root = this.find(i);
    const size = this.clusterSize[root];
    if (size === 3) return 'baryon';
    if (size === 2) return 'meson';
    return 'free';
  }

  isBaryonBond(i: number, j: number): boolean {
    const root = this.find(i);
    return this.clusterSize[root] === 3;
  }
}

export const DEFAULT_PARAMS: SimulationParams = {
  width: 1200,
  height: 800,
  depth: 600,
  maxParticles: 1500,
  initialParticles: 800,
  cellSize: 80.0,
  g0: 5.0, // Re(G): Microscopic Gravitational Coupling
  sigmaColor: 18.0, // Im(G): Color Confinement String Tension
  r0: 18.0, // Asymptotic Freedom Scale
  epsilon: 4.0, // Softening Parameter
  thetaBH: 0.6, // Barnes-Hut Opening Angle Threshold
  kElectro: 60.0, // Emergent U(1) Electromagnetism from Metric Phase
  restMassEnergy: 100.0, // Energy cost to manifest mass from vacuum
  frictionCoeff: 0.992, // Micro-Thermodynamic friction
  particleMass: 2.0,
  particleRadius: 2.5,
  maxTrailPoints: 64, // Capacity per particle
  trailLength: 20, // N frames to draw
  trailColorMode: 'particle',
  collisionMode: 'elastic', // 'elastic' | 'inelastic' | 'none'
  collisionRestitution: 1.0, // 1.0 = perfectly elastic
  lambdaC: 1.0, // Complexification Parameter
  cguiMode: 'emergence', // 'emergence' vs 'axiomatic'
  cguiStage: 'CGUI-6', // CGUI-0 to CGUI-6
  compactificationRy: 12.0, // Internal K_4 radius
  vectorScale: 0.6, // Force field arrow length scale
  vectorColorMode: 'combined', // 'combined' | 'magnitude' | 'direction'
  highEnergyThreshold: 80.0, // Kinetic energy exchange threshold for alerts
  enable3DPhysics: true, // 3D z-axis coordinate evolution
};

export const COLOR_MAP: Record<number, [number, number, number]> = {
  0: [255, 80, 80], // Red Color Charge (+1 e)
  1: [80, 255, 80], // Green Color Charge (-1 e)
  2: [80, 150, 255], // Blue Color Charge (0 e)
};

export const COLOR_NAMES: Record<number, string> = {
  0: 'Red Color Charge (+1e)',
  1: 'Green Color Charge (-1e)',
  2: 'Blue Color Charge (0e)',
};

/**
 * Distinct, high-contrast vibrant colors for all 6 quark flavors:
 * 0: Up (#ef4444 Crimson)
 * 1: Down (#3b82f6 Azure)
 * 2: Strange (#10b981 Emerald)
 * 3: Charm (#f59e0b Amber)
 * 4: Bottom (#8b5cf6 Purple)
 * 5: Top (#ec4899 Rose Pink)
 */
export const QUARK_FLAVOR_COLORS: Record<number, [number, number, number]> = {
  0: [239, 68, 68],
  1: [59, 130, 246],
  2: [16, 185, 129],
  3: [245, 158, 11],
  4: [139, 92, 246],
  5: [236, 72, 153],
};

export const QUARK_FLAVOR_HEX: Record<number, string> = {
  0: '#ef4444',
  1: '#3b82f6',
  2: '#10b981',
  3: '#f59e0b',
  4: '#8b5cf6',
  5: '#ec4899',
};

/**
 * Color-codes the 4 extra compact spatial dimensions (y1, y2, y3, y4) in K_4 (D5..D8).
 * Uses hyperspherical coordinates to map internal manifold orientation to a unique chromatic signature:
 * - Angle (y1, y2) -> Hue (0 to 360 deg)
 * - Hyper-latitude y3 -> Saturation (55% to 100%)
 * - Phase y4 -> Lightness (38% to 72%)
 */
export function get8DCompactColor(
  y1: number,
  y2: number,
  y3: number,
  y4: number,
  ry = 12.0
): [number, number, number] {
  const angle12 = Math.atan2(y2, y1);
  const hue = ((angle12 * 180 / Math.PI) + 360) % 360;

  const normY3 = Math.max(-1, Math.min(1, y3 / Math.max(0.1, ry)));
  const sat = 0.55 + 0.45 * (normY3 * 0.5 + 0.5);

  const normY4 = Math.max(-1, Math.min(1, y4 / Math.max(0.1, ry)));
  const light = 0.38 + 0.34 * (normY4 * 0.5 + 0.5);

  return hslToRgb(hue / 360, sat, light);
}

export function get8DCompactHex(
  y1: number,
  y2: number,
  y3: number,
  y4: number,
  ry = 12.0
): string {
  const [r, g, b] = get8DCompactColor(y1, y2, y3, y4, ry);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (t: number) => {
      let val = t;
      if (val < 0) val += 1;
      if (val > 1) val -= 1;
      if (val < 1 / 6) return p + (q - p) * 6 * val;
      if (val < 1 / 2) return q;
      if (val < 2 / 3) return p + (q - p) * (2 / 3 - val) * 6;
      return p;
    };
    r = hue2rgb(h + 1 / 3);
    g = hue2rgb(h);
    b = hue2rgb(h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export class QuadNode {
  x: number;
  y: number;
  w: number;
  h: number;
  depth: number;
  mass: number = 0.0;
  comX: number = 0.0;
  comY: number = 0.0;
  particleIdx: number = -1;
  children: QuadNode[] | null = null;
  isLeaf: boolean = true;

  constructor(x: number, y: number, w: number, h: number, depth = 0) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.depth = depth;
  }

  insert(
    pIdx: number,
    posX: Float64Array,
    posY: Float64Array,
    massArr: Float64Array,
    maxDepth = 20,
    minSize = 1e-4
  ): void {
    const px = posX[pIdx];
    const py = posY[pIdx];
    const pMass = massArr[pIdx];

    if (!Number.isFinite(px) || !Number.isFinite(py) || pMass <= 0) return;

    if (this.mass === 0.0 && this.isLeaf && this.particleIdx === -1) {
      this.particleIdx = pIdx;
      this.mass = pMass;
      this.comX = px;
      this.comY = py;
      return;
    }

    if (this.isLeaf) {
      const existingIdx = this.particleIdx;
      const samePosition =
        existingIdx >= 0 &&
        Math.abs(posX[existingIdx] - px) < 1e-4 &&
        Math.abs(posY[existingIdx] - py) < 1e-4;

      if (
        existingIdx < 0 ||
        samePosition ||
        this.depth >= maxDepth ||
        Math.max(this.w, this.h) <= minSize
      ) {
        const newMass = this.mass + pMass;
        if (newMass > 0) {
          this.comX = (this.comX * this.mass + px * pMass) / newMass;
          this.comY = (this.comY * this.mass + py * pMass) / newMass;
        }
        this.mass = newMass;
        this.particleIdx = -1;
        return;
      }

      this.subdivide();
      this.particleIdx = -1;
      if (existingIdx >= 0 && this.children) {
        const cIdx = this.getQuadrant(posX[existingIdx], posY[existingIdx]);
        this.children[cIdx].insert(existingIdx, posX, posY, massArr, maxDepth, minSize);
      }
    }

    const newMass = this.mass + pMass;
    if (newMass > 0) {
      this.comX = (this.comX * this.mass + px * pMass) / newMass;
      this.comY = (this.comY * this.mass + py * pMass) / newMass;
    }
    this.mass = newMass;

    if (this.children) {
      const childIdx = this.getQuadrant(px, py);
      this.children[childIdx].insert(pIdx, posX, posY, massArr, maxDepth, minSize);
    }
  }

  subdivide(): void {
    const hw = this.w / 2.0;
    const hh = this.h / 2.0;
    const nextDepth = this.depth + 1;
    this.children = [
      new QuadNode(this.x, this.y, hw, hh, nextDepth),
      new QuadNode(this.x + hw, this.y, hw, hh, nextDepth),
      new QuadNode(this.x, this.y + hh, hw, hh, nextDepth),
      new QuadNode(this.x + hw, this.y + hh, hw, hh, nextDepth),
    ];
    this.isLeaf = false;
  }

  getQuadrant(px: number, py: number): number {
    const midX = this.x + this.w / 2.0;
    const midY = this.y + this.h / 2.0;
    if (py < midY) {
      return px >= midX ? 1 : 0;
    } else {
      return px >= midX ? 3 : 2;
    }
  }

  computeGravityForce(
    pIdx: number,
    px: number,
    py: number,
    pMass: number,
    theta: number,
    G: number,
    eps: number,
    out: { fx: number; fy: number; vg: number }
  ): void {
    if (this.mass === 0.0 || (this.isLeaf && this.particleIdx === pIdx)) {
      return;
    }

    const dx = this.comX - px;
    const dy = this.comY - py;
    const dSq = dx * dx + dy * dy + eps * eps;
    const d = Math.sqrt(dSq);
    const s = Math.max(this.w, this.h);

    if (this.isLeaf || s / d < theta) {
      const fMag = (G * pMass * this.mass) / dSq;
      const vG = -(G * pMass * this.mass) / d;
      out.fx += (fMag * dx) / d;
      out.fy += (fMag * dy) / d;
      out.vg += vG;
    } else if (this.children) {
      for (let i = 0; i < 4; i++) {
        this.children[i].computeGravityForce(pIdx, px, py, pMass, theta, G, eps, out);
      }
    }
  }

  collectNodes(list: QuadTreeNodeData[], maxCollectedDepth = 5): void {
    if (this.mass > 0 && this.depth <= maxCollectedDepth) {
      list.push({
        x: this.x,
        y: this.y,
        w: this.w,
        h: this.h,
        depth: this.depth,
        mass: this.mass,
        comX: this.comX,
        comY: this.comY,
        isLeaf: this.isLeaf,
      });
    }
    if (this.children) {
      for (let i = 0; i < 4; i++) {
        this.children[i].collectNodes(list, maxCollectedDepth);
      }
    }
  }
}

export class PhysicsEngine {
  params: SimulationParams;

  // Particle dynamic state arrays (3D)
  posX: Float64Array;
  posY: Float64Array;
  posZ: Float64Array;
  velX: Float64Array;
  velY: Float64Array;
  velZ: Float64Array;
  mass: Float64Array;
  radius: Float64Array;
  colorCharge: Int32Array; // 0=Red, 1=Green, 2=Blue
  quarkFlavor: Uint8Array; // 0=up, 1=down, 2=strange, 3=charm, 4=bottom, 5=top
  qEm: Float64Array; // Emergent Electric Charge (-1, 0, +1)

  // 8D extra compact spatial coordinates on K_4 (D5..D8)
  extraDimY1: Float64Array;
  extraDimY2: Float64Array;
  extraDimY3: Float64Array;
  extraDimY4: Float64Array;

  // Real-time thermodynamic entropy density calculator
  entropyCalculator: EntropyHeatmapCalculator;

  trailHistoryX: Float64Array; // [MAX_PARTICLES * MAX_TRAIL_POINTS]
  trailHistoryY: Float64Array; // [MAX_PARTICLES * MAX_TRAIL_POINTS]
  trailHistoryZ: Float64Array; // [MAX_PARTICLES * MAX_TRAIL_POINTS]
  trailHead: Int32Array;
  particleBonds: Int32Array;

  numParticles: number = 0;
  pairProductionsCount: number = 0;
  collisionCount: number = 0;
  eInitial: number | null = null;
  fluxTubes: FluxTube[] = [];

  // Collision tracking & notification events
  collisionLogs: CollisionEvent[] = [];
  collisionHighlights: CollisionHighlight[] = [];
  recentEnergySamples: EnergyFrameSample[] = [];
  onHighEnergyCollision?: (event: CollisionEvent) => void;
  totalFrameCount: number = 0;

  // Spatial grid
  gridW: number = 0;
  gridH: number = 0;
  gridHeads: Int32Array;
  gridNext: Int32Array;

  // Accel scratchpads
  accelX: Float64Array;
  accelY: Float64Array;
  accelZ: Float64Array;

  // Quadtree root cache (backed by d3-quadtree)
  bhRoot: D3BarnesHutTree | QuadNode | null = null;

  // Hadron Topology & Baryon Tracking
  hadronMgr: HadronTopologyManager | null = null;
  baryonCount: number = 0;
  mesonCount: number = 0;

  // Statistics
  eKin: number = 0;
  eG: number = 0;
  eEM: number = 0;
  eC: number = 0;
  eRest: number = 0;
  eTotal: number = 0;
  eDrift: number = 0;

  // CGUI 8D Module & Conservation Diagnostics
  cgui8d: CGUI8DModule;
  currentThermoConservation: ThermodynamicConservation | null = null;

  // FPS calculation
  lastFrameTime: number = performance.now();
  fps: number = 60.0;
  frameCount: number = 0;
  fpsAccumTime: number = 0;

  constructor(customParams?: Partial<SimulationParams>) {
    this.params = { ...DEFAULT_PARAMS, ...customParams };
    this.cgui8d = new CGUI8DModule(this.params.lambdaC);
    this.cgui8d.setStage(this.params.cguiStage);
    this.cgui8d.setCompactificationRadius(this.params.compactificationRy);
    const max = this.params.maxParticles;

    this.posX = new Float64Array(max);
    this.posY = new Float64Array(max);
    this.posZ = new Float64Array(max);
    this.velX = new Float64Array(max);
    this.velY = new Float64Array(max);
    this.velZ = new Float64Array(max);
    this.mass = new Float64Array(max);
    this.radius = new Float64Array(max);
    this.colorCharge = new Int32Array(max);
    this.quarkFlavor = new Uint8Array(max);
    this.qEm = new Float64Array(max);
    this.extraDimY1 = new Float64Array(max);
    this.extraDimY2 = new Float64Array(max);
    this.extraDimY3 = new Float64Array(max);
    this.extraDimY4 = new Float64Array(max);
    this.entropyCalculator = new EntropyHeatmapCalculator(this.params.width, this.params.height);
    this.trailHistoryX = new Float64Array(max * this.params.maxTrailPoints);
    this.trailHistoryY = new Float64Array(max * this.params.maxTrailPoints);
    this.trailHistoryZ = new Float64Array(max * this.params.maxTrailPoints);
    this.trailHead = new Int32Array(max);
    this.particleBonds = new Int32Array(max);

    this.accelX = new Float64Array(max);
    this.accelY = new Float64Array(max);
    this.accelZ = new Float64Array(max);

    this.gridW = Math.ceil(this.params.width / this.params.cellSize);
    this.gridH = Math.ceil(this.params.height / this.params.cellSize);
    this.gridHeads = new Int32Array(this.gridW * this.gridH);
    this.gridNext = new Int32Array(max);

    this.resetSimulation();
  }

  getQuarkFlavor(idx: number): QuarkFlavor {
    const f = this.quarkFlavor[idx];
    switch (f) {
      case 0:
        return 'up';
      case 1:
        return 'down';
      case 2:
        return 'strange';
      case 3:
        return 'charm';
      case 4:
        return 'bottom';
      case 5:
        return 'top';
      default:
        return 'up';
    }
  }

  getQuarkFlavorSymbol(idx: number): string {
    const f = this.quarkFlavor[idx];
    return ['u', 'd', 's', 'c', 'b', 't'][f] ?? 'u';
  }

  resetSimulation(particleCount?: number): void {
    const count = Math.min(
      particleCount ?? this.params.initialParticles,
      this.params.maxParticles
    );
    this.numParticles = count;
    this.pairProductionsCount = 0;
    this.collisionCount = 0;
    this.eInitial = null;
    this.fluxTubes = [];

    const w = this.params.width;
    const h = this.params.height;
    const depth = this.params.depth || 600;
    const pMass = this.params.particleMass;
    const pRad = this.params.particleRadius;

    for (let i = 0; i < count; i++) {
      this.posX[i] = Math.random() * (w - 40) + 20;
      this.posY[i] = Math.random() * (h - 40) + 20;
      this.posZ[i] = (Math.random() - 0.5) * (depth - 100);
      this.velX[i] = (Math.random() - 0.5) * 35.0;
      this.velY[i] = (Math.random() - 0.5) * 35.0;
      this.velZ[i] = (Math.random() - 0.5) * 20.0;
      this.mass[i] = pMass;
      this.radius[i] = pRad;

      const c = Math.floor(Math.random() * 3); // 0, 1, 2
      this.colorCharge[i] = c;
      this.qEm[i] = c === 0 ? 1.0 : c === 1 ? -1.0 : 0.0;

      // Real quark flavor distribution:
      // Gen 1 (up/down) ~ 60%, Gen 2 (strange/charm) ~ 25%, Gen 3 (bottom/top) ~ 15%
      const rand = Math.random();
      let flavorId = 0;
      if (rand < 0.35) flavorId = 0; // Up
      else if (rand < 0.65) flavorId = 1; // Down
      else if (rand < 0.80) flavorId = 2; // Strange
      else if (rand < 0.90) flavorId = 3; // Charm
      else if (rand < 0.96) flavorId = 4; // Bottom
      else flavorId = 5; // Top
      this.quarkFlavor[i] = flavorId;

      // Initialize 8D extra compact spatial coordinates on K_4 (radius Ry)
      const ry = this.params.compactificationRy;
      const phi1 = (i / count) * Math.PI * 2 + (flavorId * Math.PI) / 3;
      const phi2 = Math.random() * Math.PI * 2;
      const cos2 = Math.cos(phi2);
      const sin2 = Math.sin(phi2);
      this.extraDimY1[i] = ry * Math.cos(phi1) * cos2;
      this.extraDimY2[i] = ry * Math.sin(phi1) * cos2;
      this.extraDimY3[i] = ry * Math.cos(phi2 + phi1) * sin2;
      this.extraDimY4[i] = ry * Math.sin(phi2 + phi1) * sin2;

      this.trailHead[i] = 0;
      for (let t = 0; t < this.params.maxTrailPoints; t++) {
        const offset = i * this.params.maxTrailPoints + t;
        this.trailHistoryX[offset] = this.posX[i];
        this.trailHistoryY[offset] = this.posY[i];
        this.trailHistoryZ[offset] = this.posZ[i];
      }
    }
  }

  spawnParticle(
    x: number,
    y: number,
    vx = 0,
    vy = 0,
    colorOverride?: number,
    massOverride?: number,
    z?: number,
    vz = 0,
    flavorOverride?: QuarkFlavor | number
  ): number | null {
    if (this.numParticles >= this.params.maxParticles) return null;
    const idx = this.numParticles;
    this.posX[idx] = Math.max(5, Math.min(this.params.width - 5, x));
    this.posY[idx] = Math.max(5, Math.min(this.params.height - 5, y));
    this.posZ[idx] = z ?? (Math.random() - 0.5) * 100;
    this.velX[idx] = vx;
    this.velY[idx] = vy;
    this.velZ[idx] = vz;
    const m = massOverride ?? this.params.particleMass;
    this.mass[idx] = m;
    this.radius[idx] = Math.cbrt(m / this.params.particleMass) * this.params.particleRadius;

    const c = colorOverride ?? Math.floor(Math.random() * 3);
    this.colorCharge[idx] = c;
    this.qEm[idx] = c === 0 ? 1.0 : c === 1 ? -1.0 : 0.0;

    let fId = 0;
    if (flavorOverride !== undefined) {
      if (typeof flavorOverride === 'number') {
        fId = Math.max(0, Math.min(5, flavorOverride));
      } else {
        const map: Record<QuarkFlavor, number> = { up: 0, down: 1, strange: 2, charm: 3, bottom: 4, top: 5 };
        fId = map[flavorOverride] ?? 0;
      }
    } else {
      fId = c === 0 ? 0 : c === 1 ? 1 : 2;
    }
    this.quarkFlavor[idx] = fId;

    // Initialize 8D extra compact spatial coordinates on K_4 (radius Ry)
    const ry = this.params.compactificationRy;
    const phi1 = Math.random() * Math.PI * 2 + (fId * Math.PI) / 3;
    const phi2 = Math.random() * Math.PI * 2;
    const cos2 = Math.cos(phi2);
    const sin2 = Math.sin(phi2);
    this.extraDimY1[idx] = ry * Math.cos(phi1) * cos2;
    this.extraDimY2[idx] = ry * Math.sin(phi1) * cos2;
    this.extraDimY3[idx] = ry * Math.cos(phi2 + phi1) * sin2;
    this.extraDimY4[idx] = ry * Math.sin(phi2 + phi1) * sin2;

    this.trailHead[idx] = 0;
    for (let t = 0; t < this.params.maxTrailPoints; t++) {
      const offset = idx * this.params.maxTrailPoints + t;
      this.trailHistoryX[offset] = this.posX[idx];
      this.trailHistoryY[offset] = this.posY[idx];
      this.trailHistoryZ[offset] = this.posZ[idx];
    }

    this.numParticles++;
    return idx;
  }

  buildQuadTree(): D3BarnesHutTree {
    const n = this.numParticles;
    const points: BHPoint[] = [];
    for (let i = 0; i < n; i++) {
      points.push({
        x: this.posX[i],
        y: this.posY[i],
        mass: this.mass[i],
        idx: i,
      });
    }
    const tree = new D3BarnesHutTree(points, this.params.width, this.params.height);
    this.bhRoot = tree;
    return tree;
  }

  buildSpatialGrid(): void {
    const totalCells = this.gridW * this.gridH;
    this.gridHeads.fill(-1, 0, totalCells);

    const n = this.numParticles;
    const cs = this.params.cellSize;
    const gw = this.gridW;
    const gh = this.gridH;

    for (let i = 0; i < n; i++) {
      let cx = Math.floor(this.posX[i] / cs);
      let cy = Math.floor(this.posY[i] / cs);
      if (cx < 0) cx = 0;
      else if (cx >= gw) cx = gw - 1;
      if (cy < 0) cy = 0;
      else if (cy >= gh) cy = gh - 1;

      const cellIdx = cy * gw + cx;
      this.gridNext[i] = this.gridHeads[cellIdx];
      this.gridHeads[cellIdx] = i;
    }
  }

  getShortRangePairs(): { iList: number[]; jList: number[] } {
    const iList: number[] = [];
    const jList: number[] = [];
    const gw = this.gridW;
    const gh = this.gridH;

    // Neighbor offsets: self cell, and (1,0), (0,1), (1,1), (-1,1)
    const offsets = [
      [1, 0],
      [0, 1],
      [1, 1],
      [-1, 1],
    ];

    for (let cy = 0; cy < gh; cy++) {
      for (let cx = 0; cx < gw; cx++) {
        const cIdx = cy * gw + cx;
        const p1 = this.gridHeads[cIdx];
        if (p1 === -1) continue;

        // Collect all members in current cell
        const members: number[] = [];
        let curr: number = p1;
        while (curr !== -1) {
          members.push(curr);
          curr = this.gridNext[curr];
        }

        const mLen = members.length;
        // Internal pairs
        for (let a = 0; a < mLen; a++) {
          for (let b = a + 1; b < mLen; b++) {
            iList.push(members[a]);
            jList.push(members[b]);
          }
        }

        // Neighbor cells
        for (let o = 0; o < 4; o++) {
          const ncx = cx + offsets[o][0];
          const ncy = cy + offsets[o][1];
          if (ncx >= 0 && ncx < gw && ncy >= 0 && ncy < gh) {
            const ncIdx = ncy * gw + ncx;
            let nCurr = this.gridHeads[ncIdx];
            while (nCurr !== -1) {
              for (let a = 0; a < mLen; a++) {
                iList.push(members[a]);
                jList.push(nCurr);
              }
              nCurr = this.gridNext[nCurr];
            }
          }
        }
      }
    }

    return { iList, jList };
  }

  computeHybridForces(
    root: D3BarnesHutTree | QuadNode,
    iIndices: number[],
    jIndices: number[]
  ): void {
    const n = this.numParticles;
    this.accelX.fill(0, 0, n);
    this.accelY.fill(0, 0, n);
    this.accelZ.fill(0, 0, n);
    this.particleBonds.fill(0, 0, n);

    let sumEG = 0.0;
    let sumEEM = 0.0;
    let sumEC = 0.0;

    const theta = this.params.thetaBH;
    const g0 = this.params.g0;
    const eps = this.params.epsilon;
    const lambdaC = this.params.lambdaC;

    // 1. Long-Range Real Sector (Gravity via Barnes-Hut with d3-quadtree)
    const outScratch = { fx: 0, fy: 0, vg: 0 };
    for (let i = 0; i < n; i++) {
      outScratch.fx = 0;
      outScratch.fy = 0;
      outScratch.vg = 0;
      root.computeGravityForce(
        i,
        this.posX[i],
        this.posY[i],
        this.mass[i],
        theta,
        g0,
        eps,
        outScratch
      );
      this.accelX[i] += outScratch.fx / this.mass[i];
      this.accelY[i] += outScratch.fy / this.mass[i];
      sumEG += outScratch.vg;
    }
    this.eG = sumEG / 2.0; // Correct double-counting

    const kEM = this.params.kElectro * (lambdaC * lambdaC);
    const kC = this.params.sigmaColor * (lambdaC * lambdaC);
    const r0 = this.params.r0;
    const epsSq = eps * eps;

    this.fluxTubes = [];
    const pairCount = iIndices.length;
    if (pairCount === 0) {
      this.eEM = 0;
      this.eC = 0;
      return;
    }

    // Scratch structures for short-range forces
    const fShortNet = new Float64Array(pairCount);
    const dxArr = new Float64Array(pairCount);
    const dyArr = new Float64Array(pairCount);
    const dzArr = new Float64Array(pairCount);
    const rDistArr = new Float64Array(pairCount);

    // Filter valid color bonds candidate
    interface ColorCandidate {
      pairIdx: number;
      i: number;
      j: number;
      r: number;
    }
    const validColorCandidates: ColorCandidate[] = [];

    // 2. Pairwise Short-Range Interaction
    for (let p = 0; p < pairCount; p++) {
      const i = iIndices[p];
      const j = jIndices[p];

      const dx = this.posX[j] - this.posX[i];
      const dy = this.posY[j] - this.posY[i];
      const dz = this.params.enable3DPhysics ? (this.posZ[j] - this.posZ[i]) : 0;
      const rSq = dx * dx + dy * dy + dz * dz + epsSq;
      const r = Math.sqrt(rSq);

      dxArr[p] = dx;
      dyArr[p] = dy;
      dzArr[p] = dz;
      rDistArr[p] = r;

      // Imaginary Sector -> U(1) Electromagnetism
      const qProd = this.qEm[i] * this.qEm[j];
      const fEm = (-kEM * qProd) / rSq;
      sumEEM += (kEM * qProd) / r;
      fShortNet[p] = fEm;

      // Imaginary Sector -> SU(3) Monogamous Color Confinement candidate
      if (kC > 0 && this.colorCharge[i] !== this.colorCharge[j] && r > 0) {
        validColorCandidates.push({ pairIdx: p, i, j, r });
      }
    }

    // Enforce nearest-neighbor hadronization locking
    const isEmergence = this.params.cguiMode === 'emergence';
    const stage = this.params.cguiStage;
    const isStageColorActive = stage !== 'CGUI-0' && stage !== 'CGUI-1';

    const hadronMgr = new HadronTopologyManager(n);

    if (kC > 0 && isStageColorActive && validColorCandidates.length > 0) {
      validColorCandidates.sort((a, b) => a.r - b.r);

      for (let c = 0; c < validColorCandidates.length; c++) {
        const item = validColorCandidates[c];
        const i = item.i;
        const j = item.j;

        // User Directive: Baryons must be limited to a maximum of two connections to the surround particles not more.
        // If a baryon has more than one connection, it must only be allowed to connect the second body which locks the particles into a three particle baryon only.
        if (hadronMgr.canFormBond(i, j)) {
          hadronMgr.addBond(i, j);
          this.particleBonds[i] = hadronMgr.bondsCount[i];
          this.particleBonds[j] = hadronMgr.bondsCount[j];

          const isBaryon = hadronMgr.isBaryonBond(i, j);

          if (item.r > r0) {
            let tension = kC;
            let vC = 0;

            if (isEmergence) {
              // Confinement emerges from non-Abelian color flux collimation
              const { fluxCollimation, selfInteraction } =
                this.cgui8d.computeNonAbelianColorSelfInteraction(item.r);
              // Baryon 3-body Y/triangle junction enhancement
              const collimationFactor = isBaryon ? fluxCollimation * 1.15 : fluxCollimation;
              tension = kC * collimationFactor;
              fShortNet[item.pairIdx] += -tension;
              const dr = item.r - r0;
              vC = tension * dr + selfInteraction * 0.05;
            } else {
              // Axiomatic reference
              fShortNet[item.pairIdx] += -kC;
              const dr = item.r - r0;
              vC = 0.5 * kC * (dr * dr);
            }

            sumEC += vC;
            this.fluxTubes.push({
              i,
              j,
              r: item.r,
              vC,
              isBaryonBond: isBaryon,
            });
          }
        }
      }
    }

    this.hadronMgr = hadronMgr;
    let bCount = 0;
    let mCount = 0;
    const countedRoots = new Set<number>();
    for (let i = 0; i < n; i++) {
      const root = hadronMgr.find(i);
      if (!countedRoots.has(root)) {
        countedRoots.add(root);
        if (hadronMgr.clusterSize[root] === 3) {
          bCount++;
        } else if (hadronMgr.clusterSize[root] === 2) {
          mCount++;
        }
      }
    }
    this.baryonCount = bCount;
    this.mesonCount = mCount;

    this.eEM = sumEEM;
    this.eC = sumEC;

    // Apply short range forces to accelerations
    for (let p = 0; p < pairCount; p++) {
      const fNet = fShortNet[p];
      if (fNet === 0) continue;

      const i = iIndices[p];
      const j = jIndices[p];
      const r = rDistArr[p];
      const fx = fNet * (dxArr[p] / r);
      const fy = fNet * (dyArr[p] / r);
      const fz = fNet * (dzArr[p] / r);

      const mi = this.mass[i];
      const mj = this.mass[j];

      this.accelX[i] += fx / mi;
      this.accelY[i] += fy / mi;
      this.accelZ[i] += fz / mi;
      this.accelX[j] -= fx / mj;
      this.accelY[j] -= fy / mj;
      this.accelZ[j] -= fz / mj;
    }
  }

  processStringBreaking(): void {
    const creationCost = 2.0 * this.params.restMassEnergy;
    const maxP = this.params.maxParticles;

    for (let k = 0; k < this.fluxTubes.length; k++) {
      const tube = this.fluxTubes[k];
      if (tube.vC > creationCost && this.numParticles < maxP - 2) {
        const i = tube.i;
        const j = tube.j;

        const posI = Vector.create(this.posX[i], this.posY[i]);
        const posJ = Vector.create(this.posX[j], this.posY[j]);
        const delta = Vector.sub(posJ, posI);
        const r = Vector.magnitude(delta);
        if (r < 1e-4) continue;

        const normal = Vector.normalise(delta);
        const mid = Vector.mult(Vector.add(posI, posJ), 0.5);

        // Remaining potential energy converts to kinetic drift
        const eK = tube.vC - creationCost;
        const vExp = Math.sqrt(Math.max(0, eK / this.params.particleMass));
        const vEject = Vector.mult(normal, vExp);

        const idx1 = this.numParticles;
        const idx2 = this.numParticles + 1;

        const sep = Vector.mult(normal, 3.0);
        const p1 = Vector.sub(mid, sep);
        const p2 = Vector.add(mid, sep);

        this.posX[idx1] = p1.x;
        this.posY[idx1] = p1.y;
        this.posX[idx2] = p2.x;
        this.posY[idx2] = p2.y;

        // Conservation of Momentum via Matter.Vector
        const velI = Vector.create(this.velX[i], this.velY[i]);
        const velJ = Vector.create(this.velX[j], this.velY[j]);
        const vcm = Vector.mult(Vector.add(velI, velJ), 0.5);

        const vNew1 = Vector.sub(vcm, vEject);
        const vNew2 = Vector.add(vcm, vEject);

        this.velX[idx1] = vNew1.x;
        this.velY[idx1] = vNew1.y;
        this.velX[idx2] = vNew2.x;
        this.velY[idx2] = vNew2.y;

        this.mass[idx1] = this.params.particleMass;
        this.mass[idx2] = this.params.particleMass;
        this.radius[idx1] = this.params.particleRadius;
        this.radius[idx2] = this.params.particleRadius;

        // Color and charge polarization (opposite charges screen parents)
        this.colorCharge[idx1] = this.colorCharge[j];
        this.colorCharge[idx2] = this.colorCharge[i];
        this.qEm[idx1] = this.qEm[j];
        this.qEm[idx2] = this.qEm[i];

        // Init trails
        this.trailHead[idx1] = 0;
        this.trailHead[idx2] = 0;
        for (let t = 0; t < this.params.maxTrailPoints; t++) {
          const off1 = idx1 * this.params.maxTrailPoints + t;
          const off2 = idx2 * this.params.maxTrailPoints + t;
          this.trailHistoryX[off1] = this.posX[idx1];
          this.trailHistoryY[off1] = this.posY[idx1];
          this.trailHistoryX[off2] = this.posX[idx2];
          this.trailHistoryY[off2] = this.posY[idx2];
        }

        this.numParticles += 2;
        this.pairProductionsCount++;
        break; // Break one string per frame for numerical stability
      }
    }
  }

  handleParticleCollisions(iIndices: number[], jIndices: number[]): void {
    const mode = this.params.collisionMode;
    if (mode === 'none') return;

    const pairCount = iIndices.length;
    if (pairCount === 0 || this.numParticles <= 1) return;

    const enable3D = this.params.enable3DPhysics;
    const threshold = this.params.highEnergyThreshold;

    if (mode === 'elastic') {
      const e = this.params.collisionRestitution;

      for (let p = 0; p < pairCount; p++) {
        const i = iIndices[p];
        const j = jIndices[p];

        const minDist = this.radius[i] + this.radius[j];
        const dx = this.posX[j] - this.posX[i];
        const dy = this.posY[j] - this.posY[i];
        const dz = enable3D ? (this.posZ[j] - this.posZ[i]) : 0;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < minDist && dist > 1e-4) {
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          const relVelX = this.velX[i] - this.velX[j];
          const relVelY = this.velY[i] - this.velY[j];
          const relVelZ = this.velZ[i] - this.velZ[j];
          const vNormal = relVelX * nx + relVelY * ny + relVelZ * nz;

          // Only apply impulse if particles are moving toward each other
          if (vNormal > 0) {
            const m1 = this.mass[i];
            const m2 = this.mass[j];

            // 3D Elastic Collision Impulse J
            const impulseMag = ((1.0 + e) * vNormal) / (1.0 / m1 + 1.0 / m2);
            const reducedMass = (m1 * m2) / (m1 + m2);
            const energyExchange = 0.5 * reducedMass * (vNormal * vNormal);

            this.velX[i] -= (nx * impulseMag) / m1;
            this.velY[i] -= (ny * impulseMag) / m1;
            this.velZ[i] -= (nz * impulseMag) / m1;
            this.velX[j] += (nx * impulseMag) / m2;
            this.velY[j] += (ny * impulseMag) / m2;
            this.velZ[j] += (nz * impulseMag) / m2;

            this.collisionCount++;

            const midX = (this.posX[i] + this.posX[j]) * 0.5;
            const midY = (this.posY[i] + this.posY[j]) * 0.5;
            const midZ = (this.posZ[i] + this.posZ[j]) * 0.5;
            const flavorA = this.getQuarkFlavor(i);
            const flavorB = this.getQuarkFlavor(j);
            const isHigh = energyExchange >= threshold || impulseMag >= threshold;

            // Trigger 3D Spatial Audio for Quark-to-Quark Collision Tone
            const toneFreq = spatialAudio.playCollisionTone(
              midX,
              midY,
              midZ,
              impulseMag,
              energyExchange,
              flavorA,
              flavorB,
              this.velZ[i] - this.velZ[j],
              this.params.width,
              this.params.height,
              this.params.depth || 600,
              isHigh
            );

            // Detect high energy collision event
            if (isHigh) {
              const acoustic = spatialAudio.getQuarkInteractionAcoustic(flavorA, flavorB);
              const event: CollisionEvent = {
                id: `col-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                frame: this.totalFrameCount,
                timestamp: performance.now(),
                particleA: {
                  index: i,
                  color: this.colorCharge[i],
                  colorName: COLOR_NAMES[this.colorCharge[i]] ?? 'Quark',
                  flavor: flavorA,
                  flavorSymbol: this.getQuarkFlavorSymbol(i),
                  mass: m1,
                  qEm: this.qEm[i],
                  speed: Math.hypot(this.velX[i], this.velY[i], this.velZ[i]),
                },
                particleB: {
                  index: j,
                  color: this.colorCharge[j],
                  colorName: COLOR_NAMES[this.colorCharge[j]] ?? 'Quark',
                  flavor: flavorB,
                  flavorSymbol: this.getQuarkFlavorSymbol(j),
                  mass: m2,
                  qEm: this.qEm[j],
                  speed: Math.hypot(this.velX[j], this.velY[j], this.velZ[j]),
                },
                x: midX,
                y: midY,
                z: midZ,
                impulseMagnitude: impulseMag,
                energyExchange,
                collisionType: 'elastic',
                isHighEnergy: true,
                interactionName: acoustic.interactionName,
                toneFrequency: toneFreq ?? acoustic.baseFreq,
              };

              this.collisionLogs.unshift(event);
              if (this.collisionLogs.length > 50) {
                this.collisionLogs.pop();
              }

              this.collisionHighlights.push({
                id: event.id,
                x: midX,
                y: midY,
                z: midZ,
                radius: 8.0,
                maxRadius: Math.min(50.0, 18.0 + Math.sqrt(energyExchange) * 2.2),
                magnitude: impulseMag,
                color: energyExchange > threshold * 2.5 ? '#f43f5e' : '#f59e0b',
                startTime: performance.now(),
                duration: 900,
              });

              this.onHighEnergyCollision?.(event);
            }
          }

          // Positional relaxation to resolve overlap in 3D
          const overlap = minDist - dist;
          if (overlap > 0) {
            const m1 = this.mass[i];
            const m2 = this.mass[j];
            const totalM = m1 + m2;
            const ratioI = m2 / totalM;
            const ratioJ = m1 / totalM;
            const relaxation = 0.7;

            const sepX = nx * overlap * relaxation;
            const sepY = ny * overlap * relaxation;
            const sepZ = nz * overlap * relaxation;

            this.posX[i] -= sepX * ratioI;
            this.posY[i] -= sepY * ratioI;
            this.posZ[i] -= sepZ * ratioI;
            this.posX[j] += sepX * ratioJ;
            this.posY[j] += sepY * ratioJ;
            this.posZ[j] += sepZ * ratioJ;
          }
        }
      }
      return;
    }

    // Inelastic Collision (Coalescence / Merging)
    const dead = new Set<number>();

    for (let p = 0; p < pairCount; p++) {
      const i = iIndices[p];
      const j = jIndices[p];
      if (dead.has(i) || dead.has(j)) continue;

      const minDist = this.radius[i] + this.radius[j];
      const dx = this.posX[j] - this.posX[i];
      const dy = this.posY[j] - this.posY[i];
      const dz = enable3D ? (this.posZ[j] - this.posZ[i]) : 0;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < minDist && dist > 0) {
        const m1 = this.mass[i];
        const m2 = this.mass[j];
        const mNew = m1 + m2;

        const vNewX = (m1 * this.velX[i] + m2 * this.velX[j]) / mNew;
        const vNewY = (m1 * this.velY[i] + m2 * this.velY[j]) / mNew;
        const vNewZ = (m1 * this.velZ[i] + m2 * this.velZ[j]) / mNew;

        // Inelastic collision dissipated energy ΔE = E_kin,before - E_kin,after
        const eKinBefore = 0.5 * m1 * (this.velX[i] ** 2 + this.velY[i] ** 2 + this.velZ[i] ** 2) +
                           0.5 * m2 * (this.velX[j] ** 2 + this.velY[j] ** 2 + this.velZ[j] ** 2);
        const eKinAfter = 0.5 * mNew * (vNewX ** 2 + vNewY ** 2 + vNewZ ** 2);
        const energyExchange = Math.max(0, eKinBefore - eKinAfter);
        const impulseMag = Math.hypot(m1 * (vNewX - this.velX[i]), m1 * (vNewY - this.velY[i]), m1 * (vNewZ - this.velZ[i]));

        const flavorA = this.getQuarkFlavor(i);
        const flavorB = this.getQuarkFlavor(j);
        const isHigh = energyExchange >= threshold || impulseMag >= threshold;

        this.mass[i] = mNew;
        this.velX[i] = vNewX;
        this.velY[i] = vNewY;
        this.velZ[i] = vNewZ;
        this.posX[i] = (m1 * this.posX[i] + m2 * this.posX[j]) / mNew;
        this.posY[i] = (m1 * this.posY[i] + m2 * this.posY[j]) / mNew;
        this.posZ[i] = (m1 * this.posZ[i] + m2 * this.posZ[j]) / mNew;
        this.radius[i] =
          Math.cbrt(mNew / this.params.particleMass) * this.params.particleRadius;
        this.qEm[i] += this.qEm[j];

        if (m2 > m1) {
          this.colorCharge[i] = this.colorCharge[j];
          this.quarkFlavor[i] = this.quarkFlavor[j];
        }

        dead.add(j);
        this.collisionCount++;

        // Trigger 3D Spatial Audio for Coalescence Tone
        const toneFreq = spatialAudio.playCollisionTone(
          this.posX[i],
          this.posY[i],
          this.posZ[i],
          impulseMag,
          energyExchange,
          flavorA,
          flavorB,
          vNewZ,
          this.params.width,
          this.params.height,
          this.params.depth || 600,
          isHigh
        );

        // High energy coalescence alert
        if (isHigh) {
          const midX = this.posX[i];
          const midY = this.posY[i];
          const midZ = this.posZ[i];
          const acoustic = spatialAudio.getQuarkInteractionAcoustic(flavorA, flavorB);

          const event: CollisionEvent = {
            id: `col-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            frame: this.totalFrameCount,
            timestamp: performance.now(),
            particleA: {
              index: i,
              color: this.colorCharge[i],
              colorName: COLOR_NAMES[this.colorCharge[i]] ?? 'Quark',
              flavor: flavorA,
              flavorSymbol: this.getQuarkFlavorSymbol(i),
              mass: m1,
              qEm: this.qEm[i],
              speed: Math.hypot(this.velX[i], this.velY[i], this.velZ[i]),
            },
            particleB: {
              index: j,
              color: this.colorCharge[j],
              colorName: COLOR_NAMES[this.colorCharge[j]] ?? 'Quark',
              flavor: flavorB,
              flavorSymbol: this.getQuarkFlavorSymbol(j),
              mass: m2,
              qEm: this.qEm[j],
              speed: Math.hypot(this.velX[j], this.velY[j], this.velZ[j]),
            },
            x: midX,
            y: midY,
            z: midZ,
            impulseMagnitude: impulseMag,
            energyExchange,
            collisionType: 'inelastic',
            isHighEnergy: true,
            interactionName: acoustic.interactionName,
            toneFrequency: toneFreq ?? acoustic.baseFreq,
          };

          this.collisionLogs.unshift(event);
          if (this.collisionLogs.length > 50) {
            this.collisionLogs.pop();
          }

          this.collisionHighlights.push({
            id: event.id,
            x: midX,
            y: midY,
            z: midZ,
            radius: 8.0,
            maxRadius: Math.min(50.0, 20.0 + Math.sqrt(energyExchange) * 2.5),
            magnitude: impulseMag,
            color: '#a855f7',
            startTime: performance.now(),
            duration: 1000,
          });

          this.onHighEnergyCollision?.(event);
        }
      }
    }

    if (dead.size > 0) {
      let writeIdx = 0;
      const n = this.numParticles;
      const maxTrail = this.params.maxTrailPoints;

      for (let readIdx = 0; readIdx < n; readIdx++) {
        if (!dead.has(readIdx)) {
          if (writeIdx !== readIdx) {
            this.posX[writeIdx] = this.posX[readIdx];
            this.posY[writeIdx] = this.posY[readIdx];
            this.posZ[writeIdx] = this.posZ[readIdx];
            this.velX[writeIdx] = this.velX[readIdx];
            this.velY[writeIdx] = this.velY[readIdx];
            this.velZ[writeIdx] = this.velZ[readIdx];
            this.mass[writeIdx] = this.mass[readIdx];
            this.radius[writeIdx] = this.radius[readIdx];
            this.colorCharge[writeIdx] = this.colorCharge[readIdx];
            this.quarkFlavor[writeIdx] = this.quarkFlavor[readIdx];
            this.qEm[writeIdx] = this.qEm[readIdx];
            this.extraDimY1[writeIdx] = this.extraDimY1[readIdx];
            this.extraDimY2[writeIdx] = this.extraDimY2[readIdx];
            this.extraDimY3[writeIdx] = this.extraDimY3[readIdx];
            this.extraDimY4[writeIdx] = this.extraDimY4[readIdx];
            this.trailHead[writeIdx] = this.trailHead[readIdx];

            const srcOff = readIdx * maxTrail;
            const dstOff = writeIdx * maxTrail;
            for (let t = 0; t < maxTrail; t++) {
              this.trailHistoryX[dstOff + t] = this.trailHistoryX[srcOff + t];
              this.trailHistoryY[dstOff + t] = this.trailHistoryY[srcOff + t];
              this.trailHistoryZ[dstOff + t] = this.trailHistoryZ[srcOff + t];
            }
          }
          writeIdx++;
        }
      }
      this.numParticles = writeIdx;
    }
  }

  enforceBoundaries(): void {
    const n = this.numParticles;
    const w = this.params.width;
    const h = this.params.height;
    const halfDepth = (this.params.depth || 600) / 2;

    for (let i = 0; i < n; i++) {
      // Velocity clip [-200, 200]
      if (this.velX[i] < -200.0) this.velX[i] = -200.0;
      else if (this.velX[i] > 200.0) this.velX[i] = 200.0;

      if (this.velY[i] < -200.0) this.velY[i] = -200.0;
      else if (this.velY[i] > 200.0) this.velY[i] = 200.0;

      if (this.velZ[i] < -200.0) this.velZ[i] = -200.0;
      else if (this.velZ[i] > 200.0) this.velZ[i] = 200.0;

      // Position clip [5, w - 5]
      if (this.posX[i] < 5.0) {
        this.posX[i] = 5.0;
        if (this.velX[i] < 0) this.velX[i] = -this.velX[i] * 0.5;
      } else if (this.posX[i] > w - 5.0) {
        this.posX[i] = w - 5.0;
        if (this.velX[i] > 0) this.velX[i] = -this.velX[i] * 0.5;
      }

      if (this.posY[i] < 5.0) {
        this.posY[i] = 5.0;
        if (this.velY[i] < 0) this.velY[i] = -this.velY[i] * 0.5;
      } else if (this.posY[i] > h - 5.0) {
        this.posY[i] = h - 5.0;
        if (this.velY[i] > 0) this.velY[i] = -this.velY[i] * 0.5;
      }

      if (this.posZ[i] < -halfDepth) {
        this.posZ[i] = -halfDepth;
        if (this.velZ[i] < 0) this.velZ[i] = -this.velZ[i] * 0.5;
      } else if (this.posZ[i] > halfDepth) {
        this.posZ[i] = halfDepth;
        if (this.velZ[i] > 0) this.velZ[i] = -this.velZ[i] * 0.5;
      }
    }
  }

  step(dt = 0.016): void {
    this.totalFrameCount++;
    this.enforceBoundaries();
    const bhRoot = this.buildQuadTree();
    this.buildSpatialGrid();
    const { iList, jList } = this.getShortRangePairs();

    this.computeHybridForces(bhRoot, iList, jList);

    // Velocity update with microscopic friction damping
    const n = this.numParticles;
    const friction = this.params.frictionCoeff;
    const maxTrail = this.params.maxTrailPoints;

    for (let i = 0; i < n; i++) {
      this.velX[i] = (this.velX[i] + this.accelX[i] * dt) * friction;
      this.velY[i] = (this.velY[i] + this.accelY[i] * dt) * friction;
      this.velZ[i] = (this.velZ[i] + this.accelZ[i] * dt) * friction;

      this.posX[i] += this.velX[i] * dt;
      this.posY[i] += this.velY[i] * dt;
      this.posZ[i] += this.velZ[i] * dt;

      // Update trail history buffer (circular roll)
      const head = (this.trailHead[i] + 1) % maxTrail;
      this.trailHead[i] = head;
      const off = i * maxTrail + head;
      this.trailHistoryX[off] = this.posX[i];
      this.trailHistoryY[off] = this.posY[i];
      this.trailHistoryZ[off] = this.posZ[i];
    }

    // Evolve 8D extra compact spatial coordinates in K_4 (D5..D8)
    const ry = this.params.compactificationRy;
    const lC = this.params.lambdaC;
    const w1 = 1.4 + lC * 0.4;
    const w2 = 2.1 + lC * 0.6;

    for (let i = 0; i < n; i++) {
      let y1 = this.extraDimY1[i];
      let y2 = this.extraDimY2[i];
      let y3 = this.extraDimY3[i];
      let y4 = this.extraDimY4[i];

      const vx = this.velX[i] * 0.04;
      const vy = this.velY[i] * 0.04;
      const vz = this.velZ[i] * 0.04;
      const q = this.qEm[i];

      // Geodesic precession in internal 4-space
      y1 += (w1 * y2 + vx * lC) * dt;
      y2 += (-w1 * y1 + vy * lC) * dt;
      y3 += (w2 * y4 + vz * lC) * dt;
      y4 += (-w2 * y3 + q * 1.5 * lC) * dt;

      // Project back to compact 4-manifold of radius Ry
      const norm = Math.hypot(y1, y2, y3, y4) || 1e-4;
      const scale = ry / norm;
      this.extraDimY1[i] = y1 * scale;
      this.extraDimY2[i] = y2 * scale;
      this.extraDimY3[i] = y3 * scale;
      this.extraDimY4[i] = y4 * scale;
    }

    // Periodically update local entropy density heatmap stats for thermodynamic equilibrium calculation
    if (this.totalFrameCount % 3 === 0) {
      this.entropyCalculator.compute(this);
    }

    this.processStringBreaking();
    this.handleParticleCollisions(iList, jList);

    // Thermodynamics Tracking
    let sumKin = 0.0;
    for (let i = 0; i < this.numParticles; i++) {
      const vSq = this.velX[i] * this.velX[i] + this.velY[i] * this.velY[i] + this.velZ[i] * this.velZ[i];
      sumKin += 0.5 * this.mass[i] * vSq;
    }
    this.eKin = sumKin;
    this.eRest = this.numParticles * this.params.restMassEnergy;
    this.eTotal = this.eKin + this.eG + this.eEM + this.eC + this.eRest;

    if (this.eInitial === null) {
      this.eInitial = this.eTotal;
    }
    this.eDrift = this.eTotal - this.eInitial;

    // Record per-frame continuous energy contribution sample
    const sample: EnergyFrameSample = {
      frame: this.totalFrameCount,
      time: performance.now(),
      eTotal: this.eTotal,
      eKin: this.eKin,
      eG: this.eG,
      eEM: this.eEM,
      eC: this.eC,
      eRest: this.eRest,
    };
    this.recentEnergySamples.push(sample);
    if (this.recentEnergySamples.length > 300) {
      this.recentEnergySamples.shift();
    }

    // Age active collision highlights
    const now = performance.now();
    this.collisionHighlights = this.collisionHighlights.filter(
      (h) => now - h.startTime < h.duration
    );

    // Update continuous 3D spatial gravitational field in Web Audio Engine
    spatialAudio.updateGravitationalField(
      this.eG,
      this.eKin,
      this.cgui8d.compute8DMetric().ricciScalar,
      this.numParticles
    );

    // CGUI Real-Time Statistical Thermodynamics & Conservation
    this.cgui8d.setLambda(this.params.lambdaC);
    this.cgui8d.setStage(this.params.cguiStage);
    this.cgui8d.setCompactificationRadius(this.params.compactificationRy);
    this.currentThermoConservation = this.cgui8d.computeThermodynamicsAndConservation(
      this.posX,
      this.posY,
      this.velX,
      this.velY,
      this.mass,
      this.colorCharge,
      this.qEm,
      this.numParticles,
      this.eTotal,
      this.eDrift
    );

    // Frame rate measurement
    this.frameCount++;
    const elapsed = now - this.lastFrameTime;
    this.fpsAccumTime += elapsed;
    this.lastFrameTime = now;

    if (this.frameCount >= 15) {
      this.fps = (this.frameCount * 1000) / this.fpsAccumTime;
      this.frameCount = 0;
      this.fpsAccumTime = 0;
    }
  }

  getThermodynamics(): Thermodynamics {
    const metric = this.cgui8d.compute8DMetric();
    return {
      fps: this.fps,
      activeParticles: this.numParticles,
      maxParticles: this.params.maxParticles,
      pairProductionsCount: this.pairProductionsCount,
      collisionCount: this.collisionCount,
      collisionMode: this.params.collisionMode,
      trailLength: this.params.trailLength,
      lambdaC: this.params.lambdaC,
      cguiMode: this.params.cguiMode,
      cguiStage: this.params.cguiStage,
      compactificationRy: this.params.compactificationRy,
      ricciScalar: metric.ricciScalar,
      eKin: this.eKin,
      eG: this.eG,
      eEM: this.eEM,
      eC: this.eC,
      eRest: this.eRest,
      eTotal: this.eTotal,
      eInitial: this.eInitial ?? this.eTotal,
      eDrift: this.eDrift,
      entropy: this.currentThermoConservation?.entropy ?? 0,
      entropyRate: this.currentThermoConservation?.entropyRate ?? 0,
      temperature: this.currentThermoConservation?.temperature ?? 0,
      momentumMagnitude: this.currentThermoConservation?.momentumMagnitude ?? 0,
      angularMomentum: this.currentThermoConservation?.angularMomentum ?? 0,
      netElectricCharge: this.currentThermoConservation?.netElectricCharge ?? 0,
      colorNeutralityIndex: this.currentThermoConservation?.colorNeutralityIndex ?? 0,
      baryonsCount: this.baryonCount,
      mesonsCount: this.mesonCount,
      equilibriumIndex: this.entropyCalculator.stats.equilibriumIndex,
      equilibriumState: this.entropyCalculator.stats.equilibriumState,
      equilibriumLabel: this.entropyCalculator.stats.equilibriumLabel,
    };
  }

  setCGUIMode(mode: CGUIMode): void {
    this.params.cguiMode = mode;
  }

  setCGUIStage(stage: CGUIStage): void {
    this.params.cguiStage = stage;
    this.cgui8d.setStage(stage);
  }

  setCompactificationRy(ry: number): void {
    this.params.compactificationRy = ry;
    this.cgui8d.setCompactificationRadius(ry);
  }

  setLambda(lambda: number): void {
    this.params.lambdaC = lambda;
    this.cgui8d.setLambda(lambda);
  }

  getQuarkColor(idx: number): [number, number, number] {
    const f = this.quarkFlavor[idx];
    return QUARK_FLAVOR_COLORS[f] ?? [239, 68, 68];
  }

  getQuarkColorHex(idx: number): string {
    const f = this.quarkFlavor[idx];
    return QUARK_FLAVOR_HEX[f] ?? '#ef4444';
  }

  get8DColor(idx: number): [number, number, number] {
    return get8DCompactColor(
      this.extraDimY1[idx],
      this.extraDimY2[idx],
      this.extraDimY3[idx],
      this.extraDimY4[idx],
      this.params.compactificationRy
    );
  }

  get8DColorHex(idx: number): string {
    return get8DCompactHex(
      this.extraDimY1[idx],
      this.extraDimY2[idx],
      this.extraDimY3[idx],
      this.extraDimY4[idx],
      this.params.compactificationRy
    );
  }

  getParticleInfo(index: number): ParticleInfo | null {
    if (index < 0 || index >= this.numParticles) return null;
    const vx = this.velX[index];
    const vy = this.velY[index];
    const vz = this.velZ[index];
    const speed = Math.hypot(vx, vy, vz);
    const m = this.mass[index];
    const color = this.colorCharge[index];

    const hadronType = this.hadronMgr ? this.hadronMgr.getHadronType(index) : 'free';
    const baryonId = this.hadronMgr ? this.hadronMgr.find(index) : undefined;

    return {
      index,
      x: this.posX[index],
      y: this.posY[index],
      z: this.posZ[index],
      vx,
      vy,
      vz,
      speed,
      mass: m,
      radius: this.radius[index],
      colorCharge: color,
      colorName: COLOR_NAMES[color] ?? 'Unknown',
      quarkFlavor: this.getQuarkFlavor(index),
      quarkSymbol: this.getQuarkFlavorSymbol(index),
      qEm: this.qEm[index],
      kineticEnergy: 0.5 * m * (vx * vx + vy * vy + vz * vz),
      bondsCount: this.particleBonds[index],
      hadronType,
      baryonId,
      extraDimCoordinates: [
        this.extraDimY1[index],
        this.extraDimY2[index],
        this.extraDimY3[index],
        this.extraDimY4[index],
      ],
      extraDimColor: this.get8DColorHex(index),
    };
  }

  getCollisionLogs(): CollisionEvent[] {
    return this.collisionLogs;
  }

  clearCollisionLogs(): void {
    this.collisionLogs = [];
  }

  getActiveHighlights(): CollisionHighlight[] {
    return this.collisionHighlights;
  }

  getRecentEnergySamples(): EnergyFrameSample[] {
    return this.recentEnergySamples;
  }

  createSnapshot(frameIndex: number = 0): SimulationSnapshot {
    const n = this.numParticles;
    const posX = new Float32Array(n);
    const posY = new Float32Array(n);
    const velX = new Float32Array(n);
    const velY = new Float32Array(n);
    const mass = new Float32Array(n);
    const radius = new Float32Array(n);
    const colorCharge = new Int8Array(n);
    const qEm = new Int8Array(n);

    for (let i = 0; i < n; i++) {
      posX[i] = this.posX[i];
      posY[i] = this.posY[i];
      velX[i] = this.velX[i];
      velY[i] = this.velY[i];
      mass[i] = this.mass[i];
      radius[i] = this.radius[i];
      colorCharge[i] = this.colorCharge[i];
      qEm[i] = Math.round(this.qEm[i]);
    }

    const fluxTubes = this.fluxTubes.map((ft) => ({ ...ft }));

    return {
      frameIndex,
      timestamp: performance.now(),
      numParticles: n,
      posX,
      posY,
      velX,
      velY,
      mass,
      radius,
      colorCharge,
      qEm,
      fluxTubes,
      thermo: this.getThermodynamics(),
      lambdaC: this.params.lambdaC,
    };
  }

  restoreSnapshot(snap: SimulationSnapshot): void {
    const n = Math.min(snap.numParticles, this.params.maxParticles);
    this.numParticles = n;
    this.params.lambdaC = snap.lambdaC;

    for (let i = 0; i < n; i++) {
      this.posX[i] = snap.posX[i];
      this.posY[i] = snap.posY[i];
      this.velX[i] = snap.velX[i];
      this.velY[i] = snap.velY[i];
      this.mass[i] = snap.mass[i];
      this.radius[i] = snap.radius[i];
      this.colorCharge[i] = snap.colorCharge[i];
      this.qEm[i] = snap.qEm[i];

      // Update trail history head position for fluid rendering during playback
      const maxTrail = this.params.maxTrailPoints;
      const head = (this.trailHead[i] + 1) % maxTrail;
      this.trailHead[i] = head;
      this.trailHistoryX[i * maxTrail + head] = snap.posX[i];
      this.trailHistoryY[i * maxTrail + head] = snap.posY[i];
    }

    this.fluxTubes = snap.fluxTubes.map((ft) => ({ ...ft }));
    this.eKin = snap.thermo.eKin;
    this.eG = snap.thermo.eG;
    this.eEM = snap.thermo.eEM;
    this.eC = snap.thermo.eC;
    this.eRest = snap.thermo.eRest;
    this.eTotal = snap.thermo.eTotal;
    this.eDrift = snap.thermo.eDrift;
    this.pairProductionsCount = snap.thermo.pairProductionsCount;
    this.collisionCount = snap.thermo.collisionCount;
  }
}
