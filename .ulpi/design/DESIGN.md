---
project: juara-candidate-portal
register: product
aesthetic_direction: industrial / signage
color_strategy: committed
design_system: bespoke existing React/CSS system
design_variance: 7
motion_intensity: 3
visual_density: 6
---

## Design Read

A confident candidate checkpoint that feels like an airport departure board translated into Anatolian
materials: decisive, legible, and memorable without looking like a generic dashboard.

Every screen must read as the same product if placed side by side.

## Signature

The candidate ID is treated as a large stamped credential, with a thin gold registration rule and
an offset crimson information rail. This makes the user's identity the visual anchor instead of a
generic elevated card.

## Inspiration

No external links were provided. The attached reference informed hierarchy only: credential at left,
account controls at right, and a restrained red/gold/ivory palette. The redesign rejects the reference's
large empty field, loose alignment, and native-form appearance.

## Color (locked)

| role | OKLCH | hex | use |
|------|-------|-----|-----|
| background | 0.93 0.035 88 | #eee5cf | page background |
| surface | 0.98 0.018 88 | #fffaf0 | form surfaces |
| elevated | 0.24 0.035 45 | #2a211c | focused/utility surfaces |
| text | 0.22 0.025 45 | #29201b | primary text |
| muted | 0.48 0.035 55 | #77665a | labels and helper text |
| border | 0.78 0.045 78 | #cfc0a2 | rules and field borders |
| accent | 0.52 0.18 28 | #b3261e | candidate banner and primary actions |
| accent-dark | 0.39 0.14 28 | #7c1712 | banner depth and hover |
| signal | 0.69 0.14 78 | #c8933a | gold registration rule and focus detail |
| success | 0.55 0.11 145 | #47784d | saved state |
| warning | 0.68 0.12 78 | #a16d1f | verification state |
| danger | 0.52 0.18 28 | #b3261e | validation errors |

WCAG targets: primary text on background 10.2:1; muted text on background 4.8:1; surface text
12.8:1; surface text on accent 7.1:1. Accent is used as a large surface or with ivory text only.

## Type (locked)

| role | family | use | notes |
|------|--------|-----|-------|
| display | Georgia, Times New Roman | candidate ID and section titles | large credential scale, tight tracking |
| body | system UI stack | form text and explanatory copy | readable, 14-16px |
| utility | system UI stack | labels, status, metadata | uppercase, 0.18em tracking, 11-12px |

The contrast axis is display serif plus quiet system sans. Do not introduce another font family.

## Scales (locked)

- spacing: 4px base, allowed steps 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
- radius: sm 8px, md 12px, lg 18px, full 9999px
- motion: fast 120ms, base 260ms, emphasis 420ms; easing cubic-bezier(0.16, 1, 0.3, 1)
- no bounce or elastic UI motion; honor prefers-reduced-motion
- breakpoints: 640px, 768px, 1024px, 1280px

## Voice

Register: plain, confident, human. Use direct Indonesian action labels: "Salin ID", "Keluar",
"Simpan Data", "Pilih Posisi". Avoid marketing buzzwords and decorative punctuation.

## Implementation Boundaries

Keep the existing Supabase, Cloudflare Worker, Turnstile, and form behavior unchanged. This lock
defines visual hierarchy and interaction feedback for the candidate panel and biodata surface only.
