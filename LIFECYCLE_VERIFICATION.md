# On-Chain Full Propose-Through-Reclaim Lifecycle Verification Report

**Target Contract:** [`0x067fE00af215fa0f40F2F5A01de884250c5771a1`](https://explorer-studio.genlayer.com/address/0x067fE00af215fa0f40F2F5A01de884250c5771a1)  
**Network:** GenLayer Studionet (Chain ID `61999` / `0xF1EF`)  
**Execution Timestamp:** 2026-10-07T14:56:07.660936Z  
**Vault ID Tested:** `ip-1`  

---

## 1. Summary of Lifecycle Steps Executed on Live Deployment

| Stage | Action | Actor | Tx Hash | Result |
|:---|:---|:---|:---|:---:|
| **Stage 1: Propose** | `propose_license` | Creator (`0xF34587A45C397281Ef6BDd839d4A1de2DEe393ad`) | [`0x423255565153327352867c6f0ad0662e2bcecfa0e4f5e158d74ea53a34062513`](https://explorer-studio.genlayer.com/tx/0x423255565153327352867c6f0ad0662e2bcecfa0e4f5e158d74ea53a34062513) | ✅ `FINISHED_WITH_RETURN` (Status: `STATUS_OFFERED = 0`) |
| **Stage 2: Accept & Fund** | `accept_and_fund_license` | Licensee (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`) | [`0x3ed42d1369576f772ca2f3262e79bbd79f4f62eb69fb5b26d48bf7736d4ec5ff`](https://explorer-studio.genlayer.com/tx/0x3ed42d1369576f772ca2f3262e79bbd79f4f62eb69fb5b26d48bf7736d4ec5ff) | ✅ `FINISHED_WITH_RETURN` (Status: `STATUS_ACTIVE = 1`, 0.5 GEN locked) |
| **Stage 3: Term Window** | Block Time Advance | Network | *Time Elapsed* | ✅ Duration window expired cleanly |
| **Stage 4: Reclaim** | `reclaim_deposit` | Licensee (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`) | [`0x9318c300cf7f75937cd61e4d2be28b2c8de66808a9e7269798885361aa1a78eb`](https://explorer-studio.genlayer.com/tx/0x9318c300cf7f75937cd61e4d2be28b2c8de66808a9e7269798885361aa1a78eb) | ✅ `FINISHED_WITH_RETURN` (Status: `STATUS_EXPIRED_REFUNDED = 8`, 100% direct native refund released to Licensee wallet) |


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
  "created_at": "1791384894",
  "activated_at": "1791384914",
  "expires_at": "1791384924",
  "defense_deadline": "0",
  "split_proposer": "",
  "created_at_block": "1791384894",
  "expires_at_block": "1791384924"
}
```

---

## 3. Reviewer Verification Instructions

To independently verify this exact on-chain lifecycle:
```bash
python scripts/verify_reclaim_lifecycle.py
```
All transactions are permanently registered on GenLayer Studionet consensus.
