"use client"

import { useState, useEffect } from "react"
import { Plus, Search, FileText, Eye, Edit, UserPlus, Clock, AlertCircle, Trash } from 'lucide-react'
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import Header from "@/components/header"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset
} from "@/components/ui/sidebar"
import { 
  Student, 
  CheckIn, 
  subscribeToStudents, 
  subscribeToCheckIns, 
  addStudent, 
  updateStudent, 
  addCheckIn, 
  updateCheckIn
} from "@/lib/firebase"

import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface StudentWithStats extends Student {
  completedLessons: number
  totalAmountOwed: number
  active?: boolean;
}

// AppSidebar removed for now

export default function TutoringDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [studentsWithStats, setStudentsWithStats] = useState<StudentWithStats[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentWithStats | null>(null);
  const [invoicePromptOpen, setInvoicePromptOpen] = useState(false);
  const [invoiceStudent, setInvoiceStudent] = useState<StudentWithStats | null>(null);
  const [nextMonthLessons, setNextMonthLessons] = useState<number>(0);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [newStudent, setNewStudent] = useState({ name: "", email: "", signedUpLessons: 0, costPerLesson: 0 });
  const [newCheckIn, setNewCheckIn] = useState({ studentId: "", lessonType: "", lessonCost: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set up real-time listeners
  useEffect(() => {
    setLoading(true)
    setError(null)

    const unsubscribeStudents = subscribeToStudents((studentsData) => {
      setStudents(studentsData)
      setLoading(false)
    })

    const unsubscribeCheckIns = subscribeToCheckIns((checkInsData) => {
      setCheckIns(checkInsData)
    })

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribeStudents()
      unsubscribeCheckIns()
    }
  }, [])

  // Calculate stats when data changes
  useEffect(() => {
    const studentsWithCalculatedStats = students.map(student => {
      const studentCheckIns = checkIns.filter(checkIn => checkIn.studentId === student.id)
      // Debug log: show which check-ins are matched to each student
      console.log(`Student: ${student.name} (${student.id})`, studentCheckIns)
      const completedLessons = studentCheckIns.length
      const totalAmountOwed = completedLessons * student.costPerLesson
      return {
        ...student,
        completedLessons,
        totalAmountOwed
      }
    })
    setStudentsWithStats(studentsWithCalculatedStats)
  }, [students, checkIns])

  // Filter students based on search term, skip students with missing name/email
  const filteredStudents = studentsWithStats.filter(student => {
    if (!student.name || !student.email) return false;
    return (
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Dashboard stats
  const totalStudents = students.length
  const totalCheckInsThisMonth = checkIns.filter(checkIn => {
    const checkInDate = new Date(checkIn.timestamp)
    const now = new Date()
    return checkInDate.getMonth() === now.getMonth() && checkInDate.getFullYear() === now.getFullYear()
  }).length
  const totalRevenue = studentsWithStats.reduce((sum, student) => sum + student.totalAmountOwed, 0)

  const handleEditStudent = (student: Student) => {
    setEditingStudent({ ...student })
  }

  const handleSaveStudent = async () => {
    if (editingStudent) {
      try {
        await updateStudent(editingStudent.id, {
          name: editingStudent.name,
          email: editingStudent.email,
          signedUpLessons: editingStudent.signedUpLessons,
          costPerLesson: editingStudent.costPerLesson
        })
        setEditingStudent(null)
      } catch (error) {
        setError('Failed to update student')
        console.error('Error updating student:', error)
      }
    }
  }

  const handleAddStudent = async () => {
    try {
      await addStudent(newStudent)
      setNewStudent({ name: "", email: "", signedUpLessons: 0, costPerLesson: 0 })
    } catch (error) {
      setError('Failed to add student')
      console.error('Error adding student:', error)
    }
  }

  const handleAddCheckIn = async () => {
    try {
      await addCheckIn({
        studentId: newCheckIn.studentId,
        lessonType: newCheckIn.lessonType,
        lessonCost: newCheckIn.lessonCost
      })
      setNewCheckIn({ studentId: "", lessonType: "", lessonCost: 0 })
    } catch (error) {
      setError('Failed to add check-in')
      console.error('Error adding check-in:', error)
    }
  }

  const generateInvoice = (student: StudentWithStats, nextMonthLessonsValue?: number) => {
    const doc = new jsPDF();
    // Header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
  doc.text("Bill and Attendance Record", 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    // Student Info
    let y = 30;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Student Name:", 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(student.name, 60, y);
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text("Class:", 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text("English", 60, y); // Placeholder, replace with real class if available
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text("Teacher:", 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text("Ken", 60, y); // Placeholder, replace with real teacher if available
    y += 8;
    // Next month lessons
    if (typeof nextMonthLessonsValue === 'number') {
      doc.setFont('helvetica', 'bold');
      doc.text("Next month lessons:", 20, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`${nextMonthLessonsValue}`, 70, y);
      y += 8;
      // Tuition fee for next month
      doc.setFont('helvetica', 'bold');
      doc.text("Next month tuition fee:", 20, y);
      doc.setFont('helvetica', 'normal');
      const tuition = (nextMonthLessonsValue * (student.costPerLesson || 0)).toFixed(2);
      doc.text(`$${tuition}`, 80, y);
      y += 8;
    }
    // Table data from actual check-ins
    const tableY = y + 7;
    const checkIns = getStudentCheckIns(student.id);
    const tableRows = checkIns.map((checkIn) => [
      checkIn.lessonType || "N/A",
      new Date(checkIn.timestamp).toLocaleDateString(),
      `$${checkIn.lessonCost}`
    ]);
    autoTable(doc, {
      startY: tableY,
      head: [["Lesson Type", "Date", "Amount"]],
      body: tableRows,
      styles: { halign: 'center' },
      headStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold' },
      theme: 'grid',
      margin: { left: 20, right: 20 },
    });
    // Total Payable
    // @ts-ignore
    const finalY = (doc.lastAutoTable?.finalY || tableY + 20) + 10;
    doc.setFont('helvetica', 'bold');
    doc.text("Total Payable:", 120, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text(`$${checkIns.reduce((sum, c) => sum + (c.lessonCost || 0), 0).toFixed(2)}`, 170, finalY, { align: 'right' });
  // Footer (removed thank you line)
    doc.save(`invoice_${student.name.replace(/\s+/g, "_")}.pdf`);
  }

  const getStudentCheckIns = (studentId: string) => {
    return checkIns.filter(checkIn => checkIn.studentId === studentId)
  }

  // Map studentId to student name for quick lookup
  const studentIdToName: Record<string, string> = {};
  students.forEach(student => {
    studentIdToName[student.id] = student.name;
  });

  // Prepare check-ins with student names
  // Only show active check-ins in main table
  const checkInsWithStudentName = checkIns
    .filter(checkIn => checkIn.active !== false)
    .map(checkIn => ({
      ...checkIn,
      studentName: studentIdToName[checkIn.studentId] || null
    }))
    .filter(checkIn => checkIn.studentName); // Only those with a matching student

  // Recently deleted check-ins (active === false)
  const deletedCheckInsWithStudentName = checkIns
    .filter(checkIn => checkIn.active === false)
    .map(checkIn => ({
      ...checkIn,
      studentName: studentIdToName[checkIn.studentId] || null
    }))
    .filter(checkIn => checkIn.studentName);


  if (loading) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center">
        <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">

          <Header />

          <main className="flex-1 space-y-6 p-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* All Check-ins Table */}
            <div className="mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>All Check-ins</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Session</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {checkInsWithStudentName.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No check-ins found in the database.
                          </TableCell>
                        </TableRow>
                      ) : (
                        checkInsWithStudentName.map(checkIn => {
                          const dateObj = new Date(checkIn.timestamp);
                          const dateStr = dateObj.toLocaleDateString();
                          // Use system (browser) time zone for display
                          const timeStr = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                          const hour = dateObj.getHours();
                          let session = '';
                          if (hour >= 6 && hour < 12) session = 'Morning';
                          else if (hour >= 12 && hour < 18) session = 'Afternoon';
                          else if (hour >= 18 && hour < 24) session = 'Night';
                          else session = 'LateNight';
                          return (
                            <TableRow key={checkIn.id}>
                              <TableCell>{checkIn.studentName}</TableCell>
                              <TableCell>{dateStr}</TableCell>
                              <TableCell>{timeStr}</TableCell>
                              <TableCell>{session}</TableCell>
                              <TableCell>{checkIn.classroomId || "N/A"}</TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="rounded-full border border-gray-200 hover:bg-gray-100"
                                  title="Delete Check-in"
                                  onClick={async () => {
                                    try {
                                      await updateCheckIn(checkIn.id, { active: false });
                                    } catch (err) {
                                      setError('Failed to delete check-in');
                                    }
                                  }}
                                >
                                  <Trash className="h-4 w-4 text-black" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>


            {/* Dashboard Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalStudents}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Check-ins This Month</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalCheckInsThisMonth}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totalRevenue}</div>
                </CardContent>
              </Card>
            </div>

            {/* Students Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Students</CardTitle>
                    <CardDescription>Manage student information and track lesson progress</CardDescription>
                  </div>
                  <div className="flex gap-2">

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <Clock className="h-4 w-4 mr-2" />
                          Add Check-in
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Manual Check-in</DialogTitle>
                          <DialogDescription>Record a lesson check-in for a student.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="student">Student</Label>
                            <Select value={newCheckIn.studentId} onValueChange={(value) => setNewCheckIn(prev => ({ ...prev, studentId: value }))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a student" />
                              </SelectTrigger>
                              <SelectContent>
                                {students.map(student => (
                                  <SelectItem key={student.id} value={student.id}>
                                    {student.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="lessonType">Lesson Type</Label>
                            <Input
                              id="lessonType"
                              value={newCheckIn.lessonType}
                              onChange={(e) => setNewCheckIn(prev => ({ ...prev, lessonType: e.target.value }))}
                              placeholder="e.g., Math, Science, English"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="lessonCost">Lesson Cost</Label>
                            <Input
                              id="lessonCost"
                              type="number"
                              value={newCheckIn.lessonCost}
                              onChange={(e) => setNewCheckIn(prev => ({ ...prev, lessonCost: parseInt(e.target.value) || 0 }))}
                            />
                          </div>
                        </div>
                        <Button onClick={handleAddCheckIn}>Add Check-in</Button>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-4">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Signed-Up Lessons</TableHead>
                        <TableHead>Completed Lessons</TableHead>
                        <TableHead>Cost Per Lesson</TableHead>
                        <TableHead>Total Amount Owed</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>{student.email}</TableCell>
                          <TableCell>{student.signedUpLessons}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{student.completedLessons}</Badge>
                          </TableCell>
                          <TableCell>${student.costPerLesson}</TableCell>
                          <TableCell className="font-semibold">${student.totalAmountOwed}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditStudent(student)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedStudent(student)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Check-ins for {student.name}</DialogTitle>
                                    <DialogDescription>View all lesson check-ins for this student.</DialogDescription>
                                  </DialogHeader>
                                  <div className="max-h-96 overflow-y-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Date</TableHead>
                                          <TableHead>Subject</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {(() => {
                                          const checkInsForStudent = getStudentCheckIns(student.id);
                                          if (checkInsForStudent.length === 0) {
                                            return (
                                              <TableRow>
                                                <TableCell colSpan={2} className="text-center text-muted-foreground">
                                                  No check-ins found for this student.
                                                </TableCell>
                                              </TableRow>
                                            );
                                          }
                                          return checkInsForStudent.map((checkIn) => (
                                            <TableRow key={checkIn.id}>
                                              <TableCell>{new Date(checkIn.timestamp).toLocaleDateString()}</TableCell>
                                              <TableCell>{checkIn.classroomId || "N/A"}</TableCell>
                                            </TableRow>
                                          ));
                                        })()}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setInvoiceStudent(student);
                                  setInvoicePromptOpen(true);
                                }}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Invoice
                              </Button>
            {/* Invoice Prompt Dialog */}
            <Dialog open={invoicePromptOpen} onOpenChange={setInvoicePromptOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Next Month's Lessons</DialogTitle>
                  <DialogDescription>
                    How many classes will the student take next month?
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <label htmlFor="nextMonthLessons" className="block mb-2 font-medium">Select number of classes:</label>
                  <select
                    id="nextMonthLessons"
                    className="border rounded px-3 py-2 w-full"
                    value={nextMonthLessons}
                    onChange={e => setNextMonthLessons(Number(e.target.value))}
                  >
                    {Array.from({ length: 21 }, (_, i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setInvoicePromptOpen(false)}>Cancel</Button>
                  <Button
                    onClick={() => {
                      if (invoiceStudent) {
                        generateInvoice(invoiceStudent, nextMonthLessons);
                        setInvoicePromptOpen(false);
                        setNextMonthLessons(0);
                        setInvoiceStudent(null);
                      }
                    }}
                  >
                    Generate Invoice
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Edit Student Dialog */}
            <Dialog open={!!editingStudent} onOpenChange={() => setEditingStudent(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Student</DialogTitle>
                  <DialogDescription>Update the student's information.</DialogDescription>
                </DialogHeader>
                {editingStudent && (
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-name">Name</Label>
                      <Input
                        id="edit-name"
                        value={editingStudent.name}
                        onChange={(e) => setEditingStudent(prev => prev ? { ...prev, name: e.target.value } : null)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-email">Email</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={editingStudent.email}
                        onChange={(e) => setEditingStudent(prev => prev ? { ...prev, email: e.target.value } : null)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-lessons">Signed-Up Lessons</Label>
                      <Input
                        id="edit-lessons"
                        type="number"
                        value={editingStudent.signedUpLessons}
                        onChange={(e) => setEditingStudent(prev => prev ? { ...prev, signedUpLessons: parseInt(e.target.value) || 0 } : null)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-cost">Cost Per Lesson</Label>
                      <Input
                        id="edit-cost"
                        type="number"
                        value={editingStudent.costPerLesson}
                        onChange={(e) => setEditingStudent(prev => prev ? { ...prev, costPerLesson: parseInt(e.target.value) || 0 } : null)}
                      />
                    </div>
                  </div>
                )}
                <Button onClick={handleSaveStudent}>Save Changes</Button>
              </DialogContent>
            </Dialog>
          {/* Recently Deleted Check-ins Dropdown (moved to bottom) */}
          <div className="mt-8">
            <Collapsible>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between cursor-pointer p-4">
                  <div>
                    <CardTitle>Recently Deleted Check-ins</CardTitle>
                  </div>
                  <CollapsibleTrigger asChild>
                    <button className="ml-4 text-sm text-gray-600 border rounded px-3 py-1 bg-white hover:bg-gray-100 transition">
                      Show/Hide
                    </button>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent asChild>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student Name</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Session</TableHead>
                          <TableHead>Subject</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deletedCheckInsWithStudentName.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              No recently deleted check-ins.
                            </TableCell>
                          </TableRow>
                        ) : (
                          deletedCheckInsWithStudentName.map(checkIn => {
                            const dateObj = new Date(checkIn.timestamp);
                            const dateStr = dateObj.toLocaleDateString();
                            // Use system (browser) time zone for display
                            const timeStr = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                            const hour = dateObj.getHours();
                            let session = '';
                            if (hour >= 6 && hour < 12) session = 'Morning';
                            else if (hour >= 12 && hour < 18) session = 'Afternoon';
                            else if (hour >= 18 && hour < 24) session = 'Night';
                            else session = 'LateNight';
                            return (
                              <TableRow key={checkIn.id}>
                                <TableCell>{checkIn.studentName}</TableCell>
                                <TableCell>{dateStr}</TableCell>
                                <TableCell>{timeStr}</TableCell>
                                <TableCell>{session}</TableCell>
                                <TableCell className="flex items-center gap-2">
                                  {checkIn.classroomId || "N/A"}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="ml-2 border border-gray-200 hover:bg-gray-100 px-2 py-1 text-xs"
                                    title="Undo Delete"
                                    onClick={async () => {
                                      try {
                                        await updateCheckIn(checkIn.id, { active: true });
                                      } catch (err) {
                                        setError('Failed to undo delete');
                                      }
                                    }}
                                  >
                                    Undo
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        </main>
      </div>
  )
}
