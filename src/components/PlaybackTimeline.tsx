import React from 'react';
import { PlaybackStatus } from '../types';
import {
  Circle,
  Square,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  RotateCcw,
  Sparkles,
  Film,
  FastForward,
} from 'lucide-react';

interface PlaybackTimelineProps {
  status: PlaybackStatus;
  onToggleRecord: () => void;
  onEnterReplay: () => void;
  onExitReplay: () => void;
  onTogglePlayReplay: () => void;
  onSeek: (frame: number) => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onSetSpeed: (speed: number) => void;
  onToggleLoop: () => void;
  onResumeLiveFromCurrent: () => void;
  onClearRecording: () => void;
}

const SPEED_OPTIONS = [0.1, 0.25, 0.5, 1.0, 2.0, 4.0];

export const PlaybackTimeline: React.FC<PlaybackTimelineProps> = ({
  status,
  onToggleRecord,
  onEnterReplay,
  onExitReplay,
  onTogglePlayReplay,
  onSeek,
  onStepForward,
  onStepBackward,
  onSetSpeed,
  onToggleLoop,
  onResumeLiveFromCurrent,
  onClearRecording,
}) => {
  const {
    isRecording,
    isReplaying,
    isPlayingReplay,
    currentFrame,
    totalFrames,
    speed,
    loop,
    maxFrames,
  } = status;

  const currentSeconds = (currentFrame / 60).toFixed(2);
  const totalSeconds = (totalFrames / 60).toFixed(2);

  return (
    <div
      id="cgui-playback-timeline"
      className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 w-[96%] max-w-4xl bg-[#080914]/95 border border-slate-700/70 rounded-lg backdrop-blur-md px-3.5 py-2 shadow-2xl text-slate-200 font-sans select-none"
    >
      <div className="flex flex-col gap-2">
        {/* Top row: Status indicators, Mode Switch, and Quick Actions */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
          {/* Left: Mode Badge & Record Control */}
          <div className="flex items-center gap-2">
            {/* Live / Replay mode badge */}
            <div className="flex items-center rounded bg-slate-900 border border-slate-800 p-0.5">
              <button
                type="button"
                onClick={onExitReplay}
                className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider transition cursor-pointer ${
                  !isReplaying
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                LIVE
              </button>
              <button
                type="button"
                onClick={onEnterReplay}
                disabled={totalFrames === 0}
                className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider transition cursor-pointer ${
                  isReplaying
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : totalFrames > 0
                    ? 'text-indigo-400 hover:text-indigo-300'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
              >
                REPLAY {totalFrames > 0 && `(${totalFrames})`}
              </button>
            </div>

            {/* Record / Stop button */}
            <button
              id="playback-record-btn"
              type="button"
              onClick={onToggleRecord}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-bold text-[11px] transition cursor-pointer border ${
                isRecording
                  ? 'bg-rose-950/80 text-rose-300 border-rose-600 animate-pulse'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700 hover:text-rose-400'
              }`}
              title={isRecording ? 'Stop recording simulation segment' : 'Record snapshot history'}
            >
              {isRecording ? (
                <>
                  <Square size={11} className="fill-rose-500 text-rose-500" />
                  <span>STOP REC</span>
                </>
              ) : (
                <>
                  <Circle size={11} className="fill-rose-500 text-rose-500" />
                  <span>REC SNAPSHOTS</span>
                </>
              )}
            </button>

            {/* Recording progress meter if recording */}
            {isRecording && (
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>
                  {totalFrames}/{maxFrames}f ({(totalFrames / 60).toFixed(1)}s)
                </span>
              </div>
            )}
          </div>

          {/* Center/Right: Frame count and Branching button */}
          <div className="flex items-center gap-2">
            {totalFrames > 0 && (
              <div className="font-mono text-[11px] text-slate-300">
                <span className="text-cyan-400 font-bold">
                  {currentFrame + 1}
                </span>
                <span className="text-slate-500"> / </span>
                <span>{totalFrames} frames</span>
                <span className="text-slate-400 ml-1.5">
                  ({currentSeconds}s / {totalSeconds}s)
                </span>
              </div>
            )}

            {isReplaying && (
              <button
                type="button"
                onClick={onResumeLiveFromCurrent}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-700/80 hover:bg-emerald-600 text-white font-semibold text-[10px] transition cursor-pointer shadow-sm"
                title="Branch live simulation forward starting from this exact snapshot frame"
              >
                <Sparkles size={11} />
                <span>Resume Live from Here</span>
              </button>
            )}

            {totalFrames > 0 && !isRecording && (
              <button
                type="button"
                onClick={onClearRecording}
                className="text-slate-500 hover:text-rose-400 p-1 rounded transition cursor-pointer text-[10px]"
                title="Discard recorded snapshot segment"
              >
                <RotateCcw size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Timeline Scrubber Bar (visible when frames are recorded) */}
        {totalFrames > 0 && (
          <div className="flex items-center gap-2">
            <input
              id="playback-scrubber-range"
              type="range"
              min={0}
              max={Math.max(0, totalFrames - 1)}
              value={currentFrame}
              onChange={(e) => onSeek(parseInt(e.target.value, 10))}
              className="flex-1 h-2 bg-slate-800 accent-indigo-400 rounded-lg cursor-pointer transition"
              title="Scrub timeline (drag to seek snapshot)"
            />
          </div>
        )}

        {/* Bottom row: Replay Controls & Variable Speeds */}
        {totalFrames > 0 && (
          <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5 border-t border-slate-800/80">
            {/* Playback step and play/pause controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onStepBackward}
                className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Step 1 frame backward"
              >
                <SkipBack size={13} />
              </button>

              <button
                type="button"
                onClick={onTogglePlayReplay}
                className={`flex items-center gap-1 px-2.5 py-1 rounded font-bold text-xs transition cursor-pointer ${
                  isPlayingReplay
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
                title="Play or Pause replay"
              >
                {isPlayingReplay ? <Pause size={13} /> : <Play size={13} />}
                <span>{isPlayingReplay ? 'Pause' : 'Replay'}</span>
              </button>

              <button
                type="button"
                onClick={onStepForward}
                className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Step 1 frame forward"
              >
                <SkipForward size={13} />
              </button>

              <button
                type="button"
                onClick={onToggleLoop}
                className={`p-1 rounded border transition cursor-pointer ${
                  loop
                    ? 'bg-indigo-950/60 text-indigo-300 border-indigo-700'
                    : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                }`}
                title={loop ? 'Looping enabled' : 'Looping disabled'}
              >
                <Repeat size={13} />
              </button>
            </div>

            {/* Variable Speeds */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 mr-0.5 font-semibold flex items-center gap-0.5">
                <FastForward size={11} />
                Speed:
              </span>
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5 gap-0.5">
                {SPEED_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onSetSpeed(opt)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                      Math.abs(speed - opt) < 0.01
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {opt}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
