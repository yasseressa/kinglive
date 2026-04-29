export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#d8dbe1] bg-white p-6 text-sm text-[#666] shadow-[0_0_4px_rgba(0,0,0,0.12)]">
      {message}
    </div>
  );
}
