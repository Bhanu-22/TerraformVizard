Design tokens and styling notes

This project includes a small design system for the Terraform Design Studio.

Files:
- src/styles/tokens.css — CSS variables for colors, spacing, typography.
- src/styles/global.css — Global layout, panel, and component classes.

Guidelines:
- Use CSS variables defined in `tokens.css` for colors and spacing.
- Use `.panel`, `.section`, `.explain-why`, `.badge`, and `.ty-label` classes for consistent UI.
- Keep logic unchanged; only apply classes and tokens for visual updates.

Colors:
- `--create` (green), `--update` (amber), `--delete` (red), `--draft` (blue)

Typography:
- Use monospace (`--font-mono`) for resource names and code.
- Use sans-serif for labels and UI text.

Progressive disclosure:
- Use native `<details>` for collapsible sections and style via `global.css`.

If you want additional tokens or new components, add them to `tokens.css` and reference in `global.css`.
