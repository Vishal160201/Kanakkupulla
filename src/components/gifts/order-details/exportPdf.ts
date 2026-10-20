/**
 * Client-side "screenshot to PDF": rasterises a DOM element with html2canvas and
 * saves it as a single A4 page with jsPDF. Used for the gift-order invoice and the
 * order export (there is no server-side renderer for gift orders). Both libraries
 * are imported lazily so they only load when an export is requested.
 */
export async function exportElementToPdf(element: HTMLElement, fileName: string): Promise<void> {
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");
  const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  pdf.save(fileName);
}
