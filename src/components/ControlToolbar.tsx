import React from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Sliders,
  Maximize,
  Eye,
  Activity,
  Network,
  Sparkles,
  Zap,
  CircleDot,
  Atom,
  Layers,
  Navigation,
  Box,
  Orbit,
  Flame,
} from 'lucide-react';
import { PRESETS } from '../physics/presets';
import { CollisionMode, CGUIMode, CGUIStage, DimensionMode } from '../types';
import { SpatialAudioControl } from './SpatialAudioControl';

interface ControlToolbarProps {
  isRunning: boolean;
  onToggleRun: () => void;
  onStep: () => void;
  onReset: () => void;
  selectedPresetId: string;
  onSelectPreset: (presetId: string) => void;
  lambdaC: number;
  onChangeLambda: (newVal: number) => void;
  collisionMode: CollisionMode;
  onChangeCollisionMode: (mode: CollisionMode) => void;
  trailLength: number;
  onChangeTrailLength: (length: number) => void;
  showQuadtree: boolean;
  onToggleQuadtree: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showFluxTubes: boolean;
  onToggleFluxTubes: () => void;
  showTrails: boolean;
  onToggleTrails: () => void;
  showHalos: boolean;
  onToggleHalos: () => void;
  showVelocities: boolean;
  onToggleVelocities: () => void;
  showEnergyGraph: boolean;
  onToggleEnergyGraph: () => void;
  showEntropyHeatmap?: boolean;
  onToggleEntropyHeatmap?: () => void;
  dimensionMode?: DimensionMode;
  onToggleDimensionMode?: () => void;
  spawnColor: number;
  onChangeSpawnColor: (color: number) => void;
  onOpenSettings: () => void;
  onToggleFullscreen: () => void;
  isRecording?: boolean;
  isReplaying?: boolean;
  totalRecordedFrames?: number;
  onToggleRecord?: () => void;
  onToggleReplay?: () => void;
  cguiMode?: CGUIMode;
  cguiStage?: CGUIStage;
  onOpenFalsification?: () => void;
  onToggleCGUIMode?: () => void;
  is3DMode?: boolean;
  onToggle3DMode?: () => void;
  collisionCount?: number;
  onOpenCollisionLogs?: () => void;
}

export const ControlToolbar: React.FC<ControlToolbarProps> = ({
  isRunning,
  onToggleRun,
  onStep,
  onReset,
  selectedPresetId,
  onSelectPreset,
  lambdaC,
  onChangeLambda,
  collisionMode,
  onChangeCollisionMode,
  trailLength,
  onChangeTrailLength,
  showQuadtree,
  onToggleQuadtree,
  showGrid,
  onToggleGrid,
  showFluxTubes,
  onToggleFluxTubes,
  showTrails,
  onToggleTrails,
  showHalos,
  onToggleHalos,
  showVelocities,
  onToggleVelocities,
  showEnergyGraph,
  onToggleEnergyGraph,
  showEntropyHeatmap = true,
  onToggleEntropyHeatmap,
  dimensionMode = '2d_projection',
  onToggleDimensionMode,
  spawnColor,
  onChangeSpawnColor,
  onOpenSettings,
  onToggleFullscreen,
  isRecording = false,
  isReplaying = false,
  totalRecordedFrames = 0,
  onToggleRecord,
  onToggleReplay,
  cguiMode = 'emergence',
  cguiStage = 'CGUI-6',
  onOpenFalsification,
  onToggleCGUIMode,
  is3DMode = false,
  onToggle3DMode,
  collisionCount = 0,
  onOpenCollisionLogs,
}) => {
  return (
    <header
      id="cgui-control-toolbar"
      className="bg-[#0b0c16] border-b border-slate-800 text-slate-200 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2.5 select-none text-xs z-20"
    >
      {/* Left: Playback controls & Preset Selector */}
      <div className="flex items-center flex-wrap gap-1.5">
        {/* Play/Pause Button */}
        <button
          id="toolbar-play-btn"
          onClick={onToggleRun}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition cursor-pointer ${
            isRunning
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
          }`}
          title="Spacebar to toggle"
        >
          {isRunning ? <Pause size={13} /> : <Play size={13} />}
          <span>{isRunning ? 'Pause' : 'Play'}</span>
        </button>

        {/* Step Forward */}
        <button
          id="toolbar-step-btn"
          onClick={onStep}
          disabled={isRunning}
          className={`p-1.5 rounded border border-slate-700 hover:bg-slate-800 text-slate-300 transition ${
            isRunning ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
          }`}
          title="Single step frame"
        >
          <SkipForward size={13} />
        </button>

        {/* Reset */}
        <button
          id="toolbar-reset-btn"
          onClick={onReset}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-700 hover:bg-slate-800 text-slate-300 transition cursor-pointer"
          title="Reset simulation ('R')"
        >
          <RotateCcw size={13} />
          <span>Reset</span>
        </button>

        {/* Snapshot Record Button */}
        {onToggleRecord && (
          <button
            onClick={onToggleRecord}
            className={`flex items-center gap-1 px-2 py-1.5 rounded border text-xs font-semibold transition cursor-pointer ${
              isRecording
                ? 'bg-rose-950/80 text-rose-300 border-rose-600 animate-pulse'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-rose-400'
            }`}
            title="Toggle simulation state snapshot recording"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isRecording ? 'bg-rose-500' : 'bg-rose-500/80'
              }`}
            />
            <span className="hidden sm:inline">{isRecording ? 'REC' : 'Record'}</span>
          </button>
        )}

        {/* Replay Mode Trigger */}
        {onToggleReplay && totalRecordedFrames > 0 && (
          <button
            onClick={onToggleReplay}
            className={`flex items-center gap-1 px-2 py-1.5 rounded border text-xs font-semibold transition cursor-pointer ${
              isReplaying
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-900 border-slate-700 text-indigo-300 hover:bg-slate-800'
            }`}
            title="Toggle Replay Mode"
          >
            <span>Replay ({totalRecordedFrames})</span>
          </button>
        )}

        {/* Preset Selector */}
        <div className="flex items-center gap-1 ml-1">
          <span className="text-slate-400 text-[11px] hidden sm:inline">Scenario:</span>
          <select
            id="toolbar-preset-select"
            value={selectedPresetId}
            onChange={(e) => onSelectPreset(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer max-w-[150px] sm:max-w-xs"
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Middle: Collision Mode & Lambda slider */}
      <div className="flex items-center flex-wrap gap-2">
        {/* Collision Mode Selector */}
        <div
          className="flex items-center bg-slate-900/90 border border-slate-800 rounded p-0.5 gap-0.5"
          title="Particle Collision Response"
        >
          <span className="text-[10px] text-slate-400 px-1 font-semibold hidden md:inline">
            Collision:
          </span>
          <button
            onClick={() => onChangeCollisionMode('elastic')}
            className={`px-2 py-1 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
              collisionMode === 'elastic'
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Elastic Collision: Bounces off conserving energy and momentum"
          >
            <CircleDot size={10} />
            <span>Elastic</span>
          </button>
          <button
            onClick={() => onChangeCollisionMode('inelastic')}
            className={`px-2 py-1 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
              collisionMode === 'inelastic'
                ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Inelastic Collision: Particles merge into larger mass"
          >
            <span>Merge</span>
          </button>
          <button
            onClick={() => onChangeCollisionMode('none')}
            className={`px-2 py-1 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
              collisionMode === 'none'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Off: Pass through without collision response"
          >
            <span>Off</span>
          </button>
        </div>

        {/* Complexification Parameter (Lambda) Slider */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded px-2.5 py-1">
          <span className="text-amber-400 font-mono font-bold text-xs" title="Complexification parameter">λ</span>
          <input
            id="toolbar-lambda-slider"
            type="range"
            min="0"
            max="2"
            step="0.02"
            value={lambdaC}
            onChange={(e) => onChangeLambda(parseFloat(e.target.value))}
            className="w-20 sm:w-28 accent-amber-400 h-1.5 cursor-pointer bg-slate-700 rounded-lg"
            title="Complexification parameter λ (Use UP/DOWN arrow keys)"
          />
          <span className="font-mono text-amber-300 text-xs w-8 text-right">
            {lambdaC.toFixed(2)}
          </span>
        </div>

        {/* CGUI 8D & 10 Falsification Suite Button */}
        {onOpenFalsification && (
          <div className="flex items-center bg-slate-900 border border-cyan-500/40 rounded p-0.5 gap-1">
            <button
              id="toolbar-open-falsification-btn"
              onClick={onOpenFalsification}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 font-semibold border border-cyan-500/50 transition cursor-pointer text-[11px]"
              title="Open 8D Complexified Metric, Gauge Emergence, and 10 Falsification Tests Suite"
            >
              <Atom size={13} className="text-cyan-400" />
              <span>8D / Falsification</span>
            </button>

            {onToggleCGUIMode && (
              <button
                id="toolbar-toggle-cgui-mode"
                onClick={onToggleCGUIMode}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition ${
                  cguiMode === 'emergence'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-amber-500 text-slate-950'
                }`}
                title={`Click to switch between Emergence mode and Axiomatic benchmark (Currently: ${cguiMode})`}
              >
                {cguiMode}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right: Layer Toggles & Actions */}
      <div className="flex items-center flex-wrap gap-1.5">
        {/* Spawn Color Choice */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5 gap-0.5" title="Click+Drag canvas to spawn quark">
          <button
            onClick={() => onChangeSpawnColor(0)}
            className={`w-5 h-5 rounded flex items-center justify-center transition text-[10px] font-bold ${
              spawnColor === 0 ? 'bg-red-500 text-white shadow-sm' : 'text-red-400 hover:bg-slate-800'
            }`}
            title="Spawn Red Quark (+1e)"
          >
            R
          </button>
          <button
            onClick={() => onChangeSpawnColor(1)}
            className={`w-5 h-5 rounded flex items-center justify-center transition text-[10px] font-bold ${
              spawnColor === 1 ? 'bg-green-500 text-white shadow-sm' : 'text-green-400 hover:bg-slate-800'
            }`}
            title="Spawn Green Quark (-1e)"
          >
            G
          </button>
          <button
            onClick={() => onChangeSpawnColor(2)}
            className={`w-5 h-5 rounded flex items-center justify-center transition text-[10px] font-bold ${
              spawnColor === 2 ? 'bg-blue-500 text-white shadow-sm' : 'text-blue-400 hover:bg-slate-800'
            }`}
            title="Spawn Blue Quark (0e)"
          >
            B
          </button>
          <button
            onClick={() => onChangeSpawnColor(3)}
            className={`px-1.5 h-5 rounded flex items-center justify-center transition text-[10px] ${
              spawnColor === 3 ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Spawn Random Quark"
          >
            Any
          </button>
        </div>

        {/* View Toggles Group */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5 gap-0.5">
          {/* Trails toggle with length indicator */}
          <div className="flex items-center">
            <button
              id="toggle-trails-btn"
              onClick={onToggleTrails}
              className={`px-2 py-1 rounded transition text-[11px] flex items-center gap-1 cursor-pointer ${
                showTrails ? 'bg-indigo-500/25 text-indigo-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Particle Kinematic Trails (N frames)"
            >
              <Sparkles size={12} />
              <span>Trails</span>
            </button>
            {showTrails && (
              <select
                value={trailLength}
                onChange={(e) => onChangeTrailLength(parseInt(e.target.value, 10))}
                className="bg-slate-800 text-indigo-300 font-mono text-[10px] rounded px-1 py-0.5 border border-slate-700 ml-0.5 cursor-pointer focus:outline-none"
                title="Trail history frames (N)"
              >
                <option value={8}>N=8</option>
                <option value={15}>N=15</option>
                <option value={25}>N=25</option>
                <option value={40}>N=40</option>
                <option value={60}>N=60</option>
              </select>
            )}
          </div>

          <button
            id="toggle-flux-btn"
            onClick={onToggleFluxTubes}
            className={`px-2 py-1 rounded transition text-[11px] flex items-center gap-1 cursor-pointer ${
              showFluxTubes ? 'bg-fuchsia-500/20 text-fuchsia-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle SU(3) Monogamous Gluon Flux Strings"
          >
            <Zap size={12} />
            <span className="hidden md:inline">Gluons</span>
          </button>

          <button
            id="toggle-quadtree-btn"
            onClick={onToggleQuadtree}
            className={`px-2 py-1 rounded transition text-[11px] flex items-center gap-1 cursor-pointer ${
              showQuadtree ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Barnes-Hut Quadtree subdivision grid"
          >
            <Network size={12} />
            <span className="hidden md:inline">Tree</span>
          </button>

          <button
            id="toggle-vectors-btn"
            onClick={onToggleVelocities}
            className={`px-2 py-1 rounded transition text-[11px] flex items-center gap-1 cursor-pointer ${
              showVelocities
                ? 'bg-sky-500/25 text-sky-300 font-semibold border border-sky-400/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Force Field Velocity Vectors Arrow Overlay (Hotkey: V)"
          >
            <Navigation size={12} className={showVelocities ? 'text-sky-400 rotate-45' : 'rotate-45'} />
            <span className="hidden md:inline">Force Field</span>
          </button>

          <button
            id="toggle-halos-btn"
            onClick={onToggleHalos}
            className={`px-2 py-1 rounded transition text-[11px] flex items-center gap-1 cursor-pointer ${
              showHalos ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Emergent Electric Charge Halos"
          >
            <Eye size={12} />
            <span className="hidden md:inline">Halos</span>
          </button>

          <button
            id="toggle-energy-graph-btn"
            onClick={onToggleEnergyGraph}
            className={`px-2 py-1 rounded transition text-[11px] flex items-center gap-1 cursor-pointer ${
              showEnergyGraph ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Thermodynamics Spectrum Chart"
          >
            <Activity size={12} />
            <span className="hidden md:inline">Energy</span>
          </button>

          {onToggleEntropyHeatmap && (
            <button
              id="toggle-entropy-heatmap-btn"
              onClick={onToggleEntropyHeatmap}
              className={`px-2 py-1 rounded transition text-[11px] flex items-center gap-1 cursor-pointer ${
                showEntropyHeatmap
                  ? 'bg-rose-500/25 text-rose-300 font-semibold border border-rose-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Local Entropy Density Heatmap & Thermodynamic Equilibrium Overlay"
            >
              <Flame size={12} className={showEntropyHeatmap ? 'text-rose-400' : ''} />
              <span className="hidden md:inline">Entropy Heatmap</span>
            </button>
          )}
        </div>

        {/* 2D Projection vs 8D Complexified State Toggle */}
        {onToggleDimensionMode && (
          <button
            id="toolbar-dimension-mode-toggle-btn"
            onClick={onToggleDimensionMode}
            className={`px-2.5 py-1.5 rounded border transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
              dimensionMode === '8d_complexified'
                ? 'bg-purple-600/30 text-purple-300 border-purple-500/60 shadow-sm shadow-purple-950'
                : 'bg-sky-600/20 text-sky-300 border-sky-600/40 hover:bg-sky-600/30'
            }`}
            title="Toggle between 2D Projection (Quark Flavors) and 8D Complexified State (Extra Dimensions y₁..y₄)"
          >
            <Orbit size={13} className={dimensionMode === '8d_complexified' ? 'text-purple-400' : 'text-sky-400'} />
            <span>{dimensionMode === '8d_complexified' ? '8D State' : '2D Proj'}</span>
          </button>
        )}

        {/* 3D Viewport Toggle Button */}
        {onToggle3DMode && (
          <button
            id="toolbar-3d-toggle-btn"
            onClick={onToggle3DMode}
            className={`px-2.5 py-1.5 rounded border transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
              is3DMode
                ? 'bg-cyan-600/30 text-cyan-300 border-cyan-500/60 shadow-sm shadow-cyan-950'
                : 'border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
            title="Toggle between 2D Precision Canvas and 3D Three.js Viewport"
          >
            <Box size={13} className={is3DMode ? 'text-cyan-400 animate-spin-slow' : ''} />
            <span>{is3DMode ? '3D View' : '2D View'}</span>
          </button>
        )}

        {/* High Energy Collisions Log Button */}
        {onOpenCollisionLogs && (
          <button
            id="toolbar-collision-log-btn"
            onClick={onOpenCollisionLogs}
            className="px-2 py-1.5 rounded border border-slate-700 hover:bg-slate-800 text-slate-300 transition flex items-center gap-1 text-xs cursor-pointer"
            title="Inspect High-Energy Collision Log History & 3D Visualizer"
          >
            <Zap size={13} className="text-amber-400" />
            <span className="hidden sm:inline">Collisions</span>
            {collisionCount > 0 && (
              <span className="ml-0.5 px-1 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/30">
                {collisionCount}
              </span>
            )}
          </button>
        )}

        {/* 3D Spatial Audio & Quark Acoustics */}
        <SpatialAudioControl />

        {/* Settings Drawer Button */}
        <button
          id="toolbar-settings-btn"
          onClick={onOpenSettings}
          className="p-1.5 rounded border border-slate-700 hover:bg-slate-800 text-slate-300 transition cursor-pointer"
          title="Microscopic Physics Parameters"
        >
          <Sliders size={14} />
        </button>

        {/* Fullscreen Button */}
        <button
          id="toolbar-fullscreen-btn"
          onClick={onToggleFullscreen}
          className="p-1.5 rounded border border-slate-700 hover:bg-slate-800 text-slate-300 transition cursor-pointer"
          title="Toggle Fullscreen"
        >
          <Maximize size={14} />
        </button>
      </div>
    </header>
  );
};
