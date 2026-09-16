import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Sliders,
  Headphones,
  Radio,
  Sparkles,
  Waves,
  Zap,
  Info,
  Play,
  RotateCcw,
} from 'lucide-react';
import { spatialAudio } from '../audio/spatialAudioEngine';
import { SpatialAudioSettings, QUARK_FLAVOR_LIST, QuarkFlavor } from '../types';

interface SpatialAudioControlProps {
  className?: string;
}

export const SpatialAudioControl: React.FC<SpatialAudioControlProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<SpatialAudioSettings>({ ...spatialAudio.settings });
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [isContextRunning, setIsContextRunning] = useState(spatialAudio.isContextActive());

  useEffect(() => {
    const unsub = spatialAudio.onActivityChange((active) => {
      setIsAudioActive(active);
    });
    return unsub;
  }, []);

  const handleToggleMute = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await spatialAudio.ensureContext();
    setIsContextRunning(spatialAudio.isContextActive());
    const next = !settings.enabled;
    const updated = { ...settings, enabled: next };
    setSettings(updated);
    spatialAudio.updateSettings({ enabled: next });
  };

  const handleSettingChange = (key: keyof SpatialAudioSettings, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    spatialAudio.updateSettings({ [key]: value });
  };

  const handleTestQuarkInteraction = async (flavorA: QuarkFlavor, flavorB: QuarkFlavor) => {
    await spatialAudio.ensureContext();
    setIsContextRunning(true);
    spatialAudio.playCollisionTone(
      600,
      400,
      0,
      45.0,
      35.0,
      flavorA,
      flavorB,
      0,
      1200,
      800,
      600,
      true
    );
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <div className="flex items-center space-x-1 bg-slate-900/90 border border-slate-700/80 rounded-lg p-1 shadow-md backdrop-blur-md">
        <button
          id="spatial-audio-toggle-mute-btn"
          onClick={handleToggleMute}
          title={settings.enabled ? 'Mute Spatial Audio' : 'Unmute Spatial Audio'}
          className={`flex items-center justify-center w-8 h-8 rounded-md transition-all ${
            settings.enabled
              ? 'bg-indigo-600/30 text-indigo-400 hover:bg-indigo-600/50'
              : 'bg-slate-800/60 text-slate-500 hover:bg-slate-800 hover:text-slate-400'
          }`}
        >
          {settings.enabled ? (
            <div className="relative flex items-center justify-center">
              <Volume2 className="w-4 h-4" />
              {isAudioActive && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </div>
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
        </button>

        <button
          id="spatial-audio-open-modal-btn"
          onClick={async () => {
            await spatialAudio.ensureContext();
            setIsContextRunning(spatialAudio.isContextActive());
            setIsOpen(!isOpen);
          }}
          title="3D Spatial Audio & Quark Acoustics Settings"
          className={`flex items-center space-x-1 px-2 h-8 rounded-md text-xs font-mono transition-all ${
            isOpen
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Headphones className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">3D Audio</span>
          {isAudioActive && (
            <span className="flex space-x-0.5 items-center h-3 ml-0.5">
              <span className="w-0.5 h-2 bg-emerald-400 animate-pulse rounded-full" />
              <span className="w-0.5 h-3 bg-emerald-400 animate-pulse delay-75 rounded-full" />
              <span className="w-0.5 h-1.5 bg-emerald-400 animate-pulse delay-150 rounded-full" />
            </span>
          )}
        </button>
      </div>

      {/* Settings Modal / Popover */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            id="spatial-audio-panel-popover"
            className="absolute right-0 top-full mt-2 w-96 max-w-[92vw] bg-slate-900/95 border border-slate-700/90 rounded-xl p-4 shadow-2xl backdrop-blur-xl z-50 text-slate-200 font-sans text-xs"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Headphones className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-100 text-sm flex items-center gap-1.5">
                    Spatial Audio Engine
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Web Audio HRTF
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Real Quark-to-Quark sonification & Gravitational drone
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Main Audio Toggle */}
            <div className="flex items-center justify-between bg-slate-800/50 p-2 rounded-lg mb-3 border border-slate-700/40">
              <div className="flex items-center space-x-2">
                <Radio className={`w-4 h-4 ${settings.enabled ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span className="font-medium text-slate-200">Audio Engine Status</span>
              </div>
              <button
                id="toggle-audio-enabled-btn"
                onClick={() => handleSettingChange('enabled', !settings.enabled)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  settings.enabled
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {settings.enabled ? 'ENABLED' : 'MUTED'}
              </button>
            </div>

            {/* Sliders */}
            <div className="space-y-3 mb-4">
              {/* Master Volume */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span className="flex items-center gap-1 font-mono">
                    <Volume2 className="w-3.5 h-3.5 text-indigo-400" /> Master Volume
                  </span>
                  <span className="font-mono text-indigo-300">
                    {Math.round(settings.masterVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={settings.masterVolume}
                  onChange={(e) => handleSettingChange('masterVolume', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Collision Tone Volume */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span className="flex items-center gap-1 font-mono">
                    <Zap className="w-3.5 h-3.5 text-amber-400" /> Quark Collision Tones
                  </span>
                  <span className="font-mono text-amber-300">
                    {Math.round(settings.collisionVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={settings.collisionVolume}
                  onChange={(e) => handleSettingChange('collisionVolume', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* Gravitational Drone Volume */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span className="flex items-center gap-1 font-mono">
                    <Waves className="w-3.5 h-3.5 text-cyan-400" /> Gravitational Intensity Drone
                  </span>
                  <span className="font-mono text-cyan-300">
                    {Math.round(settings.gravityVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={settings.gravityVolume}
                  onChange={(e) => handleSettingChange('gravityVolume', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              {/* HRTF 3D Spatial Audio Toggle */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-300 font-mono flex items-center gap-1">
                  <Headphones className="w-3.5 h-3.5 text-purple-400" /> HRTF Binaural 3D
                </span>
                <button
                  id="toggle-hrtf-3d-btn"
                  onClick={() => handleSettingChange('spatial3d', !settings.spatial3d)}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-mono transition-all ${
                    settings.spatial3d
                      ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}
                >
                  {settings.spatial3d ? '3D HRTF ON' : 'STEREO'}
                </button>
              </div>
            </div>

            {/* Real Quark-to-Quark Acoustic Reference & Test Panel */}
            <div className="border-t border-slate-800 pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-300 font-semibold text-[11px] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-rose-400" /> Real Quark Interactions
                </span>
                <span className="text-[10px] text-slate-500">Click to Preview</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {/* Gen 1: Up - Down */}
                <button
                  id="test-quark-up-down-btn"
                  onClick={() => handleTestQuarkInteraction('up', 'down')}
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-800/80 border border-red-500/30 hover:border-red-400 hover:bg-red-500/10 transition-all text-left group"
                >
                  <div className="flex items-center space-x-1 mb-0.5">
                    <span className="text-xs font-bold text-red-400">u ↔ d</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-300">810 Hz</span>
                  <span className="text-[9px] text-slate-500 group-hover:text-slate-400">Crystalline</span>
                </button>

                {/* Gen 2: Strange - Charm */}
                <button
                  id="test-quark-strange-charm-btn"
                  onClick={() => handleTestQuarkInteraction('strange', 'charm')}
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-800/80 border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-500/10 transition-all text-left group"
                >
                  <div className="flex items-center space-x-1 mb-0.5">
                    <span className="text-xs font-bold text-emerald-400">s ↔ c</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-300">367 Hz</span>
                  <span className="text-[9px] text-slate-500 group-hover:text-slate-400">Metallic</span>
                </button>

                {/* Gen 3: Top - Bottom */}
                <button
                  id="test-quark-top-bottom-btn"
                  onClick={() => handleTestQuarkInteraction('top', 'bottom')}
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-800/80 border border-purple-500/30 hover:border-purple-400 hover:bg-purple-500/10 transition-all text-left group"
                >
                  <div className="flex items-center space-x-1 mb-0.5">
                    <span className="text-xs font-bold text-pink-400">t ↔ b</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-300">110 Hz</span>
                  <span className="text-[9px] text-slate-500 group-hover:text-slate-400">Sub-Bass</span>
                </button>
              </div>

              {/* Acoustic Info Footer */}
              <div className="bg-slate-950/60 rounded-lg p-2 text-[10px] text-slate-400 border border-slate-800/60 flex items-start space-x-2">
                <Info className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <p className="leading-tight">
                  Tones are frequency-shifted in real time by collision impulse <span className="font-mono text-slate-300">|J|</span> and relative Doppler motion. The ambient sub-bass drone deepens with gravitational potential <span className="font-mono text-slate-300">E_G</span> and spacetime curvature <span className="font-mono text-slate-300">R</span>.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
