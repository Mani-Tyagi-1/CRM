import React from "react";

type SectionWrapperProps = {
  title: string;
  children: React.ReactNode;
  highlight?: boolean;
};

export default function SectionWrapper({
  title,
  children,
  highlight,
}: SectionWrapperProps) {
  return (
    <div
      className={`rounded-lg p-4 mb-4 ${
        highlight ? "bg-red-50 border border-red-200" : "bg-gray-50"
      }`}
    >
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-semibold">{title}</h4>
        {highlight && (
          <span className="text-red-500 text-sm">3 unavailable resources</span>
        )}
      </div>
      {children}
    </div>
  );
}
