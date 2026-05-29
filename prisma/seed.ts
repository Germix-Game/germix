import { PrismaClient, GameMode, GramType, CardCategory } from '@prisma/client'

const prisma = new PrismaClient()

const bacteria: {
  name: string
  shortName: string
  gramType: GramType
  tags: string[]
  starRating: number
  clues: { category: CardCategory; label: string }[]
}[] = [
  {
    name: 'Staphylococcus aureus',
    shortName: 'S. aureus',
    gramType: 'POSITIVE',
    tags: ['AEROBE', 'FACULTATIVE_ANAEROBE'],
    starRating: 2,
    clues: [
      { category: 'GRAM_STAIN', label: 'Gram-positive cocci in clusters' },
      { category: 'VIRULENCE_FACTOR', label: 'Produces coagulase enzyme' },
      { category: 'LAB_CHARACTERISTIC', label: 'Golden-yellow colonies on agar; beta-haemolytic' },
      { category: 'SPECIAL_TRAIT', label: 'Catalase-positive; mannitol fermenter on MSA' },
      { category: 'CLINICAL_MANIFESTATION', label: 'Causes skin abscesses, bacteraemia, and toxic shock' },
    ],
  },
  {
    name: 'Streptococcus pneumoniae',
    shortName: 'S. pneumoniae',
    gramType: 'POSITIVE',
    tags: ['AEROBE', 'ENCAPSULATED'],
    starRating: 3,
    clues: [
      { category: 'GRAM_STAIN', label: 'Gram-positive diplococci (lancet-shaped pairs)' },
      { category: 'VIRULENCE_FACTOR', label: 'Polysaccharide capsule prevents phagocytosis' },
      { category: 'LAB_CHARACTERISTIC', label: 'Alpha-haemolytic; bile-soluble; optochin-sensitive' },
      { category: 'SPECIAL_TRAIT', label: 'Quellung reaction positive with specific antisera' },
      { category: 'CLINICAL_MANIFESTATION', label: 'Leading cause of community-acquired pneumonia and meningitis' },
    ],
  },
  {
    name: 'Streptococcus pyogenes',
    shortName: 'S. pyogenes',
    gramType: 'POSITIVE',
    tags: ['AEROBE'],
    starRating: 2,
    clues: [
      { category: 'GRAM_STAIN', label: 'Gram-positive cocci in chains' },
      { category: 'VIRULENCE_FACTOR', label: 'M protein inhibits complement-mediated phagocytosis' },
      { category: 'LAB_CHARACTERISTIC', label: 'Beta-haemolytic on blood agar; bacitracin-sensitive (Group A)' },
      { category: 'SPECIAL_TRAIT', label: 'Produces streptolysin O and S; ASO titre rises post-infection' },
      { category: 'CLINICAL_MANIFESTATION', label: 'Strep throat, scarlet fever, rheumatic fever, necrotising fasciitis' },
    ],
  },
  {
    name: 'Enterococcus faecalis',
    shortName: 'E. faecalis',
    gramType: 'POSITIVE',
    tags: ['FACULTATIVE_ANAEROBE'],
    starRating: 3,
    clues: [
      { category: 'GRAM_STAIN', label: 'Gram-positive cocci in pairs or short chains' },
      { category: 'VIRULENCE_FACTOR', label: 'Intrinsic resistance to many antibiotics including cephalosporins' },
      { category: 'LAB_CHARACTERISTIC', label: 'Grows in 6.5% NaCl and at 10–45 °C; PYR-positive' },
      { category: 'SPECIAL_TRAIT', label: 'Gamma (non)-haemolytic; hydrolyses aesculin in bile-aesculin agar' },
      { category: 'CLINICAL_MANIFESTATION', label: 'UTI, endocarditis, and nosocomial infections' },
    ],
  },
  {
    name: 'Clostridium difficile',
    shortName: 'C. difficile',
    gramType: 'POSITIVE',
    tags: ['ANAEROBE', 'SPORE_FORMER'],
    starRating: 3,
    clues: [
      { category: 'GRAM_STAIN', label: 'Gram-positive rod (may appear Gram-variable)' },
      { category: 'VIRULENCE_FACTOR', label: 'Produces toxin A (enterotoxin) and toxin B (cytotoxin)' },
      { category: 'LAB_CHARACTERISTIC', label: 'Strict anaerobe; horse-manure odour; fluoresces under UV' },
      { category: 'SPECIAL_TRAIT', label: 'Spore-forming; resistant to alcohol-based hand gel' },
      { category: 'CLINICAL_MANIFESTATION', label: 'Antibiotic-associated diarrhoea and pseudomembranous colitis' },
    ],
  },
  {
    name: 'Clostridium perfringens',
    shortName: 'C. perfringens',
    gramType: 'POSITIVE',
    tags: ['ANAEROBE', 'SPORE_FORMER'],
    starRating: 3,
    clues: [
      { category: 'GRAM_STAIN', label: 'Gram-positive rod; large, boxcar-shaped' },
      { category: 'VIRULENCE_FACTOR', label: 'Alpha toxin (lecithinase) causes membrane destruction' },
      { category: 'LAB_CHARACTERISTIC', label: 'Double zone of haemolysis on blood agar; stormy fermentation of milk' },
      { category: 'SPECIAL_TRAIT', label: 'Lacks motility; spore subterminal; rapid gas production' },
      { category: 'CLINICAL_MANIFESTATION', label: 'Gas gangrene (myonecrosis) and food poisoning' },
    ],
  },
  {
    name: 'Bacillus anthracis',
    shortName: 'B. anthracis',
    gramType: 'POSITIVE',
    tags: ['AEROBE', 'SPORE_FORMER', 'ENCAPSULATED'],
    starRating: 4,
    clues: [
      { category: 'GRAM_STAIN', label: 'Gram-positive rod in long chains; "bamboo rod" appearance' },
      { category: 'VIRULENCE_FACTOR', label: 'Poly-D-glutamate capsule + anthrax toxin (PA, LF, EF)' },
      { category: 'LAB_CHARACTERISTIC', label: 'Non-haemolytic "Medusa head" colonies; non-motile' },
      { category: 'SPECIAL_TRAIT', label: 'Endospores survive decades in soil; gamma phage lysis' },
      { category: 'CLINICAL_MANIFESTATION', label: 'Cutaneous, inhalation (woolsorters\'), and GI anthrax' },
    ],
  },
  {
    name: 'Listeria monocytogenes',
    shortName: 'L. monocytogenes',
    gramType: 'POSITIVE',
    tags: ['FACULTATIVE_ANAEROBE', 'INTRACELLULAR'],
    starRating: 4,
    clues: [
      { category: 'GRAM_STAIN', label: 'Gram-positive short rod (may be mistaken for diphtheroids)' },
      { category: 'VIRULENCE_FACTOR', label: 'Listeriolysin O (LLO) enables escape from phagosomes' },
      { category: 'LAB_CHARACTERISTIC', label: 'Tumbling motility at room temperature; CAMP-test positive' },
      { category: 'SPECIAL_TRAIT', label: 'Grows at 4 °C (cold enrichment); beta-haemolytic' },
      { category: 'CLINICAL_MANIFESTATION', label: 'Listeriosis: meningitis in neonates, immunocompromised, and pregnant women' },
    ],
  },
  {
    name: 'Escherichia coli',
    shortName: 'E. coli',
    gramType: 'NEGATIVE',
    tags: ['AEROBE', 'FACULTATIVE_ANAEROBE'],
    starRating: 1,
    clues: [
      { category: 'GRAM_STAIN', label: 'Gram-negative rod (bacillus)' },
      { category: 'VIRULENCE_FACTOR', label: 'Shiga toxin (STEC), heat-labile/stable enterotoxins (ETEC)' },
      { category: 'LAB_CHARACTERISTIC', label: 'Lactose fermenter; pink colonies on MacConkey agar; IMViC ++--' },
      { category: 'SPECIAL_TRAIT', label: 'Metallic sheen on EMB agar; part of normal gut flora' },
      { category: 'CLINICAL_MANIFESTATION', label: 'UTI, diarrhoea, HUS (O157:H7), neonatal meningitis' },
    ],
  },
  {
    name: 'Klebsiella pneumoniae',
    shortName: 'K. pneumoniae',
    gramType: 'NEGATIVE',
    tags: ['AEROBE', 'ENCAPSULATED'],
    starRating: 3,
    clues: [
      { category: 'GRAM_STAIN', label: 'Gram-negative rod; prominent capsule visible on India ink' },
      { category: 'VIRULENCE_FACTOR', label: 'Thick polysaccharide capsule causes "mucoid" appearance' },
      { category: 'LAB_CHARACTERISTIC', label: 'Lactose fermenter; very mucoid colonies on agar' },
      { category: 'SPECIAL_TRAIT', label: 'IMViC --++; does not produce hydrogen sulphide' },
      { category: 'CLINICAL_MANIFESTATION', label: 'Lobar pneumonia (currant-jelly sputum), UTI, nosocomial infections' },
    ],
  },
  {
    name: 'Pseudomonas aeruginosa',
    shortName: 'P. aeruginosa',
    gramType: 'NEGATIVE',
    tags: ['AEROBE'],
    starRating: 3,
    clues: [
      { category: 'GRAM_STAIN', label: 'Gram-negative rod; non-fermentative' },
      { category: 'VIRULENCE_FACTOR', label: 'Exotoxin A inhibits EF-2; pyocyanin generates reactive oxygen' },
      { category: 'LAB_CHARACTERISTIC', label: 'Blue-green pigment (pyocyanin); fruity grape-like odour' },
      { category: 'SPECIAL_TRAIT', label: 'Oxidase-positive; grows at 42 °C; intrinsic multidrug resistance' },
      { category: 'CLINICAL_MANIFESTATION', label: 'Burn wound infections, cystic fibrosis lung disease, osteomyelitis' },
    ],
  },
  {
    name: 'Neisseria meningitidis',
    shortName: 'N. meningitidis',
    gramType: 'NEGATIVE',
    tags: ['AEROBE', 'ENCAPSULATED'],
    starRating: 4,
    clues: [
      { category: 'GRAM_STAIN', label: 'Gram-negative diplococci; kidney-bean shape, intracellular in PMNs' },
      { category: 'VIRULENCE_FACTOR', label: 'Polysaccharide capsule (serogroup A, B, C, W, Y); lipooligosaccharide' },
      { category: 'LAB_CHARACTERISTIC', label: 'Grows on chocolate agar; oxidase-positive; ferments glucose and maltose' },
      { category: 'SPECIAL_TRAIT', label: 'Requires CO₂; Thayer-Martin medium for selective isolation' },
      { category: 'CLINICAL_MANIFESTATION', label: 'Bacterial meningitis and septicaemia with petechial/purpuric rash' },
    ],
  },
  {
    name: 'Helicobacter pylori',
    shortName: 'H. pylori',
    gramType: 'NEGATIVE',
    tags: ['AEROBE'],
    starRating: 2,
    clues: [
      { category: 'GRAM_STAIN', label: 'Gram-negative spiral (helical) rod; S-shaped or gull-wing' },
      { category: 'VIRULENCE_FACTOR', label: 'CagA oncoprotein and VacA cytotoxin damage gastric epithelium' },
      { category: 'LAB_CHARACTERISTIC', label: 'Strongly urease-positive; oxidase- and catalase-positive' },
      { category: 'SPECIAL_TRAIT', label: 'Microaerophilic; urea breath test detects active infection' },
      { category: 'CLINICAL_MANIFESTATION', label: 'Peptic ulcer disease, chronic gastritis, gastric carcinoma (IARC Group 1)' },
    ],
  },
  {
    name: 'Vibrio cholerae',
    shortName: 'V. cholerae',
    gramType: 'NEGATIVE',
    tags: ['FACULTATIVE_ANAEROBE'],
    starRating: 3,
    clues: [
      { category: 'GRAM_STAIN', label: 'Gram-negative curved rod (comma-shaped)' },
      { category: 'VIRULENCE_FACTOR', label: 'Cholera toxin (CT) activates adenylyl cyclase → massive Cl⁻/H₂O secretion' },
      { category: 'LAB_CHARACTERISTIC', label: 'Grows on TCBS agar as yellow colonies; oxidase-positive' },
      { category: 'SPECIAL_TRAIT', label: 'Darting motility ("shooting star"); sensitive to acid' },
      { category: 'CLINICAL_MANIFESTATION', label: 'Rice-water diarrhoea leading to severe dehydration and death' },
    ],
  },
  {
    name: 'Salmonella typhi',
    shortName: 'S. typhi',
    gramType: 'NEGATIVE',
    tags: ['FACULTATIVE_ANAEROBE', 'INTRACELLULAR'],
    starRating: 3,
    clues: [
      { category: 'GRAM_STAIN', label: 'Gram-negative rod; motile with peritrichous flagella' },
      { category: 'VIRULENCE_FACTOR', label: 'Vi capsular antigen inhibits complement; LPS endotoxin' },
      { category: 'LAB_CHARACTERISTIC', label: 'H₂S-producing; black colonies on XLD/HE agar; non-lactose fermenter' },
      { category: 'SPECIAL_TRAIT', label: 'Widal test detects O and H agglutinins; survives in macrophages' },
      { category: 'CLINICAL_MANIFESTATION', label: 'Typhoid (enteric) fever: rose spots, relative bradycardia, splenomegaly' },
    ],
  },
  {
    name: 'Bacteroides fragilis',
    shortName: 'B. fragilis',
    gramType: 'NEGATIVE',
    tags: ['ANAEROBE', 'ENCAPSULATED'],
    starRating: 3,
    clues: [
      { category: 'GRAM_STAIN', label: 'Gram-negative rod; pleomorphic with vacuoles' },
      { category: 'VIRULENCE_FACTOR', label: 'Polysaccharide capsule and fragilysin (BFT) metalloprotease' },
      { category: 'LAB_CHARACTERISTIC', label: 'Obligate anaerobe; resistant to bile; produces succinic acid' },
      { category: 'SPECIAL_TRAIT', label: 'Most common anaerobe in clinical infections; resistant to metronidazole rarely' },
      { category: 'CLINICAL_MANIFESTATION', label: 'Intra-abdominal abscesses, peritonitis, bacteraemia after bowel injury' },
    ],
  },
  {
    name: 'Mycobacterium tuberculosis',
    shortName: 'M. tuberculosis',
    gramType: 'ACID_FAST',
    tags: ['AEROBE', 'INTRACELLULAR'],
    starRating: 4,
    clues: [
      { category: 'GRAM_STAIN', label: 'Acid-fast bacillus; appears red on Ziehl-Neelsen stain' },
      { category: 'VIRULENCE_FACTOR', label: 'Cord factor (trehalose dimycolate) and lipoarabinomannan inhibit phagosome maturation' },
      { category: 'LAB_CHARACTERISTIC', label: 'Slow grower (2–8 weeks); rough buff colonies on Löwenstein-Jensen medium' },
      { category: 'SPECIAL_TRAIT', label: 'Niacin-positive; obligate aerobe; survives in macrophages' },
      { category: 'CLINICAL_MANIFESTATION', label: 'Pulmonary TB: cough, haemoptysis, night sweats, weight loss, Ghon complex' },
    ],
  },
  {
    name: 'Mycobacterium leprae',
    shortName: 'M. leprae',
    gramType: 'ACID_FAST',
    tags: ['INTRACELLULAR'],
    starRating: 5,
    clues: [
      { category: 'GRAM_STAIN', label: 'Acid-fast bacillus; "broken beads" on Fite-Faraco stain' },
      { category: 'VIRULENCE_FACTOR', label: 'Phenolic glycolipid-1 (PGL-1) targets Schwann cells; evades innate immunity' },
      { category: 'LAB_CHARACTERISTIC', label: 'Cannot be cultured in vitro; grows in mouse footpad or armadillo' },
      { category: 'SPECIAL_TRAIT', label: 'Grows at 27–30 °C (peripheral nerves/skin); very slow doubler (12 days)' },
      { category: 'CLINICAL_MANIFESTATION', label: 'Leprosy: tuberculoid (high CMI) vs. lepromatous (low CMI); glove-and-stocking anaesthesia' },
    ],
  },
]

async function main() {
  console.log('Seeding bacteria microbes…')

  for (const m of bacteria) {
    const microbe = await prisma.microbe.upsert({
      where: { name: m.name },
      update: {},
      create: {
        name: m.name,
        shortName: m.shortName,
        answerImageUrl: '',
        gameMode: GameMode.BACTERIA,
        gramType: m.gramType as GramType,
        tags: m.tags as any,
        starRating: m.starRating,
      },
    })

    for (let i = 0; i < m.clues.length; i++) {
      const c = m.clues[i]
      const clueCard = await prisma.clueCard.upsert({
        where: { id: `${microbe.id}-clue-${i}` },
        update: {},
        create: {
          id: `${microbe.id}-clue-${i}`,
          category: c.category as CardCategory,
          label: c.label,
          imageUrl: '',
        },
      })

      await prisma.microbeClue.upsert({
        where: { microbeId_clueCardId: { microbeId: microbe.id, clueCardId: clueCard.id } },
        update: {},
        create: {
          microbeId: microbe.id,
          clueCardId: clueCard.id,
          sortOrder: i,
        },
      })
    }

    console.log(`  ✓ ${m.name}`)
  }

  console.log(`Done. ${bacteria.length} bacteria seeded.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
