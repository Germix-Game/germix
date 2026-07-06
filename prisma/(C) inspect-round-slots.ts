import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const SLOTS: {primary:string[];fallback?:string[]}[] = [
  {primary:["GRAM_STAIN","MORPHOLOGY"]},
  {primary:["VIRULENCE_FACTOR"],fallback:["TRANSMISSION"]},
  {primary:["LAB_CHARACTERISTIC"]},
  {primary:["SPECIAL_TRAIT"]},
  {primary:["CLINICAL_MANIFESTATION"]},
];
function resolve(all:any[]){
  return SLOTS.map(s=>{
    let c=all.filter(a=>s.primary.includes(a.clueCard.category));
    if(c.length===0&&s.fallback) c=all.filter(a=>s.fallback!.includes(a.clueCard.category));
    return c.length?c[0].clueCard.category:"NULL";
  });
}
async function main(){
  for(const mode of ["PARASITE","BACTERIA"] as const){
    const ms=await prisma.microbe.findMany({where:{gameMode:mode},select:{id:true,name:true},take:2,orderBy:{name:"asc"}});
    for(const m of ms){
      const all=await prisma.microbeClue.findMany({where:{microbeId:m.id},include:{clueCard:true}});
      console.log(`[${mode}] ${m.name}: ${resolve(all).join(" | ")}`);
    }
  }
}
main().catch(e=>{console.error(e);process.exit(1);}).finally(()=>prisma.$disconnect());
