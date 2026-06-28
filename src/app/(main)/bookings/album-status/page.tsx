import prisma from "@/lib/prisma";
import AlbumStatusClient from "./AlbumStatusClient";

export const dynamic = "force-dynamic";

export default async function AlbumStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const initialTab = params?.tab || 'Pending';
  
  const dbBookings = await prisma.booking.findMany({
    where: { 
      deletedAt: null,
    },
    include: { client: true, order: true },
    orderBy: [
      { date: 'desc' },
      { time: 'desc' }
    ]
  });

  const teamUsers = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, email: true, role: true }
  });

  // Filter for albums
  const albumBookings = dbBookings.filter(b => {
    let customData = {};
    try {
      if (b.customData) {
        customData = typeof b.customData === 'string' ? JSON.parse(b.customData) : b.customData;
      }
    } catch(e) {}
    
    const isAlbum = b.category === 'Album' || 
                   (customData as any)?.fld_b_inclusions?.includes('Album') || 
                   (customData as any)?.album_status ||
                   (b as any).albumStatus;
    const bStatus = (b.status || '').trim().toLowerCase();
    
    return isAlbum || ['shoot completed', 'designing', 'printing', 'album work in progress'].includes(bStatus);
  });

  // Serialize to avoid Next.js issues with dates
  const serializedAlbums = albumBookings.map(b => ({
    ...b,
    date: b.date.toISOString(),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    customData: typeof b.customData === 'string' ? b.customData : JSON.stringify(b.customData || {})
  }));

  return <AlbumStatusClient albums={serializedAlbums as any} teamUsers={teamUsers} initialTab={initialTab} />;
}
