# Debt Scenarios — FAQ & Coverage Reference

This document maps real-world debt situations to what the app currently supports.
Each scenario links to its test coverage in [`scenarios.test.ts`](./scenarios.test.ts).

> **Legend**
> - ✅ Supported — works today, has passing tests
> - 🚧 Partial — works with a workaround, noted limitation

---

## "They owe me" scenarios

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| 1 | Friend borrowed cash for lunch / groceries | ✅ | Basic `owed_to_me` entry with optional note |
| 2 | Covered someone's share of a group dinner or trip | ✅ | Use Bill Split group; balances sync to personal ledger |
| 3 | Lent money for a large purchase (phone, appliance) | ✅ | Single `owed_to_me` entry, add note for context |
| 4 | Paid someone's ticket or entry fee | ✅ | Same as above |
| 5 | Covered a housemate's rent or utility bill | ✅ | Partial payments supported; amount stays as remaining balance |
| 6 | Personal loan with interest (e.g. 5% APR) | ✅ | Enable "Charge interest" in form; simple or compound interest, monthly or yearly accrual |
| 7 | Personal loan with compound interest | ✅ | Enable "Charge interest" → choose **Compound**; interest re-bases each period |
| 8 | Monthly rent collection from housemate | ✅ | Enable "Recurring debt", set frequency to Monthly, set due date |
| 9 | Weekly allowance expected back | ✅ | Recurring, Weekly frequency |
| 10 | Sold something to someone on credit | ✅ | `owed_to_me` entry; use note for item description |
| 11 | Covered a coworker's share of a work trip | ✅ | Bill Split group or manual entry |
| 12 | Shared subscription split (Netflix, Spotify) | ✅ | Recurring Monthly; one cycle per billing period |
| 13 | Lent money to multiple people from one payment | ✅ | Enable **Split with others** in form; enter each name — creates one linked debt per person |
| 14 | Future debt that becomes active later | ✅ | Under **Advanced options**, set **Active from**; excluded from totals until that date |

---

## "I owe" scenarios

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| 15 | Borrowed cash from a friend for gas / transport | ✅ | Basic `i_owe` entry |
| 16 | Friend paid my share of a shared meal | ✅ | `i_owe` entry; record payments as you repay |
| 17 | Friend covered my hotel / travel share | ✅ | Bill Split group or manual `i_owe` entry |
| 18 | Borrowed money to pay a bill | ✅ | `i_owe` entry with optional due date |
| 19 | Personal loan from a family member | ✅ | `i_owe`; optional interest and due date |
| 20 | Monthly instalment on a loan (fixed amount, N payments) | ✅ | **Recurring** → **Instalment plan** → **Each payment**, number of payments, due date, frequency → **creates separate transactions upfront** with stepped due dates; carry-over unavailable |
| 21 | Borrowed from a colleague | ✅ | Same as borrowing from a friend |
| 22 | Owe back for a subscription a friend pays on my behalf | ✅ | Recurring `i_owe`, monthly |
| 23 | Owe back for a gift bought on my behalf | ✅ | `i_owe` entry with note |

---

## Recurring debt: carry-over & instalment (FAQ)

**Q: When does the next cycle appear (repeating debt without Instalment plan)?**
Only after the current cycle is marked paid. There is no pre-generated queue of future entries.

**Q: What does Instalment plan do differently?**
It creates **all payment rows upfront**—each appears as its own transaction with dues stepped by Weekly / Monthly / Yearly. Paying one off does **not** create another row. **Carry over unpaid balance** is disabled together with instalment plans.

**Q: Can unpaid balance carry into the next cycle?**
Yes. Enable **Carry over unpaid balance** when creating a recurring debt. When you mark a cycle paid, the remaining balance (including unpaid interest) is stored on that cycle and added to the next cycle's principal automatically.
See test: `[SUPPORTED] recurring debt with carry-over unpaid balance`.

**Q: How does the instalment plan work?**
Turn on **Instalment plan**, enter **number of payments**, **Each payment** (what you owe per instalment—not total financed—we don't derive it), a **due date** for payment 1, and **Repeats**. The app inserts one transaction per payment with matching schedule metadata (`n of total`). Entries share a **`recurringGroupId`** for traceability even though **`isRecurring`** is false (no spawn-on-settle).

See tests: `[SUPPORTED] instalment / amortisation plan`.

**Q: What happens to unpaid balance when I settle a recurring cycle without carry-over?**
It is discarded. The next cycle starts with the original principal unchanged.

**Q: What if the due date falls on the 31st but the next month is shorter?**
The anchor day (31) is stored. The next due date is clamped to the last day of the short month (e.g. Feb 28). When the following month is long enough, the 31st is restored.
See test: `[recurring] advanceRecurringDueDate`.

**Q: Can two unpaid rows exist for the same repeating group?**
- **Repeating debt without Instalment plan:** only one unpaid row at a time; otherwise `canGenerateNextRecurringCycle` would not spawn the next cycle.
- **Instalment plan:** yes—many unpaid rows are intentional (one per instalment).

**Q: Is there an "upcoming months" preview?**
For instalment plans, every payment is already a transaction in your list with its own due date. For repeating debt without instalment plan, still only one live cycle exists at once.

---

## Interest rules (FAQ)

**Q: How is simple interest calculated?**
`principal × (APR / 12) × months_elapsed`. Flat rate on the remaining principal.
See test: `[owed_to_me] personal loan with 12% APR interest`.

**Q: How is compound interest calculated?**
`principal × ((1 + monthly_rate)^periods − 1)`. Interest accrues on the growing outstanding balance.
See test: `[SUPPORTED] compound interest — compound formula: P × ((1+r)^n − 1)`.

**Q: When does interest start?**
Two modes selectable in the form:
- **Immediate** — starts accruing from the day the debt is created.
- **After due date** — starts accruing only if the due date passes unpaid.

**Q: Does paying early reduce the interest owed?**
Yes. Interest is only charged up to the payment date.

**Q: What order do payments apply in?**
Interest first, then principal (waterfall). A ₱65 payment on a ₱50-interest + ₱5,000-principal debt clears ₱50 interest and ₱15 principal.
See test: `payment goes to interest first, then principal (waterfall)`.

**Q: What is the maximum interest rate?**
100% APR (10,000 basis points). Higher values are rejected at input.

---

## Future-dated debt (FAQ)

**Q: What is a future-dated debt?**
A debt with an **Active from** (start) date in the future. It appears in a **Scheduled** section at the top of your transaction list, greyed out, and is excluded from balance totals until the start date arrives.
See test: `[SUPPORTED] future-dated debt (active from a start date)`.

**Q: How do I set a start date?**
In the Add Debt form, tap **Active from** and pick a date.

---

## Running the tests

```bash
pnpm test
# or target this file only:
npx vitest run features/debts/scenarios.test.ts
```

Expected output: **83 tests, all passing**.
