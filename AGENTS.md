# AGENTS.md

This file applies to the entire repository.

## GitHub Communication

- The default language for GitHub-facing writing in this repository is Korean.
- Write pull request titles, pull request bodies, code review findings, review summaries, and reply comments in Korean unless the user explicitly requests another language.
- Keep code, commands, file paths, API names, and exact log snippets in their original language when precision matters. Explanations around them should still be written in Korean.
- If a review comment needs a short quoted identifier or error message, keep only that quoted fragment in its original language and write the surrounding explanation in Korean.

## Validation

- Run `npm run build` after changing repository files unless the user explicitly says not to.
- `npm run lint` currently has known pre-existing Biome schema and repository issues. Do not treat it as a blocker for unrelated tasks unless the task is specifically about lint or Biome setup.
