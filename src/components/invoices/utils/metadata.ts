export const getPdfMetadata = (invoiceNumber: string) => {
  return {
    title: `Invoice #${invoiceNumber}`,
    author: 'Moondot Studio',
    subject: 'Invoice for Photography Services',
    keywords: 'Invoice, Moondot Studio, Photography, Booking',
    creator: 'Moondot Studio / Kanakkupulla',
    producer: 'Kanakkupulla',
  };
};
