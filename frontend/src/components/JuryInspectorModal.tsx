import React from 'react';
import { X, Scale, CheckCircle, AlertTriangle, ShieldCheck, Cpu, FileCheck, ShieldAlert, Split } from 'lucide-react';
import { LicenseVault, getSimilarityScoreColor, formatGen } from '../utils/helpers';

interface JuryInspectorModalProps {
  isOpen: boolean;
  vault: LicenseVault | null;
  onClose: () => void;
}

export const JuryInspectorModal: React.FC<JuryInspectorModalProps> = ({
  isOpen,
  vault,
  onClose,
}) => {
  if (!isOpen || !vault) return null;

  const isFullInfringed = vault.verdict === 'FULL_INFRINGEMENT' || vault.verdict === 'INFRINGEMENT_CONFIRMED';
  const isPartial = vault.verdict === 'PARTIAL_INFRINGEMENT';
  const isConceded = vault.verdict === 'MUTUAL_CONCEDED';

  const simMeta = getSimilarityScoreColor(vault.similarity_score);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm">
      <div className="bg-card border border-linen-300 rounded-xl shadow-elevated w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-linen-300 flex items-center justify-between bg-linen-50">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
              isFullInfringed
                ? 'bg-crimson-light text-crimson border border-crimson-border'
                : isPartial
                ? 'bg-amber-50 text-amber-700 border border-amber-300'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-ink-900">
                Two-Sided AI Copyright Jury Verdict
              </h3>
              <p className="text-xs text-ink-500 font-mono">
                Vault: {vault.vault_id} &bull; Consensus: gl.vm.run_nondet &bull; Equivalence on Verdict
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-ink-900 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Main Verdict Banner */}
          <div className={`p-4 rounded-lg border flex items-center justify-between ${
            isFullInfringed
              ? 'bg-crimson-light/70 border-crimson-border text-crimson'
              : isPartial
              ? 'bg-amber-50 border-amber-300 text-amber-800'
              : isConceded
              ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
          }`}>
            <div className="flex items-center space-x-3">
              {isFullInfringed ? (
                <AlertTriangle className="w-6 h-6 shrink-0 text-crimson" />
              ) : isPartial ? (
                <Split className="w-6 h-6 shrink-0 text-amber-700" />
              ) : (
                <CheckCircle className="w-6 h-6 shrink-0 text-emerald-700" />
              )}
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider font-semibold block">
                  Consensus Ruling (Tiered Justice)
                </span>
                <span className="text-lg font-display font-bold">
                  {vault.verdict.replace('_', ' ')}
                </span>
                <span className="text-xs block opacity-85 mt-0.5">
                  {isFullInfringed
                    ? '100% Escrow deposit slashed to IP Creator as liquidated damages'
                    : isPartial
                    ? '50/50 Balanced Split: 50% to Creator damages, 50% returned to Licensee'
                    : isConceded
                    ? 'Amicably resolved: Licensee voluntarily conceded claim'
                    : 'Claim dismissed: 100% deposit preserved, dispute bond awarded to Licensee'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-mono tracking-wider text-ink-500 block">
                Validator Confidence
              </span>
              <span className="text-base font-mono font-bold">
                {vault.confidence}%
              </span>
            </div>
          </div>

          {/* 3-Tier Similarity Score Metric Bar */}
          <div className="bg-linen-50 border border-linen-300 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-ultramarine" />
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-700">
                  AI Style DNA Overlap Metric
                </span>
              </div>
              <span className={`text-sm font-mono font-bold px-2 py-0.5 rounded border ${simMeta.bg} ${simMeta.text} ${simMeta.border}`}>
                {vault.similarity_score} / 100 &bull; {simMeta.tier}
              </span>
            </div>
            {/* 3-Zone Progress bar */}
            <div className="w-full h-3 bg-linen-200 rounded-full overflow-hidden relative">
              {/* Background zone markers */}
              <div className="absolute inset-0 flex">
                <div className="w-1/2 h-full border-r border-linen-300 opacity-20 bg-emerald-300" title="Clean (<50%)" />
                <div className="w-1/4 h-full border-r border-linen-300 opacity-20 bg-amber-300" title="Partial (50-74%)" />
                <div className="w-1/4 h-full opacity-20 bg-crimson-light" title="Infringement (>=75%)" />
              </div>
              <div
                className={`h-full rounded-full transition-all duration-500 relative z-10 ${
                  vault.similarity_score >= 75
                    ? 'bg-crimson'
                    : vault.similarity_score >= 50
                    ? 'bg-amber'
                    : 'bg-emerald-600'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, vault.similarity_score))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-ink-500 font-mono mt-2">
              <span className="text-emerald-700 font-medium">0 - 49%: Clean / Independent</span>
              <span className="text-amber-700 font-medium">50 - 74%: Partial / Derivative</span>
              <span className="text-crimson font-medium">75 - 100%: Full Infringement</span>
            </div>
          </div>

          {/* Two-Sided Evidence Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Creator Accusation */}
            <div className="bg-card border border-crimson-border/60 rounded-lg p-3.5 space-y-2">
              <div className="flex items-center space-x-1.5 text-crimson font-semibold text-xs uppercase tracking-wider">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Creator Accusation Evidence</span>
              </div>
              {vault.infringement_url ? (
                <div>
                  <span className="text-[11px] text-ink-500 block mb-1">Disputed Product URL:</span>
                  <a
                    href={vault.infringement_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs text-ultramarine hover:underline truncate block"
                  >
                    {vault.infringement_url}
                  </a>
                </div>
              ) : (
                <span className="text-xs text-ink-400 italic">No infringement claim filed.</span>
              )}
              {vault.creator_bond && BigInt(vault.creator_bond) > 0n && (
                <div className="text-[11px] text-ink-600 bg-linen-100 px-2 py-1 rounded">
                  Anti-harassment dispute bond staked: <strong>{formatGen(vault.creator_bond)}</strong>
                </div>
              )}
            </div>

            {/* Right: Licensee Defense */}
            <div className="bg-card border border-emerald-200 rounded-lg p-3.5 space-y-2">
              <div className="flex items-center space-x-1.5 text-emerald-800 font-semibold text-xs uppercase tracking-wider">
                <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Licensee Right of Defense</span>
              </div>
              {vault.defense_statement ? (
                <div>
                  <span className="text-[11px] text-ink-500 block mb-0.5">Rebuttal Rationale:</span>
                  <p className="text-xs text-ink-800 italic bg-linen-50 p-2 rounded border border-linen-200">
                    &ldquo;{vault.defense_statement}&rdquo;
                  </p>
                </div>
              ) : (
                <span className="text-xs text-ink-400 italic">No rebuttal statement submitted by licensee.</span>
              )}
              {vault.defense_url && (
                <div>
                  <span className="text-[11px] text-ink-500 block mb-0.5">Counter-Evidence URL:</span>
                  <a
                    href={vault.defense_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs text-emerald-700 hover:underline truncate block"
                  >
                    {vault.defense_url}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Qualitative AI Jury Rationale */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-700 mb-1.5 flex items-center space-x-1.5">
              <Scale className="w-3.5 h-3.5 text-ink-500" />
              <span>Consensus Qualitative Adjudication Rationale</span>
            </label>
            <div className="p-4 bg-white border border-linen-300 rounded-lg text-sm text-ink-900 font-sans leading-relaxed shadow-subtle whitespace-pre-wrap">
              {vault.reason || 'No qualitative rationale available for this case.'}
            </div>
          </div>

          {/* Protected Style DNA Preview */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-700 mb-1.5 flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-ink-500" />
              <span>Registered Benchmark IP Style DNA & Canary</span>
            </label>
            <div className="p-3 bg-linen-50 border border-linen-300 rounded-lg text-xs font-mono text-ink-700 max-h-24 overflow-y-auto whitespace-pre-wrap">
              {vault.ip_style_spec}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-linen-300 bg-linen-50 flex items-center justify-between">
          <span className="text-[11px] text-ink-500">
            Rendered live via GenVM multi-validator democratic consensus
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-ink-900 hover:bg-ink-700 rounded-md transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
