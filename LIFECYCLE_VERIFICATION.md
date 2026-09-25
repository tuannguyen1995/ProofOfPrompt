# On-Chain Full Propose-Through-Reclaim Lifecycle Verification Report

> **Target Contract:** [`0x7DdA9559C647de311e8D86f161f1D0DF264A9A22`](https://explorer-studio.genlayer.com/address/0x7DdA9559C647de311e8D86f161f1D0DF264A9A22)  
> **Network:** GenLayer Studionet (Chain ID `61999` / `0xF1EF`)  
> **RPC Endpoint:** `https://studio.genlayer.com/api`  
> **Verification Status:** ✅ 100% Passed On-Chain  

---

## 1. Executive Summary

This report documents the on-chain execution of the **Full Propose-Through-Reclaim Lifecycle** on the deployed ProofOfPrompt contract (`0x7DdA9559C647de311e8D86f161f1D0DF264A9A22`). Every single stage was committed and finalized across GenVM validators, verifying that:
1. `propose_license` sets up initial terms with `0` creator value.
2. `accept_and_fund_license` allows the designated licensee to fund collateral escrow into `STATUS_ACTIVE`.
3. Upon license duration expiration (`now >= expires_at`), `reclaim_deposit` safely releases 100% of collateral back to the licensee with on-chain transfer emissions.
4. Final vault state resolves cleanly to `STATUS_EXPIRED_REFUNDED` (`8`) with verdict `CLEAN_EXPIRED`.

---

## 2. On-Chain Lifecycle Execution Timeline (Vault `ip-4`)

| Stage | Action | Calling Actor | Transaction Hash | Consensus Status | Final Vault State |
|:---|:---|:---|:---|:---:|:---:|
| **Stage 1** | `propose_license` | Creator (`0xF34587A45C397281Ef6BDd839d4A1de2DEe393ad`) | [`0x63aeb6208b054fe945bbb127ac317f37b82b8eff97f5fb6d3e5738f65d9c6229`](https://explorer-studio.genlayer.com/tx/0x63aeb6208b054fe945bbb127ac317f37b82b8eff97f5fb6d3e5738f65d9c6229) | `FINALIZED` / `MAJORITY_AGREE` | `STATUS_OFFERED` (0) |
| **Stage 2** | `accept_and_fund_license` | Licensee (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`) | [`0x20e4f426a4da988a1ce2b619f54e699a35997e7984881670f6003c08d4bbb7f8`](https://explorer-studio.genlayer.com/tx/0x20e4f426a4da988a1ce2b619f54e699a35997e7984881670f6003c08d4bbb7f8) | `FINALIZED` / `MAJORITY_AGREE` | `STATUS_ACTIVE` (1) — 0.5 GEN locked |
| **Stage 3** | Term Expiry Window | Network Block Time | *10s duration elapsed* | *Timestamp verified* | `expires_at: 1790344668` reached |
| **Stage 4** | `reclaim_deposit` | Licensee (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`) | [`0x8fe8036001103b6c031f99665153bf2cfaf7f795d59a4ee3e22b8cebb24a4929`](https://explorer-studio.genlayer.com/tx/0x8fe8036001103b6c031f99665153bf2cfaf7f795d59a4ee3e22b8cebb24a4929) | `FINALIZED` / `MAJORITY_AGREE` | `STATUS_EXPIRED_REFUNDED` (8) |

---

## 3. On-Chain Internal Transfer Emission

In `Stage 4` (`reclaim_deposit`), GenLayer validators finalized the internal transfer message refunding collateral directly to the licensee:
```json
"messages": [
  {
    "messageType": "0",
    "recipient": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "value": 500000000000000000,
    "data": "Bg==",
    "onAcceptance": false
  }
]
```

---

## 4. Final On-Chain Record (Read directly via `get_vault("ip-4")`)

```json
{
  "vault_id": "ip-4",
  "creator": "0xF34587A45C397281Ef6BDd839d4A1de2DEe393ad",
  "licensee": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "required_deposit": "500000000000000000",
  "escrow_deposit": "500000000000000000",
  "creator_bond": "0",
  "ip_style_spec": "Ultra-Resolution Neural LoRA Weights: Cyberpunk Architecture v3 [CANARY: LIFECYCLE-PROPOSE-RECLAIM]",
  "duration_seconds": "10",
  "infringement_url": "",
  "defense_url": "",
  "defense_statement": "",
  "status": 8,
  "verdict": "CLEAN_EXPIRED",
  "reason": "License period ended with zero confirmed infringements. Deposit reclaimed.",
  "confidence": 0,
  "similarity_score": 0,
  "created_at": "1790344638",
  "activated_at": "1790344658",
  "expires_at": "1790344668",
  "defense_deadline": "0",
  "split_proposer": "0x0000000000000000000000000000000000000000",
  "created_at_block": "1790344638",
  "expires_at_block": "1790344668"
}
```

---

## 5. Independent Verification Command

Anyone can re-run this automated lifecycle verification against the deployed contract at any time:
```bash
python scripts/verify_reclaim_lifecycle.py
```
