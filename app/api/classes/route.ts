import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    // Basic validation
    if (!data.classroom || !data.name || !data.teacher || !Array.isArray(data.recurrence) || !data.startDate || !data.endDate || !Array.isArray(data.students)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    await addDoc(collection(db, "classes"), {
      Classroom: data.classroom,
      Name: data.name,
      Teacher: data.teacher,
      recurrence: data.recurrence,
      startDate: data.startDate,
      endDate: data.endDate,
      students: data.students,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 });
  }
}
