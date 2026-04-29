import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-lg border border-[#ddd] bg-white p-5 text-[#222] shadow-[0_0_4px_rgba(0,0,0,0.3)]",
        className,
      )}
    />
  );
}
