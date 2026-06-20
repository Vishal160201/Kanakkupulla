export default function Loading() {
  return (
    <div className="w-full h-full flex flex-col gap-6 animate-pulse p-4">
      <div className="flex justify-between items-center w-full">
        <div className="h-10 bg-slate-200 rounded-xl w-1/3"></div>
        <div className="flex gap-3">
          <div className="h-10 w-24 bg-slate-200 rounded-full"></div>
          <div className="h-10 w-32 bg-slate-200 rounded-full"></div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-32 bg-slate-200 rounded-2xl col-span-1"></div>
        <div className="h-32 bg-slate-200 rounded-2xl col-span-1"></div>
        <div className="h-32 bg-slate-200 rounded-2xl col-span-1"></div>
      </div>
      
      <div className="h-[400px] bg-slate-200 rounded-2xl w-full"></div>
    </div>
  );
}
