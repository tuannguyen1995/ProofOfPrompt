# On-Chain Full Propose-Through-Reclaim Lifecycle Verification Report

**Target Contract:** [`0x04E7B231331179895659B6D70E6b4F14d5B63ee7`](https://explorer-studio.genlayer.com/address/0x04E7B231331179895659B6D70E6b4F14d5B63ee7)  
**Network:** GenLayer Studionet (Chain ID `61999` / `0xF1EF`)  
**Execution Timestamp:** 2026-09-25T14:36:47.431231Z  
**Vault ID Tested:** `ip-2`  

---

## 1. Summary of Lifecycle Steps Executed on Live Deployment

| Stage | Action | Actor | Tx Hash | Result |
|:---|:---|:---|:---|:---:|
| **Stage 1: Propose** | `propose_license` | Creator (`0xF34587A45C397281Ef6BDd839d4A1de2DEe393ad`) | [`0x593af59aaf6725961b69c84c4a3cf826578822e2d92810e91981cddb2edcf52a`](https://explorer-studio.genlayer.com/tx/0x593af59aaf6725961b69c84c4a3cf826578822e2d92810e91981cddb2edcf52a) | ✅ `FINISHED_WITH_RETURN` (Status: `STATUS_OFFERED = 0`) |
| **Stage 2: Accept & Fund** | `accept_and_fund_license` | Licensee (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`) | [`0x021182975104ffaf04c6b1248f448cff1f608b789735d8ab0dbb49c6657a0b39`](https://explorer-studio.genlayer.com/tx/0x021182975104ffaf04c6b1248f448cff1f608b789735d8ab0dbb49c6657a0b39) | ✅ `FINISHED_WITH_RETURN` (Status: `STATUS_ACTIVE = 1`, 0.5 GEN locked) |
| **Stage 3: Term Window** | Block Time Advance | Network | *Time Elapsed* | ✅ Duration window expired cleanly |
| **Stage 4: Reclaim** | `reclaim_deposit` | Licensee (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`) | [`0xe53a74f345a49fadc32ecce5abea454d03b68637a3dadc459f81a730ebfe37e3`](https://explorer-studio.genlayer.com/tx/0xe53a74f345a49fadc32ecce5abea454d03b68637a3dadc459f81a730ebfe37e3) | ✅ `FINISHED_WITH_RETURN` (Status: `STATUS_EXPIRED_REFUNDED = 8`, 100% refund) |

---

## 2. Final On-Chain Vault Record (`ip-2`)

```json
{
  "vault_id": "ip-2",
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
  "created_at": "1790346934",
  "activated_at": "1790346954",
  "expires_at": "1790346964",
  "defense_deadline": "0",
  "split_proposer": "0x0000000000000000000000000000000000000000",
  "created_at_block": "1790346934",
  "expires_at_block": "1790346964"
}
```

---

## 3. Reviewer Verification Instructions

To independently verify this exact on-chain lifecycle:
```bash
python scripts/verify_reclaim_lifecycle.py
```
All transactions are permanently registered on GenLayer Studionet consensus.
