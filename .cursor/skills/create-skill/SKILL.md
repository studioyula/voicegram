---
name: create-skill
description: Creates or updates a project Cursor skill under .cursor/skills with valid SKILL.md frontmatter and concise workflow instructions. Use when the user types /create-skill or says phrases like "스킬로 만들어줘", "이걸 스킬로 등록해줘", or asks to turn a workflow into a reusable Cursor skill.
metadata:
  preferred_location: .cursor/skills
  invocation: /create-skill
---

# Create Skill

Create a reusable Cursor skill for this project.

## When to Use

- User explicitly types `/create-skill`
- User asks "이걸 스킬로 만들어", "커서 전용 스킬로 등록"
- User asks "뭘 스킬로 만들어줘", "스킬로 만들어줘"
- Existing workflow should be documented for repeatable reuse

## Instructions

1. Define scope from the current conversation (task, constraints, output style).
2. Create or update `.cursor/skills/<skill-name>/SKILL.md`.
3. Ensure frontmatter is valid:
   - `name`: lowercase, numbers, hyphens only
   - `description`: includes what it does and when to use it
   - keep `disable-model-invocation` only when explicit slash-command behavior is desired
4. Keep SKILL content compact and action-oriented:
   - `# Title`
   - `## When to Use`
   - `## Instructions`
   - `## Parameters` (if needed)
   - `## Verification Checklist`
5. Reuse existing project conventions and paths (templates/scripts) instead of duplicating logic.
6. If requirements are ambiguous, ask minimal clarifying questions before writing.
7. Default packaging rule for skill assets:
   - Any source/script needed to create or use the skill should be placed inside that skill folder.
   - Do not keep required runtime files in unrelated external paths by default.
   - Exception: if a source is already referenced from outside the skill (or must remain shared globally), keep it external and document that dependency explicitly in `SKILL.md`.

## Parameters

Include only parameters users are expected to change frequently.  
Prefer explicit defaults and short descriptions.

## Verification Checklist

- Skill path is under `.cursor/skills/`
- Folder name and frontmatter `name` match
- Frontmatter parses correctly
- Description contains both behavior and trigger context
- Steps are executable without hidden assumptions
