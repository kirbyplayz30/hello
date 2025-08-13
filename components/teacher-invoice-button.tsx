import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import jsPDF from "jspdf";

export interface TeacherInvoiceButtonProps {
  teacherName: string;
}

export function TeacherInvoiceButton({ teacherName }: TeacherInvoiceButtonProps) {
  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text("Teacher Invoice", 20, 20);
    doc.setFontSize(16);
    doc.text(`Name: ${teacherName}`, 20, 40);
    doc.save(`invoice-${teacherName.replace(/\s+/g, "_")}.pdf`);
  };

  return (
    <Button
      size="sm"
      onClick={handleGeneratePDF}
      className="flex items-center gap-2 bg-black text-white hover:bg-zinc-800 rounded-xl px-4 py-2"
    >
      <FileText className="h-5 w-5 mr-2 text-white" />
      <span className="font-semibold text-white">Invoice</span>
    </Button>
  );
}
