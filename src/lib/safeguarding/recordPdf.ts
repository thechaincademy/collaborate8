import { jsPDF } from "jspdf";
import { recordCopy } from "@/content/safeguarding";
import { buildRecordDocument, type RecordExpense, type RecordMessage, type RecordPayment } from "@/lib/safeguarding/logic";

export function downloadSafeguardingRecord(input: {
  exportedAt: string;
  messages: RecordMessage[];
  payments: RecordPayment[];
  expenses: RecordExpense[];
}) {
  const record = buildRecordDocument(input);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = margin;

  const ensure = (needed: number) => {
    if (y + needed > height - 48) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(recordCopy.heading, margin, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Record date: ${record.exportedAt}`, margin, y);
  y += 22;

  for (const line of record.lines.slice(1)) {
    const isHeading = line === "Messages" || line === "Payments" || line === "Shared expenses";
    doc.setFont("helvetica", isHeading ? "bold" : "normal");
    doc.setFontSize(isHeading ? 12 : 10);
    const wrapped = doc.splitTextToSize(line, width - margin * 2);
    ensure(wrapped.length * 14 + 8);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 14 + (isHeading ? 8 : 4);
  }

  doc.save(`collabor8-record-${record.exportedAt.slice(0, 10)}.pdf`);
}
