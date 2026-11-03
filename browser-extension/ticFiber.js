// Reads the TIC Fiber partner portal's "Account Profile Wise Report" with the browser's own login.
// Runs in the offscreen document (it needs DOMParser). Exposed as globalThis.readTicFiber.

const REPORT_URL = "https://partner.ticfiber.in/Partner/ProfileWiseReport.aspx";
const PAGE_SIZE = "500";

const parse = (html) => new DOMParser().parseFromString(html, "text/html");
const cellText = (cell) => cell.textContent.replace(/\s+/g, " ").trim();

/** The form's current values, as the page itself would post them (no buttons, so no button action fires). */
function formBody(form) {
  const body = new URLSearchParams();
  for (const el of form.elements) {
    if (!el.name || ["submit", "image", "button", "password", "file", "reset"].includes(el.type)) continue;
    if ((el.type === "checkbox" || el.type === "radio") && !el.checked) continue;
    body.append(el.name, el.value);
  }
  return body;
}

/** Report rows as { column heading: cell text }, plus the grid's control name, or null when the table isn't there. */
function readGrid(doc) {
  const table = doc.querySelector("table[id$='gdCONSSN']");
  if (!table) return null;
  const [head, ...rest] = table.querySelectorAll("tr");
  if (!head) return null;
  const headings = [...head.querySelectorAll("th,td")].map(cellText);
  if (!headings.includes("User ID")) return null;
  const rows = rest
    .map((tr) => [...tr.querySelectorAll(":scope > td")])
    .filter((cells) => cells.length === headings.length)
    .map((cells) => Object.fromEntries(headings.map((h, i) => [h, cellText(cells[i])])));
  return { rows };
}

/** The pager link's postback for page `n` ("Page$3"), when the grid has more pages. */
function pagerTarget(doc, n) {
  for (const a of doc.querySelectorAll("table[id$='gdCONSSN'] a[href*='Page$']")) {
    const m = a.getAttribute("href").match(/__doPostBack\('([^']+)','(Page\$(\d+))'\)/);
    if (m && Number(m[3]) === n) return { target: m[1], argument: m[2] };
  }
  return null;
}

/** "Balance : -18.92" from the portal header; null when it isn't shown. */
function readWallet(doc) {
  const m = doc.body?.textContent.replace(/\s+/g, " ").match(/Balance\s*:\s*(-?[\d,]+(?:\.\d+)?)/i);
  return m ? Number(m[1].replace(/,/g, "")) : null;
}

/** Posts the page's form back with one control's event, as the page itself would. */
async function postBack(doc, target, argument, extra = {}) {
  const body = formBody(doc.querySelector("form"));
  body.set("__EVENTTARGET", target);
  body.set("__EVENTARGUMENT", argument);
  for (const [k, v] of Object.entries(extra)) body.set(k, v);
  const res = await fetch(REPORT_URL, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return parse(await res.text());
}

const MAX_PAGES = 20; // 10,000 subscribers, the most the sync endpoint takes

async function readTicFiber() {
  const first = await fetch(REPORT_URL, { credentials: "include", cache: "no-store" });
  let doc = parse(await first.text());
  const pageSize = doc.querySelector("select[id$='ddlPageSize']");
  // Logged out: the portal sends the login page instead of the report
  if (!first.ok || !doc.querySelector("form") || !pageSize) return { error: "LOGGED_OUT" };
  const wallet = readWallet(doc);

  // Same as picking "500 Records" in the page-size list
  doc = await postBack(doc, pageSize.name, "", { [pageSize.name]: PAGE_SIZE });
  const grid = readGrid(doc);
  if (!grid) return { error: "NO_TABLE" };
  const rows = [...grid.rows];

  // Then click through the pager; a partial list would mark everyone else as removed, so it's all or nothing
  for (let page = 2; ; page++) {
    const next = pagerTarget(doc, page);
    if (!next) break;
    if (page > MAX_PAGES) return { error: "TOO_MANY" };
    doc = await postBack(doc, next.target, next.argument);
    const more = readGrid(doc);
    if (!more) return { error: "NO_TABLE" };
    rows.push(...more.rows);
  }
  if (rows.length === 0) return { error: "EMPTY" };
  return { rows, wallet };
}

globalThis.readTicFiber = readTicFiber;
