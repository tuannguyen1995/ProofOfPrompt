import pytest
import json
import sys
from pathlib import Path

CONTRACT_PATH = Path(__file__).resolve().parent.parent / "contracts" / "contract.py"


def test_two_sided_escrow_and_defense_window_enforcement(direct_deploy, direct_vm, direct_alice, direct_bob):
    """
    Validates complete two-sided escrow workflow:
    1. Creator proposes terms (NO collateral funded yet)
    2. Licensee accepts and funds collateral deposit
    3. Creator files claim with mandatory anti-harassment bond
    4. Adjudication blocked while defense window is active
    5. Licensee submits defense statement and URL
    6. Adjudication trial executes cleanly
    """
    creator = direct_alice
    licensee = direct_bob

    direct_vm.sender = creator
    direct_vm.value = 0
    contract = direct_deploy(str(CONTRACT_PATH))
    Address = sys.modules["genlayer"].Address

    # Step 1: Creator proposes license (no collateral locked)
    vault_id = contract.propose_license(
        Address(licensee), "Cyberpunk Glitch Holographic Style DNA", 1000000000000000000, 86400 * 30
    )
    assert vault_id == "ip-1"

    v_offered = json.loads(contract.get_vault(vault_id))
    assert v_offered["status"] == 0  # STATUS_OFFERED
    assert v_offered["escrow_deposit"] == "0"
    assert v_offered["verdict"] == "AWAITING_LICENSEE_FUNDING"

    # Step 2: Licensee funds required collateral
    direct_vm.sender = licensee
    direct_vm.value = 1000000000000000000
    contract.accept_and_fund_license(vault_id)

    v_active = json.loads(contract.get_vault(vault_id))
    assert v_active["status"] == 1  # STATUS_ACTIVE
    assert v_active["escrow_deposit"] == "1000000000000000000"

    # Step 3: Creator files infringement claim with required 10% bond
    direct_vm.sender = creator
    direct_vm.value = 100000000000000000  # 0.1 GEN bond
    contract.file_infringement_claim(
        vault_id, "https://artstation-leaks.org/sample-piece.png"
    )

    v_disputed = json.loads(contract.get_vault(vault_id))
    assert v_disputed["status"] == 2  # STATUS_DISPUTE_FILED
    assert int(v_disputed["defense_deadline"]) > 0

    # Step 4: Adjudication is strictly BLOCKED while defense window is open
    with pytest.raises(Exception, match="Cannot adjudicate yet: Licensee defense window is active"):
        contract.adjudicate_infringement(vault_id)

    # Step 5: Licensee submits defense
    direct_vm.sender = licensee
    direct_vm.value = 0
    contract.submit_licensee_defense(
        vault_id, "https://artstation-defense.org/proof.png", "Independent creation with licensed shaders."
    )

    v_defended = json.loads(contract.get_vault(vault_id))
    assert v_defended["status"] == 3  # STATUS_DEFENSE_SUBMITTED

    # Step 6: Trial can now proceed
    direct_vm.mock_web(".*", {
        "status": 200,
        "body": "Rendered visual style shaders and layers."
    })
    direct_vm.mock_llm(".*", json.dumps({
        "verdict": "CLEAN_AUTHORIZED",
        "confidence": 95,
        "similarity_score": 15,
        "reason": "Defense evidence proves independent creation."
    }))
    contract.adjudicate_infringement(vault_id)

    v_settled = json.loads(contract.get_vault(vault_id))
    assert v_settled["status"] == 1  # Reinstated to active clean status
    assert v_settled["verdict"] == "CLEAN_AUTHORIZED"
