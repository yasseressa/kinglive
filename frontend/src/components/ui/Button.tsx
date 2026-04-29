import { cn } from "@/lib/utils";

export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-[#273340] text-white hover:bg-[#931800]",
        variant === "secondary" && "bg-[#eceef2] text-[#222] hover:bg-[#d8dbe1]",
        variant === "ghost" && "border border-[#ddd] bg-white text-[#931800] hover:bg-[#eceef2]",
        className,
      )}
      {...props}
    />
  );
}
