# ELU Pasir Ris — Private Sync

The existing ELU V208 interface, registers and reports, with a private shared cloud workspace for the same owner on Android and computer. The original GitHub Pages application is unchanged.

Structured records use D1 and versioned R2 snapshots. Images use content-addressed private R2 objects. Device changes are encrypted with the existing ELU login key before being retained locally. A durable IndexedDB outbox retries photo saves. Independent record changes merge; conflicting edits require review. Deleted photo entries retain versioned tombstones. Full backup restores stage all files and validate collection counts before atomically activating the new dataset.

The Site must remain **owner-private**. Shared endpoints rely on Sites' authenticated owner-only boundary, including supported service access. Never publish this workspace publicly or put backup data, photos, credentials or resident details in Git. The existing ELU login is retained inside that boundary.

## Validation

- `node tests/backend.test.mjs`: SQLite migrations, atomic imports, concurrent record merges, conflicts, history, photo versions and deletions.
- `node tests/client.test.mjs`: two device adapters, in-flight changes, offline resume, lazy photo bytes, cache race protection, deletion and restored-dataset protection.
- Build with the supplied Sites build helper.

`scripts/task/import-backup.py` performs the owner-authorized initial transfer using a credential passed on stdin. It verifies ZIP CRC, counts, unique keys, SHA-256 uploads, server metadata and sampled file bytes. Checkpoints remain in ignored `.sites-runtime/`. No backup payload is included in source.

## Use

Open the same private Site on both devices, sign in with the owner's ChatGPT account, then use the existing ELU login. Wait for **Saved online** after changes. Photos open when needed. Existing Full Backup remains available for an independent downloadable copy. Offline edits stay on the device until it reconnects; clearing device storage before they sync can remove those unsent edits.

## GitHub app updates

The linked hourly update task follows [docs/github-sync.md](docs/github-sync.md) and the source checkpoint in `.openai/elu-upstream.json`. It reads public GitHub commits, preserves the private cloud bridge with a three-way merge, runs checks, then publishes. Runtime resident data is never imported or replaced by this process. `/elu/github-version.json` identifies the GitHub commit in the published app. Existing open pages need a refresh after a successful update. Complex merge conflicts may require review.
