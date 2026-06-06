# TaskFlow Design System

## Direction

TaskFlow now uses a bright Apple-inspired Light Glass interface across the public landing page, authentication screens, project dashboard, and Kanban board. The goal is a calm premium workspace: white and silver surfaces, graphite typography, blue actions, frosted glass, soft shadows, and restrained motion.

This is an Apple-inspired visual direction only. It does not use Apple logos, trademarks, or external image assets.

## Visual Language

- **Palette:** white `#ffffff`, soft page blue `#f8fbff`, graphite `#1d1d1f`, secondary gray `#68707d`, primary blue `#0071e3`, success green `#34c759`, warning orange `#ff9500`, error red `#ff3b30`.
- **Typography:** Apple-like system stack using `-apple-system`, `BlinkMacSystemFont`, `SF Pro Display`, and `Segoe UI` for a crisp product feel.
- **Surfaces:** translucent white panels with `backdrop-filter: blur(...)`, thin graphite borders, and layered shadows.
- **Shape:** large premium radii for glass cards and modals, pill-shaped primary actions, circular brand/avatar marks.
- **Motion:** subtle entrance animations and hover lifts only where they improve feedback.

## What Changed

- **Landing page:** added a public `/` page with French copy, premium navigation, a large TaskFlow product mockup, feature cards, and final CTA.
- **Auth pages:** login and register now use bright glass cards, graphite text, blue focus states, and accessible error colors.
- **Projects page:** updated the app shell, user header, project cards, empty/loading/error states, and project/member modals to match the Light Glass system.
- **Kanban page:** updated the board shell, sticky header, frosted columns, task cards, priority colors, loading state, and retry state.
- **Routing:** `/` now shows the landing page, unknown routes return home, and login/register success routes go to `/projects`.
- **Global base:** changed the body background and color scheme from dark to light so all screens start from the same system direction.

## Interaction Notes

- Primary actions use blue pill buttons with a small lift on hover.
- Inputs use white glass fields with a blue focus ring.
- Modals use a soft blurred overlay and white translucent cards.
- Dashboard headers stay sticky so user/account actions remain reachable.
- Mobile layouts stack cards, headers, modals, and Kanban columns to prevent overlap.

## Files Updated

- `src/app/components/landing/landing.component.html`
- `src/app/components/landing/landing.component.css`
- `src/app/components/login/login.component.css`
- `src/app/components/register/register.component.css`
- `src/app/components/projects/projects.component.css`
- `src/app/components/kanban/kanban.component.css`
- `src/app/app.routes.ts`
- `src/styles.css`
- `src/app/components/login/login.component.ts`
- `src/app/components/register/register.component.ts`
