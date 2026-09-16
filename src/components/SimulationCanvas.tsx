import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PhysicsEngine, COLOR_MAP, QUARK_FLAVOR_COLORS, QUARK_FLAVOR_HEX } from '../physics/engine';
import { SimulationRecorder } from '../physics/recorder';
import { ParticleInfo, QuadTreeNodeData, DimensionMode } from '../types';

interface SimulationCanvasProps {
  engine: PhysicsEngine;
  recorder?: SimulationRecorder;
  isRunning: boolean;
  selectedParticleIdx: number | null;
  onSelectParticle: (info: ParticleInfo | null) => void;
  showQuadtree: boolean;
  showGrid: boolean;
  showFluxTubes: boolean;
  showTrails: boolean;
  showHalos: boolean;
  showVelocities: boolean;
  spawnColor: number; // 0=Red, 1=Green, 2=Blue, 3=Random
  dimensionMode?: DimensionMode;
  showEntropyHeatmap?: boolean;
  entropyHeatmapOpacity?: number;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  engine,
  recorder,
  isRunning,
  selectedParticleIdx,
  onSelectParticle,
  showQuadtree,
  showGrid,
  showFluxTubes,
  showTrails,
  showHalos,
  showVelocities,
  spawnColor,
  dimensionMode = '2d_projection',
  showEntropyHeatmap = true,
  entropyHeatmapOpacity = 0.65,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [currentMouse, setCurrentMouse] = useState<{ x: number; y: number } | null>(null);

  // Resize canvas to display size or fixed coordinate 1200x800 aspect ratio
  const simWidth = engine.params.width;
  const simHeight = engine.params.height;

  // Render loop
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Check if replaying recorded snapshot or running live physics
      if (recorder?.isReplaying) {
        recorder.updatePlayback(0.016, engine);
      } else if (isRunning) {
        engine.step(0.016);
        if (recorder?.isRecording) {
          recorder.captureFrame(engine);
        }
      }

      const numParticles = engine.numParticles;
      const posX = engine.posX;
      const posY = engine.posY;
      const velX = engine.velX;
      const velY = engine.velY;
      const radius = engine.radius;
      const colorCharge = engine.colorCharge;
      const qEm = engine.qEm;
      const lambdaC = engine.params.lambdaC;

      // 1. Clear background (deep space dark, as in Python script: rgb(5, 5, 12))
      ctx.fillStyle = '#05050c';
      ctx.fillRect(0, 0, simWidth, simHeight);

      // 2. Spatial Grid Cells (if enabled)
      if (showGrid) {
        ctx.strokeStyle = 'rgba(25, 35, 60, 0.4)';
        ctx.lineWidth = 1;
        const cellSize = engine.params.cellSize;
        for (let x = 0; x <= simWidth; x += cellSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, simHeight);
          ctx.stroke();
        }
        for (let y = 0; y <= simHeight; y += cellSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(simWidth, y);
          ctx.stroke();
        }
      }

      // 2b. Local Entropy Density Heatmap Overlay (Thermodynamic Equilibrium State)
      if (showEntropyHeatmap && engine.entropyCalculator) {
        engine.entropyCalculator.render(ctx, simWidth, simHeight, entropyHeatmapOpacity);
      }

      // 3. Barnes-Hut Quadtree Visualization (if enabled)
      if (showQuadtree && engine.bhRoot) {
        const nodes: QuadTreeNodeData[] = [];
        engine.bhRoot.collectNodes(nodes, 6);
        ctx.strokeStyle = 'rgba(50, 90, 160, 0.25)';
        ctx.lineWidth = 1;
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          ctx.strokeRect(n.x, n.y, n.w, n.h);
        }
      }

      // 4. Particle Trail System (N-frame history path)
      if (showTrails) {
        const maxCapacity = engine.params.maxTrailPoints;
        const trailLen = Math.min(engine.params.trailLength, maxCapacity);
        const trailX = engine.trailHistoryX;
        const trailY = engine.trailHistoryY;
        const colorMode = engine.params.trailColorMode;

        for (let k = 0; k < numParticles; k++) {
          const baseOffset = k * maxCapacity;
          const head = engine.trailHead[k];
          const isSelected = selectedParticleIdx === k;
          const rgb = dimensionMode === '8d_complexified'
            ? engine.get8DColor(k)
            : engine.getQuarkColor(k);

          let curX = posX[k];
          let curY = posY[k];

          // Trace backward from head down to N frames
          for (let step = 0; step < trailLen; step++) {
            const histIdx = (head - step + maxCapacity) % maxCapacity;
            const px = trailX[baseOffset + histIdx];
            const py = trailY[baseOffset + histIdx];

            // If uninitialized point or abrupt jump (e.g. boundary clamp), break
            if ((px === 0 && py === 0) || Math.abs(px - curX) > 100 || Math.abs(py - curY) > 100) {
              break;
            }

            const progress = 1.0 - step / trailLen; // 1.0 at particle, 0.0 at oldest tail
            const alpha = isSelected
              ? Math.max(0.25, progress * 0.95)
              : Math.max(0.04, progress * 0.65);
            const lineWidth = isSelected
              ? Math.max(1.2, progress * 2.8)
              : Math.max(0.6, progress * 1.8);

            ctx.lineWidth = lineWidth;
            if (isSelected) {
              ctx.strokeStyle = `rgba(255, 230, 100, ${alpha})`;
            } else if (colorMode === 'particle') {
              ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
            } else if (colorMode === 'cyan') {
              ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
            } else {
              ctx.strokeStyle = `rgba(160, 175, 210, ${alpha * 0.7})`;
            }

            ctx.beginPath();
            ctx.moveTo(curX, curY);
            ctx.lineTo(px, py);
            ctx.stroke();

            curX = px;
            curY = py;
          }
        }
      }

      // 5. Monogamous Gluon Flux Strings (Color Confinement)
      if (showFluxTubes && engine.fluxTubes.length > 0) {
        const restThreshold = engine.params.restMassEnergy * 1.5;

        for (let t = 0; t < engine.fluxTubes.length; t++) {
          const tube = engine.fluxTubes[t];
          const i = tube.i;
          const j = tube.j;
          if (i >= numParticles || j >= numParticles) continue;

          const p1x = posX[i];
          const p1y = posY[i];
          const p2x = posX[j];
          const p2y = posY[j];

          const isHighTension = tube.vC > restThreshold;
          const isBaryon = tube.isBaryonBond;

          if (isHighTension) {
            // High tension string snap warning (magenta glow rgb(255, 80, 255))
            ctx.strokeStyle = '#ff50ff';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(p1x, p1y);
            ctx.lineTo(p2x, p2y);
            ctx.stroke();
          } else if (isBaryon) {
            // 3-Particle locked baryon triad bond (cyan glow)
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(p1x, p1y);
            ctx.lineTo(p2x, p2y);
            ctx.stroke();
          } else {
            // Normal 2-particle meson flux tube rgb(80, 110, 190)
            ctx.strokeStyle = 'rgba(80, 110, 190, 0.7)';
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(p1x, p1y);
            ctx.lineTo(p2x, p2y);
            ctx.stroke();
          }
        }
      }

      // 6. Force Field Velocity Vectors (Arrow Overlays with Color-Coded Length & Direction)
      if (showVelocities) {
        const vScale = engine.params.vectorScale ?? 0.6;
        const colorMode = engine.params.vectorColorMode ?? 'combined';
        const minSpeedThreshold = 0.2;

        for (let k = 0; k < numParticles; k++) {
          const vx = velX[k];
          const vy = velY[k];
          const speed = Math.hypot(vx, vy);

          if (speed < minSpeedThreshold) {
            continue;
          }

          const px = posX[k];
          const py = posY[k];
          const angle = Math.atan2(vy, vx);
          const isSelected = selectedParticleIdx === k;

          // 1. Magnitude: normalized speed (0 to ~90+ px/s)
          const normSpeed = Math.min(1.0, speed / 90.0);

          // Multi-stop perceptual chromatic ramp:
          // 0.00 - 0.25: Electric Cyan (#38bdf8)
          // 0.25 - 0.50: Emerald Spring (#34d399)
          // 0.50 - 0.75: Warm Amber Gold (#fbbf24)
          // 0.75 - 1.00: Fiery Coral Crimson (#f43f5e)
          let speedR: number;
          let speedG: number;
          let speedB: number;

          if (normSpeed < 0.25) {
            const t = normSpeed / 0.25;
            speedR = Math.round(20 + t * 36);
            speedG = Math.round(180 + t * 30);
            speedB = Math.round(250 - t * 5);
          } else if (normSpeed < 0.5) {
            const t = (normSpeed - 0.25) / 0.25;
            speedR = Math.round(56 - t * 4);
            speedG = Math.round(210 + t * 1);
            speedB = Math.round(245 - t * 92);
          } else if (normSpeed < 0.75) {
            const t = (normSpeed - 0.5) / 0.25;
            speedR = Math.round(52 + t * 199);
            speedG = Math.round(211 - t * 20);
            speedB = Math.round(153 - t * 117);
          } else {
            const t = (normSpeed - 0.75) / 0.25;
            speedR = Math.round(251 - t * 7);
            speedG = Math.round(191 - t * 128);
            speedB = Math.round(36 + t * 58);
          }
          const speedColor = `rgb(${speedR}, ${speedG}, ${speedB})`;

          // 2. Direction: full 360-degree color wheel mapped to hue [0..360]
          const dirDeg = ((angle * (180 / Math.PI)) + 360) % 360;
          const dirColor = `hsl(${Math.round(dirDeg)}, 90%, 65%)`;

          // Dynamic length indicating magnitude
          const arrowLen = Math.max(7, Math.min(isSelected ? 75 : 55, 6 + speed * vScale));

          const startX = px;
          const startY = py;
          const endX = px + Math.cos(angle) * arrowLen;
          const endY = py + Math.sin(angle) * arrowLen;

          // Arrowhead geometry
          const headLen = Math.max(4.5, Math.min(9, arrowLen * 0.28));
          const headAngle = Math.PI / 6; // 30 degrees
          const leftX = endX - headLen * Math.cos(angle - headAngle);
          const leftY = endY - headLen * Math.sin(angle - headAngle);
          const rightX = endX - headLen * Math.cos(angle + headAngle);
          const rightY = endY - headLen * Math.sin(angle + headAngle);
          const innerX = endX - headLen * 0.65 * Math.cos(angle);
          const innerY = endY - headLen * 0.65 * Math.sin(angle);

          // Select stroke style and tip fill based on vectorColorMode
          let shaftStroke: string | CanvasGradient;
          let tipFill: string;

          if (colorMode === 'direction') {
            shaftStroke = `hsla(${Math.round(dirDeg)}, 90%, 65%, ${isSelected ? 0.95 : 0.75})`;
            tipFill = dirColor;
          } else if (colorMode === 'magnitude') {
            shaftStroke = isSelected ? '#facc15' : speedColor;
            tipFill = isSelected ? '#facc15' : speedColor;
          } else {
            // Combined: Base gradient from Direction Phase Color to Speed Magnitude Color at tip!
            const grad = ctx.createLinearGradient(startX, startY, endX, endY);
            grad.addColorStop(0, `hsla(${Math.round(dirDeg)}, 90%, 65%, ${isSelected ? 0.95 : 0.65})`);
            grad.addColorStop(1, speedColor);
            shaftStroke = grad;
            tipFill = speedColor;
          }

          // Draw shaft
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(innerX, innerY);
          ctx.strokeStyle = shaftStroke;
          ctx.lineWidth = isSelected ? 2.5 : 1.4;
          ctx.lineCap = 'round';
          ctx.stroke();

          // Draw filled aerodynamic arrowhead
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(leftX, leftY);
          ctx.lineTo(innerX, innerY);
          ctx.lineTo(rightX, rightY);
          ctx.closePath();
          ctx.fillStyle = tipFill;
          ctx.fill();

          // If selected particle, annotate exact speed and direction
          if (isSelected) {
            ctx.save();
            ctx.fillStyle = '#facc15';
            ctx.font = 'bold 10px monospace';
            ctx.fillText(`v=${speed.toFixed(1)} px/s θ=${dirDeg.toFixed(0)}°`, endX + 8, endY + 4);
            ctx.restore();
          }
        }
      }

      // 7. Fundamental Particles & Emergent Electric Charge Halos
      for (let k = 0; k < numParticles; k++) {
        const px = posX[k];
        const py = posY[k];
        const r = Math.max(2, Math.round(radius[k]));
        const cIdx = colorCharge[k];
        const rgb = dimensionMode === '8d_complexified'
          ? engine.get8DColor(k)
          : engine.getQuarkColor(k);

        // Emergent Electric Charge Halos
        if (showHalos && lambdaC > 0.1) {
          const q = qEm[k];
          if (q > 0) {
            ctx.strokeStyle = 'rgba(255, 150, 150, 0.9)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(px, py, r + 2, 0, Math.PI * 2);
            ctx.stroke();
          } else if (q < 0) {
            ctx.strokeStyle = 'rgba(150, 255, 150, 0.9)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(px, py, r + 2, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        // Particle Core with Quark Flavor / 8D Color
        ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();

        // 8D extra dimension phase ring
        if (dimensionMode === '8d_complexified') {
          ctx.strokeStyle = `rgba(${Math.min(255, rgb[0] + 50)}, ${Math.min(255, rgb[1] + 50)}, ${Math.min(255, rgb[2] + 50)}, 0.6)`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(px, py, r + 1.5, 0, Math.PI * 2);
          ctx.stroke();
        }

        // High mass core ring
        if (engine.mass[k] > engine.params.particleMass * 1.5) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(px, py, r + 1, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // 8. Highlight Selected Particle
      if (selectedParticleIdx !== null && selectedParticleIdx < numParticles) {
        const spx = posX[selectedParticleIdx];
        const spy = posY[selectedParticleIdx];
        const sr = Math.max(2, radius[selectedParticleIdx]);

        // Target reticle
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(spx, spy, sr + 7, 0, Math.PI * 2);
        ctx.stroke();

        // Pulsing outer bracket
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
        ctx.beginPath();
        ctx.arc(spx, spy, sr + 12, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 8.5. Active High-Energy Collision Highlights
      const highlights = engine.getActiveHighlights();
      const nowTime = performance.now();
      for (let h = 0; h < highlights.length; h++) {
        const hl = highlights[h];
        const age = nowTime - hl.startTime;
        if (age < 0 || age > hl.duration) continue;
        const progress = age / hl.duration;
        const currentR = hl.radius + (hl.maxRadius - hl.radius) * progress;
        const alpha = Math.max(0, 1.0 - progress);

        ctx.save();
        // Expanding shockwave circle
        ctx.strokeStyle = hl.color;
        ctx.globalAlpha = alpha * 0.9;
        ctx.lineWidth = 2.5 * (1.0 - progress);
        ctx.beginPath();
        ctx.arc(hl.x, hl.y, currentR, 0, Math.PI * 2);
        ctx.stroke();

        // High-energy core burst
        ctx.globalAlpha = alpha * 0.5;
        ctx.fillStyle = hl.color;
        ctx.beginPath();
        ctx.arc(hl.x, hl.y, Math.max(2, hl.radius * (1.0 - progress)), 0, Math.PI * 2);
        ctx.fill();

        // Text banner showing impulse magnitude / exchange
        if (progress < 0.7) {
          ctx.globalAlpha = Math.min(1.0, (1.0 - progress / 0.7) * 1.2);
          ctx.font = 'bold 9px monospace';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(`⚡ |J|=${hl.magnitude.toFixed(1)}`, hl.x + currentR + 4, hl.y - 4);
        }
        ctx.restore();
      }

      // 9. Interactive Drag Launch Vector
      if (dragStart && currentMouse) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(dragStart.x, dragStart.y);
        ctx.lineTo(currentMouse.x, currentMouse.y);
        ctx.stroke();

        // Launch origin marker
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(dragStart.x, dragStart.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // 10. Recording / Replay Status Indicator Overlay
      if (recorder?.isReplaying) {
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(simWidth - 250, 14, 235, 30, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#a5b4fc';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(
          `REPLAY ${recorder.speed}x [FRAME ${recorder.currentFrameIndex + 1}/${recorder.snapshots.length}]`,
          simWidth - 240,
          33
        );
        ctx.restore();
      } else if (recorder?.isRecording) {
        ctx.save();
        ctx.fillStyle = 'rgba(30, 10, 20, 0.85)';
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(simWidth - 220, 14, 205, 30, 4);
        ctx.fill();
        ctx.stroke();

        // Pulsing red recording dot
        const pulse = (Math.sin(Date.now() * 0.008) + 1) * 0.5;
        ctx.fillStyle = `rgba(244, 63, 94, ${0.4 + pulse * 0.6})`;
        ctx.beginPath();
        ctx.arc(simWidth - 205, 29, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fecdd3';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`REC • ${recorder.snapshots.length}/${recorder.maxFrames} FRAMES`, simWidth - 192, 33);
        ctx.restore();
      }

      // 11. Force Field Legend Overlay (Velocity Vectors: Magnitude & Direction)
      if (showVelocities) {
        ctx.save();
        const legendX = 14;
        const legendY = simHeight - 50;
        const legendW = 275;
        const legendH = 38;

        ctx.fillStyle = 'rgba(9, 11, 20, 0.88)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(legendX, legendY, legendW, legendH, 4);
        ctx.fill();
        ctx.stroke();

        // Legend Header & Mode
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('FORCE FIELD • VELOCITY VECTORS', legendX + 8, legendY + 13);

        const modeStr = (engine.params.vectorColorMode || 'combined').toUpperCase();
        ctx.fillStyle = '#94a3b8';
        ctx.font = '8px monospace';
        ctx.fillText(`[${modeStr}]`, legendX + 200, legendY + 13);

        // Speed ramp gradient bar
        const barX = legendX + 8;
        const barY = legendY + 19;
        const barW = 150;
        const barH = 5;

        const barGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
        barGrad.addColorStop(0, '#38bdf8'); // Cyan (slow)
        barGrad.addColorStop(0.35, '#34d399'); // Green
        barGrad.addColorStop(0.7, '#fbbf24'); // Yellow
        barGrad.addColorStop(1, '#f43f5e'); // Red (fast)

        ctx.fillStyle = barGrad;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 2);
        ctx.fill();

        // Scale numeric labels
        ctx.fillStyle = '#64748b';
        ctx.font = '8px monospace';
        ctx.fillText('0', barX, barY + 14);
        ctx.fillText('|v| (px/s)', barX + 50, barY + 14);
        ctx.fillText('90+', barX + barW - 16, barY + 14);

        // Angle compass indicator
        ctx.fillStyle = '#38bdf8';
        ctx.font = '8px monospace';
        ctx.fillText('θ ∈ [0..360°]', legendX + 175, barY + 14);

        ctx.restore();
      }

      // 12. Local Entropy Density & Thermodynamic Equilibrium Legend Overlay
      if (showEntropyHeatmap && engine.entropyCalculator) {
        ctx.save();
        const stats = engine.entropyCalculator.stats;
        const eX = simWidth - 280;
        const eY = simHeight - 65;
        const eW = 265;
        const eH = 50;

        ctx.fillStyle = 'rgba(7, 9, 18, 0.88)';
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(eX, eY, eW, eH, 4);
        ctx.fill();
        ctx.stroke();

        // Title
        ctx.fillStyle = '#f472b6';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('LOCAL ENTROPY DENSITY S(x, y)', eX + 8, eY + 13);

        // Mode badge
        ctx.fillStyle = dimensionMode === '8d_complexified' ? '#a78bfa' : '#38bdf8';
        ctx.font = '8px monospace';
        ctx.fillText(dimensionMode === '8d_complexified' ? '[8D STATE]' : '[2D PROJ]', eX + 205, eY + 13);

        // Heatmap Ramp Bar
        const barX = eX + 8;
        const barY = eY + 18;
        const barW = 140;
        const barH = 5;

        const hGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
        hGrad.addColorStop(0.0, '#312e81'); // Deep Indigo (Low S)
        hGrad.addColorStop(0.3, '#065f46'); // Emerald (Moderate S)
        hGrad.addColorStop(0.6, '#b45309'); // Amber (High S)
        hGrad.addColorStop(1.0, '#f43f5e'); // Rose/Crimson (Equilibrium S)

        ctx.fillStyle = hGrad;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 2);
        ctx.fill();

        // Min - Max labels
        ctx.fillStyle = '#64748b';
        ctx.font = '8px monospace';
        ctx.fillText('Min S', barX, barY + 13);
        ctx.fillText('Max S', barX + barW - 25, barY + 13);

        // Thermodynamic Equilibrium Index Badge
        const eqPercent = Math.round(stats.equilibriumIndex * 100);
        ctx.fillStyle =
          stats.equilibriumState === 'thermal_equilibrium'
            ? '#34d399'
            : stats.equilibriumState === 'near_equilibrium'
            ? '#fbbf24'
            : '#f87171';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`Eq: ${eqPercent}%`, eX + 160, eY + 24);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '8px monospace';
        ctx.fillText(stats.equilibriumLabel, eX + 8, eY + 42);

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    engine,
    recorder,
    isRunning,
    selectedParticleIdx,
    showQuadtree,
    showGrid,
    showFluxTubes,
    showTrails,
    showHalos,
    showVelocities,
    spawnColor,
    dimensionMode,
    showEntropyHeatmap,
    entropyHeatmapOpacity,
    dragStart,
    currentMouse,
    simWidth,
    simHeight,
  ]);

  // Transform client mouse coordinate into simulation space (1200x800)
  const getSimCoordinates = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = simWidth / rect.width;
      const scaleY = simHeight / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [simWidth, simHeight]
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getSimCoordinates(e);

    // Check if clicked near an existing particle
    let closestIdx = -1;
    let closestDist = 20; // 20px hit threshold

    for (let i = 0; i < engine.numParticles; i++) {
      const d = Math.hypot(engine.posX[i] - pos.x, engine.posY[i] - pos.y);
      if (d < closestDist) {
        closestDist = d;
        closestIdx = i;
      }
    }

    if (closestIdx >= 0) {
      onSelectParticle(engine.getParticleInfo(closestIdx));
      setDragStart(null);
    } else {
      // Start drag launch
      setDragStart(pos);
      setCurrentMouse(pos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragStart) {
      setCurrentMouse(getSimCoordinates(e));
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragStart && currentMouse) {
      if (recorder?.isReplaying) {
        setDragStart(null);
        setCurrentMouse(null);
        return;
      }
      const dx = dragStart.x - currentMouse.x;
      const dy = dragStart.y - currentMouse.y;
      // Slingshot velocity proportional to drag distance
      const vx = dx * 0.8;
      const vy = dy * 0.8;

      const c = spawnColor === 3 ? Math.floor(Math.random() * 3) : spawnColor;
      const newIdx = engine.spawnParticle(dragStart.x, dragStart.y, vx, vy, c);
      if (newIdx !== null) {
        onSelectParticle(engine.getParticleInfo(newIdx));
      }
    }
    setDragStart(null);
    setCurrentMouse(null);
  };

  return (
    <div
      ref={containerRef}
      id="simulation-canvas-container"
      className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden select-none"
    >
      <canvas
        ref={canvasRef}
        id="cgui-physics-canvas"
        width={simWidth}
        height={simHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="w-full h-full object-contain cursor-crosshair"
      />
    </div>
  );
};
