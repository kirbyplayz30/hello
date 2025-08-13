"use client"


import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Header from "@/components/header";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { subscribeToCheckIns, CheckIn } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Calendar from "react-calendar";
import 'react-calendar/dist/Calendar.css';

export default function CalendarPage() {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    const unsubscribe = subscribeToCheckIns((data: CheckIn[]) => setCheckIns(data));
    const unsubClasses = onSnapshot(collection(db, "classes"), (snapshot) => {
      setClasses(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => {
      unsubscribe();
      unsubClasses();
    };
  }, []);


  // Helper: get all class occurrences between start and end date for recurrence
  function getClassOccurrences(cls: any) {
    if (!Array.isArray(cls.recurrence) || !cls.startDate || !cls.endDate) return [];
    // Support both full and 3-letter day names
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const daysOfWeekShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const start = new Date(cls.startDate);
    const end = new Date(cls.endDate);
    let dates: { date: Date; classInfo: any }[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      for (const rec of cls.recurrence) {
        const recDay = rec.day;
        if (
          daysOfWeek[d.getDay()] === recDay ||
          daysOfWeekShort[d.getDay()] === recDay
        ) {
          // Set time
          const [hour, minute] = rec.time.split(":").map(Number);
          const occurrence = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, minute);
          dates.push({ date: new Date(occurrence), classInfo: cls });
        }
      }
    }
    return dates;
  }

  // Build a map of date string (yyyy-mm-dd) to classes on that day
  const classOccurrencesMap: Record<string, any[]> = {};
  classes.forEach(cls => {
    getClassOccurrences(cls).forEach(({ date, classInfo }) => {
      const key = date.toISOString().slice(0, 10);
      if (!classOccurrencesMap[key]) classOccurrencesMap[key] = [];
      classOccurrencesMap[key].push({ ...classInfo, time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    });
  });

  // Filter check-ins for selected date (system time zone)
  const checkInsForDay = checkIns.filter((checkIn: CheckIn) => {
    const d = new Date(checkIn.timestamp);
    return (
      d.getFullYear() === selectedDate.getFullYear() &&
      d.getMonth() === selectedDate.getMonth() &&
      d.getDate() === selectedDate.getDate()
    );
  });

  // Get classes for selected date
  const selectedDateKey = selectedDate.toISOString().slice(0, 10);
  const classesForDay = classOccurrencesMap[selectedDateKey] || [];

  return (
    <>
      <Header />
      <div className="max-w-4xl mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Monthly Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-8 items-start justify-center">
            <div className="w-full md:w-auto flex justify-center">
              <Calendar
                value={selectedDate}
                onClickDay={(date: Date) => setSelectedDate(date)}
                tileContent={({ date }: { date: Date }) => {
                  const key = date.toISOString().slice(0, 10);
                  const hasClass = !!classOccurrencesMap[key];
                  const hasCheckIn = checkIns.some((c: CheckIn) => {
                    const d = new Date(c.timestamp);
                    return (
                      d.getFullYear() === date.getFullYear() &&
                      d.getMonth() === date.getMonth() &&
                      d.getDate() === date.getDate()
                    );
                  });
                  return (
                    <>
                      {hasClass && <span style={{ color: 'blue', fontSize: 12, lineHeight: 1, marginRight: hasCheckIn ? 2 : 0 }}>●</span>}
                      {hasCheckIn && <span style={{ color: 'green', fontSize: 12, lineHeight: 1 }}>●</span>}
                    </>
                  );
                }}
                className="react-calendar border-none shadow-lg rounded-lg text-lg w-[420px] min-h-[420px]"
              />
            </div>
            <div className="flex-1 w-full">
              <h2 className="font-semibold mb-2 text-lg">Classes for {selectedDate.toLocaleDateString()}</h2>
              <Table className="mb-6">
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Classroom</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classesForDay.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No classes for this day.
                      </TableCell>
                    </TableRow>
                  ) : (
                    classesForDay.map((cls, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{cls.Name}</TableCell>
                        <TableCell>{cls.Teacher}</TableCell>
                        <TableCell>{cls.time}</TableCell>
                        <TableCell>{cls.Classroom}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <h2 className="font-semibold mb-2 text-lg">Check-ins for {selectedDate.toLocaleDateString()}</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Subject</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkInsForDay.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No check-ins for this day.
                      </TableCell>
                    </TableRow>
                  ) : (
                    checkInsForDay.map((checkIn: CheckIn) => (
                      <TableRow key={checkIn.id}>
                        <TableCell>{(checkIn as any).studentName || checkIn.studentId}</TableCell>
                        <TableCell>{new Date(checkIn.timestamp).toLocaleTimeString()}</TableCell>
                        <TableCell>{checkIn.classroomId || "N/A"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
    </>
  );
}
