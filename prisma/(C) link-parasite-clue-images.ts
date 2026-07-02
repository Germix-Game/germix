/**
 * (C) link-parasite-clue-images.ts
 * ---------------------------------------------------------------------------
 * Links parasite CLUE cards to their image files by setting ClueCard.imageUrl.
 *
 * BACKGROUND
 *   Clue images live in:  public/assets/cards/clues/<category-folder>/<file>.png
 *   The DB stores a RELATIVE url like "cards/clues/transmission/tsetse-fly.png"
 *   (the frontend's resolveImageSrc() prepends "/assets/").
 *
 *   The numeric categories are ALREADY fully linked:
 *     - MORPHOLOGY        (label is the number, e.g. "39"  -> morphology/39.png)
 *     - LAB_CHARACTERISTIC (label ends "(N)", e.g. "... (67)" -> lab-characteristic/67.png)
 *
 *   The TEXT categories use CURATED shorthand filenames that a slugify of the
 *   label does NOT reproduce (e.g. "Zoonosis: tsetse fly" -> tsetse-fly.png).
 *   So we use an EXPLICIT hand-verified map below, keyed by the exact DB label.
 *
 *   CLINICAL_MANIFESTATION is intentionally left alone: its parasite symptoms
 *   map to NUMBERED files (18.png..86.png) with no key, so auto-matching would
 *   be guessing. Better a text fallback than a wrong image.
 *
 * SAFETY
 *   - Operates ONLY on parasite-EXCLUSIVE clue cards (any card also used by a
 *     non-parasite microbe is skipped — we never touch bacteria).
 *   - Verifies each target file exists on disk before writing.
 *   - Skips cards that already have an imageUrl.
 *   - DRY RUN by default. Pass --write to actually update the DB.
 *
 * USAGE
 *   # 1) Preview (no DB writes):
 *   npx tsx "prisma/(C) link-parasite-clue-images.ts"
 *
 *   # 2) Apply for real:
 *   npx tsx "prisma/(C) link-parasite-clue-images.ts" --write
 * ---------------------------------------------------------------------------
 */

import { PrismaClient } from "@prisma/client";
import { existsSync, writeFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

const WRITE = process.argv.slice(2).includes("--write");

const CLUES_DIR = join(process.cwd(), "public", "assets", "cards", "clues");

// Folder name on disk for each category we touch.
const CATEGORY_FOLDER: Record<string, string> = {
  SPECIAL_TRAIT: "special-trait",
  TRANSMISSION: "transmission",
};

/**
 * Explicit label -> filename (without .png) map, per category.
 * Keys must match ClueCard.label EXACTLY (case-sensitive).
 * Every value below was verified to exist on disk.
 */
const MAP: Record<string, Record<string, string>> = {
  TRANSMISSION: {
    "Contact through skin wound": "skin-wound",
    "Contact to contaminated contact lens": "contact-lens",
    "Contact with fresh water": "fresh-water",
    "Fecal-oral transmission": "fecal-oral",
    "Parasite penetrates host skin": "parasite-penetrate",
    "Sexual transmission": "sexual",
    "Zoonosis: Aedes spp.": "aedes-spp",
    "Zoonosis: Anopheles mosquito": "mosquito",
    "Zoonosis: Cat": "cat",
    "Zoonosis: Culex spp.": "culex-spp",
    "Zoonosis: kissing bug": "kissing-bug",
    "Zoonosis: monkey": "monkey",
    "Zoonosis: sandfly": "sandfly",
    "Zoonosis: tsetse fly": "tsetse-fly",
  },
  SPECIAL_TRAIT: {
    "Can potentially cause bladder cancer": "bladder-cancer",
    "Can potentially cause hepatocellular carcinoma": "hepatocellular-carcinoma",
    "Can potentially cause malnutrition (Vitamin A D E K)": "malnutrition",
    "CT brain: numerous parenchymal lesion": "ct-brain",
    "Distributed mainly in Southeast Asia": "asean",
    "Eating contaminated vegetation": "contaminated-vegetation",
    "Eating fermented fish": "fermented-fish",
    "Eating metacercariae": "metacercariae",
    "Eating paratenic host fish": "paratenic-host-fish",
    "Eating somtam pu": "somtam-pu",
    "Eating uncooked fish": "uncooked-fish",
    "Eating undercooked fresh water shrimp or crab": "shrimp-crab",
    "Eating undercooked frog": "frog",
    "Eating undercooked meat": "undercooked-meat",
    "Eating undercooked meat contaminated with encyst larvae": "meat-encyst-larvae",
    "Eating undercooked pork": "undercooked-pork",
    "Eating undercooked snake": "snake",
    "Eating watercress morning glory": "watercress-morning-glory",
    "Flagella found in promastigote stage within sandfly": "flagella-sandfly",
    "Heart-lung migration": "heart-lung",
    "Higher risk in HIV patient": "hiv",
    "History of playing in contaminated water": "contaminated-water",
    "Hypnozoite found in liver": "hypnozoite-liver",
    "Increased risk in contact lens wearer": "contact-lens-wearer",
    "Increased risk in contaminated hand/food": "contaminated-hand-food",
    "Increased risk in people walking barefoot on contaminated soil": "barefoot",
    "Increased risk in poor sanitization environment": "poor-sanitization",
    "Largest nematode": "nematode",
    "More severe in pregnant women": "pregnant-women",
    "MRI: multiple large cysticersus cyst in basal cisternal space": "mri-cisternal",
    "Parasite resides at terminal ileum": "terminal-ileum",
    "PE: borborygmus sound": "pe",
    "Protein-losing enteropathy": "enteropathy",
    "Rarely causes brain mass epilepsy": "brain-mass-epilepsy",
    "Reactivation in immunocompromised patients": "immunocompromised",
    "Severe in immunocompromised": "severe-immunocompromised",
    "The most severe malaria": "malaria",
    "Traveling history": "traveling",
    "Worldwide distribution": "worldwide",
  },
};

async function main() {
  console.log(`\n${WRITE ? "✍️  LIVE RUN (writing to DB)" : "🔍 DRY RUN (no DB writes — pass --write to apply)"}\n`);

  // ── 1) Figure out which clue cards are parasite-EXCLUSIVE ──────────────────
  const parasiteMicrobes = await prisma.microbe.findMany({
    where: { gameMode: "PARASITE" },
    select: { id: true },
  });
  const parasiteIds = parasiteMicrobes.map((m) => m.id);

  // Clue cards used by ANY non-parasite microbe -> off-limits (protects bacteria).
  const nonParasiteLinks = await prisma.microbeClue.findMany({
    where: { microbeId: { notIn: parasiteIds } },
    select: { clueCardId: true },
  });
  const sharedIds = new Set(nonParasiteLinks.map((l) => l.clueCardId));

  const parasiteLinks = await prisma.microbeClue.findMany({
    where: { microbeId: { in: parasiteIds } },
    select: { clueCardId: true },
  });
  const exclusiveIds = [...new Set(parasiteLinks.map((l) => l.clueCardId))].filter(
    (id) => !sharedIds.has(id),
  );

  // ── 2) Pull the parasite-exclusive cards in the categories we handle ───────
  const cards = await prisma.clueCard.findMany({
    where: {
      id: { in: exclusiveIds },
      category: { in: ["SPECIAL_TRAIT", "TRANSMISSION"] },
    },
    select: { id: true, category: true, label: true, imageUrl: true },
    orderBy: [{ category: "asc" }, { label: "asc" }],
  });

  // ── SAFETY NET: snapshot BEFORE writing anything ───────────────────────────
  // Captures the current imageUrl of every card we might touch, so the restore
  // script can put things back exactly as they were.
  if (WRITE) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = join(process.cwd(), "prisma", `(C) clue-images-backup-${stamp}.json`);
    const snapshot = cards.map((c) => ({ id: c.id, category: c.category, label: c.label, imageUrl: c.imageUrl }));
    writeFileSync(backupPath, JSON.stringify(snapshot, null, 2), "utf8");
    console.log(`💾 Backup written: ${backupPath}  (${snapshot.length} cards)\n`);
  }

  let linked = 0;
  let alreadyOk = 0;
  const noMap: string[] = [];
  const fileMissing: string[] = [];

  for (const c of cards) {
    if (c.imageUrl && c.imageUrl.trim() !== "") {
      alreadyOk++;
      continue;
    }

    const file = MAP[c.category]?.[c.label];
    if (!file) {
      noMap.push(`[${c.category}] ${JSON.stringify(c.label)}`);
      continue;
    }

    const folder = CATEGORY_FOLDER[c.category];
    const diskPath = join(CLUES_DIR, folder, `${file}.png`);
    if (!existsSync(diskPath)) {
      fileMissing.push(`[${c.category}] ${JSON.stringify(c.label)} -> ${file}.png (NOT on disk)`);
      continue;
    }

    const url = `cards/clues/${folder}/${file}.png`;
    console.log(`  ✅ [${c.category}] ${c.label}  →  ${url}`);
    linked++;

    if (WRITE) {
      await prisma.clueCard.update({ where: { id: c.id }, data: { imageUrl: url } });
    }
  }

  // ── 3) Report ──────────────────────────────────────────────────────────────
  if (noMap.length) {
    console.log(`\n  ⚠️  ${noMap.length} cards had no map entry (left untouched):`);
    noMap.forEach((x) => console.log(`     - ${x}`));
  }
  if (fileMissing.length) {
    console.log(`\n  ❌ ${fileMissing.length} mapped files not found on disk (fix the map or add the file):`);
    fileMissing.forEach((x) => console.log(`     - ${x}`));
  }

  console.log(`\n──────────────────────────────`);
  console.log(`✅ ${WRITE ? "Linked" : "Would link"}:  ${linked}`);
  console.log(`↔️  Already had image: ${alreadyOk}`);
  console.log(`⚠️  No map entry:      ${noMap.length}`);
  console.log(`❌ File missing:       ${fileMissing.length}`);
  console.log(
    `\nNOTE: CLINICAL_MANIFESTATION (65 parasite cards) is intentionally NOT handled here — ` +
      `its symptoms map to numbered files (18.png..86.png) with no key. Provide a label→number ` +
      `mapping and I'll extend this script.`,
  );
  console.log(WRITE ? `\n(DB updated.)\n` : `\n(No changes written — add --write to apply.)\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
