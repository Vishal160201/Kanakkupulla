import { isDemo } from "@/lib/demo/mode";

/** The studio named on invoices, messages and the top bar. The demo site uses a made-up one. */
const REAL_STUDIO = {
  name: "Moondot Studio",
  address: "Mela bazar, Ayikudi, Tenkasi, Tamil Nadu - 627852",
  phone: "+91 7373787172",
  email: "moondotstudio@gmail.com",
  /** Used when the studio_upi_id setting is empty (same fallback as the invoice PDF) */
  upiId: "moondotstudio@okaxis",
  instagram: "instagram.com/moondot.studio",
  website: "www.moondotstudio.com",
  /** Top-bar wordmark: script word + small caps word */
  wordmark: ["Moondot", "Studio"] as readonly [string, string],
  team: "Team Moondot",
  showStamp: true,
  /** The photographer in the upcoming-shoots pop-up and the couple on invoices */
  showSamplePhotos: true,
};

/** Demo site: nothing here reaches a real studio (555 numbers aren't Indian mobiles; "@demo" isn't a UPI bank). */
const DEMO_STUDIO: typeof REAL_STUDIO = {
  name: "Lumina Studio",
  address: "12, Sample Street, Erode, Tamil Nadu - 638001",
  phone: "+91 5550000000",
  email: "hello@demo.kanakkupulla.app",
  upiId: "luminastudio@demo",
  instagram: "instagram.com/lumina.demo",
  website: "demo.kanakkupulla.app",
  wordmark: ["Lumina", "Studio"],
  team: "Team Lumina",
  showStamp: false,
  showSamplePhotos: false,
};

export const STUDIO_DETAILS = isDemo() ? DEMO_STUDIO : REAL_STUDIO;
