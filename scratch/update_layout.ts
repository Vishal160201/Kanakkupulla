import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_9yer3vJADMhO@ep-lucky-wildflower-aoouw89k.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const layout = await prisma.formLayout.findUnique({
    where: { formKey: "BOOKING_FORM" }
  });

  if (layout) {
    const schema = layout.schema as any;
    
    // Check if fld_b_photographers exists
    let exists = false;
    for (const section of schema.sections) {
      if (section.id === "sec_booking_event") {
        for (const field of section.fields) {
          if (field.id === "fld_b_photographers") {
            exists = true;
          }
        }
      }
    }

    if (!exists) {
      console.log("Adding fld_b_photographers to sec_booking_event");
      for (const section of schema.sections) {
        if (section.id === "sec_booking_event") {
          const locIdx = section.fields.findIndex((f: any) => f.id === "fld_b_location");
          const insertIdx = locIdx >= 0 ? locIdx + 1 : section.fields.length;
          section.fields.splice(insertIdx, 0, {
            id: "fld_b_photographers",
            name: "Photographers",
            type: "MULTI_USER_PICKLIST",
            mandatory: false
          });
        }
      }

      await prisma.formLayout.update({
        where: { id: layout.id },
        data: { schema: schema }
      });
      console.log("Updated BOOKING_FORM layout.");
    } else {
      console.log("fld_b_photographers already exists.");
    }
  } else {
    console.log("BOOKING_FORM layout not found. Will be seeded on first load.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
