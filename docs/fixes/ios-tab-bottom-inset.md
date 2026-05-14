# iOS: extra space above floating tab bar (resolved)

## Symptom

On iOS, a band of empty space appeared above the custom floating bottom tab bar. Scrolling the transactions list showed a gap that did not match Android. With temporary layout overlays, that band matched the **`AppScreen` inner `content`** region (cyan in debug).

## Root cause

`AppScreen` applied `paddingBottom: layout.screenPaddingBottom` (~120pt) on the **`content`** wrapper for **all** tab screens. Tab children are laid out in the content box **above** that padding, so the padded strip was **never covered** by scroll views or screen chrome—it read as dead space (or showed the screen background / gradient through it).

## Fix

1. **`components/ui/AppScreen.tsx`**  
   On **iOS only**, set `content` `paddingBottom` to **`0`**. Android unchanged: still uses `layout.screenPaddingBottom` so existing screens that rely on the wrapper keep working.

2. **Move bottom inset into scrollable content on iOS** where the wrapper no longer reserves space:
   - **`app/(tabs)/transactions.tsx`** — `ScrollView` `contentContainerStyle.paddingBottom` uses `layout.screenPaddingBottom`.
   - **`app/(tabs)/bill-split.tsx`** — `FlatList` `contentContainerStyle` adds `paddingBottom: layout.screenPaddingBottom` on iOS.
   - **`app/(tabs)/profile.tsx`** — `ScrollView` `contentContainerStyle` adds the same on iOS.

3. **`app/(tabs)/index.tsx`** (home) already had bottom padding on its scroll `contentContainerStyle`; no change required.

## Related files

- `components/ui/AppScreen.tsx`
- `app/(tabs)/transactions.tsx`
- `app/(tabs)/bill-split.tsx`
- `app/(tabs)/profile.tsx`

## Note

Temporary layout-debug colors lived in `lib/layoutDebug.ts` and were removed after this was verified; this document replaces that trail.
