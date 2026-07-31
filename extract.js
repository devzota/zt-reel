const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://root:rootpassword@localhost:5432/ztreel?schema=public' } } });
async function main() {
  const templates = await prisma.ztteam_templates.findMany();
  fs.writeFileSync('templates_data.json', JSON.stringify(templates, null, 2));
  console.log('Extracted to templates_data.json');
}
main();
