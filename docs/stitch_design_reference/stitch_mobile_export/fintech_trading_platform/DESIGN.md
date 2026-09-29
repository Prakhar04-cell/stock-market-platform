---
name: Fintech Trading Platform
colors:
  surface: '#fcf8ff'
  surface-dim: '#dcd8e5'
  surface-bright: '#fcf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f2ff'
  surface-container: '#f0ecf9'
  surface-container-high: '#eae6f4'
  surface-container-highest: '#e4e1ee'
  on-surface: '#1b1b24'
  on-surface-variant: '#464555'
  inverse-surface: '#302f39'
  inverse-on-surface: '#f3effc'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#006e2d'
  on-secondary: '#ffffff'
  secondary-container: '#7cf994'
  on-secondary-container: '#007230'
  tertiary: '#960014'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc1d25'
  on-tertiary-container: '#ffd0cc'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#7ffc97'
  secondary-fixed-dim: '#62df7d'
  on-secondary-fixed: '#002109'
  on-secondary-fixed-variant: '#005320'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ad'
  on-tertiary-fixed: '#410004'
  on-tertiary-fixed-variant: '#930013'
  background: '#fcf8ff'
  on-background: '#1b1b24'
  surface-variant: '#e4e1ee'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  tabular-data:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  tabular-data-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  margin: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system embodies a clean, modern, and professional aesthetic tailored for a high-performance fintech trading platform. The visual narrative prioritizes clarity, speed, and absolute trustworthiness. The design style blends Corporate Modernism with subtle structural refinements—utilizing crisp hierarchy, rigorous grid alignment, and purposeful data density without visual clutter. The UI evokes a calm, authoritative, and precise emotional response, ensuring users feel entirely in control of complex financial transactions.

## Colors

The color system is purpose-built for financial trading, balancing high-contrast legibility with restrained branding. The canvas utilizes a pristine white (`#FFFFFF`) primary background paired with an off-white secondary surface (`#F7F8FA`) to delineate panels and trading modules. 

Text hierarchy relies on deep charcoal (`#111827`) for primary high-impact reading and muted gray (`#6B7280`) for secondary metadata. System status colors are uncompromisingly clear: positive gains are anchored by vibrant green (`#16A34A`), negative movements by sharp red (`#EF4444`), and interactive elements drive engagement through an assertive accent indigo (`#4F46E5`). Borders remain subtle (`#E5E7EB`) to segment data grids cleanly.

## Typography

Typography establishes an uncompromising hierarchy optimized for rapid data scanning. Inter is utilized for headlines, UI elements, and crucially, all financial figures using tabular numerals (`tnum`) to ensure vertical alignment across order books and portfolios. Manrope provides a clean, highly legible body font for extended reading, news feeds, and asset descriptions. Ensure all numeric data streams enforce tabular spacing to prevent layout jitter during live price updates.

## Layout & Spacing

The platform relies on a responsive 12-column fluid grid system engineered for high-density information displays such as trading terminals, charts, and order books. 

- **Desktop (1024px+):** Employs a 2rem outer canvas margin and 1.5rem gutters, allowing multi-column workspace customization (charts, watchlists, execution panels).
- **Tablet (768px - 1023px):** Collapses secondary sidebars into collapsible drawers, reducing outer margins to 1.5rem.
- **Mobile (<768px):** Shifts to a single-column stacked view with 1rem margins and simplified touch targets, prioritizing quick-execution trade buttons at the thumb zone.

## Elevation & Depth

Depth is conveyed through a restrained, modern layering model that avoids heavy drop shadows. 
- **Surface Tiers:** Background canvases sit at the base layer, while interactive containers (cards, dropdowns, floating modals) elevate using the secondary background (`#F7F8FA`) combined with low-contrast outlines (`#E5E7EB`).
- **Ambient Shadows:** Interactive floating elements utilize ultra-subtle, diffused shadows (`0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)`) to suggest clickability without introducing visual noise into the trading interface.

## Shapes

The design system employs a **Rounded** shape language (`roundedness: 2`), balancing structural precision with approachable modernism. 
- Standard UI containers, cards, and input fields feature a default `0.5rem` border radius.
- Larger structural panels and modals scale up to `1rem` (`rounded-lg`).
- Interactive elements like primary action buttons, status badges, and tabs utilize fully rounded pill shapes where appropriate to guide user focus toward active triggers.

## Components

### Buttons
- **Primary:** Accent indigo (`#4F46E5`) fill with white text, medium weight, rounded corners (`0.5rem`), featuring a subtle hover state darkening.
- **Secondary / Ghost:** Outlined with `#E5E7EB` border or transparent background with primary text color.
- **Destructive / Buy-Sell Actions:** Specialized trading buttons must leverage system colors (`#16A34A` for Buy/Long, `#EF4444` for Sell/Short) with high-contrast text for instantaneous split-second recognition.

### Input Fields
- Enclosed in a clean border (`#E5E7EB`), filled with `#FFFFFF` on default states, shifting to accent indigo focus rings. 
- Numeric inputs must enforce tabular numerals and right-alignment for currency amounts.

### Cards
- Constructed with white backgrounds, subtle borders, and `0.5rem` border radius. Used to encapsulate watchlists, portfolio summaries, and chart modules.

### Checkboxes & Radio Buttons
- Crisp square and circular indicators with primary accent color fills when checked, paired with label-md typography.

### Chips & Badges
- Compact pill-shaped elements used for asset tags (e.g., "BTC", "Perp"), utilizing soft secondary background tints (`#F7F8FA`) and small tabular typography.

### Specialized Fintech Components
- **Order Books:** High-density split tables with alternating row shading and micro-progress bars indicating bid/ask volume depth.
- **Ticker Tapes:** Continuous horizontal scrolling data feeds with automatic color flashing (green/red) on price ticks.