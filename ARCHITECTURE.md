# Architecture & Protocol Design: ProofOfPrompt

## 1. Domain Problem: Prompt Theft & Unenforceable AI Licenses

In traditional web3 and EVM-compatible networks, intellectual property licensing relies on passive token transfers or off-chain legal contracts. A smart contract deployed on Ethereum or Solana has no perception of the external web; it cannot crawl a digital storefront, examine visual style markers, or detect prompt leakage.

**ProofOfPrompt** leverages GenLayer's **GenVM** to create an on-chain, autonomous intellectual property court that can:
1. Lock guarantee deposits natively in GEN tokens.
2. Read live public web evidence through `gl.nondet.web.render`.
3. Process unstructured natural language prompt specifications through multi-validator LLM execution.
4. Reach subjective democratic consensus on semantic verdicts without brittle schema-matching failures.

---

## 2. State Machine: LicenseVault Lifecycle (9-State Protocol)

```mermaid
stateDiagram-v2
    [*] --> STATUS_OFFERED : propose_license (0 upfront deposit)
    STATUS_OFFERED --> STATUS_ACTIVE : accept_and_fund_license (Licensee collateral)
    
    STATUS_ACTIVE --> STATUS_DISPUTE_FILED : file_infringement_claim (Creator bond, 24h window)
    STATUS_ACTIVE --> STATUS_EXPIRED_REFUNDED : reclaim_deposit (Term expired)
    
    STATUS_DISPUTE_FILED --> STATUS_DEFENSE_SUBMITTED : submit_licensee_defense (Rebuttal)
    STATUS_DISPUTE_FILED --> STATUS_MUTUAL_CONCEDED : concede_claim / propose_mutual_split
    STATUS_DEFENSE_SUBMITTED --> STATUS_MUTUAL_CONCEDED : propose_mutual_split (50/50 settlement)
    
    STATUS_DEFENSE_SUBMITTED --> STATUS_FULL_SLASHED : adjudicate_infringement [FULL_INFRINGEMENT]
    STATUS_DEFENSE_SUBMITTED --> STATUS_PARTIAL_SLASHED : adjudicate_infringement [PARTIAL_INFRINGEMENT]
    STATUS_DEFENSE_SUBMITTED --> STATUS_ACTIVE : adjudicate_infringement [CLEAN_AUTHORIZED]
    
    STATUS_DISPUTE_FILED --> STATUS_FULL_SLASHED : adjudicate_infringement [After 24h defense window]
    STATUS_DISPUTE_FILED --> STATUS_EXPIRED_REFUNDED : reclaim_deposit [Stalled audit > 3 days]
```

### State Definitions

| Status Code | Enum Name | Description |
|:---:|:---|:---|
| `0` | `STATUS_OFFERED` | License terms proposed by creator with 0 upfront deposit; awaiting Licensee collateral funding. |
| `1` | `STATUS_ACTIVE` | Licensee accepted terms and deposited collateral. Protection active. |
| `2` | `STATUS_DISPUTE_FILED` | Creator staked anti-harassment bond (>=10%) to initiate dispute. 24h defense window active. |
| `3` | `STATUS_DEFENSE_SUBMITTED` | Licensee submitted rebuttal statements and counter-evidence. Adjudication unlocked. |
| `4` | `STATUS_MUTUAL_CONCEDED` | Amicably conceded or settled via out-of-court 50/50 compromise (`propose_mutual_split`). |
| `5` | `STATUS_FULL_SLASHED` | AI Jury confirmed full copyright piracy. 100% deposit slashed to Creator. |
| `6` | `STATUS_PARTIAL_SLASHED` | AI Jury confirmed partial derivative infringement. Balanced 50/50 split of collateral. |
| `7` | `STATUS_CLEAN_AUTHORIZED` | Claim dismissed. Creator bond forfeited to licensee as harassment damages; vault restored to `STATUS_ACTIVE`. |
| `8` | `STATUS_EXPIRED_REFUNDED` | Licensing term concluded without confirmed infringement. Deposit reclaimed by Licensee. |

---

## 3. Subjective Consensus Protocol

### The Leader & Validator Pattern

When `adjudicate_infringement(vault_id)` is invoked:
1. **Leader Execution:**
   - The consensus leader triggers `gl.nondet.web.render(evidence_url, mode="text")`.
   - The leader submits the protected style DNA and the crawled text to `gl.nondet.exec_prompt(...)`.
   - The LLM outputs a structured evaluation payload containing `verdict`, `confidence`, `similarity_score`, and `reason`.
2. **Validator Verification:**
   - Other validators independently execute their own web scrape and LLM inference.
   - The `validator_fn` enforces **Semantic Equivalence**:
     ```python
     def validator_fn(leader_res) -> bool:
         if not isinstance(leader_res, gl.vm.Return):
             return False
         mine = leader_fn()
         # Semantic Consensus: Compare VERDICT ONLY!
         return mine["verdict"] == leader["verdict"]
     ```
   - By comparing solely the categorical verdict (`INFRINGEMENT_CONFIRMED` vs `CLEAN_AUTHORIZED`), validators reach solid consensus even if individual LLM instances generate slight wording differences in their qualitative explanations.

---

## 4. Two-Sided Economic Security & Dispute Balance

- **Licensee Guarantee Escrow:** The Licensee posts collateral proportional to the commercial value of the licensed style DNA.
- **Creator Anti-Harassment Dispute Bond:** To discourage bad-faith or frivolous copyright claims intended to harass licensees, creators must stake a deposit bond (default: 10% of escrow, min 0.05 GEN) when filing a dispute.
  - If the AI Jury confirms infringement (`FULL_INFRINGEMENT` or `PARTIAL_INFRINGEMENT`), the bond is refunded in full to the creator.
  - If the claim is judged clean (`CLEAN_AUTHORIZED`), the bond is forfeited and awarded directly to the defendant licensee as compensation for harassment.
- **Licensee Right of Defense:** Licensees can present counter-arguments and proof of authorization (`submit_licensee_defense`). The validator prompt compares both sides before voting.
- **Graduated Slashing:** 
  - `FULL_INFRINGEMENT`: 100% licensee deposit slashed to Creator.
  - `PARTIAL_INFRINGEMENT`: 50% deposit slashed to Creator, 50% saved for Licensee.
- **Amicable Settlement:** Licensees can settle without trial via `concede_claim`, returning the creator's bond and transferring the deposit cleanly.
