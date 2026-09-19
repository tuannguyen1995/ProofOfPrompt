import React, { useState } from 'react';
import { X, ShieldCheck, Globe, MessageSquare, Info } from 'lucide-react';

interface SubmitDefenseProps {
  isOpen: boolean;
  vaultId: string | null;
  onClose: () => void;
  onSubmit: (vaultId: string, defenseUrl: string, defenseStatement: string) => Promise<void>;
  isSubmitting: boolean;
}

export const SubmitDefense: React.FC<SubmitDefenseProps> = ({
  isOpen,
  vaultId,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [defenseUrl, setDefenseUrl] = useState('');
  const [defenseStatement, setDefenseStatement] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !vaultId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUrl = defenseUrl.trim();
    if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      setError('Counter-evidence URL must start with http:// or https://');
      return;
    }

    if (!defenseStatement.trim() || defenseStatement.trim().length < 15) {
      setError('Defense statement must be at least 15 characters long.');
      return;
    }

    try {
      await onSubmit(vaultId, cleanUrl, defenseStatement.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit licensee defense.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm">
      <div className="bg-card border border-linen-300 rounded-xl shadow-elevated w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-linen-300 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-md bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-ink-900">
                Licensee Defense & Rebuttal
              </h3>
              <p className="text-xs text-ink-500 font-mono">
                Vault: {vaultId} &bull; Two-Sided Due Process
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-ink-400 hover:text-ink-900 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-crimson-light border border-crimson-border text-crimson rounded-md">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-700 mb-1.5 flex items-center space-x-1.5">
              <Globe className="w-3.5 h-3.5 text-ink-500" />
              <span>Counter-Evidence / Authorization URL (Optional)</span>
            </label>
            <input
              type="url"
              placeholder="https://my-authorized-portfolio.com/license-token"
              value={defenseUrl}
              onChange={(e) => setDefenseUrl(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-linen-50 border border-linen-300 rounded-md text-ink-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
            />
            <p className="text-[11px] text-ink-500 mt-1">
              Link to verification proof, independent creation repository, or authorized deployment context.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-700 mb-1.5 flex items-center space-x-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-ink-500" />
              <span>Defense Rationale & Rebuttal Statement</span>
            </label>
            <textarea
              rows={4}
              required
              placeholder="Explain why the commercial work complies with the licensing agreement, demonstrates distinct stylistic origin, or constitutes legitimate fair use..."
              value={defenseStatement}
              onChange={(e) => setDefenseStatement(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-linen-50 border border-linen-300 rounded-md text-ink-900 font-sans focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
            />
          </div>

          <div className="bg-linen-100 border border-linen-300 rounded-lg p-3 text-xs text-ink-700 flex items-start space-x-2">
            <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <span>
              <strong>Fair Trial Protection:</strong> The on-chain GenLayer AI Jury will scrape your defense URL and evaluate your rebuttal alongside the creator&apos;s accusation before issuing a verdict.
            </span>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-linen-300">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-ink-700 hover:text-ink-900 hover:bg-linen-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md shadow-subtle transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Recording Defense on-chain...' : 'Submit Defense to Jury'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
