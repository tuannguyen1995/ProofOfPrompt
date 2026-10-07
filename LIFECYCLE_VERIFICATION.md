# On-Chain Full Propose-Through-Reclaim Lifecycle Verification Report

**Target Contract:** [`0x2d1F9cB6C71225C477372285225d641feefA688A`](https://explorer-studio.genlayer.com/address/0x2d1F9cB6C71225C477372285225d641feefA688A)  
**Network:** GenLayer Studionet (Chain ID `61999` / `0xF1EF`)  
**Execution Timestamp:** 2026-10-07T15:21:05.626754Z  
**Vault ID Tested:** `ip-1`  

---

## 1. Summary of Lifecycle Steps Executed on Live Deployment

| Stage | Action | Actor | Tx Hash | Result |
|:---|:---|:---|:---|:---:|
| **Stage 1: Propose** | `propose_license` | Creator (`0xF34587A45C397281Ef6BDd839d4A1de2DEe393ad`) | [`0xce77132eea1aec955a82058c555abac13d0a6e47bda146f32deb8b5af0803917`](https://explorer-studio.genlayer.com/tx/0xce77132eea1aec955a82058c555abac13d0a6e47bda146f32deb8b5af0803917) | ✅ `FINISHED_WITH_RETURN` (Status: `STATUS_OFFERED = 0`) |
| **Stage 2: Accept & Fund** | `accept_and_fund_license` | Licensee (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`) | [`0x2457990bfc824f8866747b101d97fa58c4ede28378c03cea502b8fd3655ea4b8`](https://explorer-studio.genlayer.com/tx/0x2457990bfc824f8866747b101d97fa58c4ede28378c03cea502b8fd3655ea4b8) | ✅ `FINISHED_WITH_RETURN` (Status: `STATUS_ACTIVE = 1`, 0.5 GEN locked) |
| **Stage 3: Term Window** | Block Time Advance | Network | *Time Elapsed* | ✅ Duration window expired cleanly |
| **Stage 4: Reclaim** | `reclaim_deposit` | Licensee (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`) | [`0xb50debadecded5f3a29584cd509d9d5353d68e018aad8d1c58c0e72cc1365e80`](https://explorer-studio.genlayer.com/tx/0xb50debadecded5f3a29584cd509d9d5353d68e018aad8d1c58c0e72cc1365e80) | ✅ `FINISHED_WITH_RETURN` (Status: `STATUS_EXPIRED_REFUNDED = 8`, 100% direct native refund released to Licensee wallet) |


---

## 2. Final On-Chain Vault Record (`ip-1`)

```json
{
  "vault_id": "ip-1",
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
  "created_at": "1791386391",
  "activated_at": "1791386412",
  "expires_at": "1791386422",
  "defense_deadline": "0",
  "split_proposer": "",
  "created_at_block": "1791386391",
  "expires_at_block": "1791386422"
}
```

---

## 3. Reviewer Verification Instructions

To independently verify this exact on-chain lifecycle:
```bash
python scripts/verify_reclaim_lifecycle.py
```
All transactions are permanently registered on GenLayer Studionet consensus.
