# UI Baseline

## daisyUI vs Base UI - How to combine

One sentence: daisyUI provides the theme and CSS, Base UI provides the a11y and interactivity.

- By default, Use Base UI, then style it using theme and CSS from daisyUI
  - If a component exists in both Base UI and daisyUI, still prefer Base UI as it definitely has a reason to be there, such as better a11y and interactivity

## UI Documentation

Always refer to the doc matching the installed library version (usually are latest GA):

- [daisyUI](https://daisyui.com/docs/)
  - For AI Agent: use curl to read [daisyUI official SKILL.md](https://daisyui.com/SKILL.md), but be aware it is a big file. So use `ast-outline` to list of the structure of this SKILL.md file then choose to read which part. Do not read the whole file.
- [Base UI](https://base-ui.com/react/components)
  - For AI Agent: Base UI ships its docs in `node_modules/@base-ui/react/docs/`

## Project Specific

The UI should be designed to be compact. So for layout (spacing, padding, and etc), anything larger than `lg` (large) is not allowed. If such large space is needed, must add comment to that component explaining why.

Use named spacing utilities such as `gap-sm` over numeric utilities such as `gap-2`. See all named convension in `@theme` in `styles.css`. If a numeric utility CSS is repeated used, consider adding that sizing into `@theme`
