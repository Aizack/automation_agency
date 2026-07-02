---
name: Frant Premium Tech
colors:
  surface: '#12102b'
  surface-dim: '#12102b'
  surface-bright: '#383653'
  surface-container-lowest: '#0c0a25'
  surface-container-low: '#1a1833'
  surface-container: '#1e1c38'
  surface-container-high: '#292743'
  surface-container-highest: '#33324e'
  on-surface: '#e3dfff'
  on-surface-variant: '#e5beb8'
  inverse-surface: '#e3dfff'
  inverse-on-surface: '#2f2d4a'
  outline: '#ac8983'
  outline-variant: '#5c403c'
  surface-tint: '#ffb4a9'
  primary: '#ffb4a9'
  on-primary: '#690002'
  primary-container: '#d93025'
  on-primary-container: '#fff8f7'
  inverse-primary: '#bb1713'
  secondary: '#a9c7ff'
  on-secondary: '#003063'
  secondary-container: '#005db7'
  on-secondary-container: '#c6d9ff'
  tertiary: '#cdc5bc'
  on-tertiary: '#343029'
  tertiary-container: '#77726a'
  on-tertiary-container: '#fff8f2'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad5'
  primary-fixed-dim: '#ffb4a9'
  on-primary-fixed: '#410001'
  on-primary-fixed-variant: '#930004'
  secondary-fixed: '#d6e3ff'
  secondary-fixed-dim: '#a9c7ff'
  on-secondary-fixed: '#001b3d'
  on-secondary-fixed-variant: '#00468c'
  tertiary-fixed: '#e9e1d8'
  tertiary-fixed-dim: '#cdc5bc'
  on-tertiary-fixed: '#1e1b15'
  on-tertiary-fixed-variant: '#4a463f'
  background: '#12102b'
  on-background: '#e3dfff'
  surface-variant: '#33324e'
typography:
  display-lg:
    fontFamily: Outfit
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Outfit
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
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
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

This design system embodies a premium, high-octane technical aesthetic. It is engineered for a sophisticated audience that values precision and high-performance AI tools. The visual narrative transitions from the previous iteration into a more aggressive, high-contrast dark mode environment.

The style is a fusion of **Corporate Modern** and **Minimalism**, with a focused injection of vibrant energy. It utilizes deep, cinematic backgrounds paired with ultra-crisp typography and razor-sharp accents. The goal is to evoke a sense of "Frant by Diaz Lab" as an elite, dependable, and cutting-edge laboratory environment.

Key emotional pillars:
- **Commanding Presence:** High contrast between deep navies and vibrant reds.
- **Technical Rigor:** Strict adherence to grid systems and geometric clarity.
- **Premium Fluidity:** Smooth transitions and subtle depth cues that suggest a highly polished software experience.

## Colors

The palette is derived directly from the provided source image, optimized for a high-performance dark interface.

- **Primary (Vibrant Red):** Used exclusively for high-priority CTAs, active states, and critical highlights. It provides the "energy" within the dark canvas.
- **Background & Surface (Deep Navy/Charcoal):** The foundation is a rich, near-black navy (`#0D0B26`). Surface tiers use a slightly lighter charcoal-navy to create visible hierarchy without breaking the dark-mode immersion.
- **Secondary (Teal/Blue):** Reserved for data visualization, secondary metrics, and success states. It balances the heat of the red with a cool, technical precision.
- **Text & Contrast (Soft Cream):** An off-white (`#F9F1E7`) is used for primary text to reduce eye strain compared to pure white, while maintaining maximum readability against the dark background.

## Typography

This design system pairs **Outfit** for display and headlines with **Inter** for functional body text.

- **Outfit** provides a geometric, modern tech feel. It should be used for all large-scale headings to establish brand character.
- **Inter** handles the heavy lifting of UI labels, inputs, and long-form data. Its systematic nature ensures clarity in complex technical dashboards.
- **Hierarchy:** Use bold weights for headers to pop against the dark backgrounds. Use the `label-sm` (uppercase) for category headers or small data captions to reinforce the "lab" aesthetic.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a maximum container width for desktop readability. 

- **Grid:** A 12-column system is used for desktop, collapsing to 4 columns for mobile. 
- **Rhythm:** An 8px base unit drives all padding and margin decisions.
- **Density:** The design favors a spacious, "premium" feel. Elements are given room to breathe, preventing the dark interface from feeling cramped or overwhelming. 
- **Reflow:** On mobile, margins reduce to 16px, and horizontal lists may transition to vertical stacks or horizontally scrolling carousels to maintain tap-target integrity.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Low-Contrast Outlines** rather than heavy shadows.

- **Surface Tiers:** Backgrounds are `#0D0B26`. Primary cards and containers sit at `#1A1625`. 
- **Outlines:** Use subtle `1px` borders (`#2D2A3D`) to define boundaries between elements. 
- **Glassmorphism:** Use sparingly for navigation bars or floating modals. Apply a `20px` backdrop blur with a 10% opacity cream tint to create a sophisticated "frosted glass" look that retains the deep navy hue beneath.
- **Interactive Depth:** On hover, surfaces should slightly lighten or gain a subtle outer glow using a low-opacity version of the Primary Red.

## Shapes

The shape language is **Rounded** (0.5rem base) to balance the aggressive color palette with approachable usability.

- **Buttons & Inputs:** Use the base `0.5rem` (8px) radius.
- **Cards & Large Containers:** Scale up to `1rem` (16px) for a softer, more modern structural feel.
- **Icons:** Should follow a consistent stroke-based style with slightly rounded terminals to match the typography and corner radii.

## Components

- **Buttons:** 
    - *Primary:* Solid Vibrant Red with Soft Cream text. High impact.
    - *Secondary:* Outlined Soft Cream or ghost style with subtle navy hover states.
- **Input Fields:** Deep charcoal backgrounds with a 1px border. The border shifts to Primary Red or Secondary Blue on focus.
- **Chips/Badges:** Use Secondary Blue for "In Progress" or "Success" and Primary Red for "Error" or "Alert". Use a low-opacity background fill with high-opacity text.
- **Cards:** Defined by tonal elevation and a 1px border. No heavy drop shadows; use a "glow" effect if an element needs to feel active or elevated.
- **Lists:** Clean, separated by subtle 1px dividers. Use Inter for list items to ensure maximum legibility at small sizes.
- **Metrics/Data Viz:** Utilize the Secondary Blue/Teal for graphs and progress bars to create a cool, calculated contrast against the red CTAs.