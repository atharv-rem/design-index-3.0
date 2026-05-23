import { Skeleton } from "@/components/ui/skeleton";

const placeholderCards = Array.from({ length: 8 });

export default function ToolsGridSkeleton() {
  return (
    <section className="mt-5 w-full" aria-hidden="true">
      <Skeleton className="mb-2 h-3 w-28 bg-[var(--app-border-strong)]" />

      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-8 w-16 rounded-[10px] bg-[var(--app-border-strong)]" />
        <Skeleton className="h-8 w-16 rounded-[10px] bg-[var(--app-border-strong)]" />
        <Skeleton className="h-8 w-24 rounded-[10px] bg-[var(--app-border-strong)]" />
        <Skeleton className="h-8 w-14 rounded-[10px] bg-[var(--app-border-strong)]" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 pb-10 lg:grid-cols-4">
        {placeholderCards.map((_, index) => (
          <div key={index} className="overflow-hidden rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface-soft)]">
            <Skeleton className="aspect-video w-full rounded-none bg-[var(--app-border-strong)]" />
            <div className="space-y-3 p-4">
              <Skeleton className="h-5 w-3/4 bg-[var(--app-border-strong)]" />
              <Skeleton className="h-4 w-full bg-[var(--app-border-strong)]" />
              <Skeleton className="h-4 w-5/6 bg-[var(--app-border-strong)]" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
