/** Thin strip on every page of the demo site. */
export default function DemoBanner() {
  return (
    <div className="shrink-0 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 px-3 py-1.5 text-center text-[11px] sm:text-xs font-bold text-white">
      <i aria-hidden="true" className="ph-bold ph-presentation-chart text-sm" />
      <span>
        Demo · sample shops and made-up data. Try anything: it resets every night.
      </span>
    </div>
  );
}
