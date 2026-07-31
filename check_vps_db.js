const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://root:rootpassword@localhost:5432/ztreel?schema=public' } } });
async function main() { console.log(await prisma.ztteam_templates.count()); } main();
