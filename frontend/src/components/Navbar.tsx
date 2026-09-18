import React from 'react';
import { ShieldCheck, Wallet, ExternalLink, RefreshCw, AlertTriangle } from 'lucide-react';
import { shortenAddress, formatGen, getExplorerAddressUrl } from '../utils/helpers';
import { CONTRACT_ADDRESS, STUDIO_PORTAL_URL } from '../config/genlayer';

interface NavbarProps {
  account: `0x${string}` | null;
  balance: bigint | null;
  isConnecting: boolean;
  onConnect: () => Promise<void>;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  account,
  balance,
  isConnecting,
  onConnect,
  onRefresh,
  isRefreshing,
}) => {
  const isZeroBalance = account && balance !== null && balance === 0n;

  return (
    <header className="border-b border-linen-300 bg-card sticky top-0 z-40">
      {/* Studio Funding Notice Banner if balance is 0 */}
      {isZeroBalance && (
        <div className="bg-amber-light border-b border-amber-border px-4 py-2 text-xs text-amber flex items-center justify-between">
          <div className="flex items-center space-x-2 max-w-5xl mx-auto w-full">
            <AlertTriangle className="w-4 h-4 text-amber shrink-0" />
            <span>
              Your connected account has <strong>0 GEN</strong> on Studionet. Fund your address by transferring test GEN from the pre-funded accounts in{' '}
              <a
                href={`${STUDIO_PORTAL_URL}/contracts`}
                target="_blank"
                rel="noreferrer"
                className="font-semibold underline hover:text-amber-hover"
              >
                GenLayer Studio Accounts Panel
              </a>
              .
            </span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand & Identity */}
        <div className="flex items-center space-x-4">
          <div className="w-11 h-11 rounded-lg bg-linen-100 border border-linen-300 flex items-center justify-center p-1 shadow-subtle">
            <img src="/logo.svg" alt="ProofOfPrompt Logo" className="w-9 h-9" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-display font-bold text-xl tracking-tight text-ink-900">
                ProofOfPrompt
              </span>
              <span className="px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider font-semibold rounded bg-ultramarine-light text-ultramarine border border-ultramarine-border">
                Studionet 61999
              </span>
            </div>
            <p className="text-xs text-ink-500 font-sans tracking-wide">
              Autonomous AI IP Licensing & Copyright Court
            </p>
          </div>
        </div>

        {/* Actions & Wallet Readout */}
        <div className="flex items-center space-x-3">
          {/* Refresh state button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh on-chain state"
            className="p-2 text-ink-500 hover:text-ink-900 hover:bg-linen-100 border border-linen-300 rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Contract Address Explorer link */}
          <a
            href={getExplorerAddressUrl(CONTRACT_ADDRESS)}
            target="_blank"
            rel="noreferrer"
            className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 text-xs text-ink-700 bg-linen-100 border border-linen-300 rounded-md hover:bg-linen-200 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-ultramarine" />
            <span className="font-mono">Court: {shortenAddress(CONTRACT_ADDRESS, 3)}</span>
            <ExternalLink className="w-3 h-3 text-ink-400" />
          </a>

          {/* Connect / Account state */}
          {account ? (
            <div className="flex items-center space-x-2 bg-linen-50 border border-linen-300 rounded-md p-1 pl-3">
              <div className="text-right mr-1">
                <div className="text-xs font-mono font-semibold text-ink-900">
                  {balance !== null ? formatGen(balance) : 'Loading...'}
                </div>
                <div className="text-[10px] font-mono text-ink-500">
                  {shortenAddress(account, 4)}
                </div>
              </div>
              <div className="w-8 h-8 rounded bg-linen-200 flex items-center justify-center text-ultramarine font-mono text-xs font-bold border border-linen-300">
                {account.substring(2, 4).toUpperCase()}
              </div>
            </div>
          ) : (
            <button
              onClick={onConnect}
              disabled={isConnecting}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-ultramarine hover:bg-ultramarine-hover rounded-md shadow-subtle transition-colors disabled:opacity-50"
            >
              <Wallet className="w-4 h-4" />
              <span>{isConnecting ? 'Connecting...' : 'Connect MetaMask'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
