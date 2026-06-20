import prisma from './src/lib/prisma';

async function migrateStatusPicker() {
  console.log('Starting migration to STATUS_PICKER...');
  
  const layouts = await prisma.formLayout.findMany();
  let updatedCount = 0;
  
  const defaultColors = ['bg-emerald-500', 'bg-blue-500', 'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-violet-500', 'bg-slate-500', 'bg-rose-500'];
  
  for (const layout of layouts) {
    if (!layout.schema) continue;
    
    let schemaObj;
    try {
      schemaObj = typeof layout.schema === 'string' ? JSON.parse(layout.schema) : layout.schema;
    } catch (e) {
      console.error(`Failed to parse schema for layout ${layout.id}`);
      continue;
    }
    
    let modified = false;
    
    if (schemaObj && Array.isArray(schemaObj.sections)) {
      schemaObj.sections.forEach((sec: any) => {
        if (Array.isArray(sec.fields)) {
          sec.fields.forEach((field: any) => {
            if (field.id === 'fld_b_status' && field.type === 'PICK_LIST') {
              field.type = 'STATUS_PICKER';
              
              // Map existing options to statusOptions with colors
              const opts = Array.isArray(field.options) ? field.options : ["Pending", "Confirmed", "Completed", "Cancelled"];
              
              field.statusOptions = opts.map((opt: string, idx: number) => {
                let color = defaultColors[idx % defaultColors.length];
                // Try to be smart about default colors
                if (opt.toLowerCase().includes('pend')) color = 'bg-red-500';
                else if (opt.toLowerCase().includes('confirm') || opt.toLowerCase().includes('accept')) color = 'bg-emerald-500';
                else if (opt.toLowerCase().includes('complet') || opt.toLowerCase().includes('deliver')) color = 'bg-blue-500';
                else if (opt.toLowerCase().includes('cancel') || opt.toLowerCase().includes('reject')) color = 'bg-slate-500';
                
                return { label: opt, color };
              });
              
              delete field.options;
              modified = true;
            }
          });
        }
      });
    }
    
    if (modified) {
      await prisma.formLayout.update({
        where: { id: layout.id },
        data: { schema: schemaObj }
      });
      updatedCount++;
      console.log(`Migrated layout ${layout.id} (${layout.name})`);
    }
  }
  
  console.log(`Migration complete! Updated ${updatedCount} form layouts.`);
}

migrateStatusPicker()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
