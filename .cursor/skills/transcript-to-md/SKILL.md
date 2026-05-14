---
name: transcript-to-md
description: Extracts session transcript JSONL, converts it to plain markdown chat log, then deletes the temporary JSONL. Use when user says "대화창 그대로 저장", "jsonl 추출해서 md로", or requests transcript archiving workflow.
metadata:
  preferred_location: .cursor/skills
---

# Transcript To Markdown

Save the actual chat transcript as plain markdown.

## Fixed Save Location (Coloso)

- Lecture root is fixed to:
  `/Users/vcodestudio/GITHUB/V-Slide/lectures/coloso/강의자료`
- Find the matching lecture folder from user input.
  - Example: `8강` -> folder starting with `08_` (or `8_`)
  - Example: `12강` -> folder starting with `12_`
- Save transcript inside that lecture folder with fixed English filename:
  `chat-log.md`
- Markdown title text can remain Korean (`채팅기록`), but filename must be English (`chat-log.md`).

## When to Use

- User asks to save the chat window itself (not summary)
- User requests: `jsonl 추출 > md 작성 > jsonl 삭제`
- User wants repeatable conversation archiving

## Instructions

1. Locate the parent transcript JSONL (not subagent file) from `agent-transcripts`.
2. Copy or download the JSONL into project `conversation-logs/tmp/`.
3. Resolve output directory from lecture root:
   - Parse lecture number from user request (`N강`)
   - Find folder under lecture root with prefix `NN_` (zero-padded first, then non-padded fallback)
4. Run converter script in this skill folder: [`transcript-jsonl-to-md.mjs`](./transcript-jsonl-to-md.mjs)

```bash
node .cursor/skills/transcript-to-md/transcript-jsonl-to-md.mjs \
  --input "conversation-logs/tmp/<session>.jsonl" \
  --output "/Users/vcodestudio/GITHUB/V-Slide/lectures/coloso/강의자료/<matched-lecture-folder>/chat-log.md" \
  --title "채팅기록" \
  --delete-input
```

5. Confirm output markdown formatting:
   - Speaker headers must be `[User]`, `[Assistant]` (square brackets)
   - Add a line break after each speaker header, then message body
   - Do not include timestamps in saved output
6. Ensure temp JSONL is removed.

## Parameters

- `lecture`: lecture selector from user prompt (example: `8강`)
- `filename`: fixed to `chat-log.md`
- `title`: fixed to `채팅기록`
- `session`: parent transcript id jsonl source

## Verification Checklist

- Markdown file created under matched lecture folder in Coloso lecture root
- Content is transcript-style plain text (not summarized)
- Speaker format is `[User]` / `[Assistant]` and timestamps are removed
- Filename is exactly `chat-log.md`
- Temporary JSONL deleted after conversion
