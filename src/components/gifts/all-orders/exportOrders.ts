import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { GiftOrder } from "@/types/gifts";
import { STATUS_STYLE_MAP, calculatePaymentInfo, orderDisplayId } from "../giftOrderStatus";

const statusLabel = (status: string) => STATUS_STYLE_MAP[status]?.label || status;

export function downloadOrdersCSV(orders: GiftOrder[]) {
  const headers = ["Order ID", "Client Name", "Phone", "Product", "Quantity", "Total Amount", "Advance Paid", "Due Amount", "Payment Status", "Order Status", "Due Date", "Created Date"];
  const rows = orders.map((o) => {
    const pay = calculatePaymentInfo(o);
    const dueAmount = pay.totalAmount - pay.paidAmount;
    return [
      orderDisplayId(o),
      o.clientName,
      o.clientPhone || "",
      o.product?.name || "",
      o.quantity,
      pay.totalAmount,
      pay.paidAmount,
      dueAmount > 0 ? dueAmount : 0,
      pay.pStatus,
      statusLabel(o.status),
      o.customData?.dueDate ? format(new Date(o.customData.dueDate), "dd/MM/yyyy") : "",
      format(new Date(o.createdAt), "dd/MM/yyyy")
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `orders_export_${format(new Date(), "yyyy-MM-dd")}.csv`;
  link.click();
}

export function downloadOrdersPDF(orders: GiftOrder[]) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Orders Report", 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 22);

  const tableData = orders.map((o) => {
    const pay = calculatePaymentInfo(o);
    return [
      orderDisplayId(o),
      format(new Date(o.createdAt), "dd/MM/yyyy"),
      o.clientName,
      o.product?.name || "",
      statusLabel(o.status),
      `${pay.totalAmount}`,
      pay.pStatus
    ];
  });

  autoTable(doc, {
    startY: 30,
    head: [["Order ID", "Date", "Client", "Product", "Status", "Amount", "Payment"]],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [40, 40, 40] }
  });

  doc.save(`orders_export_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
