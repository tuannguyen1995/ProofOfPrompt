import { STUDIONET_EXPLORER_URL } from '../config/genlayer';

export interface LicenseVault {
  vault_id: string;
  creator: string;
  licensee: string;
  escrow_deposit: string;
  ip_style_spec: string;
  infringement_url: string;
  status: number; // 0: ACTIVE_LICENSED, 1: IN_AUDIT, 2: INFRINGED_SLASHED, 3: EXPIRED_REFUNDED
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
  2: { label: 'Infringed / Slashed', color: 'text-crimson', border: 'border-crimson/30', bg: 'bg-crimson/10' },
  3: { label: 'Expired / Reclaimed', color: 'text-ink-500', border: 'border-linen-300', bg: 'bg-linen-100' },
};

/**
 * Formats a 18-decimal wei string or bigint into readable GEN with 2-4 decimals.
 */
export function formatGen(val: string | bigint | number): string {
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
 * Returns color classes for similarity scores (0-100).
 */
export function getSimilarityScoreColor(score: number): { text: string; bg: string; border: string } {
  if (score >= 70) {
    return { text: 'text-crimson', bg: 'bg-crimson-light', border: 'border-crimson-border' };
  }
  if (score >= 40) {
    return { text: 'text-amber', bg: 'bg-amber-light', border: 'border-amber-border' };
  }
  return { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' };
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
