---
name: High-Performance Kinetic
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1b1b1c'
  surface-container: '#202020'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353535'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c4c9ac'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#303030'
  outline: '#8e9379'
  outline-variant: '#444933'
  surface-tint: '#abd600'
  primary: '#ffffff'
  on-primary: '#283500'
  primary-container: '#c3f400'
  on-primary-container: '#556d00'
  inverse-primary: '#506600'
  secondary: '#c8c6c5'
  on-secondary: '#313030'
  secondary-container: '#4a4949'
  on-secondary-container: '#bab8b7'
  tertiary: '#ffffff'
  on-tertiary: '#2f3131'
  tertiary-container: '#e2e2e2'
  on-tertiary-container: '#636565'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c3f400'
  primary-fixed-dim: '#abd600'
  on-primary-fixed: '#161e00'
  on-primary-fixed-variant: '#3c4d00'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474646'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353535'
typography:
  display-lg:
    fontFamily: Anybody
    fontSize: 72px
    fontWeight: '800'
    lineHeight: 76px
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Anybody
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Anybody
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Anybody
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  container-max: 1440px
  gutter: 24px
---

## Brand & Style

The design system is built for a high-performance fitness ecosystem that bridges the gap between elite athletics and cutting-edge technology. The brand personality is aggressive, energetic, and premium, designed to motivate users through high-impact visuals and a focused, dark-mode-first interface. 

The aesthetic blends **High-Contrast Boldness** with **Glassmorphism**. It utilizes deep blacks and charcoals to create an infinite canvas where vibrant neon accents "pop" with maximum luminosity. The UI feels fast and responsive, echoing the movement of a high-intensity workout. Large, organic rounded corners soften the industrial edge, creating a sophisticated "tech-luxe" feel that distinguishes the product from traditional, utilitarian fitness apps.

## Colors

The palette is strictly high-contrast to ensure legibility and a sense of "always-on" energy.

- **Primary (Volt):** `#CCFF00`. This neon green is the kinetic engine of the design system. It is reserved exclusively for primary calls to action, active states, and progress indicators.
- **Surface & Background:** The base is a pure `#000000` to maximize OLED efficiency and contrast. Elevated surfaces use `#121212` and `#1E1E1E` to create depth without losing the "void" aesthetic.
- **Typography:** Headlines and primary content use pure `#FFFFFF`. Secondary text utilizes a 60% opacity white or a muted grey to maintain a clear visual hierarchy.
- **Accents:** Occasional use of glass-milled borders (white at 10-15% opacity) provides structure to containers.

## Typography

This design system uses a triple-font approach to balance impact, readability, and technical precision.

- **Headlines (Anybody):** A variable sans-serif that feels athletic and expansive. It should be used in Bold or ExtraBold weights for all major section headers and product titles.
- **Body (Hanken Grotesk):** A modern, sharp grotesque that provides excellent legibility for product descriptions and editorial content.
- **Data & Labels (JetBrains Mono):** Used for technical specs, workout stats (BPM, Weight, Reps), and utility labels. The monospaced nature emphasizes the "tech-focused" aspect of the brand.

**Scaling Note:** For mobile devices, display type should reduce significantly in size but maintain its heavy weight to ensure the "bold" brand voice remains intact.

## Layout & Spacing

The layout philosophy follows a **Fluid Grid** model with generous internal padding to allow high-definition imagery to breathe.

- **Grid:** A 12-column grid for desktop, 8-column for tablet, and 4-column for mobile. 
- **Margins:** 24px on mobile increasing to 80px+ on large desktops to create a premium "boutique" feel.
- **Rhythm:** An 8px linear scale is used for all spatial relationships. Elements should be spaced aggressively (using `lg` and `xl` tokens) to avoid a cluttered "discount e-commerce" appearance.
- **Safe Areas:** Ensure that primary action buttons (floating) maintain a 24px clearance from the bottom of the screen.

## Elevation & Depth

This design system rejects traditional shadows in favor of **Tonal Layering** and **Glassmorphism**.

1. **The Canvas:** Pure black (#000000) represents the lowest level.
2. **The Card:** Elements sit on surfaces of #121212.
3. **Glass Effects:** Floating elements (like navigation bars or quick-add-to-cart modals) use a backdrop blur of 20px-32px and a 10% opacity white fill. 
4. **Rim Lighting:** Instead of drop shadows, use a 1px solid or gradient "inner stroke" (top and left) on cards using a faint white-to-transparent gradient to simulate a light source from above. This mimics the look of high-end sports equipment.

## Shapes

The shape language is characterized by "Hyper-Radii." While the brand is aggressive, the shapes are oversized and rounded to feel modern and "bouncy."

- **Cards & Primary Containers:** Use `rounded-xl` (24px on mobile, up to 32px on desktop).
- **Buttons:** Fully pill-shaped for high-tappability and a friendly-but-fast feel.
- **Inputs:** Use `rounded-lg` (16px) to maintain a slightly more structured look than the buttons.
- **Imagery:** Product photography should always be housed in containers with matching radii to the UI cards.

## Components

- **Buttons:** Primary buttons are pill-shaped, filled with Primary Volt (#CCFF00), and use black text (Anybody Bold). Secondary buttons use a ghost style with a 2px white border or a subtle semi-transparent white fill.
- **Cards:** Product cards use the glassmorphism approach: dark grey background, no shadow, and a subtle light-grey stroke. Images within cards should have a slight zoom-in effect on hover.
- **Input Fields:** Dark charcoal backgrounds with a 1px border that glows into the Primary Volt color when focused. Use JetBrains Mono for placeholder text.
- **Chips/Badges:** Small, pill-shaped tags with high-contrast backgrounds (e.g., "NEW" or "LIMITED") using JetBrains Mono for a technical, spec-sheet feel.
- **Progress Bars:** High-visibility Volt fills against a dark grey track. For fitness tracking, use a glow effect (soft neon blur) behind the progress indicator.
- **Lists:** Clean, borderless rows with 24px vertical padding and chevron icons in 40% opacity white.