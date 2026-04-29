import { cn } from "@/lib/utils";

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-lg border border-[#d8dbe1] bg-white px-4 py-3 text-sm text-[#222] outline-none transition focus:border-[#931800] focus:ring-2 focus:ring-[#931800]/15",
        props.className,
      )}
    />
  );
}
