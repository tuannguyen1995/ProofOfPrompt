import time
from genlayer_py import create_account, create_client, studionet
from genlayer_py.abi.calldata.encoder import CalldataAddress

CONTRACT = "0xDB02327FE8cFAbF2066A0AB0Bfd762135E4a0290"
PK = "0x1b807b1df022a40f872596b11565e6b6856547dc66996bd3d5a85b376ea3a0ef"

def main():
    print("=" * 60)
    print("Seeding Live Test Task on GenLayer Studionet...")
    print("=" * 60)
    creator_acc = create_account(PK)
    print(f"Creator: {creator_acc.address}")
    client = create_client(chain=studionet, account=creator_acc)

    spec = "Master Prompt DNA: Cybernetic Surrealist Portrait with volumetric neon, 8k octane render, canary: [POP-CYBER-9941]"
    licensee_addr = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"

    print("Step 1: Registering License Vault...")
    tx1 = client.write_contract(
        address=CONTRACT,
        function_name="register_license",
        args=[CalldataAddress(licensee_addr), spec, 10000],
        value=1_000_000_000_000_000_000
    )
    print(f" -> Tx1 Hash: {tx1}")
    time.sleep(15)

    print("Step 2: Filing Copyright Infringement Claim...")
    tx2 = client.write_contract(
        address=CONTRACT,
        function_name="file_infringement_claim",
        args=["ip-1", "https://raw.githubusercontent.com/tuannguyen1995/ProofOfPrompt/master/README.md"],
        value=100_000_000_000_000_000
    )
    print(f" -> Tx2 Hash: {tx2}")
    time.sleep(15)
    print("Done! Task is ready for testing.")

if __name__ == "__main__":
    main()
