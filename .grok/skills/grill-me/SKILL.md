---
name: grill-me
description: A relentless interview to sharpen a plan or design. User-invoked only. Use when the user runs /grill-me.
disable-model-invocation: true
---

Read and follow the sibling skill `.grok/skills/grilling/SKILL.md` (workspace or `pocochic/.grok/skills/grilling/SKILL.md`). Then start the interview on whatever the user just named.

This wrapper is **stateless**: write no files, create no docs, leave no workspace behind. The output is a sharper idea in the conversation.

Start in inquiry. Do not switch into implementing, speccing, or coding until the user says the grill is done.

If the user is already mid-implementation, still only question; do not continue the build in this turn.
