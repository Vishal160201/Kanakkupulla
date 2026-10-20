/** Page-level placeholder for /inventory (also used by its loading.tsx). */
export default function InventorySkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden="true">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-56 bg-slate-200 rounded-lg" />
          <div className="h-4 w-32 bg-slate-200 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-11 w-32 bg-slate-200 rounded-xl" />
          <div className="h-11 w-32 bg-slate-200 rounded-xl" />
        </div>
      </div>
      <div className="h-12 w-full sm:w-[480px] bg-slate-200 rounded-2xl" />
      <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3 sm:gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-[110px] sm:h-[130px] bg-slate-200/70 rounded-2xl" />
        ))}
      </div>
      <div className="h-72 bg-slate-200/70 rounded-2xl" />
    </div>
  );
}
