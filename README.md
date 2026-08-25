# Taylored Transit — Website

A single-page, animation-led marketing site for **Taylored Transit**, a specialized
transportation company serving the bulk liquid and chemical industries.

Built with vanilla HTML/CSS/JS + **Three.js** (WebGL) and **GSAP / ScrollTrigger**.
No build step, no framework, no bundler.

---

## Live

- **Site:** https://tayloredtransit.vercel.app
- **Repo:** https://github.com/syncoretech01/tayloredtransit
- **Vercel project:** `syncore-techs-projects/tayloredtransit`

Deployed from the CLI (`vercel deploy --prod`). The repo is **not yet connected**
to the Vercel project — the automatic connect failed because the Vercel GitHub
App is not installed on the `syncoretech01` account, so pushing to `main` does
**not** redeploy on its own. To enable auto-deploys: Vercel dashboard → the
`tayloredtransit` project → Settings → Git → Connect, and authorise the GitHub
App when prompted. Until then, redeploy with `vercel deploy --prod` from this
directory.

Deployment Protection (Vercel Authentication) was disabled on this project so the
URL is publicly reachable. Re-enable it under Settings → Deployment Protection if
you want the site private again.

## Running it

ES modules and an import map are used, so it must be served over HTTP —
opening `index.html` from the filesystem will not work.

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

Any static host works for deployment (Netlify, Vercel, S3+CloudFront, nginx).
Just upload the folder as-is.

---

## Structure

```
index.html            all markup + meta/OG/JSON-LD
css/style.css         design system + every section's styling
js/main.js            interaction layer — preloader, cursor, all ScrollTriggers
js/hero-scene.js      Three.js hero: displaced "chemical core" + molecular lattice
js/tanker-scene.js    Three.js DOT-407 tanker that disassembles on scroll
assets/logo-mark.svg  vector rebuild of the logo mark
assets/favicon.svg    tab icon
```

Third-party code loads from CDN (`unpkg`): Three.js 0.160, GSAP 3.12.5 with
ScrollTrigger and ScrollToPlugin. Fonts come from Google Fonts
(Sora, Inter, JetBrains Mono, Poppins).

---

## Logo

The mark is **traced from the supplied artwork** (`IMG_0764.png` / `IMG_0765.png`),
not redrawn by hand. The PNGs were upscaled 4x to recover sub-pixel edges from the
anti-aliasing, contour-traced per colour region, and simplified. A pixel diff of
the traced SVG against the original measures **1.4% mismatch on the mark** and
**6.9% on the lockup** — all of it edge anti-aliasing, no shape drift.

- `assets/logo-lockup.svg` — mark + wordmark, full brand colour
- `assets/logo-mark.svg` — mark only, full brand colour
- `assets/favicon.svg` — mark reversed on a navy tile

Brand colours measured from the artwork: navy `#04112F`, steel `#9DAEBC`→`#93A5B4`,
arrow fold `#7E8F9C`.

**On dark chrome the mark is reversed.** The header, preloader and footer are dark,
and the logo's navy T would disappear on them, so those three inline the same paths
with the T painted `currentColor` (light). The full-colour artwork in `assets/` is
untouched. If you would rather show the exact full-colour logo in the header, the
header needs a light background — say the word and it is a small change.

## Theme

Dark chrome, light page:

- **Header and footer are dark** (`--dk-bg` #070D1E) with light type and the
  bright amber accent (`--amber-bright`).
- **Everything between is light** — `--paper` #F5F7FB — with navy brand type
  (`--ink` #0A1330, the logo navy) and a darker amber (`--amber` #C4830F) that
  holds contrast on a light surface.
- The preloader and the mobile menu are dark, so the curtain lifts from dark
  into the light page.

Colour lives in `:root` as three groups — `--paper*` / `--surface` (light
surfaces), `--ink*` (type), `--dk-*` (the dark header/footer). Nothing outside
`:root` should hardcode a brand colour.

Both WebGL scenes are tuned for the light page: the hero lattice uses normal
(not additive) blending, and the tanker sits in a bright studio environment with
a dark floor so the steel keeps its form.

## Card diagrams

The equipment and network cards carry **annotated inline-SVG diagrams**, not
photography — no stock imagery is bundled, and nothing loads from a third party.

- **Equipment cards** (`.spec`) are side elevations with a dimension line and
  callouts. Dimensions measure the **trailer or cargo box only** — a 53 ft van is
  the trailer, not the tractor-trailer combination. Capacities (2,500–7,000 gal on the tanker
  classes, 6,340 gal ISO T11) are typical figures for each class and
  should be confirmed against the equipment you actually book.
- **Network cards** (`.map`) are node-and-route schematics. Cities sit in correct
  relative positions but the diagrams are deliberately abstract — graph paper and
  nodes, no coastlines — so they are not mistaken for accurate geography. The
  amber node marks the regional hub.

Both share a small drawing language defined at the bottom of `style.css`
(`.s-*` for elevations, `.m-*` for maps). All strokes use `vector-effect:
non-scaling-stroke` so line weight holds at any card size.

If you later want photography, drop an `<img>` in place of the `<svg>` inside
`.fcard__art` / `.net__art` — the panels are already sized and bordered.

## Motion policy

The site follows one rule: **entrance reveals are never tied to scroll position.**

- Every reveal on the page is the same 14px rise + fade, fired **once** by a
  single `IntersectionObserver`, animated by CSS. Nothing re-animates on the way
  back up, and no text changes opacity while it is being read.
- **Scroll-driven motion is used in exactly two places** — the equipment
  disassembly and the network scroller — plus a slow camera drift in the hero
  that touches WebGL only, never the DOM.
- There are **3 ScrollTrigger instances** in total. Everything else is either an
  observer, a hover state, or a one-time entrance timeline.

Everything else — the capability rows, the equipment carousel, the process grid —
is driven by the user (hover, drag, click), not by the scrollbar.

If you add a section, give it `data-reveal` (reveals itself) or `data-stagger`
(reveals its direct children in sequence). Don't add a new ScrollTrigger.

## Section map

| # | Section | Motion |
|---|---------|--------|
| 01 | Hero | WebGL core + lattice, one-time entrance timeline, slow scrubbed camera drift |
| 02 | Statement | Static. Reveal only |
| 03 | Capabilities | Static. Row hover only — wash, title shift, navy arrow |
| 04 | Equipment Anatomy | **Scroll-driven** — tanker disassembles, callouts projected from 3D anchors |
| 05 | Network | **Scroll-driven** — pinned horizontal scroller; annotated lane maps |
| 06 | Performance | Counters run once on entry |
| 07 | Equipment Classes | 3D ring carousel — drag / arrows / dots / keyboard; annotated spec drawings |
| 08 | Process | Static numbered grid. Reveal only |
| 09 | Safety | CSS `position: sticky` stack. No JS |
| 10 | Request Capacity | Form states only |

Global: custom cursor, magnetic CTAs, preloader, scroll progress bar, hero
ticker, full-screen mobile menu.

## Before it goes live — replace these

These are placeholders and appear in more than one place:

- **Phone** `+1 (630) 222-6534` — set in `index.html` (nav, quote section, footer, JSON-LD)
- **Email** `dispatch@tayloredtransit.com` — quote section, footer, JSON-LD
- **Domain** `https://www.tayloredtransit.com/` — canonical + Open Graph tags
- **Form submission** — `initForm()` in `js/main.js` currently simulates a send
  with a `setTimeout`. Point it at your CRM, form service (Formspree, Basin) or
  a mail endpoint. Validation and the success/error states are already wired.
- **Open Graph image** — no `og:image` is set yet; add a 1200×630 asset and the tag.
- **Metrics** — the four figures in the Performance section (`data-count`
  attributes) should be confirmed against real operating data before publishing.

The logo in `assets/` is a vector rebuild. If you have the original vector
artwork, swap it in — the inline SVG copies in `index.html` (preloader and nav)
would need updating too.

---

## Behaviour notes

- **No WebGL?** Both 3D scenes fail closed. `documentElement` gets a `no-webgl`
  class and CSS substitutes a gradient hero backdrop and a static grid layout for
  the equipment callouts. The page stays complete.
- **Reduced motion.** `prefers-reduced-motion: reduce` collapses transitions and
  animations and skips the preloader sequence.
- **Mobile.** Below 900px the equipment section switches from projected callouts
  to one card at a time, since projected labels have no room to avoid each other.
- **Performance.** Device pixel ratio is capped (1.75 hero / 1.7 tanker); each
  scene renders only while its section is on screen; the marquee measures its
  width on resize rather than every frame; the grain overlay is static; and no
  decorative animation loops off-screen.

Verified in headless Chrome at 1440×900 and 390×844 with no console errors or
horizontal overflow.
