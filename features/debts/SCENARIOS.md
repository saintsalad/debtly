# Debt Scenarios — FAQ & Coverage Reference

This document maps real-world debt situations to what the app currently supports.
Each scenario links to its test coverage in [`scenarios.test.ts`](./scenarios.test.ts).

> **Legend**
> - ✅ Supported — works today, has passing tests
> - 🚧 Partial — works with a workaround, noted limitation
> - ❌ Not supported — tested to document current behaviour; `TODO` in test marks the spec for when this is built

---

## "They owe me" scenarios

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| 1 | Friend borrowed cash for lunch / groceries | ✅ | Basic `owed_to_me` entry with optional note |
| 2 | Covered someone's share of a group dinner or trip | ✅ | Use Bill Split group; balances can sync to personal ledger |
| 3 | Lent money for a large purchase (phone, appliance) | ✅ | Single `owed_to_me` entry, add note for context |
| 4 | Paid someone's ticket or entry fee | ✅ | Same as above |
| 5 | Covered a housemate's rent or utility bill | ✅ | Partial payments supported; amount stays as remaining balance |
| 6 | Personal loan with interest (e.g. 5% APR) | ✅ | Enable "Charge interest" in form; simple interest, monthly or yearly accrual |
| 7 | Monthly rent collection from housemate | ✅ | Enable "Recurring debt", set frequency to Monthly, set due date |
| 8 | Weekly allowance expected back | ✅ | Recurring, Weekly frequency |
| 9 | Sold something to someone on credit | ✅ | `owed_to_me` entry; use note for item description |
| 10 | Covered a coworker's share of a work trip | ✅ | Bill Split group or manual entry |
| 11 | Shared subscription split (Netflix, Spotify) | ✅ | Recurring Monthly; one cycle per billing period |
| 12 | Lent money to multiple people from one payment | 🚧 | Create one entry **per person** manually; no shared-source linkage yet — see [#1 unsupported](#unsupported-scenarios) |

---

## "I owe" scenarios

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| 13 | Borrowed cash from a friend for gas / transport | ✅ | Basic `i_owe` entry |
| 14 | Friend paid my share of a shared meal | ✅ | `i_owe` entry; record payments as you repay |
| 15 | Friend covered my hotel / travel share | ✅ | Bill Split group or manual `i_owe` entry |
| 16 | Borrowed money to pay a bill | ✅ | `i_owe` entry with optional due date |
| 17 | Personal loan from a family member | ✅ | `i_owe`; optional interest and due date |
| 18 | Monthly instalment on a loan (fixed amount, reducing total) | 🚧 | Recurring debt approximates this but does **not** reduce the principal across cycles — see [#5 unsupported](#unsupported-scenarios) |
| 19 | Borrowed from a colleague | ✅ | Same as borrowing from a friend |
| 20 | Owe back for a subscription a friend pays on my behalf | ✅ | Recurring `i_owe`, monthly |
| 21 | Owe back for a gift bought on my behalf | ✅ | `i_owe` entry with note |
| 22 | Owe someone in a foreign currency | ❌ | App uses one currency; no per-entry currency field — see [#4 unsupported](#unsupported-scenarios) |

---

## Interest rules (FAQ)

**Q: How is interest calculated?**
Simple interest: `principal × (APR / 12) × months_elapsed`. The rate never compounds.
See test: `[owed_to_me] personal loan with 12% APR interest`.

**Q: When does interest start?**
Two modes selectable in the form:
- **Immediate** — starts accruing from the day the debt is created.
- **After due date** — starts accruing only if the due date passes unpaid.

**Q: Does paying early reduce the interest owed?**
Yes. Interest is only charged up to the payment date. If you pay before any accrual period completes, no interest is added.

**Q: What order do payments apply in?**
Interest first, then principal (waterfall). A ₱65 payment on a ₱50-interest + ₱5,000-principal debt clears ₱50 interest and ₱15 principal.
See test: `payment goes to interest first, then principal (waterfall)`.

**Q: What is the maximum interest rate?**
100% APR (10,000 basis points). Higher values are rejected at input.

---

## Recurring debt rules (FAQ)

**Q: When does the next cycle appear?**
Only after the current cycle is marked paid. There is no pre-generated queue of future entries.

**Q: What carries over to the next cycle?**
The original principal, note, person name, interest settings, and recurrence settings. Payments and accrued interest reset to zero.

**Q: What happens to unpaid balance when I settle a recurring cycle?**
It is discarded. The next cycle always starts with the full original principal.
See [#2 unsupported](#unsupported-scenarios) for the carry-over spec.

**Q: What if the due date falls on the 31st but the next month is shorter?**
The anchor day (31) is stored. The next due date is clamped to the last day of the short month (e.g. Feb 28). When the following month is long enough, the 31st is restored.
See test: `[recurring] advanceRecurringDueDate`.

**Q: Can two open cycles exist for the same recurring debt?**
No. `canGenerateNextRecurringCycle` blocks generation when any unpaid cycle with the same `recurringGroupId` already exists.

**Q: Is there a "upcoming months" preview?**
No. Only one live cycle per recurring group exists at any time.

---

## Unsupported scenarios

These are confirmed gaps with tests that document current behaviour and contain the `TODO` spec for future implementation.

### 1. Split a single payment across multiple people
- **What you want:** Pay ₱1,000 for dinner, auto-create a ₱500 debt for Alice and ₱500 for Bob from one entry.
- **Current workaround:** Create two separate `owed_to_me` entries manually.
- **Test:** `[UNSUPPORTED] multi-person debt from a single payment`
- **Future spec:** `splitDebtAcross({ amount, people[] })` → linked debt records with shared `sourceGroupId`

### 2. Carry-over unpaid balance into the next recurring cycle
- **What you want:** Rent is ₱5,000/month. Tenant paid only ₱2,000 this month. Next month should open at ₱8,000 (₱5,000 new + ₱3,000 carried over).
- **Current behaviour:** Next cycle always opens at ₱5,000 regardless of partial payment history.
- **Test:** `[UNSUPPORTED] recurring debt with carry-over unpaid balance`
- **Future spec:** `buildNextRecurringCycle` reads prior cycle's `remainingMinor` and adds it to `principalMinor`

### 3. Compound interest
- **What you want:** Interest that accrues on the growing outstanding balance (interest-on-interest).
- **Current behaviour:** Simple interest only — each period adds a flat `principal × rate` amount regardless of outstanding interest.
- **Test:** `[UNSUPPORTED] compound interest`
- **Future spec:** `interestType: 'compound'` field; ledger re-bases principal each period

### 4. Multi-currency debt
- **What you want:** Record a debt in USD while your app is set to PHP.
- **Current behaviour:** No `currency` field on debt records; the app's global currency is assumed.
- **Test:** `[UNSUPPORTED] multi-currency debt`
- **Future spec:** `currency` + `conversionRate` fields on `Debt`; amounts stored in base currency minor units

### 5. Instalment / amortisation plan
- **What you want:** Borrow ₱5,000, repay ₱500/month over 10 months with a shared diminishing balance tracked automatically.
- **Current behaviour:** Recurring debt resets to the same principal every cycle; there is no shared "total owed" across cycles.
- **Test:** `[UNSUPPORTED] installment / amortisation schedule`
- **Future spec:** `InstallmentPlan` type with `totalMinor`, `instalmentCount`, linked cycle records

### 6. Future-dated debt (inactive until a start date)
- **What you want:** Create a debt now that only becomes active (and appears in balances) on a future date.
- **Current behaviour:** All created debts are immediately `pending` and counted in totals.
- **Test:** `[UNSUPPORTED] future-dated debt (starts accruing later)`
- **Future spec:** `startDate` field; `isDebtActiveOn(debt, date)` helper; balances exclude inactive debts

### 7. Interest carry-over across recurring cycles
- **What you want:** If a recurring debt with interest has unpaid interest when settled, that interest rolls into the next cycle.
- **Current behaviour:** Each new cycle starts with `accruedInterestMinor = 0`.
- **Test:** `[UNSUPPORTED] interest-on-interest (compound) for recurring cycles`
- **Future spec:** `buildNextRecurringCycle` accepts prior cycle's outstanding interest and adds it to the new cycle's starting state

---

## Running the tests

```bash
pnpm test
# or target this file only:
npx vitest run features/debts/scenarios.test.ts
```

Expected output: **65 tests, all passing**. The 7 unsupported scenario tests pass intentionally — they assert the *current* (limited) behaviour, not the desired future behaviour.
