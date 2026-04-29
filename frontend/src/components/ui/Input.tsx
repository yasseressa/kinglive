import { cn } from "@/lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-lg border border-[#d8dbe1] bg-white px-4 py-3 text-sm text-[#222] outline-none transition placeholder:text-[#8f96a3] focus:border-[#931800] focus:ring-2 focus:ring-[#931800]/15",
        props.className,
      )}
    />
  );
}
