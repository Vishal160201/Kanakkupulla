import { alexBrush, montserrat } from "@/lib/fonts";

/** "Moondot Studio" wordmark shown in the top bar on the dashboard. */
export default function StudioBrand() {
  return (
    <div className={`relative hidden sm:block ${alexBrush.variable} ${montserrat.variable}`}>
      <style>{`
        .studio-brand {
          font-family: var(--font-alex-brush), cursive;
          font-weight: 400;
          font-size: 5.8rem;
          line-height: 1.1;
          background: linear-gradient(135deg, #0f172a 0%, #334155 50%, #020617 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          display: flex;
          align-items: center;
          gap: 15px;
          padding-left: 20px;
          padding-right: 20px;
          margin-top: -15px;
          margin-bottom: -10px;
        }
        .studio-brand-accent {
          font-family: var(--font-montserrat), sans-serif;
          font-weight: 500;
          font-size: 1.2rem;
          text-transform: uppercase;
          letter-spacing: 0.35em;
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-top: 40px;
        }
      `}</style>
      <div className="studio-brand">
        Moondot <span className="studio-brand-accent hidden md:inline">Studio</span>
      </div>
    </div>
  );
}
