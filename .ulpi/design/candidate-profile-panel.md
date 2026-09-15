# Candidate Profile Panel Redesign

This feature binds to `.ulpi/design/DESIGN.md`. Every screen must read as the same product if placed
side by side.

## Design Read and Direction

Use the committed **industrial / signage** direction. The candidate panel should feel like a physical
credential: high-contrast crimson field, gold registration rule, stamped ID typography, and precise
alignment. This is intentionally not a generic soft card, glass panel, or three-column dashboard.

## User Flow

### Flow: Returning candidate completes profile

**Goal:** Confirm identity, scan the candidate ID, and complete biodata with minimum visual friction.

**Trigger:** Authenticated session resolves and candidate data is available.

1. Render the candidate view directly. Do not flash the public landing page during session resolution.
2. Show the credential banner: ID and copy action on the left; account identity and avatar on the
   right; controls share one baseline and never create an empty spacer column.
3. Show biodata as a ruled editorial form surface beneath the banner.
4. Selecting a custom dropdown opens a compact option list; clicking outside or Escape closes it.
5. Submit validates required name and target position, shows inline error, or shows a saved state.

### State coverage

| State | Required treatment |
|-------|--------------------|
| Session loading | Keep public content hidden; use a quiet 2-line loading placeholder in the candidate section |
| Candidate loading | Preserve banner geometry with skeleton text; do not shift the form |
| Empty profile | Empty fields remain readable; primary action is "Simpan Data" |
| Partial profile | Existing values are visible; missing fields are not visually alarming |
| Saved | Inline success strip with success green and concise confirmation |
| Validation error | Field-level message plus a top summary; focus the first invalid field |
| Session expiry | Stop document actions, show a clear re-login message, preserve unsaved form locally |
| Offline | Keep edits in memory, disable submit, show "Koneksi terputus" with retry |

## Layout Specification

### Candidate credential banner

- Full content width, no outer card wrapper around the entire candidate page.
- Background: accent crimson with a restrained darker lower edge. No decorative gradient beyond this
  two-tone field.
- Use a 2-column asymmetric grid: credential copy receives remaining space; account rail is intrinsic
  width and right-anchored.
- Padding: 28px desktop, 20px mobile. Radius: lg 18px.
- Gold 2px rule runs along the top edge as the signature.
- Candidate ID uses display type, 44-52px desktop and 32-38px mobile.
- Account rail: text block immediately adjacent to a 76-88px avatar. Name, email, and "Keluar" are
  grouped vertically; no fixed 350px rail and no spacer padding.
- Avatar is a circular credential seal with 2px ivory ring and crimson glyph fallback.
- Copy action sits under the credential hint, aligned left. It is secondary but visible.
- Remove "Pendaftaran Baru" from this panel; the panel should not contain a status pill.

### Biodata surface

- Beneath the banner, use a 1px top rule and a compact section heading.
- Two-column form on desktop, one column under 768px.
- Labels: utility face, 11px, weight 700, uppercase tracking 0.18em.
- Inputs: white surface, 1.5px border, md radius, 13px vertical padding.
- Focus: 3px translucent accent ring plus accent border.
- Use title case presentation for name and location fields but preserve underlying typed values.
- Date field retains native date picker with Indonesian locale hint.
- Custom dropdowns retain listbox semantics, outside-click close, Escape close, and visible focus.

### Documents surface

- Keep documents below biodata with a top rule, not a nested card.
- Upload state, Turnstile state, empty list, and errors use the same semantic colors as the lock.

## Component Specs

### CandidateCredentialBanner

**Purpose:** Make the authenticated candidate identity immediately scannable.

**States:** loading skeleton, populated, missing candidate ID, session expired.

**Accessibility:** banner landmark; candidate ID is selectable text; copy button has an explicit label;
avatar has alt text or `aria-label="Avatar peserta"`; focus ring is visible.

**Responsive:** desktop asymmetric grid; mobile stacks credential first, account rail second, with
account rail still compact and no horizontal overflow.

### CandidateAccountRail

**Purpose:** Group name, email, sign-out, and avatar without accidental spacing.

**Interaction:** sign-out disables during request and announces completion; avatar fallback is stable.

**Keyboard:** Tab reaches sign-out and copy controls in visual order; Enter/Space activate buttons.

### BiodataField

**Purpose:** Provide one consistent label/control/error unit.

**States:** empty, filled, focus, invalid, disabled, saving.

**Accessibility:** label is programmatically associated; errors use `aria-describedby` and are announced
through a polite live region.

### CustomSelect

**Purpose:** Replace native select chrome while preserving predictable selection behavior.

**Accessibility:** trigger has `aria-haspopup="listbox"` and `aria-expanded`; menu has `role=listbox`;
options have `role=option` and `aria-selected`; Escape closes; outside pointer closes; ArrowUp/Down
move active option; Enter selects; Home/End jump to bounds.

## Error and Edge Cases

- Long candidate names wrap to two lines without pushing the avatar offscreen.
- Long email addresses wrap or ellipsize within the rail.
- A missing avatar uses the SVG seal fallback.
- A missing status never creates an empty pill or reserved space.
- Refresh after login keeps the candidate-only surface.
- Expired Worker token shows a session error without clearing biodata.

## Pre-Flight Result

- Identity lock: PASS. All values bind to `DESIGN.md`.
- Anti-slop: PASS. No nested cards, default glass, purple glow, fake stats, or generic three-card
  layout. Signature is the stamped credential ID plus gold top rule.
- State coverage: PASS. Loading, empty, partial, saved, validation, expiry, offline, and upload states
  are specified.
- Accessibility: PASS. Focus, listbox semantics, keyboard dismissal, labels, and announcements are
  specified. Touch targets are at least 44px.
- Layout craft: PASS. Credential asymmetric grid, ruled form surface, and document list are distinct
  layout families.
- Cognitive load: PASS. One primary save action, grouped identity rail, and short choice lists.

### Scored self-critique

| Axis | Score |
|------|-------|
| Distinctiveness | 4 |
| Hierarchy and focus | 4 |
| Consistency with DESIGN.md | 4 |
| Accessibility | 3 |
| State and edge coverage | 4 |
| Copy quality | 3 |
| Restraint | 4 |
| Motion motivation | 3 |
| Total | 29/32 |

No axis is 2 or below. Copy quality is intentionally plain and can be refined during implementation
without changing the locked identity.

## Build Handoff

**Target agent:** `react-vite-tailwind-engineer`

**Instruction:** Implement exactly this spec. Theme the existing React/CSS system with the locked
tokens in `DESIGN.md`; do not redesign or re-implement the identity. Preserve all auth, biodata,
dropdown, date picker, Turnstile, and Cloudflare document behavior.

**Acceptance criteria:**

- [ ] Candidate banner has no fixed spacer rail and account controls sit immediately beside avatar.
- [ ] Candidate ID is the visual focal point and copy action remains discoverable.
- [ ] Biodata labels are bold and field spacing follows the locked 4px rhythm.
- [ ] Custom dropdowns support outside click, Escape, arrows, and screen-reader roles.
- [ ] Native date picker remains available and stored date format stays `yyyy-mm-dd`.
- [ ] Mobile layout has no horizontal overflow and all targets are at least 44px.
- [ ] Session loading never flashes the public landing page.
- [ ] `npm run build` and `git diff --check` pass.
