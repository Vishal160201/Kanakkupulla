import prisma from "@/lib/prisma";
import { Booking } from "@/types";

export const dynamic = "force-dynamic";

export default async function AlbumStatusPage() {
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
                   (customData as any)?.album_status;
    const bStatus = (b.status || '').trim().toLowerCase();
    
    return isAlbum || ['shoot completed', 'designing', 'printing', 'album work in progress'].includes(bStatus);
  });

  return (
    <div className="view-section active w-full fade-in-up">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-10">
        <div className="flex justify-between items-center bg-white p-6 rounded-[24px] shadow-sm border border-slate-100">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Album Status</h2>
          <span className="bg-purple-100 text-purple-700 font-bold px-4 py-1.5 rounded-full text-sm">
            {albumBookings.length} Albums
          </span>
        </div>
        
        {albumBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 bg-white rounded-[24px] border border-dashed border-slate-300 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <i className="ph-fill ph-book-open text-slate-400 text-3xl"></i>
            </div>
            <h3 className="text-lg font-bold text-slate-800">No Albums Found</h3>
            <p className="text-slate-500 mt-1 max-w-sm">There are no pending or in-progress albums at the moment.</p>
          </div>
        ) : (
          <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 p-8">
            <p className="text-slate-600">Album tracking features coming soon! This tab will help you monitor designing, printing, and delivery of your albums.</p>
          </div>
        )}
      </div>
    </div>
  );
}
