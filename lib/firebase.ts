// Firebase configuration and utility functions
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};


console.log('Using Firebase project:', firebaseConfig.projectId);
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);


// Types matching your Firestore schema
export interface Student {
  id: string;
  name: string;
  email: string;
  signedUpLessons: number;
  costPerLesson: number;
  completedLessons?: number;
  lastInvoiceMonth?: string;
  nextMonthRequest?: number;
  rolloverLessons?: number;
  active?: boolean;
}

export interface CheckIn {
  id: string;
  studentId: string;
  lessonType: string;
  lessonCost: number;
  timestamp: number;
  classroomId?: string; // Subject or classroom identifier
  active?: boolean; // true = visible, false = deleted
}

// Helpers to convert Firestore docs
function studentFromDoc(doc: QueryDocumentSnapshot<DocumentData>): Student {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    email: data.email,
    signedUpLessons: data.lessonsSignedUp ?? data.signedUpLessons ?? 0,
    costPerLesson: data.lessonRateHKD ?? data.costPerLesson ?? 0,
    completedLessons: data.lessonsCompleted ?? data.completedLessons ?? 0,
    lastInvoiceMonth: data.lastInvoiceMonth ?? '',
    nextMonthRequest: data.nextMonthRequest ?? 0,
    rolloverLessons: data.rolloverLessons ?? 0,
  };
}

function checkInFromDoc(doc: QueryDocumentSnapshot<DocumentData>): CheckIn {
  const data = doc.data();
  return {
    id: doc.id,
    studentId: data.studentId,
    lessonType: data.lessonType,
    lessonCost: data.lessonCost,
    timestamp: typeof data.timestamp === 'number' ? data.timestamp : (data.timestamp?.toMillis?.() ?? Date.now()),
    classroomId: data.classroomId ?? '',
    active: data.active !== false, // default to true if undefined
  };
}
// Update a check-in (e.g., set active=false)
export async function updateCheckIn(id: string, updatedFields: Partial<Omit<CheckIn, 'id'>>) {
  await updateDoc(doc(db, 'checkins', id), updatedFields);
}

// Real-time subscription to students
export function subscribeToStudents(callback: (students: Student[]) => void) {
  return onSnapshot(collection(db, 'students'), (snapshot) => {
    const students = snapshot.docs.map(studentFromDoc);
    console.log('Firestore students:', students);
    callback(students);
  }, (error) => {
    console.error('Error in students subscription:', error);
  });
}

// Real-time subscription to checkIns
export function subscribeToCheckIns(callback: (checkIns: CheckIn[]) => void) {
  return onSnapshot(collection(db, 'checkins'), (snapshot) => {
    const checkIns = snapshot.docs.map(checkInFromDoc);
    callback(checkIns);
  }, (error) => {
    console.error('Error in checkIns subscription:', error);
  });
}

// Add a student
type NewStudent = Omit<Student, 'id'>;
export async function addStudent(student: NewStudent) {
  await addDoc(collection(db, 'students'), {
    name: student.name,
    email: student.email,
    lessonsSignedUp: student.signedUpLessons,
    lessonRateHKD: student.costPerLesson,
    lessonsCompleted: student.completedLessons ?? 0,
    lastInvoiceMonth: student.lastInvoiceMonth ?? '',
    nextMonthRequest: student.nextMonthRequest ?? 0,
    rolloverLessons: student.rolloverLessons ?? 0,
  });
}

// Update a student
export async function updateStudent(id: string, updatedFields: Partial<Omit<Student, 'id'>>) {
  // Map dashboard fields to Firestore fields
  const mappedFields: any = {};
  if (updatedFields.name !== undefined) mappedFields.name = updatedFields.name;
  if (updatedFields.email !== undefined) mappedFields.email = updatedFields.email;
  if (updatedFields.signedUpLessons !== undefined) mappedFields.lessonsSignedUp = updatedFields.signedUpLessons;
  if (updatedFields.costPerLesson !== undefined) mappedFields.lessonRateHKD = updatedFields.costPerLesson;
  if (updatedFields.completedLessons !== undefined) mappedFields.lessonsCompleted = updatedFields.completedLessons;
  if (updatedFields.lastInvoiceMonth !== undefined) mappedFields.lastInvoiceMonth = updatedFields.lastInvoiceMonth;
  if (updatedFields.nextMonthRequest !== undefined) mappedFields.nextMonthRequest = updatedFields.nextMonthRequest;
  if (updatedFields.rolloverLessons !== undefined) mappedFields.rolloverLessons = updatedFields.rolloverLessons;
  if (updatedFields.active !== undefined) mappedFields.active = updatedFields.active;
  await updateDoc(doc(db, 'students', id), mappedFields);
}

// Add a check-in
type NewCheckIn = Omit<CheckIn, 'id' | 'timestamp'> & { timestamp?: number };
export async function addCheckIn(checkIn: NewCheckIn) {
  await addDoc(collection(db, 'checkins'), {
    ...checkIn,
    classroomId: checkIn.classroomId ?? '',
    timestamp: checkIn.timestamp ?? Date.now(),
  });
}
