"use client"


import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Header from "@/components/header";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { subscribeToCheckIns, CheckIn } from "@/lib/firebase";
import Calendar from "react-calendar";
import 'react-calendar/dist/Calendar.css';

export default function CalendarPage() {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    const unsubscribe = subscribeToCheckIns((data: CheckIn[]) => setCheckIns(data));
    return () => unsubscribe();
  }, []);

  // Filter check-ins for selected date (system time zone)
  const checkInsForDay = checkIns.filter((checkIn: CheckIn) => {
    const d = new Date(checkIn.timestamp);
    return (
      d.getFullYear() === selectedDate.getFullYear() &&
      d.getMonth() === selectedDate.getMonth() &&
      d.getDate() === selectedDate.getDate()
    );
  });

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
                  const hasCheckIn = checkIns.some((c: CheckIn) => {
                    const d = new Date(c.timestamp);
                    return (
                      d.getFullYear() === date.getFullYear() &&
                      d.getMonth() === date.getMonth() &&
                      d.getDate() === date.getDate()
                    );
                  });
                  return hasCheckIn ? <span style={{ color: 'green', fontSize: 24, lineHeight: 1 }}>•</span> : null;
                }}
                className="react-calendar border-none shadow-lg rounded-lg text-lg w-[420px] min-h-[420px]"
              />
            </div>
            <div className="flex-1 w-full">
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
