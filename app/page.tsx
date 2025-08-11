"use client"

import { useState, useEffect } from "react"
import { Plus, Search, FileText, Eye, Edit, UserPlus, Clock, AlertCircle } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
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
  addCheckIn
} from "@/lib/firebase"

import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface StudentWithStats extends Student {
  completedLessons: number
  totalAmountOwed: number
}

// AppSidebar removed for now

export default function TutoringDashboard() {
  const [students, setStudents] = useState<Student[]>([])
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [studentsWithStats, setStudentsWithStats] = useState<StudentWithStats[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<StudentWithStats | null>(null)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [newStudent, setNewStudent] = useState({ name: "", email: "", signedUpLessons: 0, costPerLesson: 0 })
  const [newCheckIn, setNewCheckIn] = useState({ studentId: "", lessonType: "", lessonCost: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const generateInvoice = (student: StudentWithStats) => {
    const doc = new jsPDF();
    // Header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text("Invoice", 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
  // Student Info
  let y = 30;

    // Student Info
  // let y = 45;
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

    // Table data from actual check-ins
    const tableY = y + 15;
    const checkIns = getStudentCheckIns(student.id);
    const tableRows = checkIns.map((checkIn) => [
      checkIn.lessonType || "N/A",
      new Date(checkIn.timestamp).toLocaleDateString(),
      `$${checkIn.lessonCost}`
    ]);
    autoTable(doc, {
      startY: tableY,
      head: [["Lesson Type", "Date", "Price"]],
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

    // Footer
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text("Thank you for your business!", 105, finalY + 15, { align: 'center' });

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
  const checkInsWithStudentName = checkIns
    .map(checkIn => ({
      ...checkIn,
      studentName: studentIdToName[checkIn.studentId] || null
    }))
    .filter(checkIn => checkIn.studentName); // Only those with a matching student

  if (loading) {
    return (
      <SidebarProvider>
  {/* Sidebar removed */}
        <SidebarInset>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
  {/* Sidebar removed */}
      <SidebarInset>
        <div className="flex flex-col min-h-screen">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="text-lg font-semibold">Tutoring Center Dashboard</h1>
          </header>

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
                  <CardTitle>All Check-ins (Matched to Students)</CardTitle>
                  <CardDescription>Shows all check-ins from the database, matched to student names.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Subject</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {checkInsWithStudentName.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            No check-ins found in the database.
                          </TableCell>
                        </TableRow>
                      ) : (
                        checkInsWithStudentName.map(checkIn => (
                          <TableRow key={checkIn.id}>
                            <TableCell>{checkIn.studentName}</TableCell>
                            <TableCell>{new Date(checkIn.timestamp).toLocaleDateString()}</TableCell>
                            <TableCell>{checkIn.classroomId || "N/A"}</TableCell>
                          </TableRow>
                        ))
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
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Student
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Student</DialogTitle>
                          <DialogDescription>Enter the student's information below.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                              id="name"
                              value={newStudent.name}
                              onChange={(e) => setNewStudent(prev => ({ ...prev, name: e.target.value }))}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              value={newStudent.email}
                              onChange={(e) => setNewStudent(prev => ({ ...prev, email: e.target.value }))}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="lessons">Signed-Up Lessons</Label>
                            <Input
                              id="lessons"
                              type="number"
                              value={newStudent.signedUpLessons}
                              onChange={(e) => setNewStudent(prev => ({ ...prev, signedUpLessons: parseInt(e.target.value) || 0 }))}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="cost">Cost Per Lesson</Label>
                            <Input
                              id="cost"
                              type="number"
                              value={newStudent.costPerLesson}
                              onChange={(e) => setNewStudent(prev => ({ ...prev, costPerLesson: parseInt(e.target.value) || 0 }))}
                            />
                          </div>
                        </div>
                        <Button onClick={handleAddStudent}>Add Student</Button>
                      </DialogContent>
                    </Dialog>

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
                                onClick={() => generateInvoice(student)}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Invoice
                              </Button>
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
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
