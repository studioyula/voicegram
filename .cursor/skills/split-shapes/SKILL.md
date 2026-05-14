---
name: split-shapes
description: Runs ae-split-shape-paths-to-layers.jsx in After Effects via coloso-ae-mcp execute only (no script edits). Use when the user says splitShapes, split-shapes, 패스 분리, 셰이프 분리, or paths to separate layers.
---

# split-shapes (splitShapes)

## Instructions

1. **Do not** modify [`scripts/ae-split-shape-paths-to-layers.jsx`](../../../scripts/ae-split-shape-paths-to-layers.jsx) unless the user explicitly asks to change the script.
2. **Read** that file from the repo with the Read tool — **the entire file**.
3. Call **`coloso-ae-mcp`** **`execute`** with:
   - `script`: that full file contents (one string)
   - `searchDocs`: `false`
   - `timeout`: `120000`

Behavior and selection rules live in the script; the skill is **run-only**.
