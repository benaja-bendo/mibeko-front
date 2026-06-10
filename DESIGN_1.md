---
name: Lex Gold
colors:
  surface: '#12131a'
  surface-dim: '#12131a'
  surface-bright: '#383940'
  surface-container-lowest: '#0c0e14'
  surface-container-low: '#1a1b22'
  surface-container: '#1e1f26'
  surface-container-high: '#282a31'
  surface-container-highest: '#33343c'
  on-surface: '#e2e1eb'
  on-surface-variant: '#cfc5b7'
  inverse-surface: '#e2e1eb'
  inverse-on-surface: '#2f3037'
  outline: '#989083'
  outline-variant: '#4c463c'
  surface-tint: '#dcc497'
  primary: '#dcc497'
  on-primary: '#3d2e0e'
  primary-container: '#a38e65'
  on-primary-container: '#362808'
  inverse-primary: '#6e5c37'
  secondary: '#c8c6c5'
  on-secondary: '#313030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#c8c6c5'
  on-tertiary: '#303030'
  tertiary-container: '#929090'
  on-tertiary-container: '#2a2a2a'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#f9dfb1'
  primary-fixed-dim: '#dcc497'
  on-primary-fixed: '#261a00'
  on-primary-fixed-variant: '#554422'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e4e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#474746'
  background: '#12131a'
  on-background: '#e2e1eb'
  surface-variant: '#33343c'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.1em
  mono-data:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  container-max: 1440px
  sidebar-width: 260px
---

## Brand & Style

This design system is engineered for high-stakes professional environments, specifically legal and executive dashboards. The aesthetic is "Prestige Technical"—combining the authority of traditional legal institutions with the precision of modern data extraction.

The style is characterized by a **Dark Minimalism** approach, utilizing a deep charcoal foundation to reduce eye strain during long hours of document review. It incorporates elements of **Corporate Modernism**, prioritizing hierarchy and legibility, while using a muted bronze palette to signal premium value and trustworthiness. Visual complexity is minimized in favor of structural clarity, using subtle borders and intentional negative space to organize information dense interfaces.

## Colors

The color strategy relies on a monochromatic dark base with a single, sophisticated metallic accent. 

- **Primary Bronze (#8C7851):** Used sparingly for primary actions, active states, and critical highlights. It represents the "human" element of high-end service.
- **Surface Architecture:** The background uses a near-black (#0F0F0F), while cards and containers use slightly elevated shades (#141414, #1A1A1A) to create depth without relying on heavy shadows.
- **Functional Neutrals:** Typography uses a tiered grayscale, starting from high-contrast off-white for headings to muted zinc for metadata and secondary labels.
- **Interactive States:** Hover states on interactive elements should shift slightly toward the gold spectrum or increase in surface luminance.

## Typography

The typography system pairs a high-performance sans-serif with a technical monospace to balance approachable reading with data precision.

- **Headlines & Body:** **Hanken Grotesk** provides a clean, contemporary feel that remains legible in dense document contexts.
- **Technical/Labels:** **JetBrains Mono** is used for all "meta" information—labels, input headers, status tags, and code-like data. This reinforces the "tech-driven" aspect of the legal platform.
- **Hierarchy:** Use all-caps for small labels to create a "tabbed" or "indexed" aesthetic typical of legal filing systems.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model optimized for desktop productivity.

- **Sidebar:** A fixed 260px left-hand navigation provides constant access to top-level modules.
- **Main Canvas:** A fluid area with a maximum content width of 1440px. Content is organized into a modular grid where cards occupy logical spans (e.g., a 2/3 wide "Ingestion" card next to a 1/3 "History" card).
- **Density:** The system uses "Professional Density"—tight enough to show significant data, but with 24px-40px of "breathing room" between major logical sections to prevent cognitive overload.
- **Gutter Strategy:** 16px horizontal gutters between adjacent cards; 24px vertical margins between stacked sections.

## Elevation & Depth

This design system avoids traditional drop shadows to maintain a flat, modern technical feel. Depth is communicated through **Tonal Tiering** and **Low-Contrast Outlines**.

- **Level 0 (Background):** #0F0F0F.
- **Level 1 (Cards/Sidebar):** #141414 with a 1px solid border of #262626.
- **Level 2 (Inputs/Active States):** #1A1A1A with a border that brightens on focus.
- **Interaction:** Rather than lifting elements on the Z-axis, interactive elements use "inner glow" or border color changes (specifically shifting to the Primary Bronze) to indicate focus.
- **Dividers:** Use subtle #262626 lines for separating content within a single container.

## Shapes

The shape language is disciplined and geometric. 

- **Containers:** Cards and primary UI containers use a 0.5rem (8px) radius to soften the technical edge without appearing overly consumer-focused.
- **Inputs & Small Elements:** Buttons and form fields use a 4px (Soft) radius to maintain a crisp, precise alignment.
- **Icons:** Use linear, 2px stroke icons to match the thin-border aesthetic of the containers.

## Components

### Buttons
- **Primary:** Solid #8C7851 background with black text. No shadow.
- **Secondary/Ghost:** Transparent background with #8C7851 border and text.
- **Action:** For "Upload" or "Process" actions, use a subtle gradient of the primary bronze to add a tactile feel.

### Input Fields
- **Default State:** #1A1A1A background, 1px border of #333333.
- **Focus State:** Border changes to #8C7851 with a very subtle outer glow (2px) of the same color.
- **Labels:** Always use the `label-caps` typography style, positioned 8px above the field.

### Cards
- Standard cards feature a 1px border (#262626) and a slightly lighter background than the canvas.
- Titles within cards should be `headline-sm` with a bottom-border divider if the card contains a complex form.

### Navigation Links
- Active state in the sidebar uses a background tint of the primary color at 10% opacity and a vertical 2px "indicator" bar on the left in solid Primary Bronze.

### Status Chips
- Small, uppercase text. Neutral statuses use gray borders; "In Progress" or "Success" uses muted bronze or gold tones to avoid the jarring look of standard "Green/Red" semantics in a prestige environment.