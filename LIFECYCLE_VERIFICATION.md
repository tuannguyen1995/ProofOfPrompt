# On-Chain Full Propose-Through-Reclaim Lifecycle Verification Report

**Target Contract:** [`0x985d0162B38Fa33e753DD9487A6212bB381814fc`](https://explorer-studio.genlayer.com/address/0x985d0162B38Fa33e753DD9487A6212bB381814fc)  
**Network:** GenLayer Studionet (Chain ID `61999` / `0xF1EF`)  
**Execution Timestamp:** 2026-09-30T05:08:19.317473Z  
**Vault ID Tested:** `ip-2`  

---

## 1. Summary of Lifecycle Steps Executed on Live Deployment

| Stage | Action | Actor | Tx Hash | Result |
|:---|:---|:---|:---|:---:|
| **Stage 1: Propose** | `propose_license` | Creator (`0xF34587A45C397281Ef6BDd839d4A1de2DEe393ad`) | [`0xc791b7e82aa2be72059ae9d117a9fbf1c7575c3f23ff5517d9864a3addaf3d65`](https://explorer-studio.genlayer.com/tx/0xc791b7e82aa2be72059ae9d117a9fbf1c7575c3f23ff5517d9864a3addaf3d65) | ✅ `FINISHED_WITH_RETURN` (Status: `STATUS_OFFERED = 0`) |
| **Stage 2: Accept & Fund** | `accept_and_fund_license` | Licensee (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`) | [`0x79490cba4e23976298a26d1034433e586a7985c4ac74685489a1e74ea4c4629d`](https://explorer-studio.genlayer.com/tx/0x79490cba4e23976298a26d1034433e586a7985c4ac74685489a1e74ea4c4629d) | ✅ `FINISHED_WITH_RETURN` (Status: `STATUS_ACTIVE = 1`, 0.5 GEN locked) |
| **Stage 3: Term Window** | Block Time Advance | Network | *Time Elapsed* | ✅ Duration window expired cleanly |
| **Stage 4: Reclaim** | `reclaim_deposit` | Licensee (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`) | [`0x9b0fb2ef39fc4a0c316261ec4d1a50763fd9d1877a33f7aa986a5ef70f4ed132`](https://explorer-studio.genlayer.com/tx/0x9b0fb2ef39fc4a0c316261ec4d1a50763fd9d1877a33f7aa986a5ef70f4ed132) | ✅ `FINISHED_WITH_RETURN` (Status: `STATUS_EXPIRED_REFUNDED = 8`, 100% refund) |

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
  "created_at": "1790744827",
  "activated_at": "1790744847",
  "expires_at": "1790744857",
  "defense_deadline": "0",
  "split_proposer": "",
  "created_at_block": "1790744827",
  "expires_at_block": "1790744857"
}
```

---

## 3. Reviewer Verification Instructions

To independently verify this exact on-chain lifecycle:
```bash
python scripts/verify_reclaim_lifecycle.py
```
All transactions are permanently registered on GenLayer Studionet consensus.
