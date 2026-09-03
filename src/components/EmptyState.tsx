export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-border text-sm text-text-muted">
      {message}
    </div>
  );
}
