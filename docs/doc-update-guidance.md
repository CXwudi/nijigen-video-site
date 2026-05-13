# Documentation Update Guidance

[docs/](./) is Human and AI common doc.

## Baseline 1: Benefit for both Human and AI

Updates to documentation should be made in a way that benefits both AI agents and humans.

- Readable and Understandable for Human
- Token efficient for AI (No verbose explanation if concise sentences can do the job)

## Baseline 2: Human thinks, AI writes

Only humans can write/update headers, that is any line starting with `#`. Humans should decide the structure of the documentation.

While the documentation can be updated by both AI agents and humans, AI agents are not allowed to write/update headers, but they can update the content under the headers.

## The update

Without updating doc properly, AI will hallucinate, new comer will make mistake.

### Things to do

Do this before each PR or each push to main branch

1. Check referencing links like `[]()` in docs with `mise //:docs-link-check`, make sure local file links are still reachable.
    - Add `--check-web-links` to also check external website reachability.
2. For any modification made, check if the related documentation still holds. Modify if needed.
