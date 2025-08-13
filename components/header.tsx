import Link from "next/link";
import { Calendar as CalendarIcon, Home as HomeIcon } from "lucide-react";

export default function Header() {
  return (
    <header className="flex h-20 shrink-0 items-center gap-8 border-b px-8 bg-white/80 backdrop-blur z-30">
      <Link href="/" className="flex items-center gap-2">
        <span className="text-3xl font-bold tracking-tight text-gray-900">Tutoring Center Dashboard</span>
      </Link>
      <nav className="flex gap-6 ml-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-medium text-gray-700 hover:text-blue-600 transition-colors">
          <HomeIcon className="h-5 w-5" /> Home
        </Link>
        <Link href="/calendar" className="flex items-center gap-2 text-lg font-medium text-gray-700 hover:text-blue-600 transition-colors">
          <CalendarIcon className="h-5 w-5" /> Calendar
        </Link>
        <Link href="/classes/new" className="flex items-center gap-2 text-lg font-medium text-gray-700 hover:text-green-600 transition-colors">
          <span className="font-bold text-green-700">＋</span> Create Class
        </Link>
      </nav>
    </header>
  );
}
