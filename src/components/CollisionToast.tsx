import React, { useState, useEffect } from 'react';
import { CollisionEvent } from '../types';
import { ThreeCollisionViewer } from './ThreeCollisionViewer';
import { Zap, X, Box, ChevronRight, ListCollapse, Maximize2, Headphones, Volume2 } from 'lucide-react';
import { spatialAudio } from '../audio/spatialAudioEngine';

interface CollisionToastProps {
  currentEvent: CollisionEvent | null;
  onDismiss: () => void;
  onOpenModal: (event: CollisionEvent) => void;
  onToggle3DMode: () => void;
  is3DMode: boolean;
  collisionHistory: CollisionEvent[];
  onOpenLogHistory: () => void;
}

export const CollisionToast: React.FC<CollisionToastProps> = ({
  currentEvent,
  onDismiss,
  onOpenModal,
  onToggle3DMode,
  is3DMode,
  collisionHistory,
  onOpenLogHistory,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!currentEvent) return;

    setProgress(100);
    const duration = 6500; // 6.5s display time
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      if (!isHovered) {
        setProgress((prev) => {
          if (prev <= step) {
            clearInterval(timer);
            onDismiss();
            return 0;
          }
          return prev - step;
        });
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [currentEvent, isHovered, onDismiss]);

  if (!currentEvent) return null;

  const typeLabel =
    currentEvent.collisionType === 'inelastic'
      ? 'Inelastic Merger'
      : 'Elastic Scattering';
  const badgeBg =
    currentEvent.collisionType === 'inelastic'
      ? 'bg-purple-900/60 text-purple-300 border-purple-700/50'
      : 'bg-amber-900/60 text-amber-300 border-amber-700/50';

  return (
    <div
      id="collision-toast"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed top-14 right-4 z-50 w-84 sm:w-96 bg-slate-950/95 border border-slate-700/70 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden text-slate-100 transition-all duration-300 animate-in fade-in slide-in-from-top-4"
    >
      {/* Top Countdown Bar */}
      <div className="h-1 w-full bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-amber-400 to-purple-500 transition-all duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-3.5 pt-2.5 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Zap size={14} className="animate-pulse" />
          </span>
          <div>
            <div className="text-[12px] font-bold tracking-tight text-white flex items-center gap-1.5">
              High-Energy Collision
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono border ${badgeBg}`}>
                {typeLabel}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Event #{currentEvent.id.slice(0, 8)}
            </div>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800/80 transition cursor-pointer"
          title="Dismiss notification"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body with Mini 3D View and Collision Metrics */}
      <div className="p-3 space-y-2.5">
        {/* Magnitude & Energy Log Grid */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900/80 border border-slate-800/90 rounded-lg p-2 font-mono text-[11px]">
          <div>
            <span className="text-slate-400 text-[10px] block">Impulse Magnitude |J|</span>
            <span className="text-amber-300 font-bold text-sm">
              {currentEvent.impulseMagnitude.toFixed(1)}{' '}
              <span className="text-[9px] text-slate-500 font-normal">kg·px/s</span>
            </span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] block">Energy Exchange ΔE</span>
            <span className="text-cyan-300 font-bold text-sm">
              {currentEvent.energyExchange.toFixed(1)}{' '}
              <span className="text-[9px] text-slate-500 font-normal">arb</span>
            </span>
          </div>
        </div>

        {/* Particles involved */}
        <div className="flex items-center justify-between text-[11px] font-mono bg-slate-900/50 px-2.5 py-1.5 rounded border border-slate-800/60">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor:
                  currentEvent.particleA.color === 0
                    ? '#ef4444'
                    : currentEvent.particleA.color === 1
                    ? '#22c55e'
                    : '#3b82f6',
              }}
            />
            <span className="text-slate-200">
              {currentEvent.particleA.flavorSymbol ?? 'q'} ({currentEvent.particleA.colorName})
            </span>
            <span className="text-slate-500 text-[9px]">
              (q={currentEvent.particleA.qEm > 0 ? `+${currentEvent.particleA.qEm}` : currentEvent.particleA.qEm})
            </span>
          </div>

          <span className="text-slate-500 text-[10px]">⇄</span>

          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor:
                  currentEvent.particleB.color === 0
                    ? '#ef4444'
                    : currentEvent.particleB.color === 1
                    ? '#22c55e'
                    : '#3b82f6',
              }}
            />
            <span className="text-slate-200">
              {currentEvent.particleB.flavorSymbol ?? 'q'} ({currentEvent.particleB.colorName})
            </span>
            <span className="text-slate-500 text-[9px]">
              (q={currentEvent.particleB.qEm > 0 ? `+${currentEvent.particleB.qEm}` : currentEvent.particleB.qEm})
            </span>
          </div>
        </div>

        {/* Real Quark Sonification & Spatial Sound Replay */}
        <div className="flex items-center justify-between text-[10px] font-mono bg-indigo-950/40 px-2.5 py-1.5 rounded border border-indigo-800/40 text-indigo-300">
          <div className="flex items-center gap-1.5">
            <Headphones size={12} className="text-indigo-400" />
            <span className="font-semibold text-slate-200">
              {currentEvent.interactionName ?? 'Quark Collision'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {currentEvent.toneFrequency && (
              <span className="text-indigo-200 font-bold">
                {Math.round(currentEvent.toneFrequency)} Hz
              </span>
            )}
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
              className="p-1 rounded bg-indigo-600/30 hover:bg-indigo-600/60 text-indigo-200 transition cursor-pointer"
              title="Replay 3D Spatial Audio Tone"
            >
              <Volume2 size={11} />
            </button>
          </div>
        </div>

        {/* Mini 3D Three.js Interactive Hologram */}
        <div className="relative rounded-md overflow-hidden border border-slate-800 bg-slate-950 flex flex-col items-center">
          <ThreeCollisionViewer
            event={currentEvent}
            width={340}
            height={130}
            interactive={true}
          />
          <div className="absolute bottom-1 right-1.5 bg-slate-900/80 px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-400 pointer-events-none">
            3D Three.js: drag to orbit
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => onOpenModal(currentEvent)}
            className="flex-1 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 hover:text-white px-2.5 py-1.5 rounded-md text-[11px] font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
            title="Open comprehensive 3D reconstruction modal"
          >
            <Maximize2 size={12} />
            <span>3D Inspect</span>
          </button>

          {!is3DMode && (
            <button
              onClick={onToggle3DMode}
              className="flex-1 bg-cyan-600/25 hover:bg-cyan-600/45 border border-cyan-500/40 text-cyan-200 hover:text-white px-2.5 py-1.5 rounded-md text-[11px] font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
              title="Switch simulation viewport to full 3D mode"
            >
              <Box size={12} />
              <span>3D Viewport</span>
            </button>
          )}

          <button
            onClick={onOpenLogHistory}
            className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[11px] transition cursor-pointer"
            title="Open collision logs"
          >
            <ListCollapse size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
