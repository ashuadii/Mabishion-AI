# Workspace Map

## Active Final Workspace Root

Use this folder for all current and future work:

`/home/admin-ubuntu/Desktop/Nexious-AI/Nexious Mickii/nexious-ai-starter`

> ✅ **This is the single canonical active source.** All code edits, builds, and worker additions happen here.

## Active Tauri App Source

Run and edit the desktop app here:

`/home/admin-ubuntu/Desktop/Nexious-AI/Nexious Mickii/nexious-ai-starter`

Commands:

```bash
cd "/home/admin-ubuntu/Desktop/Nexious-AI/Nexious Mickii/nexious-ai-starter"
npm run tauri-dev
```

Decision made on 2026-05-17:

The old main folder remains the active app source because it contains the full original project, heavy generated assets, existing dependencies, and the known Tauri setup. New merged changes are applied into this folder to avoid confusion.

`working-source` is now only a temporary copied workspace/reference, not the active source.

## Blueprint Files

These are the final planning source of truth:

- `AI_Product_Studio_v4_FINAL_Blueprint.txt`
- `Part1_PRD_TRD_UIUX.txt`
- `Part2_AppFlows_Schema.txt`
- `Part3_Implementation_API_Deployment.txt`
- `VISION_LOCK.md`

## Legacy Reference (INACTIVE — Do Not Use for Active Work)

> ⚠️ **This path is no longer the active workspace.** It is kept for historical reference only.

`/home/admin-ubuntu/Applications/projects/ai-Software/Nexious AI Studio`

Old project ingredients that were copied here:

`/home/admin-ubuntu/Applications/projects/ai-Software/Nexious AI Studio/legacy-source`

This includes old root-level files like:

- `NexiousApp_Fixed.jsx`
- `Nexious_AI_Mickii_Build_Ready_Blueprint.docx`
- `brain-repo`
- `brain-server`
- old `nexious-ai-starter`

Heavy generated folders were intentionally not copied:

- `.git`
- `node_modules`
- `target`
- `src-tauri/target`
- `dist`
- `protoc_temp`

These can be regenerated from lockfiles and source code if needed.

## Project Root Folder

Project root (contains docs, agents config, and the active app):

`/home/admin-ubuntu/Desktop/Nexious-AI/Nexious Mickii`

Symlink alias:

`/home/admin-ubuntu/Desktop/Nexious-AI/Mickii`

Note: `Mickii` is a Linux symlink pointing to `Nexious Mickii`. It is not a separate full copy.

## Delete Rule

Do not delete the `/Desktop/Nexious-AI/Nexious Mickii` folder — it is the active project root.

> Last verified: 2026-06-27. Canonical path per MASTER_RULES.md is `/Desktop/Nexious-AI/Nexious Mickii/nexious-ai-starter`.
