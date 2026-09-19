import { STUDIONET_EXPLORER_URL } from '../config/genlayer';

export interface LicenseVault {
  vault_id: string;
  creator: string;
  licensee: string;
  escrow_deposit: string;
  creator_bond?: string;
  ip_style_spec: string;
  infringement_url: string;
  defense_url?: string;
  defense_statement?: string;
  status: number; // 0: ACTIVE, 1: IN_AUDIT, 2: FULL_SLASHED, 3: EXPIRED_REFUNDED, 4: MUTUAL_CONCEDED, 5: PARTIAL_SLASHED
  verdict: string;
  reason: string;
  confidence: number;
  similarity_score: number;
  created_at_block: string;
  expires_at_block: string;
}

export interface VaultStats {
  total_vaults: number;
  total_deposit_locked: string;
  total_disputes_resolved: number;
}

export const VAULT_STATUS_LABELS: Record<number, { label: string; color: string; border: string; bg: string }> = {
  0: { label: 'Active Licensed', color: 'text-ultramarine', border: 'border-ultramarine/30', bg: 'bg-ultramarine/5' },
  1: { label: 'Dispute in Audit', color: 'text-amber', border: 'border-amber/30', bg: 'bg-amber/10' },
  2: { label: 'Full Infringement Slashed', color: 'text-crimson', border: 'border-crimson/30', bg: 'bg-crimson/10' },
  3: { label: 'Expired / Reclaimed', color: 'text-ink-500', border: 'border-linen-300', bg: 'bg-linen-100' },
  4: { label: 'Amicably Conceded', color: 'text-indigo-700', border: 'border-indigo-200', bg: 'bg-indigo-50' },
  5: { label: 'Partial Infringement (50/50 Split)', color: 'text-amber-700', border: 'border-amber-300', bg: 'bg-amber-50' },
};

/**
 * Formats an 18-decimal wei string or bigint into readable GEN with 2-4 decimals.
 */
export function formatGen(val: string | bigint | number | undefined): string {
  if (!val) return '0.00 GEN';
  try {
    const raw = typeof val === 'bigint' ? val : BigInt(val.toString());
    const ether = Number(raw) / 1e18;
    if (isNaN(ether)) return '0.00 GEN';
    if (ether >= 1000) {
      return `${ether.toLocaleString(undefined, { maximumFractionDigits: 2 })} GEN`;
    }
    return `${ether.toFixed(ether % 1 === 0 ? 2 : 4)} GEN`;
  } catch {
    return '0.00 GEN';
  }
}

/**
 * Shortens an Ethereum/GenLayer address (0x1234...5678).
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 2) return address;
  return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
}

/**
 * Returns color classes for similarity scores (0-100) reflecting 3-tier justice:
 * - Clean: 0 - 49%
 * - Fair Use / Partial Borrowing: 50 - 74%
 * - Full Infringement Breach: >= 75%
 */
export function getSimilarityScoreColor(score: number): { text: string; bg: string; border: string; tier: string } {
  if (score >= 75) {
    return {
      text: 'text-crimson',
      bg: 'bg-crimson-light',
      border: 'border-crimson-border',
      tier: 'Full Infringement (>= 75%)',
    };
  }
  if (score >= 50) {
    return {
      text: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      tier: 'Partial / Derivative (50-74%)',
    };
  }
  return {
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    tier: 'Clean / Independent (< 50%)',
  };
}

/**
 * Links to the GenLayer block explorer.
 */
export function getExplorerAddressUrl(address: string): string {
  return `${STUDIONET_EXPLORER_URL}/address/${address}`;
}

export function getExplorerTxUrl(txHash: string): string {
  return `${STUDIONET_EXPLORER_URL}/tx/${txHash}`;
}
