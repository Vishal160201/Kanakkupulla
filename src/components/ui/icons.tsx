import type { JSX } from "react";
import { cn } from "@/lib/utils";

/**
 * Phosphor font icons as components, for places that pass an icon around (`icon: Key`).
 * Inline markup can keep using `<i className="ph-bold ph-…" />` directly.
 */
export interface IconProps {
  size?: number;
  /** Below 2 renders the regular weight, otherwise bold. */
  strokeWidth?: number;
  className?: string;
}
export type IconComponent = (props: IconProps) => JSX.Element;

// Tailwind classes like `w-4 h-4` size the box; a font icon also needs a matching font-size.
const SIZE_CLASS = /(?:^|\s)(?:size|w)-(\d+(?:\.5)?)(?=\s|$)/;

export function iconFontSize(size: number | undefined, className = ""): string {
  if (size !== undefined) return `${size}px`;
  const m = className.match(SIZE_CLASS);
  return m ? `${Number(m[1]) / 4}rem` : "24px";
}

function icon(name: string): IconComponent {
  const PhIcon = ({ size, strokeWidth, className }: IconProps) => (
    <i
      aria-hidden
      className={cn(strokeWidth !== undefined && strokeWidth < 2 ? "ph" : "ph-bold", `ph-${name}`, "inline-flex shrink-0 items-center justify-center leading-none", className)}
      style={{ fontSize: iconFontSize(size, className) }}
    />
  );
  PhIcon.displayName = `Icon(${name})`;
  return PhIcon;
}

export const Activity = icon("pulse");
export const AlertTriangle = icon("warning");
export const ArrowLeft = icon("arrow-left");
export const ArrowRight = icon("arrow-right");
export const BookOpen = icon("book-open");
export const Briefcase = icon("briefcase");
export const Calendar = icon("calendar-blank");
export const CalendarClock = icon("clock-countdown");
export const CalendarDays = icon("calendar-dots");
export const Camera = icon("camera");
export const Check = icon("check");
export const CheckCircle2 = icon("check-circle");
export const ChevronDown = icon("caret-down");
export const ChevronLeft = icon("caret-left");
export const ChevronRight = icon("caret-right");
export const ChevronUp = icon("caret-up");
export const Church = icon("church");
export const Clock = icon("clock");
export const Coffee = icon("coffee");
export const ContactRound = icon("identification-card");
export const Copy = icon("copy");
export const CreditCard = icon("credit-card");
export const Download = icon("download-simple");
export const Edit2 = icon("pencil-simple");
export const Edit3 = icon("pencil-line");
export const FileText = icon("file-text");
export const Files = icon("files");
export const Filter = icon("funnel");
export const Focus = icon("crosshair");
export const FolderClock = icon("clock-counter-clockwise");
export const FolderOpen = icon("folder-open");
export const Frame = icon("frame-corners");
export const Gem = icon("diamond");
export const Heart = icon("heart");
export const IdCard = icon("identification-badge");
export const Image = icon("image");
export const ImagePlus = icon("image-square");
export const Images = icon("images");
export const Info = icon("info");
export const Key = icon("key");
export const LayoutGrid = icon("squares-four");
export const LayoutList = icon("rows");
export const Link = icon("link");
export const Loader2 = icon("circle-notch");
export const Magnet = icon("magnet");
export const Mail = icon("envelope-simple");
export const MapPin = icon("map-pin");
export const Maximize = icon("arrows-out");
export const Package = icon("package");
export const PackageOpen = icon("archive");
export const Paperclip = icon("paperclip");
export const PenTool = icon("pen-nib");
export const Phone = icon("phone");
export const PieChart = icon("chart-pie");
export const Play = icon("play");
export const PlusCircle = icon("plus-circle");
export const Printer = icon("printer");
export const Receipt = icon("receipt");
export const Rupee = icon("currency-inr");
export const Search = icon("magnifying-glass");
export const Send = icon("paper-plane-tilt");
export const Settings = icon("gear");
export const ShoppingBag = icon("shopping-bag");
export const Smartphone = icon("device-mobile");
export const Tag = icon("tag");
export const Target = icon("target");
export const Trash2 = icon("trash");
export const TrendingDown = icon("trend-down");
export const TrendingUp = icon("trend-up");
export const Upload = icon("upload-simple");
export const User = icon("user");
export const UserCircle = icon("user-circle");
export const Users = icon("users");
export const Wallet = icon("wallet");
export const X = icon("x");
export const XCircle = icon("x-circle");
