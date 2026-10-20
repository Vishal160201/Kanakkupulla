import type { LucideIcon } from "lucide-react";
import {
  FileText, Wallet, Clock, MapPin, Tag, UserCircle, Calendar, Link as LinkIcon, Phone, Mail, Info,
  Camera, Image as ImageIcon, LayoutList, Users, FolderOpen, Package,
  BookOpen, Maximize, Images, Activity, CheckCircle2, XCircle, Edit3, Send, Play, User, Focus, Gem, Church, Heart,
} from "lucide-react";

export const getSectionIcon = (title: string) => {
  const t = (title || '').toLowerCase();
  if (t.includes('event') || t.includes('shoot')) return <Camera className="w-5 h-5 text-indigo-500" />;
  if (t.includes('album') || t.includes('deliverable') || t.includes('photo')) return <ImageIcon className="w-5 h-5 text-emerald-500" />;
  if (t.includes('payment') || t.includes('finance')) return <Wallet className="w-5 h-5 text-emerald-500" />;
  if (t.includes('client') || t.includes('contact') || t.includes('detail')) return <UserCircle className="w-5 h-5 text-blue-500" />;
  if (t.includes('team') || t.includes('crew') || t.includes('assign')) return <Users className="w-5 h-5 text-orange-500" />;
  return <LayoutList className="w-5 h-5 text-slate-500" />;
};

export const getFieldIcon = (field: { name?: string }) => {
  const name = (field.name || '').toLowerCase();

  let icon = <Info className="w-4 h-4" />;
  let color = "slate";

  if (name.includes('album type') || name.includes('book')) { icon = <BookOpen className="w-5 h-5" />; color = "emerald"; }
  else if (name.includes('photo') || name.includes('image') || name.includes('picture') || name.includes('pic')) { icon = <Images className="w-5 h-5" />; color = "indigo"; }
  else if (name.includes('status') || name.includes('state')) { icon = <Activity className="w-5 h-5" />; color = "orange"; }
  else if (name.includes('size') || name.includes('dimension')) { icon = <Maximize className="w-5 h-5" />; color = "blue"; }
  else if (name.includes('email') || name.includes('mail')) { icon = <Mail className="w-5 h-5" />; color = "blue"; }
  else if (name.includes('name') || name.includes('client')) { icon = <UserCircle className="w-5 h-5" />; color = "indigo"; }
  else if (name.includes('location') || name.includes('address') || name.includes('city') || name.includes('venue')) { icon = <MapPin className="w-5 h-5" />; color = "rose"; }
  else if (name.includes('note') || name.includes('remark') || name.includes('description')) { icon = <FileText className="w-5 h-5" />; color = "yellow"; }
  else if (name.includes('date')) { icon = <Calendar className="w-5 h-5" />; color = "blue"; }
  else if (name.includes('time')) { icon = <Clock className="w-5 h-5" />; color = "purple"; }
  else if (name.includes('user') || name.includes('person') || name.includes('designer') || name.includes('photographer')) { icon = <Images className="w-5 h-5" />; color = "indigo"; } // changed to Images and indigo to match screenshot
  else if (name.includes('amount') || name.includes('price') || name.includes('cost')) { icon = <Wallet className="w-5 h-5" />; color = "emerald"; }
  else if (name.includes('category') || name.includes('shoot type')) { icon = <FolderOpen className="w-5 h-5" />; color = "violet"; }
  else if (name.includes('inclusion') || name.includes('package') || name.includes('item')) { icon = <Package className="w-5 h-5" />; color = "amber"; }
  else if (name.includes('type')) { icon = <Tag className="w-5 h-5" />; color = "rose"; }
  else if (name.includes('link') || name.includes('url')) { icon = <LinkIcon className="w-5 h-5" />; color = "blue"; }
  else if (name.includes('phone') || name.includes('contact') || name.includes('mobile')) { icon = <Phone className="w-5 h-5" />; color = "emerald"; }

  return { icon, color };
};

/** Icon + colours for one entry of a multi-select / inclusions list. */
export const getInclusionItemStyle = (item: string): { ItemIcon: LucideIcon; itemColor: string; itemBg: string } => {
  const itemLower = item.toLowerCase();
  let ItemIcon: LucideIcon = Camera;
  let itemColor = "text-indigo-500";
  let itemBg = "bg-indigo-50/70";

  if (itemLower.includes('video')) { ItemIcon = Play; itemColor = "text-orange-500"; itemBg = "bg-orange-50/70"; }
  else if (itemLower.includes('photo')) { ItemIcon = ImageIcon; itemColor = "text-orange-500"; itemBg = "bg-orange-50/70"; }
  else if (itemLower.includes('candid')) { ItemIcon = User; itemColor = "text-orange-500"; itemBg = "bg-orange-50/70"; }
  else if (itemLower.includes('drone')) { ItemIcon = Focus; itemColor = "text-orange-500"; itemBg = "bg-orange-50/70"; }
  else if (itemLower.includes('engagement')) { ItemIcon = Gem; itemColor = "text-indigo-500"; itemBg = "bg-indigo-50/70"; }
  else if (itemLower.includes('pre wedding') || itemLower.includes('post wedding')) { ItemIcon = Heart; itemColor = "text-indigo-500"; itemBg = "bg-indigo-50/70"; }
  else if (itemLower.includes('reception')) { ItemIcon = Church; itemColor = "text-indigo-500"; itemBg = "bg-indigo-50/70"; }

  return { ItemIcon, itemColor, itemBg };
};

/** Icon + colour classes for the booking status pill in the details header. */
export const getStatusVisual = (status: string) => {
  const s = status.toLowerCase();

  let icon = <Clock className="w-3.5 h-3.5 text-indigo-600" />;
  let bg = 'bg-indigo-100';
  let ring = 'ring-indigo-500';
  let text = 'text-indigo-600';
  let doubleBorder = 'border-indigo-50';

  if (s === 'confirmed') { icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />; bg = 'bg-emerald-100'; ring = 'ring-emerald-500'; text = 'text-emerald-600'; doubleBorder = 'border-emerald-50'; }
  else if (s === 'shoot completed') { icon = <Camera className="w-3.5 h-3.5 text-blue-600" />; bg = 'bg-blue-100'; ring = 'ring-blue-500'; text = 'text-blue-600'; doubleBorder = 'border-blue-50'; }
  else if (s === 'designing') { icon = <Edit3 className="w-3.5 h-3.5 text-blue-600" />; bg = 'bg-blue-100'; ring = 'ring-blue-500'; text = 'text-blue-600'; doubleBorder = 'border-blue-50'; }
  else if (s === 'sent for printing') { icon = <Send className="w-3.5 h-3.5 text-purple-600" />; bg = 'bg-purple-100'; ring = 'ring-purple-500'; text = 'text-purple-600'; doubleBorder = 'border-purple-50'; }
  else if (s === 'ready for delivery') { icon = <Package className="w-3.5 h-3.5 text-orange-600" />; bg = 'bg-orange-100'; ring = 'ring-orange-500'; text = 'text-orange-600'; doubleBorder = 'border-orange-50'; }
  else if (s === 'delivered') { icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />; bg = 'bg-emerald-100'; ring = 'ring-emerald-500'; text = 'text-emerald-600'; doubleBorder = 'border-emerald-50'; }
  else if (s === 'cancelled') { icon = <XCircle className="w-3.5 h-3.5 text-red-600" />; bg = 'bg-red-100'; ring = 'ring-red-500'; text = 'text-red-600'; doubleBorder = 'border-red-50'; }

  return { icon, bg, ring, text, doubleBorder };
};
