/**
 * (C) restore-clue-images.ts
 * ---------------------------------------------------------------------------
 * Undo button for "(C) link-parasite-clue-images.ts".
 *
 * Reads a backup JSON (auto-created when you ran the linker with --write) and
 * restores each ClueCard.imageUrl to EXACTLY the value it had before.
 *
 * USAGE
 *   # See which backups exist:
 *   ls prisma/"(C) clue-images-backup-"*.json
 *
 *   # Preview what would be restored (no DB writes):
 *   npx tsx "prisma/(C) restore-clue-images.ts" --file="prisma/(C) clue-images-backup-XXXX.json"
 *
 *   # Actually restore:
 *   npx tsx "prisma/(C) restore-clue-images.ts" --file="prisma/(C) clue-images-backup-XXXX.json" --write
 * ---------------------------------------------------------------------------
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const fileArg = args.find((a) => a.startsWith("--file="))?.split("=").slice(1).join("=");

type BackupRow = { id: string; category: string; label: string; imageUrl: string };

async function main() {
  if (!fileArg) {
    console.error(`\n❌ Missing --file=. Point it at a backup JSON, e.g.:\n   --file="prisma/(C) clue-images-backup-2026-....json"\n`);
    process.exit(1);
  }

  const rows: BackupRow[] = JSON.parse(readFileSync(fileArg, "utf8"));
  console.log(`\n${WRITE ? "✍️  LIVE RESTORE" : "🔍 DRY RUN"} — ${rows.length} cards from ${fileArg}\n`);

  let restored = 0;
  let unchanged = 0;

  for (const r of rows) {
    // Read current value to show what changes.
    const current = await prisma.clueCard.findUnique({ where: { id: r.id }, select: { imageUrl: true } });
    const now = current?.imageUrl ?? "";
    if (now === r.imageUrl) {
      unchanged++;
      continue;
    }
    console.log(`  ↩️  [${r.category}] ${r.label}`);
    console.log(`       now: ${JSON.stringify(now)}  →  restore: ${JSON.stringify(r.imageUrl)}`);
    restored++;
    if (WRITE) {
      await prisma.clueCard.update({ where: { id: r.id }, data: { imageUrl: r.imageUrl } });
    }
  }

  console.log(`\n──────────────────────────────`);
  console.log(`↩️  ${WRITE ? "Restored" : "Would restore"}: ${restored}`);
  console.log(`✔️  Already matched backup: ${unchanged}`);
  console.log(WRITE ? `\n(DB restored to backup state.)\n` : `\n(No changes written — add --write to apply.)\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
