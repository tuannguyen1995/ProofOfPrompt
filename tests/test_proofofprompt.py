import pytest
import json
import os
from conftest import clear_known_contracts


def load_contract_source():
    contract_path = os.path.join(os.path.dirname(__file__), "..", "contracts", "contract.py")
    with open(contract_path, "r", encoding="utf-8") as f:
        return f.read()


def test_register_license_and_views(gltest_client):
    """Test successful license registration, storage updates, and view getters."""
    clear_known_contracts()
    from genlayer import Address

    creator = gltest_client.accounts[0]
    licensee = gltest_client.accounts[1]

    source = load_contract_source()
    contract = gltest_client.deploy(source=source)

    spec = "Prompt DNA: Hyper-realistic cinematic cyberpunk portrait, 8k, volumetric lighting, canary token: [POP-CANARY-7789]"
    deposit_amount = 5_000_000_000_000_000_000  # 5 GEN

    # Register license with 5 GEN deposit
    contract.connect(creator).register_license(
        args=[Address(licensee.address), spec, 1000]
    ).transact(value=deposit_amount)

    # Validate stats
    stats_raw = contract.get_stats().call()
    stats = json.loads(stats_raw)
    assert stats["total_vaults"] == 1
    assert int(stats["total_deposit_locked"]) == deposit_amount
    assert stats["total_disputes_resolved"] == 0

    # Validate vault details
    vault_raw = contract.get_vault(args=["ip-1"]).call()
    vault = json.loads(vault_raw)
    assert vault["vault_id"] == "ip-1"
    assert vault["status"] == 0  # ACTIVE_LICENSED
    assert vault["verdict"] == "PENDING"
    assert vault["ip_style_spec"] == spec
    assert int(vault["escrow_deposit"]) == deposit_amount

    # Test pagination
    paginated_raw = contract.get_vaults_paginated(args=[0, 10]).call()
    paginated = json.loads(paginated_raw)
    assert len(paginated) == 1
    assert paginated[0]["vault_id"] == "ip-1"


def test_file_infringement_claim_with_dispute_bond(gltest_client):
    """Test filing a copyright infringement claim with anti-harassment dispute bond."""
    clear_known_contracts()
    from genlayer import Address

    creator = gltest_client.accounts[0]
    licensee = gltest_client.accounts[1]
    attacker = gltest_client.accounts[2]

    source = load_contract_source()
    contract = gltest_client.deploy(source=source)

    spec = "Style DNA: Bauhaus typography, minimalist editorial geometry, canary: [POP-BAUHAUS-4421]"
    contract.connect(creator).register_license(
        args=[Address(licensee.address), spec, 500]
    ).transact(value=2_000_000_000_000_000_000)

    # Non-creator cannot file claim
    with pytest.raises(Exception):
        contract.connect(attacker).file_infringement_claim(
            args=["ip-1", "https://unauthorized-store.com/art"]
        ).transact()

    # Creator files valid claim with anti-harassment dispute bond
    evidence_url = "https://unauthorized-store.com/art-output"
    bond_amount = 100_000_000_000_000_000  # 0.1 GEN
    contract.connect(creator).file_infringement_claim(
        args=["ip-1", evidence_url]
    ).transact(value=bond_amount)

    vault = json.loads(contract.get_vault(args=["ip-1"]).call())
    assert vault["status"] == 1  # IN_AUDIT
    assert vault["infringement_url"] == evidence_url
    assert int(vault["creator_bond"]) == bond_amount


def test_licensee_submits_defense(gltest_client):
    """Test Licensee exercises their right of defense before trial."""
    clear_known_contracts()
    from genlayer import Address

    creator = gltest_client.accounts[0]
    licensee = gltest_client.accounts[1]
    stranger = gltest_client.accounts[2]

    source = load_contract_source()
    contract = gltest_client.deploy(source=source)

    contract.connect(creator).register_license(
        args=[Address(licensee.address), "Style DNA", 500]
    ).transact(value=1_000_000_000_000_000_000)

    contract.connect(creator).file_infringement_claim(
        args=["ip-1", "https://disputed-shop.com/item"]
    ).transact()

    # Stranger cannot submit defense
    with pytest.raises(Exception):
        contract.connect(stranger).submit_licensee_defense(
            args=["ip-1", "https://my-defense.com", "rebuttal statement"]
        ).transact()

    # Licensee submits valid defense
    contract.connect(licensee).submit_licensee_defense(
        args=["ip-1", "https://authorized-scope.com/proof", "Licensed for banner campaign per section 3b."]
    ).transact()

    vault = json.loads(contract.get_vault(args=["ip-1"]).call())
    assert vault["defense_url"] == "https://authorized-scope.com/proof"
    assert "banner campaign" in vault["defense_statement"]


def test_adjudicate_full_infringement_slashes(gltest_client, mock_infringement_llm_and_web):
    """Test AI Jury adjudicates FULL_INFRINGEMENT: deposit slashed to creator."""
    clear_known_contracts()
    from genlayer import Address

    creator = gltest_client.accounts[0]
    licensee = gltest_client.accounts[1]

    source = load_contract_source()
    contract = gltest_client.deploy(source=source)

    deposit_val = 10_000_000_000_000_000_000  # 10 GEN
    spec = "Master System Prompt: Cyberpunk Noir with canary token [POP-CANARY-7789]"

    contract.connect(creator).register_license(
        args=[Address(licensee.address), spec, 500]
    ).transact(value=deposit_val)

    contract.connect(creator).file_infringement_claim(
        args=["ip-1", "https://pirated-commercial-media.io/gallery"]
    ).transact()

    # Install bare-dict mocks for nondet simulation
    gltest_client.provider.make_request(
        method="sim_installMocks",
        params=mock_infringement_llm_and_web
    )

    # Run AI Jury Adjudication
    contract.connect(creator).adjudicate_infringement(args=["ip-1"]).transact()

    vault = json.loads(contract.get_vault(args=["ip-1"]).call())
    assert vault["status"] == 2  # FULL_SLASHED
    assert vault["verdict"] == "FULL_INFRINGEMENT"
    assert vault["similarity_score"] >= 75

    # Check stats updated
    stats = json.loads(contract.get_stats().call())
    assert stats["total_disputes_resolved"] == 1
    assert int(stats["total_deposit_locked"]) == 0


def test_adjudicate_clean_compensates_licensee(gltest_client, mock_clean_llm_and_web):
    """Test AI Jury adjudicates CLEAN_AUTHORIZED: creator bond compensated to licensee."""
    clear_known_contracts()
    from genlayer import Address

    creator = gltest_client.accounts[0]
    licensee = gltest_client.accounts[1]

    source = load_contract_source()
    contract = gltest_client.deploy(source=source)

    contract.connect(creator).register_license(
        args=[Address(licensee.address), "Protected DNA Spec", 500]
    ).transact(value=3_000_000_000_000_000_000)

    # Creator stakes a dispute bond of 0.2 GEN
    bond = 200_000_000_000_000_000
    contract.connect(creator).file_infringement_claim(
        args=["ip-1", "https://clean-site.org/photo"]
    ).transact(value=bond)

    # Install bare-dict mocks for clean verdict
    gltest_client.provider.make_request(
        method="sim_installMocks",
        params=mock_clean_llm_and_web
    )

    contract.connect(creator).adjudicate_infringement(args=["ip-1"]).transact()

    vault = json.loads(contract.get_vault(args=["ip-1"]).call())
    assert vault["status"] == 0  # Reset to ACTIVE_LICENSED
    assert vault["verdict"] == "CLEAN_AUTHORIZED"
    assert int(vault["creator_bond"]) == 0


def test_reclaim_deposit_expired(gltest_client):
    """Test Licensee can reclaim deposit after license expiration with 0 infringements."""
    clear_known_contracts()
    from genlayer import Address

    creator = gltest_client.accounts[0]
    licensee = gltest_client.accounts[1]

    source = load_contract_source()
    contract = gltest_client.deploy(source=source)

    # Set very short duration: 1 block
    contract.connect(licensee).register_license(
        args=[Address(licensee.address), "Short Term License", 1]
    ).transact(value=4_000_000_000_000_000_000)

    # Non-licensee cannot reclaim
    with pytest.raises(Exception):
        contract.connect(creator).reclaim_deposit(args=["ip-1"]).transact()

    # Licensee reclaims
    contract.connect(licensee).reclaim_deposit(args=["ip-1"]).transact()

    vault = json.loads(contract.get_vault(args=["ip-1"]).call())
    assert vault["status"] == 3  # EXPIRED_REFUNDED
    assert vault["verdict"] == "CLEAN_EXPIRED"
