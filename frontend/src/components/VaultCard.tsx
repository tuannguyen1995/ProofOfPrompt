import React, { useState } from 'react';
import {
  Shield,
  Coins,
  Scale,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertOctagon,
  Eye,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Handshake,
  FileCheck,
  CheckCircle,
  Clock
} from 'lucide-react';
import {
  LicenseVault,
  VAULT_STATUS_LABELS,
  formatGen,
  shortenAddress,
  getSimilarityScoreColor,
  getExplorerAddressUrl,
} from '../utils/helpers';

interface VaultCardProps {
  vault: LicenseVault;
  userAddress: `0x${string}` | null;
  onFileDispute: (vaultId: string) => void;
  onAdjudicate: (vaultId: string) => Promise<void>;
  onReclaim: (vaultId: string) => Promise<void>;
  onInspect: (vault: LicenseVault) => void;
  onSubmitDefense?: (vaultId: string) => void;
  onConcede?: (vaultId: string) => Promise<void>;
  onAcceptAndFund?: (vaultId: string, requiredDeposit: string) => Promise<void>;
  onProposeMutualSplit?: (vaultId: string) => Promise<void>;
  isActionLoading: boolean;
  activeActionVaultId: string | null;
}

export const VaultCard: React.FC<VaultCardProps> = ({
  vault,
  userAddress,
  onFileDispute,
  onAdjudicate,
  onReclaim,
  onInspect,
  onSubmitDefense,
  onConcede,
  onAcceptAndFund,
  onProposeMutualSplit,
  isActionLoading,
  activeActionVaultId,
}) => {
  const [expanded, setExpanded] = useState(false);
  const statusMeta = VAULT_STATUS_LABELS[vault.status] || VAULT_STATUS_LABELS[0];
  const isThisLoading = isActionLoading && activeActionVaultId === vault.vault_id;

  const isCreator = !!userAddress && userAddress.toLowerCase() === vault.creator.toLowerCase();
  const isLicensee = !!userAddress && userAddress.toLowerCase() === vault.licensee.toLowerCase();

  const simColor = getSimilarityScoreColor(vault.similarity_score);
  const hasDefense = !!vault.defense_statement || !!vault.defense_url;
  const hasCreatorBond = vault.creator_bond && BigInt(vault.creator_bond) > 0n;

  // Split proposal info
  const hasSplitProposer = vault.split_proposer && vault.split_proposer !== '0x0000000000000000000000000000000000000000';
  const isMeSplitProposer = hasSplitProposer && userAddress && userAddress.toLowerCase() === vault.split_proposer?.toLowerCase();

  return (
    <div className="bg-card border border-linen-300 rounded-xl p-6 shadow-subtle hover:shadow-gallery transition-all flex flex-col justify-between">
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-linen-100 border border-linen-300 flex items-center justify-center font-mono font-bold text-xs text-ink-900">
              {vault.vault_id}
            </div>
            <div>
              <span className="font-display font-bold text-base text-ink-900">
                AI License Escrow
              </span>
              <div className="flex items-center space-x-1.5 text-[11px] text-ink-500 font-mono">
                <span>Created: {vault.created_at ? new Date(Number(vault.created_at) * 1000).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>
          </div>

          <span
            className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-full border ${statusMeta.bg} ${statusMeta.color} ${statusMeta.border}`}
          >
            {statusMeta.label}
          </span>
        </div>

        {/* Deposit & Similarity Score Hero */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-linen-50 border border-linen-300 rounded-lg mb-4">
          <div>
            <span className="text-[10px] font-mono text-ink-500 uppercase tracking-wider block">
              {vault.status === 0 ? 'Required Collateral' : 'Guarantee Escrow'}
            </span>
            <span className="font-mono font-bold text-lg text-ink-900 flex items-center space-x-1">
              <Coins className="w-4 h-4 text-ultramarine inline mr-1" />
              {vault.status === 0 ? formatGen(vault.required_deposit) : formatGen(vault.escrow_deposit)}
            </span>
            {hasCreatorBond && (
              <span className="text-[10px] text-emerald-700 font-mono block mt-0.5">
                + {formatGen(vault.creator_bond)} dispute bond
              </span>
            )}
          </div>

          <div>
            <span className="text-[10px] font-mono text-ink-500 uppercase tracking-wider block">
              Similarity Forensic
            </span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className={`text-sm font-mono font-bold px-2 py-0.5 rounded border ${simColor.bg} ${simColor.text} ${simColor.border}`}>
                {vault.similarity_score}%
              </span>
              {vault.verdict && vault.verdict !== 'PENDING' && (
                <span className="text-[10px] font-mono uppercase text-ink-500 truncate max-w-[100px]" title={vault.verdict}>
                  {vault.verdict.replace('_', ' ')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Parties */}
        <div className="space-y-1.5 text-xs mb-4">
          <div className="flex items-center justify-between">
            <span className="text-ink-500">IP Creator:</span>
            <a
              href={getExplorerAddressUrl(vault.creator)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-ink-700 hover:text-ultramarine flex items-center space-x-1"
            >
              <span>{shortenAddress(vault.creator, 4)}</span>
              {isCreator && <span className="text-[9px] bg-ultramarine/10 text-ultramarine px-1 rounded">You</span>}
              <ExternalLink className="w-3 h-3 text-ink-400" />
            </a>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-ink-500">Licensee:</span>
            <a
              href={getExplorerAddressUrl(vault.licensee)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-ink-700 hover:text-ultramarine flex items-center space-x-1"
            >
              <span>{shortenAddress(vault.licensee, 4)}</span>
              {isLicensee && <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded">You</span>}
              <ExternalLink className="w-3 h-3 text-ink-400" />
            </a>
          </div>
        </div>

        {/* Protected Style DNA Accordion */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-full text-left flex items-center justify-between text-xs font-semibold text-ink-700 uppercase tracking-wider py-1 border-b border-linen-200"
          >
            <span className="flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-ultramarine" />
              <span>Protected IP Style DNA & Canary</span>
            </span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <div className={`mt-2 text-xs font-sans text-ink-700 bg-linen-50 border border-linen-200 rounded p-2.5 transition-all ${
            expanded ? 'max-h-60 overflow-y-auto whitespace-pre-wrap' : 'line-clamp-2'
          }`}>
            {vault.ip_style_spec}
          </div>
        </div>

        {/* Infringement claim box if under dispute */}
        {vault.infringement_url && (
          <div className="mb-3 p-2.5 bg-crimson-light/40 border border-crimson-border rounded-lg text-xs">
            <span className="font-semibold text-crimson block mb-0.5">Creator Claim Evidence:</span>
            <a
              href={vault.infringement_url}
              target="_blank"
              rel="noreferrer"
              className="text-ultramarine hover:underline font-mono truncate block text-[11px]"
            >
              {vault.infringement_url}
            </a>
          </div>
        )}

        {/* Licensee Defense Proof box if submitted */}
        {hasDefense && (
          <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
            <span className="font-semibold text-emerald-800 flex items-center space-x-1 mb-0.5">
              <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Licensee Defense Submitted:</span>
            </span>
            {vault.defense_statement && (
              <p className="text-[11px] text-ink-700 italic line-clamp-2 mb-1">
                &ldquo;{vault.defense_statement}&rdquo;
              </p>
            )}
            {vault.defense_url && (
              <a
                href={vault.defense_url}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-700 hover:underline font-mono truncate block text-[11px]"
              >
                {vault.defense_url}
              </a>
            )}
          </div>
        )}

        {/* Mutual compromise note if pending */}
        {hasSplitProposer && (vault.status === 2 || vault.status === 3) && (
          <div className="mb-3 p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs">
            <span className="font-semibold text-indigo-900 flex items-center space-x-1 mb-0.5">
              <Handshake className="w-3.5 h-3.5 text-indigo-600" />
              <span>50/50 Compromise Proposed:</span>
            </span>
            <p className="text-[11px] text-indigo-800">
              {isMeSplitProposer
                ? 'You proposed an amicable 50/50 split. Awaiting counterparty confirmation.'
                : 'Counterparty proposed an amicable 50/50 split! Accept below to settle without trial.'}
            </p>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-linen-300 space-y-2">
        {/* Status 0: OFFERED (Awaiting Licensee Acceptance & Escrow Collateral) */}
        {vault.status === 0 && (
          <div className="space-y-2">
            {isLicensee && onAcceptAndFund ? (
              <button
                onClick={() => onAcceptAndFund(vault.vault_id, vault.required_deposit)}
                disabled={isActionLoading}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-subtle transition-all"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Accept Terms & Fund Collateral ({formatGen(vault.required_deposit)})</span>
              </button>
            ) : isCreator ? (
              <div className="text-[11px] text-amber-800 font-sans text-center bg-amber-50 rounded border border-amber-200 py-2 px-2.5">
                License terms published. Awaiting acceptance & collateral funding from Licensee (<span className="font-mono">{shortenAddress(vault.licensee, 3)}</span>).
              </div>
            ) : (
              <div className="text-[11px] text-ink-500 font-sans text-center bg-linen-50 rounded border border-linen-200 py-2 px-2.5">
                Offer awaiting acceptance by Licensee (<span className="font-mono">{shortenAddress(vault.licensee, 3)}</span>)
              </div>
            )}
          </div>
        )}

        {/* Status 1: ACTIVE (Licensee Accepted & Funded) */}
        {vault.status === 1 && (
          <div className="flex space-x-2">
            <button
              onClick={() => onFileDispute(vault.vault_id)}
              disabled={isActionLoading || (!isCreator && !!userAddress)}
              title={isCreator ? 'File copyright infringement claim as IP Creator' : 'Only the registered IP Creator can file a dispute'}
              className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 text-xs font-semibold text-crimson bg-crimson-light hover:bg-crimson/15 border border-crimson-border rounded-md transition-colors disabled:opacity-40"
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>File Claim {isCreator ? '(Creator)' : ''}</span>
            </button>
            <button
              onClick={() => onReclaim(vault.vault_id)}
              disabled={isActionLoading || (!isLicensee && !!userAddress)}
              title={isLicensee ? 'Licensee can reclaim guarantee deposit once license term expires' : 'Only the registered Licensee can reclaim deposit'}
              className="flex items-center justify-center space-x-1 py-2 px-3 text-xs font-medium text-ink-700 bg-linen-100 hover:bg-linen-200 border border-linen-300 rounded-md transition-colors disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reclaim {isLicensee ? '(Licensee)' : ''}</span>
            </button>
          </div>
        )}

        {/* Status 2: DISPUTE_FILED (Defense Window Active) */}
        {vault.status === 2 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-900">
              <span className="flex items-center space-x-1 font-semibold">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Defense Window Active (24h)</span>
              </span>
              <span className="text-[10px] font-mono text-amber-700">Protected Period</span>
            </div>

            {/* Licensee Defense Action */}
            {isLicensee && onSubmitDefense && (
              <button
                onClick={() => onSubmitDefense(vault.vault_id)}
                disabled={isActionLoading}
                className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-md transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Submit Right of Defense (Licensee Action)</span>
              </button>
            )}

            {/* 50/50 Mutual Compromise Split Proposal */}
            {(isCreator || isLicensee) && onProposeMutualSplit && (
              <button
                onClick={() => onProposeMutualSplit(vault.vault_id)}
                disabled={isActionLoading || !!isMeSplitProposer}
                className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-2 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded transition-colors disabled:opacity-50"
              >
                <Handshake className="w-3.5 h-3.5 text-indigo-600" />
                <span>{hasSplitProposer && !isMeSplitProposer ? 'Confirm 50/50 Compromise Settlement' : 'Propose 50/50 Amicable Split'}</span>
              </button>
            )}

            {/* AI Jury Trigger (Disabled while defense window active without defense) */}
            <button
              disabled
              title="Adjudication is locked during the 24-hour defense window to protect licensee rights of rebuttal."
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 text-xs font-bold text-ink-400 bg-linen-100 border border-linen-300 rounded-md cursor-not-allowed"
            >
              <Scale className="w-4 h-4 text-ink-400" />
              <span>Jury Locked (Awaiting Defense or 24h Expiry)</span>
            </button>

            {/* Licensee Voluntary Concession */}
            {isLicensee && onConcede && (
              <button
                onClick={() => onConcede(vault.vault_id)}
                disabled={isActionLoading}
                className="w-full flex items-center justify-center space-x-1 py-1.5 px-2 text-[11px] text-ink-600 hover:text-ink-900 bg-linen-50 border border-linen-200 rounded transition-colors"
              >
                <span>Amicably Concede Claim (Transfer Deposit to Creator)</span>
              </button>
            )}
          </div>
        )}

        {/* Status 3: DEFENSE_SUBMITTED (Defense Provided -> AI Trial Unlocked) */}
        {vault.status === 3 && (
          <div className="space-y-2">
            {/* AI Jury Adjudication Button */}
            <button
              onClick={() => onAdjudicate(vault.vault_id)}
              disabled={isActionLoading}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 text-xs font-bold text-white bg-ultramarine hover:bg-ultramarine-hover rounded-md shadow-subtle transition-all disabled:opacity-50"
            >
              <Scale className={`w-4 h-4 ${isThisLoading ? 'animate-spin' : ''}`} />
              <span>
                {isThisLoading ? 'AI Jury Auditing Two-Sided Proofs...' : 'Trigger AI Jury Adjudication (Court)'}
              </span>
            </button>

            {/* 50/50 Mutual Compromise Split Proposal */}
            {(isCreator || isLicensee) && onProposeMutualSplit && (
              <button
                onClick={() => onProposeMutualSplit(vault.vault_id)}
                disabled={isActionLoading || !!isMeSplitProposer}
                className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-2 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded transition-colors disabled:opacity-50"
              >
                <Handshake className="w-3.5 h-3.5 text-indigo-600" />
                <span>{hasSplitProposer && !isMeSplitProposer ? 'Confirm 50/50 Compromise Settlement' : 'Propose 50/50 Amicable Split'}</span>
              </button>
            )}

            {/* Licensee Voluntary Concession */}
            {isLicensee && onConcede && (
              <button
                onClick={() => onConcede(vault.vault_id)}
                disabled={isActionLoading}
                className="w-full flex items-center justify-center space-x-1 py-1.5 px-2 text-[11px] text-ink-600 hover:text-ink-900 bg-linen-50 border border-linen-200 rounded transition-colors"
              >
                <span>Amicably Concede Claim</span>
              </button>
            )}

            <p className="text-[10px] text-center text-ink-500">
              Two-sided evidence evaluated by GenLayer multi-validator jury
            </p>
          </div>
        )}

        {/* Status 4, 5, 6, 7: Adjudicated / Settled */}
        {(vault.status === 4 || vault.status === 5 || vault.status === 6 || vault.status === 7) && (
          <div className="flex space-x-2">
            <button
              onClick={() => onInspect(vault)}
              className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 text-xs font-semibold text-ink-900 bg-linen-100 hover:bg-linen-200 border border-linen-300 rounded-md transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-ultramarine" />
              <span>Inspect AI Verdict & Two-Sided Analysis</span>
            </button>
          </div>
        )}

        {/* Status 8: Expired / Reclaimed */}
        {vault.status === 8 && (
          <button
            onClick={() => onInspect(vault)}
            className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 text-xs font-medium text-ink-600 bg-linen-50 border border-linen-200 rounded-md"
          >
            <Shield className="w-3.5 h-3.5 text-ink-400" />
            <span>View Clean Settlement Record</span>
          </button>
        )}
      </div>
    </div>
  );
};
