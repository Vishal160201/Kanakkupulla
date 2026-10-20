"use client";

import React, { useState } from 'react';
import { useGlobalForm } from "@/components/providers/GlobalFormProvider";

import { updateAlbumTrackingAction } from "@/app/actions";
import { toast } from "sonner";
import { useRouter } from 'next/navigation';
import { mutate as globalMutate } from 'swr';
import type { AlbumBooking, AlbumTeamUser, AlbumTrackingUpdates } from "@/types/bookings";
import AlbumMetricCards from "@/components/bookings/album-status/AlbumMetricCards";
import AlbumFilterBar from "@/components/bookings/album-status/AlbumFilterBar";
import AlbumTable, { ITEMS_PER_PAGE } from "@/components/bookings/album-status/AlbumTable";
import AlbumDetailPanel from "@/components/bookings/album-status/AlbumDetailPanel";
import {
  albumData, deliveryDateOf, designerIdOf, designerName, isAlbumOverdue,
} from "@/components/bookings/album-status/albumUtils";
import styles from './album-status.module.css';
import { useAccess } from "@/hooks/useAccess";

interface AlbumStatusClientProps {
  albums: AlbumBooking[];
  teamUsers?: AlbumTeamUser[];
  initialTab?: string;
}

/** Whether an album belongs to the given tab (status filter). */
function matchesTab(a: AlbumBooking, activeTab: string): boolean {
  const customData = albumData(a);
  const aStatus = (customData.fld_b_album_status || 'pending').trim().toLowerCase();

  if (activeTab === 'Pending') return aStatus === 'pending';
  if (activeTab === 'Designing') return aStatus === 'designing';
  if (activeTab === 'Sent for printing') return aStatus === 'sent for printing';
  if (activeTab === 'Ready for delivery') return aStatus === 'ready for delivery';
  if (activeTab === 'Work in Progress') return ['designing', 'sent for printing'].includes(aStatus);
  if (activeTab === 'Completed') return aStatus === 'ready for delivery';
  if (activeTab === 'Delivered') return aStatus === 'delivered';
  if (activeTab === 'Overdue') {
    const deliveryDateStr = deliveryDateOf(customData);
    if (!deliveryDateStr) return false;
    const deliveryDate = new Date(deliveryDateStr);
    if (deliveryDate >= new Date() || aStatus === 'delivered') return false;
  }
  return true;
}

function matchesSearch(a: AlbumBooking, searchQuery: string, teamUsers: AlbumTeamUser[]): boolean {
  if (!searchQuery) return true;
  const q = searchQuery.toLowerCase();
  const designer = designerName(teamUsers, designerIdOf(albumData(a)), '') as string;

  return (a.client?.name || '').toLowerCase().includes(q) ||
    (a.client?.phone || '').toLowerCase().includes(q) ||
    (a.bookingNumber || '').toLowerCase().includes(q) ||
    (a.category || '').toLowerCase().includes(q) ||
    designer.toLowerCase().includes(q) ||
    a.id.toLowerCase().includes(q);
}

export default function AlbumStatusClient({ albums: initialAlbums, teamUsers = [], initialTab = 'Pending' }: AlbumStatusClientProps) {
  const router = useRouter();
  const { openBookingDetails } = useGlobalForm();
  const { can } = useAccess();
  // Album tracking updates need Album status (or Bookings) Manage; otherwise the page is read-only.
  const canEdit = can('albums', 'MANAGE') || can('bookings', 'MANAGE');

  // Local copy for optimistic updates; replaced whenever the server sends a fresh list.
  const [albums, setAlbums] = useState(initialAlbums);
  const [syncedAlbums, setSyncedAlbums] = useState(initialAlbums);
  if (syncedAlbums !== initialAlbums) {
    setSyncedAlbums(initialAlbums);
    setAlbums(initialAlbums);
  }

  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const counts = React.useMemo(() => {
    const statusCount = (status: string) => albums.filter(b => (albumData(b).fld_b_album_status || 'Pending') === status).length;
    return {
      'Pending': statusCount('Pending'),
      'Designing': albums.filter(b => albumData(b).fld_b_album_status === 'Designing').length,
      'Sent for printing': albums.filter(b => albumData(b).fld_b_album_status === 'Sent for printing').length,
      'Ready for delivery': albums.filter(b => albumData(b).fld_b_album_status === 'Ready for delivery').length,
      'Overdue': albums.filter(b => isAlbumOverdue(albumData(b))).length,
    } as Record<string, number>;
  }, [albums]);

  const handleUpdateAlbum = async (bookingId: string, updates: AlbumTrackingUpdates) => {
    // Optimistic update
    setAlbums(prev => prev.map(a => {
      if (a.id === bookingId) {
        let newCustomData = JSON.parse(a.customData);
        if (updates.customData) {
          newCustomData = { ...newCustomData, ...updates.customData };
        }
        return {
          ...a,
          status: updates.status !== undefined ? updates.status : a.status,
          customData: JSON.stringify(newCustomData)
        };
      }
      return a;
    }));

    const res = await updateAlbumTrackingAction(bookingId, updates);
    if (!res.success) {
      toast.error(res.error || "Failed to update album");
      // Revert optimistic update ideally, but skipping for brevity
    } else {
      toast.success("Album updated");
      globalMutate(
        (key) => typeof key === 'string' && (key.startsWith('/api/bookings') || key.startsWith('/api/dashboard')),
        undefined,
        { revalidate: true }
      );
      router.refresh();
    }
  };

  const selectedAlbum = albums.find(a => a.id === selectedAlbumId) || null;

  const filteredAlbums = albums.filter(a => matchesTab(a, activeTab) && matchesSearch(a, searchQuery, teamUsers));

  const totalPages = Math.max(1, Math.ceil(filteredAlbums.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedAlbums = filteredAlbums.slice((safeCurrentPage - 1) * ITEMS_PER_PAGE, safeCurrentPage * ITEMS_PER_PAGE);

  const totalCount = albums.length;

  return (
    <div className="view-section active w-full fade-in-up">
      <div className="flex flex-col gap-6 max-w-[1400px] mx-auto pb-10">

        {/* Metrics Cards */}
        <div className={styles.cardRowWrap}>
          <AlbumMetricCards
            counts={counts}
            activeTab={activeTab}
            onSelect={setActiveTab}
            rowClassName={styles.cardRow}
            cardAnimClassName={styles.cardAnim}
          />
        </div>

        {/* Filters Row */}
        {totalCount > 0 && (
          <AlbumFilterBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}

        {/* Main Content Split */}
        <div className="flex flex-col lg:flex-row gap-6 mt-2">

          {/* Left Column - List */}
          <AlbumTable
            albums={paginatedAlbums}
            teamUsers={teamUsers}
            selectedAlbumId={selectedAlbumId}
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            totalItems={filteredAlbums.length}
            onPageChange={setCurrentPage}
            onOpenDetails={openBookingDetails}
            onSelect={setSelectedAlbumId}
            onUpdate={handleUpdateAlbum}
            canEdit={canEdit}
          />

          {/* Right Column - Detail Panel */}
          {selectedAlbum && (
            <AlbumDetailPanel
              album={selectedAlbum}
              teamUsers={teamUsers}
              onClose={() => setSelectedAlbumId(null)}
              onOpenDetails={() => {
                if (selectedAlbumId) openBookingDetails(selectedAlbumId);
              }}
              onUpdate={handleUpdateAlbum}
              canEdit={canEdit}
            />
          )}

        </div>
      </div>
    </div>
  );
}
