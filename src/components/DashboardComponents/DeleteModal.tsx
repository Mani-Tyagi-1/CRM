
export function DeleteModal({
  open,
  name,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg max-w-lg w-full p-6 text-center relative">
        <div className="absolute left-5 top-3 text-xs text-black font-medium cursor-pointer">
          &lt; Back to resources management
        </div>
        <div className="mt-6  text-lg font-medium text-gray-900">
          Do you really want to delete this ?
        </div>
        <div className="mb-8 text-2xl text-gray-900">{name}</div>
        <div className="flex justify-end gap-4">
          <button
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md border border-red-600 px-4 py-2 bg-red-600 text-white text-sm font-medium flex items-center gap-1 hover:bg-red-700"
          >
            <span>
              <svg
                className="inline w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3m5 0H6"
                ></path>
              </svg>
            </span>
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
