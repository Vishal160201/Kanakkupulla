export default function LoadingBookingsOverview() {
  return (
    <div className="flex flex-col gap-8 w-full animate-pulse">
      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-[120px] bg-slate-200 rounded-2xl w-full"></div>
        ))}
      </div>

      <div className="grid grid-cols-[1.5fr_1fr] gap-6">
        <div className="h-[600px] bg-slate-200 rounded-2xl w-full"></div>
        <div className="flex flex-col gap-4">
          <div className="h-8 w-[150px] bg-slate-200 rounded-lg"></div>
          {[1, 2].map(i => (
            <div key={i} className="h-[140px] bg-slate-200 rounded-[16px] w-full"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
