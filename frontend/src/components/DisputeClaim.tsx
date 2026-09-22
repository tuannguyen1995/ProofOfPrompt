import React, { useState } from 'react';
import { X, AlertOctagon, Globe, Coins, ShieldAlert } from 'lucide-react';

interface DisputeClaimProps {
  isOpen: boolean;
  vaultId: string | null;
  onClose: () => void;
  onSubmit: (vaultId: string, evidenceUrl: string, bondGen: string) => Promise<void>;
  isSubmitting: boolean;
}

export const DisputeClaim: React.FC<DisputeClaimProps> = ({
  isOpen,
  vaultId,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [url, setUrl] = useState('');
  const [bond, setBond] = useState('0.10');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !vaultId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const clean = url.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      setError('Evidence URL must start with http:// or https://');
      return;
    }

    const bondNum = parseFloat(bond);
    if (isNaN(bondNum) || bondNum < 0.05) {
      setError('Anti-harassment dispute bond must be at least 0.05 GEN (or 10% of deposit).');
      return;
    }

    try {
      await onSubmit(vaultId, clean, bond);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to file infringement dispute.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm">
      <div className="bg-card border border-linen-300 rounded-xl shadow-elevated w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-linen-300 flex items-center justify-between bg-crimson-light/40">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-md bg-crimson-light border border-crimson-border flex items-center justify-center text-crimson">
              <AlertOctagon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-ink-900">
                File Copyright Infringement Claim
              </h3>
              <p className="text-xs text-ink-500 font-mono">
                Target Vault: {vaultId}
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
              <span>Public Disputed Work URL</span>
            </label>
            <input
              type="url"
              required
              placeholder="https://commercial-store.com/pirated-art-piece"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-linen-50 border border-linen-300 rounded-md text-ink-900 font-mono focus:outline-none focus:ring-2 focus:ring-crimson focus:bg-white transition-all"
            />
            <p className="text-[11px] text-ink-500 mt-1">
              Publicly accessible URL where unauthorized AI generated output is being published or sold.
            </p>
          </div>

          {/* Anti-Harassment Dispute Bond */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Coins className="w-3.5 h-3.5 text-ink-500" />
                <span>Mandatory Anti-Harassment Dispute Bond (GEN)</span>
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider">
                Min 10% Collateral
              </span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.05"
                required
                value={bond}
                onChange={(e) => setBond(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-linen-50 border border-linen-300 rounded-md text-ink-900 font-mono focus:outline-none focus:ring-2 focus:ring-crimson focus:bg-white transition-all"
              />
              <span className="absolute right-3 top-2 text-xs font-mono font-semibold text-ink-400">
                GEN
              </span>
            </div>
            <p className="text-[11px] text-ink-500 mt-1">
              100% refunded to you if infringement is upheld. Paid to Licensee as harassment damages if claim is rejected.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start space-x-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Enforced 24-Hour Defense Window:</strong> Filing this claim activates a 24-hour defense window during which the Licensee has the protected right to submit counter-evidence before an AI trial can occur.
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
              className="px-5 py-2 text-sm font-semibold text-white bg-crimson hover:bg-crimson-hover rounded-md shadow-subtle transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Filing Claim with Bond...' : 'File Infringement Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
