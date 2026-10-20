// CSV / PDF export of the ledger rows currently on screen.
import type { Transaction } from "@/types/transactions";

interface ExportSummary {
  totalIncome: number;
  totalExpense: number;
  cashIncome: number;
  cashExpense: number;
  upiIncome: number;
  upiExpense: number;
}

function summarize(transactions: Transaction[]): ExportSummary {
  const summary: ExportSummary = { totalIncome: 0, totalExpense: 0, cashIncome: 0, cashExpense: 0, upiIncome: 0, upiExpense: 0 };
  transactions.forEach(tx => {
    const amt = Number(tx.amount) || 0;
    const mode = (tx.paymentMode || '').toLowerCase();
    if (tx.type === 'INCOME') {
      summary.totalIncome += amt;
      if (mode.includes('cash')) summary.cashIncome += amt;
      if (mode.includes('upi')) summary.upiIncome += amt;
    } else if (tx.type === 'EXPENSE') {
      summary.totalExpense += amt;
      if (mode.includes('cash')) summary.cashExpense += amt;
      if (mode.includes('upi')) summary.upiExpense += amt;
    }
  });
  return summary;
}

const escapeCsv = (val: unknown) => {
  if (val === null || val === undefined || val === '') return '""';
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  return `"${str.replace(/"/g, '""')}"`;
};

const fileStamp = () => new Date().toISOString().split('T')[0];

function exportCsv(transactions: Transaction[], s: ExportSummary) {
  const headers = ['Transaction ID', 'Date', 'Shop', 'Type', 'Category', 'Description', 'Payment Mode', 'Status', 'Amount', 'Attachment URL', 'Custom Data', 'Booking ID'];
  const rows = transactions.map(tx => [
    escapeCsv(tx.transactionId),
    escapeCsv(new Date(tx.date).toLocaleDateString('en-IN')),
    escapeCsv(tx.shop?.name),
    escapeCsv(tx.type),
    escapeCsv(tx.category),
    escapeCsv(tx.description),
    escapeCsv(tx.paymentMode),
    escapeCsv(tx.status),
    escapeCsv(tx.amount),
    escapeCsv(tx.attachmentUrl),
    escapeCsv(tx.customData),
    escapeCsv(tx.bookingId)
  ]);

  const summaryRows = [
    [],
    ['SUMMARY'],
    ['Metric', 'Income', 'Expense', 'Net'],
    ['Overall', escapeCsv(s.totalIncome), escapeCsv(s.totalExpense), escapeCsv(s.totalIncome - s.totalExpense)],
    ['Cash', escapeCsv(s.cashIncome), escapeCsv(s.cashExpense), escapeCsv(s.cashIncome - s.cashExpense)],
    ['UPI', escapeCsv(s.upiIncome), escapeCsv(s.upiExpense), escapeCsv(s.upiIncome - s.upiExpense)]
  ];

  const csvContent = [headers.join(','), ...rows.map(r => r.join(',')), ...summaryRows.map(r => r.join(','))].join('\n');
  const blob = new Blob([`﻿${csvContent}`], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel UTF-8
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `kanakkupulla-ledger-${fileStamp()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function exportPdf(transactions: Transaction[], s: ExportSummary) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();
  doc.text("Transactions Ledger", 14, 15);
  // autoTable renders null/undefined cells as empty text.
  const tableData = transactions.map(tx => [
    tx.transactionId ?? '',
    new Date(tx.date).toLocaleDateString('en-IN'),
    tx.shop?.name ?? '',
    tx.type,
    tx.category,
    tx.description || '',
    tx.paymentMode,
    tx.status ?? '',
    tx.amount.toString()
  ]);
  autoTable(doc, {
    head: [['Transaction ID', 'Date', 'Shop', 'Type', 'Category', 'Description', 'Payment Mode', 'Status', 'Amount']],
    body: tableData,
    startY: 20,
  });

  // jspdf-autotable stores the last table's position on the doc but doesn't type it.
  const finalY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 20;
  doc.setFontSize(12);
  doc.text("Summary", 14, finalY + 10);

  autoTable(doc, {
    head: [['Metric', 'Income', 'Expense', 'Net']],
    body: [
      ['Overall', s.totalIncome.toString(), s.totalExpense.toString(), (s.totalIncome - s.totalExpense).toString()],
      ['Cash', s.cashIncome.toString(), s.cashExpense.toString(), (s.cashIncome - s.cashExpense).toString()],
      ['UPI', s.upiIncome.toString(), s.upiExpense.toString(), (s.upiIncome - s.upiExpense).toString()]
    ],
    startY: finalY + 15,
  });

  doc.save(`kanakkupulla-ledger-${fileStamp()}.pdf`);
}

export async function exportTransactions(transactions: Transaction[], format: 'csv' | 'pdf') {
  const summary = summarize(transactions);
  if (format === 'csv') {
    exportCsv(transactions, summary);
  } else {
    await exportPdf(transactions, summary);
  }
}
