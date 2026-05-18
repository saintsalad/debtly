# Debtly

A mobile app for tracking personal debts and splitting shared expenses with friends. Built with Expo and React Native, Debtly helps you see what you owe, what you’re owed, and how group bills balance out—offline on your device.

## Purpose

Debtly combines two workflows that usually live in separate apps:

1. **Personal ledger** — Track money you lent or borrowed (one-on-one IOUs), with due dates, partial payments, interest, and recurring entries.
2. **Group splits** — Create expense groups (trips, roommates, dinners), split bills several ways, record who paid, and settle up when balances clear.

Group balances can optionally sync into your personal transaction list so you have one place to review obligations.

## Features

### Home

- Greeting and balance **insights** (total owed to you / you owe, pending counts, entries this year). Tap the **Insights** gradient card for the full **Insights** screen (streaks, stats, group summaries).
- **Upcoming dues** and **recent activity** shortcuts into transaction detail.

### Transactions

- List of debts with search, filters, and sort (entry date, name).
- Segments: **All**, **Owed you**, **You owe**.
- Scroll-driven header (title + toolbar collapse), Journal-style search suggestions.
- Add and edit transactions; detail view with payment history, interest breakdown, reminders/share actions.
- Status handling: pending, partial, paid, overdue—with paid amounts shown struck through on list rows.
- Optional **interest** (APR, accrual frequency, start mode) and **recurring** cycles.
- Toggle in Profile: **Show split bills** to include or hide group-synced debts in this tab.

### Split bill (groups)

- Create groups, add/rename/remove members, cover photos, invite codes / deep links.
- **Add expense** with split methods: Equal, Custom (exact amounts), %, Shares, Adjust (delta from equal).
- **Record settlement** when someone pays their share.
- Group detail: balance hero, per-member balances, activity feed (expenses, edits, settlements, member changes).
- Share group summary and balance reminders (including localized SMS-style copy).
- **Print / share receipt** — thermal-style group slip (`app/group-receipt/[id]` from group detail ⋯ menu), with summed splits when the same payer and participants repeat, and settlement-aware member balances.
- Group list with search and sectioned list UI aligned with Transactions.

### Profile

- Display name, currency, light/dark appearance.
- Clear all local data.
- Offline-first indicator (data stays on device).

## Tech stack

| Area | Choice |
|------|--------|
| Framework | [Expo](https://expo.dev) ~54, [Expo Router](https://docs.expo.dev/router/introduction/) |
| UI | React Native, [HeroUI Native](https://github.com/heroui-inc/heroui-native), [Uniwind](https://uniwind.dev) (Tailwind v4) |
| State | [Zustand](https://github.com/pmndrs/zustand) + AsyncStorage persistence |
| Motion | react-native-reanimated, gesture-handler |
| Tests | Vitest (`pnpm test`) |

## Project structure

```
app/                    # Expo Router screens (tabs, group detail, transaction flows)
components/ui/          # Shared UI (glass cards, tab bar, avatars, sheets)
features/debts/         # Personal debt ledger, interest, payments, transaction UI
features/insights/       # Insights screen analytics (streaks, aggregates)
features/group-expense/ # Groups, balance engine, settlements, activity log
stores/                 # Zustand stores (debts, groups, profile)
lib/                    # Platform tokens, storage, mocks for first launch
```

## Get started

```bash
pnpm install
pnpm start
```

Then open in iOS Simulator, Android emulator, or a [development build](https://docs.expo.dev/develop/development-builds/introduction/).

Other scripts:

```bash
pnpm ios
pnpm android
pnpm lint
pnpm test
```

## Current progress

### Shipped (MVP)

- [x] Four-tab shell: Home, Transactions, Split bill, Profile
- [x] Personal debt CRUD, partial/full payments, mark paid, payment ledger
- [x] Interest and recurring debt engines
- [x] Group expense system with multi-method splits and settlement recording
- [x] Balance engine (equal, exact, %, shares, adjustment) with unit tests
- [x] Activity log and feed for group events
- [x] Group → personal ledger sync (`groupDebtSync`)
- [x] Local persistence and seed data on first launch
- [x] Glass / native-feel UI, floating pill tab bar, scroll header patterns
- [x] Deep link handler for group invite codes (local join flow)
- [x] Money input caps and validation tests
- [x] Centralized design tokens (`lib/theme/tokens.ts`) for brand, semantic colors, and chrome (tab bar, glass, shadows)
- [x] **Print receipt** for personal transactions (thermal-style share / print flow)
- [x] **Print / share receipt** for group splits (thermal slip from group ⋯ menu; SUMMARY + per-expense member lines)
- [x] **Insights** screen (`app/insights.tsx`) — streaks, yearly entry chart, tiles (paid, people, payments; group row when you have groups); opens from Home Insights card

### In progress / planned

- [ ] **SQLite** integration for fully local storage (evolve beyond AsyncStorage for scale and querying)
- [ ] **Import / export** data (backup, migrate devices, interoperability)
- [x] **Toast / in-app notifications** for successful actions (and clearer feedback elsewhere as needed)
- [ ] **WebSocket / real-time** updates for split bill groups (live activity and balances where it matters)
- [ ] **Registration page** toward authenticated accounts and **shared group state across users**
- [ ] Remote backend and multi-device sync (repository adapter stub exists; stores are local-only today)
- [ ] **Onboarding** design (first launch, progressive disclosure, empty states)
- [ ] Broader automated test coverage (UI / integration)
- [ ] Receipt attachments and richer export beyond share sheets / print
- [ ] Web polish (Expo web works but mobile is the focus)

### Legacy note

An older standalone **bill split** model (`features/bill-split`, `billSplitStore`) remains in the repo; new work uses **group expenses** (`features/group-expense`). Persisted state is migrated on load via `billSplitMigration`.

## Data & privacy

All data is stored **on device** (AsyncStorage). There is no cloud account in the current build. Use **Clear all data** in Profile to reset debts, groups, and preferences.

## License

Private project.
