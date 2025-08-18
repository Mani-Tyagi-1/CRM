import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Person = {
  name: string;
  status: "Available" | "Unavailable";
  description: string;
};

const people: Person[] = [
  {
    name: "John Doe",
    status: "Unavailable",
    description:
      "A few years ago, this would have kicked off hours of creative exploration in Figma. Today, it's a prompt that can generate complete UI designs in seconds.",
  },
];

const contracts = [
  {
    id: "SO1165",
    items: [
      {
        type: "machine",
        label: "Heavy machine",
        children: ["John Doe", "John Doe"],
      },
      {
        type: "machine",
        label: "Heavy machine",
        children: ["John Doe", "John Doe"],
      },
    ],
  },
  {
    id: "SO1166",
    items: [
      {
        type: "person",
        label: "John Doe",
      },
      {
        type: "machine",
        label: "Heavy machine",
        children: ["John Doe", "Hammer"],
      },
      {
        type: "machine",
        label: "Heavy machine",
        children: ["John Doe", "John Doe"],
      },
    ],
  },
];

function Tag({
  name,
  onHover,
}: {
  name: string;
  onHover: (person: string) => void;
}) {
  const isPerson = name.includes("John");
  const color = isPerson
    ? "bg-blue-100 text-blue-700"
    : "bg-amber-100 text-amber-700";

  return (
    <div
      className={`mb-1 w-fit rounded-md px-2 py-1 text-sm cursor-pointer ${color}`}
      onMouseEnter={() => onHover(name)}
      onMouseLeave={() => onHover("")}
    >
      {name}
    </div>
  );
}

function Card({
  label,
  type,
  childrenItems,
  onHover,
}: {
  label: string;
  type: string;
  childrenItems?: string[];
  onHover: (person: string) => void;
}) {
  return (
    <div className="min-w-[200px] rounded-lg border bg-white shadow-sm">
      {/* Header */}
      <div
        className={`flex items-center justify-between rounded-t-lg px-3 py-2 text-sm font-medium ${
          type === "machine"
            ? "bg-amber-100 text-amber-700"
            : "bg-blue-100 text-blue-700"
        }`}
      >
        {label}
        <button className="text-gray-500 hover:text-gray-700">ⓘ</button>
      </div>

      {/* Body */}
      {childrenItems && (
        <div className="p-2 flex flex-wrap gap-1">
          {childrenItems.map((child, i) => (
            <Tag key={i} name={child} onHover={onHover} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ContractBoard() {
  const [expanded, setExpanded] = useState<string | null>("SO1165");
  const [hoveredPerson, setHoveredPerson] = useState("");

  const hoveredData = people.find((p) => p.name === hoveredPerson);

  return (
    <div className="relative p-2">

      {contracts.map((contract) => (
        <div
          key={contract.id}
          className="mb-4 rounded-lg border bg-gray-50 p-2 w-auto shadow-sm"
        >
          {/* Contract header */}
          <div
            className="flex cursor-pointer items-center justify-between"
            onClick={() =>
              setExpanded(expanded === contract.id ? null : contract.id)
            }
          >
            <h2 className="text-lg font-semibold">{contract.id}</h2>
            <span>{expanded === contract.id ? "▲" : "▼"}</span>
          </div>

          {/* Contract items */}
          {expanded === contract.id && (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {contract.items.map((item, idx) => (
                <Card
                  key={idx}
                  label={item.label}
                  type={item.type}
                  childrenItems={item.children}
                  onHover={setHoveredPerson}
                />
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Hover Popup */}
      <AnimatePresence>
        {hoveredData && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute left-1/2 top-32 z-50 w-80 -translate-x-1/2 rounded-lg border bg-white p-4 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-blue-700">
                {hoveredData.name}
              </h3>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  hoveredData.status === "Unavailable"
                    ? "bg-red-100 text-red-600"
                    : "bg-green-100 text-green-600"
                }`}
              >
                {hoveredData.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-600">
              Working on <span className="font-medium">Contract name</span>{" "}
              until 19.3.
            </p>
            <p className="mt-2 text-sm text-gray-700">
              {hoveredData.description}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
