import { PhysicsEngine } from './engine';
import { SimulationSnapshot, PlaybackStatus } from '../types';

export class SimulationRecorder {
  snapshots: SimulationSnapshot[] = [];
  maxFrames: number = 600; // ~10-12s at 60 FPS (~15MB max)

  isRecording: boolean = false;
  isReplaying: boolean = false;
  isPlayingReplay: boolean = false;
  currentFrameIndex: number = 0;
  playbackSubframe: number = 0; // for fractional sub-frame speed e.g. 0.1x, 0.25x
  speed: number = 1.0;
  loop: boolean = true;

  constructor(maxFrames: number = 600) {
    this.maxFrames = maxFrames;
  }

  startRecording(clearExisting: boolean = true): void {
    if (clearExisting) {
      this.snapshots = [];
      this.currentFrameIndex = 0;
      this.playbackSubframe = 0;
    }
    this.isRecording = true;
    this.isReplaying = false;
    this.isPlayingReplay = false;
  }

  stopRecording(): void {
    this.isRecording = false;
    if (this.snapshots.length > 0) {
      this.currentFrameIndex = 0;
      this.playbackSubframe = 0;
    }
  }

  toggleRecording(): boolean {
    if (this.isRecording) {
      this.stopRecording();
      return false;
    } else {
      this.startRecording(true);
      return true;
    }
  }

  captureFrame(engine: PhysicsEngine): void {
    if (!this.isRecording) return;

    const frameIdx = this.snapshots.length;
    const snap = engine.createSnapshot(frameIdx);

    if (this.snapshots.length >= this.maxFrames) {
      // Shift oldest frame out to maintain rolling buffer of max length
      this.snapshots.shift();
      // Re-index
      for (let i = 0; i < this.snapshots.length; i++) {
        this.snapshots[i].frameIndex = i;
      }
      snap.frameIndex = this.snapshots.length;
    }

    this.snapshots.push(snap);
  }

  enterReplay(engine: PhysicsEngine, autoPlay: boolean = true): void {
    if (this.snapshots.length === 0) return;
    this.isRecording = false;
    this.isReplaying = true;
    this.isPlayingReplay = autoPlay;
    this.currentFrameIndex = 0;
    this.playbackSubframe = 0;
    this.seekTo(0, engine);
  }

  exitReplay(): void {
    this.isReplaying = false;
    this.isPlayingReplay = false;
  }

  seekTo(frameIndex: number, engine: PhysicsEngine): void {
    if (this.snapshots.length === 0) return;
    const clamped = Math.max(0, Math.min(this.snapshots.length - 1, Math.round(frameIndex)));
    this.currentFrameIndex = clamped;
    this.playbackSubframe = clamped;
    const snap = this.snapshots[clamped];
    if (snap) {
      engine.restoreSnapshot(snap);
    }
  }

  stepReplayForward(engine: PhysicsEngine): void {
    if (this.snapshots.length === 0) return;
    this.isPlayingReplay = false;
    const next = Math.min(this.snapshots.length - 1, this.currentFrameIndex + 1);
    this.seekTo(next, engine);
  }

  stepReplayBackward(engine: PhysicsEngine): void {
    if (this.snapshots.length === 0) return;
    this.isPlayingReplay = false;
    const prev = Math.max(0, this.currentFrameIndex - 1);
    this.seekTo(prev, engine);
  }

  togglePlayPause(engine?: PhysicsEngine): void {
    if (this.snapshots.length === 0) return;
    if (!this.isReplaying) {
      if (engine) {
        this.enterReplay(engine, true);
      }
      return;
    }
    this.isPlayingReplay = !this.isPlayingReplay;
  }

  setSpeed(newSpeed: number): void {
    this.speed = Math.max(0.05, Math.min(8.0, newSpeed));
  }

  setLoop(newLoop: boolean): void {
    this.loop = newLoop;
  }

  /**
   * Advances the playback by delta time.
   * Speed affects how many frames advance per second.
   * At 60 FPS reference: framesPerSec = 60 * speed.
   */
  updatePlayback(dt: number, engine: PhysicsEngine): void {
    if (!this.isReplaying || !this.isPlayingReplay || this.snapshots.length <= 1) {
      return;
    }

    // dt is seconds elapsed (e.g. 0.016 for 60fps)
    // frame delta = dt * 60 * speed
    const frameAdvance = dt * 60 * this.speed;
    this.playbackSubframe += frameAdvance;

    const total = this.snapshots.length;

    if (this.playbackSubframe >= total - 1) {
      if (this.loop) {
        this.playbackSubframe = this.playbackSubframe % total;
      } else {
        this.playbackSubframe = total - 1;
        this.isPlayingReplay = false;
      }
    } else if (this.playbackSubframe < 0) {
      this.playbackSubframe = 0;
    }

    const targetIdx = Math.floor(this.playbackSubframe);
    if (targetIdx !== this.currentFrameIndex) {
      this.currentFrameIndex = targetIdx;
      const snap = this.snapshots[targetIdx];
      if (snap) {
        engine.restoreSnapshot(snap);
      }
    }
  }

  resumeLiveFromCurrent(engine: PhysicsEngine): void {
    if (this.snapshots.length > 0) {
      const snap = this.snapshots[this.currentFrameIndex];
      if (snap) {
        engine.restoreSnapshot(snap);
      }
    }
    this.isReplaying = false;
    this.isPlayingReplay = false;
  }

  clear(): void {
    this.snapshots = [];
    this.isRecording = false;
    this.isReplaying = false;
    this.isPlayingReplay = false;
    this.currentFrameIndex = 0;
    this.playbackSubframe = 0;
  }

  getStatus(): PlaybackStatus {
    return {
      isRecording: this.isRecording,
      isReplaying: this.isReplaying,
      isPlayingReplay: this.isPlayingReplay,
      currentFrame: this.currentFrameIndex,
      totalFrames: this.snapshots.length,
      speed: this.speed,
      loop: this.loop,
      maxFrames: this.maxFrames,
    };
  }
}
