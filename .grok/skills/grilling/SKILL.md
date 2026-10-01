---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any grill trigger phrases.
---

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask *now* without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Format a round like so:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a *later* round, not this one.

Finding *facts* is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, vault, codebase), look it up; do not ask the user for anything you could read yourself. A running lookup is an unsettled prerequisite, so only the questions downstream of it wait; ask the rest of the frontier now. The *decisions* are the user's: put each to them and wait.

Locked facts for this repo are not questions: Vue 3 + Vite + Hono + D1/SQLite, two separate frontends, no Next.js, no live Sheets, HTML screens are the look source. Read `AGENTS.md` and the vault notes you need; do not re-litigate the stack.

Look-and-feel questions are ungrillable here — wait for owner HTML rather than inventing a layout.

Your only job is to question. Do not implement, code, or write vault/docs until the user confirms you have reached a shared understanding.

The session is done when the frontier is empty: every branch visited, nothing left silently assumed.
