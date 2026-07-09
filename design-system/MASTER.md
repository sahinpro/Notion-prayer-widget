# Prayer Time Widget — Design System

## Style
- **Platform**: Apple native UI (iOS HIG) on web
- **Visual**: Frosted glass cards over Islamic geometric wallpaper
- **Motion**: 180–280ms ease, respects `prefers-reduced-motion`

## Colors
| Token | Value | Use |
|-------|-------|-----|
| `--accent` | `#30D158` | Primary actions, active prayer |
| `--surface-elevated` | `rgba(28,28,30,0.72)` | Main card background |
| `--label-primary` | `rgba(255,255,255,0.92)` | Headings, times |
| `--label-secondary` | `rgba(255,255,255,0.55)` | Subtitles |
| `--scrim` | `rgba(0,0,0,0.45)` | Wallpaper overlay for legibility |

## Typography (DeenTab)
- **Font**: `Inter, Poppins, Segoe UI, system-ui`
- **Base**: `16px`
- **Widget title**: `text-sm font-medium` (14px)
- **City**: `text-lg font-semibold` (18px)
- **Country**: `text-sm text-white/70` (14px)
- **Next label**: `text-sm text-white/80` (14px)
- **Countdown**: `text-3xl font-mono font-bold` (30px)
- **Prayer name**: `text-base font-medium` (16px)
- **Prayer time**: `font-mono text-sm` (14px)

## Components
- `glass-card` — frosted container with blur(40px)
- `grouped-list` / `list-row` — iOS-style prayer list
- `btn-primary` / `btn-secondary` / `btn-ghost` — 44px min touch targets
- `field-input` — iOS form fields

## Anti-patterns (avoid)
- Emoji as icons
- Touch targets under 44px
- Decorative-only animation
- Hardcoded hex in components (use tokens)
- Weak scrim over busy wallpaper
