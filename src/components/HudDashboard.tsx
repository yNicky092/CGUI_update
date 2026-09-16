import React, { useState } from 'react';
import { Thermodynamics, PlaybackStatus } from '../types';
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HudDashboardProps {
  thermo: Thermodynamics;
  onAdjustLambda: (delta: number) => void;
  playbackStatus?: PlaybackStatus;
  onOpenFalsification?: () => void;
}

export const HudDashboard: React.FC<HudDashboardProps> = ({
  thermo,
  onAdjustLambda,
  playbackStatus,
  onOpenFalsification,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatSign = (val: number, decimals = 1) => {
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toFixed(decimals)}`;
  };

  const handleCopyTelemetry = () => {
    const text = [
      `CGUI 8D UNIFIED ENGINE TELEMETRY`,
      `Stage: ${thermo.cguiStage} | Mode: ${thermo.cguiMode.toUpperCase()}`,
      `FPS: ${thermo.fps.toFixed(1)} | Active Particles: ${thermo.activeParticles} / ${thermo.maxParticles}`,
      `Pair Creations: ${thermo.pairProductionsCount}`,
      `Lambda (λ): ${thermo.lambdaC.toFixed(3)} | R_y: ${thermo.compactificationRy.toFixed(1)}`,
      `Entropy S: ${thermo.entropy.toFixed(3)} | Temp T: ${thermo.temperature.toFixed(2)}`,
      `|P|: ${thermo.momentumMagnitude.toFixed(2)} | L_z: ${thermo.angularMomentum.toFixed(2)}`,
      `Net Charge Q: ${thermo.netElectricCharge.toFixed(0)} | Color Neutrality: ${thermo.colorNeutralityIndex.toFixed(2)}`,
      `E_kinetic: ${formatSign(thermo.eKin)}`,
      `E_pot (Grav): ${formatSign(thermo.eG)}`,
      `E_pot (EM): ${formatSign(thermo.eEM)}`,
      `E_pot (Col): ${formatSign(thermo.eC)}`,
      `E_rest_mass: ${formatSign(thermo.eRest)}`,
      `E_total: ${formatSign(thermo.eTotal)}`,
      `ΔE_drift: ${formatSign(thermo.eDrift)}`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      id="cgui-hud-dashboard"
      className="absolute top-3 left-3 z-30 font-mono text-xs pointer-events-auto select-none"
    >
      <div className="bg-[#05050c]/90 border border-slate-700/60 rounded-md backdrop-blur-md shadow-2xl overflow-hidden transition-all duration-200 w-80 sm:w-96">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-900/80 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] tracking-wider text-slate-200 font-bold uppercase">
              CGUI-5 Hybrid Engine
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              id="hud-copy-btn"
              onClick={handleCopyTelemetry}
              title="Copy telemetry snapshot"
              className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
            <button
              id="hud-toggle-btn"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? 'Expand HUD' : 'Collapse HUD'}
              className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition"
            >
              {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          </div>
        </div>

        {/* Content Body */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="hud-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="p-3 text-[11px] leading-[18px] text-[#d2d2e6] space-y-1">
                {/* CGUI 8D Status Pill & Falsification Trigger */}
                <div className="p-2 rounded bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-cyan-300 font-bold">{thermo.cguiStage}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                        thermo.cguiMode === 'emergence'
                          ? 'bg-cyan-900/80 text-cyan-200 border border-cyan-400/40'
                          : 'bg-amber-900/80 text-amber-200 border border-amber-400/40'
                      }`}>
                        {thermo.cguiMode}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      $\mathcal M_8$ ($R_y={thermo.compactificationRy.toFixed(1)}$)
                    </div>
                  </div>
                  {onOpenFalsification && (
                    <button
                      id="hud-open-falsification-btn"
                      onClick={onOpenFalsification}
                      className="px-2 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded text-[10px] transition shadow cursor-pointer"
                      title="Open 10 Falsification Tests & 8D Complexified Metric Suite"
                    >
                      8D / Tests
                    </button>
                  )}
                </div>

                <div className="text-slate-400 text-[10px] tracking-tight pt-1">
                  Barnes-Hut (Tree) + Spatial Grid Hadronization
                </div>

            <div className="flex justify-between pt-1">
              <span>FPS: <strong className="text-emerald-400">{thermo.fps.toFixed(1)}</strong></span>
              <span>Active Particles: <strong className="text-slate-100">{thermo.activeParticles}</strong> / {thermo.maxParticles}</span>
            </div>

            <div className="flex justify-between">
              <span>Collision Dynamics:</span>
              <span className={`font-semibold ${
                thermo.collisionMode === 'elastic'
                  ? 'text-emerald-300'
                  : thermo.collisionMode === 'inelastic'
                  ? 'text-amber-300'
                  : 'text-slate-400'
              }`}>
                {thermo.collisionMode === 'elastic' ? 'Elastic Bounce' : thermo.collisionMode === 'inelastic' ? 'Inelastic Merge' : 'Pass-Through'}
                {' '}({thermo.collisionCount})
              </span>
            </div>

            <div className="flex justify-between">
              <span>Pair Creation Events:</span>
              <span className="text-purple-300 font-bold">{thermo.pairProductionsCount}</span>
            </div>

            <div className="flex justify-between">
              <span>3-Particle Baryons (Locked):</span>
              <span className="text-cyan-300 font-bold font-mono">{thermo.baryonsCount ?? 0}</span>
            </div>

            <div className="flex justify-between">
              <span>2-Particle Mesons:</span>
              <span className="text-indigo-300 font-bold font-mono">{thermo.mesonsCount ?? 0}</span>
            </div>

            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Kinematic Trail History:</span>
              <span className="text-indigo-300 font-mono">N = {thermo.trailLength} frames</span>
            </div>

            {playbackStatus && (
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">State Snapshot Engine:</span>
                <span className={`font-mono font-bold ${
                  playbackStatus.isReplaying
                    ? 'text-indigo-300'
                    : playbackStatus.isRecording
                    ? 'text-rose-400 animate-pulse'
                    : 'text-emerald-400'
                }`}>
                  {playbackStatus.isReplaying
                    ? `REPLAY (${playbackStatus.currentFrame + 1}/${playbackStatus.totalFrames} @ ${playbackStatus.speed}x)`
                    : playbackStatus.isRecording
                    ? `REC (${playbackStatus.totalFrames}f)`
                    : 'LIVE'}
                </span>
              </div>
            )}

            <div className="border-t border-slate-800 my-1.5" />

            {/* Complexification Parameter Block */}
            <div className="bg-amber-950/20 border border-amber-800/40 rounded p-2">
              <div className="flex items-center justify-between text-[10px] text-amber-200/80 mb-1">
                <span>COMPLEXIFICATION PARAMETER</span>
                <span className="text-[9px] text-amber-400/80 font-normal">Use UP/DOWN keys</span>
              </div>
              <div className="flex items-center justify-between text-yellow-300 font-bold text-[13px]">
                <span>[ λ ] Lambda:</span>
                <span>{thermo.lambdaC.toFixed(3)}</span>
              </div>
              <div className="text-[10px] text-amber-300/70 mt-0.5">
                {thermo.lambdaC === 0
                  ? '(λ=0: Pure Gravity Sector)'
                  : thermo.lambdaC < 1
                  ? '(Sub-critical Hadronization)'
                  : thermo.lambdaC === 1
                  ? '(Standard Metric Phase Coupling)'
                  : '(High String Tension Schwinger Regime)'}
              </div>

              {/* Quick Nudge Buttons */}
              <div className="flex items-center gap-1.5 mt-2 pt-1 border-t border-amber-900/40">
                <button
                  id="hud-lambda-down"
                  onClick={() => onAdjustLambda(-0.05)}
                  className="flex-1 py-0.5 bg-amber-900/40 hover:bg-amber-800/60 text-amber-200 text-[10px] rounded text-center transition"
                >
                  - 0.05 (▼)
                </button>
                <button
                  id="hud-lambda-zero"
                  onClick={() => onAdjustLambda(-thermo.lambdaC)}
                  className="px-2 py-0.5 bg-amber-900/40 hover:bg-amber-800/60 text-amber-200 text-[10px] rounded text-center transition"
                >
                  λ=0
                </button>
                <button
                  id="hud-lambda-one"
                  onClick={() => onAdjustLambda(1.0 - thermo.lambdaC)}
                  className="px-2 py-0.5 bg-amber-900/40 hover:bg-amber-800/60 text-amber-200 text-[10px] rounded text-center transition"
                >
                  λ=1
                </button>
                <button
                  id="hud-lambda-up"
                  onClick={() => onAdjustLambda(+0.05)}
                  className="flex-1 py-0.5 bg-amber-900/40 hover:bg-amber-800/60 text-amber-200 text-[10px] rounded text-center transition"
                >
                  + 0.05 (▲)
                </button>
              </div>
            </div>

            <div className="border-t border-slate-800 my-1.5" />

            {/* Thermodynamics section */}
            <div className="space-y-0.5 pt-0.5">
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1 flex justify-between">
                <span>Thermodynamics & Invariants</span>
                <span className="text-purple-300 font-mono">S = {thermo.entropy.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Temp T:</span>
                <span className="text-amber-300 font-mono">{thermo.temperature.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Total Momentum |P|:</span>
                <span className="text-emerald-300 font-mono">{thermo.momentumMagnitude.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Angular Momentum L_z:</span>
                <span className="text-teal-300 font-mono">{thermo.angularMomentum.toFixed(1)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Net Charge ΔQ / Color:</span>
                <span className="text-indigo-300 font-mono">
                  Q={thermo.netElectricCharge.toFixed(0)} | C_idx={thermo.colorNeutralityIndex.toFixed(2)}
                </span>
              </div>

              <div className="border-t border-slate-800/80 my-1" />

              <div className="flex justify-between">
                <span className="text-slate-400">E_kinetic:</span>
                <span className="text-cyan-300 font-mono">{formatSign(thermo.eKin)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">E_pot (Grav):</span>
                <span className="text-sky-400 font-mono">{formatSign(thermo.eG)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">E_pot (EM):</span>
                <span className="text-emerald-400 font-mono">{formatSign(thermo.eEM)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">E_pot (Col):</span>
                <span className="text-fuchsia-400 font-mono">{formatSign(thermo.eC)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">E_rest_mass:</span>
                <span className="text-indigo-300 font-mono">{formatSign(thermo.eRest)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-1 font-semibold">
                <span className="text-slate-200">E_total:</span>
                <span className="text-yellow-200 font-mono">{formatSign(thermo.eTotal)}</span>
              </div>
              <div className="flex justify-between text-[10px] pt-0.5">
                <span className="text-slate-400">ΔE_drift:</span>
                <span className={`${thermo.eDrift <= 0 ? 'text-rose-400' : 'text-emerald-400'} font-mono`}>
                  {formatSign(thermo.eDrift)} (Friction Loss)
                </span>
              </div>

              {/* Local Thermodynamic Equilibrium Density Status */}
              {thermo.equilibriumIndex !== undefined && (
                <div className="bg-rose-950/25 p-1.5 rounded border border-rose-800/40 mt-1.5">
                  <div className="flex justify-between text-[10px] items-center mb-1">
                    <span className="text-rose-300 font-semibold flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                      Thermodynamic Eq Index:
                    </span>
                    <span className="text-rose-200 font-bold font-mono">
                      {(thermo.equilibriumIndex * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mb-1">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        thermo.equilibriumState === 'thermal_equilibrium'
                          ? 'bg-emerald-400'
                          : thermo.equilibriumState === 'near_equilibrium'
                          ? 'bg-amber-400'
                          : 'bg-rose-400'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, thermo.equilibriumIndex * 100))}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-slate-400 truncate">
                    State: <span className="text-slate-200">{thermo.equilibriumLabel || 'Local S(x, y) Metric'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
</div>
  );
};
