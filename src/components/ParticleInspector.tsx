import React from 'react';
import { ParticleInfo, QUARK_FLAVORS } from '../types';
import { COLOR_MAP, QUARK_FLAVOR_HEX } from '../physics/engine';
import { X, Atom, Headphones, Orbit } from 'lucide-react';

interface ParticleInspectorProps {
  particle: ParticleInfo;
  onClose: () => void;
}

export const ParticleInspector: React.FC<ParticleInspectorProps> = ({
  particle,
  onClose,
}) => {
  const rgb = COLOR_MAP[particle.colorCharge] || [200, 200, 200];
  const qData = particle.quarkFlavor ? QUARK_FLAVORS[particle.quarkFlavor] : QUARK_FLAVORS.up;
  const flavorHex = particle.quarkFlavor ? QUARK_FLAVOR_HEX[particle.quarkFlavor] : '#f43f5e';

  return (
    <div
      id="cgui-particle-inspector"
      className="absolute bottom-3 left-3 z-30 bg-[#05050c]/95 border border-slate-700/60 rounded-md backdrop-blur-md p-3 text-slate-200 font-mono text-xs w-72 sm:w-80 shadow-2xl pointer-events-auto select-none"
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2.5">
        <div className="flex items-center gap-1.5">
          <Atom size={14} className="text-cyan-400" />
          <span className="font-bold text-slate-200 text-[11px] uppercase tracking-wider">
            Particle #{particle.index}
          </span>
          {qData && (
            <span
              className="px-1.5 py-0.2 rounded text-[10px] font-bold text-white border"
              style={{ backgroundColor: `${flavorHex}33`, borderColor: flavorHex, color: flavorHex }}
            >
              {qData.symbol} ({qData.name.split(' ')[0]})
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 p-0.5 rounded transition cursor-pointer"
        >
          <X size={13} />
        </button>
      </div>

      <div className="space-y-1.5 text-[11px]">
        {/* Color Charge, Quark Flavor & EM Charge badge */}
        <div className="flex items-center justify-between bg-slate-900/80 p-1.5 rounded border border-slate-800">
          <div className="flex items-center gap-1.5">
            <span
              className="w-3.5 h-3.5 rounded-full inline-block shadow-sm border border-white/20"
              style={{ backgroundColor: flavorHex }}
              title={`Quark Flavor Color: ${qData.name}`}
            />
            <span className="font-semibold text-slate-100">{qData.name}</span>
            <span className="text-[10px] text-slate-400">· Gen {qData.generation}</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                particle.qEm > 0
                  ? 'bg-red-950/60 text-red-300 border border-red-800/60'
                  : particle.qEm < 0
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {particle.qEm > 0 ? `+${particle.qEm.toFixed(0)}e` : `${particle.qEm.toFixed(0)}e`}
            </span>
          </div>
        </div>

        {/* Acoustic Resonance Signature */}
        <div className="flex items-center justify-between bg-indigo-950/30 px-2 py-1 rounded border border-indigo-800/30 text-[10px]">
          <span className="flex items-center gap-1 text-indigo-300">
            <Headphones size={11} className="text-indigo-400" /> Acoustic Tone:
          </span>
          <span className="font-mono text-indigo-200 font-semibold">
            {qData.baseFrequency} Hz ({qData.resonanceHarmonic})
          </span>
        </div>

        {/* 8D Compactified Coordinates */}
        {particle.extraDim && (
          <div className="bg-purple-950/20 px-2 py-1.5 rounded border border-purple-800/30 text-[10px]">
            <div className="flex items-center gap-1 text-purple-300 font-semibold mb-1">
              <Orbit size={11} className="text-purple-400" />
              <span>8D Compactified Manifold (y₁, y₂, y₃, y₄):</span>
            </div>
            <div className="grid grid-cols-4 gap-1 text-center font-mono text-purple-200 text-[9px]">
              <div className="bg-purple-900/30 px-1 py-0.5 rounded">
                y₁: {particle.extraDim.y1.toFixed(1)}
              </div>
              <div className="bg-purple-900/30 px-1 py-0.5 rounded">
                y₂: {particle.extraDim.y2.toFixed(1)}
              </div>
              <div className="bg-purple-900/30 px-1 py-0.5 rounded">
                y₃: {particle.extraDim.y3.toFixed(1)}
              </div>
              <div className="bg-purple-900/30 px-1 py-0.5 rounded">
                y₄: {particle.extraDim.y4.toFixed(1)}
              </div>
            </div>
          </div>
        )}

        {/* State parameters */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1">
          <div>
            <span className="text-slate-400 text-[10px]">Position:</span>
            <div className="text-slate-200 font-mono">
              ({particle.x.toFixed(1)}, {particle.y.toFixed(1)}, {(particle.z ?? 0).toFixed(1)})
            </div>
          </div>
          <div>
            <span className="text-slate-400 text-[10px]">Velocity:</span>
            <div className="text-slate-200 font-mono">
              ({particle.vx.toFixed(1)}, {particle.vy.toFixed(1)})
            </div>
          </div>
          <div>
            <span className="text-slate-400 text-[10px]">Linear Speed:</span>
            <div className="text-cyan-300 font-mono">{particle.speed.toFixed(1)} px/s</div>
          </div>
          <div>
            <span className="text-slate-400 text-[10px]">Mass:</span>
            <div className="text-yellow-200 font-mono">{particle.mass.toFixed(1)} amu</div>
          </div>
          <div>
            <span className="text-slate-400 text-[10px]">Kinetic Energy:</span>
            <div className="text-emerald-300 font-mono">{particle.kineticEnergy.toFixed(1)}</div>
          </div>
          <div>
            <span className="text-slate-400 text-[10px]">Gluon Bonds:</span>
            <div className="text-fuchsia-300 font-mono font-bold">
              {particle.bondsCount} / 2 max
            </div>
          </div>
          <div className="col-span-2">
            <span className="text-slate-400 text-[10px]">Hadron State:</span>
            <div className={`font-mono font-bold ${
              particle.hadronType === 'baryon'
                ? 'text-cyan-300'
                : particle.hadronType === 'meson'
                ? 'text-purple-300'
                : 'text-slate-400'
            }`}>
              {particle.hadronType === 'baryon'
                ? '3-Body Baryon (Locked)'
                : particle.hadronType === 'meson'
                ? '2-Body Meson'
                : 'Free Quark'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
