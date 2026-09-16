import React from 'react';
import { SimulationParams } from '../types';
import { DEFAULT_PARAMS } from '../physics/engine';
import { X, RotateCcw, Info } from 'lucide-react';

interface PhysicsSettingsDrawerProps {
  params: SimulationParams;
  isOpen: boolean;
  onClose: () => void;
  onUpdateParams: (newParams: Partial<SimulationParams>) => void;
  onResetDefaults: () => void;
  showVelocities?: boolean;
  onToggleVelocities?: () => void;
}

export const PhysicsSettingsDrawer: React.FC<PhysicsSettingsDrawerProps> = ({
  params,
  isOpen,
  onClose,
  onUpdateParams,
  onResetDefaults,
  showVelocities,
  onToggleVelocities,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity">
      <div className="w-full max-w-md bg-[#090a12] border-l border-slate-800 h-full flex flex-col shadow-2xl text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#0d0e1a]">
          <div>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Microscopic Field Parameters
            </h2>
            <p className="text-[11px] text-slate-400">
              CGUI-5 Complexified Metric Coupling Settings
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Sliders and fields */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Theory card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-md p-3 text-[11px] text-slate-300 leading-relaxed space-y-2">
            <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <Info size={14} />
              <span>Complexified General Relativity (CGUI)</span>
            </div>
            <p className="text-slate-400">
              In this model, the gravitational coupling constant is complex:
              <span className="font-mono text-amber-300"> G = G₀ + i·σ·λ²</span>.
              The real part manifests as macroscopic long-range gravity (Barnes-Hut O(N log N)).
              The imaginary part manifests as SU(3) color confinement strings and emergent U(1) electromagnetism.
            </p>
          </div>

          {/* CGUI 8D Geometry & Emergence Controls */}
          <div className="space-y-2.5 bg-slate-900/60 p-3 rounded border border-cyan-500/30">
            <div className="flex items-center justify-between font-mono">
              <span className="text-cyan-300 font-bold uppercase tracking-wider text-[11px]">
                CGUI 8D Pipeline & Emergence
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                params.cguiMode === 'emergence'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                  : 'bg-amber-950 text-amber-300 border border-amber-500/50'
              }`}>
                {params.cguiMode.toUpperCase()}
              </span>
            </div>

            {/* Mode toggle */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => onUpdateParams({ cguiMode: 'emergence' })}
                className={`py-1.5 px-2 rounded text-[10px] font-semibold border transition text-center cursor-pointer ${
                  params.cguiMode === 'emergence'
                    ? 'bg-cyan-600/30 text-cyan-200 border-cyan-400'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                Emergence Mode
              </button>
              <button
                type="button"
                onClick={() => onUpdateParams({ cguiMode: 'axiomatic' })}
                className={`py-1.5 px-2 rounded text-[10px] font-semibold border transition text-center cursor-pointer ${
                  params.cguiMode === 'axiomatic'
                    ? 'bg-amber-600/30 text-amber-200 border-amber-400'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                Axiomatic Mode
              </button>
            </div>

            {/* Staged Pipeline Selector */}
            <div className="space-y-1 pt-1">
              <span className="text-slate-400 text-[10px] block">Development Stage:</span>
              <div className="grid grid-cols-4 gap-1">
                {(['CGUI-0', 'CGUI-1', 'CGUI-2', 'CGUI-3', 'CGUI-4', 'CGUI-5', 'CGUI-6'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => onUpdateParams({ cguiStage: st })}
                    className={`py-1 rounded text-[10px] font-mono border transition text-center cursor-pointer ${
                      params.cguiStage === st
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-400 font-bold'
                        : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Compactification Radius */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-slate-400">Internal Radius R_y (K_4):</span>
                <span className="text-purple-300 font-bold">{params.compactificationRy.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="40.0"
                step="1.0"
                value={params.compactificationRy}
                onChange={(e) => onUpdateParams({ compactificationRy: parseFloat(e.target.value) })}
                className="w-full accent-purple-400 h-1.5 bg-slate-800 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Particle Collision Dynamics */}
          <div className="space-y-2 bg-slate-900/60 p-3 rounded border border-slate-800">
            <div className="flex items-center justify-between font-mono">
              <span className="text-slate-200 font-bold uppercase tracking-wider text-[11px]">
                Particle Collision Dynamics
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                params.collisionMode === 'elastic'
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                  : params.collisionMode === 'inelastic'
                  ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {params.collisionMode.toUpperCase()}
              </span>
            </div>

            {/* Mode selection */}
            <div className="grid grid-cols-3 gap-1 pt-1">
              <button
                type="button"
                onClick={() => onUpdateParams({ collisionMode: 'elastic' })}
                className={`py-1.5 px-2 rounded text-[10px] font-semibold border transition text-center cursor-pointer ${
                  params.collisionMode === 'elastic'
                    ? 'bg-emerald-600/30 text-emerald-200 border-emerald-500'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                Elastic Bounce
              </button>
              <button
                type="button"
                onClick={() => onUpdateParams({ collisionMode: 'inelastic' })}
                className={`py-1.5 px-2 rounded text-[10px] font-semibold border transition text-center cursor-pointer ${
                  params.collisionMode === 'inelastic'
                    ? 'bg-amber-600/30 text-amber-200 border-amber-500'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                Inelastic Merge
              </button>
              <button
                type="button"
                onClick={() => onUpdateParams({ collisionMode: 'none' })}
                className={`py-1.5 px-2 rounded text-[10px] font-semibold border transition text-center cursor-pointer ${
                  params.collisionMode === 'none'
                    ? 'bg-purple-600/30 text-purple-200 border-purple-500'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                Pass-Through
              </button>
            </div>

            {params.collisionMode === 'elastic' && (
              <div className="space-y-1 pt-2">
                <div className="flex justify-between font-mono">
                  <span className="text-slate-300">Restitution (e)</span>
                  <span className="text-emerald-400 font-bold">{params.collisionRestitution.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={params.collisionRestitution}
                  onChange={(e) => onUpdateParams({ collisionRestitution: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">
                  1.0 = Perfectly elastic (strictly conserves kinetic energy and linear momentum).
                </p>
              </div>
            )}
          </div>

          {/* Particle Trail System */}
          <div className="space-y-2 bg-slate-900/60 p-3 rounded border border-slate-800">
            <div className="flex items-center justify-between font-mono">
              <span className="text-slate-200 font-bold uppercase tracking-wider text-[11px]">
                Particle Trail History
              </span>
              <span className="text-indigo-400 font-mono font-bold">
                N = {params.trailLength} frames
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-slate-400">Trail Length (Frames):</span>
                <span className="text-cyan-300 font-bold">{params.trailLength}</span>
              </div>
              <input
                type="range"
                min="4"
                max="60"
                step="2"
                value={params.trailLength}
                onChange={(e) => onUpdateParams({ trailLength: parseInt(e.target.value, 10) })}
                className="w-full accent-indigo-400 h-1.5 bg-slate-800 rounded cursor-pointer"
              />
            </div>

            <div className="pt-1">
              <span className="text-slate-400 text-[10px] block mb-1">Color Palette:</span>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => onUpdateParams({ trailColorMode: 'particle' })}
                  className={`py-1 px-1 rounded text-[10px] border transition text-center cursor-pointer ${
                    params.trailColorMode === 'particle'
                      ? 'bg-indigo-600/40 text-indigo-200 border-indigo-500'
                      : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  Quark Color
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateParams({ trailColorMode: 'cyan' })}
                  className={`py-1 px-1 rounded text-[10px] border transition text-center cursor-pointer ${
                    params.trailColorMode === 'cyan'
                      ? 'bg-cyan-600/40 text-cyan-200 border-cyan-500'
                      : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  Cyan Glow
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateParams({ trailColorMode: 'monochrome' })}
                  className={`py-1 px-1 rounded text-[10px] border transition text-center cursor-pointer ${
                    params.trailColorMode === 'monochrome'
                      ? 'bg-slate-600/40 text-slate-200 border-slate-400'
                      : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  Monochrome
                </button>
              </div>
            </div>
          </div>

          {/* Force Field Velocity Vectors */}
          <div className="space-y-2 bg-slate-900/60 p-3 rounded border border-sky-500/30">
            <div className="flex items-center justify-between font-mono">
              <span className="text-sky-300 font-bold uppercase tracking-wider text-[11px]">
                Force Field Vectors
              </span>
              {onToggleVelocities && (
                <button
                  type="button"
                  onClick={onToggleVelocities}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                    showVelocities
                      ? 'bg-sky-500/30 text-sky-200 border-sky-400'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {showVelocities ? 'ENABLED' : 'DISABLED'}
                </button>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-slate-400">Arrow Length Scale:</span>
                <span className="text-sky-300 font-bold">{(params.vectorScale ?? 0.6).toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="2.5"
                step="0.05"
                value={params.vectorScale ?? 0.6}
                onChange={(e) => onUpdateParams({ vectorScale: parseFloat(e.target.value) })}
                className="w-full accent-sky-400 h-1.5 bg-slate-800 rounded cursor-pointer"
              />
            </div>

            <div className="pt-1">
              <span className="text-slate-400 text-[10px] block mb-1">Color-Coding Mode:</span>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => onUpdateParams({ vectorColorMode: 'combined' })}
                  className={`py-1 px-1 rounded text-[10px] border transition text-center cursor-pointer ${
                    (params.vectorColorMode ?? 'combined') === 'combined'
                      ? 'bg-sky-600/40 text-sky-200 border-sky-500 font-semibold'
                      : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                  title="Shaft gradient from Direction Angle hue to Speed Magnitude color at arrowhead"
                >
                  Dual Gradient
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateParams({ vectorColorMode: 'magnitude' })}
                  className={`py-1 px-1 rounded text-[10px] border transition text-center cursor-pointer ${
                    params.vectorColorMode === 'magnitude'
                      ? 'bg-amber-600/40 text-amber-200 border-amber-500 font-semibold'
                      : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                  title="Speed Spectrum: Cyan (slow) → Green → Yellow → Crimson (fast)"
                >
                  Speed (|v|)
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateParams({ vectorColorMode: 'direction' })}
                  className={`py-1 px-1 rounded text-[10px] border transition text-center cursor-pointer ${
                    params.vectorColorMode === 'direction'
                      ? 'bg-purple-600/40 text-purple-200 border-purple-500 font-semibold'
                      : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                  title="Directional phase hue wheel: 0° to 360°"
                >
                  Angle (θ)
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {(params.vectorColorMode ?? 'combined') === 'combined'
                  ? 'Dual gradient: Angle hue at base, Speed magnitude color at arrow tip.'
                  : params.vectorColorMode === 'magnitude'
                  ? 'Speed spectrum: Electric Cyan (slow) to Crimson (relativistic).'
                  : '360° chromatic orientation wheel indicating trajectory angle.'}
              </p>
            </div>
          </div>

          {/* G_0: Gravitational Coupling */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-mono">
              <span className="text-slate-300 font-semibold">G₀ Coupling [Re(G)]</span>
              <span className="text-sky-400 font-bold">{params.g0.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="20.0"
              step="0.5"
              value={params.g0}
              onChange={(e) => onUpdateParams({ g0: parseFloat(e.target.value) })}
              className="w-full accent-sky-400 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
            <p className="text-[10px] text-slate-400">
              Newtonian gravitational attractive strength between mass elements.
            </p>
          </div>

          {/* Sigma: Color Confinement */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-mono">
              <span className="text-slate-300 font-semibold">σ String Tension [Im(G)]</span>
              <span className="text-fuchsia-400 font-bold">{params.sigmaColor.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="50.0"
              step="1.0"
              value={params.sigmaColor}
              onChange={(e) => onUpdateParams({ sigmaColor: parseFloat(e.target.value) })}
              className="w-full accent-fuchsia-400 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
            <p className="text-[10px] text-slate-400">
              Linear confining string tension for color flux tubes binding opposing quarks.
            </p>
          </div>

          {/* R_0: Asymptotic Freedom Scale */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-mono">
              <span className="text-slate-300 font-semibold">R₀ Asymptotic Freedom Scale</span>
              <span className="text-emerald-400 font-bold">{params.r0.toFixed(1)} px</span>
            </div>
            <input
              type="range"
              min="5.0"
              max="40.0"
              step="1.0"
              value={params.r0}
              onChange={(e) => onUpdateParams({ r0: parseFloat(e.target.value) })}
              className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
            <p className="text-[10px] text-slate-400">
              Distance below which quarks interact freely without string tension.
            </p>
          </div>

          {/* k_EM: Emergent U(1) Electromagnetism */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-mono">
              <span className="text-slate-300 font-semibold">k_e Emergent Electromagnetism</span>
              <span className="text-amber-400 font-bold">{params.kElectro.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="150.0"
              step="5.0"
              value={params.kElectro}
              onChange={(e) => onUpdateParams({ kElectro: parseFloat(e.target.value) })}
              className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
            <p className="text-[10px] text-slate-400">
              Electrostatic force derived from the winding phase of the complexified metric.
            </p>
          </div>

          {/* Rest Mass Energy (Schwinger Threshold) */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-mono">
              <span className="text-slate-300 font-semibold">mc² Vacuum Rest Mass</span>
              <span className="text-purple-400 font-bold">{params.restMassEnergy.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="20.0"
              max="300.0"
              step="10.0"
              value={params.restMassEnergy}
              onChange={(e) => onUpdateParams({ restMassEnergy: parseFloat(e.target.value) })}
              className="w-full accent-purple-400 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
            <p className="text-[10px] text-slate-400">
              Schwinger string-snapping threshold: string breaks when V_c &gt; 2·mc².
            </p>
          </div>

          {/* Microscopic Friction Coeff */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-mono">
              <span className="text-slate-300 font-semibold">Friction Damping (μ)</span>
              <span className="text-rose-400 font-bold">{params.frictionCoeff.toFixed(4)}</span>
            </div>
            <input
              type="range"
              min="0.950"
              max="1.000"
              step="0.001"
              value={params.frictionCoeff}
              onChange={(e) => onUpdateParams({ frictionCoeff: parseFloat(e.target.value) })}
              className="w-full accent-rose-400 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
            <p className="text-[10px] text-slate-400">
              Kinetic temperature dissipation rate per frame (1.0 = zero friction).
            </p>
          </div>

          {/* Barnes-Hut Theta */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-mono">
              <span className="text-slate-300 font-semibold">Barnes-Hut Theta (θ)</span>
              <span className="text-indigo-400 font-bold">{params.thetaBH.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.2"
              step="0.05"
              value={params.thetaBH}
              onChange={(e) => onUpdateParams({ thetaBH: parseFloat(e.target.value) })}
              className="w-full accent-indigo-400 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
            <p className="text-[10px] text-slate-400">
              Multipole opening angle threshold (lower = higher accuracy, higher = faster).
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-800 bg-[#0d0e1a] flex items-center justify-between">
          <button
            onClick={onResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded transition cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Reset to Defaults</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs rounded transition cursor-pointer"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
