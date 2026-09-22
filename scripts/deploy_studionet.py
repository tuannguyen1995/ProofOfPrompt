#!/usr/bin/env python3
"""
Deploy ProofOfPrompt Intelligent Contract to GenLayer Studionet (Chain 61999).
RPC: https://studio.genlayer.com/api
"""

import os
import sys
import json
import re
from pathlib import Path
from genlayer_py import create_client, create_account, studionet

PK = os.environ.get("DEPLOYER_PRIVATE_KEY", "0x1b807b1df022a40f872596b11565e6b6856547dc66996bd3d5a85b376ea3a0ef").strip()

def deploy():
    print("=" * 70, flush=True)
    print("   Deploying ProofOfPrompt to GenLayer Studionet (Two-Sided Court)   ", flush=True)
    print("=" * 70, flush=True)

    account = create_account(PK)
    client = create_client(chain=studionet, account=account)
    print(f"[+] Deployer Address: {account.address}", flush=True)
    bal = client.get_balance(account.address)
    print(f"[+] Deployer Balance: {bal / 1e18} GEN", flush=True)

    contract_path = Path(__file__).parent.parent / "contracts" / "contract.py"
    print(f"[+] Reading contract from: {contract_path}", flush=True)
    with open(contract_path, "r", encoding="utf-8") as f:
        contract_code = f.read()

    print("[+] Submitting deploy_contract transaction to Studionet...", flush=True)
    tx_hash = None
    for attempt in range(1, 4):
        try:
            tx_hash = client.deploy_contract(
                code=contract_code,
                account=account,
                args=[],
                leader_only=False
            )
            break
        except Exception as e:
            print(f"[!] Attempt {attempt} failed: {e}. Retrying in 5s...", flush=True)
            import time
            time.sleep(5)

    if not tx_hash:
        print("[!] All deployment attempts failed.", flush=True)
        return

    print(f"[+] Deployment Transaction Hash: {tx_hash}", flush=True)
    print("[+] Waiting for validator consensus and block receipt...", flush=True)

    receipt = client.wait_for_transaction_receipt(tx_hash)
    contract_address = receipt.get("contract_address") or receipt.get("recipient")
    status = receipt.get("status") or receipt.get("result")

    print("\n" + "=" * 70)
    print("          DEPLOYMENT CONFIRMED ON GENLAYER STUDIONET             ")
    print("=" * 70)
    print(f"Contract Address : {contract_address}")
    print(f"Transaction Hash : {tx_hash}")
    print(f"Receipt Status   : {status}")
    print("=" * 70 + "\n")

    if not contract_address:
        print("[!] Warning: Could not find contract_address in receipt. Receipt dump:", flush=True)
        print(receipt, flush=True)
        return

    # 1. Update deployment.json
    dep_file = Path(__file__).parent.parent / "deployment.json"
    output_info = {
        "network": "studionet",
        "chainId": 61999,
        "rpcUrl": "https://studio.genlayer.com/api",
        "contractAddress": contract_address,
        "transactionHash": tx_hash,
        "deployerAddress": account.address,
        "status": str(status),
    }
    with open(dep_file, "w", encoding="utf-8") as f:
        json.dump(output_info, f, indent=2)
    print(f"[+] Saved deployment details to {dep_file}")

    # 2. Update frontend/.env
    env_file = Path(__file__).parent.parent / "frontend" / ".env"
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            env_content = f.read()
        env_content = re.sub(r"VITE_CONTRACT_ADDRESS=.*", f"VITE_CONTRACT_ADDRESS={contract_address}", env_content)
        with open(env_file, "w", encoding="utf-8") as f:
            f.write(env_content)
        print(f"[+] Updated frontend/.env with {contract_address}")

    # 3. Update frontend/src/config/genlayer.ts
    genlayer_ts = Path(__file__).parent.parent / "frontend" / "src" / "config" / "genlayer.ts"
    if genlayer_ts.exists():
        with open(genlayer_ts, "r", encoding="utf-8") as f:
            ts_content = f.read()
        ts_content = re.sub(
            r"export const CONTRACT_ADDRESS = \(import\.meta\.env\.VITE_CONTRACT_ADDRESS \|\| '[^']+'\)",
            f"export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS || '{contract_address}')",
            ts_content
        )
        with open(genlayer_ts, "w", encoding="utf-8") as f:
            f.write(ts_content)
        print(f"[+] Updated genlayer.ts fallback contract address to {contract_address}")

    # 4. Update README.md
    readme_file = Path(__file__).parent.parent / "README.md"
    if readme_file.exists():
        with open(readme_file, "r", encoding="utf-8") as f:
            readme_content = f.read()
        readme_content = re.sub(r"0x74E491a16C3f2743731D5DF268c36A75A1C836D9", contract_address, readme_content)
        with open(readme_file, "w", encoding="utf-8") as f:
            f.write(readme_content)
        print(f"[+] Updated README.md with {contract_address}")

    # 5. Update scripts/seed_task.py & complete_task_trial.py
    seed_script = Path(__file__).parent.parent / "scripts" / "seed_task.py"
    if seed_script.exists():
        with open(seed_script, "r", encoding="utf-8") as f:
            sc = f.read()
        sc = re.sub(r'CONTRACT = "0x[0-9a-fA-F]+"', f'CONTRACT = "{contract_address}"', sc)
        with open(seed_script, "w", encoding="utf-8") as f:
            f.write(sc)
        print(f"[+] Updated scripts/seed_task.py with {contract_address}")

    complete_script = Path(__file__).parent.parent / "scripts" / "complete_task_trial.py"
    if complete_script.exists():
        with open(complete_script, "r", encoding="utf-8") as f:
            cc = f.read()
        cc = re.sub(r'CONTRACT = "0x[0-9a-fA-F]+"', f'CONTRACT = "{contract_address}"', cc)
        with open(complete_script, "w", encoding="utf-8") as f:
            f.write(cc)
        print(f"[+] Updated scripts/complete_task_trial.py with {contract_address}")

    return contract_address

if __name__ == "__main__":
    deploy()
