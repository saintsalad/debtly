# Debtly — Security & Cost-Abuse Audit

> **Status:** Open · Threat model = an authenticated user (or anyone able to sign up) abuses public Convex mutations / queries to drive up bandwidth, function-runtime, or storage cost.
> **Last reviewed against codebase:** May 2026

This file tracks the findings from the audit of `convex/` and the related upload paths in `lib/convex/`, plus the implementation checklist. Frontend submit-guards (`hooks/use-submit-guard.ts`) only protect against double-tap; everything below is about the server-side surface that a scripted client can hit directly.

---

## Implementation priority

Fix in this order — highest cost-impact first.

- [ ] **P1.** Install `@convex-dev/rate-limiter` and rate-limit the abusable mutations (covers #1, #2, #8, #12).
- [ ] **P1.** Delete orphan storage blobs on avatar/group-image changes + nightly sweep cron (covers #1).
- [ ] **P2.** Add server-side length caps on every user-supplied string and array (covers #4).
- [ ] **P2.** Cap group size (members / expenses / activity rows) and paginate `listMineFull` (covers #3, #5, #10).
- [ ] **P3.** Chunked `deleteGroup` via the scheduler (covers #6).
- [ ] **P3.** Tighten authorization on `updateExpense` / `deleteExpense` / `regenerateInvite` (covers #7).
- [ ] **P4.** Polish: #9, #11, #13, #14.

---

## 1. Critical — File storage can be filled for free

**Files:** `convex/profile.ts`, `convex/splitGroups.ts` (lines 707–784).

`generateAvatarUploadUrl` and `generateGroupImageUploadUrl` return upload URLs to any authenticated user with no quota. `ctx.storage.delete(...)` is never called anywhere in the codebase, so:

- Every avatar change orphans the previous storage blob (`profile.finalizeProfileAvatar` only patches `users.image`).
- `clearGroupImage` / `finalizeGroupImageUpload` only swap `imageStorageId`; the old blob stays.
- An attacker can `generateAvatarUploadUrl` → PUT a ~20 MB blob → never finalize → repeat. Those blobs become invisible (no `_storage` reference) and accumulate forever.
- No server-side MIME / size validation after upload.

Checklist:

- [ ] In `finalizeProfileAvatar`, read the previous `imageStorageId` and `ctx.storage.delete()` it before patching the new one.
- [ ] Store `imageStorageId` on `users` (not just the URL string) so cleanup is reliable.
- [ ] In `finalizeGroupImageUpload` and `clearGroupImage`, delete the previous `imageStorageId` blob.
- [ ] In `deleteGroup`, delete the group's `imageStorageId` blob too.
- [ ] After finalize, call `ctx.storage.getMetadata(storageId)` and reject blobs `> 512 KB` or content-type not in `{image/jpeg, image/png, image/webp}`.
- [ ] Add a scheduled cron that scans `_storage` and deletes blobs older than 24 h not referenced by `users.imageStorageId` or `splitGroups.imageStorageId`.
- [ ] Rate-limit `generateAvatarUploadUrl` and `generateGroupImageUploadUrl` (e.g. 5 / hour / user).

---

## 2. Critical — No rate limiting on any mutation

**Files:** every `mutation({...})` in `convex/`.

`rg rateLimit|@convex-dev/rate-limiter` only finds Convex Auth's internal `authRateLimits` table; the project doesn't use the `@convex-dev/rate-limiter` component. A single account can hammer:

- `createGroup`, `addExpense`, `updateExpense`, `deleteExpense`
- `addPlaceholderMember` (rewrites every existing expense — see #5)
- `recordSettlement`, `recordAllViewerPairwiseSettlements`
- `regenerateInvite` (each call writes a new invite row)
- `joinByInviteCode` (brute-force the 6-char code space)
- `generateAvatarUploadUrl`, `generateGroupImageUploadUrl`
- The `Password` provider's `signUp` flow (Convex Auth's `authRateLimits` is keyed on the identifier, which the attacker chooses)

Checklist:

- [ ] Install `@convex-dev/rate-limiter` and register it in `convex/convex.config.ts`.
- [ ] Define limits (suggested starting point):
  - [ ] `write`: token bucket, 60 / hour / user, capacity 30
  - [ ] `createGroup`: fixed window, 20 / day / user
  - [ ] `signUp`: token bucket, 5 / hour (per IP via HTTP action if possible)
  - [ ] `generateAvatarUploadUrl` / `generateGroupImageUploadUrl`: 10 / hour / user
  - [ ] `joinByInviteCode`: 30 / hour / user
- [ ] Apply the `write` limit to `addExpense`, `updateExpense`, `deleteExpense`, `recordSettlement`, `addPlaceholderMember`, `regenerateInvite`, `recordAllViewerPairwiseSettlements`, `voidRecordedSettlementsWithMember`.

---

## 3. High — `listMineFull` is an unbounded reactive subscription

**File:** `convex/splitGroups.ts:316-420`.

One `useQuery(api.splitGroups.listMineFull, ...)` in `features/group-expense/ConvexSplitGroupSync.tsx` holds a live subscription on:

- `db.get(groupId)` for every group
- `loadMembers(gid)` (`.collect()`)
- `ctx.db.get(m.userId)` per member (N+1 — flagged by `.agents/skills/convex-performance-audit/references/hot-path-rules.md`)
- All `splitGroupExpenses`, `splitGroupSettlements`, `splitGroupActivity` for every group, unpaginated

Bandwidth scales with `groups × (members + expenses + settlements + activity)`. Can hit the 8 MiB query result limit; before that it costs real money on every change push.

Checklist:

- [ ] Split `listMineFull` into multiple smaller queries:
  - [ ] `listMyGroups()` — group headers only.
  - [ ] `listGroupExpenses({ groupId, paginationOpts })` per open group.
  - [ ] `listGroupActivity({ groupId, paginationOpts })` per open group.
  - [ ] `listGroupSettlements({ groupId })` — paginate or cap.
- [ ] Subscribe to per-group queries only when the user has the group on screen.
- [ ] Dedupe `ctx.db.get(m.userId)` lookups by unique userId set (one batch read).
- [ ] Cap activity row count (or delete via cron — see #10).

---

## 4. High — String and array inputs have no application-level size caps

**Files:** `convex/schema.ts`, `convex/splitGroups.ts` (all mutations).

`v.string()` allows up to 1 MB per field; `v.array()` up to 8 192 entries. The schema and mutations rely entirely on those Convex defaults.

Attack patterns:

- 999 KB strings in `name`, `title`, `note`, `displayName` — echoed by `listMineFull` to every member.
- `receiptUri` accepts any string, so a `data:` URI can stuff a base64 image per expense.
- `memberNames` on `createGroup` allows 8 192 placeholder rows + 8 192 activity rows in a single mutation.
- `includedMemberIds` / `shares` not bounded to the actual group roster size.

Checklist (apply in every mutation that accepts these fields):

- [ ] `name` (group): max 80 chars.
- [ ] `title` (expense): max 120 chars.
- [ ] `note` (expense / settlement): max 500 chars.
- [ ] `displayName` (member / placeholder rename): max 80 chars.
- [ ] `receiptUri`: max 512 chars + reject anything not matching `^https://`.
- [ ] `memberNames` on `createGroup`: max 25 entries.
- [ ] `includedMemberIds`: max 50 (and ≤ current roster size).
- [ ] `shares`: same cap as `includedMemberIds`.
- [ ] `currency`: enforce 3 ASCII chars (already partially normalized — reject early instead of silently coercing).

---

## 5. High — `addPlaceholderMember` and `joinByInviteCode` rewrite every expense

**File:** `convex/splitGroups.ts:514-633, 831-927, 988-1108, 1110-1168`.

`reconcileExpenseSplitsWhenMemberJoins` (and `patchExpenseDocsForPlaceholderMerge`, `removeMember`'s loop) walks every expense in the group on each call. Cost is O(expenses × calls). An attacker host can push a group near the Convex per-mutation transaction limit so subsequent member joins fail forever (or burn function-runtime quota every time).

Checklist:

- [ ] Hard caps per group:
  - [ ] `members ≤ 50` — reject `addPlaceholderMember` / `joinByInviteCode` over the cap.
  - [ ] `expenses ≤ 5 000` — reject `addExpense` over the cap.
- [ ] Move expensive reconciliations (`claimPlaceholderSeat`, `recordAllViewerPairwiseSettlements`) behind a status flag + scheduled action so a single user call doesn't run unbounded work.
- [ ] Rate-limit `addPlaceholderMember` and `joinByInviteCode` per group per minute.

---

## 6. High — `deleteGroup` deletes everything in a single mutation

**File:** `convex/splitGroups.ts:786-829`.

The five `for (... await ctx.db.delete ...)` loops can blow the mutation tx limit on a busy group. Half-deleted state encourages retries (more billable runtime each time). Also doesn't delete the group's storage blob.

Checklist:

- [ ] Add a `deletedAt` flag (soft-delete) and dismiss the group from `listMineFull` immediately.
- [ ] Schedule a paginated cleanup action that deletes ≤ 100 rows per run until empty, then removes the group doc.
- [ ] Delete `imageStorageId` blob during cleanup (also covers #1).

---

## 7. High — Authorization gaps in expense / settlement mutations

**File:** `convex/splitGroups.ts:1265-1349, 1351-1392, 635-665, 1527-1587`.

These mutations only call `assertMember`, not host or "owner of this row":

- `updateExpense` — any group member can edit any expense.
- `deleteExpense` (soft) — same.
- `regenerateInvite` — any member can rotate the invite code endlessly.
- `voidRecordedSettlementsWithMember` — any party to the pair can void.

Not strictly a cost issue, but an abuse amplifier; each grief action is another billable mutation.

Checklist:

- [ ] Add `createdByMemberId` to `splitGroupExpenses` schema.
- [ ] Restrict `updateExpense` and `deleteExpense` to `createdByMemberId === viewer` OR `paidByMemberId === viewer` OR group host.
- [ ] Restrict `regenerateInvite` to the group host (`assertGroupHost`).
- [ ] Decide policy on `voidRecordedSettlementsWithMember` — likely host-only or recorder-only.

---

## 8. Medium — Signup is open and creates real DB rows per attempt

**Files:** `convex/auth.ts`, `app/create-account.tsx`.

The `Password` provider's `signUp` flow has no CAPTCHA. Convex Auth's built-in rate-limiter keys on the identifier (the synthetic email) — but the attacker picks the identifier, so each fresh username slug is a fresh bucket. Each successful signup creates `users` + `authAccounts` + verifier rows and authenticates the caller to every public mutation.

Checklist:

- [ ] Rate-limit signup at the application layer (IP-based via an HTTP action, or device-attestation token).
- [ ] Consider invite-only / email-verification gating before account creation.
- [ ] Add an explicit username-uniqueness check up front so the only safety net is not the synthetic-email collision.

---

## 9. Medium — `recordAllViewerPairwiseSettlements` does N inserts per call

**File:** `convex/splitGroups.ts:1589-1727`.

A group with 50 members + "settle all" call writes ~100 rows (settlement + activity per pair). With no rate limit a user can spam this.

Checklist:

- [ ] Rate-limit "settle all" per group per minute.
- [ ] Cap settlements created in one call to 25; force a second call beyond that.

---

## 10. Medium — `splitGroupInvites` and `splitGroupActivity` grow unbounded

**Files:** `convex/splitGroups.ts:635-665`, every mutation that writes to `splitGroupActivity`.

- `regenerateInvite` only sets `revokedAt`; revoked rows are never deleted. Any member can call it.
- `splitGroupActivity` is written on basically every mutation and only deleted via `deleteGroup`. Activity tail dominates `listMineFull` bandwidth on long-lived groups.

Checklist:

- [ ] Cron: delete `splitGroupInvites` rows with `revokedAt` older than 30 days.
- [ ] Cap activity per group (e.g. keep last 200 rows) — either trim on write, or paginate (see #3) and let cron prune.

---

## 11. Low / Medium — Server-side amount validation only for settlements, not expenses

**Files:** `convex/splitGroups.ts:1394-1525, 1170-1263`, `convex/moneyConvex.ts:8-13`.

`recordSettlement` checks `amountMinor > MAX_INPUT_AMOUNT_MINOR` and `> cap`. `addExpense` / `updateExpense` defer all validation to `validateExpenseShares`, which checks `MAX_INPUT_AMOUNT_MINOR` but doesn't reject non-finite / NaN `amount` early. `amountToMinor` returns `0` on non-finite inputs — silently coerces to zero rather than rejecting.

Checklist:

- [ ] In `addExpense` / `updateExpense`, validate `Number.isFinite(args.amount)` and `args.amount > 0` before calling `amountToMinor`.
- [ ] Throw `ConvexError` instead of silently coercing to 0.

---

## 12. Low — `joinByInviteCode` brute-force surface

**File:** `convex/splitGroups.ts:514-633` (indexed lookup is cheap, so each guess is essentially free).

6 chars from 36-char alphabet ≈ 2.18 × 10⁹ codes. With no rate limit, a script can try millions of codes and statistically land on real groups.

Checklist:

- [ ] Per-user rate limit on `joinByInviteCode` (5/min, 50/hour).
- [ ] Optionally: increase code length to 8–10 chars.
- [ ] Optionally: add an exponential cooldown after wrong guesses keyed on the user.

---

## 13. Low — Account-deletion mutation reads / writes many auth rows in one tx

**File:** `convex/account.ts`.

Currently dev-gated by `DEBTLY_ALLOW_ACCOUNT_DELETE`. When promoting to production:

Checklist:

- [ ] Wrap deletion in `scheduler.runAfter` with pagination if any list is large.
- [ ] Decide policy for `splitGroups` the user created — transfer ownership or cascade-delete (use the paginated `deleteGroup` flow from #6).
- [ ] Re-confirm the env-flag is still the right gate post-launch (probably remove the flag and replace with a confirmation flow).

---

## 14. Minor — Frontend invite-code generator uses `Math.random()`

**File:** `features/group-expense/generateInviteCode.ts`.

Only used for offline/local-only mode (Convex's `crypto.getRandomValues` is correctly used in `convex/splitGroups.ts:randomSixCharInviteCode`). Acceptable today, but worth fixing if local groups ever sync upward.

Checklist:

- [ ] Replace `Math.random()` with `expo-crypto` `getRandomBytes` when/if local invite codes are ever promoted to a server-side bucket.
