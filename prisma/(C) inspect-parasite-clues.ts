import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const parasiteMicrobes = await prisma.microbe.findMany({
    where: { gameMode: "PARASITE" }, select: { id: true },
  });
  const pIds = new Set(parasiteMicrobes.map(m => m.id));
  const nonParasite = await prisma.microbeClue.findMany({
    where: { microbeId: { notIn: [...pIds] } }, select: { clueCardId: true },
  });
  const sharedIds = new Set(nonParasite.map(c => c.clueCardId));
  const links = await prisma.microbeClue.findMany({
    where: { microbeId: { in: [...pIds] } }, select: { clueCardId: true },
  });
  const clueIds = [...new Set(links.map(l => l.clueCardId))].filter(id => !sharedIds.has(id));
  const cards = await prisma.clueCard.findMany({
    where: { id: { in: clueIds } },
    select: { category: true, label: true, imageUrl: true },
    orderBy: [{ category: "asc" }, { label: "asc" }],
  });
  console.log(`Parasite-exclusive clue cards: ${cards.length}\n`);
  const byCat: Record<string, {label:string; imageUrl:string}[]> = {};
  for (const c of cards) (byCat[c.category] ??= []).push({label:c.label, imageUrl:c.imageUrl});
  for (const cat of Object.keys(byCat)) {
    const rows = byCat[cat];
    const linked = rows.filter(r => r.imageUrl && r.imageUrl.trim() !== "").length;
    console.log(`\n### ${cat}  (${rows.length} cards, ${linked} already have imageUrl)`);
    for (const r of rows) console.log(`   [${r.imageUrl || "—"}]  ${JSON.stringify(r.label)}`);
  }
}
main().catch(e=>{console.error(e);process.exit(1);}).finally(()=>prisma.$disconnect());
