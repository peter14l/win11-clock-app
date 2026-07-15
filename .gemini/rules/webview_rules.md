# WebView Development Rules

Follow these rules when working on UI elements or interactions in this hybrid application:

## 1. Mobile WebView Glassmorphism & Blur Parse Safety
- **Shorthand Syntax Avoidance**: Avoid combining multiple background images (gradients) and solid fallback colors inside a single shorthand `background` rule (e.g. `background: linear-gradient(...), rgba(...);`). This throws validation syntax exceptions in Android System WebViews (Chromium), discarding the entire background.
- **Split Properties**: Always declare background properties separately:
  ```css
  background-color: rgba(28, 28, 28, 0.72);
  background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%);
  ```
- **GPU Promotion**: Force elements containing `backdrop-filter: blur(...)` onto their own GPU compositor layer to prevent blur failures:
  ```css
  transform: translateZ(0);
  will-change: transform;
  ```

## 2. Replacing Native Select Overlays on Mobile
- Do not use standard HTML `<select>` elements. They trigger default native OS spinner overlays which break the custom Fluent aesthetic.
- Always use the custom Fluent dropdown flyout component (`createFluentDropdown`) which renders 100% styled HTML options.
- When sound selection is required, include a play preview button inside the list options that toggles preview playback without selecting or closing the menu.

## 3. Resolving Event Bubbling in Nested Card Controls
- Toggles (sliders, checkboxes, and labels) nested inside clickable parent cards must prevent click event bubble propagation.
- Always target the outer wrapper of the switch (e.g., `.fluent-switch`), call `e.stopPropagation(); e.preventDefault();`, and update the state manually in JavaScript to prevent the card container from triggering.
