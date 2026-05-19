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

- Display name, optional **Convex username** (mirrored locally for UI), currency, light/dark appearance.
- **Create account** (when `EXPO_PUBLIC_CONVEX_URL` is set): Convex Auth sign-up — display name, username slug, and 6‑digit PIN; synthetic email `{username}@debtly-account.local` backs the Convex Password provider without collecting email addresses.
- Clear all local data (also clears Convex tokens when Convex is configured).
- Offline-first indicator (SQLite remains the ledger of record on device).

## Tech stack

| Area | Choice |
|------|--------|
| Framework | [Expo](https://expo.dev) ~54, [Expo Router](https://docs.expo.dev/router/introduction/) |
| UI | React Native, [HeroUI Native](https://github.com/heroui-inc/heroui-native), [Uniwind](https://uniwind.dev) (Tailwind v4) |
| State | [Zustand](https://github.com/pmndrs/zustand) + on-device [SQLite](docs/OFFLINE_STORAGE.md) ([expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/), [Drizzle ORM](https://orm.drizzle.team/)) |
| Cloud (optional) | [Convex](https://www.convex.dev) + [Convex Auth](https://labs.convex.dev/auth) (username + PIN, used for invite/account gating when configured) |
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
lib/                    # Platform tokens, storage, DB helpers
convex/                 # Convex backend: schema, Convex Auth, HTTP routes
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

Cloud auth / Convex (optional): create a Convex deployment in the dashboard, run `pnpm convex:dev` from the repo root once linked, set `EXPO_PUBLIC_CONVEX_URL` from `.env.example`, then configure Convex Auth JWT keys (`JWT_PRIVATE_KEY` / `JWKS` / site URL) per [Convex Auth manual setup](https://labs.convex.dev/auth/setup/manual).

## Current progress

### Shipped

- [x] **Home** — balance overview, upcoming dues, recent activity, shortcuts to Insights
- [x] **Personal debts** — add and edit IOUs, partial payments, payment history, mark paid / unpaid
- [x] **Smarter debts** — interest (simple or compound), recurring cycles with optional carry-over, instalment plans, split one payment across multiple people, schedule debts with a future start date
- [x] **Transactions tab** — search, filters, sort, status (pending, partial, paid, overdue), optional group balances in one list
- [x] **Group splits** — groups with members and cover photos, invite links, five split styles (equal, exact amounts, %, shares, adjust), settlements, per-person balances, activity feed
- [x] **Sharing** — transaction and group summaries, payment reminders, playful group balance SMS templates
- [x] **Thermal receipts** — share or print styled slips for a single debt or a whole group (themes, aspect ratios, optional photo background)
- [x] **Insights** — streaks, yearly activity chart, totals for paid / people / payments, group spending when you use splits
- [x] **Offline-first** — everything saved on your device in SQLite ([storage guide](docs/OFFLINE_STORAGE.md))
- [x] **Optional Convex signup** — when you configure Convex (`EXPO_PUBLIC_CONVEX_URL`), you can create a username + PIN (Convex Auth); joining others’ group invites and sharing invite codes from the app expects that login
- [x] **In-app feedback** — toasts when actions succeed

### Planned

- [x] **SQLite** — on-device database for debts, groups, profile, and bill splits ([guide](docs/OFFLINE_STORAGE.md))
- [ ] **Debtly Pro** — subscription for advanced debts, analytics, premium receipts, and pro split tools ([roadmap](docs/PRO_ROADMAP.md))
- [ ] **Cloud group sync** — move group expense state to Convex so balances match across phones (SQLite stays the offline cache)
- [ ] **Backup & export** — move or restore your data between devices
- [ ] **Receipt photos** — attach images to group expenses
- [ ] **Onboarding** — guided first launch and clearer empty states
- [ ] **Reminders** — due-date and group activity notifications

## Data & privacy

All ledger data stays **on device** in SQLite. Legacy installs are migrated once from AsyncStorage. Convex is **optional**: if configured, Convex Auth tokens are stored in the OS secure keychain (**expo-secure-store**); they never go into SQLite. Use **Clear all data** (and sign out when prompted) to reset local data and Convex session artifacts for testing.

## License

Private project.
