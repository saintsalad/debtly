# Debtly Pro — Paywall Roadmap

> **Status:** Planning · No subscription infrastructure exists yet.  
> **Last reviewed against codebase:** May 2026

This document defines the Free vs Pro feature split, lists corrections from the initial analysis, describes the required infrastructure, and provides a phased implementation plan with exact file-level callouts.

---

## Validation notes (corrections vs first draft)

These are cases where the initial analysis was wrong or incomplete after checking the actual code.

| Finding | Initial claim | Corrected fact |
|---------|--------------|----------------|
| **Thermal receipt toggle** | "Could be a Pro tease" | Already **free** in `stores/profileStore.ts` (`receiptThermalLook`). Do not gate. |
| **Receipt canvas presets** | "Several presets" | **22 presets** exist in `features/debts/receipt/receiptCanvasPresets.ts`: 12 solid colors + 10 gradients. Only the first 3–4 solids should stay free. |
| **Custom photo background** | Not mentioned | `ReceiptBackgroundSheet` already lets users pick a photo from the library — currently free. Should move to Pro. |
| **Aspect ratio presets** | Not quantified | **4 presets** in `receiptAspectPresets.ts`: `story` (9:16), `square` (1:1), `portrait34` (3:4), `portrait45` (4:5). Only 9:16 stays free. |
| **Multi-currency** | Missed entirely | `Debt` type already has `currency`, `originalAmountMinor`, `conversionRate` fields. `AddDebtScreen` sets them to `undefined` — UI not built yet. This is a ready-made Pro feature slot. |
| **Recurrence frequencies** | "Gate weekly + yearly" | All 3 frequencies (`weekly`, `monthly`, `yearly` via `RECURRENCE_OPTIONS`) are currently free. Gating is a valid policy but requires changing existing behavior — plan for it in Phase 2, not Phase 1. |
| **No isPro infrastructure** | Assumed possible | Confirmed: `profileStore.ts` has no subscription state, no `isPro` field, no purchase hooks. Must be added before any gate can work. |
| **Debt / group count limits** | "Add soft caps" | No limits exist anywhere (`debtStore`, `groupExpenseStore`). Limits are additive — safe to add without removing existing behavior. |
| **receiptUri on GroupExpense** | "Planned" | Modeled in `features/group-expense/types.ts` and persisted in `groupExpenseStore.ts`, but there is no UI for attaching photos to expenses. First-class Pro feature slot. |

---

## Free vs Pro feature matrix

### Personal debt ledger (`features/debts/`)

| Feature | Free | Pro | Code location |
|---------|------|-----|---------------|
| Add / edit / delete debts | ✅ Unlimited | — | `AddDebtScreen.tsx`, `debtStore.ts` |
| Basic amount + note + due date | ✅ | — | `AddDebtScreen.tsx` |
| Record partial / full payments | ✅ | — | `RecordPaymentSheet.tsx`, `debtStore.ts` |
| Payment ledger / history | ✅ | — | `PaymentHistorySection.tsx` |
| Payment progress bar | ✅ | — | `PaymentProgress.tsx` |
| Mark paid / mark unpaid | ✅ | — | `debtStore.ts` |
| Search, filter, sort | ✅ | — | `TransactionFilterSheet.tsx`, `transactionFilters.ts` |
| Share transaction summary | ✅ | — | `transactionActions.ts` → `buildTransactionSummary` |
| Plain share-sheet reminder | ✅ | — | `transactionActions.ts` → `sendTransactionReminder` |
| **Interest** (APR, simple/compound, accrual, start mode) | ❌ | ✅ | `AddDebtScreen.tsx` (`chargeInterest` toggle), `interestEngine.ts` |
| **Recurring debts + carry-over** | ❌ | ✅ | `AddDebtScreen.tsx` (`isRecurring` toggle), `recurringEngine.ts` |
| **Instalment plans** | ❌ | ✅ | `AddDebtScreen.tsx` (`isInstalmentPlan` toggle), `debtCalculations.ts` |
| **Split with others** (owed_to_me multi-person) | ❌ | ✅ | `AddDebtScreen.tsx` (`isSplitWithOthers` toggle) |
| **Active from** (future-dated debt) | ❌ | ✅ | `AddDebtScreen.tsx` (Advanced options `startDate`) |
| **Multi-currency** (foreign currency + rate) | ❌ | ✅ | `types.ts` fields exist, UI to be built |
| SMS deep-link reminder | ❌ | ✅ | `transactionActions.ts` → `openSmsReminder` |
| Active personal debts | Up to **30** | Unlimited | `debtStore.ts` `addDebt` (add count check) |

### Receipt sharing (`features/debts/receipt/`)

| Feature | Free | Pro | Code location |
|---------|------|-----|---------------|
| Print / share receipt (basic) | ✅ 9:16 · 3 solid presets | — | `TransactionReceiptScreen.tsx`, `PrintedReceiptShareScreen.tsx` |
| Remaining canvas presets (10 gradients + 9 solids) | ❌ | ✅ | `receiptCanvasPresets.ts` (gate by preset ID set) |
| Additional aspect ratios (1:1, 3:4, 4:5) | ❌ | ✅ | `receiptAspectPresets.ts` (gate by preset ID set) |
| Custom photo background | ❌ | ✅ | `ReceiptBackgroundSheet.tsx` → `pickReceiptBackgroundPhotoFromLibrary` |
| Watermark / "Made with Debtly" badge | Shown | Removed | Render conditionally on `isPro` |

### Group expenses (`features/group-expense/`)

| Feature | Free | Pro | Code location |
|---------|------|-----|---------------|
| Create groups | Up to **3** | Unlimited | `groupExpenseStore.ts` `createGroup` |
| Add members per group | Up to **8** | Unlimited | `groupExpenseStore.ts` `updateGroup` members array |
| Equal + exact-amount splits | ✅ | — | `AddExpenseSheet.tsx` (`equal`, `exact` tab) |
| **% / Shares / Adjust splits** | ❌ | ✅ | `AddExpenseSheet.tsx` (gate `percentage`, `shares`, `adjustment` index) |
| Record settlement | ✅ | — | `RecordSettlementSheet.tsx` |
| Activity feed | ✅ | — | `ActivityFeedItem.tsx`, `activityLog.ts` |
| Invite link / deep link | ✅ | — | `InviteMembersSheet.tsx`, `GroupInviteLinkHandler.tsx` |
| Plain group summary share | ✅ | — | `groupExpenseActions.ts` → `shareGroupSummary` |
| **Group balance SMS nudge** (humorous templates) | ❌ | ✅ | `groupExpenseActions.ts` → `openOwedBalanceSms` |
| **Thermal group receipt** (print slip) | ❌ | ✅ | `app/group-receipt/[id].tsx` |
| **Receipt photo attachments on expenses** | ❌ | ✅ | `types.ts` `receiptUri` (build attachment UI) |
| Activity history visible | Last **90 days** | Full history | `activityFeed.ts` filter (add cutoff for free) |

### Insights (`features/insights/`)

| Feature | Free | Pro | Code location |
|---------|------|-----|---------------|
| Home summary card (totals, pending, owed/owing) | ✅ | — | `app/(tabs)/index.tsx`, `InsightsCard.tsx` |
| **Full Insights screen** | ❌ | ✅ | `app/insights.tsx` → `InsightsScreen.tsx` |
| — Streak tiles (daily + weekly) | ❌ | ✅ | `InsightsScreen.tsx` streak section |
| — Yearly entries chart | ❌ | ✅ | `InsightsScreen.tsx` yearly card |
| — Paid / People / Payments tiles | ❌ | ✅ | `InsightsScreen.tsx` stats row |
| — Group summaries tile | ❌ | ✅ | `InsightsScreen.tsx` group section |

### Profile & preferences (`app/(tabs)/profile.tsx`)

| Feature | Free | Pro | Code location |
|---------|------|-----|---------------|
| Display name, currency, dark mode | ✅ | — | `profileStore.ts` |
| Thermal receipt toggle | ✅ | — | `profileStore.ts` `receiptThermalLook` — **keep free** |
| Show split bills toggle | ✅ | — | `profileStore.ts` `showSplitBillsInTransactions` |
| Clear all data | ✅ | — | `debtStore.ts` `clearAll` |
| **Import / export data** | ❌ | ✅ | To be built (`README.md` planned item) |
| **Manual backup** | ❌ | ✅ | To be built |

### Cloud & sync (planned, not yet built)

| Feature | Free | Pro | Notes |
|---------|------|-----|-------|
| Local-only offline storage | ✅ Always | — | Current behavior |
| Cloud account / registration | ❌ | ✅ | `README.md` planned item |
| Multi-device group sync | ❌ | ✅ | `repository/types.ts` stub exists |
| WebSocket live updates | ❌ | ✅ | `README.md` planned item |
| Push notifications (due, overdue, group activity) | ❌ | ✅ | To be built |

---

## Required infrastructure

Nothing below exists yet. Build these before gating any feature.

### 1. Subscription store (`stores/subscriptionStore.ts`)

```typescript
// Minimal shape — expand when connecting to a real payment SDK
interface SubscriptionState {
  isPro: boolean;
  tier: 'free' | 'pro';
  expiresAt: string | null;
  setIsPro: (isPro: boolean) => void;
}
```

Persist via `zustandStorage` (same pattern as `profileStore`).

### 2. `useSubscription()` hook (`hooks/useSubscription.ts`)

```typescript
export function useSubscription() {
  const isPro = useSubscriptionStore((s) => s.isPro);
  return { isPro };
}
```

### 3. Paywall gate component (`components/ui/ProGate.tsx`)

Wrap any Pro-only UI element. Shows the paywall sheet when `!isPro`.

```typescript
interface ProGateProps {
  children: React.ReactNode;
  /** Optional descriptive label shown in the upgrade prompt */
  feature?: string;
}
```

### 4. Paywall screen / modal (`app/paywall.tsx` or bottom sheet)

A modal showing:
- The 4 Pro benefit bullets (see below)
- Monthly / Annual pricing
- Lifetime option (launch later)
- "Maybe later" dismiss

Integrate with **RevenueCat** (`react-native-purchases`) for both App Store and Play Store in-app purchases. RevenueCat's `Purchases.purchasePackage()` → on success, `setIsPro(true)`.

### 5. `profileStore.ts` — add `isPro` alias

To avoid double-importing two stores in every screen, re-export a convenience selector from `profileStore` or add a `proEntitlements` slice once RevenueCat entitlements are loaded.

---

## Implementation phases

### Phase 1 — Infrastructure + soft limits (no purchase flow yet)

> Goal: lay the groundwork without breaking any existing feature. All gates resolve to `isPro = false` locally — features stay unlocked during development.

**Files to change:**

| File | Change |
|------|--------|
| `stores/subscriptionStore.ts` | Create (see shape above) |
| `hooks/useSubscription.ts` | Create |
| `components/ui/ProGate.tsx` | Create |
| `stores/debtStore.ts` → `addDebt` | Add `if (activeCount >= 30 && !isPro) return 'Pro required'` |
| `stores/groupExpenseStore.ts` → `createGroup` | Add `if (groupCount >= 3 && !isPro) return 'Pro required'` |
| `stores/groupExpenseStore.ts` → `updateGroup` members | Add member cap check (8 for free) |

### Phase 2 — Gate existing features

> Goal: wrap high-value features already built. No new features shipped here.

**Files to change:**

| File | Feature to gate |
|------|----------------|
| `features/debts/AddDebtScreen.tsx` | Wrap `chargeInterest`, `isRecurring`, `isInstalmentPlan`, `isSplitWithOthers`, Advanced `startDate` toggles with `<ProGate>` |
| `features/debts/transactionActions.ts` → `openSmsReminder` | Check `isPro` before opening SMS |
| `features/group-expense/AddExpenseSheet.tsx` | Disable `%`, `Shares`, `Adjust` tabs for free; show Pro badge on the tab |
| `features/group-expense/groupExpenseActions.ts` → `openOwedBalanceSms` | Check `isPro` |
| `app/(tabs)/index.tsx` → Insights card `onPress` | Replace router push with `<ProGate feature="Insights">` |
| `features/debts/receipt/PrintedReceiptShareScreen.tsx` | Gate presets beyond first 3 solids; gate aspect ratios beyond 9:16; gate custom photo |
| `app/group-receipt/[id].tsx` | Gate entire screen behind `isPro` |

**Receipt preset gate sets (define in `receiptCanvasPresets.ts`):**

```typescript
export const FREE_CANVAS_PRESET_IDS: ReceiptCanvasPresetId[] = ['black', 'slate', 'navy'];
export const FREE_ASPECT_PRESET_IDS: ReceiptAspectPresetId[] = ['story'];
```

### Phase 3 — Purchase flow

> Goal: wire in RevenueCat so users can actually pay.

1. Install `react-native-purchases` and configure App Store / Play Store products.
2. Build `app/paywall.tsx` (or a `PaywallSheet` bottom sheet).
3. On successful purchase: `setIsPro(true)` + persist.
4. On app launch: restore purchases (`Purchases.restorePurchases()`) → sync `isPro`.
5. Add "Restore purchases" row in `app/(tabs)/profile.tsx` under the About section.
6. Add "Upgrade to Pro" banner on the Home screen for free users.

### Phase 4 — Pro-exclusive new features

Build these once the purchase flow is live and validated.

| Feature | Notes |
|---------|-------|
| Multi-currency debt entry | `Debt.currency` + `conversionRate` fields exist; build the currency picker + rate input in `AddDebtScreen` |
| Receipt photo attachments on group expenses | `GroupExpense.receiptUri` field exists; build camera/library picker in `AddExpenseSheet` |
| Import / export (JSON + CSV) | Planned in `README.md`; Pro-only for full export, one free export/month |
| SQLite migration | Planned in `README.md`; no user-facing gate needed, but Pro users benefit from speed |
| Cloud sync + real-time groups | Requires backend; `IGroupExpenseRepository` remote implementation |
| Push notifications | Local first (due/overdue reminders), then server-push for group activity |
| Scheduled reminders | Auto-send balance nudges on a schedule |

---

## Paywall screen copy (suggested)

```
Debtly Pro

✦ Smart debts
   Interest, recurring payments, instalment plans, split with others

✦ Insights & analytics
   Streaks, yearly charts, paid totals, group summaries

✦ Pro splits
   Percentage, shares, and adjustment splits · unlimited groups

✦ Share & collect
   Premium receipt themes, group receipts, SMS nudge templates

✦ Coming soon
   Cloud sync across devices, push reminders, receipt attachments
```

---

## What to keep free — no exceptions

These must never be gated. Blocking access to them creates legal or trust risks and kills retention.

- Viewing any debt (owed or owing)
- Marking paid / recording settlements
- Adding a basic one-on-one debt (amount, person, note, due date)
- Equal-split group expenses
- Clearing user data (privacy)
- Invite links (needed to even join a group)
- Thermal receipt toggle (already free; do not move)

---

## Competitive reference

| App | What's Pro |
|-----|------------|
| Splitwise | Charts, currency conversion, receipt scan, simplify debts |
| Debt Manager | Export, interest, recurring |
| Spendee | Budgets, multi-currency, sync |
| **Debtly** (target) | Interest + recurring + receipts + insights + advanced splits + sync |

Our differentiation: **thermal receipts + personal + group in one offline app**. Lean into export, reminders, and analytics before cloud — those are the near-term wins.

---

## Open questions before launch

- [ ] Pricing: monthly (USD 1.99–2.99) + annual (USD 14.99–19.99) + lifetime (USD 29.99–49.99)?
- [ ] Grandfathering: will beta users get Pro free or discounted?
- [ ] "Try Pro free" trial: 7-day or 14-day?
- [ ] Which limits apply to existing users who have >30 debts / >3 groups when the gate ships? (Likely: let existing data remain but block new additions.)
- [ ] App Store review: Apple requires all IAP to go through StoreKit — ensure RevenueCat config covers this.
