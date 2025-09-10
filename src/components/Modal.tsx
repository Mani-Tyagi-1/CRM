// src/components/Modal.tsx
import { useNavigate } from "react-router-dom";

export default function Modal({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  function onBgClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      navigate(-1); // go back to previous route
    }
  }
  return (
    <div
      className="fixed inset-0 z-[200] bg-transparent backdrop-blur-sm flex items-center justify-center"
      onClick={onBgClick}
    >
      <div className="bg-white rounded-xl shadow-2xl p-0 relative max-w-5xl w-full">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 text-2xl font-bold"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
