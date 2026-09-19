# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
from dataclasses import dataclass
import json


def _addr_str(addr: Address) -> str:
    """Safely format an Address instance into a hex string."""
    try:
        return addr.as_hex
    except Exception:
        return str(addr)


@allow_storage
@dataclass
class LicenseVault:
    """Storage struct representing an AI IP style license with two-sided dispute escrow."""
    vault_id: str
    creator: Address
    licensee: Address
    escrow_deposit: bigint         # Infringement guarantee stake locked by licensee
    creator_bond: bigint           # Anti-harassment dispute stake locked by creator
    ip_style_spec: str             # Prompt DNA, unique style elements, and canary markers
    infringement_url: str          # Live URL of disputed unauthorized output
    defense_url: str               # Counter-evidence submitted by licensee
    defense_statement: str         # Licensee rebuttal / fair-use explanation
    status: u8                     # 0: ACTIVE, 1: IN_AUDIT, 2: FULL_SLASHED, 3: EXPIRED_REFUNDED, 4: MUTUAL_CONCEDED, 5: PARTIAL_SLASHED
    verdict: str                   # "PENDING", "FULL_INFRINGEMENT", "PARTIAL_INFRINGEMENT", "CLEAN_AUTHORIZED", "MUTUAL_CONCEDED"
    reason: str                    # Detailed qualitative jury rationale
    confidence: u8                 # 0 - 100: Validator consensus confidence
    similarity_score: u8           # 0 - 100: Style DNA overlap and infringement strength
    created_at_block: u256
    expires_at_block: u256         # Block counter when licensee can reclaim deposit
    audit_started_block: u256      # Block when dispute was filed


class Contract(gl.Contract):
    """
    ProofOfPrompt: Autonomous AI IP Licensing & Copyright Infringement Court
    Target Network: studionet (Chain ID: 61999)
    Two-Sided Justice Edition: Anti-Harassment Bonds & Licensee Rebuttal Rights
    """
    vaults: TreeMap[str, LicenseVault]
    vault_ids: DynArray[str]
    total_deposit_locked: bigint
    total_disputes_resolved: u32
    vault_counter: u64

    def __init__(self):
        # GenVM auto-initializes TreeMap and DynArray. Do NOT reassign in __init__.
        self.total_deposit_locked = bigint(0)
        self.total_disputes_resolved = u32(0)
        self.vault_counter = u64(0)

    @gl.public.write.payable
    def register_license(self, licensee_addr: Address, ip_style_spec: str, duration_blocks: int) -> str:
        """
        Licensing Vault is initialized by locking an infringement guarantee deposit in GEN.
        """
        deposit = bigint(gl.message.value)
        if deposit <= bigint(0):
            raise gl.vm.UserError("Guarantee escrow deposit must be greater than 0 GEN.")

        if not ip_style_spec or len(ip_style_spec.strip()) == 0:
            raise gl.vm.UserError("IP Style DNA and prompt specification cannot be empty.")

        duration = u256(duration_blocks if duration_blocks > 0 else 5000)

        self.vault_counter = self.vault_counter + u64(1)
        vault_id = f"ip-{int(self.vault_counter)}"
        current_block = u256(int(self.vault_counter))
        expires_at = current_block + duration

        new_vault = LicenseVault(
            vault_id=vault_id,
            creator=gl.message.sender_address,
            licensee=licensee_addr,
            escrow_deposit=deposit,
            creator_bond=bigint(0),
            ip_style_spec=ip_style_spec.strip(),
            infringement_url="",
            defense_url="",
            defense_statement="",
            status=u8(0),  # ACTIVE_LICENSED
            verdict="PENDING",
            reason="License active. Awaiting infringement claim or term expiration.",
            confidence=u8(0),
            similarity_score=u8(0),
            created_at_block=current_block,
            expires_at_block=expires_at,
            audit_started_block=u256(0),
        )

        self.vaults[vault_id] = new_vault
        self.vault_ids.append(vault_id)
        self.total_deposit_locked = self.total_deposit_locked + deposit

        return vault_id

    @gl.public.write.payable
    def file_infringement_claim(self, vault_id: str, evidence_url: str) -> None:
        """
        Creator files an infringement claim with public proof URL of unauthorized deployment.
        Optional creator dispute bond attached to discourage frivolous claims.
        """
        if vault_id not in self.vaults:
            raise gl.vm.UserError(f"Vault {vault_id} does not exist.")

        v = self.vaults[vault_id]
        if gl.message.sender_address != v.creator:
            raise gl.vm.UserError("Only the IP creator can file an infringement dispute.")

        if v.status != u8(0):
            raise gl.vm.UserError(f"Vault {vault_id} is not in active licensed status.")

        clean_url = evidence_url.strip()
        if not clean_url.startswith("http://") and not clean_url.startswith("https://"):
            raise gl.vm.UserError("Valid public evidence URL (http/https) is required.")

        bond = bigint(gl.message.value)
        self.vault_counter = self.vault_counter + u64(1)

        v.creator_bond = bond
        v.infringement_url = clean_url
        v.status = u8(1)  # IN_AUDIT
        v.audit_started_block = u256(int(self.vault_counter))
        v.reason = "Infringement claim filed. Awaiting licensee defense or AI jury adjudication."

    @gl.public.write
    def submit_licensee_defense(self, vault_id: str, defense_url: str, defense_statement: str) -> None:
        """
        Two-Sided Justice: Licensee exercises their right of defense to provide counter-evidence
        (e.g., license authorization tokens, proof of independent creation, or fair-use context).
        """
        if vault_id not in self.vaults:
            raise gl.vm.UserError(f"Vault {vault_id} does not exist.")

        v = self.vaults[vault_id]
        if gl.message.sender_address != v.licensee:
            raise gl.vm.UserError("Only the authorized licensee can submit a defense.")

        if v.status != u8(1):
            raise gl.vm.UserError(f"Vault {vault_id} is not undergoing active infringement audit.")

        clean_url = defense_url.strip()
        if clean_url and not clean_url.startswith("http://") and not clean_url.startswith("https://"):
            raise gl.vm.UserError("Defense URL must be a valid http/https URL if provided.")

        v.defense_url = clean_url
        v.defense_statement = defense_statement.strip()
        v.reason = "Licensee submitted defense evidence. AI Jury evaluating both sides."

    @gl.public.write
    def concede_claim(self, vault_id: str) -> None:
        """
        Amicable Settlement: Licensee voluntarily concedes infringement without court trial,
        transferring the deposit to the creator and returning the creator's dispute bond.
        """
        if vault_id not in self.vaults:
            raise gl.vm.UserError(f"Vault {vault_id} does not exist.")

        v = self.vaults[vault_id]
        if gl.message.sender_address != v.licensee:
            raise gl.vm.UserError("Only the licensee can concede the claim.")

        if v.status != u8(1):
            raise gl.vm.UserError("Can only concede while vault is under audit.")

        v.status = u8(4)  # MUTUAL_CONCEDED
        v.verdict = "MUTUAL_CONCEDED"
        v.reason = "Licensee amicably conceded the copyright claim without requiring AI jury trial."

        deposit_val = v.escrow_deposit
        creator_bond = v.creator_bond
        v.creator_bond = bigint(0)

        self.total_deposit_locked = self.total_deposit_locked - deposit_val
        self.total_disputes_resolved = self.total_disputes_resolved + u32(1)

        total_payout = deposit_val + creator_bond
        gl.get_contract_at(v.creator).emit_transfer(value=u256(total_payout))

    @gl.public.write
    def adjudicate_infringement(self, vault_id: str) -> None:
        """
        AI Jury fetches evidence live on-chain via gl.nondet.web.render, evaluates both
        Creator claim and Licensee defense, and reaches consensus on a 3-Tier Verdict:
        - FULL_INFRINGEMENT (similarity >= 75%)
        - PARTIAL_INFRINGEMENT (similarity 50-74%)
        - CLEAN_AUTHORIZED (similarity < 50%)
        """
        if vault_id not in self.vaults:
            raise gl.vm.UserError(f"Vault {vault_id} does not exist.")

        v = self.vaults[vault_id]
        if v.status != u8(1):
            raise gl.vm.UserError(f"Vault {vault_id} is not awaiting infringement adjudication.")

        evidence_url = v.infringement_url
        defense_url = v.defense_url
        defense_stmt = v.defense_statement
        style_dna = v.ip_style_spec

        def leader_fn():
            # 1. Fetch Creator's disputed commercial evidence
            raw_evidence = ""
            fetch_error = False
            try:
                raw_evidence = gl.nondet.web.render(evidence_url, mode="text")
            except Exception:
                fetch_error = True

            # 2. Fetch Licensee's defense evidence if provided
            defense_raw = ""
            if defense_url:
                try:
                    defense_raw = gl.nondet.web.render(defense_url, mode="text")
                except Exception:
                    defense_raw = "Could not load defense URL."

            # If Creator evidence cannot be retrieved, claim is unproven
            if fetch_error or not raw_evidence or len(raw_evidence.strip()) == 0:
                return {
                    "verdict": "CLEAN_AUTHORIZED",
                    "confidence": 100,
                    "similarity_score": 0,
                    "reason": "Could not access or render creator evidence URL. Claim dismissed due to missing evidence."
                }

            truncated_evidence = raw_evidence[:5500] if len(raw_evidence) > 5500 else raw_evidence
            truncated_defense = defense_raw[:2500] if len(defense_raw) > 2500 else defense_raw

            prompt = f"""You are the Chief Justice of the ProofOfPrompt AI Copyright Court on GenLayer.
You must conduct a fair, impartial, two-sided intellectual property trial evaluating both the Creator's claim and the Licensee's defense.

PROTECTED IP STYLE DNA & CANARY MARKERS:
{style_dna}

CLAIM EVIDENCE OF DISPUTED COMMERCIAL WORK (BY CREATOR):
{truncated_evidence}

LICENSEE COUNTER-EVIDENCE & REBUTTAL STATEMENT (BY LICENSEE):
Rebuttal statement: {defense_stmt if defense_stmt else "None submitted"}
Rebuttal web evidence: {truncated_defense if truncated_defense else "None submitted"}

EVALUATION RUBRIC:
1. Style DNA Overlap: Are proprietary phrasing schemas, volumetric stylistic markers, or canary tokens unmistakable?
2. Fair Use & Independent Creation: Does the licensee's defense substantiate legitimate fair use, authorized scope, or independent aesthetic origin?
3. Proportional 3-Tier Verdict:
   - "FULL_INFRINGEMENT" (similarity_score >= 75): Blatant unauthorized replication or direct theft of protected prompt DNA.
   - "PARTIAL_INFRINGEMENT" (similarity_score between 50 and 74): Significant stylistic borrowing or borderline derivative work without full prompt cloning.
   - "CLEAN_AUTHORIZED" (similarity_score < 50): Independent creation, coincidence, or permitted fair use.

Respond ONLY with valid JSON without markdown code fences:
{{
  "verdict": "FULL_INFRINGEMENT"|"PARTIAL_INFRINGEMENT"|"CLEAN_AUTHORIZED",
  "confidence": <0-100>,
  "similarity_score": <0-100>,
  "reason": "<rigorous impartial intellectual property audit rationale weighing both parties>"
}}"""

            raw_res = gl.nondet.exec_prompt(prompt, response_format="json")

            parsed = None
            if isinstance(raw_res, dict):
                parsed = raw_res
            elif isinstance(raw_res, str):
                cleaned = raw_res.strip()
                if cleaned.startswith("```json"):
                    cleaned = cleaned[7:]
                elif cleaned.startswith("```"):
                    cleaned = cleaned[3:]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]
                cleaned = cleaned.strip()
                try:
                    parsed = json.loads(cleaned)
                except Exception:
                    pass

            if not parsed or "verdict" not in parsed:
                return {
                    "verdict": "CLEAN_AUTHORIZED",
                    "confidence": 50,
                    "similarity_score": 0,
                    "reason": "Consensus failed to parse validator output."
                }

            verdict_str = str(parsed.get("verdict", "")).strip().upper()
            # Normalize legacy INFRINGEMENT_CONFIRMED to FULL_INFRINGEMENT
            if verdict_str == "INFRINGEMENT_CONFIRMED":
                verdict_str = "FULL_INFRINGEMENT"
            if verdict_str not in ("FULL_INFRINGEMENT", "PARTIAL_INFRINGEMENT", "CLEAN_AUTHORIZED"):
                verdict_str = "CLEAN_AUTHORIZED"

            def _clean_num(val, default):
                try:
                    s = int(val)
                    return max(0, min(100, s))
                except Exception:
                    return default

            conf_val = _clean_num(parsed.get("confidence"), 85)
            sim_val = _clean_num(parsed.get("similarity_score"), 85 if verdict_str == "FULL_INFRINGEMENT" else (60 if verdict_str == "PARTIAL_INFRINGEMENT" else 20))
            reason_str = str(parsed.get("reason", "Consensus two-sided IP audit concluded."))

            return {
                "verdict": verdict_str,
                "confidence": conf_val,
                "similarity_score": sim_val,
                "reason": reason_str
            }

        def validator_fn(leader_res) -> bool:
            if not isinstance(leader_res, gl.vm.Return):
                return False
            leader = leader_res.calldata
            if isinstance(leader, str):
                try:
                    leader = json.loads(leader)
                except Exception:
                    return False
            if not isinstance(leader, dict) or "verdict" not in leader:
                return False

            mine = leader_fn()
            # Semantic Consensus: Compare VERDICT ONLY!
            return mine["verdict"] == leader["verdict"]

        adjudication_res = gl.vm.run_nondet(leader_fn, validator_fn)

        verdict = adjudication_res["verdict"]
        reason = adjudication_res["reason"]
        confidence = u8(int(adjudication_res["confidence"]))
        similarity_score = u8(int(adjudication_res["similarity_score"]))

        v.verdict = verdict
        v.reason = reason
        v.confidence = confidence
        v.similarity_score = similarity_score

        deposit_val = v.escrow_deposit
        creator_bond = v.creator_bond
        v.creator_bond = bigint(0)  # Always clear bond on settlement

        if verdict == "FULL_INFRINGEMENT":
            v.status = u8(2)  # FULL_SLASHED
            self.total_deposit_locked = self.total_deposit_locked - deposit_val
            self.total_disputes_resolved = self.total_disputes_resolved + u32(1)
            # Full slash: 100% deposit + returned creator bond paid to Creator
            gl.get_contract_at(v.creator).emit_transfer(value=u256(deposit_val + creator_bond))

        elif verdict == "PARTIAL_INFRINGEMENT":
            v.status = u8(5)  # PARTIAL_SLASHED
            self.total_deposit_locked = self.total_deposit_locked - deposit_val
            self.total_disputes_resolved = self.total_disputes_resolved + u32(1)

            # Balanced 50/50 Split for borderline derivative work
            half_deposit = deposit_val // bigint(2)
            rem_deposit = deposit_val - half_deposit

            # Creator receives 50% liquidated damages + their dispute bond back
            gl.get_contract_at(v.creator).emit_transfer(value=u256(half_deposit + creator_bond))
            # Licensee retains 50% of their collateral
            if rem_deposit > bigint(0):
                gl.get_contract_at(v.licensee).emit_transfer(value=u256(rem_deposit))

        else:
            # CLEAN_AUTHORIZED: Claim dismissed
            v.status = u8(0)  # Reset to ACTIVE_LICENSED
            v.verdict = "CLEAN_AUTHORIZED"

            # Anti-Harassment: If creator staked a bond and lost, award it to licensee as compensation
            if creator_bond > bigint(0):
                v.creator_bond = bigint(0)
                gl.get_contract_at(v.licensee).emit_transfer(value=u256(creator_bond))

    @gl.public.write
    def reclaim_deposit(self, vault_id: str) -> None:
        """
        Licensee reclaims guarantee deposit after licensing period expires without confirmed infringement.
        """
        if vault_id not in self.vaults:
            raise gl.vm.UserError(f"Vault {vault_id} does not exist.")

        v = self.vaults[vault_id]
        if gl.message.sender_address != v.licensee:
            raise gl.vm.UserError("Only the licensee can reclaim the guarantee deposit.")

        self.vault_counter = self.vault_counter + u64(1)
        current_block = u256(int(self.vault_counter))

        if v.status == u8(1):
            # Timeout protection: Stalled audit over 50 actions allows licensee to reclaim
            if current_block < (v.audit_started_block + u256(50)):
                raise gl.vm.UserError("Cannot reclaim: Dispute is currently undergoing active jury audit.")
            
            # Refund creator bond if audit stalled to avoid locking funds
            creator_bond = v.creator_bond
            v.creator_bond = bigint(0)
            if creator_bond > bigint(0):
                gl.get_contract_at(v.creator).emit_transfer(value=u256(creator_bond))

        elif v.status == u8(0):
            if current_block < v.expires_at_block:
                raise gl.vm.UserError("Cannot reclaim: License duration has not yet expired.")
        else:
            raise gl.vm.UserError("Vault deposit is already settled or reclaimed.")

        v.status = u8(3)  # EXPIRED_REFUNDED
        v.verdict = "CLEAN_EXPIRED"
        v.reason = "License period ended with zero confirmed infringements. Deposit reclaimed."

        deposit_val = v.escrow_deposit
        self.total_deposit_locked = self.total_deposit_locked - deposit_val

        gl.get_contract_at(v.licensee).emit_transfer(value=u256(deposit_val))

    # --- Read-only Views ---

    @gl.public.view
    def get_vault(self, vault_id: str) -> str:
        """Returns JSON serialized representation of a licensing vault."""
        if vault_id not in self.vaults:
            raise gl.vm.UserError(f"Vault {vault_id} does not exist.")

        v = self.vaults[vault_id]
        data = {
            "vault_id": v.vault_id,
            "creator": _addr_str(v.creator),
            "licensee": _addr_str(v.licensee),
            "escrow_deposit": str(v.escrow_deposit),
            "creator_bond": str(v.creator_bond),
            "ip_style_spec": v.ip_style_spec,
            "infringement_url": v.infringement_url,
            "defense_url": v.defense_url,
            "defense_statement": v.defense_statement,
            "status": int(v.status),
            "verdict": v.verdict,
            "reason": v.reason,
            "confidence": int(v.confidence),
            "similarity_score": int(v.similarity_score),
            "created_at_block": str(v.created_at_block),
            "expires_at_block": str(v.expires_at_block),
        }
        return json.dumps(data)

    @gl.public.view
    def get_vault_count(self) -> int:
        return len(self.vault_ids)

    @gl.public.view
    def get_vault_id_by_index(self, idx: int) -> str:
        if idx < 0 or idx >= len(self.vault_ids):
            raise gl.vm.UserError("Index out of bounds.")
        return self.vault_ids[idx]

    @gl.public.view
    def get_vaults_paginated(self, offset: int, limit: int) -> str:
        """Safely paginates vaults to prevent out-of-memory errors."""
        total = len(self.vault_ids)
        if offset < 0 or offset >= total or limit <= 0:
            return json.dumps([])

        end = min(offset + limit, total)
        vaults_list = []
        for i in range(offset, end):
            vid = self.vault_ids[i]
            v = self.vaults[vid]
            vaults_list.append({
                "vault_id": v.vault_id,
                "creator": _addr_str(v.creator),
                "licensee": _addr_str(v.licensee),
                "escrow_deposit": str(v.escrow_deposit),
                "creator_bond": str(v.creator_bond),
                "ip_style_spec": v.ip_style_spec,
                "infringement_url": v.infringement_url,
                "defense_url": v.defense_url,
                "defense_statement": v.defense_statement,
                "status": int(v.status),
                "verdict": v.verdict,
                "reason": v.reason,
                "confidence": int(v.confidence),
                "similarity_score": int(v.similarity_score),
                "created_at_block": str(v.created_at_block),
                "expires_at_block": str(v.expires_at_block),
            })
        return json.dumps(vaults_list)

    @gl.public.view
    def get_stats(self) -> str:
        data = {
            "total_vaults": len(self.vault_ids),
            "total_deposit_locked": str(self.total_deposit_locked),
            "total_disputes_resolved": int(self.total_disputes_resolved),
        }
        return json.dumps(data)
