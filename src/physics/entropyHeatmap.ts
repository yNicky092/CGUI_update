import { PhysicsEngine } from './engine';

export interface EntropyHeatmapStats {
  gridW: number;
  gridH: number;
  minEntropy: number;
  maxEntropy: number;
  meanEntropy: number;
  entropyVariance: number;
  equilibriumIndex: number; // 0 to 100%
  equilibriumState: 'equilibrium' | 'quasi_equilibrium' | 'non_equilibrium';
  equilibriumLabel: string;
}

export class EntropyHeatmapCalculator {
  gridW: number;
  gridH: number;
  cellW: number;
  cellH: number;

  // Internal grid buffers
  cellCount: Int32Array;
  cellMass: Float32Array;
  cellPx: Float32Array;
  cellPy: Float32Array;
  cellKineticE: Float32Array;
  cellEntropy: Float32Array;
  cellEntropySmoothed: Float32Array;

  // Offscreen rendering canvas for fast GPU hardware-accelerated upsampling
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D | null;
  private offscreenImageData: ImageData | null = null;

  stats: EntropyHeatmapStats;

  constructor(width: number, height: number, gridW = 48, gridH = 32) {
    this.gridW = gridW;
    this.gridH = gridH;
    this.cellW = width / gridW;
    this.cellH = height / gridH;

    const totalCells = gridW * gridH;
    this.cellCount = new Int32Array(totalCells);
    this.cellMass = new Float32Array(totalCells);
    this.cellPx = new Float32Array(totalCells);
    this.cellPy = new Float32Array(totalCells);
    this.cellKineticE = new Float32Array(totalCells);
    this.cellEntropy = new Float32Array(totalCells);
    this.cellEntropySmoothed = new Float32Array(totalCells);

    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = gridW;
    this.offscreenCanvas.height = gridH;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: false });
    if (this.offscreenCtx) {
      this.offscreenImageData = this.offscreenCtx.createImageData(gridW, gridH);
    }

    this.stats = {
      gridW,
      gridH,
      minEntropy: 0,
      maxEntropy: 0,
      meanEntropy: 0,
      entropyVariance: 0,
      equilibriumIndex: 100,
      equilibriumState: 'equilibrium',
      equilibriumLabel: 'Equilibrium (Homogeneous Phase)',
    };
  }

  resize(width: number, height: number): void {
    this.cellW = width / this.gridW;
    this.cellH = height / this.gridH;
  }

  /**
   * Computes local phase-space entropy density across the 2D grid:
   * s_local(x,y) = n_c * [ ln( (2*pi*m*k_B*T_local) / (h^2 * n_c) ) + 2 ]
   * and calculates global spatial entropy variance to assess thermodynamic equilibrium.
   */
  compute(engine: PhysicsEngine): EntropyHeatmapStats {
    const totalCells = this.gridW * this.gridH;
    this.cellCount.fill(0);
    this.cellMass.fill(0);
    this.cellPx.fill(0);
    this.cellPy.fill(0);
    this.cellKineticE.fill(0);
    this.cellEntropy.fill(0);

    const num = engine.numParticles;
    const posX = engine.posX;
    const posY = engine.posY;
    const velX = engine.velX;
    const velY = engine.velY;
    const mass = engine.mass;

    const gw = this.gridW;
    const gh = this.gridH;
    const invCellW = 1.0 / this.cellW;
    const invCellH = 1.0 / this.cellH;
    const cellArea = this.cellW * this.cellH;

    // 1. Bin particles and accumulate mass, momentum, and total kinetic energy
    for (let i = 0; i < num; i++) {
      const gx = Math.max(0, Math.min(gw - 1, Math.floor(posX[i] * invCellW)));
      const gy = Math.max(0, Math.min(gh - 1, Math.floor(posY[i] * invCellH)));
      const cIdx = gy * gw + gx;

      const m = mass[i];
      const vx = velX[i];
      const vy = velY[i];

      this.cellCount[cIdx] += 1;
      this.cellMass[cIdx] += m;
      this.cellPx[cIdx] += m * vx;
      this.cellPy[cIdx] += m * vy;
      this.cellKineticE[cIdx] += 0.5 * m * (vx * vx + vy * vy);
    }

    let minS = Infinity;
    let maxS = -Infinity;
    let sumS = 0;
    let activeCellCount = 0;

    // 2. Compute local temperature and phase-space entropy per cell
    for (let c = 0; c < totalCells; c++) {
      const count = this.cellCount[c];
      if (count === 0) {
        this.cellEntropy[c] = 0;
        continue;
      }

      const mTotal = this.cellMass[c];
      const pX = this.cellPx[c];
      const pY = this.cellPy[c];
      const eKinTotal = this.cellKineticE[c];

      // Bulk kinetic energy of the cell
      const eBulk = 0.5 * (pX * pX + pY * pY) / Math.max(1e-4, mTotal);
      // Thermal kinetic energy (velocity dispersion about the local center of mass)
      const eThermal = Math.max(0.01, eKinTotal - eBulk);

      // Local temperature T = E_thermal / (N * k_B)
      const tLocal = eThermal / Math.max(1, count);
      // Local number density n = N / CellArea
      const nDensity = (count / cellArea) * 1000.0; // Scaled to convenient units

      // 2D Sackur-Tetrode phase-space entropy density:
      // s = n * [ ln( T_local / (n + 0.05) ) + 2.5 ]
      const entropyDensity = Math.max(
        0.0,
        nDensity * (Math.log(Math.max(0.05, tLocal / (nDensity + 0.1))) + 2.5)
      );

      this.cellEntropy[c] = entropyDensity;
      if (entropyDensity < minS) minS = entropyDensity;
      if (entropyDensity > maxS) maxS = entropyDensity;
      sumS += entropyDensity;
      activeCellCount++;
    }

    if (activeCellCount === 0 || !Number.isFinite(minS)) {
      minS = 0;
      maxS = 1;
      sumS = 0;
    }

    // 3. Apply 1-pass 3x3 binomial spatial smoothing for fluid field continuity
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const c = y * gw + x;
        let sum = this.cellEntropy[c] * 4.0;
        let weight = 4.0;

        if (x > 0) {
          sum += this.cellEntropy[c - 1] * 2.0;
          weight += 2.0;
        }
        if (x < gw - 1) {
          sum += this.cellEntropy[c + 1] * 2.0;
          weight += 2.0;
        }
        if (y > 0) {
          sum += this.cellEntropy[c - gw] * 2.0;
          weight += 2.0;
        }
        if (y < gh - 1) {
          sum += this.cellEntropy[c + gw] * 2.0;
          weight += 2.0;
        }

        this.cellEntropySmoothed[c] = sum / weight;
      }
    }

    const meanS = activeCellCount > 0 ? sumS / activeCellCount : 0;

    // 4. Calculate spatial entropy variance across populated cells
    let varianceSum = 0;
    for (let c = 0; c < totalCells; c++) {
      if (this.cellCount[c] > 0) {
        const diff = this.cellEntropy[c] - meanS;
        varianceSum += diff * diff;
      }
    }
    const variance = activeCellCount > 0 ? Math.sqrt(varianceSum / activeCellCount) : 0;

    // Relative variation coefficient V_s = sigma / (mean + epsilon)
    // In perfect thermal equilibrium: V_s is low (uniform distribution, index ~ 85-100%).
    // During non-equilibrium clumping or shockwaves: V_s is high (index ~ 20-50%).
    const relVar = variance / Math.max(0.1, meanS);
    const eqIndex = Math.max(0, Math.min(100, Math.round(100.0 * Math.exp(-0.85 * relVar))));

    let eqState: 'equilibrium' | 'quasi_equilibrium' | 'non_equilibrium' = 'equilibrium';
    let eqLabel = 'Thermodynamic Equilibrium (Homogeneous Phase)';

    if (eqIndex >= 72) {
      eqState = 'equilibrium';
      eqLabel = 'Thermodynamic Equilibrium (Uniform Maxwell-Boltzmann)';
    } else if (eqIndex >= 44) {
      eqState = 'quasi_equilibrium';
      eqLabel = 'Quasi-Equilibrium (Thermal Relaxation / Fluctuations)';
    } else {
      eqState = 'non_equilibrium';
      eqLabel = 'Non-Equilibrium (Hadronic Clumping & Field Gradients)';
    }

    this.stats = {
      gridW: gw,
      gridH: gh,
      minEntropy: minS,
      maxEntropy: Math.max(minS + 0.1, maxS),
      meanEntropy: meanS,
      entropyVariance: variance,
      equilibriumIndex: eqIndex,
      equilibriumState: eqState,
      equilibriumLabel: eqLabel,
    };

    return this.stats;
  }

  /**
   * Renders the entropy density field onto the canvas using an offscreen canvas
   * with high-quality bilinear upsampling and thermal color ramp.
   */
  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    opacity = 0.45
  ): void {
    if (!this.offscreenCtx || !this.offscreenImageData) return;

    const data = this.offscreenImageData.data;
    const totalCells = this.gridW * this.gridH;
    const minS = this.stats.minEntropy;
    const maxS = this.stats.maxEntropy;
    const range = Math.max(0.01, maxS - minS);

    // Color ramp:
    // 0.00: Transparent / Deep Midnight Blue (Vacuum)
    // 0.25: Electric Cyan (Low Entropy Density)
    // 0.50: Emerald Green (Moderate Entropy)
    // 0.75: Amber Gold (Thermal Equilibrium Peak)
    // 1.00: Coral Crimson / Fiery Magenta (High Entropy Density)
    for (let c = 0; c < totalCells; c++) {
      const s = this.cellEntropySmoothed[c];
      const norm = Math.max(0, Math.min(1.0, (s - minS) / range));
      const pixelIdx = c * 4;

      let r = 0;
      let g = 0;
      let b = 0;
      let alpha = 0;

      if (norm <= 0.02) {
        alpha = 0;
      } else if (norm < 0.25) {
        const t = norm / 0.25;
        r = Math.round(15 + t * 20);
        g = Math.round(40 + t * 160);
        b = Math.round(100 + t * 145);
        alpha = Math.round(t * 180);
      } else if (norm < 0.5) {
        const t = (norm - 0.25) / 0.25;
        r = Math.round(35 + t * 25);
        g = Math.round(200 + t * 25);
        b = Math.round(245 - t * 135);
        alpha = Math.round(180 + t * 40);
      } else if (norm < 0.75) {
        const t = (norm - 0.5) / 0.25;
        r = Math.round(60 + t * 185);
        g = Math.round(225 - t * 65);
        b = Math.round(110 - t * 80);
        alpha = Math.round(220 + t * 20);
      } else {
        const t = (norm - 0.75) / 0.25;
        r = Math.round(245 + t * 10);
        g = Math.round(160 - t * 100);
        b = Math.round(30 + t * 110);
        alpha = Math.round(240 + t * 15);
      }

      data[pixelIdx] = r;
      data[pixelIdx + 1] = g;
      data[pixelIdx + 2] = b;
      data[pixelIdx + 3] = alpha;
    }

    this.offscreenCtx.putImageData(this.offscreenImageData, 0, 0);

    // Upscale to canvas with smoothing
    ctx.save();
    ctx.globalAlpha = Math.max(0.1, Math.min(1.0, opacity));
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.offscreenCanvas, 0, 0, width, height);

    // Subtle thermal contour grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += this.cellW * 4) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += this.cellH * 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.restore();
  }
}
