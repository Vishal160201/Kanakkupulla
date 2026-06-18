import prisma from './src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const email = 'test@test.com';
  let user = await prisma.user.findUnique({ where: { email } });
  
  const password = await bcrypt.hash('password', 10);
  
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'Test User',
        email,
        password,
        role: 'ADMIN',
      }
    });
    console.log('Created test user:', user.email);
  } else {
    await prisma.user.update({
      where: { email },
      data: { password, role: 'ADMIN' }
    });
    console.log('Updated test user:', user.email);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
