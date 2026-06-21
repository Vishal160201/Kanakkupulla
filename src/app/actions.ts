"use server";

import { z } from "zod";
import { bookingSchema } from "@/lib/validations/booking";
import { Booking } from "@/types";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { broadcastNotification } from "@/lib/notifications";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function saveBookingAction(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    const rawData = Object.fromEntries(formData.entries());
    const validatedData = bookingSchema.parse(rawData);
    
    // Extract custom dynamic fields that are not part of the standard validatedData
    const standardKeys = ['id', 'title', 'category', 'date', 'time', 'location', 'phone', 'email', 'package', 'advance', 'due', 'status', 'installments', 'packageName', 'inclusions', 'notes', 'attachments', 'photographers'];
    const customData: Record<string, any> = {};
    for (const [key, value] of Object.entries(rawData)) {
      if (!standardKeys.includes(key) && key !== 'customData' && !key.startsWith('$ACTION')) {
        customData[key] = value;
      }
    }

    if (validatedData.id) {
       const existingBooking = await prisma.booking.findUnique({ where: { id: validatedData.id }, include: { client: true, order: true } });
       if (existingBooking) {
         await prisma.client.update({
           where: { id: existingBooking.clientId },
           data: { name: validatedData.title, phone: validatedData.phone || "", email: validatedData.email }
         });
         await prisma.booking.update({
           where: { id: validatedData.id },
           data: {
             category: validatedData.category,
             date: validatedData.date ? new Date(validatedData.date) : new Date(),
             time: validatedData.time || "",
             location: validatedData.location || "",
             status: validatedData.status,
             packageName: rawData.packageName ? String(rawData.packageName) : undefined,
             inclusions: rawData.inclusions ? JSON.parse(String(rawData.inclusions)) : undefined,
             notes: rawData.notes ? String(rawData.notes) : undefined,
             attachments: rawData.attachments ? JSON.parse(String(rawData.attachments)) : undefined,
             photographers: rawData.photographers ? JSON.parse(String(rawData.photographers)) : undefined,
             customData: Object.keys(customData).length > 0 ? customData : undefined,
             updatedById: (session?.user as any)?.id,
           }
         });
         const pkg = parseFloat((validatedData.package || '0').toString().replace(/,/g, '')) || 0;
         const adv = parseFloat((validatedData.advance || '0').toString().replace(/,/g, '')) || 0;
         const due = parseFloat((validatedData.due || '0').toString().replace(/,/g, '')) || 0;
         let parsedInstallments = null;
         try {
           if (validatedData.installments) parsedInstallments = JSON.parse(validatedData.installments);
         } catch (e) {}

         if (existingBooking.order) {
           await prisma.order.update({
             where: { bookingId: validatedData.id },
             data: { package: pkg, advance: adv, due: due, installments: parsedInstallments }
           });
         } else {
            await prisma.order.create({
              data: { bookingId: validatedData.id, package: pkg, advance: adv, due: due, installments: parsedInstallments }
            });
         }
         
         await prisma.systemLog.create({
           data: { action: "BOOKING_UPDATED", details: `Updated booking ID: ${validatedData.id}` }
         });

         // Fire and forget notification to prevent blocking UI
         broadcastNotification(
           "Booking Updated",
           `The booking ${existingBooking.bookingNumber || ''} has been updated.`,
           "BOOKING",
           `/bookings/details/${validatedData.id}`
         ).catch(e => console.error("Notification error:", e));

         revalidatePath('/', 'layout');
         return { success: true, data: validatedData as Booking };
       }
    }
    
    const client = await prisma.client.create({
      data: { name: validatedData.title, phone: validatedData.phone || "", email: validatedData.email }
    });
    
    let nextBookingNumber = rawData.bookingNumber as string;
    if (!nextBookingNumber) {
      const allMdBookings = await prisma.booking.findMany({
        where: { bookingNumber: { startsWith: '#MD-' } },
        select: { bookingNumber: true }
      });
      let maxNum = 0;
      for (const b of allMdBookings) {
        if (b.bookingNumber) {
          const match = b.bookingNumber.match(/#MD-(\d+)/);
          if (match) {
            const num = parseInt(match[1]);
            if (num > maxNum) maxNum = num;
          }
        }
      }
      nextBookingNumber = `#MD-${String(maxNum + 1).padStart(3, '0')}`;
    }

    const newBooking = await prisma.booking.create({
      data: {
        id: validatedData.id || undefined,
        bookingNumber: nextBookingNumber,
        clientId: client.id,
        category: validatedData.category,
        date: validatedData.date ? new Date(validatedData.date) : new Date(),
        time: validatedData.time || "",
        location: validatedData.location || "",
        status: validatedData.status,
        packageName: rawData.packageName ? String(rawData.packageName) : undefined,
        inclusions: rawData.inclusions ? JSON.parse(String(rawData.inclusions)) : undefined,
        notes: rawData.notes ? String(rawData.notes) : undefined,
        attachments: rawData.attachments ? JSON.parse(String(rawData.attachments)) : undefined,
        photographers: rawData.photographers ? JSON.parse(String(rawData.photographers)) : undefined,
        customData: Object.keys(customData).length > 0 ? customData : undefined,
        createdById: (session?.user as any)?.id,
        updatedById: (session?.user as any)?.id,
      }
    });

    const pkg = parseFloat((validatedData.package || '0').toString().replace(/,/g, '')) || 0;
    const adv = parseFloat((validatedData.advance || '0').toString().replace(/,/g, '')) || 0;
    const due = parseFloat((validatedData.due || '0').toString().replace(/,/g, '')) || 0;
    let parsedInstallments = null;
    try {
      if (validatedData.installments) parsedInstallments = JSON.parse(validatedData.installments);
    } catch (e) {}

    await prisma.order.create({
      data: {
        bookingId: newBooking.id,
        package: pkg,
        advance: adv,
        due: due,
        installments: parsedInstallments
      }
    });

    await prisma.systemLog.create({
      data: { action: "BOOKING_CREATED", details: `Created booking ID: ${newBooking.id} for client ${client.name}` }
    });

    // Fire and forget notification
    broadcastNotification(
      "New Booking Received!",
      `A new booking has been created for ${client.name}.`,
      "BOOKING",
      `/bookings/details/${newBooking.id}`
    ).catch(e => console.error("Notification error:", e));

    revalidatePath('/', 'layout');

    return { 
      success: true, 
      data: { ...validatedData, id: newBooking.id } as Booking 
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.flatten().fieldErrors };
    }
    console.error("Booking save error:", error);
    return { success: false, errors: { _form: [error instanceof Error ? error.message : "An unexpected error occurred while saving the booking."] } };
  }
}

export async function deleteBookingAction(id: string) {
  try {
    await prisma.booking.update({ 
      where: { id },
      data: { deletedAt: new Date() }
    });
    
    await prisma.systemLog.create({
      data: { action: "BOOKING_SOFT_DELETED", details: `Soft deleted booking ID: ${id}` }
    });
    
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to delete booking" };
  }
}

export async function updateBookingStatusAction(id: string, status: string) {
  try {
    const updated = await prisma.booking.update({
      where: { id },
      data: { status }
    });
    
    await prisma.systemLog.create({
      data: { action: "BOOKING_STATUS_UPDATED", details: `Updated booking ID: ${id} status to ${status}` }
    });
    
    // Fire and forget notification
    broadcastNotification(
      "Booking Status Changed",
      `The status for booking ${updated.bookingNumber || id.substring(0,6)} has changed to ${status}.`,
      "BOOKING",
      `/bookings/details/${id}`
    ).catch(e => console.error("Notification error:", e));

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to update booking status" };
  }
}
