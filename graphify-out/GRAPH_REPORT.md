# Graph Report - debtly  (2026-05-12)

## Corpus Check
- 73 files · ~40,528 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 216 nodes · 436 edges · 8 communities detected
- Extraction: 80% EXTRACTED · 20% INFERRED · 0% AMBIGUOUS · INFERRED: 87 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c74aa61e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]

## God Nodes (most connected - your core abstractions)
1. `useColors()` - 35 edges
2. `projectDebtLedger()` - 17 edges
3. `buildTransactionSummary()` - 15 edges
4. `toLocalDateString()` - 14 edges
5. `useAppColorScheme()` - 14 edges
6. `useCurrency()` - 13 edges
7. `getRemainingBalance()` - 12 edges
8. `getComputedStatus()` - 11 edges
9. `getTotalPaid()` - 10 edges
10. `majorToMinor()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `CreateButton()` --calls--> `useThemeColor()`  [INFERRED]
  components/ui/AndroidTabBar.tsx → hooks/use-theme-color.ts
- `AndroidTabBar()` --calls--> `useColors()`  [INFERRED]
  components/ui/AndroidTabBar.tsx → lib/platform.ts
- `CreateButton()` --calls--> `useAddDebt()`  [INFERRED]
  components/ui/LiquidTabBar.tsx → lib/addDebtContext.tsx
- `LiquidTabBar()` --calls--> `useColors()`  [INFERRED]
  components/ui/LiquidTabBar.tsx → lib/platform.ts
- `settleDebtWithLifecycle()` --calls--> `settleDebtLedger()`  [INFERRED]
  stores/debtStore.ts → features/debts/debtLedger.ts

## Communities (26 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (14): handleSubmit(), useCurrency(), createPalette(), useCardShadow(), useColors(), formatCurrency(), useDebtSummary(), AppScreen() (+6 more)

### Community 1 - "Community 1"
Cohesion: 0.17
Nodes (25): advanceRecurringDueDate(), countAccrualPeriods(), isOnOrBefore(), isOverdueDate(), parseLocalDate(), getDebtAmountMajor(), isDebtSettled(), accrueBetweenDates() (+17 more)

### Community 2 - "Community 2"
Cohesion: 0.18
Nodes (21): getAccruedInterest(), getPrincipalAmount(), getRemainingBalance(), getTotalDue(), getTotalPaid(), getInterestAccrualLabel(), interestRateFromBps(), buildReminderMessage() (+13 more)

### Community 3 - "Community 3"
Cohesion: 0.1
Nodes (10): ParallaxScrollView(), ThemedText(), ThemedView(), useAppColorScheme(), useColorScheme(), useSyncUniwindTheme(), useThemeColor(), TransactionDetailProvider() (+2 more)

### Community 4 - "Community 4"
Cohesion: 0.16
Nodes (18): toLocalDateString(), createDebtFromInput(), migrateDebtRecord(), migrateDebts(), migratePayment(), buildInterestFields(), buildRecurringFields(), getRecurrenceLabel() (+10 more)

### Community 5 - "Community 5"
Cohesion: 0.14
Nodes (8): AddDebtProvider(), useAddDebt(), AndroidTabBar(), CreateButton(), CollapsibleHeaderProvider(), useCollapsibleHeader(), CreateButton(), LiquidTabBar()

### Community 6 - "Community 6"
Cohesion: 0.73
Nodes (5): deleteItem(), getAsyncStorage(), getWebStorage(), readItem(), writeItem()

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useColors()` connect `Community 0` to `Community 2`, `Community 3`, `Community 5`?**
  _High betweenness centrality (0.299) - this node is a cross-community bridge._
- **Why does `useAppColorScheme()` connect `Community 3` to `Community 0`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Why does `getRemainingBalance()` connect `Community 2` to `Community 0`, `Community 1`, `Community 4`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `useColors()` (e.g. with `AndroidTabBar()` and `AppScreen()`) actually correct?**
  _`useColors()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `projectDebtLedger()` (e.g. with `sumPaymentMinor()` and `resolveInterestStartDate()`) actually correct?**
  _`projectDebtLedger()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `buildTransactionSummary()` (e.g. with `getComputedStatus()` and `getRemainingBalance()`) actually correct?**
  _`buildTransactionSummary()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Are the 7 inferred relationships involving `toLocalDateString()` (e.g. with `createDebtFromInput()` and `projectDebtLedger()`) actually correct?**
  _`toLocalDateString()` has 7 INFERRED edges - model-reasoned connections that need verification._