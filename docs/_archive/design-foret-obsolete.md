---
name: Mibeko Design System
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e4e2e1'
  on-surface: '#1b1c1c'
  on-surface-variant: '#414844'
  inverse-surface: '#303030'
  inverse-on-surface: '#f3f0ef'
  outline: '#727974'
  outline-variant: '#c1c8c2'
  surface-tint: '#436556'
  primary: '#03271a'
  on-primary: '#ffffff'
  primary-container: '#1b3d2f'
  on-primary-container: '#84a895'
  inverse-primary: '#aacfbb'
  secondary: '#8f4c31'
  on-secondary: '#ffffff'
  secondary-container: '#fda685'
  on-secondary-container: '#773a20'
  tertiary: '#142519'
  on-tertiary: '#ffffff'
  tertiary-container: '#293b2e'
  on-tertiary-container: '#91a594'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c5ebd7'
  primary-fixed-dim: '#aacfbb'
  on-primary-fixed: '#002115'
  on-primary-fixed-variant: '#2c4d3f'
  secondary-fixed: '#ffdbce'
  secondary-fixed-dim: '#ffb59a'
  on-secondary-fixed: '#370e00'
  on-secondary-fixed-variant: '#72351d'
  tertiary-fixed: '#d3e8d5'
  tertiary-fixed-dim: '#b7ccb9'
  on-tertiary-fixed: '#0e1f13'
  on-tertiary-fixed-variant: '#394b3d'
  background: '#fcf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e1'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Source Serif 4
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 32px
  body-md:
    fontFamily: Source Serif 4
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 28px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1120px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

The design system is anchored in the concepts of **Stability, Authority, and Accessibility**. It serves as a digital repository of Congolese law, requiring a visual language that feels as enduring as a leather-bound legal volume yet as efficient as a modern tool. 

The aesthetic is a refined **Corporate Minimalism**. It avoids the flighty, transient trends of "tech startups"—such as neon gradients or heavy blurs—in favor of a grounded, "Institutional" presence. The emotional goal is to provide a sense of reassurance to citizens and legal professionals alike. 

Visuals must celebrate Congolese identity through professional representation. Illustrations and imagery should feature individuals in traditional and contemporary Congolese professional attire (e.g., Abacost variations or structured local textiles) rather than generic Western business suits. The overall experience must be ultra-fast, prioritizing performance and clarity over decorative flourishes.

## Colors

The palette is inspired by natural Congolese landscapes and traditional legal archives. 

- **Primary (Deep Forest Green):** Used for navigation, primary actions, and headers to signify growth, stability, and the state.
- **Secondary (Sober Terracotta):** Used sparingly for accents, notifications, and secondary call-to-actions. It provides a warm, earth-toned contrast that remains professional.
- **Background (Cream/Off-White):** A soft, warm background that reduces eye strain during long reading sessions, differentiating the product from "stark" white corporate sites.
- **Neutral:** A range of deep charcoals rather than pure blacks, maintaining high contrast while feeling more sophisticated.

**Contrast Note:** All text/background combinations must exceed WCAG AA standards to ensure readability for all citizens, particularly in high-glare outdoor environments.

## Typography

This design system employs a hybrid typographic approach to balance utility with tradition.

- **Headlines & Interface (Inter):** Used for all functional UI elements, navigation, and titles. Inter provides a clean, neutral structure that ensures the app feels like a modern tool.
- **Legal Content (Source Serif 4):** All legislative texts, articles, and long-form documents are set in this serif face. It evokes the authoritative feel of physical law books and is optimized for deep, focused reading.

Line heights are intentionally generous (1.6x to 1.75x for body text) to accommodate technical legal terminology and improve legibility on mobile devices.

## Layout & Spacing

The layout philosophy follows a **fixed-fluid hybrid model** optimized for mobile-first delivery.

1.  **Grid:** A 12-column grid for desktop and a 4-column grid for mobile. 
2.  **Rhythm:** An 8px base unit governs all padding and margins. 
3.  **Readability:** For long-form legal text, the maximum line width is capped at 720px (centered) to prevent horizontal eye fatigue.
4.  **Performance:** Layouts are kept simple with minimal nesting to ensure fast rendering on 3G/Edge connections. Whitespace is used as a structural element to separate complex legal sections without adding heavy assets.

## Elevation & Depth

This design system avoids heavy shadows and complex blurs to maintain high performance and a serious tone. 

- **Tonal Layers:** Depth is primarily conveyed through subtle shifts in background color (e.g., a slightly darker cream for container backgrounds).
- **Low-Contrast Outlines:** Instead of shadows, UI elements like cards or input fields use 1px solid borders in a muted version of the primary green or a soft neutral grey.
- **Flat Elevation:** Active states are indicated by color fills rather than "lifting" the element. This keeps the interface feeling "printed" and stable, like a page in a ledger.

## Shapes

The shape language is **Soft**. 

A radius of 4px (`0.25rem`) is applied to buttons and input fields, providing just enough "modernity" to feel approachable without losing the professional rigor associated with sharp edges. Large containers like cards may use up to 8px, but no elements should appear "bubbly" or pill-shaped, as this detracts from the serious nature of the content.

## Components

- **Buttons:** High-contrast, solid blocks. Primary buttons use Forest Green with white text. Secondary buttons use a Forest Green outline. No gradients.
- **Legal Cards:** Used for Law Articles. These feature a Terracotta top-border (2px) to signify a "new section" and use Source Serif for the content.
- **Search Bar:** A prominent, persistent component. High-contrast border with literal "magnifying glass" icon. It is the primary way users interact with the law.
- **Chips/Tags:** Used for legal categories (e.g., "Criminal Code," "Labor Law"). These use the Terracotta color at 10% opacity with 100% opacity text for a "highlighted text" look.
- **Iconography:** Icons must be literal and monolinear. For example, a "Shield" for protection laws or "Scales" for judiciary sections. Use "Source Sans" icons or similar clean, geometric weights.
- **Inputs:** Underlined or fully boxed with a 1px border. Focus states use a 2px Deep Forest Green border. Labels are always visible (no floating labels) to ensure clarity.