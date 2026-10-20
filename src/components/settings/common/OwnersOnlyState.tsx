/** Shown in owner-only settings sections when a member opens them. */
export default function OwnersOnlyState({ title = "Only owners can change roles", message }: { title?: string; message?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-14 text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center text-2xl">
        <i aria-hidden="true" className="ph-bold ph-lock-simple" />
      </div>
      <h2 className="mt-4 text-lg font-extrabold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm font-medium text-slate-500 max-w-sm mx-auto">
        {message ?? "Ask an owner of your studio if you need different access."}
      </p>
    </div>
  );
}
