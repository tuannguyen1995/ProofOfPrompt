# ProofOfPrompt (Autonomous AI IP Licensing & Copyright Infringement Court)

> **Track:** Subjective Consensus / AI Governance / Future of Work  
> **Target Network:** GenLayer Studionet (Chain ID: `61999` / `0xF1EF`, RPC: `https://studio.genlayer.com/api`)  
> **Deployed Contract:** `0x114C85858a3ED76a5948E57d871D7ce04E59a0B4`  
> **Live App (Vercel):** [https://proofofprompt.vercel.app](https://proofofprompt.vercel.app)  
> **GitHub Repository:** [https://github.com/tuannguyen1995/ProofOfPrompt](https://github.com/tuannguyen1995/ProofOfPrompt)  
> **UI Aesthetic:** Minimal Bauhaus & Gallery Art (`#F7F5F0` canvas, razor-thin `#E2DED4` borders, Syne / Space Grotesk typography, Ultramarine Blue `#1D4ED8`)

---

## ⚖️ The Unique Hook: "Why This Project Dies Without GenLayer"

In the generative agent economy, Prompt Engineers, Digital Studios, and Creative AI Directors create proprietary Master System Prompts, video pipelines, and unique aesthetic styles. 

Currently, licensing these digital assets presents a catastrophic dilemma:
1. **The Licensee's Fear:** Purchasing prompts that fail to produce authentic style outputs, or facing frivolous copyright accusations from bad-faith creators trying to seize deposits.
2. **The Creator's Nightmare:** Once licensed, bad actors quietly breach agreement constraints (e.g. generating thousands of unauthorized commercial prints, launching uncredited spin-off merchandise, or redistributing prompt structures).
3. **The Traditional Blockchain Impasse:** Solidity smart contracts **cannot** inspect a live commercial webpage, cannot parse unstructured visual/textual style indicators, and cannot balance evidence from both parties without human intermediaries.

### How ProofOfPrompt Solves This: Two-Sided Balanced Justice on GenLayer

ProofOfPrompt introduces a **Self-Enforcing, Balanced AI IP Licensing Court** inspired by proven decentralized dispute resolution patterns:

#### 🛡️ Licensor Safeguards
1. **License Escrow Vault:** The Licensee locks an infringement guarantee deposit in GEN alongside the registered **IP Style DNA & Forensic Canary Markers**.
2. **On-Chain Web Scraper:** If unauthorized commercial usage is detected, the Creator submits the live public product URL. Validators execute `gl.nondet.web.render(evidence_url, mode="text")` directly on-chain without any centralized oracle.
3. **Full Slashing for Blatant Piracy:** Clear copyright violations result in immediate forfeiture of the licensee deposit to the creator.

#### ⚖️ Licensee Safeguards (Two-Sided Protection)
1. **Anti-Harassment Creator Bond:** Creators must stake an anti-harassment dispute bond when filing a claim. If the claim is judged `CLEAN_AUTHORIZED` (frivolous accusation), the creator's bond is forfeited and awarded directly to the licensee as compensation.
2. **Right of Defense & Counter-Evidence:** Before trial, the Licensee can submit a formal rebuttal statement and counter-evidence URL (`submit_licensee_defense`). The AI Jury evaluates both perspectives side-by-side.
3. **Graduated 3-Tier Rulings:** Avoids all-or-nothing binary traps.
   - `FULL_INFRINGEMENT`: 100% deposit slashed to creator + bond returned.
   - `PARTIAL_INFRINGEMENT`: 50% deposit slashed to creator, 50% preserved for licensee (balanced fairness for borderline derivative work).
   - `CLEAN_AUTHORIZED`: Claim dismissed, creator bond forfeited to licensee.
4. **Amicable Settlement Escape Hatch:** Licensees can concede undisputed claims (`concede_claim`) to settle quickly, returning the creator's bond and avoiding validator overhead.

---

## 🏛️ System Architecture

```
                                  +---------------------------------------+
                                  |         Creator / Licensor            |
                                  +---------------------------------------+
                                           |                      |
                    1. Register License    |                      | 3. File Infringement
                       & Lock Escrow (GEN) |                      |    Claim (Evidence URL)
                                           v                      v
+-----------------------------------------------------------------------------------------+
|                        ProofOfPrompt Intelligent Contract (GenVM)                       |
|                                                                                         |
|   LicenseVault:                                                                         |
|     - creator & licensee addresses                                                      |
|     - escrow_deposit (bigint)                                                           |
|     - ip_style_spec (DNA & Canary Tokens)                                               |
|     - status: ACTIVE | IN_AUDIT | INFRINGED_SLASHED | EXPIRED_REFUNDED                  |
|                                                                                         |
|   +---------------------------------------------------------------------------------+   |
|   | gl.vm.run_nondet(leader_fn, validator_fn)                                       |   |
|   |   ├─ gl.nondet.web.render(evidence_url)    <-- Live on-chain webpage crawl      |   |
|   |   ├─ gl.nondet.exec_prompt(rubric)         <-- Forensic LLM style analysis      |   |
|   |   └─ validator_fn: mine["verdict"] == leader["verdict"]                         |   |
|   +---------------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------------+
             |                                                                |
             | [If CLEAN_EXPIRED]                                             | [If INFRINGEMENT_CONFIRMED]
             v                                                                v
   Deposit Refunded to Licensee                                  Deposit Slashed to Creator
```

---

## 📁 Repository Structure

```
ProofOfPrompt/
├── contracts/
│   └── contract.py            # Complete ProofOfPrompt Intelligent Contract (GenVM)
├── tests/
│   ├── conftest.py            # gltest fixtures with bare-dict sim_installMocks
│   └── test_proofofprompt.py  # Pytest suite: Register, Claim, Adjudicate, Reclaim
├── frontend/
│   ├── package.json           # React 18, TypeScript, TailwindCSS, genlayer-js, viem
│   ├── index.html             # Gallery Bauhaus typography (Syne, Space Grotesk, Inter)
│   ├── vite.config.ts
│   ├── tailwind.config.js     # Bauhaus color tokens (#F7F5F0, #1D4ED8, #BE123C)
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx            # Main dApp shell with live state polling & alerts
│   │   ├── config/genlayer.ts # Studionet Viem client & chain auto-switcher
│   │   ├── components/
│   │   │   ├── Navbar.tsx     # Clean art-gallery header, balance readout & network status
│   │   │   ├── StatsBar.tsx   # Aggregated metrics (Escrow Locked, Disputes Resolved)
│   │   │   ├── RegisterLicense.tsx # Modal to lock GEN deposit & register Style DNA
│   │   │   ├── VaultCard.tsx  # Interactive license cards with similarity gauges
│   │   │   ├── DisputeClaim.tsx # Creator portal to submit unauthorized product URL
│   │   │   └── JuryInspectorModal.tsx # On-chain jury verdict, similarity & rationale
│   │   └── utils/helpers.ts   # Formatting, address shortener, explorer link builders
│   └── public/
│       └── logo.svg           # Bauhaus brand identity mark
├── ARCHITECTURE.md            # Deep-dive architecture and consensus specification
├── CHANGELOG.md               # Version release notes and development milestones
└── README.md                  # Project documentation & deployment manual
```

---

## 🚀 Step-by-Step Deployment Guide on Studionet

### 1. Deploy Contract via GenLayer Studio

1. Open [https://studio.genlayer.com/run-debug](https://studio.genlayer.com/run-debug).
2. Recommended initial reset: Click **Settings** &rarr; **Reset Storage** &rarr; **Confirm** &rarr; Hard refresh the browser.
3. In the Contracts panel, create `ProofOfPrompt.py` and paste the contents of `contracts/contract.py`.
4. Verify the top line begins with:
   ```python
   # { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
   from genlayer import *
   ```
5. Click **Deploy**. In the transaction panel on the sidebar, verify the deployment transaction displays **`Result: SUCCESS`** (not merely finalized).
6. Copy the deployed contract address (e.g. `0x...`).

### 2. Fund Your MetaMask Wallet

1. In GenLayer Studio, navigate to the **Accounts** tab.
2. Transfer `10.0 GEN` from one of the pre-funded accounts to your personal MetaMask wallet address.
3. Ensure your MetaMask network is switched to **GenLayer Studio Network** (Chain ID: `61999` / `0xF1EF`, RPC: `https://studio.genlayer.com/api`).

### 3. Run the Frontend

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Set your deployed contract address in `.env`:
   ```env
   VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddressHere
   ```
3. Install dependencies and start the local development server:
   ```bash
   npm install
   npm run dev
   ```
4. Open `http://localhost:3000` in your browser. Connect MetaMask to interact live with the contract!

---

## 🧪 Running Automated Tests

The testing suite uses `gltest` (the official pytest runner for GenLayer):

```bash
# Run against Studionet or local simulator
pytest tests/ -v
```

### Covered Test Scenarios (100% Passing via GenVM Direct Execution):
- `test_register_license_and_views`: Validates escrow deposit locking, ID indexing, and pagination views.
- `test_file_infringement_claim_with_dispute_bond`: Verifies creator access control, anti-harassment dispute bond, and unauthorized rejections.
- `test_licensee_submits_defense`: Validates Licensee Right of Defense and unauthorized access rejections.
- `test_licensee_concedes_claim`: Validates Amicable Settlement / concession escape hatch without court overhead.
- `test_adjudicate_full_infringement_slashes`: Tests AI Jury consensus confirming copyright piracy and 100% slashing.
- `test_adjudicate_partial_infringement_graduated_slash`: Tests 3-tier graduated ruling (50% slash / 50% refund for derivative works).
- `test_adjudicate_clean_compensates_licensee`: Tests dismissal of unproven claims and awarding creator's dispute bond to licensee.
- `test_reclaim_deposit_expired`: Validates licensee collateral refund upon term conclusion.

---

## 🔒 Security & Best Practices

- **Strict Semantic Consensus:** `validator_fn` compares `mine["verdict"] == leader["verdict"]`. Validators do not fail consensus over formatting nuances or slight phrasing variations in the explanation string.
- **Type Safety in GenVM:** Stored money fields use unbounded `bigint`. Status codes use `u8`. Bounded percentages use `u8`. No bare `int` or `float` types.
- **Pull/Native Push Safety:** Slashing transfers utilize `gl.get_contract_at(recipient).emit_transfer(value=u256(deposit_val))`.
- **Timeout Protection:** If an audit remains stalled for over 50 blocks without adjudication, licensee reclaim protection unlocks.

---

## 📜 License
MIT License. Built for the GenLayer Agentic Economy.
