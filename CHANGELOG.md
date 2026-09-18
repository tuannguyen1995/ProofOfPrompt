# Changelog

All notable changes to the **ProofOfPrompt** protocol and application are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
