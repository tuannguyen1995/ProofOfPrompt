# On-Chain Full Propose-Through-Reclaim Lifecycle Verification Report

**Target Contract:** [`0xBd2A3aaB7c7Da88F690674e3f9b5FCCf52AbaB08`](https://explorer-studio.genlayer.com/address/0xBd2A3aaB7c7Da88F690674e3f9b5FCCf52AbaB08)  
**Network:** GenLayer Studionet (Chain ID `61999` / `0xF1EF`)  
**Execution Timestamp:** 2026-10-02T05:27:28.107510Z  
**Vault ID Tested:** `ip-1`  

---

## 1. Summary of Lifecycle Steps Executed on Live Deployment

| Stage | Action | Actor | Tx Hash | Result |
|:---|:---|:---|:---|:---:|
| **Stage 1: Propose** | `propose_license` | Creator (`0xF34587A45C397281Ef6BDd839d4A1de2DEe393ad`) | [`0xa4e98dc4b3f9363a4f4a0439ce15a967e902f1548df8e043967748e25f1714bd`](https://explorer-studio.genlayer.com/tx/0xa4e98dc4b3f9363a4f4a0439ce15a967e902f1548df8e043967748e25f1714bd) | ✅ `FINISHED_WITH_RETURN` (Status: `STATUS_OFFERED = 0`) |
| **Stage 2: Accept & Fund** | `accept_and_fund_license` | Licensee (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`) | [`0x0874069708b7c67d31c55d5843cca9bc86b9c959c8d5a50c99fc0a9901c5d246`](https://explorer-studio.genlayer.com/tx/0x0874069708b7c67d31c55d5843cca9bc86b9c959c8d5a50c99fc0a9901c5d246) | ✅ `FINISHED_WITH_RETURN` (Status: `STATUS_ACTIVE = 1`, 0.5 GEN locked) |
| **Stage 3: Term Window** | Block Time Advance | Network | *Time Elapsed* | ✅ Duration window expired cleanly |
| **Stage 4: Reclaim** | `reclaim_deposit` | Licensee (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`) | [`0x7b6dccb43e3249da59241d92b0b12cc7dc6dced9bd908b4f7384f9c2590a1f11`](https://explorer-studio.genlayer.com/tx/0x7b6dccb43e3249da59241d92b0b12cc7dc6dced9bd908b4f7384f9c2590a1f11) | ✅ `FINISHED_WITH_RETURN` (Status: `STATUS_EXPIRED_REFUNDED = 8`, 100% refund credited) |
| **Stage 5: Withdraw** | `withdraw` | Licensee (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`) | [`0x6136697680ce65a3c443309d670a5f259b7f6f741b046f146cf73a09a2a37d76`](https://explorer-studio.genlayer.com/tx/0x6136697680ce65a3c443309d670a5f259b7f6f741b046f146cf73a09a2a37d76) | ✅ `FINISHED_WITH_RETURN` (Funds successfully withdrawn by Licensee) |


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
  "created_at": "1790918753",
  "activated_at": "1790918773",
  "expires_at": "1790918783",
  "defense_deadline": "0",
  "split_proposer": "",
  "created_at_block": "1790918753",
  "expires_at_block": "1790918783"
}
```

---

## 3. Reviewer Verification Instructions

To independently verify this exact on-chain lifecycle:
```bash
python scripts/verify_reclaim_lifecycle.py
```
All transactions are permanently registered on GenLayer Studionet consensus.
