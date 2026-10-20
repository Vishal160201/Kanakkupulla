"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { albumStatusInput, bookingSchema } from "@/lib/validations/booking";
import { asJsonRecord, jsonObject, jsonValue, parseDateInput, pickCustomFields } from "@/lib/validations/common";
import { Booking } from "@/types";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { broadcastNotification } from "@/lib/notifications";
import { assertAccess } from "@/lib/authz";
import { trashBooking } from "@/lib/recycleBin";
import crypto from "crypto";

/** JSON-encoded form field → Json column value (undefined = leave unchanged). */
function parseJsonField(value: FormDataEntryValue | undefined): Prisma.InputJsonValue | undefined {
  if (!value || typeof value !== "string") return undefined;
  let raw: unknown;
  try {
    raw = JSON.parse(value);
  } catch {
    throw new Error("Invalid form data");
  }
  const parsed = jsonValue.safeParse(raw);
  if (!parsed.success) throw new Error("Invalid form data");
  return parsed.data === null ? undefined : parsed.data;
}

function parseAmount(value: unknown) {
  return parseFloat(String(value || '0').replace(/,/g, '')) || 0;
}

/** Installments JSON → Json column value; missing/invalid clears the column. */
function parseInstallments(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (!value) return Prisma.DbNull;
  try {
    const parsed = jsonValue.safeParse(JSON.parse(String(value)));
    return parsed.success && parsed.data !== null ? parsed.data : Prisma.DbNull;
  } catch {
    return Prisma.DbNull;
  }
}

/** "Pending" / "In Progress" / "DELIVERED" → AlbumStatus enum, or undefined when absent/unknown. */
function toAlbumStatus(value: string | undefined) {
  if (!value) return undefined;
  return albumStatusInput.safeParse(value).data;
}

const STANDARD_BOOKING_KEYS = ['id', 'title', 'category', 'date', 'time', 'location', 'phone', 'email', 'package', 'advance', 'due', 'status', 'installments', 'packageName', 'inclusions', 'notes', 'attachments', 'photographers', 'albumStatus', 'galleryDelivered', 'customData', 'recordDate'];

const bookingIdSchema = z.string().min(1, "Booking ID is required");
const statusSchema = z.string().trim().min(1, "Status is required").max(100);
const albumTrackingSchema = z.object({
  status: z.string().trim().max(100).optional(),
  customData: jsonObject.optional(),
});

async function generateBookingNumber(db: Pick<typeof prisma, "booking">) {
  while (true) {
    const bookingNumber = `#MD-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const exists = await db.booking.findFirst({ where: { bookingNumber }, select: { id: true } });
    if (!exists) return bookingNumber;
  }
}

export async function saveBookingAction(formData: FormData) {
  try {
    const user = await assertAccess(["bookings", "MANAGE"]);
    const rawData = Object.fromEntries(formData.entries());
    const validatedData = bookingSchema.parse(rawData);
    
    // Extract custom dynamic fields (fld_* etc.) that are not standard / reserved columns; files are dropped
    const customData = pickCustomFields(rawData, STANDARD_BOOKING_KEYS);

    // Logic to reset Album Status to Pending if Event Status changes to Shoot Completed
    // is now handled inside the existingBooking check below for updates, and here for creations.
    if (!validatedData.id && (validatedData.status === 'Shoot Completed' || validatedData.status === 'Completed')) {
      customData.fld_b_album_status = 'Pending';
    }

    const recordDate = typeof rawData.recordDate === "string" && rawData.recordDate
      ? parseDateInput(rawData.recordDate) ?? undefined
      : undefined;
    const bookingDate = recordDate ?? (validatedData.date ? parseDateInput(validatedData.date) ?? new Date() : new Date());
    const albumStatus = toAlbumStatus(validatedData.albumStatus);

    const inclusions = parseJsonField(rawData.inclusions);
    const attachments = parseJsonField(rawData.attachments);
    const photographers = parseJsonField(rawData.photographers);
    const pkg = parseAmount(validatedData.package);
    const adv = parseAmount(validatedData.advance);
    const due = parseAmount(validatedData.due);
    const parsedInstallments = parseInstallments(validatedData.installments);

    if (validatedData.id) {
       const existingBooking = await prisma.booking.findUnique({
         where: { id: validatedData.id },
         select: { clientId: true, status: true, deletedAt: true, bookingNumber: true },
       });
       if (!existingBooking || existingBooking.deletedAt) {
         return { success: false, errors: { _form: ["Booking not found"] } };
       }
       {
         const isNewlyShootCompleted = (validatedData.status === 'Shoot Completed' || validatedData.status === 'Completed') && 
                                       (existingBooking.status !== 'Shoot Completed' && existingBooking.status !== 'Completed');
                                       
         if (isNewlyShootCompleted || ((validatedData.status === 'Shoot Completed' || validatedData.status === 'Completed') && !customData.fld_b_album_status)) {
           customData.fld_b_album_status = 'Pending';
         } else if (validatedData.status !== 'Shoot Completed' && validatedData.status !== 'Completed') {
           delete customData.fld_b_album_status;
         }

         await prisma.$transaction([
         prisma.client.update({
           where: { id: existingBooking.clientId },
           data: { name: validatedData.title, phone: validatedData.phone || "", email: validatedData.email }
         }),
         prisma.booking.update({
           where: { id: validatedData.id },
           data: {
             category: validatedData.category,
             date: bookingDate,
             time: validatedData.time || "",
             location: validatedData.location || "",
             status: validatedData.status,
             packageName: rawData.packageName ? String(rawData.packageName) : undefined,
             inclusions,
             notes: rawData.notes ? String(rawData.notes) : undefined,
             attachments,
             photographers,
             albumStatus,
             galleryDelivered: validatedData.galleryDelivered !== undefined ? (validatedData.galleryDelivered === 'true' || validatedData.galleryDelivered === true) : undefined,
             customData: Object.keys(customData).length > 0 ? customData : undefined,
             updatedBy: { connect: { id: user.id } },
           }
         }),
         prisma.order.upsert({
           where: { bookingId: validatedData.id },
           update: { package: pkg, advance: adv, due: due, installments: parsedInstallments },
           create: { bookingId: validatedData.id, package: pkg, advance: adv, due: due, installments: parsedInstallments }
         }),
         prisma.systemLog.create({
           data: { action: "BOOKING_UPDATED", details: `Updated booking ID: ${validatedData.id}`, userId: user.id }
         }),
         ]);

         // Fire and forget notification to prevent blocking UI
         broadcastNotification({
           title: "Booking Updated",
           message: `The booking ${existingBooking.bookingNumber || ''} has been updated.`,
           type: "BOOKING_UPDATED",
           actionUrl: `/bookings/details/${validatedData.id}`,
           entityId: validatedData.id,
           entityType: "booking",
           skipUserId: user.id
         }).catch(e => console.error("Notification error:", e));

         revalidatePath('/', 'layout');
         return { success: true, data: validatedData as Booking };
       }
    }
    
    const requestedNumber = rawData.bookingNumber ? String(rawData.bookingNumber) : "";
    const { newBooking, nextBookingNumber } = await prisma.$transaction(async tx => {
      const nextBookingNumber = requestedNumber || await generateBookingNumber(tx);
      const client = await tx.client.create({
        data: { name: validatedData.title, phone: validatedData.phone || "", email: validatedData.email }
      });

      const newBooking = await tx.booking.create({
        data: {
          bookingNumber: nextBookingNumber,
          clientId: client.id,
          category: validatedData.category,
          date: bookingDate,
          time: validatedData.time || "",
          location: validatedData.location || "",
          status: validatedData.status,
          packageName: rawData.packageName ? String(rawData.packageName) : undefined,
          inclusions,
          notes: rawData.notes ? String(rawData.notes) : undefined,
          attachments,
          photographers,
          albumStatus,
          galleryDelivered: validatedData.galleryDelivered !== undefined ? (validatedData.galleryDelivered === 'true' || validatedData.galleryDelivered === true) : undefined,
          customData: Object.keys(customData).length > 0 ? customData : undefined,
          createdById: user.id,
          updatedById: user.id,
        }
      });

      await tx.order.create({
        data: {
          bookingId: newBooking.id,
          package: pkg,
          advance: adv,
          due: due,
          installments: parsedInstallments
        }
      });

      await tx.systemLog.create({
        data: { action: "BOOKING_CREATED", details: `Created booking ID: ${newBooking.id} for client ${client.name}`, userId: user.id }
      });

      return { client, newBooking, nextBookingNumber };
    });

    // Fire and forget notification to prevent blocking UI
    broadcastNotification({
      title: "New Booking Created",
      message: `A new booking (${nextBookingNumber}) has been created for ${validatedData.title}.`,
      type: "BOOKING_CREATED",
      actionUrl: `/bookings/details/${newBooking.id}`,
      entityId: newBooking.id,
      entityType: "booking",
      skipUserId: user.id
    }).catch(e => console.error("Notification error:", e));

    revalidatePath('/', 'layout');

    return { 
      success: true, 
      data: { ...validatedData, id: newBooking.id } as Booking 
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.flatten().fieldErrors };
    }
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return { success: false, errors: { _form: ["You don't have permission to save bookings."] } };
    }
    return { success: false, errors: { _form: [error instanceof Error ? error.message : "An unexpected error occurred while saving the booking."] } };
  }
}

export async function deleteBookingAction(id: string) {
  try {
    const user = await assertAccess(["bookings", "MANAGE"]);
    if (!bookingIdSchema.safeParse(id).success) return { success: false, error: "Not found" };
    const trashed = await trashBooking(id, user.id);
    if (!trashed) return { success: false, error: "Not found" };

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error && e.message === "Forbidden" ? "Permission denied" : "Failed to delete booking" };
  }
}

export async function updateBookingStatusAction(bookingId: string, newStatus: string) {
  try {
    const user = await assertAccess(["bookings", "MANAGE"]);
    const idResult = bookingIdSchema.safeParse(bookingId);
    const statusResult = statusSchema.safeParse(newStatus);
    if (!idResult.success || !statusResult.success) return { success: false, error: 'Invalid input' };
    newStatus = statusResult.data;

    const existing = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { status: true, customData: true, deletedAt: true },
    });
    if (!existing || existing.deletedAt) return { success: false, error: 'Not found' };

    const dataToUpdate: Prisma.BookingUncheckedUpdateInput = { status: newStatus, updatedById: user.id };
    const customData = asJsonRecord(existing.customData);
    if (newStatus === 'Shoot Completed' || newStatus === 'Completed') {
      if (existing.status !== newStatus || !customData.fld_b_album_status) {
         dataToUpdate.customData = { ...customData, fld_b_album_status: 'Pending' };
      }
    } else if (customData.fld_b_album_status) {
      delete customData.fld_b_album_status;
      dataToUpdate.customData = customData;
    }
    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: dataToUpdate
    });
    
    await prisma.systemLog.create({
      data: { action: "BOOKING_STATUS_UPDATED", details: `Updated booking ID: ${bookingId} status to ${newStatus}`, userId: user.id }
    });
    
    // Fire and forget notification to prevent blocking UI
    broadcastNotification({
      title: "Booking Status Changed",
      message: `Booking ${booking.bookingNumber || ''} status has been updated to ${newStatus}.`,
      type: "BOOKING_UPDATED",
      actionUrl: `/bookings/details/${bookingId}`,
      entityId: bookingId,
      entityType: "booking",
      skipUserId: user.id
    }).catch(e => console.error("Notification error:", e));

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error && e.message === "Forbidden" ? "Permission denied" : "Failed to update booking status" };
  }
}

export async function updateAlbumTrackingAction(bookingId: string, updates: { status?: string, customData?: Record<string, unknown> }) {
  try {
    const user = await assertAccess(["albums", "MANAGE"], ["bookings", "MANAGE"]);
    const parsed = albumTrackingSchema.safeParse(updates);
    if (!bookingIdSchema.safeParse(bookingId).success || !parsed.success) return { success: false, error: 'Invalid input' };

    const existing = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { customData: true, deletedAt: true },
    });
    if (!existing || existing.deletedAt) return { success: false, error: 'Not found' };

    const newCustomData = { ...asJsonRecord(existing.customData), ...parsed.data.customData };

    const dataToUpdate: Prisma.BookingUncheckedUpdateInput = { customData: newCustomData, updatedById: user.id };
    if (newCustomData.fld_b_album_status === 'Delivered') {
      dataToUpdate.galleryDelivered = true;
    }
    if (parsed.data.status !== undefined) dataToUpdate.status = parsed.data.status;

    await prisma.booking.update({
      where: { id: bookingId },
      data: dataToUpdate
    });

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error && e.message === "Forbidden" ? "Permission denied" : "Failed to update album tracking" };
  }
}

export async function generateInvoiceAction(bookingId: string) {
  try {
    await assertAccess(["bookings", "MANAGE"]);
  } catch {
    return { success: false, error: 'Permission denied' };
  }
  if (!bookingIdSchema.safeParse(bookingId).success) {
    return { success: false, error: 'Booking not found' };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { order: true, invoice: { include: { lineItems: true } } }
  });

  if (!booking || booking.deletedAt) {
    return { success: false, error: 'Booking not found' };
  }

  const packageAmount = booking.order?.package || 0;

  if (booking.invoice) {
    // Keep the auto-generated package line in sync with the booking's current package
    const items = booking.invoice.lineItems;
    if (items.length === 1 && items[0].description.endsWith(' Package') && items[0].amount !== packageAmount) {
      await prisma.invoiceLineItem.update({
        where: { id: items[0].id },
        data: { rate: packageAmount, amount: packageAmount * items[0].quantity }
      });
    }
    return { success: true, invoiceId: booking.invoice.id };
  }

  // Generate sequential INV-XXXX with retry logic for race conditions
  let invoiceId = null;
  let attempt = 0;
  
  while (attempt < 5) {
    try {
      // Sort numerically; a string sort breaks once numbers pass INV-9999
      const [{ max }] = await prisma.$queryRaw<{ max: number | null }[]>`
        SELECT MAX(CAST(SUBSTRING("invoiceNumber" FROM 5) AS INTEGER)) AS max
        FROM "Invoice"
        WHERE "invoiceNumber" ~ '^INV-[0-9]+$'
      `;
      const invoiceNumber = `INV-${String((max ?? 0) + 1).padStart(4, '0')}`;

      const newInvoice = await prisma.invoice.create({
        data: {
          bookingId,
          invoiceNumber,
          discount: 0,
          lineItems: {
            create: [
              {
                description: `${booking.category || 'Standard'} Package`,
                quantity: 1,
                rate: packageAmount,
                amount: packageAmount
              }
            ]
          }
        }
      });
      invoiceId = newInvoice.id;
      break;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') { // Prisma unique constraint violation
        attempt++;
        continue;
      }
      throw e;
    }
  }

  if (!invoiceId) {
    return { success: false, error: 'Failed to generate unique invoice number after multiple attempts' };
  }

  return { success: true, invoiceId };
}
