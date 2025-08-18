import { Plus } from "lucide-react";

export default function AddContractButton() {
  return (
    <button className="fixed bottom-6 right-6 bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md hover:bg-gray-800">
      <Plus size={16} /> Add contract
    </button>
  );
}
