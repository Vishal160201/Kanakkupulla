// Reads the TCCL (Ezybill) customer list with the browser's own login. Runs in the offscreen document.
// Exposed as globalThis.readTccl. Uses parse() and formBody() from ticFiber.js.

const TCCL_BASE = "https://sms.tccl.co.in/index.php";
const TCCL_PAGE = 1000;
const TCCL_MAX_PAGES = 10; // 10,000 customers, the most the sync endpoint takes

// Only what Kanakkupulla uses; ID numbers and family details in the list are never sent
const TCCL_FIELDS = [
  "account_number", "customer_name", "first_name", "last_name", "mobile_no", "city", "pin_code",
  "installation_address", "vc_number", "serial_number", "installation_date", "Created_Date",
  "total_bill_amount", "total_paid_amount", "status",
];

/** Every customer matching the list's default filters plus `over` (all pages). */
async function tcclCustomers(form, over = {}) {
  const rows = [];
  for (let page = 1; page <= TCCL_MAX_PAGES; page++) {
    const body = formBody(form);
    for (const [k, v] of Object.entries(over)) body.set(k, v);
    body.set("page", String(page));
    body.set("rows", String(TCCL_PAGE));
    const res = await fetch(`${TCCL_BASE}/Customeroperations/getCustomerData//`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Requested-With": "XMLHttpRequest" },
      body,
    });
    let data;
    try {
      data = await res.json();
    } catch {
      return null; // logged out: the portal answers with a page, not JSON
    }
    const batch = Array.isArray(data.rows) ? data.rows : [];
    rows.push(...batch);
    if (batch.length < TCCL_PAGE || rows.length >= Number(data.total)) return rows;
  }
  return "TOO_MANY";
}

// The STB list's search form (its defaults); the page builds the form by script, so it isn't in the HTML
const TCCL_BOX_FORM = {
  services: "4", backend_setup_id: "-1", txtCustomerName: "", txtAccountNumber: "", serial_number: "", txtMacAddress: "",
  model: "-1", selStatus: "-1", status1: "", sub_status: "0", stb_type: "-1", stb_status: "0", inst_date: "", customerCity: "-1",
  mobileno: "", lco_customer_id: "", customer_id_type: "", customer_id_number: "", inventory_status: "0", batch_no: "",
  productname: "-1", show_remarks: "2", customer_sla: "0", state_id: "-1", customer_created_from: "", customer_created_to: "",
  csv_download: "0", sbtSearch: "Search",
};

/** Every set-top box of the LCO (STB List → Real Time), all pages; null when logged out. */
async function tcclBoxes() {
  const rows = [];
  for (let page = 1; page <= TCCL_MAX_PAGES; page++) {
    const body = new URLSearchParams({ ...TCCL_BOX_FORM, page: String(page), rows: String(TCCL_PAGE) });
    const res = await fetch(`${TCCL_BASE}/Dasreports/dasStbLocationsnewtheme_listrealtime//`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Requested-With": "XMLHttpRequest" },
      body,
    });
    let data;
    try {
      data = await res.json();
    } catch {
      return null;
    }
    const batch = Array.isArray(data.rows) ? data.rows : [];
    rows.push(...batch);
    if (batch.length < TCCL_PAGE || rows.length >= Number(data.total)) return rows;
  }
  return "TOO_MANY";
}

/** "INR: 64.90 Available Balance" on the dashboard; null when it isn't shown. */
async function tcclWallet() {
  try {
    const html = await (await fetch(`${TCCL_BASE}/Dashboard`, { credentials: "include", cache: "no-store" })).text();
    const m = parse(html).body?.textContent.replace(/\s+/g, " ").match(/INR:\s*(-?[\d,]+(?:\.\d+)?)\s*Available Balance/i);
    return m ? Number(m[1].replace(/,/g, "")) : null;
  } catch {
    return null;
  }
}

async function readTccl() {
  const page = await fetch(`${TCCL_BASE}/Customeroperations/customerList`, { credentials: "include", cache: "no-store" });
  const form = parse(await page.text()).querySelector("#filter_serch_form");
  if (!page.ok || !form) return { error: "LOGGED_OUT" };

  const all = await tcclCustomers(form);
  if (all === null) return { error: "LOGGED_OUT" };
  if (all === "TOO_MANY") return { error: "TOO_MANY" };
  if (all.length === 0) return { error: "EMPTY" };
  // A second pass for customers whose set-top box is active (the list's own STB status filter)
  const active = await tcclCustomers(form, { custstbstatus: "1" });
  if (!Array.isArray(active)) return { error: active === null ? "LOGGED_OUT" : "TOO_MANY" };
  const activeIds = new Set(active.map((r) => String(r.account_number)));

  const rows = all.map((r) => {
    const row = Object.fromEntries(TCCL_FIELDS.map((f) => [f, r[f] == null ? "" : String(r[f])]));
    row["STB Status"] = activeIds.has(String(r.account_number)) ? "Active" : "Deactive";
    return row;
  });

  // Customers the customer list leaves out but whose box the STB list shows under their account.
  // Boxes with no account (the LCO's spare stock) aren't subscribers.
  const boxes = await tcclBoxes();
  if (!Array.isArray(boxes)) return { error: boxes === null ? "LOGGED_OUT" : "TOO_MANY" };
  const listed = new Set(all.map((r) => String(r.account_number)));
  for (const b of boxes) {
    const account = String(b.account_number ?? "").trim();
    if (!/^C\d+$/.test(account) || listed.has(account)) continue;
    listed.add(account);
    const mobile = String(b.mobile ?? "").replace(/^91(?=\d{10}$)/, "");
    // No bill / paid totals here: the server leaves the balance alone until the customer list shows them
    rows.push({
      account_number: account, customer_name: String(b.customer_name ?? "").trim(), first_name: "", last_name: "",
      mobile_no: mobile === "N/A" ? "" : mobile, city: "", pin_code: "", installation_address: String(b.installation_address ?? ""),
      vc_number: String(b.vc_number ?? ""), serial_number: String(b.serial_number ?? ""), installation_date: "", Created_Date: "",
      status: "", "STB Status": b.status === "Active" ? "Active" : "Deactive",
    });
  }
  return { rows, wallet: await tcclWallet() };
}

globalThis.readTccl = readTccl;
