// Centralized Icon Pack for Kanakkupulla using Phosphor Icons
// These icons cover photography, albums, gifts, frames, key chains, mugs, daily transactions, and existing system icons.
// They can be consumed by Icon Pickers in layout editors or dynamic fields.

export interface AppIcon {
  id: string;
  className: string;
  label: string;
  category: string;
}

export const APP_ICONS: AppIcon[] = [
  // --- Photography & Media ---
  { id: "photo-camera", className: "ph-camera", label: "Camera", category: "Photography" },
  { id: "photo-aperture", className: "ph-aperture", label: "Aperture / Lens", category: "Photography" },
  { id: "photo-film", className: "ph-film-strip", label: "Film Strip", category: "Photography" },
  { id: "photo-video", className: "ph-video-camera", label: "Video Camera", category: "Photography" },
  { id: "photo-image", className: "ph-image", label: "Image / Photo", category: "Photography" },
  { id: "photo-gallery", className: "ph-images", label: "Gallery", category: "Photography" },
  { id: "photo-drone", className: "ph-airplane", label: "Drone / Aerial", category: "Photography" },

  // --- Albums & Printing ---
  { id: "album-book", className: "ph-book", label: "Closed Album", category: "Albums & Prints" },
  { id: "album-open", className: "ph-book-open", label: "Open Album", category: "Albums & Prints" },
  { id: "album-bookmark", className: "ph-book-bookmark", label: "Premium Album", category: "Albums & Prints" },
  { id: "print-printer", className: "ph-printer", label: "Printing", category: "Albums & Prints" },
  { id: "print-frame", className: "ph-frame-corners", label: "Photo Frame", category: "Albums & Prints" },
  { id: "print-canvas", className: "ph-bounding-box", label: "Canvas / Board", category: "Albums & Prints" },

  // --- Gifts & Merchandise ---
  { id: "merch-gift", className: "ph-gift", label: "Gift Box", category: "Merchandise" },
  { id: "merch-mug", className: "ph-coffee", label: "Mug / Cup", category: "Merchandise" },
  { id: "merch-keychain", className: "ph-key", label: "Key Chain", category: "Merchandise" },
  { id: "merch-badge", className: "ph-seal-check", label: "Badge / Token", category: "Merchandise" },
  { id: "merch-bag", className: "ph-tote", label: "Bag / Delivery", category: "Merchandise" },
  { id: "merch-package", className: "ph-package", label: "Courier / Package", category: "Merchandise" },

  // --- Daily Transactions & Finance ---
  { id: "tx-receipt", className: "ph-receipt", label: "Receipt / Bill", category: "Transactions" },
  { id: "tx-money", className: "ph-money", label: "Cash / Notes", category: "Transactions" },
  { id: "tx-coin", className: "ph-coins", label: "Coins", category: "Transactions" },
  { id: "tx-currency-inr", className: "ph-currency-inr", label: "Indian Rupee", category: "Transactions" },
  { id: "tx-wallet", className: "ph-wallet", label: "Wallet", category: "Transactions" },
  { id: "tx-card", className: "ph-credit-card", label: "Card Payment", category: "Transactions" },
  { id: "tx-bank", className: "ph-bank", label: "Bank Transfer", category: "Transactions" },
  { id: "tx-fuel", className: "ph-gas-pump", label: "Fuel", category: "Transactions" },
  { id: "tx-bus", className: "ph-bus", label: "Bus / Public Transport", category: "Transactions" },
  { id: "tx-car", className: "ph-car", label: "Car / Taxi", category: "Transactions" },
  { id: "tx-food", className: "ph-hamburger", label: "Food & Dining", category: "Transactions" },
  { id: "tx-repair", className: "ph-wrench", label: "Repair / Maintenance", category: "Transactions" },

  // --- System & UI Basics (Already Used) ---
  { id: "sys-user", className: "ph-user", label: "User", category: "System" },
  { id: "sys-user-circle", className: "ph-user-circle", label: "Client Profile", category: "System" },
  { id: "sys-users", className: "ph-users", label: "Team / Crew", category: "System" },
  { id: "sys-cal-blank", className: "ph-calendar-blank", label: "Event Date", category: "System" },
  { id: "sys-cal-check", className: "ph-calendar-check", label: "Confirmed Event", category: "System" },
  { id: "sys-pencil", className: "ph-pencil-circle", label: "Edit / Design", category: "System" },
  { id: "sys-dots", className: "ph-dots-three-circle", label: "Other / Misc", category: "System" },
  { id: "sys-trend-up", className: "ph-trend-up", label: "Income Trend", category: "System" },
  { id: "sys-trend-down", className: "ph-trend-down", label: "Expense Trend", category: "System" },
  { id: "sys-arrow-in", className: "ph-arrow-down-left", label: "Money In", category: "System" },
  { id: "sys-arrow-out", className: "ph-arrow-up-right", label: "Money Out", category: "System" },
  { id: "sys-buildings", className: "ph-buildings", label: "Office / Studio", category: "System" },
  { id: "sys-envelope", className: "ph-envelope", label: "Email", category: "System" },
  { id: "sys-phone", className: "ph-phone", label: "Phone", category: "System" }
];

// Helper to group icons by category for pickers
export const APP_ICONS_BY_CATEGORY = APP_ICONS.reduce((acc, icon) => {
  if (!acc[icon.category]) {
    acc[icon.category] = [];
  }
  acc[icon.category].push(icon);
  return acc;
}, {} as Record<string, AppIcon[]>);
