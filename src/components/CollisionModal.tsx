import React, { useState } from 'react';
import { CollisionEvent } from '../types';
import { ThreeCollisionViewer } from './ThreeCollisionViewer';
import { X, Zap, ArrowDownCircle, RotateCcw, Download, Sparkles, Box, Headphones, Volume2 } from 'lucide-react';
import { spatialAudio } from '../audio/spatialAudioEngine';

interface CollisionModalProps {
  event: CollisionEvent | null;
  history: CollisionEvent[];
  onClose: () => void;
  onSelectEvent: (event: CollisionEvent) => void;
  onClearHistory: () => void;
  onToggle3DMode: () => void;
  is3DMode: boolean;
}

export const CollisionModal: React.FC<CollisionModalProps> = ({
  event,
  history,
  onClose,
  onSelectEvent,
  onClearHistory,
  onToggle3DMode,
  is3DMode,
}) => {
  const [selectedTab, setSelectedTab] = useState<'3d' | 'logs'>('3d');

  if (!event && history.length === 0) return null;
  const currentEvent = event || history[0];

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `cgui_collisions_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div
      id="collision-inspector-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in"
    >
      <div className="bg-slate-950 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-100 font-mono">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Zap size={18} />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                3D High-Energy Collision Inspector
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-700/50">
                  Three.js Powered
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Microscopic impulse & kinematic energy exchange analysis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setSelectedTab('3d')}
                className={`px-3 py-1 rounded-md transition cursor-pointer ${
                  selectedTab === '3d'
                    ? 'bg-purple-600/60 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                3D Reconstruction
              </button>
              <button
                onClick={() => setSelectedTab('logs')}
                className={`px-3 py-1 rounded-md transition cursor-pointer ${
                  selectedTab === 'logs'
                    ? 'bg-purple-600/60 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Event Log ({history.length})
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {selectedTab === '3d' && currentEvent && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: 3D Hologram Stage */}
              <div className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-900/40 rounded-xl border border-slate-800/80 p-3">
                <ThreeCollisionViewer
                  event={currentEvent}
                  width={480}
                  height={320}
                  interactive={true}
                />
                <div className="w-full flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
                  <span>Drag: Orbit 3D Camera | Scroll: Zoom</span>
                  <span className="text-cyan-400 font-bold">
                    Coords: ({currentEvent.x.toFixed(0)}, {currentEvent.y.toFixed(0)}, {currentEvent.z.toFixed(0)})
                  </span>
                </div>
              </div>

              {/* Right Column: Physical Dynamics & Breakdown */}
              <div className="lg:col-span-5 space-y-3">
                {/* Event Summary Card */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Classification</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                        currentEvent.collisionType === 'inelastic'
                          ? 'bg-purple-900/60 text-purple-300'
                          : 'bg-amber-900/60 text-amber-300'
                      }`}
                    >
                      {currentEvent.collisionType}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Impulse Magnitude |J|</span>
                      <span className="text-base font-bold text-amber-300">
                        {currentEvent.impulseMagnitude.toFixed(2)}{' '}
                        <span className="text-[10px] text-slate-500 font-normal">kg·px/s</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">Kinetic Exchange ΔE</span>
                      <span className="text-base font-bold text-cyan-300">
                        {currentEvent.energyExchange.toFixed(2)}{' '}
                        <span className="text-[10px] text-slate-500 font-normal">arb</span>
                      </span>
                    </div>
                  </div>
                </div>

                  {/* Real Quark Acoustic Sonification Profile */}
                  <div className="bg-indigo-950/40 border border-indigo-800/50 rounded-xl p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                        <Headphones size={13} className="text-indigo-400" />
                        <span>Quark Acoustic Sonification</span>
                      </div>
                      <button
                        onClick={() => {
                          spatialAudio.playCollisionTone(
                            currentEvent.x,
                            currentEvent.y,
                            currentEvent.z,
                            currentEvent.impulseMagnitude,
                            currentEvent.energyExchange,
                            currentEvent.particleA.flavor ?? 'up',
                            currentEvent.particleB.flavor ?? 'down',
                            0,
                            1200,
                            800,
                            600,
                            true
                          );
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600/40 hover:bg-indigo-600/70 border border-indigo-500/50 text-indigo-200 hover:text-white rounded-md transition cursor-pointer text-[11px]"
                      >
                        <Volume2 size={12} />
                        <span>Play 3D Tone</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Interaction Profile</span>
                        <span className="text-slate-200 font-medium">
                          {currentEvent.interactionName ?? 'Quark Resonance'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Synthesized Tone</span>
                        <span className="text-indigo-300 font-bold">
                          {currentEvent.toneFrequency ? `${Math.round(currentEvent.toneFrequency)} Hz` : 'Dynamic Shift'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Particle Breakdown */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
                    <div className="text-[11px] font-bold text-slate-300">Reacting Partons</div>

                    <div className="space-y-2">
                      <div className="p-2 rounded bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor:
                                currentEvent.particleA.color === 0
                                  ? '#ef4444'
                                  : currentEvent.particleA.color === 1
                                  ? '#22c55e'
                                  : '#3b82f6',
                            }}
                          />
                          <span className="font-semibold text-slate-200">
                            {currentEvent.particleA.flavorSymbol ? `${currentEvent.particleA.flavorSymbol} Quark` : `${currentEvent.particleA.colorName} Quark`} #{currentEvent.particleA.index}
                          </span>
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          m={currentEvent.particleA.mass.toFixed(1)} | v={currentEvent.particleA.speed.toFixed(1)} px/s
                        </div>
                      </div>

                      <div className="p-2 rounded bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor:
                                currentEvent.particleB.color === 0
                                  ? '#ef4444'
                                  : currentEvent.particleB.color === 1
                                  ? '#22c55e'
                                  : '#3b82f6',
                            }}
                          />
                          <span className="font-semibold text-slate-200">
                            {currentEvent.particleB.flavorSymbol ? `${currentEvent.particleB.flavorSymbol} Quark` : `${currentEvent.particleB.colorName} Quark`} #{currentEvent.particleB.index}
                          </span>
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          m={currentEvent.particleB.mass.toFixed(1)} | v={currentEvent.particleB.speed.toFixed(1)} px/s
                        </div>
                      </div>
                    </div>
                  </div>

                {/* Action Row */}
                <div className="flex items-center gap-2 pt-1">
                  {!is3DMode && (
                    <button
                      onClick={() => {
                        onToggle3DMode();
                        onClose();
                      }}
                      className="flex-1 bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-cyan-200 hover:text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Box size={14} />
                      <span>Switch Main Viewport to 3D</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Event Log Table */}
          {selectedTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Recorded High-Energy Events ({history.length} total)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportJSON}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Export JSON</span>
                  </button>
                  <button
                    onClick={onClearHistory}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded text-xs transition cursor-pointer"
                  >
                    <RotateCcw size={13} />
                    <span>Clear Logs</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Time</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Quarks Involved</th>
                      <th className="p-2.5">Impulse |J|</th>
                      <th className="p-2.5">Energy Exch ΔE</th>
                      <th className="p-2.5">Acoustic Tone</th>
                      <th className="p-2.5">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {history.map((ev) => (
                      <tr
                        key={ev.id}
                        className={`hover:bg-slate-900/60 transition ${
                          currentEvent?.id === ev.id ? 'bg-purple-950/30' : ''
                        }`}
                      >
                        <td className="p-2.5 text-slate-400">
                          {new Date(ev.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              ev.collisionType === 'inelastic'
                                ? 'bg-purple-900/50 text-purple-300'
                                : 'bg-amber-900/50 text-amber-300'
                            }`}
                          >
                            {ev.collisionType}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-300">
                          <span className="font-bold text-slate-100">
                            {ev.particleA.flavorSymbol ?? 'q'} ⇄ {ev.particleB.flavorSymbol ?? 'q'}
                          </span>{' '}
                          <span className="text-[10px] text-slate-500">
                            ({ev.particleA.colorName}/{ev.particleB.colorName})
                          </span>
                        </td>
                        <td className="p-2.5 font-bold text-amber-300">
                          {ev.impulseMagnitude.toFixed(1)}
                        </td>
                        <td className="p-2.5 font-bold text-cyan-300">
                          {ev.energyExchange.toFixed(1)}
                        </td>
                        <td className="p-2.5 text-indigo-300">
                          <div className="flex items-center gap-1.5">
                            <span>{ev.toneFrequency ? `${Math.round(ev.toneFrequency)} Hz` : '—'}</span>
                            <button
                              onClick={() => {
                                spatialAudio.playCollisionTone(
                                  ev.x,
                                  ev.y,
                                  ev.z,
                                  ev.impulseMagnitude,
                                  ev.energyExchange,
                                  ev.particleA.flavor ?? 'up',
                                  ev.particleB.flavor ?? 'down',
                                  0,
                                  1200,
                                  800,
                                  600,
                                  true
                                );
                              }}
                              className="p-1 rounded bg-indigo-600/20 hover:bg-indigo-600/50 text-indigo-300 transition"
                              title="Play Tone"
                            >
                              <Volume2 size={11} />
                            </button>
                          </div>
                        </td>
                        <td className="p-2.5">
                          <button
                            onClick={() => {
                              onSelectEvent(ev);
                              setSelectedTab('3d');
                            }}
                            className="px-2 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 rounded text-[11px] transition cursor-pointer"
                          >
                            Inspect in 3D
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
