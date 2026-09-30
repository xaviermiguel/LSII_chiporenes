# Prompts

This folder preserves the prompts used to generate code, architecture or other project artifacts with AI, per
`REQUIREMENT.md` (NFR-07) and the "Usage of AI" section of the root [README.md](../README.md).

## Rules

* A prompt is added here **only after** the team has agreed on it and approved its use — don't commit ad hoc
  prompts nobody else reviewed.
* When a task type is already covered by an approved prompt below, reuse it instead of writing a new one. If it
  needs a change, update it through the same team review process.
* Commit the prompt file together with (or referenced by) the PR that used it, so the change stays traceable back
  to the prompt that produced it.

## Naming convention

`NN-short-description.md`, numbered in the order they were approved, e.g. `01-generate-crud-controller.md`.

## File template

Each prompt file should contain:

```markdown
# <Short title>

**Approved on:** YYYY-MM-DD
**Approved by:** <team members / PR link>
**Used for:** <what kind of task this prompt is for, e.g. "scaffolding a Spring REST controller">

## Prompt

<the actual prompt text>

## Notes

<optional: known limitations, follow-up edits usually needed, related PRs>
```
