"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { FileText, Mail, Download } from 'lucide-react'

interface Student {
  id: string
  name: string
  email: string
  signedUpLessons: number
  costPerLesson: number
  completedLessons: number
  totalAmountOwed: number
}

interface InvoiceGeneratorProps {
  student: Student
  onClose: () => void
}

export function InvoiceGenerator({ student, onClose }: InvoiceGeneratorProps) {
  const handleGeneratePDF = () => {
    // Placeholder for PDF generation
    alert("PDF generation would be implemented here using libraries like jsPDF or Puppeteer")
  }

  const handleSendEmail = () => {
    // Placeholder for email sending
    alert("Email sending would be implemented here using services like SendGrid or Nodemailer")
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Invoice Preview
        </CardTitle>
        <CardDescription>Review and generate invoice for {student.name}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Invoice Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">TutorCenter Invoice</h2>
          <p className="text-muted-foreground">Invoice Date: {new Date().toLocaleDateString()}</p>
        </div>

        <Separator />

        {/* Student Information */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold mb-2">Bill To:</h3>
            <p className="font-medium">{student.name}</p>
            <p className="text-muted-foreground">{student.email}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Invoice Details:</h3>
            <p>Invoice #: INV-{student.id}-{Date.now()}</p>
            <p>Due Date: {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
          </div>
        </div>

        <Separator />

        {/* Invoice Items */}
        <div className="space-y-4">
          <h3 className="font-semibold">Services</h3>
          <div className="border rounded-lg">
            <div className="grid grid-cols-4 gap-4 p-4 bg-muted font-medium">
              <div>Description</div>
              <div>Quantity</div>
              <div>Rate</div>
              <div>Amount</div>
            </div>
            <div className="grid grid-cols-4 gap-4 p-4">
              <div>Tutoring Lessons</div>
              <div>{student.completedLessons}</div>
              <div>${student.costPerLesson}</div>
              <div>${student.totalAmountOwed}</div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Invoice Summary */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>${student.totalAmountOwed}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax (0%):</span>
            <span>$0.00</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span>${student.totalAmountOwed}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button onClick={handleGeneratePDF} className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button onClick={handleSendEmail} variant="outline" className="flex-1">
            <Mail className="h-4 w-4 mr-2" />
            Send Email
          </Button>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
