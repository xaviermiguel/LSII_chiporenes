---
name: commit-changes
description: Prepare and create ProTube Git commits using Conventional Commits, with one commit per logical change. Use when the user asks to commit changes or organize pending changes into commits.
---

# Commit changes

Create focused, reviewable commits using the team's format
`type(scope): description`. Follow the repository AGENTS.md and AI contribution
policy. Creating this skill does not authorize committing pending changes.

## Inspect and group changes

1. Read applicable AGENTS.md files and inspect `git status --short --branch`,
   `git diff`, `git diff --cached`, and relevant untracked files. Review both
   staged and unstaged changes; do not assume the index is ready to commit.
2. Identify the changes authorized by the user and preserve unrelated work,
   including local videoGrabber configuration. If ownership or scope is unclear,
   ask which changes to include before staging or committing them.
3. Group changes by purpose: one independently understandable change per commit,
   rather than one commit per file or line. Keep an implementation, its necessary
   tests and its directly related documentation together. Split unrelated fixes,
   features and configuration changes. Order dependent groups so intermediate
   commits remain coherent.
4. Present the groups and proposed messages before execution. A request to make
   commits authorizes proceeding within its stated scope; do not ask for repeated
   confirmation. A request only to propose messages does not authorize commits.

## Write the message

Use lowercase types from this team list:

| Type | Purpose |
| --- | --- |
| feat | New application functionality |
| fix | Bug correction |
| docs | Documentation changes |
| style | Formatting without behavior changes |
| refactor | Code restructuring without a feature or bug fix |
| test | Tests added or corrected |
| chore | Maintenance, tooling or configuration |

Choose a scope describing the affected area, such as `backend`, `frontend`,
`video-grabber`, `ai` or `ci`. Conventional Commits makes scope optional, but this
team uses it in the requested format. Write a concise, concrete description;
follow the user's language preference, otherwise use English to match project
documentation. Use `!` and explain `BREAKING CHANGE:` only for actual breaking
changes.

Examples:

```text
docs(ai): document repository instructions
chore(ai): add conventional commit skill
fix(frontend): handle an empty video list
```

## Preserve the prompt and use the team template

For each AI-assisted commit, identify the actual prompt or prompts responsible
for that logical change. Read `prompts/TEMPLATE.md` and `prompts/README.md` and
use their current format and naming convention. Reuse an existing approved
record when the same approved prompt applies to several commits; do not create
duplicate records simply because there is another commit.

For a new approved prompt, save its record as `prompts/NN-short-description.md`
with the next available number. Include that record with the first relevant
commit; subsequent commits reference it. Preserve the actual prompt text rather
than replacing it with a summary. Record material follow-up prompts as well,
without attributing an earlier approval to changed instructions.

Use this structure for the prompt record and for the body of an AI-assisted
commit, after the Conventional Commits subject and a blank line:

```markdown
# <Short title>

**Approved on:** YYYY-MM-DD
**Approved by:** <team members / PR link>
**Used for:** <the task this prompt is used for>

## Prompt

<the actual prompt text>

## Notes

<prompt file reference, task reference, AI use, relevant checks or limitations>
```

Keep the subject as `type(scope): description`; the template supplies the body,
not a replacement for that subject. Populate Notes with the actual prompt path,
task reference and an explicit statement of AI assistance. If several prompts
contributed to the commit, include their records and identify each prompt and
its approval separately instead of implying they share approval metadata.

Use only the real approval date and approving team members or PR link. The date
of execution is not necessarily the approval date, and a request to commit is
not evidence of team approval. Never fabricate approval, prompt paths or task
identifiers. When information required by the project policy is missing, prepare
the changes, proposed message and prompt draft for review, explain exactly what
is missing, and leave that commit uncreated. Keep unapproved drafts out of
`prompts/`, as its README requires approval before adding a record there.

## Validate, stage and commit

- Run checks appropriate to each group using existing repository commands.
  Documentation-only changes need diff and factual checks; do not run application
  tests merely to validate prose. Report unavailable or failing checks accurately
  and resolve relevant failures before claiming a group is ready.
- Inspect configured hooks (`core.hooksPath`, .husky/, Git hooks), commitlint
  configuration and package.json before relying on them. A `precommit` npm script
  alone does not establish an installed Git hook.
- Husky runs Git hooks; commitlint validates messages when wired to `commit-msg`.
  If configured, let the hooks run and fix relevant failures. Do not bypass them
  with `--no-verify` or `HUSKY=0`.
- Missing Husky or commitlint does not prevent manual Conventional Commits.
  Report that validation is manual. Do not install tools, download them through
  npx, change dependencies or configure hooks as part of a normal commit task.
  Do that only when hook setup is requested; frontend/ contains this monorepo's
  package.json, so installation instructions must account for that layout.
- Stage only selected paths (`git add -- path`) or selected hunks. Avoid
  `git add .`, `git add -A` and `git commit -a` when unrelated changes exist.
- If unrelated changes are already staged, do not silently commit or unstage
  them. Isolate the selected commit with a reviewed path/hunk strategy that
  preserves the original staged work, or ask how to handle the index when it
  cannot safely be separated.
- Before each commit, inspect `git diff --cached --stat`, the complete staged
  diff and `git diff --cached --check`. Ensure the commit contains exactly its
  intended group and no secrets, machine-specific settings or unintended outputs.
- Commit using `git commit -m` for a simple message, or `git commit --file` with
  a temporary UTF-8 file outside tracked project files for a multiline message.
  Keep real newlines and quote shell arguments correctly.
- If hooks fail, inspect their error and any changes they made before retrying.
  Do not repeat the same failing command or include unrelated hook rewrites.
- After each commit, verify `git show --stat --oneline HEAD` and
  `git status --short --branch`; continue with the next authorized group.
- Do not push, amend existing commits or rewrite history unless requested.

## Report

List created commit hashes, messages, the purpose of each group and check results.
Identify changes left uncommitted and anything that prevented a commit. If no
changes fall within the requested scope, report that instead of creating an empty
commit.

## References

- [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
- [Husky setup](https://typicode.github.io/husky/get-started.html)
- [commitlint local setup](https://commitlint.js.org/guides/local-setup.html)
