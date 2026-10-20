// All web fonts used by the app, self-hosted through next/font/google. Import the
// font you need from here instead of calling a font loader (or a Google Fonts
// @import) elsewhere: next/font only preloads a font on routes that render it.
// (The @react-pdf invoice registers its own TTFs from public/fonts.)
import { Alex_Brush, Geist, Great_Vibes, Inter, Montserrat, Outfit, Playfair_Display } from "next/font/google";

/** Exposed as --font-sans on <html>. */
export const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

/** App body font (root + auth layouts, /invoice). */
export const inter = Inter({ subsets: ["latin"] });

/**
 * Referenced by the `body` rule in globals.css via --font-outfit. Not preloaded,
 * matching the previous Google Fonts @import (files load only if actually used).
 */
export const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
  preload: false,
});

/** /invoice headings. */
export const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

// The decorative fonts below are only rendered by specific widgets that ship on every
// (main) route, so they are not preloaded (like the old in-component @imports, the
// files download only once something actually renders with them).

/** /invoice "Thank You!" and the gift-order invoice "Moondot" wordmark. */
export const greatVibes = Great_Vibes({ subsets: ["latin"], weight: ["400"], preload: false });

/** "Moondot" wordmark in the top navigation (--font-alex-brush). */
export const alexBrush = Alex_Brush({ subsets: ["latin"], weight: ["400"], variable: "--font-alex-brush", preload: false });

/** "Studio" accent in the top navigation wordmark (--font-montserrat). */
export const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  variable: "--font-montserrat",
  preload: false,
});
