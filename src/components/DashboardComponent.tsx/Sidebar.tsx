import { useState } from "react";
import { Calendar, Search, Users, Truck, FileText } from "lucide-react";

export default function Sidebar() {
  const [openEmployees, setOpenEmployees] = useState(true);
  const [openMachines, setOpenMachines] = useState(true);

  return (
    <div className="w-64 h-screen bg-white border-r p-3 text-sm overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-semibold">EuropeanCompany</h1>
        <button className="text-gray-500">
          <span className="text-xl">⚙️</span>
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center bg-gray-100 rounded px-2 py-1 mb-3">
        <Search size={16} className="text-gray-500" />
        <input
          type="text"
          placeholder="Search"
          className="bg-transparent text-xs px-2 py-1 focus:outline-none w-full"
        />
      </div>

      {/* Date */}
      <div className="flex items-center text-gray-700 text-xs mb-4">
        <Calendar size={14} className="mr-2" />
        <span>21.3. - 24.4.</span>
      </div>

      {/* Employees */}
      <div>
        <button
          className="flex items-center w-full text-gray-800 font-medium mb-2"
          onClick={() => setOpenEmployees(!openEmployees)}
        >
          <Users size={16} className="mr-2" /> Employees
        </button>
        {openEmployees && (
          <div className="ml-5 space-y-2">
            <div>
              <p className="text-gray-700">Drivers</p>
              <div className="ml-5 space-y-1 mt-1">
                <span className="px-2 py-1 rounded bg-cyan-100 text-cyan-800 text-xs block w-fit">
                  John Doe
                </span>
                <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs block w-fit">
                  John Dow
                </span>
                <span className="px-2 py-1 rounded bg-pink-100 text-pink-800 text-xs block w-fit">
                  John Doe
                </span>
                <span className="px-2 py-1 rounded bg-purple-100 text-purple-800 text-xs block w-fit">
                  John Doe
                </span>
              </div>
            </div>

            <div>
              <p className="text-gray-700">Engineers</p>
              <div className="ml-5 space-y-1 mt-1">
                <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs block w-fit">
                  John Doe
                </span>
                <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs block w-fit">
                  John Doe
                </span>
                <span className="px-2 py-1 rounded bg-pink-100 text-pink-800 text-xs block w-fit">
                  John Doe
                </span>
              </div>
            </div>

            <p className="text-gray-700">Hand</p>
            <p className="text-gray-700">Mechanics</p>
            <p className="text-gray-700">TAP</p>
            <p className="text-gray-700">Masters</p>
            <p className="text-gray-700">Construction lead</p>
          </div>
        )}
      </div>

      {/* Machines */}
      <div className="mt-4">
        <button
          className="flex items-center w-full text-gray-800 font-medium mb-2"
          onClick={() => setOpenMachines(!openMachines)}
        >
          <Truck size={16} className="mr-2" /> Machines
        </button>
        {openMachines && (
          <div className="ml-5 space-y-2">
            <p className="text-gray-700">Digger</p>
            <p className="text-gray-700">Loader</p>
            <p className="text-gray-700">Trailer trucks</p>
            <p className="text-gray-700">8 wheelers</p>
            <p className="text-gray-700">Personal cars</p>

            <div>
              <p className="text-gray-700">Tools</p>
              <div className="ml-5 space-y-1 mt-1">
                <span className="px-2 py-1 rounded bg-orange-100 text-orange-800 text-xs block w-fit">
                  Hammer
                </span>
                <span className="px-2 py-1 rounded bg-orange-100 text-orange-800 text-xs block w-fit">
                  Hammer
                </span>
                <span className="px-2 py-1 rounded bg-orange-100 text-orange-800 text-xs block w-fit">
                  Hammer
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contracts */}
      <div className="mt-4">
        <button className="flex items-center w-full text-gray-800 font-medium">
          <FileText size={16} className="mr-2" /> Contracts
        </button>
      </div>
    </div>
  );
}
