# On-Chain Full Propose-Through-Reclaim Lifecycle Verification Report

**Target Contract:** [`0xb655Affc7aA969EBFA0f4d66aE6381615dbFd7c9`](https://explorer-studio.genlayer.com/address/0xb655Affc7aA969EBFA0f4d66aE6381615dbFd7c9)  
**Network:** GenLayer Studionet (Chain ID `61999` / `0xF1EF`)  
**Deployment Tx Hash:** [`0xeea1839faf6826dfd95345302c08a824dab8ff2f9fda50becd9cf2f45c6c9c4c`](https://explorer-studio.genlayer.com/tx/0xeea1839faf6826dfd95345302c08a824dab8ff2f9fda50becd9cf2f45c6c9c4c)  
**Vault ID Tested:** `ip-1`  

---

## 1. Summary of Lifecycle Steps Executed on Live Deployment

| Stage | Action | Actor | Tx Hash | Result |
|:---|:---|:---|:---|:---:|
| **Stage 1: Propose** | `propose_license` | Creator (`0xF34587A45C397281Ef6BDd839d4A1de2DEe393ad`) | [`0xefb4d6d4f5dfdd41923a540da994dcdc1c7d468652f2adaf26befebaab3a9d1b`](https://explorer-studio.genlayer.com/tx/0xefb4d6d4f5dfdd41923a540da994dcdc1c7d468652f2adaf26befebaab3a9d1b) | ✅ `FINISHED_WITH_RETURN` (Status: `STATUS_OFFERED = 0`) |
| **Stage 2: Accept & Fund** | `accept_and_fund_license` | Licensee (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`) | [`0xf8c30b7b959a88e0ff31b734ed65e8a5e37866239bd2c313c1169d145bd2199c`](https://explorer-studio.genlayer.com/tx/0xf8c30b7b959a88e0ff31b734ed65e8a5e37866239bd2c313c1169d145bd2199c) | ✅ `FINISHED_WITH_RETURN` (Status: `STATUS_ACTIVE = 1`, 0.5 GEN locked) |
| **Stage 3: Term Window** | Block Time Advance | Network | *Time Elapsed* | ✅ Duration window expired cleanly |
| **Stage 4: Reclaim** | `reclaim_deposit` | Licensee (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`) | [`0xcb5b098dcf93d2faa9f62f3e90b7f4416bf47dbc9eaac91eab7059c32d2a5fc8`](https://explorer-studio.genlayer.com/tx/0xcb5b098dcf93d2faa9f62f3e90b7f4416bf47dbc9eaac91eab7059c32d2a5fc8) | ✅ `FINISHED_WITH_RETURN` (Status: `STATUS_EXPIRED_REFUNDED = 8`, 100% direct native transfer emitted immediately to Licensee wallet via `emit_transfer`) |

*Note: The intermediate `withdrawable_balances` mapping and secondary `withdraw()` step have been completely eliminated. Direct native transfers (`emit_transfer`) disburse funds in a single transaction, preventing duplicate claims.*

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
  "created_at": "1791382948",
  "activated_at": "1791382969",
  "expires_at": "1791382979",
  "defense_deadline": "0",
  "split_proposer": "",
  "created_at_block": "1791382948",
  "expires_at_block": "1791382979"
}
```

---

## 3. Reviewer Verification Instructions

To independently verify this exact on-chain lifecycle:
```bash
python scripts/verify_reclaim_lifecycle.py
```
All transactions are permanently registered on GenLayer Studionet consensus.
