import { ChevronDown } from "lucide-react";
import { useState } from "react";


const OrganizationDetails = () => {
    type Color = "blue" | "red" | "green" | "purple";

    const colorOptions: { label: string; value: Color; class: string }[] = [
      { label: "Blue", value: "blue", class: "bg-blue-600" },
      { label: "Red", value: "red", class: "bg-red-600" },
      { label: "Green", value: "green", class: "bg-green-600" },
      { label: "Purple", value: "purple", class: "bg-purple-600" },
    ];

    const [color, setColor] = useState<Color>("blue");
    const colorClass = colorOptions.find((c) => c.value === color)?.class ?? "";
    
  return (
    <div className="w-[90%] flex justify-center space-y-8 ">
      <div className="max-w-4xl flex justify-between items-start flex-wrap gap-24">
        {/* Left column */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">EuropeanCompany</h2>

          {/* Color theme dropdown */}
          <label className="relative inline-flex items-center">
            {/* Colored dot */}
            <span
              className={`absolute left-3 w-3 h-3 rounded-full ${colorClass}`}
              aria-hidden
            />
            <select
              className="appearance-none bg-transparent px-10 py-1 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-sm font-medium text-gray-800 cursor-pointer"
              value={color}
              onChange={(e) => setColor(e.target.value as Color)}
            >
              {colorOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {/* Custom chevron */}
            <ChevronDown className="pointer-events-none absolute right-3 w-4 h-4 text-gray-400" />
          </label>

          {/* Bank account */}
          <div>
            <div className="text-sm font-medium text-gray-700">
              Bank account
            </div>
            <input
              type="text"
              placeholder="01234567/0123"
              className="mt-1 w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Address */}
          <div>
            <div className="text-sm font-medium text-gray-700">Adress</div>
            <input
              type="text"
              placeholder="Prvni nádvoří Pražského hradu, 119 00 Praha 1-Hradčany"
              className="mt-1 w-96 max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Phone */}
          <div>
            <div className="text-sm font-medium text-gray-700">Phone</div>
            <input
              type="tel"
              placeholder="+420 012 345 678"
              className="mt-1 w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium text-gray-700">Business ID</div>
            <input
              type="text"
              placeholder="01234567"
              className="mt-1 w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <div className="text-sm font-medium text-gray-700">
              Business tax ID
            </div>
            <input
              type="text"
              placeholder="CZ01234567"
              className="mt-1 w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <div className="text-sm font-medium text-gray-700">
              Contact person
            </div>
            <input
              type="text"
              placeholder="Tomáš Novák"
              className="mt-1 w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <div className="text-sm font-medium text-gray-700">
              Owner e-mail
            </div>
            <input
              type="email"
              placeholder="vas@email.cz"
              className="mt-1 w-72 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrganizationDetails;