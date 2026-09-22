import React, { useState } from 'react';
import { X, Shield, Key, Clock, Coins, Sparkles, CheckCircle2 } from 'lucide-react';
import { isAddress } from 'viem';

interface RegisterLicenseProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (licensee: `0x${string}`, spec: string, durationSeconds: number, depositGen: string) => Promise<void>;
  isSubmitting: boolean;
}

const PRESET_TEMPLATES = [
  {
    name: 'Cyberpunk Noir Portrait DNA',
    spec: `STYLE DNA: Volumetric neon rim-lighting, gritty high-contrast monochromatic base with cyan-magenta chromatic aberration.
UNIQUE MARKERS: Heavy film grain, bokeh hexagons, asymmetric cyberware filigree.
CANARY TOKEN: [POP-CYBER-NOIR-7789]
COMMERCIAL USAGE CONSTRAINT: Max 500 commercial prints; unauthorized external merchandising triggers copyright forfeiture.`,
  },
  {
    name: 'Bauhaus Editorial Vector DNA',
    spec: `STYLE DNA: Strict asymmetric grid, primary color triad (ultramarine, vermillion, cadmium yellow), heavy sans-serif typography.
UNIQUE MARKERS: 45-degree diagonal accent rules, negative space quotient > 40%, Swiss poster layout geometry.
CANARY TOKEN: [POP-BAUHAUS-5541]
COMMERCIAL USAGE CONSTRAINT: Strictly for licensed marketing banners only; prompt redistribution prohibited.`,
  },
  {
    name: 'Architectural Solarpunk DNA',
    spec: `STYLE DNA: Biophilic organic curves, terracotta and micro-algae glass facade integration, golden hour ambient diffusion.
UNIQUE MARKERS: Vegetative cantilever arches, hexagonal solar collector facets, mist dispersion.
CANARY TOKEN: [POP-SOLAR-ARCH-9902]
COMMERCIAL USAGE CONSTRAINT: Game asset production limited to Licensee title only.`,
  },
];

export const RegisterLicense: React.FC<RegisterLicenseProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [licensee, setLicensee] = useState('');
  const [spec, setSpec] = useState('');
  const [durationDays, setDurationDays] = useState('30');
  const [requiredDeposit, setRequiredDeposit] = useState('1.0');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyPreset = (templateSpec: string) => {
    setSpec(templateSpec);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanLicensee = licensee.trim();
    if (!isAddress(cleanLicensee)) {
      setError('Invalid Ethereum/GenLayer licensee address (must be a valid 0x hex address).');
      return;
    }

    if (!spec.trim() || spec.trim().length < 20) {
      setError('IP Style DNA & canary prompt specification must be at least 20 characters.');
      return;
    }

    const daysNum = parseFloat(durationDays);
    if (isNaN(daysNum) || daysNum <= 0) {
      setError('License duration must be greater than 0 days.');
      return;
    }
    const durationSeconds = Math.round(daysNum * 86400);

    const depositNum = parseFloat(requiredDeposit);
    if (isNaN(depositNum) || depositNum <= 0) {
      setError('Required guarantee collateral deposit must be greater than 0 GEN.');
      return;
    }

    try {
      await onSubmit(cleanLicensee as `0x${string}`, spec.trim(), durationSeconds, requiredDeposit);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Transaction failed. Check MetaMask confirmation.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm">
      <div className="bg-card border border-linen-300 rounded-xl shadow-elevated w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-linen-300 flex items-center justify-between bg-linen-50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-md bg-ultramarine-light border border-ultramarine-border flex items-center justify-center text-ultramarine">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-ink-900">
                Propose Two-Sided AI IP License
              </h3>
              <p className="text-xs text-ink-500">
                Step 1 of Two-Sided Escrow: Propose terms & Style DNA (Creator pays 0 deposit)
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 text-xs bg-crimson-light border border-crimson-border text-crimson rounded-md">
              {error}
            </div>
          )}

          {/* Licensee Address */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-ink-500" />
                <span>Authorized Licensee Address</span>
              </span>
              <span className="text-[10px] text-ink-400 font-mono">0x...</span>
            </label>
            <input
              type="text"
              required
              placeholder="0x7099... (designated licensee authorized to fund & deploy)"
              value={licensee}
              onChange={(e) => setLicensee(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-linen-50 border border-linen-300 rounded-md text-ink-900 font-mono focus:outline-none focus:ring-2 focus:ring-ultramarine focus:bg-white transition-all"
            />
          </div>

          {/* Style DNA & Canary Specification */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-700 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-ink-500" />
                <span>Protected IP Style DNA & Canary Tokens</span>
              </label>
              <div className="flex items-center space-x-1 text-[11px] text-ultramarine">
                <span className="text-ink-400">Presets:</span>
                {PRESET_TEMPLATES.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleApplyPreset(p.spec)}
                    className="hover:underline font-medium ml-1"
                  >
                    #{i + 1}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              rows={4}
              required
              placeholder="Detail distinctive aesthetic tokens, prompt phrasing schemas, composition rules, and unique forensic canary tokens [e.g. POP-STYLE-001]..."
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-linen-50 border border-linen-300 rounded-md text-ink-900 font-sans focus:outline-none focus:ring-2 focus:ring-ultramarine focus:bg-white transition-all"
            />
            <p className="text-[11px] text-ink-500 mt-1">
              GenLayer validators inspect this DNA when evaluating live disputed URLs for copyright replication.
            </p>
          </div>

          {/* Deposit & Duration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-700 mb-1.5 flex items-center space-x-1.5">
                <Coins className="w-3.5 h-3.5 text-ink-500" />
                <span>Required Licensee Collateral (GEN)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0.01"
                  required
                  value={requiredDeposit}
                  onChange={(e) => setRequiredDeposit(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-linen-50 border border-linen-300 rounded-md text-ink-900 font-mono focus:outline-none focus:ring-2 focus:ring-ultramarine focus:bg-white transition-all"
                />
                <span className="absolute right-3 top-2 text-xs font-mono font-semibold text-ink-400">
                  GEN
                </span>
              </div>
              <span className="text-[10px] text-ink-400 mt-1 block">
                Funded by the Licensee upon acceptance to activate the license.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-700 mb-1.5 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-ink-500" />
                <span>License Term (Days)</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-linen-50 border border-linen-300 rounded-md text-ink-900 font-mono focus:outline-none focus:ring-2 focus:ring-ultramarine focus:bg-white transition-all"
              />
              <span className="text-[10px] text-ink-400 mt-1 block">
                ~30 days standard. Licensee reclaims collateral upon clean term expiry.
              </span>
            </div>
          </div>

          {/* Two-Sided Justice Safeguard Highlight */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong>Two-Sided Escrow Guarantee:</strong> As Creator, you pay <strong>0 GEN</strong> upfront deposit. The designated licensee must independently accept and fund their own collateral before the license becomes active.
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2 border-t border-linen-300">
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
              className="px-5 py-2 text-sm font-semibold text-white bg-ultramarine hover:bg-ultramarine-hover rounded-md shadow-subtle transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Publishing Proposal to Studionet...' : 'Publish License Terms (0 GEN)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
