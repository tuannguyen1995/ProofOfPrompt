import pytest
import json
import sys
from pathlib import Path

CONTRACT_PATH = Path(__file__).resolve().parent.parent / "contracts" / "contract.py"


def test_propose_and_accept_license_flow(direct_deploy, direct_vm, direct_alice, direct_bob, direct_charlie):
    """Test two-sided escrow: Creator proposes terms, stranger is rejected, licensee funds collateral."""
    creator = direct_alice
    licensee = direct_bob
    stranger = direct_charlie

    direct_vm.sender = creator
    direct_vm.value = 0  # Creator does not fund licensee collateral

    contract = direct_deploy(str(CONTRACT_PATH))
    import sys
    Address = sys.modules["genlayer"].Address

    spec = "Prompt DNA: Hyper-realistic cinematic cyberpunk portrait, 8k, canary: [POP-CANARY-7789]"
    req_deposit = 5_000_000_000_000_000_000  # 5 GEN

    # 1. Creator proposes license
    vault_id = contract.propose_license(Address(licensee), spec, req_deposit, 86400 * 30)
    assert vault_id == "ip-1"

    # Verify vault is in OFFERED status with 0 locked deposit
    vault_offered = json.loads(contract.get_vault("ip-1"))
    assert vault_offered["status"] == 0  # STATUS_OFFERED
    assert vault_offered["verdict"] == "AWAITING_LICENSEE_FUNDING"
    assert int(vault_offered["required_deposit"]) == req_deposit
    assert int(vault_offered["escrow_deposit"]) == 0

    stats = json.loads(contract.get_stats())
    assert int(stats["total_deposit_locked"]) == 0

    # 2. Stranger cannot accept & fund
    direct_vm.sender = stranger
    direct_vm.value = req_deposit
    with pytest.raises(Exception, match="Only the designated licensee"):
        contract.accept_and_fund_license("ip-1")

    # 3. Insufficient funding is rejected
    direct_vm.sender = licensee
    direct_vm.value = 1_000_000_000_000_000_000  # 1 GEN < 5 GEN
    with pytest.raises(Exception, match="Insufficient deposit"):
        contract.accept_and_fund_license("ip-1")

    # 4. Licensee funds full required collateral
    direct_vm.value = req_deposit
    contract.accept_and_fund_license("ip-1")

    # Verify vault is now ACTIVE_LICENSED with deposit locked
    vault_active = json.loads(contract.get_vault("ip-1"))
    assert vault_active["status"] == 1  # STATUS_ACTIVE
    assert vault_active["verdict"] == "PENDING"
    assert int(vault_active["escrow_deposit"]) == req_deposit
    assert int(vault_active["activated_at"]) > 0
    assert int(vault_active["expires_at"]) > int(vault_active["activated_at"])

    stats_active = json.loads(contract.get_stats())
    assert int(stats_active["total_deposit_locked"]) == req_deposit


def test_mandatory_claim_bond_enforcement(direct_deploy, direct_vm, direct_alice, direct_bob):
    """Test that filing an infringement claim strictly enforces the mandatory anti-harassment dispute bond."""
    creator = direct_alice
    licensee = direct_bob

    direct_vm.sender = creator
    contract = direct_deploy(str(CONTRACT_PATH))
    import sys
    Address = sys.modules["genlayer"].Address

    deposit_amount = 4_000_000_000_000_000_000  # 4 GEN
    contract.propose_license(Address(licensee), "Style Spec", deposit_amount, 86400 * 7)

    direct_vm.sender = licensee
    direct_vm.value = deposit_amount
    contract.accept_and_fund_license("ip-1")

    # Required bond is at least 10% of 4 GEN = 0.4 GEN (400_000_000_000_000_000 wei)
    direct_vm.sender = creator
    direct_vm.value = 50_000_000_000_000_000  # Only 0.05 GEN (< 0.4 GEN)
    with pytest.raises(Exception, match="Anti-harassment dispute bond"):
        contract.file_infringement_claim("ip-1", "https://pirated.site/image")

    # Valid claim with 0.5 GEN bond (>= 0.4 GEN)
    direct_vm.value = 500_000_000_000_000_000
    contract.file_infringement_claim("ip-1", "https://pirated.site/image")

    vault = json.loads(contract.get_vault("ip-1"))
    assert vault["status"] == 2  # STATUS_DISPUTE_FILED
    assert int(vault["creator_bond"]) == 500_000_000_000_000_000
    assert int(vault["defense_deadline"]) > 0


def test_enforced_defense_window_blocks_immediate_trial(direct_deploy, direct_vm, direct_alice, direct_bob):
    """Test that adjudication CANNOT start immediately during active defense window before licensee responds."""
    creator = direct_alice
    licensee = direct_bob

    direct_vm.sender = creator
    contract = direct_deploy(str(CONTRACT_PATH))
    import sys
    Address = sys.modules["genlayer"].Address

    contract.propose_license(Address(licensee), "Protected DNA", 2_000_000_000_000_000_000, 86400 * 14)

    direct_vm.sender = licensee
    direct_vm.value = 2_000_000_000_000_000_000
    contract.accept_and_fund_license("ip-1")

    # Creator files claim with 0.3 GEN bond
    direct_vm.sender = creator
    direct_vm.value = 300_000_000_000_000_000
    contract.file_infringement_claim("ip-1", "https://disputed-shop.com/art")

    # Adjudication must fail because defense window is open and licensee has not responded yet
    with pytest.raises(Exception, match="defense window is active"):
        contract.adjudicate_infringement("ip-1")


def test_licensee_submits_defense_opens_adjudication(direct_deploy, direct_vm, direct_alice, direct_bob, direct_charlie):
    """Test that submitting defense exercises rebuttal right and opens trial for jury adjudication."""
    creator = direct_alice
    licensee = direct_bob
    stranger = direct_charlie

    direct_vm.sender = creator
    contract = direct_deploy(str(CONTRACT_PATH))
    import sys
    Address = sys.modules["genlayer"].Address

    contract.propose_license(Address(licensee), "Protected DNA", 1_000_000_000_000_000_000, 86400 * 7)

    direct_vm.sender = licensee
    direct_vm.value = 1_000_000_000_000_000_000
    contract.accept_and_fund_license("ip-1")

    direct_vm.sender = creator
    direct_vm.value = 200_000_000_000_000_000
    contract.file_infringement_claim("ip-1", "https://evidence.io/store")

    # Stranger cannot submit defense
    direct_vm.sender = stranger
    with pytest.raises(Exception, match="Only the authorized licensee"):
        contract.submit_licensee_defense("ip-1", "https://defense.org", "statement")

    # Licensee submits valid defense
    direct_vm.sender = licensee
    contract.submit_licensee_defense("ip-1", "https://defense.org/proof", "Licensed for exhibition per section 2.")

    vault = json.loads(contract.get_vault("ip-1"))
    assert vault["status"] == 3  # STATUS_DEFENSE_SUBMITTED
    assert vault["defense_url"] == "https://defense.org/proof"
    assert "exhibition" in vault["defense_statement"]


def test_concede_claim_settles_amicably(direct_deploy, direct_vm, direct_alice, direct_bob):
    """Test Licensee amicably concedes dispute without court trial."""
    creator = direct_alice
    licensee = direct_bob

    direct_vm.sender = creator
    contract = direct_deploy(str(CONTRACT_PATH))
    import sys
    Address = sys.modules["genlayer"].Address

    deposit = 2_000_000_000_000_000_000
    contract.propose_license(Address(licensee), "Style Spec", deposit, 86400 * 7)

    direct_vm.sender = licensee
    direct_vm.value = deposit
    contract.accept_and_fund_license("ip-1")

    direct_vm.sender = creator
    bond = 300_000_000_000_000_000
    direct_vm.value = bond
    contract.file_infringement_claim("ip-1", "https://unauthorized.com")

    # Licensee concedes
    direct_vm.sender = licensee
    contract.concede_claim("ip-1")

    vault = json.loads(contract.get_vault("ip-1"))
    assert vault["status"] == 4  # STATUS_MUTUAL_CONCEDED
    assert vault["verdict"] == "MUTUAL_CONCEDED"
    assert int(vault["creator_bond"]) == 0

    stats = json.loads(contract.get_stats())
    assert stats["total_disputes_resolved"] == 1
    assert int(stats["total_deposit_locked"]) == 0


def test_propose_mutual_split_compromise(direct_deploy, direct_vm, direct_alice, direct_bob):
    """Test mutual 50/50 compromise: Creator proposes, Licensee accepts, dispute settles amicably."""
    creator = direct_alice
    licensee = direct_bob

    direct_vm.sender = creator
    contract = direct_deploy(str(CONTRACT_PATH))
    import sys
    Address = sys.modules["genlayer"].Address

    deposit = 4_000_000_000_000_000_000
    contract.propose_license(Address(licensee), "Style Spec", deposit, 86400 * 7)

    direct_vm.sender = licensee
    direct_vm.value = deposit
    contract.accept_and_fund_license("ip-1")

    direct_vm.sender = creator
    direct_vm.value = 400_000_000_000_000_000
    contract.file_infringement_claim("ip-1", "https://derivative.com")

    # Creator proposes mutual 50/50 split
    contract.propose_mutual_split("ip-1")
    v1 = json.loads(contract.get_vault("ip-1"))
    assert "Awaiting Licensee confirmation" in v1["reason"]

    # Licensee accepts mutual 50/50 split
    direct_vm.sender = licensee
    contract.propose_mutual_split("ip-1")

    v2 = json.loads(contract.get_vault("ip-1"))
    assert v2["status"] == 4  # STATUS_MUTUAL_CONCEDED
    assert v2["verdict"] == "MUTUAL_SPLIT_AGREED"
    assert int(v2["creator_bond"]) == 0

    stats = json.loads(contract.get_stats())
    assert stats["total_disputes_resolved"] == 1
    assert int(stats["total_deposit_locked"]) == 0


def test_adjudicate_full_infringement_slashes_100_percent(direct_deploy, direct_vm, direct_alice, direct_bob):
    """Test AI Jury rules FULL_INFRINGEMENT: 100% deposit slashed to creator."""
    creator = direct_alice
    licensee = direct_bob

    direct_vm.sender = creator
    contract = direct_deploy(str(CONTRACT_PATH))
    import sys
    Address = sys.modules["genlayer"].Address

    spec = "Master Prompt DNA: Cyberpunk Noir with canary token [POP-CANARY-7789]"
    deposit = 10_000_000_000_000_000_000  # 10 GEN
    contract.propose_license(Address(licensee), spec, deposit, 86400 * 30)

    direct_vm.sender = licensee
    direct_vm.value = deposit
    contract.accept_and_fund_license("ip-1")

    direct_vm.sender = creator
    bond = 1_000_000_000_000_000_000  # 1 GEN bond
    direct_vm.value = bond
    contract.file_infringement_claim("ip-1", "https://pirated-media.io/gallery")

    # Licensee submits defense
    direct_vm.sender = licensee
    contract.submit_licensee_defense("ip-1", "https://licensee.com/defense", "We believe this is fair use.")

    # Mocks
    direct_vm.mock_web(".*", {
        "status": 200,
        "body": "Pirated Launch: Cyberpunk Neon Noir with exact canary token [POP-CANARY-7789]."
    })
    direct_vm.mock_llm(".*", json.dumps({
        "verdict": "FULL_INFRINGEMENT",
        "confidence": 95,
        "similarity_score": 92,
        "reason": "Direct prompt theft: Exact canary style tokens detected in commercial launch."
    }))

    contract.adjudicate_infringement("ip-1")

    vault = json.loads(contract.get_vault("ip-1"))
    assert vault["status"] == 5  # STATUS_FULL_SLASHED
    assert vault["verdict"] == "FULL_INFRINGEMENT"
    assert vault["similarity_score"] >= 75
    assert int(vault["creator_bond"]) == 0

    stats = json.loads(contract.get_stats())
    assert stats["total_disputes_resolved"] == 1
    assert int(stats["total_deposit_locked"]) == 0


def test_adjudicate_partial_infringement_fair_50_50_split(direct_deploy, direct_vm, direct_alice, direct_bob):
    """Test AI Jury rules PARTIAL_INFRINGEMENT: Fair 50/50 split of collateral."""
    creator = direct_alice
    licensee = direct_bob

    direct_vm.sender = creator
    contract = direct_deploy(str(CONTRACT_PATH))
    import sys
    Address = sys.modules["genlayer"].Address

    spec = "Master Style Spec: Minimalist Bauhaus Layout"
    deposit = 6_000_000_000_000_000_000  # 6 GEN
    contract.propose_license(Address(licensee), spec, deposit, 86400 * 30)

    direct_vm.sender = licensee
    direct_vm.value = deposit
    contract.accept_and_fund_license("ip-1")

    direct_vm.sender = creator
    direct_vm.value = 600_000_000_000_000_000  # 0.6 GEN bond
    contract.file_infringement_claim("ip-1", "https://derivative-shop.com/poster")

    direct_vm.sender = licensee
    contract.submit_licensee_defense("ip-1", "https://derivative-shop.com/proof", "Derivative interpretation with original elements.")

    direct_vm.mock_web(".*", {
        "status": 200,
        "body": "Derivative Poster Store: Bauhaus inspired poster with alternative colorway."
    })
    direct_vm.mock_llm(".*", json.dumps({
        "verdict": "PARTIAL_INFRINGEMENT",
        "confidence": 88,
        "similarity_score": 62,
        "reason": "Moderate style overlap: Shares Bauhaus layout geometry but incorporates novel typographical elements."
    }))

    contract.adjudicate_infringement("ip-1")

    vault = json.loads(contract.get_vault("ip-1"))
    assert vault["status"] == 6  # STATUS_PARTIAL_SLASHED
    assert vault["verdict"] == "PARTIAL_INFRINGEMENT"
    assert 50 <= vault["similarity_score"] < 75
    assert int(vault["creator_bond"]) == 0

    stats = json.loads(contract.get_stats())
    assert stats["total_disputes_resolved"] == 1
    assert int(stats["total_deposit_locked"]) == 0


def test_adjudicate_clean_awards_creator_bond_to_licensee(direct_deploy, direct_vm, direct_alice, direct_bob):
    """Test AI Jury rules CLEAN_AUTHORIZED: Frivolous claim dismissed, creator bond awarded to licensee."""
    creator = direct_alice
    licensee = direct_bob

    direct_vm.sender = creator
    contract = direct_deploy(str(CONTRACT_PATH))
    import sys
    Address = sys.modules["genlayer"].Address

    deposit = 3_000_000_000_000_000_000
    contract.propose_license(Address(licensee), "Protected DNA Spec", deposit, 86400 * 30)

    direct_vm.sender = licensee
    direct_vm.value = deposit
    contract.accept_and_fund_license("ip-1")

    # Creator stakes dispute bond of 0.3 GEN
    direct_vm.sender = creator
    bond = 300_000_000_000_000_000
    direct_vm.value = bond
    contract.file_infringement_claim("ip-1", "https://clean-site.org/photo")

    direct_vm.sender = licensee
    contract.submit_licensee_defense("ip-1", "https://clean-site.org/cert", "Independent nature photography.")

    direct_vm.mock_web(".*", {
        "status": 200,
        "body": "Organic Nature Photography: High resolution landscape image with wilderness palette."
    })
    direct_vm.mock_llm(".*", json.dumps({
        "verdict": "CLEAN_AUTHORIZED",
        "confidence": 95,
        "similarity_score": 10,
        "reason": "Independent creation: No protected style DNA or canary tokens detected."
    }))

    contract.adjudicate_infringement("ip-1")

    vault = json.loads(contract.get_vault("ip-1"))
    assert vault["status"] == 1  # Restored to STATUS_ACTIVE (license continues!)
    assert vault["verdict"] == "CLEAN_AUTHORIZED"
    assert int(vault["creator_bond"]) == 0  # Bond was slashed and paid to licensee!
    assert int(vault["escrow_deposit"]) == deposit  # Deposit remains locked safely in vault

    stats = json.loads(contract.get_stats())
    assert int(stats["total_deposit_locked"]) == deposit


def test_reclaim_deposit_expired_chain_time(direct_deploy, direct_vm, direct_alice, direct_bob):
    """Test Licensee can reclaim deposit after license expiration based on chain time."""
    creator = direct_alice
    licensee = direct_bob

    direct_vm.sender = creator
    contract = direct_deploy(str(CONTRACT_PATH))
    import sys
    Address = sys.modules["genlayer"].Address

    deposit = 4_000_000_000_000_000_000
    # Set duration to 10 seconds
    contract.propose_license(Address(licensee), "Short License", deposit, 10)

    direct_vm.sender = licensee
    direct_vm.value = deposit
    contract.accept_and_fund_license("ip-1")

    # Non-licensee cannot reclaim
    direct_vm.sender = creator
    with pytest.raises(Exception, match="Only the licensee can reclaim"):
        contract.reclaim_deposit("ip-1")

    # Licensee cannot reclaim before duration expires
    direct_vm.sender = licensee
    # Fast forward chain time using direct_vm.warp
    import datetime
    now_dt = datetime.datetime.fromisoformat(direct_vm._datetime.replace("Z", "+00:00"))
    future_dt = now_dt + datetime.timedelta(seconds=20)
    direct_vm.warp(future_dt.isoformat().replace("+00:00", "Z"))

    contract.reclaim_deposit("ip-1")

    vault = json.loads(contract.get_vault("ip-1"))
    assert vault["status"] == 8  # STATUS_EXPIRED_REFUNDED
    assert vault["verdict"] == "CLEAN_EXPIRED"
    assert int(vault["escrow_deposit"]) == deposit

    stats = json.loads(contract.get_stats())
    assert int(stats["total_deposit_locked"]) == 0


def test_adjudicate_after_defense_window_expires_without_defense(direct_deploy, direct_vm, direct_alice, direct_bob):
    """Test that if licensee does NOT submit defense, trial opens once defense window expires."""
    creator = direct_alice
    licensee = direct_bob

    direct_vm.sender = creator
    contract = direct_deploy(str(CONTRACT_PATH))
    import sys
    Address = sys.modules["genlayer"].Address

    deposit = 3_000_000_000_000_000_000
    contract.propose_license(Address(licensee), "Protected DNA", deposit, 86400 * 30)

    direct_vm.sender = licensee
    direct_vm.value = deposit
    contract.accept_and_fund_license("ip-1")

    # Creator files claim with 0.5 GEN bond
    direct_vm.sender = creator
    direct_vm.value = 500_000_000_000_000_000
    contract.file_infringement_claim("ip-1", "https://evidence.io/commercial")

    # While defense window is active (within 24h), adjudication is blocked
    with pytest.raises(Exception, match="defense window is active"):
        contract.adjudicate_infringement("ip-1")

    # Warp past the 24-hour defense window (e.g. +25 hours = 90,000s)
    import datetime
    now_dt = datetime.datetime.fromisoformat(direct_vm._datetime.replace("Z", "+00:00"))
    future_dt = now_dt + datetime.timedelta(seconds=90000)
    direct_vm.warp(future_dt.isoformat().replace("+00:00", "Z"))

    # Configure mocks
    direct_vm.mock_web(".*", {
        "status": 200,
        "body": "Commercial site with uncredited prompt reproduction."
    })
    direct_vm.mock_llm(".*", json.dumps({
        "verdict": "FULL_INFRINGEMENT",
        "confidence": 92,
        "similarity_score": 85,
        "reason": "Default judgment: Infringement confirmed with zero licensee rebuttal submitted."
    }))

    # Adjudication can now proceed
    contract.adjudicate_infringement("ip-1")
    vault = json.loads(contract.get_vault("ip-1"))
    assert vault["status"] == 5  # STATUS_FULL_SLASHED
    assert vault["verdict"] == "FULL_INFRINGEMENT"


def test_reclaim_stalled_audit_refunds_both_deposit_and_bond(direct_deploy, direct_vm, direct_alice, direct_bob):
    """Test that if an audit stalls past 3 days timeout, licensee can reclaim deposit and creator bond is refunded."""
    creator = direct_alice
    licensee = direct_bob

    direct_vm.sender = creator
    contract = direct_deploy(str(CONTRACT_PATH))
    import sys
    Address = sys.modules["genlayer"].Address

    deposit = 5_000_000_000_000_000_000
    contract.propose_license(Address(licensee), "DNA", deposit, 86400 * 30)

    direct_vm.sender = licensee
    direct_vm.value = deposit
    contract.accept_and_fund_license("ip-1")

    direct_vm.sender = creator
    direct_vm.value = 600_000_000_000_000_000  # 0.6 GEN bond
    contract.file_infringement_claim("ip-1", "https://evidence.io")

    # Licensee cannot reclaim while audit is fresh
    direct_vm.sender = licensee
    with pytest.raises(Exception, match="undergoing active jury audit"):
        contract.reclaim_deposit("ip-1")

    # Warp past stall timeout (defense window 1 day + stall timeout 3 days = 4 days + 1 hour)
    import datetime
    now_dt = datetime.datetime.fromisoformat(direct_vm._datetime.replace("Z", "+00:00"))
    future_dt = now_dt + datetime.timedelta(days=4, hours=2)
    direct_vm.warp(future_dt.isoformat().replace("+00:00", "Z"))

    # Now licensee can safely reclaim
    contract.reclaim_deposit("ip-1")

    vault = json.loads(contract.get_vault("ip-1"))
    assert vault["status"] == 8  # STATUS_EXPIRED_REFUNDED
    assert int(vault["creator_bond"]) == 0

