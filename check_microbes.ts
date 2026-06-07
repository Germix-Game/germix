import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
prisma.microbe.groupBy({ by: ['gameMode'], _count: { id: true } })
  .then(r => console.log(JSON.stringify(r)))
  .catch(console.error)
  .finally(() => prisma.$disconnect())
