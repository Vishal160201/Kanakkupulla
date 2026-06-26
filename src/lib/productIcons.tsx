import { 
  Key, 
  Copy, 
  Coffee, 
  Smartphone, 
  Magnet, 
  ImagePlus, 
  Image as ImageIcon, 
  ContactRound, 
  Mail, 
  IdCard, 
  CreditCard,
  Frame,
  Package
} from "lucide-react";

export const getProductIcon = (productId?: string | null) => {
  const normalizedId = productId?.toLowerCase() || '';

  if (normalizedId.includes('keychain')) return { icon: Key, color: "text-blue-500", bg: "bg-blue-50" };
  if (normalizedId.includes('lamination')) return { icon: Copy, color: "text-teal-500", bg: "bg-teal-50" };
  if (normalizedId.includes('mug')) return { icon: Coffee, color: "text-amber-600", bg: "bg-amber-50" };
  if (normalizedId.includes('mobile')) return { icon: Smartphone, color: "text-purple-500", bg: "bg-purple-50" };
  if (normalizedId.includes('magnet')) return { icon: Magnet, color: "text-red-500", bg: "bg-red-50" };
  if (normalizedId.includes('backlight')) return { icon: ImagePlus, color: "text-indigo-500", bg: "bg-indigo-50" };
  if (normalizedId.includes('frontlight')) return { icon: ImageIcon, color: "text-pink-500", bg: "bg-pink-50" };
  if (normalizedId.includes('visiting')) return { icon: ContactRound, color: "text-emerald-600", bg: "bg-emerald-50" };
  if (normalizedId.includes('invitation')) return { icon: Mail, color: "text-orange-500", bg: "bg-orange-50" };
  if (normalizedId.includes('voter')) return { icon: IdCard, color: "text-slate-500", bg: "bg-slate-50" };
  if (normalizedId.includes('aadhaar')) return { icon: CreditCard, color: "text-violet-500", bg: "bg-violet-50" };
  if (normalizedId.includes('smart')) return { icon: CreditCard, color: "text-cyan-500", bg: "bg-cyan-50" };
  if (normalizedId.includes('frame')) return { icon: Frame, color: "text-yellow-600", bg: "bg-yellow-50" };

  return { icon: Package, color: "text-slate-500", bg: "bg-slate-100" };
};
