import time
from genlayer_py import create_account, create_client, studionet
from genlayer_py.abi.calldata.encoder import CalldataAddress

CONTRACT = "0x7078594e4CE26A4A0E7970C150e4ee56d381F640"
PK_CREATOR = "0x1b807b1df022a40f872596b11565e6b6856547dc66996bd3d5a85b376ea3a0ef"
PK_LICENSEE = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"

def main():
    print("=" * 70, flush=True)
    print("Seeding Live Two-Sided Task on GenLayer Studionet...", flush=True)
    print(f"Contract: {CONTRACT}", flush=True)
    print("=" * 70, flush=True)

    creator_acc = create_account(PK_CREATOR)
    licensee_acc = create_account(PK_LICENSEE)
    print(f"[+] Creator:  {creator_acc.address}", flush=True)
    print(f"[+] Licensee: {licensee_acc.address}", flush=True)

    client_creator = create_client(chain=studionet, account=creator_acc)
    client_licensee = create_client(chain=studionet, account=licensee_acc)

    spec = "Master Prompt DNA: Cybernetic Surrealist Portrait with volumetric neon, 8k octane render, canary: [POP-CYBER-9941]"
    deposit_wei = 1_000_000_000_000_000_000  # 1.0 GEN
    bond_wei = 100_000_000_000_000_000       # 0.10 GEN (10% anti-harassment bond)

    # Step 1: Creator proposes license terms (Creator sends 0 value)
    print("\n[Step 1] Creator proposes license terms (0 GEN deposit)...", flush=True)
    tx1 = client_creator.write_contract(
        address=CONTRACT,
        function_name="propose_license",
        args=[CalldataAddress(licensee_acc.address), spec, deposit_wei, 2592000],
        value=0
    )
    print(f" -> Tx1 Hash: {tx1}", flush=True)
    print(" -> Awaiting 15s for validator inclusion...", flush=True)
    time.sleep(15)

    # Step 2: Licensee accepts and funds their own collateral
    print("\n[Step 2] Licensee accepts terms and funds 1.0 GEN collateral...", flush=True)
    tx2 = client_licensee.write_contract(
        address=CONTRACT,
        function_name="accept_and_fund_license",
        args=["ip-1"],
        value=deposit_wei
    )
    print(f" -> Tx2 Hash: {tx2}", flush=True)
    print(" -> Awaiting 15s for validator inclusion...", flush=True)
    time.sleep(15)

    # Step 3: Creator files infringement dispute with 10% anti-harassment bond
    print("\n[Step 3] Creator files copyright claim with 0.10 GEN bond...", flush=True)
    evidence_url = "https://raw.githubusercontent.com/tuannguyen1995/ProofOfPrompt/master/README.md"
    tx3 = client_creator.write_contract(
        address=CONTRACT,
        function_name="file_infringement_claim",
        args=["ip-1", evidence_url],
        value=bond_wei
    )
    print(f" -> Tx3 Hash: {tx3}", flush=True)
    print(" -> Awaiting 15s for validator inclusion...", flush=True)
    time.sleep(15)

    print("\n" + "=" * 70, flush=True)
    print("[SUCCESS] Live two-sided task seeded! Vault 'ip-1' is in DISPUTE_FILED status.", flush=True)
    print("Defense window is active. Ready for licensee rebuttal or settlement!", flush=True)
    print("=" * 70, flush=True)

if __name__ == "__main__":
    main()
