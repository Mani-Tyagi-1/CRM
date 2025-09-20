import React, { useEffect, useMemo, useState } from "react";

// Fields config for machine categories (edit as needed!)
const machineFields: Record<
  string,
  {
    key: string;
    label: string;
    type: string;
    required?: boolean;
    options?: string[];
  }[]
> = {
  digger: [
    {
      key: "ownershipType",
      label: "Ownership type",
      type: "select",
      options: ["own", "rented"],
      required: true,
    },
    { key: "name", label: "Name", type: "text" },
    { key: "preset", label: "Preset", type: "readonly" }, // Will be auto-filled by ownershipType
    { key: "problems", label: "Problems", type: "text" },
    // Own/Rented sections:
    {
      key: "licencePlate",
      label: "Licence plate",
      type: "text",
      required: true,
    },
    {
      key: "mechanizationCategory",
      label: "Mechanization category",
      type: "text",
      required: true,
    },
    {
      key: "averageConsumption",
      label: "Average consumption",
      type: "text",
      required: true,
    },
  ],
  loader: [
    // Same as digger, copy-paste or adjust if loader fields are different!
    {
      key: "ownershipType",
      label: "Ownership type",
      type: "select",
      options: ["own", "rented"],
      required: true,
    },
    { key: "name", label: "Name", type: "text" },
    { key: "preset", label: "Preset", type: "readonly" },
    { key: "problems", label: "Problems", type: "text" },
    {
      key: "licencePlate",
      label: "Licence plate",
      type: "text",
      required: true,
    },
    {
      key: "mechanizationCategory",
      label: "Mechanization category",
      type: "text",
      required: true,
    },
    {
      key: "averageConsumption",
      label: "Average consumption",
      type: "text",
      required: true,
    },
  ],
  
};

const employeeFields: {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
}[] = [
  { key: "name", label: "Name", type: "text", required: true },
  { key: "surname", label: "Surname", type: "text" },
  { key: "alias", label: "Alias", type: "text" },
  { key: "birthDate", label: "Birth date", type: "date" },
  { key: "payment", label: "Payment", type: "text" },
  { key: "workingRelation", label: "Working relation", type: "text" },
  { key: "typeOfStay", label: "Type of stay", type: "text" },
  { key: "stayingTill", label: "Staying till", type: "date" },
  { key: "quickNote", label: "Quick note", type: "text" },
  { key: "problems", label: "Problems", type: "text" },
];

export function ResourceModal({
  open,
  mode = "add",
  type, // "employee" | "machine"
  category,
  initialData,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode?: "add" | "edit";
  type: "employee" | "machine";
  category: string;
  initialData?: Record<string, any>;
  onClose: () => void;
  onSubmit: (data: Record<string, any>) => void;
}) {
  // Determine field set
  const fields = useMemo(() => {
    if (type === "employee") return employeeFields;
    if (type === "machine") {
      // fallback: minimal form if not in config
      return machineFields[category] ?? machineFields["digger"];
    }
    return [{ key: "name", label: "Name", type: "text" }];
  }, [type, category]);

  // --- Stable initial data
  const stableInitial = useMemo(() => initialData ?? {}, [initialData]);
  const [form, setForm] = useState<Record<string, any>>(stableInitial);

  useEffect(() => {
    if (open) setForm(stableInitial);
  }, [open, stableInitial]);

  // Auto-set preset based on ownershipType (for machine)
  useEffect(() => {
    if (type === "machine") {
      setForm((f) => ({
        ...f,
        preset: f.ownershipType || "own",
      }));
    }
  }, [form.ownershipType, type]);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: value,
      ...(name === "ownershipType" ? { preset: value } : {}),
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ ...form, category });
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      {/* Modal card */}
      <div className="relative w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-lg text-[13px] leading-[16px]">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-lg font-bold text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
        <h3 className="mb-4 text-base font-semibold text-gray-800">
          {mode === "add" ? "Add" : "Edit"}{" "}
          {type === "employee" ? "employee" : "machine"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          {fields.map((f) => {
            // If field type is readonly (like "preset"), just display it
            if (f.type === "readonly") {
              return (
                <div key={f.key} className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-700">
                    {f.label}
                  </label>
                  <input
                    type="text"
                    name={f.key}
                    value={form[f.key] ?? ""}
                    readOnly
                    className="rounded-md border border-gray-200 px-2 py-1 bg-gray-100 text-gray-500"
                  />
                </div>
              );
            }
            if (f.type === "select") {
              return (
                <div key={f.key} className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-700">
                    {f.label}
                    {f.required && "*"}
                  </label>
                  <select
                    name={f.key}
                    value={form[f.key] ?? f.options?.[0] ?? ""}
                    onChange={handleChange}
                    required={!!f.required}
                    className="rounded-md border border-gray-300 px-2 py-1"
                  >
                    {f.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt[0].toUpperCase() + opt.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }
            // Problems field as textarea for better UX
            if (f.key === "problems") {
              return (
                <div key={f.key} className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-700">
                    {f.label}
                    {f.required && "*"}
                  </label>
                  <textarea
                    name={f.key}
                    value={form[f.key] ?? ""}
                    onChange={handleChange}
                    className="rounded-md border border-gray-300 px-2 py-1"
                  />
                </div>
              );
            }
            // Default: normal input
            return (
              <div key={f.key} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-700">
                  {f.label}
                  {f.required && "*"}
                </label>
                <input
                  type={f.type}
                  name={f.key}
                  value={form[f.key] ?? ""}
                  onChange={handleChange}
                  required={!!f.required}
                  className="rounded-md border border-gray-300 px-2 py-1"
                />
              </div>
            );
          })}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-gray-200 px-3 py-1 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
            >
              {mode === "add" ? "Add" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
