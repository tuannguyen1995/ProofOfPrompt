import pytest
import json
import sys
from pathlib import Path

CONTRACT_PATH = Path(__file__).resolve().parent.parent / "contracts" / "contract.py"


def test_register_license_and_views(direct_deploy, direct_vm, direct_alice, direct_bob):
    """Test successful license registration, storage updates, and view getters."""
    creator = direct_alice
    licensee = direct_bob

    direct_vm.sender = creator
    deposit_amount = 5_000_000_000_000_000_000  # 5 GEN
    direct_vm.value = deposit_amount

    contract = direct_deploy(str(CONTRACT_PATH))
    import sys
    Address = sys.modules["genlayer"].Address

    spec = "Prompt DNA: Hyper-realistic cinematic cyberpunk portrait, 8k, volumetric lighting, canary token: [POP-CANARY-7789]"

    # Register license with 5 GEN deposit
    vault_id = contract.register_license(Address(licensee), spec, 1000)
    assert vault_id == "ip-1"

    # Validate stats
    stats_raw = contract.get_stats()
    stats = json.loads(stats_raw)
    assert stats["total_vaults"] == 1
    assert int(stats["total_deposit_locked"]) == deposit_amount
    assert stats["total_disputes_resolved"] == 0

    # Validate vault details
    vault_raw = contract.get_vault("ip-1")
    vault = json.loads(vault_raw)
    assert vault["vault_id"] == "ip-1"
    assert vault["status"] == 0  # ACTIVE_LICENSED
    assert vault["verdict"] == "PENDING"
    assert vault["ip_style_spec"] == spec
    assert int(vault["escrow_deposit"]) == deposit_amount

    # Test pagination
    paginated_raw = contract.get_vaults_paginated(0, 10)
    paginated = json.loads(paginated_raw)
    assert len(paginated) == 1
    assert paginated[0]["vault_id"] == "ip-1"


def test_file_infringement_claim_with_dispute_bond(direct_deploy, direct_vm, direct_alice, direct_bob, direct_charlie):
    """Test filing a copyright infringement claim with anti-harassment dispute bond."""
    creator = direct_alice
    licensee = direct_bob
    attacker = direct_charlie

    direct_vm.sender = creator
    direct_vm.value = 2_000_000_000_000_000_000  # 2 GEN
    contract = direct_deploy(str(CONTRACT_PATH))
    import sys
    Address = sys.modules["genlayer"].Address

    spec = "Style DNA: Bauhaus typography, minimalist editorial geometry, canary: [POP-BAUHAUS-4421]"
    contract.register_license(Address(licensee), spec, 500)

    # Non-creator cannot file claim
    direct_vm.sender = attacker
    with pytest.raises(Exception, match="Only the IP creator"):
        contract.file_infringement_claim("ip-1", "https://unauthorized-store.com/art")

    # Creator files valid claim with anti-harassment dispute bond
    direct_vm.sender = creator
    evidence_url = "https://unauthorized-store.com/art-output"
    bond_amount = 100_000_000_000_000_000  # 0.1 GEN
    direct_vm.value = bond_amount
    contract.file_infringement_claim("ip-1", evidence_url)

    vault = json.loads(contract.get_vault("ip-1"))
    assert vault["status"] == 1  # IN_AUDIT
    assert vault["infringement_url"] == evidence_url
    assert int(vault["creator_bond"]) == bond_amount


def test_licensee_submits_defense(direct_deploy, direct_vm, direct_alice, direct_bob, direct_charlie):
    """Test Licensee exercises their right of defense before trial."""
    creator = direct_alice
    licensee = direct_bob
    stranger = direct_charlie

    direct_vm.sender = creator
    direct_vm.value = 1_000_000_000_000_000_000
    contract = direct_deploy(str(CONTRACT_PATH))
    import sys
    Address = sys.modules["genlayer"].Address

    contract.register_license(Address(licensee), "Style DNA", 500)
    contract.file_infringement_claim("ip-1", "https://disputed-shop.com/item")

    # Stranger cannot submit defense
    direct_vm.sender = stranger
    with pytest.raises(Exception, match="Only the authorized licensee"):
        contract.submit_licensee_defense("ip-1", "https://my-defense.com", "rebuttal statement")

    # Licensee submits valid defense
    direct_vm.sender = licensee
    contract.submit_licensee_defense("ip-1", "https://authorized-scope.com/proof", "Licensed for banner campaign per section 3b.")

    vault = json.loads(contract.get_vault("ip-1"))
    assert vault["defense_url"] == "https://authorized-scope.com/proof"
    assert "banner campaign" in vault["defense_statement"]


def test_licensee_concedes_claim(direct_deploy, direct_vm, direct_alice, direct_bob):
    """Test Amicable Settlement: Licensee concedes undisputed claim."""
    creator = direct_alice
    licensee = direct_bob

    direct_vm.sender = creator
    deposit_val = 2_000_000_000_000_000_000
    direct_vm.value = deposit_val
    contract = direct_deploy(str(CONTRACT_PATH))
    import sys
    Address = sys.modules["genlayer"].Address

    contract.register_license(Address(licensee), "Style DNA", 500)

    bond_val = 200_000_000_000_000_000
    direct_vm.value = bond_val
    contract.file_infringement_claim("ip-1", "https://shop.com/art")

    # Licensee concedes amicably
    direct_vm.sender = licensee
    contract.concede_claim("ip-1")

    vault = json.loads(contract.get_vault("ip-1"))
    assert vault["status"] == 4  # MUTUAL_CONCEDED
    assert vault["verdict"] == "MUTUAL_CONCEDED"

    stats = json.loads(contract.get_stats())
    assert stats["total_disputes_resolved"] == 1
    assert int(stats["total_deposit_locked"]) == 0


def test_adjudicate_full_infringement_slashes(direct_deploy, direct_vm, direct_alice, direct_bob):
    """Test AI Jury adjudicates FULL_INFRINGEMENT: deposit slashed to creator."""
    creator = direct_alice
    licensee = direct_bob

    direct_vm.sender = creator
    deposit_val = 10_000_000_000_000_000_000  # 10 GEN
    direct_vm.value = deposit_val
    contract = direct_deploy(str(CONTRACT_PATH))
    import sys
    Address = sys.modules["genlayer"].Address

    spec = "Master System Prompt: Cyberpunk Noir with canary token [POP-CANARY-7789]"
    contract.register_license(Address(licensee), spec, 500)

    contract.file_infringement_claim("ip-1", "https://pirated-commercial-media.io/gallery")

    # Configure GenVM mocks for web rendering and LLM prompt execution
    direct_vm.mock_web(".*", {
        "status": 200,
        "body": "Commercial Launch: CyberArt Studio. Style: Cyberpunk Neon Noir with canary token [POP-CANARY-7789] and exact volumetric lighting schema."
    })
    direct_vm.mock_llm(".*", json.dumps({
        "verdict": "FULL_INFRINGEMENT",
        "confidence": 95,
        "similarity_score": 92,
        "reason": "Clear forensic match: Exact canary style tokens and syntactic prompting structures detected."
    }))

    # Run AI Jury Adjudication
    direct_vm.sender = creator
    contract.adjudicate_infringement("ip-1")

    vault = json.loads(contract.get_vault("ip-1"))
    assert vault["status"] == 2  # FULL_SLASHED
    assert vault["verdict"] == "FULL_INFRINGEMENT"
    assert vault["similarity_score"] >= 75

    # Check stats updated
    stats = json.loads(contract.get_stats())
    assert stats["total_disputes_resolved"] == 1
    assert int(stats["total_deposit_locked"]) == 0


def test_adjudicate_partial_infringement_graduated_slash(direct_deploy, direct_vm, direct_alice, direct_bob):
    """Test AI Jury adjudicates PARTIAL_INFRINGEMENT: 50% deposit slashed, 50% returned to licensee."""
    creator = direct_alice
    licensee = direct_bob

    direct_vm.sender = creator
    deposit_val = 6_000_000_000_000_000_000  # 6 GEN
    direct_vm.value = deposit_val
    contract = direct_deploy(str(CONTRACT_PATH))
    import sys
    Address = sys.modules["genlayer"].Address

    spec = "Master Style Spec: Minimalist Bauhaus Layout, geometric grid"
    contract.register_license(Address(licensee), spec, 500)

    contract.file_infringement_claim("ip-1", "https://derivative-shop.com/poster")

    # Mock 60% similarity -> PARTIAL_INFRINGEMENT
    direct_vm.mock_web(".*", {
        "status": 200,
        "body": "Derivative Poster Store: Bauhaus inspired poster with alternative colorway and modified spacing."
    })
    direct_vm.mock_llm(".*", json.dumps({
        "verdict": "PARTIAL_INFRINGEMENT",
        "confidence": 85,
        "similarity_score": 62,
        "reason": "Moderate style overlap: Shares Bauhaus layout geometry but incorporates novel typographical elements."
    }))

    direct_vm.sender = creator
    contract.adjudicate_infringement("ip-1")

    vault = json.loads(contract.get_vault("ip-1"))
    assert vault["status"] == 5  # PARTIAL_SLASHED
    assert vault["verdict"] == "PARTIAL_INFRINGEMENT"
    assert 50 <= vault["similarity_score"] < 75

    stats = json.loads(contract.get_stats())
    assert stats["total_disputes_resolved"] == 1
    assert int(stats["total_deposit_locked"]) == 0


def test_adjudicate_clean_compensates_licensee(direct_deploy, direct_vm, direct_alice, direct_bob):
    """Test AI Jury adjudicates CLEAN_AUTHORIZED: creator bond compensated to licensee."""
    creator = direct_alice
    licensee = direct_bob

    direct_vm.sender = creator
    deposit_val = 3_000_000_000_000_000_000
    direct_vm.value = deposit_val
    contract = direct_deploy(str(CONTRACT_PATH))
    import sys
    Address = sys.modules["genlayer"].Address

    contract.register_license(Address(licensee), "Protected DNA Spec", 500)

    # Creator stakes a dispute bond of 0.2 GEN
    bond = 200_000_000_000_000_000
    direct_vm.value = bond
    contract.file_infringement_claim("ip-1", "https://clean-site.org/photo")

    # Configure GenVM mocks for clean non-infringing web content
    direct_vm.mock_web(".*", {
        "status": 200,
        "body": "Organic Nature Photography: High resolution landscape image with natural sunlight and wilderness palette."
    })
    direct_vm.mock_llm(".*", json.dumps({
        "verdict": "CLEAN_AUTHORIZED",
        "confidence": 90,
        "similarity_score": 15,
        "reason": "Independent creation: Standard atmospheric prompt without proprietary canary tokens."
    }))

    direct_vm.sender = creator
    contract.adjudicate_infringement("ip-1")

    vault = json.loads(contract.get_vault("ip-1"))
    assert vault["status"] == 0  # Reset to ACTIVE_LICENSED
    assert vault["verdict"] == "CLEAN_AUTHORIZED"
    assert int(vault["creator_bond"]) == 0


def test_reclaim_deposit_expired(direct_deploy, direct_vm, direct_alice, direct_bob):
    """Test Licensee can reclaim deposit after license expiration with 0 infringements."""
    creator = direct_alice
    licensee = direct_bob

    direct_vm.sender = licensee
    direct_vm.value = 4_000_000_000_000_000_000
    contract = direct_deploy(str(CONTRACT_PATH))
    import sys
    Address = sys.modules["genlayer"].Address

    # Set duration to 1 block
    contract.register_license(Address(licensee), "Short Term License", 1)

    # Non-licensee cannot reclaim
    direct_vm.sender = creator
    with pytest.raises(Exception, match="Only the licensee can reclaim"):
        contract.reclaim_deposit("ip-1")

    # Licensee reclaims after expiry
    direct_vm.sender = licensee
    contract.reclaim_deposit("ip-1")

    vault = json.loads(contract.get_vault("ip-1"))
    assert vault["status"] == 3  # EXPIRED_REFUNDED
    assert vault["verdict"] == "CLEAN_EXPIRED"

