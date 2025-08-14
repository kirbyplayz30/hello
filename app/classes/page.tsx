"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { collection, onSnapshot, addDoc } from "firebase/firestore";
import Header from "@/components/header";
import { subscribeToStudents, subscribeToTeachers, subscribeToClassrooms, Student, Teacher, Classroom, db } from "@/lib/firebase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

interface ClassDoc {
  id: string;
  Classroom: string;
  Name: string;
  Teacher: string;
  recurrence: { day: string; time: string }[];
  startDate: string;
  endDate: string;
  students: string[];
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassDoc[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [showClassForm, setShowClassForm] = useState(false);
  const [classroom, setClassroom] = useState("");
  const [subject, setSubject] = useState("");
  const [teacher, setTeacher] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<{ day: string; time: string }[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to classes
    const unsub = onSnapshot(collection(db, "classes"), (snapshot) => {
      setClasses(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ClassDoc))
      );
    });
    // Subscribe to students, teachers, classrooms
    const unsubStudents = subscribeToStudents(setStudents);
    const unsubTeachers = subscribeToTeachers(setTeachers);
    const unsubClassrooms = subscribeToClassrooms(setClassrooms);
    return () => {
      unsub();
      unsubStudents();
      unsubTeachers();
      unsubClassrooms();
    };
  }, []);

  // Helper to get student names from IDs
  function getStudentNames(ids: string[] | undefined | null) {
    if (!Array.isArray(ids)) return "";
    return ids
      .map((id) => students.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  }

  // Helper to format recurrence
  function formatRecurrence(recurrence: { day: string; time: string }[] | undefined | null) {
    if (!Array.isArray(recurrence)) return "";
    return recurrence.map((r) => `${r.day} ${r.time}`).join(", ");
  }

  function toggleSlot(day: string, time: string) {
    const exists = selectedSlots.some(s => s.day === day && s.time === time);
    if (exists) {
      setSelectedSlots(selectedSlots.filter(s => !(s.day === day && s.time === time)));
    } else {
      setSelectedSlots([...selectedSlots, { day, time }]);
    }
  }

  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
  const res = await fetch("/api/classapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classroom,
          name: subject,
          teacher,
          recurrence: selectedSlots,
          startDate,
          endDate,
          students: selectedStudents,
        })
      });
      if (!res.ok) throw new Error("Failed to create class");
      setMessage("Class created successfully!");
      setClassroom(""); setSubject(""); setTeacher(""); setSelectedSlots([]); setStartDate(""); setEndDate(""); setSelectedStudents([]);
      setShowClassForm(false);
    } catch (err) {
      setMessage("Error creating class");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Header />
      <div className="max-w-5xl mx-auto p-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>All Classes</CardTitle>
            <Button onClick={() => setShowClassForm(v => !v)} variant="outline">
              {showClassForm ? "Cancel" : "Create Class"}
            </Button>
          </CardHeader>
          <CardContent>
            {showClassForm && (
              <form onSubmit={handleCreateClass} className="mb-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block mb-1 font-medium">Students</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" className="w-full justify-between">
                          {selectedStudents.length === 0
                            ? "Select students"
                            : students
                                .filter(s => selectedStudents.includes(s.id))
                                .map(s => s.name)
                                .join(", ")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-72 max-h-60 overflow-y-auto p-2">
                        <div className="flex flex-col gap-1">
                          {students.map(s => (
                            <label key={s.id} className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-gray-100">
                              <Checkbox
                                checked={selectedStudents.includes(s.id)}
                                onCheckedChange={checked => {
                                  if (checked) {
                                    setSelectedStudents(prev => [...prev, s.id]);
                                  } else {
                                    setSelectedStudents(prev => prev.filter(id => id !== s.id));
                                  }
                                }}
                              />
                              <span>{s.name}</span>
                            </label>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Classroom ID</label>
                    <Select value={classroom} onValueChange={setClassroom} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a classroom" />
                      </SelectTrigger>
                      <SelectContent>
                        {classrooms.map(c => (
                          <SelectItem key={c.id} value={c.classroomID}>{c.classroomID}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Subject</label>
                    <Input value={subject} onChange={e => setSubject(e.target.value)} required />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Start Date</label>
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">End Date</label>
                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block mb-1 font-medium">Teacher</label>
                    <Select value={teacher} onValueChange={setTeacher} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map(t => (
                          <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="block mb-2 font-medium">Weekly Schedule</label>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border text-center">
                      <thead>
                        <tr>
                          <th className="border px-2 py-1 bg-gray-50"></th>
                          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                            <th key={day} className="border px-2 py-1 bg-gray-50">{day}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"].map(time => (
                          <tr key={time}>
                            <td className="border px-2 py-1 font-mono text-xs bg-gray-50">{time}</td>
                            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => {
                              const selected = selectedSlots.some(s => s.day === day && s.time === time);
                              return (
                                <td
                                  key={day}
                                  className={`border px-2 py-1 cursor-pointer ${selected ? "bg-blue-200" : "hover:bg-gray-100"}`}
                                  onClick={() => toggleSlot(day, time)}
                                >
                                  {selected ? "✔" : ""}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <Button type="submit" disabled={submitting} className="w-full">{submitting ? "Creating..." : "Create Class"}</Button>
                {message && <div className="text-center mt-2 text-sm text-muted-foreground">{message}</div>}
              </form>
            )}
            {message && !showClassForm && <div className="mb-4 text-sm text-muted-foreground">{message}</div>}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Classroom</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Recurrence</TableHead>
                  <TableHead>Students</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No classes found.
                    </TableCell>
                  </TableRow>
                ) : (
                  classes.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell>{cls.Classroom}</TableCell>
                      <TableCell>{cls.Name}</TableCell>
                      <TableCell>{cls.Teacher}</TableCell>
                      <TableCell>{cls.startDate}</TableCell>
                      <TableCell>{cls.endDate}</TableCell>
                      <TableCell>{formatRecurrence(cls.recurrence)}</TableCell>
                      <TableCell>{getStudentNames(cls.students)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
