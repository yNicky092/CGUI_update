import React, { useRef, useEffect, useState } from 'react';
import { Thermodynamics, EnergyFrameSample } from '../types';
import { PhysicsEngine } from '../physics/engine';
import { X, Maximize2, Minimize2, ExternalLink, Play, Pause, RefreshCw, Eye, EyeOff } from 'lucide-react';

interface EnergyGraphProps {
  engine: PhysicsEngine;
  thermo: Thermodynamics;
  onClose: () => void;
}

export const EnergyGraph: React.FC<EnergyGraphProps> = ({ engine, thermo, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [hoveredSample, setHoveredSample] = useState<EnergyFrameSample | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);

  // Series visibility toggles
  const [visibleSeries, setVisibleSeries] = useState({
    eTotal: true,
    eKin: true,
    eG: true,
    eEM: true,
    eC: true,
    eRest: true,
  });

  const toggleSeries = (key: keyof typeof visibleSeries) => {
    setVisibleSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Live frame-by-frame rendering loop
  useEffect(() => {
    let animId: number;

    const drawFrame = () => {
      animId = requestAnimationFrame(drawFrame);
      if (isPaused) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const samples = engine.getRecentEnergySamples();
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      if (samples.length < 2) {
        ctx.fillStyle = '#64748b';
        ctx.font = '11px monospace';
        ctx.fillText('Accumulating per-frame thermodynamic energy contributions...', 15, h / 2);
        return;
      }

      // Compute min and max values across visible series
      let minVal = Infinity;
      let maxVal = -Infinity;

      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        if (visibleSeries.eTotal) {
          if (s.eTotal < minVal) minVal = s.eTotal;
          if (s.eTotal > maxVal) maxVal = s.eTotal;
        }
        if (visibleSeries.eKin) {
          if (s.eKin < minVal) minVal = s.eKin;
          if (s.eKin > maxVal) maxVal = s.eKin;
        }
        if (visibleSeries.eG) {
          if (s.eG < minVal) minVal = s.eG;
          if (s.eG > maxVal) maxVal = s.eG;
        }
        if (visibleSeries.eEM) {
          if (s.eEM < minVal) minVal = s.eEM;
          if (s.eEM > maxVal) maxVal = s.eEM;
        }
        if (visibleSeries.eC) {
          if (s.eC < minVal) minVal = s.eC;
          if (s.eC > maxVal) maxVal = s.eC;
        }
        if (visibleSeries.eRest) {
          if (s.eRest < minVal) minVal = s.eRest;
          if (s.eRest > maxVal) maxVal = s.eRest;
        }
      }

      if (!isFinite(minVal) || !isFinite(maxVal)) {
        minVal = -100;
        maxVal = 1000;
      }

      // Add comfortable padding
      const padTop = 20;
      const padBottom = 22;
      const padLeft = 45;
      const padRight = 15;
      const plotW = w - padLeft - padRight;
      const plotH = h - padTop - padBottom;

      const range = Math.max(1.0, maxVal - minVal);
      const getY = (val: number) => {
        const norm = (val - minVal) / range;
        return h - padBottom - norm * plotH;
      };

      // Background horizontal grid lines
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
      ctx.lineWidth = 1;
      const numGridLines = 4;
      for (let g = 0; g <= numGridLines; g++) {
        const val = minVal + (range * g) / numGridLines;
        const gy = getY(val);
        ctx.beginPath();
        ctx.moveTo(padLeft, gy);
        ctx.lineTo(w - padRight, gy);
        ctx.stroke();

        // Label
        ctx.fillStyle = '#64748b';
        ctx.font = '9px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(val.toFixed(0), padLeft - 6, gy + 3);
      }

      // Zero-line if within span
      if (minVal <= 0 && maxVal >= 0) {
        const zeroY = getY(0);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(padLeft, zeroY);
        ctx.lineTo(w - padRight, zeroY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Function to plot a single curve
      const drawCurve = (
        accessor: (s: EnergyFrameSample) => number,
        strokeColor: string,
        lineWidth: number
      ) => {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        const step = plotW / (samples.length - 1);
        for (let i = 0; i < samples.length; i++) {
          const px = padLeft + i * step;
          const py = getY(accessor(samples[i]));
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      };

      // 1. E_G (sky blue)
      if (visibleSeries.eG) {
        drawCurve((s) => s.eG, '#38bdf8', 1.5);
      }
      // 2. E_kinetic (cyan)
      if (visibleSeries.eKin) {
        drawCurve((s) => s.eKin, '#22d3ee', 1.5);
      }
      // 3. E_EM (emerald)
      if (visibleSeries.eEM) {
        drawCurve((s) => s.eEM, '#34d399', 1.5);
      }
      // 4. E_C (fuchsia)
      if (visibleSeries.eC) {
        drawCurve((s) => s.eC, '#e879f9', 1.5);
      }
      // 5. E_rest (amber)
      if (visibleSeries.eRest) {
        drawCurve((s) => s.eRest, '#fb923c', 1.5);
      }
      // 6. E_total (bright yellow, thicker stroke)
      if (visibleSeries.eTotal) {
        drawCurve((s) => s.eTotal, '#facc15', 2.5);
      }

      // Frame Rate and Per-Frame Indicator
      ctx.textAlign = 'left';
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(
        `FRAME #${engine.totalFrameCount} (${samples.length} FRAMES SAMPLED)`,
        padLeft,
        padTop - 6
      );
    };

    animId = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(animId);
  }, [engine, isPaused, visibleSeries]);

  // Handle canvas mouse move for per-frame tooltips
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const padLeft = 45;
    const padRight = 15;
    const plotW = canvas.width - padLeft - padRight;
    const samples = engine.getRecentEnergySamples();

    if (clientX >= padLeft && clientX <= canvas.width - padRight && samples.length > 1) {
      const fraction = (clientX - padLeft) / plotW;
      const sampleIdx = Math.min(
        samples.length - 1,
        Math.max(0, Math.round(fraction * (samples.length - 1)))
      );
      setHoveredSample(samples[sampleIdx]);
      setHoverCoords({ x: clientX, y: clientY });
    } else {
      setHoveredSample(null);
      setHoverCoords(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredSample(null);
    setHoverCoords(null);
  };

  return (
    <div
      id="cgui-energy-graph-card"
      className={`fixed z-40 bg-[#05050c]/95 border border-slate-700/80 rounded-xl backdrop-blur-md text-slate-200 font-mono shadow-2xl transition-all duration-300 pointer-events-auto ${
        isExpanded
          ? 'bottom-6 right-6 left-6 top-20 sm:left-auto sm:w-[680px] sm:h-[480px]'
          : 'bottom-3 right-3 w-80 sm:w-96'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800 bg-slate-900/60 rounded-t-xl">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-bold text-slate-200 text-xs uppercase tracking-wider">
            Energy Contribution Spectrum
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
            Per-Frame
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition cursor-pointer"
            title={isPaused ? 'Resume live frame updates' : 'Pause frame updates'}
          >
            {isPaused ? <Play size={13} className="text-emerald-400" /> : <Pause size={13} />}
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition cursor-pointer"
            title={isExpanded ? 'Dock to compact' : 'Expand window'}
          >
            {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition cursor-pointer"
            title="Close graph"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="relative p-3">
        <canvas
          ref={canvasRef}
          width={isExpanded ? 640 : 360}
          height={isExpanded ? 270 : 130}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full bg-slate-950/80 rounded-lg border border-slate-800 cursor-crosshair"
          style={{ height: isExpanded ? '270px' : '130px' }}
        />

        {/* Hover Tooltip */}
        {hoveredSample && hoverCoords && (
          <div
            className="absolute z-50 bg-slate-950/95 border border-slate-700 p-2 rounded shadow-xl text-[10px] font-mono pointer-events-none space-y-0.5"
            style={{
              left: Math.min(hoverCoords.x + 10, isExpanded ? 480 : 220),
              top: Math.max(10, hoverCoords.y - 80),
            }}
          >
            <div className="text-slate-400 font-bold border-b border-slate-800 pb-0.5">
              Frame #{hoveredSample.frame}
            </div>
            <div className="text-yellow-300">Total: {hoveredSample.eTotal.toFixed(1)}</div>
            <div className="text-cyan-300">Kinetic: {hoveredSample.eKin.toFixed(1)}</div>
            <div className="text-sky-300">Gravity: {hoveredSample.eG.toFixed(1)}</div>
            <div className="text-emerald-300">EM: {hoveredSample.eEM.toFixed(1)}</div>
            <div className="text-fuchsia-300">Color: {hoveredSample.eC.toFixed(1)}</div>
            <div className="text-orange-300">Rest: {hoveredSample.eRest.toFixed(1)}</div>
          </div>
        )}
      </div>

      {/* Interactive Legend & Metric Readouts */}
      <div className="px-3 pb-3">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-[10px]">
          {/* E_total */}
          <button
            onClick={() => toggleSeries('eTotal')}
            className={`flex flex-col p-1 rounded border transition cursor-pointer text-left ${
              visibleSeries.eTotal
                ? 'bg-yellow-950/20 border-yellow-700/50'
                : 'bg-slate-900/40 border-slate-800/60 opacity-40'
            }`}
          >
            <div className="flex items-center gap-1 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              <span>E_total</span>
            </div>
            <span className="font-bold text-yellow-300 mt-0.5">
              {thermo.eTotal.toFixed(0)}
            </span>
          </button>

          {/* E_kinetic */}
          <button
            onClick={() => toggleSeries('eKin')}
            className={`flex flex-col p-1 rounded border transition cursor-pointer text-left ${
              visibleSeries.eKin
                ? 'bg-cyan-950/20 border-cyan-700/50'
                : 'bg-slate-900/40 border-slate-800/60 opacity-40'
            }`}
          >
            <div className="flex items-center gap-1 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>E_kinetic</span>
            </div>
            <span className="font-bold text-cyan-300 mt-0.5">
              {thermo.eKin.toFixed(0)}
            </span>
          </button>

          {/* E_G */}
          <button
            onClick={() => toggleSeries('eG')}
            className={`flex flex-col p-1 rounded border transition cursor-pointer text-left ${
              visibleSeries.eG
                ? 'bg-sky-950/20 border-sky-700/50'
                : 'bg-slate-900/40 border-slate-800/60 opacity-40'
            }`}
          >
            <div className="flex items-center gap-1 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>E_G</span>
            </div>
            <span className="font-bold text-sky-300 mt-0.5">
              {thermo.eG.toFixed(0)}
            </span>
          </button>

          {/* E_EM */}
          <button
            onClick={() => toggleSeries('eEM')}
            className={`flex flex-col p-1 rounded border transition cursor-pointer text-left ${
              visibleSeries.eEM
                ? 'bg-emerald-950/20 border-emerald-700/50'
                : 'bg-slate-900/40 border-slate-800/60 opacity-40'
            }`}
          >
            <div className="flex items-center gap-1 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>E_EM</span>
            </div>
            <span className="font-bold text-emerald-300 mt-0.5">
              {thermo.eEM.toFixed(0)}
            </span>
          </button>

          {/* E_C */}
          <button
            onClick={() => toggleSeries('eC')}
            className={`flex flex-col p-1 rounded border transition cursor-pointer text-left ${
              visibleSeries.eC
                ? 'bg-fuchsia-950/20 border-fuchsia-700/50'
                : 'bg-slate-900/40 border-slate-800/60 opacity-40'
            }`}
          >
            <div className="flex items-center gap-1 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-fuchsia-400" />
              <span>E_C</span>
            </div>
            <span className="font-bold text-fuchsia-300 mt-0.5">
              {thermo.eC.toFixed(0)}
            </span>
          </button>

          {/* E_rest */}
          <button
            onClick={() => toggleSeries('eRest')}
            className={`flex flex-col p-1 rounded border transition cursor-pointer text-left ${
              visibleSeries.eRest
                ? 'bg-orange-950/20 border-orange-700/50'
                : 'bg-slate-900/40 border-slate-800/60 opacity-40'
            }`}
          >
            <div className="flex items-center gap-1 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              <span>E_rest</span>
            </div>
            <span className="font-bold text-orange-300 mt-0.5">
              {thermo.eRest.toFixed(0)}
            </span>
          </button>
        </div>

        {/* Energy Conservation Drift Info */}
        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>
            Drift ΔE: <span className="text-slate-200">{thermo.eDrift.toFixed(1)}</span>
          </span>
          <span className="text-slate-500">
            Click metric card above to toggle curve
          </span>
        </div>
      </div>
    </div>
  );
};
