import { PrismaClient } from '@prisma/client';
try {
  const prisma = new PrismaClient({ url: process.env.DATABASE_URL } as any);
  console.log("Success with url");
} catch(e: any) {
  console.log("Error with url:", e.message);
}
try {
  const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL } as any);
  console.log("Success with datasourceUrl");
} catch(e: any) {
  console.log("Error with datasourceUrl:", e.message);
}
