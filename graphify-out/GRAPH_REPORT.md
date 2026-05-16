# Graph Report - debtly  (2026-05-16)

## Corpus Check
- 125 files · ~69,780 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 457 nodes · 979 edges · 17 communities detected
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 151 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a2e39505`
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
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]

## God Nodes (most connected - your core abstractions)
1. `useColors()` - 69 edges
2. `useAppColorScheme()` - 40 edges
3. `minorToMajor()` - 27 edges
4. `useCurrency()` - 23 edges
5. `majorToMinor()` - 19 edges
6. `projectDebtLedger()` - 17 edges
7. `ListDivider()` - 16 edges
8. `toLocalDateString()` - 15 edges
9. `buildTransactionSummary()` - 15 edges
10. `getComputedStatus()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `PaymentOptionRow()` --calls--> `useColors()`  [INFERRED]
  features/debts/RecordPaymentSheet.tsx → lib/platform.ts
- `matchesDueDateFilter()` --calls--> `getComputedStatus()`  [INFERRED]
  features/debts/transactionFilters.ts → lib/utils.ts
- `AvatarStack()` --calls--> `useColors()`  [INFERRED]
  components/ui/AvatarStack.tsx → lib/platform.ts
- `EmptyState()` --calls--> `useColors()`  [INFERRED]
  components/ui/EmptyState.tsx → lib/platform.ts
- `FAB()` --calls--> `useGlassBorder()`  [INFERRED]
  components/ui/FAB.tsx → lib/glassBorder.ts

## Communities (43 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (44): advanceRecurringDueDate(), countAccrualPeriods(), isOnOrBefore(), isOverdueDate(), parseLocalDate(), toLocalDateString(), createDebtFromInput(), isDebtSettled() (+36 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (24): RootLayout(), createStyles(), GroupInviteLinkHandler(), useAppColorScheme(), useSyncUniwindTheme(), accentPalette(), glassCardAccentConfig(), useGlassCardAccent() (+16 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (26): getDebtAmountMajor(), getPrincipalMajor(), minorToMajor(), formatPaymentDateTime(), getDebtPaymentsNewestFirst(), getPaymentAmountMajor(), buildGroupActivity(), formatActivityDate() (+18 more)

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (27): readDebtFormValues(), getAccruedInterest(), getPrincipalAmount(), getRemainingBalance(), getSettledDisplayAmount(), getTotalDue(), getTotalPaid(), dueUrgencyBadgeColors() (+19 more)

### Community 4 - "Community 4"
Cohesion: 0.1
Nodes (21): isMajorWithinInputCap(), sanitizeExpenseMajorInput(), sanitizePercentMajorInput(), sanitizeSignedMajorInput(), sanitizeUnsignedMajorDigits(), handleSave(), addEdge(), allocateEqualShares() (+13 more)

### Community 5 - "Community 5"
Cohesion: 0.16
Nodes (23): actorLabel(), createLogEntry(), describeExpenseChanges(), fmtMinor(), getActorMemberId(), logExpenseAdded(), logExpenseDeleted(), logExpenseEdited() (+15 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (14): ParallaxScrollView(), ThemedText(), ThemedView(), useColorScheme(), useThemeColor(), AddDebtProvider(), useAddDebt(), AndroidTabBar() (+6 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (4): useCurrency(), useCardShadow(), formatCurrency(), SummaryCard()

### Community 9 - "Community 9"
Cohesion: 0.15
Nodes (7): applyTransactionFilters(), hasActiveTransactionFilters(), matchesDueDateFilter(), filterDebtsForTransactionsTab(), buildTransactionSections(), TransactionDetailProvider(), useTransactionDetail()

### Community 10 - "Community 10"
Cohesion: 0.22
Nodes (5): GroupQuickActions(), createPalette(), useColors(), AppScreen(), ScreenBlueGradient()

### Community 11 - "Community 11"
Cohesion: 0.17
Nodes (6): buildGroupSections(), filterGroups(), StatusBarScrollFadeOverlay(), StatusBarScrollFadeProvider(), StatusBarScrollFadeStrip(), EmptyState()

### Community 12 - "Community 12"
Cohesion: 0.18
Nodes (4): handleSubmit(), useGlassInsetFill(), useGlassSeparatorColor(), ListDivider()

### Community 13 - "Community 13"
Cohesion: 0.2
Nodes (4): PaymentOptionRow(), HeaderIconButton(), IosDatePicker(), isYearRange()

### Community 15 - "Community 15"
Cohesion: 0.73
Nodes (5): deleteItem(), getAsyncStorage(), getWebStorage(), readItem(), writeItem()

## Knowledge Gaps
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useColors()` connect `Community 10` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 11`, `Community 12`, `Community 13`, `Community 14`?**
  _High betweenness centrality (0.308) - this node is a cross-community bridge._
- **Why does `useAppColorScheme()` connect `Community 1` to `Community 0`, `Community 2`, `Community 4`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`?**
  _High betweenness centrality (0.176) - this node is a cross-community bridge._
- **Why does `minorToMajor()` connect `Community 2` to `Community 0`, `Community 4`, `Community 5`, `Community 7`, `Community 12`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Are the 20 inferred relationships involving `useColors()` (e.g. with `AppScreen()` and `AvatarStack()`) actually correct?**
  _`useColors()` has 20 INFERRED edges - model-reasoned connections that need verification._
- **Are the 15 inferred relationships involving `useAppColorScheme()` (e.g. with `ScreenBlueGradient()` and `useColorScheme()`) actually correct?**
  _`useAppColorScheme()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **Are the 13 inferred relationships involving `minorToMajor()` (e.g. with `getDebtAmountMajor()` and `getRemainingBalanceMajor()`) actually correct?**
  _`minorToMajor()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `useCurrency()` (e.g. with `SummaryCard()` and `TransactionRow()`) actually correct?**
  _`useCurrency()` has 2 INFERRED edges - model-reasoned connections that need verification._