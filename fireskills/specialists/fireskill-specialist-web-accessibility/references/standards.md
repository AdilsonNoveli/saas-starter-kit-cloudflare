# Web Accessibility Standards

## Scope and Compliance

Document prior to conducting audits:

- Applicable WCAG specification and target conformance level, typically WCAG 2.2 A/AA;
- Pages, states, language locales, and flows included in evaluation;
- Supported browsers, viewports, and representative assistive technologies;
- Third-party content or integrations outside direct control;
- Audit methodology, date, concrete evidence, and limitations.

Compliance is evaluated over complete pages and end-to-end processes within scope.
An isolated component or automated scanner does not prove workflow compliance.

## Common WCAG Success Criteria Matrix

| Surface | Criteria and Practical Evidence |
| --- | --- |
| Structure | 1.3.1 / 1.3.2: Semantic landmarks, headings, labels, and meaningful DOM sequence |
| Contrast | 1.4.3 / 1.4.11: Measured text, controls, focus indicators, and graphical objects |
| Resize / Reflow | 1.4.4 / 1.4.10 / 1.4.12: 200% text zoom, 320 CSS px reflow, and text spacing overrides |
| Keyboard / Focus | 2.1.1 / 2.1.2, 2.4.3 / 2.4.7 / 2.4.11: No traps, logical order, visible unobscured focus |
| Pointer | 2.5.1 / 2.5.2 / 2.5.7 / 2.5.8: Pointer alternatives, cancellation, and target size |
| Forms | 3.3.1 – 3.3.8: Error identification, suggestions, prevention, and accessible authentication |
| Widgets | 4.1.2: Calculated accessible names, roles, values, and states |
| Status Messages | 4.1.3: Asynchronous updates announced via live regions without moving focus |

Consult normative WCAG text and Understanding documents when evaluating exceptions;
this matrix acts as a routing index, not a substitute for the standard.

## Component Contracts

### Dialog / Modal

- Trigger button provides a clear, descriptive accessible name;
- Focus moves inside the modal to an element coherent with the task;
- `Tab` and `Shift+Tab` remain trapped within the modal content;
- `Escape` closes the overlay without destroying unsaved work without confirmation;
- Heading names the dialog (`aria-labelledby`) and focus restores to the original trigger upon close.

### Menu, Disclosure, and Tabs

Do not conflate interaction patterns. An expandable navigation tree is typically a disclosure
pattern, not an application menu. Implement APG keyboard shortcuts and roles only when the
chosen role matches the full pattern behavior.

### Combobox

Keep input value, active option, popup listbox, and expanded state synchronized.
Autocomplete must not block free-form text input when the contract allows unlisted values.

### Forms

- `label` elements are visible and programmatically associated with inputs (`for`/`id`);
- Format instructions and examples precede validation errors;
- Use `aria-describedby` to link helper text and validation error messages;
- Provide contextual inline errors and an accessible error summary for multi-field forms;
- Preserve valid user input upon submission failure and move focus only when aiding recovery.

## Dynamic Content and Live Regions

- Use `role="status"` / `aria-live="polite"` for non-intrusive confirmation messages; reserve
  assertive alerts for urgent, safety-critical messages.
- Never announce keystrokes, trivial background progress, or repetitive updates.
- Following client-side SPA navigation, update the document title and reposition focus
  to communicate the new page context.
- When removing focused elements from the DOM, redirect focus to a predictable, nearby sibling.
- Loading indicators must convey progress without rendering the entire UI inert indefinitely.

## Visual and Input Standards

- Normal text AA contrast: at least 4.5:1; large text (18pt+ or 14pt+ bold): at least 3:1.
- UI components and essential graphical objects: at least 3:1 against adjacent colors.
- Reflow: test at 320 CSS px width for vertical scrolling without two-dimensional scrollbars,
  respecting normative exceptions (e.g., data tables).
- Minimum target size (WCAG 2.2 AA): 24 by 24 CSS px or sufficient spacing offsets.
- Never require complex gestures, drag-and-drop, device orientation, or path-based gestures
  as the sole interaction method.
- Honor `prefers-reduced-motion` and verify forced-colors modes without stripping focus outlines.

## Test Matrix

1. Keyboard-only navigation: Tab, Shift+Tab, Enter, Space, Escape, and arrow keys per widget specification;
2. Browser zoom and viewport reflow without hiding content in clipped overflow;
3. Calculated contrast measurements and forced colors inspection;
4. Accessibility tree verification for computed name, role, state, and relations;
5. Automated rules engine (axe/linter) for detectable violation classes;
6. Screen reader testing with supported browser pairs across critical user flows;
7. Long text stress testing, translations, errors, loading states, and permission denials.

Document findings by WCAG criterion including reproduction steps, user impact, DOM
selector location, proposed remediation, and re-test evidence.

## Primary Sources

- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Understanding WCAG 2.2: https://www.w3.org/WAI/WCAG22/understanding/
- WAI-ARIA 1.2: https://www.w3.org/TR/wai-aria-1.2/
- ARIA Authoring Practices Guide (APG): https://www.w3.org/WAI/ARIA/apg/
- HTML Accessibility API Mappings: https://www.w3.org/TR/html-aam-1.0/
- Accessible Name and Description Computation: https://www.w3.org/TR/accname-1.2/
- WAI Forms Tutorial: https://www.w3.org/WAI/tutorials/forms/
