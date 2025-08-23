import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import OrganizationDetails from "../DashboardComponents/OrganisationDetails";
import TeamManagement from "../DashboardComponents/TeamManagement";
import { PurchasersManagement } from "../DashboardComponents/PurchaseManagement";
import SupportManagement from "../DashboardComponents/SupportManagement";

export default function SidebarLayout() {
  const navItems = [
    "Dashboard",
    "Organization settings",
    "Resources",
    "Team",
    "Purchasers",
    "Support",
  ];

  // Default view mirrors original screenshot
  const [active, setActive] = useState("Organization settings");

  return (
    <div className="flex h-screen bg-white">
      {/* ───── Sidebar ───── */}
      <aside className="flex flex-col w-64 border-r px-4 py-6 space-y-6">
        {/* Back link */}
        <a href="/calender" className="absolute top-4 left-4 ">
          <button
            className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-800 "
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to the calendar
          </button>
        </a>

        {/* Navigation */}
        <nav className="flex flex-col space-y-1 mt-10">
          {navItems.map((item) => {
            const isActive = active === item;
            return (
              <button
                key={item}
                onClick={() => setActive(item)}
                className={`text-left px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150
                  ${
                    isActive
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }`}
              >
                {item}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ───── Main content ───── */}
      <main className="flex-1 overflow-y-auto p-10">
        {active === "Organization settings" ? (
          <OrganizationDetails />
        ) : active === "Team" ? (
          <TeamManagement />
        ) : active === "Purchasers" ? (
          <PurchasersManagement />
        ) : active === "Support" ? (
          <SupportManagement />
        ) : (
          <Placeholder title={active} />
        )}
      </main>
    </div>
  );
}

/**
 * Simple fallback placeholder for pages other than Organization settings.
 */
function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-full text-gray-400 text-xl">
      {title} content goes here.
    </div>
  );
}
