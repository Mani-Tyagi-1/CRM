type ResourceTagProps = {
  label: string;
  color?: "blue" | "green" | "pink" | "yellow" | "orange" | "red" | undefined;
};

export default function ResourceTag({
  label,
  color = "blue",
}: ResourceTagProps) {
  const colors: Record<ResourceTagProps["color"], string> = {
    blue: "bg-blue-100 text-blue-800",
    green: "bg-green-100 text-green-800",
    pink: "bg-pink-100 text-pink-800",
    yellow: "bg-yellow-100 text-yellow-800",
    orange: "bg-orange-100 text-orange-800",
    red: "bg-red-100 text-red-800",
  };

  return (
    <span className={`px-2 py-1 text-xs rounded block w-fit ${colors[color]}`}>
      {label}
    </span>
  );
}
