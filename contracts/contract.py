# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
from dataclasses import dataclass
import json

if not hasattr(gl, "UserError"):
    gl.UserError = getattr(gl.vm, "UserError", Exception)


def _addr_str(addr: Address) -> str:
    """Safely format an Address instance into a hex string."""
    try:
        return addr.as_hex
    except Exception:
        return str(addr)


def _to_address(addr) -> Address:
    """Safely coerce any input (Address, bytes, or hex str) into a valid GenVM Address instance."""
    if isinstance(addr, Address):
        return addr
    if isinstance(addr, (bytes, bytearray)):
        if len(addr) == 20:
            return Address(bytes(addr))
        addr_str = addr.decode("utf-8", errors="ignore").strip()
    else:
        addr_str = str(addr).strip()
    return Address(addr_str)


def _pay_native(recipient, amount: bigint) -> None:
    """Send native GEN tokens directly to an EOA or contract address via GenLayer transfer."""
    if amount <= bigint(0):
        return
    addr = _to_address(recipient)
    gl.get_contract_at(addr).emit_transfer(value=u256(int(amount)))


# --- Protocol Status Lifecycle ---
STATUS_OFFERED = u8(0)           # Creator proposed terms, awaiting Licensee collateral funding
STATUS_ACTIVE = u8(1)            # Licensee accepted and funded collateral deposit
STATUS_DISPUTE_FILED = u8(2)     # Creator filed claim with mandatory bond; defense window active
STATUS_DEFENSE_SUBMITTED = u8(3) # Licensee submitted counter-evidence; ready for AI court trial
STATUS_MUTUAL_CONCEDED = u8(4)   # Amicably conceded or mutually settled without trial
STATUS_FULL_SLASHED = u8(5)      # AI Jury ruled FULL_INFRINGEMENT (100% slash to creator)
STATUS_PARTIAL_SLASHED = u8(6)   # AI Jury ruled PARTIAL_INFRINGEMENT (50/50 fair split)
STATUS_CLEAN_AUTHORIZED = u8(7)  # AI Jury dismissed claim (creator bond paid to licensee)
STATUS_EXPIRED_REFUNDED = u8(8)  # Clean term completion, deposit reclaimed by licensee

# --- Default Safeguard Windows (in seconds) ---
DEFENSE_WINDOW_SECONDS = 86400      # 24 hours defense window
STALL_TIMEOUT_SECONDS = 86400 * 3   # 3 days timeout if audit stalls
MIN_CLAIM_BOND_BPS = 1000           # 10% (1000 bps) minimum dispute bond required
MIN_ABSOLUTE_BOND = 50_000_000_000_000_000  # 0.05 GEN minimum floor


@allow_storage
@dataclass
class LicenseVault:
    """Storage struct representing an AI IP style license with two-sided dispute escrow."""
    vault_id: str
    creator: Address
    licensee: Address
    required_deposit: bigint       # Collateral amount required from licensee
    escrow_deposit: bigint         # Collateral actually funded by licensee
    creator_bond: bigint           # Mandatory anti-harassment dispute stake locked by creator
    ip_style_spec: str             # Prompt DNA, unique style elements, and canary markers
    duration_seconds: bigint       # Licensed duration in seconds
    infringement_url: str          # Live URL of disputed unauthorized output
    defense_url: str               # Counter-evidence submitted by licensee
    defense_statement: str         # Licensee rebuttal / fair-use explanation
    status: u8                     # STATUS_*
    verdict: str                   # "PENDING", "FULL_INFRINGEMENT", "PARTIAL_INFRINGEMENT", "CLEAN_AUTHORIZED", "MUTUAL_CONCEDED"
    reason: str                    # Detailed qualitative jury rationale
    confidence: u8                 # 0 - 100: Validator consensus confidence
    similarity_score: u8           # 0 - 100: Style DNA overlap and infringement strength
    created_at: bigint             # Timestamp when offer was published
    activated_at: bigint           # Timestamp when licensee funded collateral
    expires_at: bigint             # Timestamp when license expires
    defense_deadline: bigint       # Timestamp when licensee defense window closes
    split_proposer: str            # Hex string of party who proposed 50/50 split, or empty string


class Contract(gl.Contract):
    """
    ProofOfPrompt: Autonomous Two-Sided AI IP Licensing & Copyright Infringement Court
    Target Network: studionet (Chain ID: 61999)
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

    def _now(self) -> bigint:
        """Derive trusted deterministic execution timestamp strictly from runtime context."""
        import datetime
        try:
            dt_raw = gl.message_raw.get("datetime", None) if isinstance(gl.message_raw, dict) else None
            if dt_raw:
                s = str(dt_raw)
                if s.endswith("Z"):
                    s = s[:-1] + "+00:00"
                ts = int(datetime.datetime.fromisoformat(s).timestamp())
                if ts > 0:
                    return bigint(ts)
        except Exception as e:
            raise gl.UserError(f"Failed to parse trusted execution timestamp: {e}")
        raise gl.UserError("Trusted execution timestamp unavailable from runtime.")

    @gl.public.write
    def propose_license(
        self,
        licensee_addr: Address,
        ip_style_spec: str,
        required_deposit: bigint,
        duration_seconds: int = 2592000
    ) -> str:
        if required_deposit <= bigint(0):
            raise gl.UserError("Required guarantee deposit must be greater than 0.")

        if not ip_style_spec or len(ip_style_spec.strip()) == 0:
            raise gl.UserError("IP Style DNA and prompt specification cannot be empty.")

        duration = bigint(duration_seconds if duration_seconds > 0 else 2592000)

        self.vault_counter = self.vault_counter + u64(1)
        vault_id = f"ip-{int(self.vault_counter)}"
        now = self._now()

        new_vault = LicenseVault(
            vault_id=vault_id,
            creator=_to_address(gl.message.sender_address),
            licensee=_to_address(licensee_addr),
            required_deposit=required_deposit,
            escrow_deposit=bigint(0),
            creator_bond=bigint(0),
            ip_style_spec=ip_style_spec.strip(),
            duration_seconds=duration,
            infringement_url="",
            defense_url="",
            defense_statement="",
            status=STATUS_OFFERED,
            verdict="AWAITING_LICENSEE_FUNDING",
            reason="License terms published by creator. Awaiting licensee acceptance and escrow funding.",
            confidence=u8(0),
            similarity_score=u8(0),
            created_at=now,
            activated_at=bigint(0),
            expires_at=bigint(0),
            defense_deadline=bigint(0),
            split_proposer="",
        )

        self.vaults[vault_id] = new_vault
        self.vault_ids.append(vault_id)
        return vault_id

    @gl.public.write.payable
    def register_license(
        self,
        licensee_addr: Address,
        ip_style_spec: str,
        duration_seconds: int = 2592000
    ) -> str:
        attached = bigint(gl.message.value)
        if attached > bigint(0):
            _pay_native(gl.message.sender_address, attached)

        req_dep = attached if attached > bigint(0) else bigint(1_000_000_000_000_000_000)
        return self.propose_license(licensee_addr, ip_style_spec, req_dep, duration_seconds)

    @gl.public.write.payable
    def accept_and_fund_license(self, vault_id: str) -> None:
        if vault_id not in self.vaults:
            raise gl.UserError(f"Vault {vault_id} does not exist.")

        v = self.vaults[vault_id]
        if gl.message.sender_address != v.licensee:
            raise gl.UserError("Only the designated licensee can accept and fund this license.")

        if v.status != STATUS_OFFERED:
            raise gl.UserError(f"Vault {vault_id} is not in pending offer status.")

        funded = bigint(gl.message.value)
        if funded < v.required_deposit:
            raise gl.UserError(f"Insufficient deposit. Required: {v.required_deposit} wei, sent: {funded} wei.")

        now = self._now()
        v.escrow_deposit = funded
        v.status = STATUS_ACTIVE
        v.activated_at = now
        v.expires_at = now + v.duration_seconds
        v.verdict = "PENDING"
        v.reason = "License active and funded. Licensee granted commercial authorization."
        v.split_proposer = ""

        self.total_deposit_locked = self.total_deposit_locked + funded

    @gl.public.write.payable
    def file_infringement_claim(self, vault_id: str, evidence_url: str) -> None:
        if vault_id not in self.vaults:
            raise gl.UserError(f"Vault {vault_id} does not exist.")

        v = self.vaults[vault_id]
        if gl.message.sender_address != v.creator:
            raise gl.UserError("Only the IP creator can file an infringement dispute.")

        if v.status != STATUS_ACTIVE:
            raise gl.UserError(f"Vault {vault_id} is not in active licensed status.")

        bond = bigint(gl.message.value)
        min_bond = (v.escrow_deposit * bigint(MIN_CLAIM_BOND_BPS)) // bigint(10000)
        floor_bond = bigint(MIN_ABSOLUTE_BOND)
        required_bond = min_bond if min_bond > floor_bond else floor_bond

        if bond < required_bond:
            raise gl.UserError(
                f"Anti-harassment dispute bond of at least {required_bond} wei required to file claim."
            )

        clean_url = evidence_url.strip()
        if not clean_url.startswith("http://") and not clean_url.startswith("https://"):
            raise gl.UserError("Valid public evidence URL (http/https) is required.")

        now = self._now()
        v.status = STATUS_DISPUTE_FILED
        v.infringement_url = clean_url
        v.creator_bond = bond
        v.defense_deadline = now + bigint(DEFENSE_WINDOW_SECONDS)
        v.verdict = "IN_DISPUTE"
        v.reason = "Infringement claim filed with anti-harassment bond. Defense window is active for Licensee rebuttal."

    @gl.public.write
    def submit_licensee_defense(self, vault_id: str, defense_url: str, defense_statement: str) -> None:
        if vault_id not in self.vaults:
            raise gl.UserError(f"Vault {vault_id} does not exist.")

        v = self.vaults[vault_id]
        if gl.message.sender_address != v.licensee:
            raise gl.UserError("Only the authorized licensee can submit a defense.")

        if v.status != STATUS_DISPUTE_FILED:
            raise gl.UserError(f"Vault {vault_id} is not awaiting licensee defense.")

        now = self._now()
        if v.defense_deadline > bigint(0) and now > v.defense_deadline:
            raise gl.UserError("Licensee defense window has expired.")

        clean_url = defense_url.strip()
        if clean_url and not clean_url.startswith("http://") and not clean_url.startswith("https://"):
            raise gl.UserError("Defense URL must be a valid http/https URL if provided.")

        v.defense_url = clean_url
        v.defense_statement = defense_statement.strip()
        v.status = STATUS_DEFENSE_SUBMITTED
        v.reason = "Licensee submitted rebuttal evidence. Case is ready for AI Jury trial."

    @gl.public.write
    def concede_claim(self, vault_id: str) -> None:
        if vault_id not in self.vaults:
            raise gl.UserError(f"Vault {vault_id} does not exist.")

        v = self.vaults[vault_id]
        if gl.message.sender_address != v.licensee:
            raise gl.UserError("Only the licensee can concede the claim.")

        if v.status != STATUS_DISPUTE_FILED and v.status != STATUS_DEFENSE_SUBMITTED:
            raise gl.UserError("Can only concede while vault is under active dispute.")

        v.status = STATUS_MUTUAL_CONCEDED
        v.verdict = "MUTUAL_CONCEDED"
        v.reason = "Licensee amicably conceded the copyright claim without requiring AI jury trial."

        deposit_val = v.escrow_deposit
        creator_bond = v.creator_bond
        v.creator_bond = bigint(0)

        self.total_deposit_locked = self.total_deposit_locked - deposit_val
        self.total_disputes_resolved = self.total_disputes_resolved + u32(1)

        total_payout = deposit_val + creator_bond
        if total_payout > bigint(0):
            _pay_native(v.creator, total_payout)

    @gl.public.write
    def propose_mutual_split(self, vault_id: str) -> None:
        if vault_id not in self.vaults:
            raise gl.UserError(f"Vault {vault_id} does not exist.")

        v = self.vaults[vault_id]
        sender_str = _addr_str(gl.message.sender_address).lower()
        creator_str = _addr_str(v.creator).lower()
        licensee_str = _addr_str(v.licensee).lower()

        if sender_str != creator_str and sender_str != licensee_str:
            raise gl.UserError("Only the creator or licensee can participate in mutual split compromise.")

        if v.status != STATUS_DISPUTE_FILED and v.status != STATUS_DEFENSE_SUBMITTED:
            raise gl.UserError("Mutual split compromise is only available during active dispute.")

        existing = v.split_proposer.lower().strip()
        if not existing:
            v.split_proposer = sender_str
            role = "Creator" if sender_str == creator_str else "Licensee"
            other_role = "Licensee" if sender_str == creator_str else "Creator"
            v.reason = f"{role} proposed an amicable 50/50 compromise split. Awaiting {other_role} confirmation."
            return

        if existing == sender_str:
            raise gl.UserError("You have already proposed a mutual split. Awaiting the counterparty.")

        # Counterparty accepted! Settle immediately
        v.status = STATUS_MUTUAL_CONCEDED
        v.verdict = "MUTUAL_SPLIT_AGREED"
        v.reason = "Both parties mutually agreed to an amicable 50/50 compromise settlement."

        deposit_val = v.escrow_deposit
        creator_bond = v.creator_bond
        v.creator_bond = bigint(0)

        self.total_deposit_locked = self.total_deposit_locked - deposit_val
        self.total_disputes_resolved = self.total_disputes_resolved + u32(1)

        half_deposit = deposit_val // bigint(2)
        rem_deposit = deposit_val - half_deposit

        creator_total = half_deposit + creator_bond
        if creator_total > bigint(0):
            _pay_native(v.creator, creator_total)

        if rem_deposit > bigint(0):
            _pay_native(v.licensee, rem_deposit)

    @gl.public.write
    def adjudicate_infringement(self, vault_id: str) -> None:
        if vault_id not in self.vaults:
            raise gl.UserError(f"Vault {vault_id} does not exist.")

        v = self.vaults[vault_id]
        if v.status != STATUS_DISPUTE_FILED and v.status != STATUS_DEFENSE_SUBMITTED:
            raise gl.UserError(f"Vault {vault_id} is not awaiting infringement adjudication.")

        now = self._now()
        if v.status == STATUS_DISPUTE_FILED:
            if v.defense_deadline > bigint(0) and now <= v.defense_deadline:
                raise gl.UserError(
                    "Cannot adjudicate yet: Licensee defense window is active. Must await defense submission or deadline expiry."
                )

        evidence_url = v.infringement_url
        defense_url = v.defense_url
        defense_stmt = v.defense_statement
        style_dna = v.ip_style_spec

        def leader_fn():
            raw_evidence = ""
            fetch_error = False
            try:
                raw_evidence = gl.nondet.web.render(evidence_url, mode="text")
            except Exception:
                fetch_error = True

            defense_raw = ""
            if defense_url:
                try:
                    defense_raw = gl.nondet.web.render(defense_url, mode="text")
                except Exception:
                    defense_raw = "Could not load defense URL."

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
Evaluate both Creator's claim and Licensee's defense.

PROTECTED IP STYLE DNA:
{style_dna}

CLAIM EVIDENCE (BY CREATOR):
{truncated_evidence}

LICENSEE COUNTER-EVIDENCE & STATEMENT (BY LICENSEE):
Rebuttal statement: {defense_stmt if defense_stmt else "None submitted"}
Rebuttal web evidence: {truncated_defense if truncated_defense else "None submitted"}

Respond ONLY with valid JSON without markdown:
{{
  "verdict": "FULL_INFRINGEMENT"|"PARTIAL_INFRINGEMENT"|"CLEAN_AUTHORIZED",
  "confidence": <0-100>,
  "similarity_score": <0-100>,
  "reason": "<rigorous audit rationale>"
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

            if not isinstance(parsed, dict):
                return {
                    "verdict": "CLEAN_AUTHORIZED",
                    "confidence": 70,
                    "similarity_score": 10,
                    "reason": "AI jury returned unparseable verdict; defaulted to non-infringement."
                }

            verdict_str = str(parsed.get("verdict", "CLEAN_AUTHORIZED")).upper().strip()
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
        v.creator_bond = bigint(0)

        if verdict == "FULL_INFRINGEMENT":
            v.status = STATUS_FULL_SLASHED
            self.total_deposit_locked = self.total_deposit_locked - deposit_val
            self.total_disputes_resolved = self.total_disputes_resolved + u32(1)
            _pay_native(v.creator, deposit_val + creator_bond)

        elif verdict == "PARTIAL_INFRINGEMENT":
            v.status = STATUS_PARTIAL_SLASHED
            self.total_deposit_locked = self.total_deposit_locked - deposit_val
            self.total_disputes_resolved = self.total_disputes_resolved + u32(1)

            half_deposit = deposit_val // bigint(2)
            rem_deposit = deposit_val - half_deposit

            _pay_native(v.creator, half_deposit + creator_bond)
            if rem_deposit > bigint(0):
                _pay_native(v.licensee, rem_deposit)

        else:
            v.status = STATUS_ACTIVE
            v.verdict = "CLEAN_AUTHORIZED"
            v.split_proposer = ""
            v.infringement_url = ""
            v.defense_url = ""
            v.defense_statement = ""
            v.defense_deadline = bigint(0)

            if creator_bond > bigint(0):
                _pay_native(v.licensee, creator_bond)

    @gl.public.write
    def reclaim_deposit(self, vault_id: str) -> None:
        if vault_id not in self.vaults:
            raise gl.UserError(f"Vault {vault_id} does not exist.")

        v = self.vaults[vault_id]
        if gl.message.sender_address != v.licensee:
            raise gl.UserError("Only the licensee can reclaim the guarantee deposit.")

        now = self._now()

        if v.status == STATUS_ACTIVE:
            if v.expires_at > bigint(0) and now < v.expires_at:
                raise gl.UserError("Cannot reclaim: License duration has not yet expired.")

        elif v.status == STATUS_DISPUTE_FILED or v.status == STATUS_DEFENSE_SUBMITTED:
            stall_deadline = v.defense_deadline + bigint(STALL_TIMEOUT_SECONDS)
            if v.defense_deadline > bigint(0) and now < stall_deadline:
                raise gl.UserError("Cannot reclaim: Dispute is currently undergoing active jury audit.")

            creator_bond = v.creator_bond
            v.creator_bond = bigint(0)
            if creator_bond > bigint(0):
                _pay_native(v.creator, creator_bond)

        else:
            raise gl.UserError("Vault deposit is already settled or not yet funded.")

        v.status = STATUS_EXPIRED_REFUNDED
        v.verdict = "CLEAN_EXPIRED"
        v.reason = "License period ended with zero confirmed infringements. Deposit reclaimed."

        deposit_val = v.escrow_deposit
        self.total_deposit_locked = self.total_deposit_locked - deposit_val

        if deposit_val > bigint(0):
            _pay_native(v.licensee, deposit_val)

    # --- Read-only Views ---

    @gl.public.view
    def get_vault(self, vault_id: str) -> str:
        if vault_id not in self.vaults:
            raise gl.UserError(f"Vault {vault_id} does not exist.")

        v = self.vaults[vault_id]
        data = {
            "vault_id": v.vault_id,
            "creator": _addr_str(v.creator),
            "licensee": _addr_str(v.licensee),
            "required_deposit": str(v.required_deposit),
            "escrow_deposit": str(v.escrow_deposit),
            "creator_bond": str(v.creator_bond),
            "ip_style_spec": v.ip_style_spec,
            "duration_seconds": str(v.duration_seconds),
            "infringement_url": v.infringement_url,
            "defense_url": v.defense_url,
            "defense_statement": v.defense_statement,
            "status": int(v.status),
            "verdict": v.verdict,
            "reason": v.reason,
            "confidence": int(v.confidence),
            "similarity_score": int(v.similarity_score),
            "created_at": str(v.created_at),
            "activated_at": str(v.activated_at),
            "expires_at": str(v.expires_at),
            "defense_deadline": str(v.defense_deadline),
            "split_proposer": v.split_proposer,
            "created_at_block": str(v.created_at),
            "expires_at_block": str(v.expires_at),
        }
        return json.dumps(data)

    @gl.public.view
    def get_vault_count(self) -> int:
        return len(self.vault_ids)

    @gl.public.view
    def get_vault_id_by_index(self, idx: int) -> str:
        if idx < 0 or idx >= len(self.vault_ids):
            raise gl.UserError("Index out of bounds.")
        return self.vault_ids[idx]

    @gl.public.view
    def get_vaults_paginated(self, offset: int, limit: int) -> str:
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
                "required_deposit": str(v.required_deposit),
                "escrow_deposit": str(v.escrow_deposit),
                "creator_bond": str(v.creator_bond),
                "ip_style_spec": v.ip_style_spec,
                "duration_seconds": str(v.duration_seconds),
                "infringement_url": v.infringement_url,
                "defense_url": v.defense_url,
                "defense_statement": v.defense_statement,
                "status": int(v.status),
                "verdict": v.verdict,
                "reason": v.reason,
                "confidence": int(v.confidence),
                "similarity_score": int(v.similarity_score),
                "created_at": str(v.created_at),
                "activated_at": str(v.activated_at),
                "expires_at": str(v.expires_at),
                "defense_deadline": str(v.defense_deadline),
                "split_proposer": v.split_proposer,
                "created_at_block": str(v.created_at),
                "expires_at_block": str(v.expires_at),
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
