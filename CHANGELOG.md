# Changelog

All notable changes to the **ProofOfPrompt** protocol and application are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-09-23
### Fixed & Hardened (Steward Review Refinements)
- **Resolved `propose_license` Address Construction Error:** Replaced string zero address with `Address(bytes(20))` and introduced `_to_address()` coercion helper to prevent `AttributeError: 'str' object has no attribute 'as_bytes'` on storage write.
- **Fixed Stranded Funds in `register_license`:** Automatically refunds attached `msg.value` to caller so no GEN is stranded in the contract during two-sided proposal workflows.
- **Cleared Stale `split_proposer` State:** Explicitly resets `split_proposer = ZERO_ADDRESS` and clears dispute evidence/deadlines whenever a vault re-enters `STATUS_ACTIVE` after a `CLEAN_AUTHORIZED` ruling.
- **Added GenVM Execution Result Inspection in Frontend:** Updated `waitForTransactionReceipt` to query `eth_getTransactionByHash` and inspect `consensus_data.leader_receipt` for `execution_result` and `result.status`, preventing false green success banners on reverted transactions.
- **Updated Explorer URL:** Replaced defunct `genlayer-explorer.vercel.app` (503) with working `https://explorer-studio.genlayer.com`.
- **Reconciled Documentation:** Aligned `ARCHITECTURE.md` state machine diagram and state table with the 9-state protocol enum (`STATUS_OFFERED` through `STATUS_EXPIRED_REFUNDED`).
- **Added Pinned `requirements.txt`:** Added reproducible dependency file (`genlayer-py==0.18.0`, `genlayer-test==0.29.2`, `pytest==9.1.1`...).
- **Deployed Hardened Contract on Studionet:** Synchronized with active contract `0x7DdA9559C647de311e8D86f161f1D0DF264A9A22`.

## [1.1.0] - 2026-09-19
### Added
- **Synchronized Deployed Contract Address:** `0xFef901554A09048ebB11bad41B1Fe68ef3951241` on GenLayer Studionet.
- **Two-Sided Justice Architecture:**
  - **Creator Anti-Harassment Dispute Bond:** Requires creators to stake a bond when initiating a dispute; forfeited to the licensee if the claim is frivolous/clean.
  - **Licensee Right of Defense (`SubmitDefense` modal):** Licensees can submit a rebuttal defense statement and counter-evidence URL prior to jury trial.
  - **Amicable Settlement Escape Hatch (`concede_claim`):** Allows licensees to settle uncontested claims immediately, refunding creator bond.
  - **3-Tier Graduated Rulings:** `FULL_INFRINGEMENT` (100% slash), `PARTIAL_INFRINGEMENT` (50% slash / 50% refund for derivative works), and `CLEAN_AUTHORIZED` (dismissal + bond transfer).
  - **Split-Screen Comparative Jury Inspector:** Side-by-side analysis of Creator Accusation vs Licensee Rebuttal.
  - **Comprehensive Two-Sided Justice Section:** Live dashboard statistics on active defense and anti-harassment safeguards.

## [1.0.0] - 2026-09-18

### Added
- **Intelligent Contract (`contracts/contract.py`):**
  - Implemented `LicenseVault` with GenVM-compliant storage types (`bigint`, `u8`, `u32`, `u64`, `u256`, `TreeMap`, `DynArray`).
  - Implemented `register_license` with payable guarantee deposit lock in GEN.
  - Implemented `file_infringement_claim` with URL validation and creator-only access control.
  - Implemented `adjudicate_infringement` using `gl.nondet.web.render` live web scraper and `gl.vm.run_nondet` semantic consensus comparing verdicts.
  - Implemented `reclaim_deposit` for good-behavior collateral return after term expiration.
  - Implemented view functions: `get_vault`, `get_vaults_paginated`, `get_stats`, and `get_vault_count`.
- **Testing Suite (`tests/`):**
  - Setup `tests/conftest.py` with bare-dict mock installation (`sim_installMocks`) and `clear_known_contracts` fixture.
  - Added unit and scenario tests in `tests/test_proofofprompt.py` covering positive infringement slashing, dismissal resets, expiration reclaim, and unauthorized access rejections.
- **Frontend dApp (`frontend/`):**
  - Initialized Vite + React 18 + TypeScript + TailwindCSS application.
  - Configured Minimal Bauhaus & Curated Gallery design system (`#F7F5F0` base, `#FFFFFF` cards, Syne and Space Grotesk fonts).
  - Integrated `genlayer-js` with automatic Studionet chain detection and switching (`wallet_switchEthereumChain`).
  - Created `Navbar` with live GEN balance readout and studio funding guidance.
  - Created `StatsBar` displaying active vault metrics and guarantee escrow totals.
  - Created `RegisterLicense` modal with prompt presets (Cyberpunk, Bauhaus, Solarpunk).
  - Created `VaultCard` with similarity score gauge and status badges.
  - Created `DisputeClaim` modal for filing public evidence URLs.
  - Created `JuryInspectorModal` detailing on-chain AI Jury verdict and qualitative reasoning.
- **Documentation:**
  - Added `README.md` with complete architecture diagram, deployment instructions, and test guide.
  - Added `ARCHITECTURE.md` detailing consensus mechanics, state machines, and economic security.
