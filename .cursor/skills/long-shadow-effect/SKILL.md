---
name: long-shadow-effect
description: Runs scripts/utility/ae-longshadow-adjustment-batch.jsx via coloso-ae-mcp execute on the active comp — ADJ_ColorControl (BG Color, Shadow Color, Shadow Length, Shadow Direction), LongShadows_PASS, ADJ_ShadowColor, BG_LongShadow. Use when the user says long shadow effect, long shadow, flat shadow, shadow controller, LongShadows_PASS, or asks to apply this batch setup to the current comp.
---

# Long Shadow Effect

> **Scope:** The flat long-shadow **Repeater** workflow applies **only to Shape layers**. Precomp and footage layers are **not** in scope for this skill’s guidance.

Batches `*_LS` shadow layers into **`LongShadows_PASS`** and wires **`ADJ_ColorControl`** for background color, shadow color, **length**, and **direction**.

## When to use

- Apply or re-apply the long shadow setup to the **active composition**
- Include the controller (`ADJ_ColorControl`) and color/length/direction controls

## Requirements

1. The target composition must be **active** in After Effects.
2. Use **`coloso-ae-mcp`** (`project-0-coloso-coloso-ae-mcp`) **`execute`** only (workspace `AGENTS.md`).
3. ExtendScript must be **ES3** (`var` / `function` only).

## Fixed execute payload

The agent always uses this **same** script body; only replace the path with the workspace root.

```javascript
$.evalFile("/Users/vcodestudio/GITHUB/ae-students/coloso/scripts/utility/ae-longshadow-adjustment-batch.jsx");
return LONGSHADOW_BATCH_RESULT;
```

- Script file: `{workspace-root}/scripts/utility/ae-longshadow-adjustment-batch.jsx`
- Success return shape: `OK {CompName} : LongShadows_PASS + ADJ_ShadowColor + ADJ_ColorControl`

## Behavior for Shape layers (skill scope)

| Step | What happens |
|------|----------------|
| Shadow | Duplicate `SlideTile_*` **Shape** layers as `*_LS`, Repeater + **Shadow Length / Shadow Direction** expressions |
| Batch | `LongShadows_PASS` precomp; inner **`ADJ_ShadowColor`** Tint unifies shadow color |
| Background | **`BG_LongShadow`** shape Fill ↔ **BG Color** |

## `ADJ_ColorControl` (adjustment layer)

- **BG Color** — background
- **Shadow Color** — shadow tint (referenced by `ADJ_ShadowColor`)
- **Shadow Length** — slider (default 84)
- **Shadow Direction** — angle (default 45°; Directional Blur convention: **0° = right, 90° = down**)

## Timeline order (after the script runs)

`ADJ_ColorControl` → tile layers → `LongShadows_PASS` → `BG_LongShadow`

## Notes

- If the comp is renamed, re-run the script so `comp("…")` expressions match.
- If `ADJ_ShadowColor` is locked, the script temporarily unlocks it to move the layer.

## References

- Batch implementation: `scripts/utility/ae-longshadow-adjustment-batch.jsx`
- AE rules: root `AGENTS.md`
- Effect `matchName`s: `docs/07-matchnames/effects-matchnames.md`
