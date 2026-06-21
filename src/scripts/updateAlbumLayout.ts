import prisma from '../lib/prisma';

async function main() {
  const layout = await prisma.formLayout.findUnique({
    where: { formKey: 'BOOKING_FORM' }
  });

  if (!layout || !layout.schema) {
    console.log("No layout found.");
    return;
  }

  const schema = layout.schema as any;
  let albumSectionExists = false;

  if (schema.sections) {
    for (let section of schema.sections) {
      if (section.title.toLowerCase().includes('album') || section.id === 'sec_booking_album') {
        albumSectionExists = true;
        // Remove visibility rule
        if (section.visibilityRule) {
          console.log("Removing visibility rule from:", section.title);
          delete section.visibilityRule;
        }
      }
    }

    if (!albumSectionExists) {
      console.log("Adding Album Details section to existing layout...");
      // Add it before Financials or at the end
      const albumSection = {
        id: "sec_booking_album",
        title: "Album Details",
        description: "Details regarding the album design and delivery.",
        icon: "ph-book-open",
        fields: [
          { id: "fld_b_album_type", name: "Album Type", type: "PICK_LIST", mandatory: false, options: ["Standard", "Premium", "Mini", "None"] },
          { id: "fld_b_album_status", name: "Album Status", type: "STATUS_PICKER", mandatory: false, statusOptions: [
            { label: "Pending", color: "#f43f5e" },
            { label: "Designing", color: "#f59e0b" },
            { label: "Printing", color: "#3b82f6" },
            { label: "Delivered", color: "#10b981" }
          ] }
        ]
      };
      
      const finIndex = schema.sections.findIndex((s: any) => s.id === 'sec_booking_financial' || s.title === 'Financials');
      if (finIndex !== -1) {
        schema.sections.splice(finIndex, 0, albumSection);
      } else {
        schema.sections.push(albumSection);
      }
    }

    await prisma.formLayout.update({
      where: { formKey: 'BOOKING_FORM' },
      data: { schema }
    });

    console.log("Successfully updated BOOKING_FORM layout schema.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
