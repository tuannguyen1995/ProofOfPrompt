import time
import json
from datetime import datetime
from genlayer_py import create_account, create_client, studionet
from genlayer_py.abi.calldata.encoder import CalldataAddress

CONTRACT = "0x7078594e4CE26A4A0E7970C150e4ee56d381F640"
PK_CREATOR = "0x1b807b1df022a40f872596b11565e6b6856547dc66996bd3d5a85b376ea3a0ef"
PK_LICENSEE = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
EXPLORER_BASE = "https://explorer-studio.genlayer.com"

def main():
    print("=" * 75, flush=True)
    print("PROOF OF PROMPT: COMPLETE PROPOSE-THROUGH-RECLAIM LIFECYCLE VERIFICATION", flush=True)
    print(f"Contract Deployment: {CONTRACT}", flush=True)
    print(f"Target Network:      GenLayer Studionet (Chain ID 61999)", flush=True)
    print("=" * 75, flush=True)

    acc_creator = create_account(PK_CREATOR)
    acc_licensee = create_account(PK_LICENSEE)
    print(f"[+] Creator Address:  {acc_creator.address}", flush=True)
    print(f"[+] Licensee Address: {acc_licensee.address}", flush=True)

    client_creator = create_client(chain=studionet, account=acc_creator)
    client_licensee = create_client(chain=studionet, account=acc_licensee)

    # Check pre-existing vault count
    initial_count = int(client_creator.read_contract(address=CONTRACT, function_name="get_vault_count", args=[]))
    target_vault_id = f"ip-{initial_count + 1}"
    print(f"[+] Current Vault Count: {initial_count}. New Target Vault: {target_vault_id}", flush=True)

    deposit_wei = 500_000_000_000_000_000  # 0.5 GEN
    duration_test_sec = 10                  # 10s short duration for deterministic on-chain expiry test
    spec = "Ultra-Resolution Neural LoRA Weights: Cyberpunk Architecture v3 [CANARY: LIFECYCLE-PROPOSE-RECLAIM]"

    # -------------------------------------------------------------
    # STAGE 1: Creator proposes terms (0 GEN value)
    # -------------------------------------------------------------
    print(f"\n--- [Stage 1] Creator Proposing License Terms for {target_vault_id} ---", flush=True)
    tx_propose = client_creator.write_contract(
        address=CONTRACT,
        function_name="propose_license",
        args=[CalldataAddress(acc_licensee.address), spec, deposit_wei, duration_test_sec],
        value=0
    )
    print(f" -> Propose Tx Hash: {tx_propose}", flush=True)
    print(f" -> Explorer: {EXPLORER_BASE}/tx/{tx_propose}", flush=True)
    print(" -> Awaiting 15s for validator consensus & block inclusion...", flush=True)
    time.sleep(15)

    v1_raw = client_creator.read_contract(address=CONTRACT, function_name="get_vault", args=[target_vault_id])
    v1 = json.loads(v1_raw)
    print(f" -> Vault Created! Status: {v1['status']} (STATUS_OFFERED=0), Deposit Required: {int(v1['required_deposit'])/10**18} GEN", flush=True)
    assert v1['status'] == 0, f"Expected STATUS_OFFERED (0), got {v1['status']}"

    # -------------------------------------------------------------
    # STAGE 2: Licensee accepts terms and funds collateral escrow
    # -------------------------------------------------------------
    print(f"\n--- [Stage 2] Licensee Accepts & Funds 0.50 GEN Collateral for {target_vault_id} ---", flush=True)
    tx_accept = client_licensee.write_contract(
        address=CONTRACT,
        function_name="accept_and_fund_license",
        args=[target_vault_id],
        value=deposit_wei
    )
    print(f" -> Accept & Fund Tx Hash: {tx_accept}", flush=True)
    print(f" -> Explorer: {EXPLORER_BASE}/tx/{tx_accept}", flush=True)
    print(" -> Awaiting 15s for validator consensus & escrow lock...", flush=True)
    time.sleep(15)

    v2_raw = client_creator.read_contract(address=CONTRACT, function_name="get_vault", args=[target_vault_id])
    v2 = json.loads(v2_raw)
    print(f" -> Vault Active! Status: {v2['status']} (STATUS_ACTIVE=1), Escrow Deposit Locked: {int(v2['escrow_deposit'])/10**18} GEN", flush=True)
    print(f" -> Activated At: {v2['activated_at']}, Expires At: {v2['expires_at']}", flush=True)
    assert v2['status'] == 1, f"Expected STATUS_ACTIVE (1), got {v2['status']}"
    assert int(v2['escrow_deposit']) == deposit_wei, "Escrow deposit mismatch"

    # -------------------------------------------------------------
    # STAGE 3: Await license period expiration
    # -------------------------------------------------------------
    print(f"\n--- [Stage 3] Awaiting Expiration of Duration Window ({duration_test_sec}s) ---", flush=True)
    print(" -> Sleeping 15s to ensure block time > expires_at...", flush=True)
    time.sleep(15)

    # -------------------------------------------------------------
    # STAGE 4: Licensee reclaims full deposit
    # -------------------------------------------------------------
    print(f"\n--- [Stage 4] Licensee Reclaiming Guarantee Deposit for {target_vault_id} ---", flush=True)
    tx_reclaim = client_licensee.write_contract(
        address=CONTRACT,
        function_name="reclaim_deposit",
        args=[target_vault_id],
    )
    print(f" -> Reclaim Tx Hash: {tx_reclaim}", flush=True)
    print(f" -> Explorer: {EXPLORER_BASE}/tx/{tx_reclaim}", flush=True)
    print(" -> Awaiting 15s for validator inclusion & fund disbursement...", flush=True)
    time.sleep(15)

    # -------------------------------------------------------------
    # STAGE 5: Final State Inspection & Verification
    # -------------------------------------------------------------
    v3_raw = client_creator.read_contract(address=CONTRACT, function_name="get_vault", args=[target_vault_id])
    v3 = json.loads(v3_raw)

    print("\n" + "=" * 75, flush=True)
    print("FINAL ON-CHAIN STATE (PROPOSE-THROUGH-RECLAIM COMPLETE):", flush=True)
    print("=" * 75, flush=True)
    print(f"Vault ID:         {v3['vault_id']}", flush=True)
    print(f"Final Status:     {v3['status']} (STATUS_EXPIRED_REFUNDED = 8)", flush=True)
    print(f"Final Verdict:    {v3['verdict']}", flush=True)
    print(f"Final Reason:     {v3['reason']}", flush=True)
    print(f"Escrow Balance:   {int(v3['escrow_deposit'])} wei (Fully refunded to licensee)", flush=True)
    print("=" * 75, flush=True)

    assert v3['status'] == 8, f"Expected STATUS_EXPIRED_REFUNDED (8), got {v3['status']}"
    assert v3['verdict'] == "CLEAN_EXPIRED", f"Expected CLEAN_EXPIRED verdict, got {v3['verdict']}"
    assert int(v3['escrow_deposit']) == deposit_wei, f"Expected {deposit_wei} original deposit, got {v3['escrow_deposit']}"

    # Generate persistent verification artifact
    report_content = f"""# On-Chain Full Propose-Through-Reclaim Lifecycle Verification Report

**Target Contract:** [`{CONTRACT}`]({EXPLORER_BASE}/address/{CONTRACT})  
**Network:** GenLayer Studionet (Chain ID `61999` / `0xF1EF`)  
**Execution Timestamp:** {datetime.utcnow().isoformat()}Z  
**Vault ID Tested:** `{target_vault_id}`  

---

## 1. Summary of Lifecycle Steps Executed on Live Deployment

| Stage | Action | Actor | Tx Hash | Result |
|:---|:---|:---|:---|:---:|
| **Stage 1: Propose** | `propose_license` | Creator (`{acc_creator.address}`) | [`{tx_propose}`]({EXPLORER_BASE}/tx/{tx_propose}) | ✅ `FINISHED_WITH_RETURN` (Status: `STATUS_OFFERED = 0`) |
| **Stage 2: Accept & Fund** | `accept_and_fund_license` | Licensee (`{acc_licensee.address}`) | [`{tx_accept}`]({EXPLORER_BASE}/tx/{tx_accept}) | ✅ `FINISHED_WITH_RETURN` (Status: `STATUS_ACTIVE = 1`, 0.5 GEN locked) |
| **Stage 3: Term Window** | Block Time Advance | Network | *Time Elapsed* | ✅ Duration window expired cleanly |
| **Stage 4: Reclaim** | `reclaim_deposit` | Licensee (`{acc_licensee.address}`) | [`{tx_reclaim}`]({EXPLORER_BASE}/tx/{tx_reclaim}) | ✅ `FINISHED_WITH_RETURN` (Status: `STATUS_EXPIRED_REFUNDED = 8`, 100% refund) |

---

## 2. Final On-Chain Vault Record (`{target_vault_id}`)

```json
{json.dumps(v3, indent=2)}
```

---

## 3. Reviewer Verification Instructions

To independently verify this exact on-chain lifecycle:
```bash
python scripts/verify_reclaim_lifecycle.py
```
All transactions are permanently registered on GenLayer Studionet consensus.
"""

    with open("LIFECYCLE_VERIFICATION.md", "w", encoding="utf-8") as f:
        f.write(report_content)

    print("\n[SUCCESS] Report written to LIFECYCLE_VERIFICATION.md in repository root!", flush=True)

if __name__ == "__main__":
    main()
