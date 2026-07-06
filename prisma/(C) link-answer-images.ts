/**
 * (C) link-answer-images.ts
 * ---------------------------------------------------------------------------
 * Links each Microbe in the DB to its species image file by setting
 * `answerImageUrl` to `/assets/cards/answers/<mode>/<slug>.png`.
 *
 * The image files are named by species slug, e.g.:
 *   public/assets/cards/answers/bacteria/escherichia-coli.png
 *   public/assets/cards/answers/parasite/...
 *
 * We slugify each Microbe.name and match it to a file on disk.
 *
 * USAGE:
 *   # 1) Preview matches WITHOUT writing to the DB (do this first!):
 *   npx tsx "prisma/(C) link-answer-images.ts" --dry-run
 *
 *   # 2) Once the preview looks right, write to the DB for real:
 *   npx tsx "prisma/(C) link-answer-images.ts"
 *
 *   # Optional: limit to one game mode (default = all modes that have a folder)
 *   npx tsx "prisma/(C) link-answer-images.ts" --mode=BACTERIA --dry-run
 * ---------------------------------------------------------------------------
 */

import { PrismaClient, GameMode } from "@prisma/client";
import { existsSync, readdirSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

// ── CLI flags ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const modeArg = args.find((a) => a.startsWith("--mode="))?.split("=")[1] as
  | GameMode
  | undefined;

// Map each game mode to the folder holding its answer images.
const MODE_FOLDERS: Partial<Record<GameMode, string>> = {
  BACTERIA: "bacteria",
  PARASITE: "parasite",
  // Add FUNGI / VIRUS here once those image folders exist.
};

const PUBLIC_ANSWERS_DIR = join(process.cwd(), "public", "assets", "cards", "answers");

/**
 * Turn a microbe name into a filename slug.
 * "Escherichia coli"          -> "escherichia-coli"
 * "Haemophilus influenzae type b" -> "haemophilus-influenzae-type-b"
 * "Brucella spp."             -> "brucella-spp"
 * Keeps hyphens, drops dots/parentheses, collapses spaces to single hyphens.
 */
function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\./g, "")          // drop periods (spp.)
    .replace(/[()]/g, "")         // drop parentheses
    .replace(/['’]/g, "")         // drop apostrophes
    .replace(/\s+/g, "-")         // spaces -> hyphens
    .replace(/-+/g, "-");          // collapse multiple hyphens
}

async function main() {
  console.log(`\n${DRY_RUN ? "🔍 DRY RUN (no DB writes)" : "✍️  LIVE RUN (writing to DB)"}\n`);

  // Which modes are we processing?
  const modes = (
    modeArg ? [modeArg] : (Object.keys(MODE_FOLDERS) as GameMode[])
  ).filter((m) => MODE_FOLDERS[m]);

  let totalMatched = 0;
  let totalMissing = 0;

  for (const mode of modes) {
    const folder = MODE_FOLDERS[mode]!;
    const dir = join(PUBLIC_ANSWERS_DIR, folder);

    if (!existsSync(dir)) {
      console.log(`⚠️  Folder not found for ${mode}: ${dir} — skipping.`);
      continue;
    }

    // Build a set of available slug filenames on disk (without extension).
    const filesOnDisk = readdirSync(dir)
      .filter((f) => f.toLowerCase().endsWith(".png"))
      .map((f) => f.replace(/\.png$/i, ""));
    const slugSet = new Set(filesOnDisk.map((s) => s.toLowerCase()));

    // Pull all microbes for this game mode.
    const microbes = await prisma.microbe.findMany({
      where: { gameMode: mode },
      select: { id: true, name: true, answerImageUrl: true },
      orderBy: { name: "asc" },
    });

    console.log(`\n=== ${mode} — ${microbes.length} microbes, ${filesOnDisk.length} images ===`);

    const missing: string[] = [];

    for (const m of microbes) {
      const slug = slugify(m.name);
      const url = `/assets/cards/answers/${folder}/${slug}.png`;

      if (slugSet.has(slug.toLowerCase())) {
        totalMatched++;
        console.log(`  ✅ ${m.name}  →  ${url}`);
        if (!DRY_RUN) {
          await prisma.microbe.update({
            where: { id: m.id },
            data: { answerImageUrl: url },
          });
        }
      } else {
        totalMissing++;
        missing.push(`${m.name}  (expected: ${slug}.png)`);
      }
    }

    // Report microbes with NO matching image so you can rename files / fix names.
    if (missing.length) {
      console.log(`\n  ❌ No image match for ${missing.length} ${mode} microbes:`);
      missing.forEach((x) => console.log(`     - ${x}`));
    }

    // Report image files that no microbe claimed (orphan files).
    const claimedSlugs = new Set(microbes.map((m) => slugify(m.name).toLowerCase()));
    const orphans = filesOnDisk.filter((f) => !claimedSlugs.has(f.toLowerCase()));
    if (orphans.length) {
      console.log(`\n  📂 ${orphans.length} ${mode} image files not matched to any microbe:`);
      orphans.forEach((f) => console.log(`     - ${f}.png`));
    }
  }

  console.log(`\n──────────────────────────────`);
  console.log(`✅ Matched:  ${totalMatched}`);
  console.log(`❌ Missing:  ${totalMissing}`);
  console.log(DRY_RUN ? `\n(No changes written — remove --dry-run to apply.)\n` : `\n(DB updated.)\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
