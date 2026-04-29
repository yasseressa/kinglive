export function LoadingState({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded-lg border border-dashed border-[#d8dbe1] bg-white p-10 text-sm font-semibold text-[#931800] ${className}`}>
      Loading...
    </div>
  );
}
