---
name: BullRun
colors:
  surface: '#f8f9fb'
  surface-dim: '#d9dadc'
  surface-bright: '#f8f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#edeef0'
  surface-container-high: '#e7e8ea'
  surface-container-highest: '#e1e2e4'
  on-surface: '#191c1e'
  on-surface-variant: '#464555'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f3'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#575e70'
  on-secondary: '#ffffff'
  secondary-container: '#d9dff5'
  on-secondary-container: '#5c6274'
  tertiary: '#005522'
  on-tertiary: '#ffffff'
  tertiary-container: '#00702f'
  on-tertiary-container: '#78f591'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#dce2f7'
  secondary-fixed-dim: '#c0c6db'
  on-secondary-fixed: '#141b2b'
  on-secondary-fixed-variant: '#404758'
  tertiary-fixed: '#7ffc97'
  tertiary-fixed-dim: '#62df7d'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005320'
  background: '#f8f9fb'
  on-background: '#191c1e'
  surface-variant: '#e1e2e4'
typography:
  headline-xl:
    fontFamily: Work Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Work Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Work Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Work Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Work Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Work Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Work Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Work Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Work Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  tabular-data:
    fontFamily: Work Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes a high-performance, information-dense, and deeply trustworthy interface for institutional-grade financial analytics and retail stock trading. The visual persona combines elite financial authority with the speed and precision of modern SaaS architecture. 

The aesthetic is anchored in a refined **Corporate / Modern** framework, optimized for rapid data comprehension, low cognitive load during high-volatility events, and absolute clarity across complex candlestick charts, order books, and portfolio metrics.

## Colors

The palette is engineered for prolonged scanning sessions in brightly lit environments, prioritizing stark legibility and immediate emotional signaling for market movements.

- **Primary (Accent):** `#4F46E5` (Indigo) drives primary interactive states, active tabs, and primary call-to-actions.
- **Secondary (Primary Text):** `#111827` (Deep Slate) anchors structural text and high-priority headings.
- **Positive (Bullish):** `#16A34A` (Emerald Green) signals upward trends, gains, and successful executions.
- **Negative (Bearish):** `#EF4444` (Rose Red) highlights market drops, losses, and critical alerts.
- **Neutrals:** Canvas background is set to pure white (`#FFFFFF`) with secondary containers and sidebars rendered in crisp light-grey (`#F7F8FA`). Borders are strictly maintained at `#E5E7EB` with muted supporting text at `#6B7280`.

## Typography

The typography stack relies on **Work Sans** for its grounded, highly professional geometric structure. Because financial interfaces rely on rapid numerical comparison, tabular lining figures (`tnum`) are enforced across all monetary values, asset tickers, percentages, and order book depths to prevent layout jitter as data streams update.

## Layout & Spacing

This design system uses a high-density **Fluid Grid** model scaled to accommodate complex multi-pane trading dashboards, real-time watchlists, and analytical charts. 

- **Gutters & Margins:** Standardized at 16px (`1rem`) column gutters to segment dense data widgets, paired with 24px (`1.5rem`) outer canvas margins.
- **Responsive Behavior:** 
  - *Desktop (1280px+):* Supports 12-column multi-pane layouts with persistent sidebar navigation and modular widget docking.
  - *Tablet (768px - 1279px):* Collapses secondary analytical panes into swipeable tabs or collapsible accordions.
  - *Mobile (< 768px):* Converts to a single-column, scrollable feed with sticky bottom execution trays and slide-over drawers for order configuration.

## Elevation & Depth

Visual hierarchy is communicated primarily through crisp, low-contrast structural borders (`#E5E7EB`) and subtle tonal background shifts rather than heavy drop shadows. 

- **Surfaces:** Cards and primary interactive modules sit on pure white (`#FFFFFF`) surfaces against the `#F7F8FA` application canvas.
- **Ambient Shadows:** Reserved strictly for floating elements such as dropdown menus, tooltips, modal dialogs, and active order configuration popovers. These shadows are ultra-diffused, low-opacity, and tinted with the primary neutral shadow to maintain a clean, flat aesthetic.

## Shapes

The design system adopts a **Soft** roundedness level (`roundedfulness: 1`), utilizing restrained corner radii to balance approachable modern consumer fintech aesthetics with institutional precision. 

- **Containers & Cards:** Standard cards and widget containers use a `0.5rem` radius.
- **Interactive Elements:** Buttons, input fields, and badges utilize a `0.25rem` to `0.375rem` radius to ensure a crisp, tactile click target without feeling overly playful.

## Components

- **Buttons:** Built with high-contrast text and distinct states. Primary actions utilize the accent indigo (`#4F46E5`), destructive actions use rose red (`#EF4444`), and secondary/ghost actions use subtle borders with hover states. Padding is compact to preserve vertical screen estate.
- **Chips & Badges:** Used extensively for ticker symbols, asset classes, and status indicators (e.g., *Filled*, *Pending*, *Short*). Positive and negative variations automatically apply emerald green and rose red backgrounds with corresponding text.
- **Lists & Tables:** Engineered for maximum data density. Table rows feature subtle hover states and strict vertical alignment utilizing tabular numbers. Sticky headers remain locked during vertical scrolling of long watchlists.
- **Checkboxes & Radio Buttons:** Clean, square-geometry inputs with high-contrast indicator dots and checkmarks for account settings and order type selection (Market vs. Limit).
- **Input Fields:** Outlined containers featuring clear floating or embedded labels, integrated prefix/suffix currency symbols (e.g., `$`, `USD`), and inline validation messaging.
- **Cards:** White containers (`#FFFFFF`) framed by light-grey borders (`#E5E7EB`), housing distinct analytical modules, portfolio summaries, and asset watchlists.
- **Specialized Financial Components:**
  - *Order Books:* Dual-sided depth charts utilizing semi-transparent fills of emerald and rose to display live bid/ask liquidity.
  - *Ticker Tapes:* Continuous horizontal marquee components optimized for real-time asset price fluctuations.
  - *Price Charts:* Integrated candlestick and line graph wrappers with crosshair cursor support and time-interval selectors (1D, 1W, 1M, 1Y, ALL).