export default function LoadingDashboardOverview() {
  return (
    <div className="flex flex-col gap-8 w-full max-w-[1400px] mx-auto animate-pulse pb-20">
      {/* Hero Skeleton */}
      <div className="h-[200px] bg-slate-200 rounded-[20px] w-full"></div>
      
      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-[120px] bg-slate-200 rounded-2xl w-full"></div>
        ))}
      </div>

      {/* Split Section Skeleton */}
      <div className="grid grid-cols-[1.5fr_1fr] gap-6">
        <div className="flex flex-col gap-4">
          <div className="h-8 w-[200px] bg-slate-200 rounded-lg"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="h-[90px] bg-slate-200 rounded-[20px] w-full"></div>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <div className="h-8 w-[200px] bg-slate-200 rounded-lg"></div>
          <div className="h-[120px] bg-slate-200 rounded-[20px] w-full"></div>
        </div>
      </div>
    </div>
  );
}
