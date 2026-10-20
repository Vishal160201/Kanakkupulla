import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex-1 w-full h-full flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
          <i className="ph-bold ph-magnifying-glass text-2xl"></i>
        </div>
        <p className="text-xs font-bold tracking-widest text-slate-400">404</p>
        <h2 className="mt-1 text-lg font-bold text-slate-900">Page not found</h2>
        <p className="mt-1 text-sm text-slate-500">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
