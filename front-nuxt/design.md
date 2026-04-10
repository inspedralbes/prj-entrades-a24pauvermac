# Design System: The Editorial Curator

## 1. Overview & Creative North Star

**Creative North Star: The Digital Curator**
This design system is not a framework; it is a gallery. It rejects the "app-like" density of modern SaaS in favor of the rhythmic, breathing space found in high-end cultural publications and orchestral programs. We treat every screen as a composition, where the tension between silence (white space) and statement (typography) creates a sense of prestige and timelessness.

To move beyond a "template" look, we leverage **intentional asymmetry**. Aligning a heading to the far left while the body copy sits in a narrow column to the right creates a sophisticated visual friction. We utilize high-contrast typography scales—pairing oversized, delicate serifs with minute, utilitarian sans-serifs—to signal authority and refinement.

---

## 2. Colors

The palette is rooted in a "paper and ink" philosophy. It is monochromatic, yet deep, relying on tonal shifts rather than hues to guide the eye.

### Palette Strategy
- **Primary & Tertiary (`#000000` / `#1A1A1A`):** Used for high-impact typography and key structural elements.
- **Surface & Background (`#F9F9F9`):** Our "canvas." It is never pure white, providing a softer, more tactile editorial feel.
- **Surface Tiers:** Use `surface-container-low` (`#F3F3F3`) for subtle background blocks and `surface-container-lowest` (`#FFFFFF`) for elevated cards to create depth without lines.

### The "No-Line" Rule
Prohibit the use of 1px solid borders for sectioning. Boundaries must be defined solely through background color shifts. A section using `surface-container-low` sitting against a `surface` background provides a cleaner, more sophisticated transition than a rigid line. 

### Glass & Gradient Rule
While the system is minimalist, we avoid "flatness." Use **Glassmorphism** for navigation bars or floating action elements. Use a background blur with a semi-transparent `surface` color to allow imagery to bleed through, softening the interface. Main CTAs should utilize a subtle linear gradient from `primary` to `primary-container` to give the "ink" a physical, slightly metallic depth.

---

## 3. Typography

Typography is the protagonist of this system. We use a pairing that balances heritage with modern clarity.

*   **Display & Headline (Newsreader/Serif):** These levels are the "voice" of the brand. Use `display-lg` for hero moments to create an editorial impact. The serif should feel delicate yet expansive.
*   **Body & UI (Inter/Sans-Serif):** Used for sustained reading and functional UI elements. The switch from serif to sans-serif clearly demarcates "content" from "utility."
*   **The Hierarchy of Intent:** 
    *   **Large Serifs:** Evoke emotion and prestige.
    *   **Small, All-Caps Sans-Serifs:** (Labels) Evoke archival precision and curation.

---

## 4. Elevation & Depth

In a high-end editorial system, traditional shadows are often too "digital." We use **Tonal Layering** to communicate hierarchy.

### The Layering Principle
Depth is achieved by stacking surface tiers. Place a `surface-container-lowest` (#FFFFFF) card on a `surface-container-low` (#F3F3F3) section. This creates a "paper-on-paper" effect that feels tactile and premium.

### Ambient Shadows
If a floating element (like a modal) is required, use **Ambient Shadows**. These must be extra-diffused (Blur: 40px-80px) and low-opacity (4%-6%). The shadow color should be a tinted version of `on-surface`, never a neutral grey, to mimic natural light.

### The "Ghost Border" Fallback
If accessibility requires a container boundary, use a **Ghost Border**. This is the `outline-variant` token at 15% opacity. It should be felt rather than seen. **Never use 100% opaque, high-contrast borders.**

---

## 5. Components

### Buttons
*   **Primary:** A solid black (#1A1A1A) pill or rectangle with `on-primary` text. No icons unless essential.
*   **Secondary:** The "Editorial Link." Plain text in `title-sm` (Inter) with a 1px underline that sits 4px below the descender.
*   **Tertiary:** All-caps `label-md` with generous letter spacing (0.1em).

### Input Fields
*   **Style:** A single 1px line at the bottom (`outline-variant`). No containing box.
*   **Focus:** The line transitions to `primary` (#000000). Labels use `label-sm` and sit above the line, never inside the field.

### Cards & Lists
*   **Rule:** Forbid the use of divider lines. 
*   **Execution:** Separate list items using the **Spacing Scale** (minimum 24px vertical padding). For cards, use background shifts (`surface-container`) or simply let the imagery and typography define the boundaries.

### Additional Components: The Image Gallery
*   **The "Art Frame":** All imagery should have a `surface-variant` placeholder color. Images are never rounded (use `roundedness: none` or `sm: 0.125rem`). Captions must be in `label-sm` italicized serif, placed asymmetrically below the image.

---

## 6. Do's and Don'ts

### Do
*   **Do** embrace "wasteful" space. Let a single sentence breathe in the middle of a large `surface` area.
*   **Do** use asymmetrical grids. Align text to the 2nd column of a 12-column grid and let the 1st column remain empty.
*   **Do** treat high-quality photography as a first-class UI element.

### Don't
*   **Don't** use drop shadows to create "pop." Use tonal shifts instead.
*   **Don't** use bright accent colors. The "prestige" comes from the restraint of the monochrome palette.
*   **Don't** crowd the interface. If a screen feels "busy," increase the vertical spacing by 2x.
*   **Don't** use standard "Material" or "Bootstrap" rounded corners. Keep edges sharp or very subtly softened (`sm`) to maintain a custom, architectural feel.