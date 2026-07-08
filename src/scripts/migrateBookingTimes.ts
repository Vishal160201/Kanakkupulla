import prisma from '../lib/prisma';

function convertTo24Hour(time12h: string): string | null {
  if (!time12h) return null;
  
  // Clean up string
  const cleanStr = time12h.trim().toLowerCase().replace(/\s/g, '');
  
  // Match hours, minutes, and am/pm modifier
  const match = cleanStr.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/);
  
  if (!match) {
    // maybe it's already 24 hour?
    const match24 = cleanStr.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      const h = parseInt(match24[1], 10);
      const m = parseInt(match24[2], 10);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      }
    }
    return null;
  }
  
  let [, hours, minutes, modifier] = match;
  let h = parseInt(hours, 10);
  let m = minutes || '00';
  
  if (h < 1 || h > 12) return null;
  
  if (modifier === 'pm' && h < 12) {
    h += 12;
  }
  if (modifier === 'am' && h === 12) {
    h = 0;
  }
  
  return `${h.toString().padStart(2, '0')}:${m}`;
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`Starting migration... ${isDryRun ? '(DRY RUN)' : ''}`);

  const bookings = await prisma.booking.findMany();
  
  let migrated = 0;
  let skipped = 0;
  
  for (const booking of bookings) {
    let customData: any = {};
    if (typeof booking.customData === 'string') {
      try {
        customData = JSON.parse(booking.customData);
      } catch (e) {
        customData = {};
      }
    } else if (booking.customData && typeof booking.customData === 'object') {
      customData = booking.customData;
    }
    
    if (customData.fld_b_time) {
      console.log(`Skipped ${booking.id}: already has fld_b_time (${customData.fld_b_time})`);
      skipped++;
      continue;
    }
    
    if (!booking.time) {
      console.log(`Skipped ${booking.id}: no time data in source field`);
      skipped++;
      continue;
    }
    
    const convertedTime = convertTo24Hour(booking.time);
    
    if (!convertedTime) {
      console.log(`Skipped ${booking.id}: invalid time format (${booking.time})`);
      skipped++;
      continue;
    }
    
    customData.fld_b_time = convertedTime;
    
    if (!isDryRun) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { customData }
      });
    }
    
    console.log(`Migrated ${booking.id}: ${booking.time} -> ${convertedTime}`);
    migrated++;
  }
  
  console.log(`\nMigration completed. Migrated: ${migrated}, Skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
