import { 
  Key, 
  Coffee, 
  Files, 
  Smartphone, 
  Magnet, 
  Image as ImageIcon, 
  ImagePlus, 
  IdCard, 
  Mail, 
  CreditCard,
  Frame,
  LucideIcon
} from "lucide-react";

export type GiftProduct = {
  id: string;
  name: string;
  icon: LucideIcon;
};

export const GIFTS_PRODUCTS: GiftProduct[] = [
  { id: "keychain", name: "Keychain", icon: Key },
  { id: "mug-print", name: "Mug Print", icon: Coffee },
  { id: "lamination", name: "Lamination", icon: Files },
  { id: "photoframe", name: "Photoframe", icon: Frame },
  { id: "mobile-case", name: "Mobile Case", icon: Smartphone },
  { id: "fridge-magnet", name: "Fridge Magnet", icon: Magnet },
  { id: "backlight-photo", name: "Backlight Photo", icon: ImagePlus },
  { id: "frontlight-photo", name: "Frontlight Photo", icon: ImageIcon },
  { id: "visiting-card", name: "Visiting Card", icon: IdCard },
  { id: "invitation", name: "Invitation", icon: Mail },
  { id: "voter-id", name: "Voter ID", icon: IdCard },
  { id: "aadhaar-card", name: "Aadhaar Card", icon: CreditCard },
  { id: "smart-card", name: "Smart Card", icon: CreditCard }
];
