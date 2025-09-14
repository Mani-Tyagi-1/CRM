import React, { useEffect, useMemo, useState } from "react";

/**
 * Modal form for employee/machine add/edit.
 * - category is always injected, not user-editable.
 */
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
  /* --------- Field sets per type/category ---------- */
  const fields = useMemo(() => {
    // If you want all employee categories to have the full fields, just use:
    if (type === "employee") {
      return [
        { key: "name", label: "Name", type: "text" },
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
    }
    // For machines, you can customize per category as needed:
    if (type === "machine" && category === "digger")
      return [
        { key: "name", label: "Name", type: "text" },
        { key: "ownershipType", label: "Ownership type", type: "text" },
        { key: "problems", label: "Problems", type: "text" },
      ];
    // Default: only name
    return [{ key: "name", label: "Name", type: "text" }];
  }, [type, category]);

  // stable initial data
  const stableInitial = useMemo(() => initialData ?? {}, [initialData]);
  const [form, setForm] = useState<Record<string, any>>(stableInitial);

  useEffect(() => {
    if (open) setForm(stableInitial);
  }, [open, stableInitial]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Inject category (hidden field, not in the form)
      onSubmit({ ...form, category });
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      {/* Modal card */}
      <div className="relative w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-lg text-[13px] leading-[16px]">
        {/* close btn */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-lg font-bold text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
        {/* title */}
        <h3 className="mb-4 text-base font-semibold text-gray-800">
          {mode === "add" ? "Add" : "Edit"}{" "}
          {type === "employee" ? "employee" : "machine"}
        </h3>
        {/* form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {fields.map((f) => (
            <div key={f.key} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-700">
                {f.label}
              </label>
              <input
                type={f.type}
                name={f.key}
                value={form[f.key] ?? ""}
                onChange={handleChange}
                required
                className="rounded-md border border-gray-300 px-2 py-1 text-sm outline-none focus:border-blue-500"
              />
            </div>
          ))}
          {/* actions */}
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
