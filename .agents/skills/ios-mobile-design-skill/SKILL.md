# iOS Mobile Design Skill for React Native / Expo

## Scope

This skill defines how to design premium mobile interfaces in React Native / Expo using Apple Human Interface Guidelines as the primary design language across iOS and Android.

It is for:

* screen design
* navigation
* spacing systems
* typography systems
* motion and gestures
* sheets, forms, lists, and cards
* cross-platform UI that should feel iOS-native

It is not for:

* Material Design styling
* dashboard-heavy layouts
* dense enterprise UI
* Android-first visual patterns

---

## Core Principle

Design with Apple-like restraint.

The interface must feel:

* calm
* spatially balanced
* tactile
* gesture-aware
* typography-led
* content-first
* premium without excess

The system should prioritize:

1. clarity
2. hierarchy
3. spacing
4. motion quality
5. interaction fidelity

Do not decorate first. Structure first.

---

## Platform Strategy

Use iOS as the visual and interaction baseline for both platforms.

Android should inherit:

* iOS spacing rhythm
* iOS typography proportions
* iOS motion timing
* iOS modal behavior
* iOS list structure
* iOS corner softness

Only diverge for:

* hardware back behavior
* system permissions
* keyboard quirks
* safe areas
* OS-required affordances

Do not “convert” the design into Material unless a native platform constraint forces it.

---

## Visual Language

### Spacing

Use a strict spacing scale. No arbitrary values.

Recommended scale:

```ts
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  display: 40,
}
```

Default usage:

* screen horizontal padding: 16
* section spacing: 24–32
* card padding: 16–20
* compact gaps: 8–12
* major breathing room: 32–40

Whitespace is a hierarchy tool, not empty space.

---

### Radius

Use soft, controlled radii.

Recommended scale:

```ts
export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  xxl: 36,
}
```

Typical usage:

* buttons: 14–18
* cards: 18–24
* sheets: 24–36
* inputs: 14–20

Avoid sharp corners and inconsistent rounding.

---

### Shadows and Depth

Use depth sparingly.

Preferred:

* low-opacity shadows
* soft blur
* subtle lift
* layered surfaces

Avoid:

* harsh black shadows
* strong elevation stacks
* heavy Android-style depth

Depth should support hierarchy, not become decoration.

---

### Borders

Borders should be thin and quiet.

Use:

* subtle dividers
* translucent separators
* low-contrast outlines

Avoid:

* thick strokes
* excessive boxed layouts
* strong component framing

If spacing and layering are correct, borders should be minimal.

---

## Typography

Typography is the primary hierarchy mechanism.

Use a small, disciplined scale.

Recommended hierarchy:

* Large Title
* Title
* Headline
* Body
* Subheadline
* Caption

Suggested size rhythm:

* 34
* 28
* 22
* 17
* 15
* 13
* 11

Rules:

* use medium and semibold weights more often than heavy weights
* keep line lengths comfortable
* do not overuse font variants
* do not rely on color to create hierarchy
* avoid dense text blocks on mobile

Hierarchy should come from:

* size
* weight
* spacing
* alignment
* contrast

Not from ornament.

---

## Color System

Use restrained, semantic color tokens.

Core tokens:

* background
* surface
* elevatedSurface
* textPrimary
* textSecondary
* textTertiary
* border
* accent
* success
* warning
* danger

Rules:

* use neutral foundations
* reserve accent for action and emphasis
* avoid multiple competing accents
* avoid saturated backgrounds
* avoid decorative gradients unless they are functional

Dark mode should feel premium, not inverted.

---

## Layout Principles

Prefer content-first layouts.

Good layout traits:

* generous spacing
* clear alignment
* strong visual rhythm
* limited hierarchy depth
* minimal clutter
* predictable grouping

Avoid:

* overcrowded screens
* dashboard noise
* unnecessary columns on mobile
* dense cards with too much information

Mobile screens should be readable at a glance.

---

## Navigation

Navigation should feel native to iOS.

Preferred patterns:

* bottom tabs
* large title headers
* collapsible headers
* stack navigation
* modal sheets
* swipe-back gestures
* transparent or subtle navigation bars

Avoid:

* drawer-heavy navigation
* floating action navigation
* overly prominent top bars
* nested route complexity exposed in UI

Each screen should usually have one primary action.

---

## Motion

Motion must feel physical, calm, and meaningful.

Use:

* spring transitions
* smooth easing
* swipe continuity
* drag resistance
* shared spatial transitions
* momentum scrolling

Rules:

* motion should explain state change
* motion should be short and readable
* motion should never distract from content
* motion should feel native, not theatrical

Avoid:

* over-bouncy animation
* long transitions
* attention-grabbing flourishes
* unnecessary motion on every interaction

---

## Components

### Buttons

Buttons should feel tactile and confident.

Preferred:

* rounded corners
* medium height
* soft press feedback
* clear hierarchy
* minimal borders

Avoid:

* outlined-heavy styles
* excessive icons
* sharp rectangles
* aggressive shadows

Primary action must be visually dominant, but not loud.

---

### Inputs

Inputs should resemble polished iOS form fields.

Preferred:

* rounded containers
* soft background fills
* calm focus states
* large tap targets
* clear labels

Avoid:

* placeholder-only labeling
* underline-only fields
* dense forms
* harsh outlines

Use labels, helper text, and validation states with restraint.

---

### Cards

Cards should feel layered, soft, and breathable.

Preferred:

* rounded corners
* comfortable padding
* subtle shadow or surface separation
* simple internal hierarchy

Avoid:

* rigid grids
* overly packed dashboards
* loud borders
* cluttered card content

A card should read in one glance.

---

### Sheets and Modals

Use bottom sheets heavily for transient tasks.

Preferred:

* rounded top corners
* dimmed backdrop
* drag-to-dismiss
* blur when useful
* snap points when useful

This should resemble:

* Apple Maps
* Apple Music
* iOS share sheets

Avoid:

* jarring modal transitions
* full-screen interruption for minor tasks
* excessive confirmation layers

---

## Lists and Forms

Lists should be clear and grouped.

Preferred:

* sectioned groups
* row separators with low contrast
* row separators spanning the full width of the list container edge to edge, never inset by row padding or inner spacing
* consistent tap height
* left-aligned content
* clear metadata hierarchy

Forms should:

* use visible labels
* validate gently
* reduce steps
* keep actions near the keyboard zone

Avoid:

* dense enterprise form design
* tiny touch targets
* too many fields on one screen

---

## Interaction Design

Optimize for thumb reach and low friction.

Use:

* swipe actions
* pull gestures
* drag handles
* snap points
* direct manipulation
* immediate feedback

Avoid:

* confirmation spam
* multi-step friction when not necessary
* hidden destructive actions without clarity
* excessive dialogs

The user should feel in control without effort.

---

## Glass and Blur

Use blur sparingly and only when it improves hierarchy.

Appropriate uses:

* navigation overlays
* floating controls
* media controls
* bottom bars

Avoid:

* blur as decoration
* blur everywhere
* blur without purpose

Blur should support focus, not replace structure.

---

## Android Rule

On Android, preserve the same design language.

Maintain:

* iOS spacing
* iOS motion
* iOS card softness
* iOS typography
* iOS modal behavior
* iOS hierarchy discipline

Only adapt for:

* system back button
* permissions
* platform constraints
* safe area differences

Do not switch to Material styling by default.

---

## Expo / React Native Implementation Rules

### Styling

Prefer:

* centralized design tokens
* reusable primitives
* Uniwind / Tailwind where it helps
* StyleSheet for stable shared components

Avoid:

* random inline styles
* one-off spacing values
* ad hoc radius values

---

### Animation

Prefer:

* React Native Reanimated
* Gesture Handler

Motion must remain smooth and performant.

---

### Safe Areas

Always respect:

* notches
* dynamic island
* gesture areas
* system bars
* keyboard overlap

---

### Haptics

Use haptics subtly for:

* success
* confirmations
* toggles
* gesture completion
* destructive action acknowledgment

Do not overuse vibration.

---

## Design References

Primary references:

* Apple Human Interface Guidelines
* Apple Music
* Apple Wallet
* Apple Fitness
* Apple Photos
* Apple Maps
* iOS Settings
* Notion Mobile
* Linear Mobile
* Arc Search
* Airbnb iOS

Use these as interaction and structure references, not visual gimmicks.

---

## Final Standard

The product must feel:

* Apple-inspired
* minimal
* spatially disciplined
* gesture-first
* typography-first
* premium
* calm
* fluid
* cross-platform consistent

It must not feel:

* Material-inspired
* Android-native in visual style
* dashboard-heavy
* crowded
* loud
* overdesigned