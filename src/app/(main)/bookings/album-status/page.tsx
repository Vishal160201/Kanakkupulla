import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { AlbumBooking, AlbumCustomData } from "@/types/bookings";
import { parseCustomData } from "@/components/bookings/layoutUtils";
import AlbumStatusClient from "./AlbumStatusClient";
import { requirePageAccess } from "@/lib/pageAccess";

export const dynamic = "force-dynamic";

// Booking statuses (trimmed, lower-cased) that put a booking on the album board.
const ALBUM_PIPELINE_STATUSES = ['shoot completed', 'designing', 'printing', 'album work in progress'];

type AlbumCandidate = { category: string; status: string; customData: Prisma.JsonValue };

/** Exact album check. customData markers can only be evaluated here (JSON may be stored as a string). */
function isAlbumBooking(b: AlbumCandidate): boolean {
  const customData = parseCustomData<AlbumCustomData & { fld_b_inclusions?: string | string[] }>(b.customData);

  const isAlbum = b.category === 'Album' ||
                 customData?.fld_b_inclusions?.includes('Album') ||
                 customData?.album_status ||
                 customData?.fld_b_album_status;
  const bStatus = (b.status || '').trim().toLowerCase();

  return Boolean(isAlbum) || ALBUM_PIPELINE_STATUSES.includes(bStatus);
}

export default async function AlbumStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requirePageAccess("albums");
  const params = await searchParams;
  const initialTab = params?.tab || 'Pending';

  const [dbBookings, teamUsers] = await Promise.all([
    prisma.booking.findMany({
      where: {
        deletedAt: null,
        // Superset of isAlbumBooking(): bookings with no customData can only qualify by category or status.
        // (The status match is case-insensitive "contains" so untrimmed values are not lost; the exact
        // check runs below.)
        OR: [
          { category: 'Album' },
          ...ALBUM_PIPELINE_STATUSES.map(s => ({ status: { contains: s, mode: 'insensitive' as const } })),
          { NOT: { customData: { equals: Prisma.DbNull } } },
        ],
      },
      select: {
        id: true,
        bookingNumber: true,
        category: true,
        date: true,
        status: true,
        customData: true,
        client: { select: { name: true, phone: true } },
      },
      orderBy: [
        { date: 'desc' },
        { time: 'desc' }
      ]
    }),
    prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, email: true, role: true }
    }),
  ]);

  // Serialize to avoid Next.js issues with dates
  const serializedAlbums: AlbumBooking[] = dbBookings.filter(isAlbumBooking).map(b => {
    const cd = parseCustomData<AlbumCustomData>(b.customData);

    if (!cd.fld_b_album_status && (b.status || '').trim().toLowerCase() === 'delivered') {
      cd.fld_b_album_status = 'Delivered';
    }

    return {
      ...b,
      date: b.date.toISOString(),
      customData: JSON.stringify(cd)
    };
  });

  return <AlbumStatusClient albums={serializedAlbums} teamUsers={teamUsers} initialTab={initialTab} />;
}
