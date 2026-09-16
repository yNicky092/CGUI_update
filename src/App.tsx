import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PhysicsEngine, DEFAULT_PARAMS } from './physics/engine';
import { SimulationRecorder } from './physics/recorder';
import { SimulationCanvas } from './components/SimulationCanvas';
import { ThreeSimulationCanvas } from './components/ThreeSimulationCanvas';
import { CollisionToast } from './components/CollisionToast';
import { CollisionModal } from './components/CollisionModal';
import { HudDashboard } from './components/HudDashboard';
import { ControlToolbar } from './components/ControlToolbar';
import { EnergyGraph } from './components/EnergyGraph';
import { ParticleInspector } from './components/ParticleInspector';
import { PhysicsSettingsDrawer } from './components/PhysicsSettingsDrawer';
import { PlaybackTimeline } from './components/PlaybackTimeline';
import { FalsificationPanel } from './components/FalsificationPanel';
import { PRESETS } from './physics/presets';
import {
  ParticleInfo,
  Thermodynamics,
  SimulationParams,
  CollisionMode,
  PlaybackStatus,
  CGUIMode,
  CGUIStage,
  CollisionEvent,
  DimensionMode,
} from './types';

export default function App() {
  const engineRef = useRef<PhysicsEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new PhysicsEngine();
  }
  const engine = engineRef.current;

  const recorderRef = useRef<SimulationRecorder | null>(null);
  if (!recorderRef.current) {
    recorderRef.current = new SimulationRecorder(600);
  }
  const recorder = recorderRef.current;

  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [lambdaC, setLambdaC] = useState<number>(engine.params.lambdaC);
  const [collisionMode, setCollisionMode] = useState<CollisionMode>(engine.params.collisionMode);
  const [trailLength, setTrailLength] = useState<number>(engine.params.trailLength);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('default');
  const [thermo, setThermo] = useState<Thermodynamics>(() => engine.getThermodynamics());
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>(() => recorder.getStatus());
  const [selectedParticle, setSelectedParticle] = useState<ParticleInfo | null>(null);
  const [isFalsificationOpen, setIsFalsificationOpen] = useState<boolean>(false);

  // View layer flags
  const [showQuadtree, setShowQuadtree] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [showFluxTubes, setShowFluxTubes] = useState<boolean>(true);
  const [showTrails, setShowTrails] = useState<boolean>(true);
  const [showHalos, setShowHalos] = useState<boolean>(true);
  const [showVelocities, setShowVelocities] = useState<boolean>(false);
  const [showEnergyGraph, setShowEnergyGraph] = useState<boolean>(true);
  const [spawnColor, setSpawnColor] = useState<number>(3); // 3 = Random
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // 3D Viewport & Collision Event Toast State
  const [is3DMode, setIs3DMode] = useState<boolean>(false);
  const [activeToastEvent, setActiveToastEvent] = useState<CollisionEvent | null>(null);
  const [isCollisionModalOpen, setIsCollisionModalOpen] = useState<boolean>(false);
  const [modalCollisionEvent, setModalCollisionEvent] = useState<CollisionEvent | null>(null);
  const [collisionHistory, setCollisionHistory] = useState<CollisionEvent[]>(() => engine.getCollisionLogs());

  const mainContainerRef = useRef<HTMLDivElement>(null);

  // Hook into PhysicsEngine high-energy collision events
  useEffect(() => {
    engine.onHighEnergyCollision = (event: CollisionEvent) => {
      setActiveToastEvent(event);
      setCollisionHistory([...engine.getCollisionLogs()]);
    };
  }, [engine]);

  // Polling thermodynamics stats for HUD & Graph
  useEffect(() => {
    const interval = setInterval(() => {
      setThermo(engine.getThermodynamics());
      setPlaybackStatus(recorder.getStatus());
      // Refresh selected particle if one is selected
      if (selectedParticle) {
        const updated = engine.getParticleInfo(selectedParticle.index);
        setSelectedParticle(updated);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [engine, recorder, selectedParticle]);

  // Adjust Lambda C
  const handleAdjustLambda = useCallback(
    (delta: number) => {
      const next = Math.max(0.0, Math.min(2.0, engine.params.lambdaC + delta));
      engine.params.lambdaC = next;
      setLambdaC(next);
      setThermo(engine.getThermodynamics());
    },
    [engine]
  );

  const handleChangeLambda = useCallback(
    (newVal: number) => {
      const next = Math.max(0.0, Math.min(2.0, newVal));
      engine.params.lambdaC = next;
      setLambdaC(next);
      setThermo(engine.getThermodynamics());
    },
    [engine]
  );

  // Recorder Handlers
  const handleToggleRecord = useCallback(() => {
    recorder.toggleRecording();
    setPlaybackStatus(recorder.getStatus());
  }, [recorder]);

  const handleEnterReplay = useCallback(() => {
    recorder.enterReplay(engine, true);
    setIsRunning(false);
    setPlaybackStatus(recorder.getStatus());
    setThermo(engine.getThermodynamics());
  }, [engine, recorder]);

  const handleExitReplay = useCallback(() => {
    recorder.exitReplay();
    setPlaybackStatus(recorder.getStatus());
    setThermo(engine.getThermodynamics());
  }, [engine, recorder]);

  const handleToggleReplay = useCallback(() => {
    if (recorder.isReplaying) {
      handleExitReplay();
    } else {
      handleEnterReplay();
    }
  }, [handleEnterReplay, handleExitReplay, recorder.isReplaying]);

  const handleTogglePlayReplay = useCallback(() => {
    recorder.togglePlayPause(engine);
    setPlaybackStatus(recorder.getStatus());
  }, [engine, recorder]);

  const handleSeek = useCallback(
    (frame: number) => {
      recorder.seekTo(frame, engine);
      setPlaybackStatus(recorder.getStatus());
      setThermo(engine.getThermodynamics());
      if (selectedParticle) {
        setSelectedParticle(engine.getParticleInfo(selectedParticle.index));
      }
    },
    [engine, recorder, selectedParticle]
  );

  const handleStepForward = useCallback(() => {
    recorder.stepReplayForward(engine);
    setPlaybackStatus(recorder.getStatus());
    setThermo(engine.getThermodynamics());
    if (selectedParticle) {
      setSelectedParticle(engine.getParticleInfo(selectedParticle.index));
    }
  }, [engine, recorder, selectedParticle]);

  const handleStepBackward = useCallback(() => {
    recorder.stepReplayBackward(engine);
    setPlaybackStatus(recorder.getStatus());
    setThermo(engine.getThermodynamics());
    if (selectedParticle) {
      setSelectedParticle(engine.getParticleInfo(selectedParticle.index));
    }
  }, [engine, recorder, selectedParticle]);

  const handleSetSpeed = useCallback(
    (speed: number) => {
      recorder.setSpeed(speed);
      setPlaybackStatus(recorder.getStatus());
    },
    [recorder]
  );

  const handleToggleLoop = useCallback(() => {
    recorder.setLoop(!recorder.loop);
    setPlaybackStatus(recorder.getStatus());
  }, [recorder]);

  const handleResumeLiveFromCurrent = useCallback(() => {
    recorder.resumeLiveFromCurrent(engine);
    setIsRunning(true);
    setPlaybackStatus(recorder.getStatus());
    setThermo(engine.getThermodynamics());
  }, [engine, recorder]);

  const handleClearRecording = useCallback(() => {
    recorder.clear();
    setPlaybackStatus(recorder.getStatus());
  }, [recorder]);

  // Keyboard controls matching Python script: UP/DOWN for lambda, space, etc.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid hotkeys when typing in form inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleAdjustLambda(0.02);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleAdjustLambda(-0.02);
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (recorder.isReplaying) {
          handleTogglePlayReplay();
        } else {
          setIsRunning((prev) => !prev);
        }
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleReset();
      } else if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        setShowQuadtree((prev) => !prev);
      } else if (e.key === 'v' || e.key === 'V' || e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setShowVelocities((prev) => !prev);
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleToggleRecord();
      } else if (e.key === '[' || e.key === '{') {
        e.preventDefault();
        if (recorder.isReplaying) {
          handleStepBackward();
        }
      } else if (e.key === ']' || e.key === '}') {
        e.preventDefault();
        if (recorder.isReplaying) {
          handleStepForward();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleAdjustLambda,
    handleToggleRecord,
    handleStepBackward,
    handleStepForward,
    handleTogglePlayReplay,
    recorder.isReplaying,
  ]);

  // Actions
  const handleToggleRun = () => {
    setIsRunning((prev) => !prev);
  };

  const handleToggleVelocities = () => {
    setShowVelocities((prev) => !prev);
  };

  const handleStep = () => {
    if (!isRunning) {
      engine.step(0.016);
      setThermo(engine.getThermodynamics());
      if (selectedParticle) {
        setSelectedParticle(engine.getParticleInfo(selectedParticle.index));
      }
    }
  };

  const handleReset = () => {
    const currentPreset = PRESETS.find((p) => p.id === selectedPresetId);
    if (currentPreset) {
      currentPreset.setup(engine);
    } else {
      engine.resetSimulation();
    }
    setLambdaC(engine.params.lambdaC);
    setThermo(engine.getThermodynamics());
    setSelectedParticle(null);
  };

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = PRESETS.find((p) => p.id === presetId);
    if (preset) {
      preset.setup(engine);
      setLambdaC(engine.params.lambdaC);
      setThermo(engine.getThermodynamics());
      setSelectedParticle(null);
    }
  };

  const handleUpdateParams = (newParams: Partial<SimulationParams>) => {
    Object.assign(engine.params, newParams);
    setLambdaC(engine.params.lambdaC);
    if (newParams.collisionMode) setCollisionMode(newParams.collisionMode);
    if (newParams.trailLength) setTrailLength(newParams.trailLength);
    setThermo(engine.getThermodynamics());
  };

  const handleResetDefaults = () => {
    Object.assign(engine.params, DEFAULT_PARAMS);
    setLambdaC(engine.params.lambdaC);
    setCollisionMode(DEFAULT_PARAMS.collisionMode);
    setTrailLength(DEFAULT_PARAMS.trailLength);
    setThermo(engine.getThermodynamics());
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      mainContainerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleSetCGUIStage = (stage: CGUIStage) => {
    engine.setCGUIStage(stage);
    setThermo(engine.getThermodynamics());
  };

  const handleSetCGUIMode = (mode: CGUIMode) => {
    engine.setCGUIMode(mode);
    setThermo(engine.getThermodynamics());
  };

  const handleToggleCGUIMode = () => {
    const nextMode = engine.params.cguiMode === 'emergence' ? 'axiomatic' : 'emergence';
    engine.setCGUIMode(nextMode);
    setThermo(engine.getThermodynamics());
  };

  const handleSetCompactificationRy = (ry: number) => {
    engine.setCompactificationRy(ry);
    setThermo(engine.getThermodynamics());
  };

  return (
    <div
      ref={mainContainerRef}
      id="cgui-engine-app"
      className="flex flex-col w-screen h-screen bg-[#05050c] text-slate-100 overflow-hidden select-none font-sans"
    >
      {/* Top Toolbar */}
      <ControlToolbar
        isRunning={isRunning}
        onToggleRun={handleToggleRun}
        onStep={handleStep}
        onReset={handleReset}
        selectedPresetId={selectedPresetId}
        onSelectPreset={handleSelectPreset}
        lambdaC={lambdaC}
        onChangeLambda={handleChangeLambda}
        collisionMode={collisionMode}
        onChangeCollisionMode={(mode) => {
          engine.params.collisionMode = mode;
          setCollisionMode(mode);
          setThermo(engine.getThermodynamics());
        }}
        trailLength={trailLength}
        onChangeTrailLength={(n) => {
          engine.params.trailLength = n;
          setTrailLength(n);
          setThermo(engine.getThermodynamics());
        }}
        showQuadtree={showQuadtree}
        onToggleQuadtree={() => setShowQuadtree((prev) => !prev)}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid((prev) => !prev)}
        showFluxTubes={showFluxTubes}
        onToggleFluxTubes={() => setShowFluxTubes((prev) => !prev)}
        showTrails={showTrails}
        onToggleTrails={() => setShowTrails((prev) => !prev)}
        showHalos={showHalos}
        onToggleHalos={() => setShowHalos((prev) => !prev)}
        showVelocities={showVelocities}
        onToggleVelocities={() => setShowVelocities((prev) => !prev)}
        showEnergyGraph={showEnergyGraph}
        onToggleEnergyGraph={() => setShowEnergyGraph((prev) => !prev)}
        spawnColor={spawnColor}
        onChangeSpawnColor={setSpawnColor}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleFullscreen={handleToggleFullscreen}
        isRecording={playbackStatus.isRecording}
        isReplaying={playbackStatus.isReplaying}
        totalRecordedFrames={playbackStatus.totalFrames}
        onToggleRecord={handleToggleRecord}
        onToggleReplay={handleToggleReplay}
        cguiMode={thermo.cguiMode}
        cguiStage={thermo.cguiStage}
        onOpenFalsification={() => setIsFalsificationOpen(true)}
        onToggleCGUIMode={handleToggleCGUIMode}
        is3DMode={is3DMode}
        onToggle3DMode={() => setIs3DMode((prev) => !prev)}
        collisionCount={collisionHistory.length}
        onOpenCollisionLogs={() => {
          setModalCollisionEvent(activeToastEvent || collisionHistory[0] || null);
          setIsCollisionModalOpen(true);
        }}
      />

      {/* Main Simulation Viewport */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        {/* Dynamic 2D / 3D Simulation Viewport */}
        {is3DMode ? (
          <ThreeSimulationCanvas
            engine={engine}
            recorder={recorder}
            isRunning={isRunning}
            selectedParticleIdx={selectedParticle ? selectedParticle.index : null}
            onSelectParticle={setSelectedParticle}
            showFluxTubes={showFluxTubes}
            showHalos={showHalos}
            lastCollisionEvent={activeToastEvent}
          />
        ) : (
          <SimulationCanvas
            engine={engine}
            recorder={recorder}
            isRunning={isRunning}
            selectedParticleIdx={selectedParticle ? selectedParticle.index : null}
            onSelectParticle={setSelectedParticle}
            showQuadtree={showQuadtree}
            showGrid={showGrid}
            showFluxTubes={showFluxTubes}
            showTrails={showTrails}
            showHalos={showHalos}
            showVelocities={showVelocities}
            spawnColor={spawnColor}
          />
        )}

        {/* Pygame Faithful Monospace HUD Dashboard */}
        <HudDashboard
          thermo={thermo}
          onAdjustLambda={handleAdjustLambda}
          playbackStatus={playbackStatus}
          onOpenFalsification={() => setIsFalsificationOpen(true)}
        />

        {/* Selected Particle Quantum Inspector Card */}
        {selectedParticle && (
          <ParticleInspector
            particle={selectedParticle}
            onClose={() => setSelectedParticle(null)}
          />
        )}

        {/* State Snapshotting & Variable-Speed Playback Timeline Scrubber */}
        <PlaybackTimeline
          status={playbackStatus}
          onToggleRecord={handleToggleRecord}
          onEnterReplay={handleEnterReplay}
          onExitReplay={handleExitReplay}
          onTogglePlayReplay={handleTogglePlayReplay}
          onSeek={handleSeek}
          onStepForward={handleStepForward}
          onStepBackward={handleStepBackward}
          onSetSpeed={handleSetSpeed}
          onToggleLoop={handleToggleLoop}
          onResumeLiveFromCurrent={handleResumeLiveFromCurrent}
          onClearRecording={handleClearRecording}
        />

        {/* High-Energy Particle Collision Interactive Toast (with 3D Three.js hologram) */}
        <CollisionToast
          currentEvent={activeToastEvent}
          onDismiss={() => setActiveToastEvent(null)}
          onOpenModal={(ev) => {
            setModalCollisionEvent(ev);
            setIsCollisionModalOpen(true);
          }}
          onToggle3DMode={() => setIs3DMode(true)}
          is3DMode={is3DMode}
          collisionHistory={collisionHistory}
          onOpenLogHistory={() => {
            setModalCollisionEvent(activeToastEvent || collisionHistory[0] || null);
            setIsCollisionModalOpen(true);
          }}
        />

        {/* 3D High-Energy Collision Inspector Modal */}
        {isCollisionModalOpen && (
          <CollisionModal
            event={modalCollisionEvent}
            history={collisionHistory}
            onClose={() => setIsCollisionModalOpen(false)}
            onSelectEvent={(ev) => setModalCollisionEvent(ev)}
            onClearHistory={() => {
              engine.clearCollisionLogs();
              setCollisionHistory([]);
              setModalCollisionEvent(null);
            }}
            onToggle3DMode={() => setIs3DMode(true)}
            is3DMode={is3DMode}
          />
        )}

        {/* Thermodynamic Spectrum Rolling Sparkline - Plots contributions of E_kin, E_G, E_EM, E_C, E_rest each frame */}
        {showEnergyGraph && (
          <EnergyGraph
            engine={engine}
            thermo={thermo}
            onClose={() => setShowEnergyGraph(false)}
          />
        )}

        {/* CGUI 8D Falsification & Theoretical Suite Modal */}
        {isFalsificationOpen && (
          <FalsificationPanel
            cgui8d={engine.cgui8d}
            thermo={thermo}
            onClose={() => setIsFalsificationOpen(false)}
            onSetStage={handleSetCGUIStage}
            onSetMode={handleSetCGUIMode}
            onSetLambda={handleChangeLambda}
            onSetRy={handleSetCompactificationRy}
          />
        )}
      </main>

      {/* Physics Settings Drawer */}
      <PhysicsSettingsDrawer
        params={engine.params}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateParams={handleUpdateParams}
        onResetDefaults={handleResetDefaults}
        showVelocities={showVelocities}
        onToggleVelocities={handleToggleVelocities}
      />
    </div>
  );
}
