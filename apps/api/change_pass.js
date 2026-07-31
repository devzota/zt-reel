const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const oldEmail = 'admin@example.com';
  const newEmail = 'admin@t1.goxo.us';
  const newPassword = 'ZtReel_StrongPass!@#2026';
  
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(newPassword, salt);

  // Update existing user to keep configurations
  await prisma.ztteam_users.updateMany({
    where: { email: oldEmail },
    data: {
      email: newEmail,
      password_hash: password_hash,
    },
  });

  console.log(`\n=== TÀI KHOẢN ĐÃ ĐƯỢC CẬP NHẬT ===`);
  console.log(`User mới: ${newEmail}`);
  console.log(`Pass mới: ${newPassword}`);
  console.log(`=================================\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
