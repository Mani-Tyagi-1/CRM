import HeaderBar from "../DashboardComponent.tsx/HeaderBar";
import ContractCard from "../DashboardComponent.tsx/ContractCard";
import SectionWrapper from "../DashboardComponent.tsx/SectionWrapper";
import AddContractButton from "../DashboardComponent.tsx/AddContractButton";
import Sidebar from "../DashboardComponent.tsx/Sidebar";

export default function Dashboard() {
  return (
    <>
      <div className="flex">
        <Sidebar />
        <div className="min-h-screen flex-1 bg-gray-100">
          {/* Header */}
          <HeaderBar />

          <div className="p-6">
            {/* Contracts Section */}
            <SectionWrapper title="Contract name">
              <ContractCard
                title="SO1165"
                resources={[
                  [
                    { label: "Heavy machine", color: "yellow" },
                    { label: "John Doe", color: "blue" },
                  ],
                  [
                    { label: "Heavy machine", color: "yellow" },
                    { label: "John Doe", color: "blue" },
                  ],
                  [
                    { label: "John Doe", color: "blue" },
                    { label: "Hammer", color: "orange" },
                  ],
                ]}
              />
            </SectionWrapper>

            {/* Vacation Section */}
            <SectionWrapper title="Vacation" highlight>
              <div className="flex gap-2 flex-wrap">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  John Doe
                </span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                  Heavy machine
                </span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                  Heavy machine
                </span>
              </div>
            </SectionWrapper>

            {/* Sick Section */}
            <SectionWrapper title="Sick" highlight>
              <div className="flex gap-2 flex-wrap">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  John Doe
                </span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  John Doe
                </span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                  Heavy machine
                </span>
              </div>
            </SectionWrapper>
          </div>

          {/* Floating button */}
          <AddContractButton />
        </div>
      </div>
    </>
  );
}
