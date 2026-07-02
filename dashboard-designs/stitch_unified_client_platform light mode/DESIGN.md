---
name: Crimson Slate
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#5c403c'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#916f6b'
  outline-variant: '#e6bdb8'
  surface-tint: '#bf0715'
  primary: '#b70011'
  on-primary: '#ffffff'
  primary-container: '#dc2626'
  on-primary-container: '#fff6f5'
  inverse-primary: '#ffb4ab'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#4c5b70'
  on-tertiary: '#ffffff'
  tertiary-container: '#657389'
  on-tertiary-container: '#f7f8ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad6'
  primary-fixed-dim: '#ffb4ab'
  on-primary-fixed: '#410002'
  on-primary-fixed-variant: '#93000b'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#d5e3fd'
  tertiary-fixed-dim: '#b9c7e0'
  on-tertiary-fixed: '#0d1c2f'
  on-tertiary-fixed-variant: '#3a485c'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display:
    fontFamily: Outfit
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Outfit
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Outfit
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Outfit
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Outfit
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
  margin-desktop: 32px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

This design system establishes a premium, high-fidelity light mode aesthetic that balances professional rigor with energetic brand presence. The personality is confident, precise, and sophisticated, targeting a high-end audience that values clarity and intentionality.

The visual style is **Corporate / Modern** with a focus on **Tonal Layering**. It avoids excessive decoration in favor of structural integrity. By utilizing a cool, off-white foundation contrasted against a vibrant primary red, the UI creates a focal point of action within a calm, organized environment. The atmosphere is one of reliability and premium quality, where every pixel serves a functional purpose while maintaining a distinct, high-contrast brand identity.

## Colors

The palette is anchored by a crisp, off-white (#F8FAFC) background that minimizes eye strain and provides a sophisticated canvas. 

- **Primary Red (#DC2626):** Reserved strictly for primary actions, key notifications, and brand highlights. Its vibrancy is balanced by the surrounding neutral space.
- **Deep Navy (#0F172A):** Used for primary typography and dark-mode-style components (like sidebars or footers) to provide grounding and a sense of authority.
- **Charcoal & Slate:** These shades handle secondary text, borders, and icons, creating a legible hierarchy without the harshness of pure black.
- **White (#FFFFFF):** Utilized for elevated cards and containers to create a subtle "lift" against the off-white background.

## Typography

The design system utilizes **Outfit** across all levels to maintain a clean, geometric, and modern feel. 

Typography is organized through clear contrast in weight and scale. Large display headers use a heavy weight and tighter letter spacing for a punchy, editorial look. Body text is set with generous line heights to ensure long-form readability. Labels and small metadata utilize medium weights and slightly increased tracking to ensure legibility even at reduced sizes. 

On mobile devices, headlines scale down to prevent awkward wrapping, ensuring the "premium" feel remains intact on smaller viewports.

## Layout & Spacing

The design system employs a **fluid 12-column grid** for desktop, transitioning to a **4-column grid** for mobile. 

A strict 8px spacing scale (Base 8) ensures mathematical harmony between all elements. Layouts should prioritize whitespace, creating "breathable" sections that guide the user's eye toward the primary red CTAs. 

- **Desktop:** 12 columns with 24px gutters and 32px outer margins.
- **Tablet:** 8 columns with 20px gutters and 24px outer margins.
- **Mobile:** 4 columns with 16px gutters and 16px outer margins.

Vertical rhythm is maintained using stack variables (8px, 16px, 32px), ensuring consistent grouping of related information and clear separation of distinct sections.

## Elevation & Depth

Visual hierarchy is achieved through a combination of **Tonal Layers** and **Ambient Shadows**. 

Instead of heavy shadows, this design system uses "Surface on Surface" logic. The primary background is #F8FAFC. Active components like cards or modals are set in pure White (#FFFFFF). 

To provide a premium sense of depth, use very soft, extra-diffused shadows with a slight navy tint (#0F172A at 4-8% opacity). This prevents the UI from looking "muddy" and maintains the clean, light-mode aesthetic. Outlines should be used sparingly, primarily in Slate (#E2E8F0), to define boundaries without adding visual noise.

## Shapes

The design system adheres to a consistent **Round Eight** philosophy. This choice balances the geometric precision of the Outfit typeface with a soft, approachable feel.

- **Standard Elements:** 8px (0.5rem) radius for buttons, input fields, and small chips.
- **Containers:** 16px (1rem) radius for cards and informational sections.
- **Large Surfaces:** 24px (1.5rem) radius for modals and primary content wrappers.

This roundedness level is high enough to feel contemporary and friendly, but sharp enough to maintain a professional, corporate edge.

## Components

### Buttons
- **Primary:** Solid Primary Red (#DC2626) background with White text. No border.
- **Secondary:** Transparent background with Primary Red border and text. 
- **Ghost:** Deep Navy text on a transparent background, shifting to a light grey hover state.

### Input Fields
Standard inputs use a White background with a 1px Slate (#E2E8F0) border. On focus, the border transitions to Primary Red with a subtle 2px outer glow (Red at 10% opacity).

### Cards
Cards are White (#FFFFFF) with an 8px or 16px corner radius. They use a very light ambient shadow to lift them from the off-white background. No borders are required unless the card is placed on a pure white surface.

### Chips & Tags
Used for categorization. They should feature a light Slate background with Deep Navy text, or for high-emphasis, a light Red tint background with Primary Red text.

### Selection Controls
Checkboxes and Radio buttons use the Primary Red color for the active/checked state to ensure high visibility against the light background.