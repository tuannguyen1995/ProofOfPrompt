# On-Chain Full Propose-Through-Reclaim Lifecycle Verification Report

**Target Contract:** [`0x7078594e4CE26A4A0E7970C150e4ee56d381F640`](https://explorer-studio.genlayer.com/address/0x7078594e4CE26A4A0E7970C150e4ee56d381F640)  
**Network:** GenLayer Studionet (Chain ID `61999` / `0xF1EF`)  
**Execution Timestamp:** 2026-09-25T17:37:43.036926Z  
**Vault ID Tested:** `ip-2`  

---

## 1. Summary of Lifecycle Steps Executed on Live Deployment

| Stage | Action | Actor | Tx Hash | Result |
|:---|:---|:---|:---|:---:|
| **Stage 1: Propose** | `propose_license` | Creator (`0xF34587A45C397281Ef6BDd839d4A1de2DEe393ad`) | [`0xf554ec0a38d913faa181152b1342184bb31c75d4f0a43fc08a5ff41fe9c52a65`](https://explorer-studio.genlayer.com/tx/0xf554ec0a38d913faa181152b1342184bb31c75d4f0a43fc08a5ff41fe9c52a65) | ✅ `FINISHED_WITH_RETURN` (Status: `STATUS_OFFERED = 0`) |
| **Stage 2: Accept & Fund** | `accept_and_fund_license` | Licensee (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`) | [`0xc6eae50f0785424f500a9373c335c61b13a98ede417f01667a9aeddad309545a`](https://explorer-studio.genlayer.com/tx/0xc6eae50f0785424f500a9373c335c61b13a98ede417f01667a9aeddad309545a) | ✅ `FINISHED_WITH_RETURN` (Status: `STATUS_ACTIVE = 1`, 0.5 GEN locked) |
| **Stage 3: Term Window** | Block Time Advance | Network | *Time Elapsed* | ✅ Duration window expired cleanly |
| **Stage 4: Reclaim** | `reclaim_deposit` | Licensee (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`) | [`0x8962655ba37ebd67a0e33cdf5cd21b43304d4d73440ad36ad5cb6cfeb85babec`](https://explorer-studio.genlayer.com/tx/0x8962655ba37ebd67a0e33cdf5cd21b43304d4d73440ad36ad5cb6cfeb85babec) | ✅ `FINISHED_WITH_RETURN` (Status: `STATUS_EXPIRED_REFUNDED = 8`, 100% refund) |

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
  "created_at": "1790357790",
  "activated_at": "1790357810",
  "expires_at": "1790357820",
  "defense_deadline": "0",
  "split_proposer": "",
  "created_at_block": "1790357790",
  "expires_at_block": "1790357820"
}
```

---

## 3. Reviewer Verification Instructions

To independently verify this exact on-chain lifecycle:
```bash
python scripts/verify_reclaim_lifecycle.py
```
All transactions are permanently registered on GenLayer Studionet consensus.
