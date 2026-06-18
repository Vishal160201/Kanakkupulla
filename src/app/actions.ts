"use server";

import { z } from "zod";
import { bookingSchema } from "@/lib/validations/booking";
import { Booking } from "@/types";
import prisma from "@/lib/prisma";

export async function saveBookingAction(formData: FormData) {
  try {
    const rawData = Object.fromEntries(formData.entries());
    const validatedData = bookingSchema.parse(rawData);
    
    if (validatedData.id) {
       const existingBooking = await prisma.booking.findUnique({ where: { id: validatedData.id }, include: { client: true, order: true } });
       if (existingBooking) {
         await prisma.client.update({
           where: { id: existingBooking.clientId },
           data: { name: validatedData.title, phone: validatedData.phone, email: validatedData.email }
         });
         await prisma.booking.update({
           where: { id: validatedData.id },
           data: {
             category: validatedData.category,
             date: new Date(validatedData.date),
             time: validatedData.time,
             location: validatedData.location,
             status: validatedData.status,
           }
         });
         const pkg = parseFloat((validatedData.package || '0').toString().replace(/,/g, ''));
         const adv = parseFloat((validatedData.advance || '0').toString().replace(/,/g, ''));
         const due = parseFloat((validatedData.due || '0').toString().replace(/,/g, ''));
         if (existingBooking.order) {
           await prisma.order.update({
             where: { bookingId: validatedData.id },
             data: { package: pkg, advance: adv, due: due }
           });
         } else {
            await prisma.order.create({
              data: { bookingId: validatedData.id, package: pkg, advance: adv, due: due }
            });
         }
         return { success: true, data: validatedData as Booking };
       }
    }
    
    const client = await prisma.client.create({
      data: { name: validatedData.title, phone: validatedData.phone, email: validatedData.email }
    });
    
    const newBooking = await prisma.booking.create({
      data: {
        id: validatedData.id || undefined,
        clientId: client.id,
        category: validatedData.category,
        date: new Date(validatedData.date),
        time: validatedData.time,
        location: validatedData.location,
        status: validatedData.status,
      }
    });

    const pkg = parseFloat((validatedData.package || '0').toString().replace(/,/g, ''));
    const adv = parseFloat((validatedData.advance || '0').toString().replace(/,/g, ''));
    const due = parseFloat((validatedData.due || '0').toString().replace(/,/g, ''));

    await prisma.order.create({
      data: { bookingId: newBooking.id, package: pkg, advance: adv, due: due }
    });

    return { 
      success: true, 
      data: { ...validatedData, id: newBooking.id } as Booking 
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.flatten().fieldErrors };
    }
    return { success: false, errors: { _form: ["An unexpected error occurred while saving the booking."] } };
  }
}

export async function deleteBookingAction(id: string) {
  try {
    await prisma.order.deleteMany({ where: { bookingId: id } });
    await prisma.booking.delete({ where: { id } });
    return { success: true };
  } catch (e) {
    return { success: false, error: "Failed to delete booking" };
  }
}
