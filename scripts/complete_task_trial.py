import time
import json
from genlayer_py import create_account, create_client, studionet

CONTRACT = "0xFef901554A09048ebB11bad41B1Fe68ef3951241"
PK_CREATOR = "0x1b807b1df022a40f872596b11565e6b6856547dc66996bd3d5a85b376ea3a0ef"
PK_LICENSEE = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"

def main():
    print("=" * 70, flush=True)
    print("PROOF OF PROMPT: FULL TWO-SIDED ADJUDICATION TRIAL ON STUDIONET", flush=True)
    print(f"Contract: {CONTRACT}", flush=True)
    print("=" * 70, flush=True)

    acc_creator = create_account(PK_CREATOR)
    acc_licensee = create_account(PK_LICENSEE)
    print(f"Creator Address:  {acc_creator.address}", flush=True)
    print(f"Licensee Address: {acc_licensee.address}", flush=True)

    client_licensee = create_client(chain=studionet, account=acc_licensee)
    client_court = create_client(chain=studionet, account=acc_creator)

    # 1. Inspect current state of ip-1
    print("\n[Stage 1] Checking current status of vault 'ip-1'...", flush=True)
    vault_raw = client_court.read_contract(address=CONTRACT, function_name="get_vault", args=["ip-1"])
    vault = json.loads(vault_raw)
    print(f" -> Current Status: {vault['status']} (1 = IN_AUDIT)", flush=True)
    print(f" -> Current Verdict: {vault['verdict']}", flush=True)
    print(f" -> Escrow Deposit: {int(vault['escrow_deposit'])/(10**18)} GEN", flush=True)
    print(f" -> Creator Dispute Bond: {int(vault['creator_bond'])/(10**18)} GEN", flush=True)
    print(f" -> Creator Claim Evidence: {vault['infringement_url']}", flush=True)

    # 2. Licensee submits Right of Defense
    print("\n[Stage 2] Licensee exercising Right of Defense on-chain...", flush=True)
    defense_url = "https://raw.githubusercontent.com/tuannguyen1995/ProofOfPrompt/master/package.json"
    defense_statement = "The deployed work is an open-source dApp user interface and legal-tech infrastructure client, NOT an unauthorized prompt-cloned artistic generation."
    
    tx_defense = client_licensee.write_contract(
        address=CONTRACT,
        function_name="submit_licensee_defense",
        args=["ip-1", defense_url, defense_statement],
    )
    print(f" -> Defense Tx Hash: {tx_defense}", flush=True)
    print(" -> Waiting 15s for validator inclusion...", flush=True)
    time.sleep(15)

    vault_after_defense = json.loads(client_court.read_contract(address=CONTRACT, function_name="get_vault", args=["ip-1"]))
    print(f" -> Defense Registered! Defense Statement: \"{vault_after_defense['defense_statement']}\"", flush=True)
    print(f" -> Defense Evidence URL: {vault_after_defense['defense_url']}", flush=True)

    # 3. Court convenes AI Jury Adjudication
    print("\n[Stage 3] Convening GenLayer AI Jury Trial on-chain...", flush=True)
    print(" -> GenVM validators will live-crawl evidence & defense, run LLM consensus, and rule on-chain...", flush=True)
    tx_jury = client_court.write_contract(
        address=CONTRACT,
        function_name="adjudicate_infringement",
        args=["ip-1"],
    )
    print(f" -> Adjudication Tx Hash: {tx_jury}", flush=True)
    print(" -> Waiting 20s for GenVM multi-validator consensus...", flush=True)
    time.sleep(20)

    # 4. Final Verdict Inspection
    print("\n[Stage 4] Fetching Final On-Chain Verdict & Payout Settlement...", flush=True)
    final_vault_raw = client_court.read_contract(address=CONTRACT, function_name="get_vault", args=["ip-1"])
    final_vault = json.loads(final_vault_raw)
    stats = json.loads(client_court.read_contract(address=CONTRACT, function_name="get_stats", args=[]))

    print("=" * 70, flush=True)
    print("FINAL ON-CHAIN TRIAL OUTCOME:", flush=True)
    print("=" * 70, flush=True)
    print(f"Vault ID:         {final_vault['vault_id']}", flush=True)
    print(f"Final Status:     {final_vault['status']} (0=CLEAN_REINSTATED, 2=FULL_SLASH, 4=CONCEDED, 5=PARTIAL_SLASH)", flush=True)
    print(f"Final Verdict:    {final_vault['verdict']}", flush=True)
    print(f"Similarity Score: {final_vault['similarity_score']}%", flush=True)
    print(f"Jury Confidence:  {final_vault['confidence']}%", flush=True)
    print(f"Jury Rationale:   {final_vault['reason']}", flush=True)
    print("-" * 70, flush=True)
    print("CONTRACT GLOBAL STATS:", flush=True)
    print(f"Total Disputes Resolved: {stats['total_disputes_resolved']}", flush=True)
    print(f"Total Deposit Locked:    {int(stats['total_deposit_locked'])/(10**18)} GEN", flush=True)
    print("=" * 70, flush=True)
    print("Trial successfully completed end-to-end on GenLayer Studionet!", flush=True)

if __name__ == "__main__":
    main()
