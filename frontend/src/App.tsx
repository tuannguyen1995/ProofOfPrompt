import React, { useState, useEffect, useCallback } from 'react';
import { parseEther } from 'viem';
import {
  Shield,
  Plus,
  Scale,
  Search,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import {
  CONTRACT_ADDRESS,
  readContractStudionet,
  fetchStudionetBalance,
  sendContractTransaction,
  waitForTransactionReceipt,
  switchToStudionet
} from './config/genlayer';
import {
  LicenseVault,
  VaultStats,
  getExplorerTxUrl
} from './utils/helpers';
import { Navbar } from './components/Navbar';
import { StatsBar } from './components/StatsBar';
import { RegisterLicense } from './components/RegisterLicense';
import { VaultCard } from './components/VaultCard';
import { DisputeClaim } from './components/DisputeClaim';
import { SubmitDefense } from './components/SubmitDefense';
import { JuryInspectorModal } from './components/JuryInspectorModal';

export const App: React.FC = () => {
  // Wallet state
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Contract data state
  const [stats, setStats] = useState<VaultStats | null>(null);
  const [vaults, setVaults] = useState<LicenseVault[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search & Filter
  const [filterStatus, setFilterStatus] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [disputeTargetVaultId, setDisputeTargetVaultId] = useState<string | null>(null);
  const [defenseTargetVaultId, setDefenseTargetVaultId] = useState<string | null>(null);
  const [inspectedVault, setInspectedVault] = useState<LicenseVault | null>(null);

  // Transaction processing state
  const [actionLoading, setActionLoading] = useState(false);
  const [activeActionVaultId, setActiveActionVaultId] = useState<string | null>(null);
  const [txNotice, setTxNotice] = useState<{ type: 'info' | 'success' | 'error'; message: string; txHash?: string } | null>(null);

  /**
   * Connects MetaMask and switches to Studionet
   */
  const handleConnectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setTxNotice({
        type: 'error',
        message: 'MetaMask is required to interact with ProofOfPrompt. Please install MetaMask.',
      });
      return;
    }

    try {
      setIsConnecting(true);
      setTxNotice(null);

      await switchToStudionet();

      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[];

      if (accounts && accounts.length > 0) {
        const userAddr = accounts[0] as `0x${string}`;
        setAccount(userAddr);
        await fetchUserBalance(userAddr);
      }
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      setTxNotice({
        type: 'error',
        message: err?.message || 'Failed to connect MetaMask.',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Fetches real on-chain GEN balance directly from GenLayer Studionet RPC
   */
  const fetchUserBalance = async (userAddr: `0x${string}`) => {
    try {
      const realBal = await fetchStudionetBalance(userAddr);
      setBalance(realBal);
    } catch (err) {
      console.warn('Could not read user balance from Studionet RPC:', err);
    }
  };

  /**
   * Reads state 100% on-chain from GenLayer intelligent contract
   */
  const fetchContractData = useCallback(async () => {
    try {
      setIsRefreshing(true);

      // Read Stats directly on-chain via native gen_call
      try {
        const rawStats = await readContractStudionet({
          address: CONTRACT_ADDRESS,
          functionName: 'get_stats',
          args: [],
        });
        if (rawStats) {
          const parsedStats: VaultStats = JSON.parse(rawStats);
          setStats(parsedStats);
        }
      } catch (e) {
        console.warn('Could not load stats from Studionet contract:', e);
      }

      // Read Paginated Vaults directly on-chain via native gen_call
      try {
        const rawVaults = await readContractStudionet({
          address: CONTRACT_ADDRESS,
          functionName: 'get_vaults_paginated',
          args: [0, 50],
        });
        if (rawVaults) {
          const parsedVaults: LicenseVault[] = JSON.parse(rawVaults);
          setVaults(Array.isArray(parsedVaults) ? parsedVaults : []);
        }
      } catch (e) {
        console.warn('Could not load paginated vaults from Studionet contract:', e);
      }
    } catch (err) {
      console.error('Failed to fetch contract data from Studionet:', err);
    } finally {
      setIsLoadingData(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load, auto-connect check, and wallet listeners
  useEffect(() => {
    fetchContractData();

    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const ethereum = (window as any).ethereum;

      // Auto-detect already authorized MetaMask account
      ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            const userAddr = accounts[0] as `0x${string}`;
            setAccount(userAddr);
            fetchUserBalance(userAddr);
          }
        })
        .catch(console.warn);

      ethereum.on?.('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          const newAddr = accounts[0] as `0x${string}`;
          setAccount(newAddr);
          fetchUserBalance(newAddr);
        } else {
          setAccount(null);
          setBalance(null);
        }
      });

      ethereum.on?.('chainChanged', () => {
        fetchContractData();
        if (account) fetchUserBalance(account);
      });
    }
  }, [fetchContractData]);

  /**
   * Action 1: Register new IP license and lock guarantee deposit
   */
  const handleRegisterLicenseSubmit = async (
    licensee: `0x${string}`,
    spec: string,
    duration: number,
    depositGen: string
  ) => {
    if (!account) {
      await handleConnectWallet();
      return;
    }

    try {
      setActionLoading(true);
      setTxNotice({
        type: 'info',
        message: 'Waiting for MetaMask signature to lock guarantee deposit on Studionet...',
      });

      const depositWei = parseEther(depositGen);

      const txHash = await sendContractTransaction({
        address: CONTRACT_ADDRESS,
        functionName: 'register_license',
        args: [licensee, spec, duration],
        from: account,
        value: depositWei,
      });

      setTxNotice({
        type: 'info',
        message: 'Transaction broadcasted to GenLayer. Awaiting GenVM block finalization...',
        txHash,
      });

      await waitForTransactionReceipt(txHash);

      setTxNotice({
        type: 'success',
        message: `License Vault successfully initialized! Escrow collateral of ${depositGen} GEN locked on-chain.`,
        txHash,
      });

      await fetchContractData();
      if (account) fetchUserBalance(account);
    } catch (err: any) {
      console.error('License registration failed:', err);
      setTxNotice({
        type: 'error',
        message: err?.message || 'Failed to register license vault.',
      });
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Action 2: File infringement claim with public URL and optional dispute bond
   */
  const handleFileDisputeSubmit = async (vaultId: string, evidenceUrl: string, bondGen: string) => {
    if (!account) {
      await handleConnectWallet();
      return;
    }

    try {
      setActionLoading(true);
      setActiveActionVaultId(vaultId);
      setTxNotice({
        type: 'info',
        message: `Filing copyright claim against vault ${vaultId}. Sign with MetaMask...`,
      });

      const bondWei = bondGen && parseFloat(bondGen) > 0 ? parseEther(bondGen) : 0n;

      const txHash = await sendContractTransaction({
        address: CONTRACT_ADDRESS,
        functionName: 'file_infringement_claim',
        args: [vaultId, evidenceUrl],
        from: account,
        value: bondWei,
      });

      setTxNotice({
        type: 'info',
        message: 'Evidence submitted to GenLayer. Waiting for transaction finalization...',
        txHash,
      });

      await waitForTransactionReceipt(txHash);

      setTxNotice({
        type: 'success',
        message: `Dispute filed! Vault ${vaultId} is now IN_AUDIT. Licensee can submit defense before trial.`,
        txHash,
      });

      await fetchContractData();
      if (account) fetchUserBalance(account);
    } catch (err: any) {
      console.error('Claim filing failed:', err);
      setTxNotice({
        type: 'error',
        message: err?.message || 'Failed to file infringement dispute.',
      });
      throw err;
    } finally {
      setActionLoading(false);
      setActiveActionVaultId(null);
    }
  };

  /**
   * Action 3: Licensee submits Right of Defense (Rebuttal Statement & Proof)
   */
  const handleSubmitDefenseSubmit = async (vaultId: string, defenseUrl: string, defenseStatement: string) => {
    if (!account) {
      await handleConnectWallet();
      return;
    }

    try {
      setActionLoading(true);
      setActiveActionVaultId(vaultId);
      setTxNotice({
        type: 'info',
        message: `Submitting licensee defense for vault ${vaultId}. Sign with MetaMask...`,
      });

      const txHash = await sendContractTransaction({
        address: CONTRACT_ADDRESS,
        functionName: 'submit_licensee_defense',
        args: [vaultId, defenseUrl, defenseStatement],
        from: account,
      });

      await waitForTransactionReceipt(txHash);

      setTxNotice({
        type: 'success',
        message: `Defense registered on-chain! AI Jury will consider both sides during trial.`,
        txHash,
      });

      await fetchContractData();
      if (account) fetchUserBalance(account);
    } catch (err: any) {
      console.error('Defense submission failed:', err);
      setTxNotice({
        type: 'error',
        message: err?.message || 'Failed to submit defense. Check contract version.',
      });
      throw err;
    } finally {
      setActionLoading(false);
      setActiveActionVaultId(null);
    }
  };

  /**
   * Action 4: Licensee amicably concedes claim to settle
   */
  const handleConcede = async (vaultId: string) => {
    if (!account) {
      await handleConnectWallet();
      return;
    }

    try {
      setActionLoading(true);
      setActiveActionVaultId(vaultId);
      setTxNotice({
        type: 'info',
        message: `Conceding claim amicably for vault ${vaultId}...`,
      });

      const txHash = await sendContractTransaction({
        address: CONTRACT_ADDRESS,
        functionName: 'concede_claim',
        args: [vaultId],
        from: account,
      });

      await waitForTransactionReceipt(txHash);

      setTxNotice({
        type: 'success',
        message: `Claim amicably conceded and settled. Deposit awarded to creator.`,
        txHash,
      });

      await fetchContractData();
      if (account) fetchUserBalance(account);
    } catch (err: any) {
      console.error('Concession failed:', err);
      setTxNotice({
        type: 'error',
        message: err?.message || 'Concession failed.',
      });
    } finally {
      setActionLoading(false);
      setActiveActionVaultId(null);
    }
  };

  /**
   * Action 5: Trigger on-chain AI Jury adjudication
   * Evaluates both claim and defense live on-chain!
   */
  const handleAdjudicate = async (vaultId: string) => {
    if (!account) {
      await handleConnectWallet();
      return;
    }

    try {
      setActionLoading(true);
      setActiveActionVaultId(vaultId);
      setTxNotice({
        type: 'info',
        message: `Convening on-chain AI Jury for vault ${vaultId}. Validators are scraping evidence and performing forensic analysis...`,
      });

      const txHash = await sendContractTransaction({
        address: CONTRACT_ADDRESS,
        functionName: 'adjudicate_infringement',
        args: [vaultId],
        from: account,
      });

      setTxNotice({
        type: 'info',
        message: 'AI Jury running subjective consensus (gl.vm.run_nondet). Evaluating both sides...',
        txHash,
      });

      await waitForTransactionReceipt(txHash);

      setTxNotice({
        type: 'success',
        message: `Adjudication concluded! Subjective consensus achieved on verdict.`,
        txHash,
      });

      await fetchContractData();
      if (account) fetchUserBalance(account);
    } catch (err: any) {
      console.error('Adjudication failed:', err);
      setTxNotice({
        type: 'error',
        message: err?.message || 'Adjudication trial failed.',
      });
    } finally {
      setActionLoading(false);
      setActiveActionVaultId(null);
    }
  };

  /**
   * Action 6: Reclaim deposit upon term expiration
   */
  const handleReclaim = async (vaultId: string) => {
    if (!account) {
      await handleConnectWallet();
      return;
    }

    try {
      setActionLoading(true);
      setActiveActionVaultId(vaultId);
      setTxNotice({
        type: 'info',
        message: `Initiating deposit refund for vault ${vaultId}...`,
      });

      const txHash = await sendContractTransaction({
        address: CONTRACT_ADDRESS,
        functionName: 'reclaim_deposit',
        args: [vaultId],
        from: account,
      });

      await waitForTransactionReceipt(txHash);

      setTxNotice({
        type: 'success',
        message: `Deposit reclaimed successfully! Collateral returned to licensee address.`,
        txHash,
      });

      await fetchContractData();
      if (account) fetchUserBalance(account);
    } catch (err: any) {
      console.error('Reclaim failed:', err);
      setTxNotice({
        type: 'error',
        message: err?.message || 'Deposit reclamation failed. Verify term expiration block.',
      });
    } finally {
      setActionLoading(false);
      setActiveActionVaultId(null);
    }
  };

  // Filtered Vaults
  const filteredVaults = vaults.filter((v) => {
    if (filterStatus !== 'all' && v.status !== filterStatus) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      v.vault_id.toLowerCase().includes(query) ||
      v.creator.toLowerCase().includes(query) ||
      v.licensee.toLowerCase().includes(query) ||
      v.ip_style_spec.toLowerCase().includes(query) ||
      v.verdict.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      {/* Navigation Header */}
      <Navbar
        account={account}
        balance={balance}
        isConnecting={isConnecting}
        onConnect={handleConnectWallet}
        onRefresh={fetchContractData}
        isRefreshing={isRefreshing}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Gallery Hero Section */}
        <section className="bg-card border border-linen-300 rounded-2xl p-8 shadow-gallery mb-8 relative overflow-hidden">
          <div className="max-w-3xl relative z-10">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-ultramarine-light text-ultramarine border border-ultramarine-border text-xs font-mono font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Two-Sided AI Prompt IP Licensing & Copyright Court</span>
            </div>
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-ink-900 tracking-tight leading-tight mb-4">
              Autonomous AI Copyright Court on GenLayer
            </h1>
            <p className="text-ink-700 text-sm sm:text-base leading-relaxed mb-6 font-sans">
              Safeguarding both <strong>Creators</strong> (against prompt theft and uncredited commercial exploitation) and <strong>Licensees</strong> (against frivolous claims via anti-harassment bonds, right of rebuttal defense, and 3-tier graduated verdicts).
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsRegisterOpen(true)}
                className="flex items-center space-x-2 px-5 py-2.5 text-sm font-semibold text-white bg-ultramarine hover:bg-ultramarine-hover rounded-lg shadow-subtle transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Register AI IP & Lock Escrow</span>
              </button>
              <a
                href="#two-sided-justice"
                className="px-5 py-2.5 text-sm font-semibold text-ink-700 bg-linen-100 hover:bg-linen-200 border border-linen-300 rounded-lg transition-colors"
              >
                How Two-Sided Justice Works
              </a>
            </div>
          </div>
          {/* Subtle Bauhaus geometric decoration */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-5 pointer-events-none flex items-center justify-end pr-8">
            <Scale className="w-96 h-96 text-ink-900" />
          </div>
        </section>

        {/* Two-Sided Protection Overview Bar */}
        <section id="two-sided-justice" className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Licensor / Creator Safeguards */}
          <div className="bg-card border border-ultramarine-border/80 rounded-xl p-5 shadow-subtle">
            <div className="flex items-center space-x-2 text-ultramarine font-display font-bold text-sm mb-2">
              <Shield className="w-4 h-4" />
              <span>Licensor & Prompt Creator Safeguards</span>
            </div>
            <ul className="text-xs text-ink-700 space-y-1.5 list-disc list-inside">
              <li><strong>Live Web Crawl Evidence:</strong> Direct on-chain verification without trusted oracles.</li>
              <li><strong>Automated Slashing:</strong> Escrow deposit liquidated directly to creator on breach.</li>
              <li><strong>Prompt Canary Protection:</strong> Embedded tokens uncover stolen prompt structures.</li>
            </ul>
          </div>

          {/* Licensee / Studio Safeguards */}
          <div className="bg-card border border-emerald-300 rounded-xl p-5 shadow-subtle">
            <div className="flex items-center space-x-2 text-emerald-800 font-display font-bold text-sm mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Licensee & Studio Rights of Defense</span>
            </div>
            <ul className="text-xs text-ink-700 space-y-1.5 list-disc list-inside">
              <li><strong>Right of Rebuttal Defense:</strong> Licensees submit counter-proof and fair-use context.</li>
              <li><strong>Anti-Harassment Staking:</strong> Frivolous creator claims compensate the licensee.</li>
              <li><strong>3-Tier Proportional Justice:</strong> 50/50 split for borderline derivative inspiration.</li>
            </ul>
          </div>
        </section>

        {/* Top-level Key Metrics */}
        <StatsBar stats={stats} loading={isLoadingData} />

        {/* Transaction / Status Notification Banner */}
        {txNotice && (
          <div
            className={`p-4 rounded-xl border mb-6 flex items-start justify-between animate-in fade-in duration-200 ${
              txNotice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : txNotice.type === 'error'
                ? 'bg-crimson-light border-crimson-border text-crimson'
                : 'bg-ultramarine-light border-ultramarine-border text-ultramarine'
            }`}
          >
            <div className="flex items-start space-x-3">
              {txNotice.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
              ) : txNotice.type === 'error' ? (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-crimson" />
              ) : (
                <Loader2 className="w-5 h-5 shrink-0 mt-0.5 animate-spin text-ultramarine" />
              )}
              <div className="text-xs sm:text-sm">
                <p className="font-semibold">{txNotice.message}</p>
                {txNotice.txHash && (
                  <a
                    href={getExplorerTxUrl(txNotice.txHash)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 mt-1 font-mono text-xs underline hover:opacity-80"
                  >
                    <span>Inspect On-Chain Tx</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
            <button
              onClick={() => setTxNotice(null)}
              className="text-xs font-semibold px-2 py-1 rounded hover:bg-black/5 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* License Registry & Filter Controls */}
        <div id="registry" className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-bold text-2xl text-ink-900 tracking-tight">
              Intellectual Property Vaults
            </h2>
            <p className="text-xs text-ink-500 font-mono">
              Target Contract: {CONTRACT_ADDRESS} &bull; Studionet 61999
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-ink-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search vaults, specs, addresses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-card border border-linen-300 rounded-md text-ink-900 focus:outline-none focus:ring-2 focus:ring-ultramarine"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center bg-card border border-linen-300 rounded-md p-0.5 text-xs">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  filterStatus === 'all' ? 'bg-ink-900 text-white' : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                All ({vaults.length})
              </button>
              <button
                onClick={() => setFilterStatus(0)}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  filterStatus === 0 ? 'bg-ultramarine text-white' : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilterStatus(1)}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  filterStatus === 1 ? 'bg-amber text-white' : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                In Audit
              </button>
              <button
                onClick={() => setFilterStatus(2)}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  filterStatus === 2 ? 'bg-crimson text-white' : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                Infringed
              </button>
            </div>
          </div>
        </div>

        {/* Vault Cards Grid */}
        {isLoadingData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-card border border-linen-300 rounded-xl p-6 h-72 animate-pulse flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="h-6 bg-linen-200 rounded w-1/3" />
                  <div className="h-4 bg-linen-100 rounded w-2/3" />
                  <div className="h-16 bg-linen-100 rounded w-full" />
                </div>
                <div className="h-10 bg-linen-200 rounded w-full" />
              </div>
            ))}
          </div>
        ) : filteredVaults.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVaults.map((vault) => (
              <VaultCard
                key={vault.vault_id}
                vault={vault}
                userAddress={account}
                onFileDispute={(id) => setDisputeTargetVaultId(id)}
                onAdjudicate={handleAdjudicate}
                onReclaim={handleReclaim}
                onInspect={(v) => setInspectedVault(v)}
                onSubmitDefense={(id) => setDefenseTargetVaultId(id)}
                onConcede={handleConcede}
                isActionLoading={actionLoading}
                activeActionVaultId={activeActionVaultId}
              />
            ))}
          </div>
        ) : (
          <div className="bg-card border border-dashed border-linen-300 rounded-2xl p-12 text-center my-8">
            <div className="w-12 h-12 rounded-xl bg-linen-100 border border-linen-300 flex items-center justify-center mx-auto mb-4 text-ultramarine">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-ink-900 mb-2">
              No Intellectual Property Vaults Found
            </h3>
            <p className="text-sm text-ink-500 max-w-md mx-auto mb-6">
              {searchQuery
                ? 'No vaults matched your query. Try clearing the search term or status filter.'
                : 'Connected to contract 0xDB02327FE8cFAbF2066A0AB0Bfd762135E4a0290. Lock an infringement guarantee deposit and register your Master Prompt Style DNA to create the first vault!'}
            </p>
            <button
              onClick={() => setIsRegisterOpen(true)}
              className="inline-flex items-center space-x-2 px-5 py-2 text-sm font-semibold text-white bg-ultramarine hover:bg-ultramarine-hover rounded-lg shadow-subtle transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Register First License Vault</span>
            </button>
          </div>
        )}
      </main>

      {/* Gallery Minimalist Footer */}
      <footer className="border-t border-linen-300 bg-card py-6 mt-12 text-xs text-ink-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-display font-bold text-ink-900">ProofOfPrompt</span>
            <span>&bull;</span>
            <span>GenLayer Studionet (Chain 61999)</span>
          </div>
          <div className="flex items-center space-x-4">
            <a
              href="https://studio.genlayer.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-ink-900 hover:underline"
            >
              GenLayer Studio
            </a>
            <a
              href="https://docs.genlayer.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-ink-900 hover:underline"
            >
              Intelligent Contracts Docs
            </a>
            <a
              href="https://portal.genlayer.foundation"
              target="_blank"
              rel="noreferrer"
              className="hover:text-ink-900 hover:underline"
            >
              Builder Portal
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <RegisterLicense
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSubmit={handleRegisterLicenseSubmit}
        isSubmitting={actionLoading}
      />

      <DisputeClaim
        isOpen={!!disputeTargetVaultId}
        vaultId={disputeTargetVaultId}
        onClose={() => setDisputeTargetVaultId(null)}
        onSubmit={handleFileDisputeSubmit}
        isSubmitting={actionLoading}
      />

      <SubmitDefense
        isOpen={!!defenseTargetVaultId}
        vaultId={defenseTargetVaultId}
        onClose={() => setDefenseTargetVaultId(null)}
        onSubmit={handleSubmitDefenseSubmit}
        isSubmitting={actionLoading}
      />

      <JuryInspectorModal
        isOpen={!!inspectedVault}
        vault={inspectedVault}
        onClose={() => setInspectedVault(null)}
      />
    </div>
  );
};
