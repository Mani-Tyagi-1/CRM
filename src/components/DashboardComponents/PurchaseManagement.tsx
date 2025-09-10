import { useState } from "react";
import { ChevronLeft, ExternalLink, Trash2 } from "lucide-react";

/**
 * Sidebar layout with conditional content rendering. Includes a
 * fully‑functional color‑theme dropdown that updates the accent dot.
 */
export default function SidebarLayout() {
  const navItems = [
    "Dashboard",
    "Organization settings",
    "Resources",
    "Team",
    "Purchasers",
    "Support",
  ];

  const [active, setActive] = useState("Organization settings");

  return (
    <div className="flex h-screen bg-white">
      {/* ───── Sidebar ───── */}
      <aside className="flex flex-col w-64 border-r px-4 py-6 space-y-6">
        <button
          className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-800"
          onClick={() => window.history.back()}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to the calendar
        </button>

        <nav className="flex flex-col space-y-1">
          {navItems.map((item) => (
            <button
              key={item}
              onClick={() => setActive(item)}
              className={`text-left px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150
                ${
                  active === item
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}
            >
              {item}
            </button>
          ))}
        </nav>
      </aside>

      {/* ───── Main content ───── */}
      <main className="flex-1 overflow-y-auto p-10">
        {active === "Organization settings" ? (
          <OrganizationDetails />
        ) : (
          <Placeholder title={active} />
        )}
      </main>
    </div>
  );
}

/**
 * Organization details page.
 */
function OrganizationDetails() {
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
    <div className="max-w-4xl space-y-8">
      <div className="flex justify-between items-start flex-wrap gap-8">
        {/* Left column */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">EuropeanCompany</h2>

          {/* Color theme dropdown */}
          <label className="relative inline-block">
            <select
              className="appearance-none pl-8 pr-6 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-sm font-medium text-gray-700 cursor-pointer"
              value={color}
              onChange={(e) => setColor(e.target.value as Color)}
            >
              {colorOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {/* Colored dot */}
            <span
              className={`absolute left-3 top-2.5 w-3 h-3 rounded-full ${colorClass}`}
            />
          </label>

          {/* Bank account */}
          <div>
            <div className="text-sm font-medium text-gray-700">
              Bank account
            </div>
            <div className="font-semibold">01234567/0123</div>
          </div>

          {/* Address */}
          <div>
            <div className="text-sm font-medium text-gray-700">Adress</div>
            <div className="font-semibold max-w-xs">
              Prvni nádvoří Pražského hradu, 119 00 Praha 1-Hradčany
            </div>
          </div>

          {/* Phone */}
          <div>
            <div className="text-sm font-medium text-gray-700">Phone</div>
            <div className="font-semibold">+420 012 345 678</div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium text-gray-700">Business ID</div>
            <div className="font-semibold">01234567</div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-700">
              Business tax ID
            </div>
            <div className="font-semibold">CZ01234567</div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-700">
              Contact person
            </div>
            <div className="font-semibold">Tomáš Novák</div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-700">
              Owner e-mail
            </div>
            <div className="font-semibold">vas@email.cz</div>
          </div>
        </div>
      </div>

      {/* Yellow notice */}
      <div className="bg-yellow-100 p-8 rounded-md text-gray-800 text-sm font-medium max-w-3xl">
        the color style picker is not part of plan A
      </div>
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-full text-gray-400 text-xl">
      {title} content goes here.
    </div>
  );
}

// Purchasers Management component
export function PurchasersManagement() {
  type Purchaser = { id: string; name: string };
  const [purchasers, setPurchasers] = useState<Purchaser[]>([
    { id: "c1", name: "Company 1" },
    { id: "c2", name: "Company 2" },
    { id: "c3", name: "Company 3" },
    { id: "c4", name: "Company 4" },
    { id: "c5", name: "Company 5" },
  ]);
  const [newName, setNewName] = useState("");

  const remove = (id: string) =>
    setPurchasers((arr) => arr.filter((p) => p.id !== id));

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    setPurchasers((arr) => [
      ...arr,
      { id: Math.random().toString(36).slice(2), name },
    ]);
    setNewName("");
  };

  return (
    <section className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold">Purchasers management</h2>
      <p className="mt-1 text-sm text-gray-600">
        Lorem Ipsum is simply dummy text of the printing and typesetting
        industry. Lorem Ipsum has been the industry's standard dummy text ever
        since the 1500s.
      </p>

      <div className="mt-6 max-w-lg rounded-2xl border border-slate-400 bg-white">
        <ul role="list" className="overflow-hidden rounded-2xl">
          {purchasers.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between px-5 py-3 border-b border-slate-400 last:border-b-0"
            >
              <span className="text-gray-800">{p.name}</span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title="Open"
                  className="inline-flex items-center justify-center rounded-md border border-slate-400 px-2.5 py-1.5 text-gray-600 hover:bg-gray-50"
                  onClick={() => console.log("open", p.id)}
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Delete"
                  className="inline-flex items-center justify-center rounded-md border border-slate-400 px-2.5 py-1.5 text-gray-600 hover:bg-gray-50"
                  onClick={() => remove(p.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}

          {/* Add row */}
          <li className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-b-2xl">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New purchaser"
              className="flex-1 rounded-lg border border-slate-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={add}
              disabled={!newName.trim()}
              className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
                newName.trim()
                  ? "bg-slate-900 hover:bg-black"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              Add
            </button>
          </li>
        </ul>
      </div>
    </section>
  );
}
