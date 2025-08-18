import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

export default function HeaderBar() {
  return (
    <div className="w-full flex flex-col border-b bg-white p-4">
      {/* Top row */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">June 2025</h2>
        <div className="flex items-center gap-2">
          <button className="p-1 border rounded hover:bg-gray-100">
            <ChevronLeft size={16} />
          </button>
          <button className="px-3 py-1 border rounded hover:bg-gray-100 text-sm">
            Today
          </button>
          <button className="p-1 border rounded hover:bg-gray-100">
            <ChevronRight size={16} />
          </button>
          <button className="p-1 border rounded hover:bg-gray-100">
            <CalendarDays size={16} />
          </button>
        </div>
      </div>

      {/* Dates row */}
      <div className="flex justify-around mt-3 text-sm text-gray-600">
        <span>Mon 10.3.</span>
        <span>Tue 11.3.</span>
        <span>Wed 12.3.</span>
        <span className="font-semibold border-b-2 border-black">Thu 13.3.</span>
        <span>Fri 14.3.</span>
        <span className="text-gray-400">Sat 15.3.</span>
        <span className="text-gray-400">Sun 16.3.</span>
      </div>
    </div>
  );
}
