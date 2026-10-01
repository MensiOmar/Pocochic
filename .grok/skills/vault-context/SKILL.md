---
name: vault-context
description: Load only the Obsidian notes needed for the current POCOCHIC task. Use when the user or the work needs product rules, as-is AppSheet behavior, data model, or architecture facts from the vault. Also /vault-context.
---

# Vault context

Do not dump `obsidian/`. Read the smallest set of notes that answers the task.

## Order

1. `obsidian/00-Home.md` if you have not already this session.
2. Then only what the task needs:

| Need | Note |
|------|------|
| What we are building | `obsidian/01-Project/Overview.md`, `Goals.md` |
| Confirmed decisions | `obsidian/01-Project/Decisions-Log.md` |
| Paths, CSVs, gaps | `obsidian/01-Project/Sources-and-Tools.md` |
| Process | `obsidian/01-Project/How-We-Work.md` |
| As-is AppSheet | `obsidian/02-Current-System/AppSheet-Overview.md` and the matching sibling (`Business-Rules`, `Customer-Flows`) |
| Website schema | `obsidian/02-Current-System/Data-Model.md` |
| Stack / APIs | `obsidian/05-Architecture/Stack.md`, `V1.0.0-Architecture-Proposal.md` |
| HTML drop zone | `obsidian/03-Brand/Screen-Designs.md` |
| Brand files | `obsidian/03-Brand/Identity.md`, `Assets-Index.md` |

3. For catalog/promo/geo facts, prefer `pocochic/data/import/*.csv` and `reconciliation.json` over live Sheets.

Stop once you can act. Quote note paths when a rule is load-bearing.
