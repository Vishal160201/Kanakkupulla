import prisma from "@/lib/prisma";
import { DEMO_OWNER_ID } from "./mode";

/**
 * Sample data for the demo site, built through the app's own APIs (as the demo owner) so numbering,
 * stock, dues and the ledger come out exactly as if someone had typed it all in. Dates are relative
 * to today, so the demo always looks current. Every name is made up; every phone number starts with
 * 555, which no Indian mobile number does, so a WhatsApp or SMS button can't reach a real person.
 */

type Json = Record<string, unknown>;

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
/** yyyy-mm-dd in India, `offset` days from today. */
export function demoDay(offset = 0, now = new Date()): string {
  const d = new Date(now.getTime() + IST_OFFSET_MS + offset * 86_400_000);
  return d.toISOString().slice(0, 10);
}
/** Midday in India on that day, as ISO (what the ledger forms send). */
const isoAt = (offset: number) => `${demoDay(offset)}T06:30:00.000Z`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "28 Oct 2026" (TIC Fiber portal dates). */
const ticDate = (offset: number) => {
  const [y, m, d] = demoDay(offset).split("-");
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
};
/** "20-02-2019 15:43:40" (TCCL portal dates). */
const tcclDate = (offset: number) => {
  const [y, m, d] = demoDay(offset).split("-");
  return `${d}-${m}-${y} 10:15:00`;
};
const phone = (n: number) => `55500${String(10000 + n).slice(-5)}`;

class Api {
  calls = 0;
  constructor(private origin: string, private cookie: string) {}
  async send<T = Json>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
    this.calls++;
    const res = await fetch(`${this.origin}${path}`, {
      method,
      headers: { cookie: this.cookie, "content-type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      redirect: "manual",
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
    return (text ? JSON.parse(text) : {}) as T;
  }
  post = <T = Json>(path: string, body: unknown, headers?: Record<string, string>) => this.send<T>("POST", path, body, headers);
  put = <T = Json>(path: string, body: unknown) => this.send<T>("PUT", path, body);
  patch = <T = Json>(path: string, body: unknown) => this.send<T>("PATCH", path, body);
  get = <T = Json>(path: string) => this.send<T>("GET", path);
}

/** Admin and Staff roles (normally written by migration 06, which the wipe clears). */
async function ensureRoles() {
  const roles = [
    {
      id: "role_admin", key: "ADMIN", name: "Admin", description: "Runs a shop: can manage everything in the shops they are assigned to.",
      permissions: { dashboard: "VIEW", bookings: "MANAGE", albums: "MANAGE", gifts: "MANAGE", analytics: "MANAGE", ledger: "MANAGE", inventory: "MANAGE", recycle_bin: "MANAGE" },
    },
    {
      id: "role_staff", key: "STAFF", name: "Staff", description: "Day-to-day work in the shops they are assigned to.",
      permissions: { dashboard: "VIEW", bookings: "MANAGE", albums: "VIEW", gifts: "MANAGE", analytics: "NONE", ledger: "MANAGE", inventory: "MANAGE", recycle_bin: "NONE" },
    },
  ];
  for (const r of roles) await prisma.accessRole.upsert({ where: { id: r.id }, update: {}, create: { ...r, notifications: {} } });
}

// ---------------------------------------------------------------------------
// Studio
// ---------------------------------------------------------------------------

interface BookingSeed {
  client: string;
  category: string;
  day: number;
  time: string;
  location: string;
  status: "Pending" | "Confirmed" | "Shoot Completed" | "Cancelled";
  pkg: number;
  advances: { amount: number; day: number; mode: string }[];
  packageName?: string;
  album?: { status: string; progress: string };
  invoice?: boolean;
}

const BOOKINGS: BookingSeed[] = [
  { client: "Karthik & Divya", category: "Wedding", day: -52, time: "06:00 AM", location: "Sri Murugan Mahal, Erode", status: "Shoot Completed", pkg: 125000, packageName: "Gold wedding", advances: [{ amount: 40000, day: -90, mode: "Bank Transfer" }, { amount: 60000, day: -50, mode: "UPI" }], album: { status: "Delivered", progress: "100" }, invoice: true },
  { client: "Priya Sundar", category: "Maternity", day: -40, time: "04:30 PM", location: "Studio floor", status: "Shoot Completed", pkg: 18000, advances: [{ amount: 18000, day: -40, mode: "UPI" }], album: { status: "Ready for delivery", progress: "90" }, invoice: true },
  { client: "Arun & Meena", category: "Pre-Wedding", day: -33, time: "05:30 AM", location: "Bhavani river bank", status: "Shoot Completed", pkg: 35000, advances: [{ amount: 15000, day: -45, mode: "Cash" }], album: { status: "Sent for printing", progress: "70" } },
  { client: "Lakshmi Textiles", category: "Corporate", day: -26, time: "10:00 AM", location: "Lakshmi Textiles showroom", status: "Shoot Completed", pkg: 22000, advances: [{ amount: 10000, day: -30, mode: "Bank Transfer" }, { amount: 12000, day: -20, mode: "Bank Transfer" }], album: { status: "Delivered", progress: "100" }, invoice: true },
  { client: "Baby Aadhira", category: "Baby & Kids", day: -18, time: "11:00 AM", location: "Studio floor", status: "Shoot Completed", pkg: 9500, advances: [{ amount: 5000, day: -18, mode: "UPI" }], album: { status: "Designing", progress: "40" } },
  { client: "Vignesh & Kavya", category: "Wedding", day: -9, time: "07:00 AM", location: "Kongu Kalyana Mandapam, Gobi", status: "Shoot Completed", pkg: 95000, packageName: "Silver wedding", advances: [{ amount: 30000, day: -60, mode: "Bank Transfer" }, { amount: 30000, day: -10, mode: "UPI" }], album: { status: "Pending", progress: "0" } },
  { client: "Sathish Kumar", category: "Fashion", day: -4, time: "03:00 PM", location: "Studio floor", status: "Confirmed", pkg: 12000, advances: [{ amount: 4000, day: -12, mode: "UPI" }] },
  { client: "Nandhini & Ravi", category: "Wedding", day: -2, time: "06:30 AM", location: "Annai Mahal, Perundurai", status: "Cancelled", pkg: 85000, advances: [] },
  { client: "Dr. Rajesh Clinic", category: "Corporate", day: 1, time: "09:30 AM", location: "Rajesh Clinic, Brough Road", status: "Confirmed", pkg: 15000, advances: [{ amount: 5000, day: -6, mode: "Cash" }] },
  { client: "Harini Birthday", category: "Baby & Kids", day: 3, time: "05:00 PM", location: "Grand Residency hall", status: "Confirmed", pkg: 14000, advances: [] },
  { client: "Gokul & Swetha", category: "Wedding", day: 12, time: "05:00 AM", location: "Velavan Thirumana Mandapam, Salem", status: "Confirmed", pkg: 150000, packageName: "Platinum wedding", advances: [{ amount: 50000, day: -35, mode: "Bank Transfer" }] },
  { client: "Anitha Prakash", category: "Maternity", day: 18, time: "04:00 PM", location: "Studio floor", status: "Pending", pkg: 16000, advances: [] },
  { client: "Manoj & Deepa", category: "Pre-Wedding", day: 26, time: "06:00 AM", location: "Kodiveri dam", status: "Confirmed", pkg: 40000, advances: [{ amount: 20000, day: -3, mode: "UPI" }] },
  { client: "Sri Vinayaga Traders", category: "Corporate", day: 41, time: "11:00 AM", location: "Sri Vinayaga Traders, Market Road", status: "Pending", pkg: 25000, advances: [] },
];

async function seedStudio(api: Api, shopId: string) {
  let n = 1;
  let invoiceNo = 1;
  for (const b of BOOKINGS) {
    const client = await api.post<{ id: string }>("/api/clients", { name: b.client, phone: phone(n++), email: "" });
    const booking = await api.post<{ id: string; bookingNumber: string | null }>("/api/bookings", {
      clientId: client.id, category: b.category, date: demoDay(b.day), time: b.time, location: b.location,
      status: b.status === "Shoot Completed" ? "Confirmed" : b.status,
    });
    const advance = b.advances.reduce((s, a) => s + a.amount, 0);
    await api.post("/api/orders", { bookingId: booking.id, packageAmount: b.pkg, advanceAmount: advance, dueAmount: Math.max(0, b.pkg - advance) });
    for (const a of b.advances) {
      await api.post("/api/transactions", {
        amount: a.amount, type: "INCOME", category: "BOOKING", paymentMode: a.mode, bookingId: booking.id,
        description: `Advance Payment for Booking ${booking.bookingNumber ?? `#${booking.id}`} - ${b.client}`,
        date: isoAt(a.day), recordDate: isoAt(a.day),
      });
    }
    if (b.packageName) await api.put(`/api/bookings/${booking.id}`, { packageName: b.packageName });
    if (b.status === "Shoot Completed") {
      await api.patch(`/api/bookings/${booking.id}/status`, {
        status: "Shoot Completed",
        customData: { fld_b_album_status: b.album?.status ?? "Pending", album_progress: b.album?.progress ?? "0", fld_b_album_type: b.pkg > 50000 ? "Premium" : "Standard" },
      });
    }
    if (b.invoice) {
      await prisma.invoice.create({
        data: {
          bookingId: booking.id, invoiceNumber: `INV-${String(invoiceNo++).padStart(4, "0")}`, discount: 0,
          lineItems: { create: [{ description: `${b.category} Package`, quantity: 1, rate: b.pkg, amount: b.pkg }] },
        },
      });
    }
  }

  // Walk-in counter work and running costs
  const ledger: { type: "INCOME" | "EXPENSE"; category: string; amount: number; day: number; mode: string; description: string }[] = [];
  const counter = [
    ["Passport Photo", 120, "Cash", "Passport photos, 8 copies"],
    ["Printout", 60, "Cash", "Colour printouts"],
    ["Xerox", 40, "Cash", "Xerox, 20 pages"],
    ["Frame Sales", 850, "UPI", "12x18 frame"],
    ["Editing Charges", 1500, "UPI", "Photo restoration"],
    ["E-Sevai", 200, "Cash", "Online application"],
  ] as const;
  for (let d = -27; d <= 0; d++) {
    const pick = counter[(d + 30) % counter.length];
    const pick2 = counter[(d + 33) % counter.length];
    ledger.push({ type: "INCOME", category: pick[0], amount: pick[1] * (1 + ((d + 30) % 3)), day: d, mode: pick[2], description: pick[3] });
    if (d % 2 === 0) ledger.push({ type: "INCOME", category: pick2[0], amount: pick2[1], day: d, mode: pick2[2], description: pick2[3] });
    if (d % 3 === 0) ledger.push({ type: "EXPENSE", category: "Tea & snacks", amount: 90, day: d, mode: "Cash", description: "Tea for the team" });
  }
  ledger.push(
    { type: "EXPENSE", category: "Salary", amount: 12000, day: -14, mode: "Bank Transfer", description: "Assistant photographer salary" },
    { type: "EXPENSE", category: "Salary", amount: 9000, day: -14, mode: "Bank Transfer", description: "Editor salary" },
    { type: "EXPENSE", category: "Equipment Rent", amount: 3500, day: -9, mode: "UPI", description: "Drone for wedding" },
    { type: "EXPENSE", category: "Travel", amount: 1800, day: -9, mode: "Cash", description: "Car to Gobi" },
    { type: "EXPENSE", category: "Album Payment", amount: 6500, day: -20, mode: "UPI", description: "Album printing lab" },
    { type: "INCOME", category: "Photography Session", amount: 3000, day: -5, mode: "UPI", description: "Family portrait session" },
  );
  for (const t of ledger) {
    await api.post("/api/transactions", { shopId, amount: t.amount, type: t.type, category: t.category, paymentMode: t.mode, description: t.description, date: isoAt(t.day), recordDate: isoAt(t.day) });
  }
}

async function seedGifts(api: Api) {
  await api.get("/api/gifts/products");
  const orders: { productId: string; client: string; qty: number; amount: number; advance: number; due: number; day: number; status: "PENDING" | "PROCESSING" | "READY" | "DELIVERED"; mode: string; custom?: Json }[] = [
    { productId: "photoframe", client: "Revathi M", qty: 1, amount: 1200, advance: 500, due: 3, day: -3, status: "PROCESSING", mode: "UPI", custom: { fld_g_size: "12x18" } },
    { productId: "mug-print", client: "Suresh Babu", qty: 4, amount: 1000, advance: 1000, due: 1, day: -2, status: "READY", mode: "Cash" },
    { productId: "invitation", client: "Kavin & Abi", qty: 300, amount: 9000, advance: 4000, due: 6, day: -1, status: "PENDING", mode: "Bank Transfer", custom: { fld_g_event: "Wedding" } },
    { productId: "keychain", client: "Mohan Raj", qty: 10, amount: 1500, advance: 1500, due: 0, day: -8, status: "DELIVERED", mode: "UPI" },
    { productId: "backlight-photo", client: "Selvi Stores", qty: 1, amount: 3500, advance: 1500, due: 2, day: -6, status: "PROCESSING", mode: "Cash" },
    { productId: "visiting-card", client: "Ganesh Electricals", qty: 500, amount: 1200, advance: 600, due: -1, day: -5, status: "DELIVERED", mode: "UPI" },
    { productId: "lamination", client: "Pooja R", qty: 3, amount: 150, advance: 150, due: 0, day: 0, status: "PENDING", mode: "Cash" },
  ];
  let n = 40;
  for (const o of orders) {
    const res = await api.post<{ order: { id: string; orderNumber?: string } }>("/api/gifts/orders", {
      productId: o.productId, clientName: o.client, clientPhone: phone(n++), quantity: o.qty, amount: o.amount,
      advanceAmount: o.advance, dueAmount: o.amount - o.advance, dueDate: demoDay(o.due), paymentMode: o.mode,
      createTransaction: true, customData: o.custom ?? {}, recordDate: isoAt(o.day), advanceDate: isoAt(o.day),
    });
    const id = res.order.id;
    if (o.status === "DELIVERED" && o.amount > o.advance) {
      await api.post("/api/transactions", {
        amount: o.amount - o.advance, type: "INCOME", date: isoAt(Math.min(0, o.day + 3)), category: "GIFTS_AND_FRAMES", paymentMode: "Cash",
        status: "SETTLED", description: `Due Collection for Order ${res.order.orderNumber ?? ""}`.trim(), productOrderId: id,
      });
    }
    if (o.status !== "PENDING") await api.patch(`/api/gifts/orders/${id}`, { status: o.status, ...(o.status === "DELIVERED" ? { discountAmount: 0 } : {}) });
  }
}

// ---------------------------------------------------------------------------
// Fertilizer shop: stock, farmers' credit, produce
// ---------------------------------------------------------------------------

async function seedFertilizer(api: Api, shopId: string) {
  const products: { name: string; unit: string; packSize?: number; packUnit?: string; price: number; buy: number; qty: number }[] = [
    { name: "Urea", unit: "Bag", packSize: 45, packUnit: "kg", price: 270, buy: 242, qty: 120 },
    { name: "DAP", unit: "Bag", packSize: 50, packUnit: "kg", price: 1350, buy: 1250, qty: 60 },
    { name: "Potash (MOP)", unit: "Bag", packSize: 50, packUnit: "kg", price: 1700, buy: 1580, qty: 40 },
    { name: "Complex 20-20-0", unit: "Bag", packSize: 50, packUnit: "kg", price: 1250, buy: 1150, qty: 50 },
    { name: "Zinc sulphate", unit: "Packet", packSize: 5, packUnit: "kg", price: 320, buy: 270, qty: 30 },
    { name: "Neem oil", unit: "Bottle", packSize: 1, packUnit: "L", price: 450, buy: 360, qty: 24 },
    { name: "Imidacloprid", unit: "Bottle", packSize: 250, packUnit: "ml", price: 380, buy: 300, qty: 36 },
    { name: "Hybrid maize seed", unit: "Packet", packSize: 4, packUnit: "kg", price: 1650, buy: 1480, qty: 25 },
  ];
  const ids: string[] = [];
  for (const p of products) {
    const res = await api.post<{ product: { id: string } }>("/api/inventory/products", { shopId, name: p.name, unit: p.unit, packSize: p.packSize, packUnit: p.packUnit, price: p.price });
    ids.push(res.product.id);
  }
  // Stock comes in on two lorries
  await api.post("/api/inventory/bills", { shopId, kind: "PURCHASE", date: demoDay(-35), paymentMode: "Bank Transfer", supplierName: "Kaveri Agro Distributors", lines: products.slice(0, 4).map((p, i) => ({ productId: ids[i], quantity: p.qty, unitPrice: p.buy })) });
  await api.post("/api/inventory/bills", { shopId, kind: "PURCHASE", date: demoDay(-21), paymentMode: "UPI", supplierName: "Sakthi Crop Care", lines: products.slice(4).map((p, i) => ({ productId: ids[i + 4], quantity: p.qty, unitPrice: p.buy })) });

  const farmers = [
    ["Muthusamy K", "Kavindapadi"], ["Palanisamy R", "Nambiyur"], ["Rangasamy V", "Kodumudi"], ["Saraswathi P", "Chennimalai"],
    ["Kandasamy M", "Anthiyur"], ["Ponnusamy A", "Kavindapadi"], ["Velusamy S", "Nambiyur"],
  ];
  const farmerIds: string[] = [];
  for (let i = 0; i < farmers.length; i++) {
    const res = await api.post<{ customer: { id: string } }>("/api/inventory/customers", { shopId, name: farmers[i][0], phone: phone(70 + i), place: farmers[i][1] });
    farmerIds.push(res.customer.id);
  }
  // Sales: some paid in full, some on credit
  const sales: { farmer: number; day: number; lines: [number, number][]; paid?: number; mode: string }[] = [
    { farmer: 0, day: -30, lines: [[0, 10], [1, 4]], paid: 3000, mode: "Cash" },
    { farmer: 1, day: -27, lines: [[0, 6], [4, 2]], mode: "UPI" },
    { farmer: 2, day: -24, lines: [[1, 6], [2, 3]], paid: 5000, mode: "Cash" },
    { farmer: 3, day: -19, lines: [[5, 2], [6, 2]], mode: "Cash" },
    { farmer: 4, day: -15, lines: [[3, 8], [0, 12]], paid: 6000, mode: "Bank Transfer" },
    { farmer: 5, day: -11, lines: [[7, 2]], mode: "UPI" },
    { farmer: 0, day: -8, lines: [[2, 2], [6, 1]], paid: 0, mode: "Cash" },
    { farmer: 6, day: -5, lines: [[0, 15], [1, 5]], paid: 8000, mode: "Cash" },
    { farmer: 1, day: -2, lines: [[4, 3], [5, 1]], mode: "UPI" },
    { farmer: 3, day: 0, lines: [[7, 1], [6, 2]], paid: 1000, mode: "Cash" },
  ];
  for (const s of sales) {
    await api.post("/api/inventory/bills", {
      shopId, kind: "SALE", date: demoDay(s.day), paymentMode: s.mode, customerId: farmerIds[s.farmer],
      lines: s.lines.map(([p, q]) => ({ productId: ids[p], quantity: q, unitPrice: products[p].price })),
      ...(s.paid !== undefined ? { paidAmount: s.paid } : {}),
    });
  }
  await api.post(`/api/inventory/customers/${farmerIds[0]}/payments`, { amount: 4000, date: demoDay(-12), paymentMode: "Cash", notes: "Part payment" });
  await api.post(`/api/inventory/customers/${farmerIds[2]}/payments`, { amount: 5000, date: demoDay(-6), paymentMode: "UPI" });
  await api.post("/api/inventory/adjustments", { shopId, productId: ids[0], quantity: -2, notes: "Two bags torn while unloading" });

  // Produce: buying crops from farmers and selling to traders
  const paddy = (await api.post<{ item: { id: string } }>("/api/inventory/produce/items", { shopId, name: "Paddy (Ponni)", unit: "quintal" })).item.id;
  const groundnut = (await api.post<{ item: { id: string } }>("/api/inventory/produce/items", { shopId, name: "Groundnut", unit: "kg" })).item.id;
  const collections: [number, string, number, number, number][] = [
    [1, paddy, -28, 18, 2300], [3, paddy, -22, 12, 2350], [4, groundnut, -18, 850, 72], [6, paddy, -14, 25, 2320], [2, groundnut, -9, 600, 74], [5, paddy, -4, 10, 2400],
  ];
  for (const [f, item, day, qty, rate] of collections) {
    await api.post("/api/inventory/produce/collections", { shopId, itemId: item, customerId: farmerIds[f], date: demoDay(day), quantity: qty, rate });
  }
  await api.post(`/api/inventory/produce/farmers/${farmerIds[1]}/payments`, { cashAmount: 30000, date: demoDay(-20), paymentMode: "Bank Transfer" });
  await api.post(`/api/inventory/produce/farmers/${farmerIds[4]}/payments`, { cashAmount: 40000, creditDeducted: 6000, date: demoDay(-10), paymentMode: "Cash", notes: "Fertilizer credit adjusted" });
  await api.post(`/api/inventory/produce/farmers/${farmerIds[3]}/payments`, { cashAmount: 20000, date: demoDay(-7), paymentMode: "UPI" });

  const buyer1 = (await api.post<{ buyer: { id: string } }>("/api/inventory/produce/buyers", { shopId, name: "Annapoorna Rice Mill", phone: phone(90), place: "Erode" })).buyer.id;
  const buyer2 = (await api.post<{ buyer: { id: string } }>("/api/inventory/produce/buyers", { shopId, name: "Sri Balaji Oil Traders", phone: phone(91), place: "Tiruppur" })).buyer.id;
  await api.post("/api/inventory/produce/sales", { shopId, itemId: paddy, buyerId: buyer1, date: demoDay(-16), quantity: 28, rate: 2550, paymentMode: "Bank Transfer" });
  await api.post("/api/inventory/produce/sales", { shopId, itemId: groundnut, buyerId: buyer2, date: demoDay(-6), quantity: 1200, rate: 82, paidAmount: 50000, paymentMode: "Bank Transfer" });
  await api.post("/api/inventory/produce/sales", { shopId, itemId: paddy, buyerId: buyer1, date: demoDay(-2), quantity: 20, rate: 2600, paidAmount: 30000, paymentMode: "UPI" });
  await api.post(`/api/inventory/produce/buyers/${buyer2}/receipts`, { amount: 20000, date: demoDay(-1), paymentMode: "Bank Transfer" });

  const costs: [string, number, number, string][] = [
    ["Transport", 2500, -35, "Lorry from Erode"], ["Loading & Unloading", 1200, -35, "Unloading 274 bags"], ["Transport", 1800, -21, "Mini lorry"],
    ["Shop Rent", 8000, -13, "Monthly rent"], ["Electricity", 1450, -10, "EB bill"], ["Salary", 11000, -13, "Shop assistant salary"],
    ["Labour", 900, -16, "Paddy loading"], ["Tea & snacks", 120, -3, "Tea"], ["Tea & snacks", 150, -1, "Tea and biscuits"],
  ];
  for (const [category, amount, day, description] of costs) {
    await api.post("/api/transactions", { shopId, amount, type: "EXPENSE", category, paymentMode: "Cash", description, date: isoAt(day), recordDate: isoAt(day) });
  }
}

// ---------------------------------------------------------------------------
// Cable & internet
// ---------------------------------------------------------------------------

const AREAS = ["Gandhi Nagar", "Periyar Street", "Market Road", "Bharathi Nagar", "Kamaraj Street", "Anna Nagar"];
const PEOPLE = [
  "Selvaraj P", "Jayanthi K", "Murugesan R", "Kalaiselvi S", "Dinesh Kumar", "Bhuvana M", "Senthil V", "Revathi A", "Prakash N", "Sumathi G",
  "Raja Gopal", "Mahalakshmi T", "Saravanan K", "Kowsalya R", "Vijay Anand", "Shanthi P", "Ashok M", "Geetha S",
];

async function seedCable(api: Api, shopId: string) {
  await api.patch("/api/cable/settings", { shopId, contactPhone: phone(99), lowWalletAlert: 5000, smsLanguage: "ta" });
  const { key } = await api.post<{ key: string }>("/api/cable/sync-key", { shopId });
  const sync = (body: Json) => api.post("/api/cable/sync", body, { authorization: `Bearer ${key}` });

  // Internet (TIC Fiber portal): first sync, then plans get prices, then renewals push expiries on
  const plans = ["Fibre 40 Mbps", "Fibre 100 Mbps", "Fibre 200 Mbps"];
  const tic = (extended: Set<number>) =>
    PEOPLE.slice(0, 11).map((name, i) => {
      const expiry = [-20, -6, -2, 3, 8, 12, 17, 21, 25, -35, 28][i];
      return {
        "User ID": `demo${1001 + i}`, Name: name, Phone: phone(100 + i), Status: i === 9 ? "Inactive" : "Active", Plan: plans[i % 3],
        MACID: `00:1A:2B:3C:4D:${(16 + i).toString(16).toUpperCase()}`, Address: `${10 + i * 3}, ${AREAS[i % AREAS.length]}`, LocationLevel4: AREAS[i % AREAS.length],
        "Create Date": ticDate(-400 + i * 20), "Activation Date": ticDate(-398 + i * 20), "Renewal Date": ticDate(expiry - 30),
        "Expiry Date": ticDate(extended.has(i) ? expiry + 30 : expiry),
      };
    });
  await sync({ provider: "TIC_FIBER", rows: tic(new Set()), wallet: 18450 });
  const { plans: priced } = await api.get<{ plans: { id: string; name: string }[] }>(`/api/cable/plans?shopId=${shopId}`);
  const price: Record<string, number> = { "Fibre 40 Mbps": 499, "Fibre 100 Mbps": 699, "Fibre 200 Mbps": 999 };
  for (const p of priced) if (price[p.name]) await api.patch(`/api/cable/plans/${p.id}`, { price: price[p.name] });
  await sync({ provider: "TIC_FIBER", rows: tic(new Set([1, 2, 4, 6])), wallet: 15620 });

  // Cable TV (TCCL portal): bills and payments so far become each house's opening due
  const tccl = PEOPLE.slice(7).map((name, i) => ({
    account_number: `DEMO${50001 + i}`, customer_name: name, mobile_no: phone(130 + i), "STB Status": i === 6 ? "Deactive" : "Active",
    serial_number: `SN${770000 + i}`, vc_number: `VC${880000 + i}`, installation_address: `${4 + i * 2}, ${AREAS[(i + 2) % AREAS.length]}`, city: "Erode",
    Created_Date: tcclDate(-900 + i * 40), installation_date: tcclDate(-899 + i * 40),
    total_bill_amount: String(5400 + i * 250), total_paid_amount: String(5400 + i * 250 - [0, 250, 500, 250, 0, 750, 0, 500, 250, 0, 500][i]),
  }));
  await sync({ provider: "TCCL", rows: tccl, wallet: 9200 });

  const { subscribers } = await api.get<{ subscribers: { id: string; externalId: string; due: number | string }[] }>(`/api/cable/subscribers?shopId=${shopId}`);
  const withDue = subscribers.filter((s) => Number(s.due) > 0);
  for (const [i, s] of withDue.slice(0, 5).entries()) {
    const amount = i % 2 === 0 ? Number(s.due) : Math.round(Number(s.due) / 2);
    await api.post(`/api/cable/subscribers/${s.id}/payments`, { amount, date: demoDay(-i), paymentMode: i % 2 === 0 ? "UPI" : "Cash" });
  }
  const issues = ["No internet since morning", "Slow speed in the evening", "Set-top box shows no signal", "Router light blinking red"];
  for (const [i, issue] of issues.entries()) {
    const sub = subscribers[(i * 4 + 1) % subscribers.length];
    const c = await api.post<{ complaint?: { id: string }; id?: string }>(`/api/cable/subscribers/${sub.id}/complaints`, { issue, notes: i === 2 ? "Check the cable at the junction box" : undefined });
    const id = c.complaint?.id ?? c.id;
    if (id && i === 3) await api.patch(`/api/cable/complaints/${id}`, { fixed: true, notes: "Replaced the adapter" });
  }

  const costs: [string, number, number, string][] = [
    ["Wallet Top-up", 15000, -18, "TIC Fiber wallet"], ["Pole Rent", 2400, -12, "EB pole rent"], ["Line Staff Salary", 10000, -13, "Line man salary"],
    ["Fibre & Repair", 1800, -7, "Fibre splicing, Market Road"], ["Electricity", 900, -9, "Node power"], ["Shop Rent", 5000, -13, "Office rent"],
  ];
  for (const [category, amount, day, description] of costs) {
    await api.post("/api/transactions", { shopId, amount, type: "EXPENSE", category, paymentMode: "Cash", description, date: isoAt(day), recordDate: isoAt(day) });
  }
}

// ---------------------------------------------------------------------------

export async function seedDemo(origin: string, cookie: string): Promise<Record<string, number>> {
  const api = new Api(origin, cookie);
  await ensureRoles();

  const studio = (await api.post<{ shop: { id: string } }>("/api/shops", { name: "Lumina Studio", type: "STUDIO", color: "#6366f1", icon: "camera", isDefault: true })).shop.id;
  const agro = (await api.post<{ shop: { id: string } }>("/api/shops", { name: "Green Field Agro", type: "FERTILIZER", color: "#10b981", icon: "plant" })).shop.id;
  const cable = (await api.post<{ shop: { id: string } }>("/api/shops", { name: "Star Cable & Net", type: "CABLE", color: "#f97316", icon: "broadcast" })).shop.id;

  await api.post("/api/users", { name: "Ramya (Studio)", email: "ramya@demo.kanakkupulla.app", phone: phone(1), isOwner: false, assignments: [{ shopId: studio, roleId: "role_admin" }] });
  await api.post("/api/users", { name: "Bala (Agro)", email: "bala@demo.kanakkupulla.app", phone: phone(2), isOwner: false, assignments: [{ shopId: agro, roleId: "role_staff" }] });
  await api.post("/api/users", { name: "Kumar (Cable)", email: "kumar@demo.kanakkupulla.app", phone: phone(3), isOwner: false, assignments: [{ shopId: cable, roleId: "role_staff" }] });

  // Shops are independent, so build them side by side; within a shop, calls stay in order
  await Promise.all([seedStudio(api, studio).then(() => seedGifts(api)), seedFertilizer(api, agro), seedCable(api, cable)]);

  // Alerts for the bell, from the app's own reminder jobs
  const secret = process.env.CRON_SECRET;
  if (secret) {
    for (const job of ["reminders", "daily-reminders"]) await api.send("GET", `/api/cron/${job}`, undefined, { authorization: `Bearer ${secret}` });
  }

  const [bookings, transactions, bills, subscribers, notifications] = await Promise.all([
    prisma.booking.count(), prisma.transaction.count(), prisma.inventoryBill.count(), prisma.cableSubscriber.count(),
    prisma.notification.count({ where: { userId: DEMO_OWNER_ID } }),
  ]);
  return { apiCalls: api.calls, bookings, transactions, bills, subscribers, notifications };
}
