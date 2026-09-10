# NEBULA — Journey Through the Unknown

## Overview

NEBULA is a cinematic, single-page website built as a journey through deep space. As the visitor scrolls, they pass through seven stages — from a first signal in the dark, through nebulae and unknown worlds, into deep space, past the edge of the visible, and finally into a future built from what came before. The entire experience is driven by scroll: layers of stars, planets, particles, and light move at different speeds to create a strong, continuous sense of depth.

## Challenge

**Interactive Parallax Scrolling Page** — a webpage using parallax scrolling to create an engaging, visually layered experience, where background and foreground elements move at different speeds as the user scrolls.

## Features

- **Multi-layer parallax** — every section has 4–6 independently moving layers (distant stars, nebula wash, planets, orbital rings, particles, foreground text)
- **Smooth scrolling** with native `scroll-behavior` plus a JS fallback for reduced-motion and keyboard navigation
- **Scroll-driven animations** — position, scale, and rotation all respond to scroll progress
- **Interactive cosmic environments** — a hero planet, an exploration world with a moon and rings, a deep-space field of galaxies and geometric objects, a glowing portal, and a futuristic horizon with a perspective grid floor
- **Responsive design** tuned for 320px through 1920px, with intentional (not just scaled-down) mobile compositions
- **Subtle mouse-driven parallax** on desktop, disabled on touch devices
- **Canvas-generated starfield** — three tileable star layers at different depths, no external images
- **Custom cursor** with hover states, automatically disabled on touch
- **Scroll progress indicator** with live section tracking (`01 ── 07`)
- **Section transitions** that keep the starfield and color palette continuous, so the seven sections read as one journey
- **`prefers-reduced-motion` support** — parallax and decorative animation are disabled while all content remains fully visible and usable

## Technologies

- HTML5 (semantic structure, ARIA labelling)
- CSS3 (custom properties, gradients, clip-path, `backdrop-filter`, media queries)
- Vanilla JavaScript (no frameworks, no build step)

## Project Structure

```
NEBULA-Parallax-Experience/
│
├── index.html      → semantic markup for all 7 sections + nav + loader + cursor
├── style.css       → design tokens, layout, parallax layer styling, responsive rules
├── script.js       → parallax engine, starfield/particle generation, reveal system
└── README.md       → this file
```

## How to Run

1. Download or clone the `NEBULA-Parallax-Experience` folder.
2. Open `index.html` directly in any modern browser (double-click it, or right-click → Open With → your browser).
3. No build tools, no npm install, no server required. The only external dependency is the Google Fonts stylesheet (Space Grotesk + Inter); if it's unreachable the page still renders with system font fallbacks.

## Parallax System

Every moving layer is a plain `.parallax` element carrying a `data-speed` attribute, for example:

```html
<div class="parallax" data-speed="0.22">
  <div class="hero-planet">...</div>
</div>
```

On each animation frame, `script.js`:

1. Reads the bounding box of the element's **parent `.section`** (never the element itself, and never an already-transformed node) — this is what keeps the maths stable frame after frame instead of compounding.
2. Multiplies that box's distance from the top of the viewport by the element's `data-speed`.
3. Applies the result as `translate3d(0, offset, 0)`.

Small speeds (`0.05`–`0.2`) barely move — these are distant stars and nebula washes. Mid speeds (`0.2`–`0.4`) are planets and orbital rings. Higher speeds (`0.5`–`0.65`) are foreground particle fields. Because every layer uses a different multiplier, the scene visibly separates into depth planes as soon as the page scrolls.

The three global star layers (far / mid / near) work slightly differently: they're fixed to the viewport with a seamless, canvas-generated tile as their background image. Instead of translating freely, their offset is wrapped with `scrollY * speed % tileSize`, so they drift infinitely without ever showing a seam or running out of stars.

Elements can additionally carry `data-mouse="1.2"` to layer in a small, capped desktop-only displacement based on cursor position, combined with the scroll offset in the same transform.

## Responsive Design

Rather than shrinking the desktop composition, each breakpoint makes deliberate changes:

- **≥1024px** — full multi-layer compositions, planets partially off-canvas for a widescreen, cinematic frame.
- **768px–1024px** — planets and rings shift further off-frame so text keeps a clear left-aligned reading column.
- **≤768px** — the primary nav links collapse (logo + progress indicator remain), sections switch from centered to left-aligned text, particle counts are reduced, and heavy visual elements (planet, portal, grid floor) are resized to avoid overpowering the smaller viewport.
- **≤480px** — typography scales down to viewport-relative units, button padding tightens, and geometric decorations shrink further.

`overflow-x: hidden` on `html`/`body` plus percentage/viewport-based positioning for every decorative layer keeps the page free of horizontal scroll at any width.

## Performance

- Parallax and cursor motion only ever touch `transform` (and occasionally `opacity`), so the browser can composite them without triggering layout or paint.
- All scroll work is funneled through a single `requestAnimationFrame` loop guarded by a `ticking` flag — the scroll listener itself does no heavy work, it just requests a frame.
- The starfield is a handful of canvas-generated tile images rather than thousands of DOM nodes.
- Particle counts scale down automatically on smaller viewports.
- Section reveals use `IntersectionObserver` instead of scroll-position polling, and observers unobserve elements once they've revealed.
- `will-change: transform` is applied only to the elements that actually animate every frame.

## Challenge Submission

This project was built for the **Interactive Parallax Scrolling Page** challenge. It runs entirely client-side from `index.html` with no build step, and demonstrates layered, scroll-linked parallax as its central interaction across seven continuous, narratively connected sections.
