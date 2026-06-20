import prisma from '../src/lib/prisma';

async function main() {
  console.log('Starting migration...');
  const bookings = await prisma.booking.findMany();

  let migratedCount = 0;

  for (const booking of bookings) {
    if (booking.customData && typeof booking.customData === 'object') {
      const customData = booking.customData as Record<string, any>;

      let updated = false;
      const updateData: any = {};

      if (customData.fld_b_package_name && !booking.packageName) {
        updateData.packageName = customData.fld_b_package_name;
        updated = true;
      }
      
      if (customData.fld_b_inclusions && !booking.inclusions) {
        // inclusions might be a string separated by commas or an array
        let inclusionsArray = customData.fld_b_inclusions;
        if (typeof inclusionsArray === 'string') {
          inclusionsArray = inclusionsArray.split(',').map((s: string) => s.trim());
        }
        updateData.inclusions = inclusionsArray;
        updated = true;
      }

      if (customData.notes && !booking.notes) {
        updateData.notes = customData.notes;
        updated = true;
      }

      if (customData.attachments && !booking.attachments) {
        updateData.attachments = customData.attachments;
        updated = true;
      }

      const team = customData.fld_b_photographers || customData.team;
      if (team && !booking.photographers) {
        updateData.photographers = team;
        updated = true;
      }

      if (updated) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: updateData,
        });
        migratedCount++;
      }
    }
  }

  console.log(`Migration completed. Migrated ${migratedCount} bookings.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
