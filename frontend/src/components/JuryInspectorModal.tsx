import React from 'react';
import { X, Scale, Globe, CheckCircle, AlertTriangle, ShieldCheck, ExternalLink, Cpu } from 'lucide-react';
import { LicenseVault, getSimilarityScoreColor } from '../utils/helpers';

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

  const isInfringed = vault.verdict === 'INFRINGEMENT_CONFIRMED';
  const isClean = vault.verdict === 'CLEAN_AUTHORIZED';
  const simColor = getSimilarityScoreColor(vault.similarity_score);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm">
      <div className="bg-card border border-linen-300 rounded-xl shadow-elevated w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-linen-300 flex items-center justify-between bg-linen-50">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
              isInfringed ? 'bg-crimson-light text-crimson border border-crimson-border' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-ink-900">
                On-Chain AI Copyright Jury Verdict
              </h3>
              <p className="text-xs text-ink-500 font-mono">
                Vault: {vault.vault_id} &bull; Consensus Engine: gl.vm.run_nondet
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
            isInfringed
              ? 'bg-crimson-light/70 border-crimson-border text-crimson'
              : isClean
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
              : 'bg-linen-100 border-linen-300 text-ink-700'
          }`}>
            <div className="flex items-center space-x-3">
              {isInfringed ? (
                <AlertTriangle className="w-6 h-6 shrink-0 text-crimson" />
              ) : (
                <CheckCircle className="w-6 h-6 shrink-0 text-emerald-700" />
              )}
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider font-semibold block">
                  Consensus Ruling
                </span>
                <span className="text-lg font-display font-bold">
                  {vault.verdict}
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

          {/* Similarity Score Metric Bar */}
          <div className="bg-linen-50 border border-linen-300 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-ultramarine" />
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-700">
                  AI Style DNA Overlap Metric
                </span>
              </div>
              <span className={`text-sm font-mono font-bold px-2 py-0.5 rounded border ${simColor.bg} ${simColor.text} ${simColor.border}`}>
                {vault.similarity_score} / 100
              </span>
            </div>
            {/* Gauge progress bar */}
            <div className="w-full h-2.5 bg-linen-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  vault.similarity_score >= 70 ? 'bg-crimson' : vault.similarity_score >= 40 ? 'bg-amber' : 'bg-emerald-600'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, vault.similarity_score))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-ink-400 font-mono mt-1.5">
              <span>0 (Independent)</span>
              <span>40 (Inspirational)</span>
              <span>70 (Infringement Threshold)</span>
              <span>100 (Identical Copy)</span>
            </div>
          </div>

          {/* Qualitative AI Rationale */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-700 mb-1.5 flex items-center space-x-1.5">
              <Scale className="w-3.5 h-3.5 text-ink-500" />
              <span>Jury Consensus Qualitative Rationale</span>
            </label>
            <div className="p-4 bg-white border border-linen-300 rounded-lg text-sm text-ink-900 font-sans leading-relaxed shadow-subtle">
              {vault.reason || 'No qualitative rationale available for this case.'}
            </div>
          </div>

          {/* Disputed URL Evidence */}
          {vault.infringement_url && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-700 mb-1.5 flex items-center space-x-1.5">
                <Globe className="w-3.5 h-3.5 text-ink-500" />
                <span>Audited Evidence URL</span>
              </label>
              <div className="p-3 bg-linen-50 border border-linen-300 rounded-lg flex items-center justify-between">
                <span className="font-mono text-xs text-ink-700 truncate mr-2">
                  {vault.infringement_url}
                </span>
                <a
                  href={vault.infringement_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1 text-xs text-ultramarine hover:underline shrink-0"
                >
                  <span>Open URL</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Protected Style DNA Preview */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-700 mb-1.5 flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-ink-500" />
              <span>Registered IP Style DNA</span>
            </label>
            <div className="p-3 bg-linen-50 border border-linen-300 rounded-lg text-xs font-mono text-ink-700 max-h-28 overflow-y-auto whitespace-pre-wrap">
              {vault.ip_style_spec}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-linen-300 bg-linen-50 flex items-center justify-between">
          <span className="text-[11px] text-ink-500">
            Rendered live via GenVM <code className="font-mono bg-linen-200 px-1 py-0.5 rounded text-ink-700">gl.nondet.web.render</code>
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
