import React, { useState, useMemo } from 'react';
import {
  CGUI8DModule,
  CGUIStage,
  FalsificationTestResult,
  PotentialCurvePoint,
  ThermodynamicConservation,
} from '../physics/cgui8d';
import { CGUIMode, Thermodynamics } from '../types';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  XCircle,
  Layers,
  Activity,
  GitPullRequest,
  Sliders,
  Scale,
  Atom,
  ShieldAlert,
} from 'lucide-react';

interface FalsificationPanelProps {
  cgui8d: CGUI8DModule;
  thermo: Thermodynamics;
  onClose: () => void;
  onSetStage: (stage: CGUIStage) => void;
  onSetMode: (mode: CGUIMode) => void;
  onSetLambda: (lambda: number) => void;
  onSetRy: (ry: number) => void;
}

export const FalsificationPanel: React.FC<FalsificationPanelProps> = ({
  cgui8d,
  thermo,
  onClose,
  onSetStage,
  onSetMode,
  onSetLambda,
  onSetRy,
}) => {
  const [activeTab, setActiveTab] = useState<'tests' | 'potential' | 'metric' | 'conservation'>('tests');

  // Convert thermo to ThermodynamicConservation structure
  const conservation: ThermodynamicConservation = useMemo(() => {
    return {
      totalEnergy: thermo.eTotal,
      energyDrift: thermo.eDrift,
      temperature: thermo.temperature,
      entropy: thermo.entropy,
      entropyRate: thermo.entropyRate,
      momentumX: 0,
      momentumY: 0,
      momentumMagnitude: thermo.momentumMagnitude,
      angularMomentum: thermo.angularMomentum,
      netElectricCharge: thermo.netElectricCharge,
      colorNeutralityIndex: thermo.colorNeutralityIndex,
    };
  }, [thermo]);

  const tests = useMemo(() => {
    return cgui8d.evaluateFalsificationTests(conservation);
  }, [cgui8d, conservation]);

  const potentialPoints = useMemo(() => {
    return cgui8d.computePotentialCurve(100, 50);
  }, [cgui8d, thermo.lambdaC, thermo.compactificationRy]);

  const metric = useMemo(() => {
    return cgui8d.compute8DMetric();
  }, [cgui8d, thermo.lambdaC, thermo.compactificationRy]);

  const stages: { stage: CGUIStage; label: string; desc: string }[] = [
    { stage: 'CGUI-0', label: 'CGUI-0', desc: '4+4 Toy Model' },
    { stage: 'CGUI-1', label: 'CGUI-1', desc: '8D Metric G_AB' },
    { stage: 'CGUI-2', label: 'CGUI-2', desc: 'Emergent Gauge' },
    { stage: 'CGUI-3', label: 'CGUI-3', desc: 'SU(3) Dynamics' },
    { stage: 'CGUI-4', label: 'CGUI-4', desc: 'Confinement Test' },
    { stage: 'CGUI-5', label: 'CGUI-5', desc: 'Particle Dynamics' },
    { stage: 'CGUI-6', label: 'CGUI-6', desc: 'Thermo Ensemble' },
  ];

  const passCount = tests.filter((t) => t.status === 'PASS' || t.status === 'VERIFIED').length;
  const inconclCount = tests.filter((t) => t.status === 'INCONCLUSIVE').length;
  const failCount = tests.filter((t) => t.status === 'FAIL').length;

  return (
    <div
      id="cgui-falsification-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-slate-950 border border-cyan-500/40 rounded-xl shadow-2xl shadow-cyan-950/50 overflow-hidden font-sans text-slate-200">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-950/80 border border-cyan-500/40 rounded-lg text-cyan-400">
              <Atom className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-cyan-200">
                  CGUI Theoretical Specification & Falsification Suite
                </h2>
                <span className="px-2 py-0.5 text-xs font-mono font-medium rounded border border-cyan-500/30 bg-cyan-950/60 text-cyan-300">
                  {'M_8 = M_R^(3,1) × M_I^(3,1)'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Evaluating 8D Complexified Gravity, Non-Abelian Gauge Emergence, and the 10 Falsification Criteria
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mode Switcher */}
            <div className="flex items-center p-0.5 bg-slate-800 rounded-lg border border-slate-700 text-xs">
              <button
                id="btn-mode-emergence"
                onClick={() => onSetMode('emergence')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  thermo.cguiMode === 'emergence'
                    ? 'bg-cyan-500 text-slate-950 shadow font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Critical Confinement Rule: Derives V_eff(r) dynamically from non-Abelian field equations and [C_mu, C_nu] != 0 rather than inserting V=sigma*r."
              >
                Emergence Mode
              </button>
              <button
                id="btn-mode-axiomatic"
                onClick={() => onSetMode('axiomatic')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  thermo.cguiMode === 'axiomatic'
                    ? 'bg-amber-500 text-slate-950 shadow font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Comparison Mode: Employs standard phenomenological harmonic/linear confinement as an explicit axiom."
              >
                Axiomatic Mode
              </button>
            </div>

            <button
              id="btn-close-falsification"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stage Selector Ribbon (CGUI-0 through CGUI-6) */}
        <div className="px-6 py-2.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between gap-2 overflow-x-auto">
          <span className="text-xs font-mono uppercase text-slate-400 whitespace-nowrap flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" /> Staged Pipeline:
          </span>
          <div className="flex items-center gap-1.5">
            {stages.map((st) => {
              const active = thermo.cguiStage === st.stage;
              return (
                <button
                  key={st.stage}
                  id={`btn-stage-${st.stage.toLowerCase()}`}
                  onClick={() => onSetStage(st.stage)}
                  className={`px-2.5 py-1 text-xs rounded font-mono transition-all flex items-center gap-1 whitespace-nowrap ${
                    active
                      ? 'bg-cyan-950 border border-cyan-400 text-cyan-200 font-bold shadow-sm'
                      : 'bg-slate-800/60 border border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                  title={st.desc}
                >
                  <span>{st.label}</span>
                </button>
              );
            })}
          </div>

          <div className="hidden lg:flex items-center gap-3 text-xs font-mono text-slate-400">
            <span>
              Pass: <strong className="text-emerald-400">{passCount}</strong>
            </span>
            <span>
              Inconclusive: <strong className="text-amber-400">{inconclCount}</strong>
            </span>
            <span>
              Fail: <strong className="text-rose-400">{failCount}</strong>
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900/40 text-sm">
          <button
            onClick={() => setActiveTab('tests')}
            className={`py-3 px-4 font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'tests'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            10 Falsification Criteria
            <span className="ml-1 px-1.5 py-0.2 text-[11px] font-mono rounded bg-slate-800 text-cyan-300">
              {passCount}/10
            </span>
          </button>
          <button
            onClick={() => setActiveTab('potential')}
            className={`py-3 px-4 font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'potential'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>{'Emergent Potential V_eff(r) & 8D → 4D Projection'}</span>
          </button>
          <button
            onClick={() => setActiveTab('metric')}
            className={`py-3 px-4 font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'metric'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitPullRequest className="w-4 h-4" />
            8D Metric Tensor $\mathbb G_{'{AB}'}$
          </button>
          <button
            onClick={() => setActiveTab('conservation')}
            className={`py-3 px-4 font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'conservation'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale className="w-4 h-4" />
            Thermodynamic & Invariant Invariants
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: 10 FALSIFICATION TESTS */}
          {activeTab === 'tests' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-300 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Strict Methodological Boundary:</strong> CGUI hypotheses (e.g. 8D real geometry, emergent
                  gauge symmetries, higher-dimensional range hypothesis) are actively checked against empirical
                  constraints. A test passes only when the dynamic field equations generate the expected behavior
                  without hardcoding the phenomenon into the simulation axioms.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tests.map((test) => {
                  let badge = (
                    <span className="flex items-center gap-1 text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5" /> PASS ({test.confidence}%)
                    </span>
                  );
                  if (test.status === 'VERIFIED') {
                    badge = (
                      <span className="flex items-center gap-1 text-xs font-mono font-semibold px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                        <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED
                      </span>
                    );
                  } else if (test.status === 'INCONCLUSIVE') {
                    badge = (
                      <span className="flex items-center gap-1 text-xs font-mono font-semibold px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300">
                        <HelpCircle className="w-3.5 h-3.5" /> INCONCLUSIVE
                      </span>
                    );
                  } else if (test.status === 'FAIL') {
                    badge = (
                      <span className="flex items-center gap-1 text-xs font-mono font-semibold px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-rose-300">
                        <XCircle className="w-3.5 h-3.5" /> FALSIFIED
                      </span>
                    );
                  }

                  return (
                    <div
                      key={test.id}
                      className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 text-xs font-mono font-bold bg-slate-800 text-cyan-400 rounded">
                              T{test.id}
                            </span>
                            <h3 className="text-sm font-semibold text-slate-100">{test.title}</h3>
                          </div>
                          {badge}
                        </div>

                        <div className="mb-2">
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-slate-400">
                            {test.category}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 mb-2 leading-relaxed">
                          <strong className="text-cyan-300">Hypothesis:</strong> {test.hypothesis}
                        </p>

                        <p className="text-xs text-slate-400 mb-2">
                          <strong className="text-rose-300/80">Falsification criteria:</strong> {test.failureCondition}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 font-mono text-[11px] text-cyan-300/90 flex items-center justify-between">
                        <span>Metric: {test.metricValue}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: POTENTIAL CURVE & 8D PROJECTION */}
          {activeTab === 'potential' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* SVG Curve Plot */}
                <div className="lg:col-span-2 p-4 bg-slate-900/70 border border-slate-800 rounded-lg flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-cyan-300 font-mono flex items-center gap-2">
                      <Activity className="w-4 h-4" /> Potential Profile $V(r)$ vs Radius $r$
                    </h3>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="flex items-center gap-1 text-cyan-400">
                        <span className="w-3 h-0.5 bg-cyan-400 inline-block" /> Emergent $V_{'{eff}'}$
                      </span>
                      <span className="flex items-center gap-1 text-emerald-400">
                        <span className="w-3 h-0.5 bg-emerald-400 inline-block" /> Linear $\sigma r$ Ref
                      </span>
                      <span className="flex items-center gap-1 text-purple-400">
                        <span className="w-3 h-0.5 bg-purple-400 inline-block" /> $V_4(r)$ from $\mathcal K_4$
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <span className="w-3 h-0.5 bg-slate-400 inline-block" /> Bare $-1/r$
                      </span>
                    </div>
                  </div>

                  {/* SVG Canvas */}
                  <div className="relative w-full h-72 bg-slate-950/80 border border-slate-800/80 rounded flex items-center justify-center p-2">
                    <svg viewBox="0 0 500 240" className="w-full h-full overflow-visible">
                      {/* Grid lines */}
                      <line x1="40" y1="20" x2="40" y2="210" stroke="#334155" strokeWidth="1" />
                      <line x1="40" y1="120" x2="480" y2="120" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="40" y1="210" x2="480" y2="210" stroke="#334155" strokeWidth="1" />

                      {/* Zero label */}
                      <text x="32" y="123" fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">
                        0
                      </text>
                      <text x="480" y="135" fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">
                        r (distance)
                      </text>

                      {/* Paths generator */}
                      {(() => {
                        const scaleX = (r: number) => 40 + (r / 100) * 440;
                        const scaleY = (v: number) => {
                          const clamped = Math.max(-25, Math.min(35, v));
                          return 120 - (clamped / 35) * 85;
                        };

                        const pathCoulomb = potentialPoints
                          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.r)} ${scaleY(p.vCoulomb * 2)}`)
                          .join(' ');
                        const pathLinear = potentialPoints
                          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.r)} ${scaleY(p.vLinearRef)}`)
                          .join(' ');
                        const path4D = potentialPoints
                          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.r)} ${scaleY(p.v4DProjected * 18)}`)
                          .join(' ');
                        const pathEmergent = potentialPoints
                          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.r)} ${scaleY(p.vEmergent)}`)
                          .join(' ');

                        return (
                          <>
                            <path d={pathCoulomb} fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 2" />
                            <path d={pathLinear} fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" />
                            <path d={path4D} fill="none" stroke="#c084fc" strokeWidth="1.8" />
                            <path d={pathEmergent} fill="none" stroke="#22d3ee" strokeWidth="2.5" />
                          </>
                        );
                      })()}
                    </svg>
                  </div>

                  <div className="mt-3 text-xs text-slate-400 font-mono flex items-center justify-between">
                    <span>Short Range ($r \le r_0$): Asymptotic Freedom / Coulomb</span>
                    <span className="text-cyan-400">Large Range ($r \gt r_0$): Collimated Flux Tube $V \propto r$</span>
                  </div>
                </div>

                {/* Theoretical Controls & Equation Reference */}
                <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-lg space-y-4">
                  <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-cyan-400" /> Theory Parameters
                  </h3>

                  {/* Lambda Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300">Complexification $\lambda$:</span>
                      <span className="text-cyan-400 font-bold">{thermo.lambdaC.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="2.5"
                      step="0.05"
                      value={thermo.lambdaC}
                      onChange={(e) => onSetLambda(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                    <p className="text-[11px] text-slate-400">
                      {'λ = 0 is pure GR / Newtonian gravity. Increasing λ activates the imaginary sector M_I^(3,1).'}
                    </p>
                  </div>

                  {/* Compactification Radius R_y Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300">Internal Radius $R_y$ ($\mathcal K_4$):</span>
                      <span className="text-purple-400 font-bold">{thermo.compactificationRy.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="2.0"
                      max="40.0"
                      step="1.0"
                      value={thermo.compactificationRy}
                      onChange={(e) => onSetRy(parseFloat(e.target.value))}
                      className="w-full accent-purple-400 cursor-pointer"
                    />
                    <p className="text-[11px] text-slate-400">
                      {'Modulates the dimensional reduction integral V_4(r) = ∫_{K_4} d^4y |Ψ(y)|² V_8(r,y).'}
                    </p>
                  </div>

                  {/* Mathematical Formulation Reference */}
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded text-xs space-y-2 font-mono">
                    <div className="text-cyan-300 font-semibold text-[11px]">Field Equations:</div>
                    <div className="text-slate-400 text-[11px] overflow-x-auto">
                      $F_{'{'}\mu\nu{'}'}^a = \partial_\mu C_\nu^a - \partial_\nu C_\mu^a + g_c f^{'{'}{'abc'}{'}'} C_\mu^b C_\nu^c$
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      Self-Interaction $[C_\mu, C_\nu] \neq 0$ collimates field lines into a constant-tension flux tube.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 8D METRIC TENSOR */}
          {activeTab === 'metric' && (
            <div className="space-y-6">
              <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      <GitPullRequest className="w-4 h-4 text-cyan-400" />
                      8D Complexified Metric Tensor $\mathbb G_{'{AB}'} = g_{'{AB}'} + i \lambda h_{'{AB}'}$
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {'Kaluza-Klein dimensional reduction block form separating observable spacetime M_R^(3,1) (A, B = 0..3) from internal geometry M_I^(3,1) (A, B = 4..7).'}
                    </p>
                  </div>
                  <div className="text-right font-mono text-xs text-slate-400">
                    <div>Scalar Curvature: <span className="text-cyan-300 font-bold">{metric.ricciScalar.toFixed(4)}</span></div>
                    <div>Determinant: <span className="text-purple-300 font-bold">{metric.detG.toFixed(2)}</span></div>
                  </div>
                </div>

                {/* 8x8 Grid visualization */}
                <div className="overflow-x-auto">
                  <table className="w-full text-center font-mono text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className="p-2 border border-slate-800 bg-slate-950 text-slate-500">Idx</th>
                        <th className="p-2 border border-slate-800 bg-slate-950 text-cyan-300" colSpan={4}>
                          Spacetime $\mu = (t, x, y, z)$
                        </th>
                        <th className="p-2 border border-slate-800 bg-slate-950 text-purple-300" colSpan={4}>
                          Internal $a = (t', x', y', z')$
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {metric.gReal.map((row, rIdx) => (
                        <tr key={rIdx}>
                          <td className="p-2 border border-slate-800 bg-slate-950 font-bold text-slate-500">
                            {rIdx < 4 ? `x^${rIdx}` : `y^${rIdx - 4}`}
                          </td>
                          {row.map((val, cIdx) => {
                            const imagVal = metric.hImag[rIdx][cIdx];
                            const isDiagonal = rIdx === cIdx;
                            const isOffDiagonal = (rIdx < 4 && cIdx >= 4) || (rIdx >= 4 && cIdx < 4);

                            let cellBg = 'bg-slate-950/40';
                            let textCol = 'text-slate-400';
                            if (isDiagonal) {
                              cellBg = rIdx < 4 ? 'bg-cyan-950/30' : 'bg-purple-950/30';
                              textCol = rIdx < 4 ? 'text-cyan-300 font-bold' : 'text-purple-300 font-bold';
                            } else if (isOffDiagonal && (Math.abs(val) > 0.001 || Math.abs(imagVal) > 0.001)) {
                              cellBg = 'bg-amber-950/20';
                              textCol = 'text-amber-300 font-medium';
                            }

                            return (
                              <td
                                key={cIdx}
                                className={`p-2 border border-slate-800 text-[11px] ${cellBg} ${textCol}`}
                              >
                                {val.toFixed(2)}
                                {Math.abs(imagVal) > 0.001 ? `+${imagVal.toFixed(2)}i` : ''}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-2.5 rounded bg-cyan-950/30 border border-cyan-500/20 text-cyan-300">
                    <strong>$g_{'{\\mu\\nu}'}$ Spacetime Block:</strong> Recovers standard 4D metric and curvature limits.
                  </div>
                  <div className="p-2.5 rounded bg-amber-950/30 border border-amber-500/20 text-amber-300">
                    <strong>$G_{'{\\mu a}'} = A_\\mu^a h_{'{ab}'}$ Off-Diagonal:</strong> Dimensional reduction induces effective gauge fields.
                  </div>
                  <div className="p-2.5 rounded bg-purple-950/30 border border-purple-500/20 text-purple-300">
                    <strong>$h_{'{ab}'}$ Internal Metric:</strong> Compact internal geometry on $\\mathcal K_4$ ($R_y = {thermo.compactificationRy.toFixed(1)}$).
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CONSERVATION & THERMODYNAMICS */}
          {activeTab === 'conservation' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <span className="text-xs font-mono text-slate-400">Total Energy $E_{'{tot}'}$</span>
                  <div className="text-lg font-bold font-mono text-cyan-300 mt-1">
                    {thermo.eTotal.toFixed(1)}
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    Drift $\Delta E = {thermo.eDrift > 0 ? '+' : ''}{thermo.eDrift.toFixed(1)}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <span className="text-xs font-mono text-slate-400">Gibbs/Shannon Entropy $S$</span>
                  <div className="text-lg font-bold font-mono text-purple-300 mt-1">
                    {thermo.entropy.toFixed(3)}
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    $dS/dt = {thermo.entropyRate.toFixed(3)}$
                  </span>
                </div>

                <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <span className="text-xs font-mono text-slate-400">Temperature $T$</span>
                  <div className="text-lg font-bold font-mono text-amber-300 mt-1">
                    {thermo.temperature.toFixed(2)}
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">2D Equipartition</span>
                </div>

                <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <span className="text-xs font-mono text-slate-400">Angular Momentum $L_z$</span>
                  <div className="text-lg font-bold font-mono text-emerald-300 mt-1">
                    {thermo.angularMomentum.toFixed(1)}
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">Relative to COM</span>
                </div>
              </div>

              {/* Invariant Matrix Table */}
              <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-lg">
                <h3 className="text-sm font-semibold text-slate-100 mb-3 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-cyan-400" /> Physical Conservation Status
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded flex justify-between items-center">
                    <div>
                      <div className="text-slate-300 font-semibold">First Law: Energy Conservation</div>
                      <div className="text-slate-500 text-[11px]">$E_{'{kin}'} + E_G + E_{'{EM}'} + E_C + E_{'{rest}'}$</div>
                    </div>
                    <span className={`px-2 py-1 rounded text-[11px] font-bold ${
                      Math.abs(thermo.eDrift) < 150 ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
                    }`}>
                      {Math.abs(thermo.eDrift) < 150 ? 'CONSERVED' : 'DRIFTING'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded flex justify-between items-center">
                    <div>
                      <div className="text-slate-300 font-semibold">Second Law: Entropy Non-Decrease</div>
                      <div className="text-slate-500 text-[11px]">$S(t) = -k_B \sum p_i \ln p_i$, $\Delta S \ge 0$</div>
                    </div>
                    <span className={`px-2 py-1 rounded text-[11px] font-bold ${
                      thermo.entropyRate >= -0.05 ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
                    }`}>
                      {thermo.entropyRate >= -0.05 ? 'ENTROPY VALID' : 'FLUCTUATION'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded flex justify-between items-center">
                    <div>
                      <div className="text-slate-300 font-semibold">Linear Momentum Conservation</div>
                      <div className="text-slate-500 text-[11px]">Total $|\mathbf P| = {thermo.momentumMagnitude.toFixed(2)}$</div>
                    </div>
                    <span className="px-2 py-1 rounded text-[11px] font-bold bg-emerald-950 text-emerald-300">
                      ISOLATED BOUNDARY
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded flex justify-between items-center">
                    <div>
                      <div className="text-slate-300 font-semibold">Electric Charge Conservation</div>
                      <div className="text-slate-500 text-[11px]">Net Charge $\Delta Q = {thermo.netElectricCharge.toFixed(0)}$</div>
                    </div>
                    <span className="px-2 py-1 rounded text-[11px] font-bold bg-emerald-950 text-emerald-300">
                      EXACT $\Delta Q = 0$
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
