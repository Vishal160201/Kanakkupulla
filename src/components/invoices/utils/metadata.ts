import { STUDIO_DETAILS } from "@/lib/constants";

export const getPdfMetadata = (invoiceNumber: string) => {
  return {
    title: `Invoice ${invoiceNumber}`,
    author: STUDIO_DETAILS.name,
    subject: 'Invoice for Photography Services',
    keywords: `Invoice, ${STUDIO_DETAILS.name}, Photography, Booking`,
    creator: `${STUDIO_DETAILS.name} / Kanakkupulla`,
    producer: 'Kanakkupulla',
  };
};
