import { StatementParseError } from "./types";

/** One run of text on a PDF page, in PDF units (origin bottom-left). */
export interface PdfItem {
  str: string;
  x: number;
  y: number;
  /** Right edge (x + width) */
  right: number;
  height: number;
}

export interface PdfLine {
  y: number;
  items: PdfItem[];
  text: string;
}

export interface PdfPage {
  lines: PdfLine[];
  text: string;
}

type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
let pdfjsPromise: Promise<PdfJs> | null = null;

/** pdf.js in Node: run the worker in-process (no worker thread, nothing fetched). */
async function loadPdfJs(): Promise<PdfJs> {
  pdfjsPromise ??= (async () => {
    const worker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
    (globalThis as unknown as { pdfjsWorker: unknown }).pdfjsWorker = worker;
    return import("pdfjs-dist/legacy/build/pdf.mjs");
  })();
  return pdfjsPromise;
}

/**
 * Text of every page, grouped into lines. The password is used in memory only: never
 * stored or logged. Rotated or oversized text (watermarks) is dropped.
 */
export async function readPdfLines(data: Uint8Array, password?: string): Promise<PdfPage[]> {
  const pdfjs = await loadPdfJs();
  const task = pdfjs.getDocument({
    data: new Uint8Array(data), // pdf.js takes ownership of the buffer
    password: password || undefined,
    disableFontFace: true,
    useSystemFonts: false,
    verbosity: 0,
  });
  let doc;
  try {
    doc = await task.promise;
  } catch (error) {
    const e = error as { name?: string; code?: number };
    await task.destroy().catch(() => {});
    if (e?.name === "PasswordException") {
      throw e.code === 2
        ? new StatementParseError("That password didn't open the PDF.", "WRONG_PASSWORD")
        : new StatementParseError("This PDF is password protected.", "NEEDS_PASSWORD");
    }
    throw new StatementParseError("This file couldn't be read as a PDF.", "UNREADABLE");
  }

  try {
    const pages: PdfPage[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const raw: PdfItem[] = [];
      for (const item of content.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        const [a, b, c, d, e, f] = item.transform as number[];
        // Watermarks are rotated; real table text isn't
        if (Math.abs(b) > 0.01 || Math.abs(c) > 0.01) continue;
        raw.push({ str: item.str, x: e, y: f, right: e + item.width, height: Math.abs(d) || Math.abs(a) });
      }
      // Drop text much larger than the body text (big diagonal-free watermarks, logos)
      const heights = raw.map((i) => i.height).sort((x, y) => x - y);
      const median = heights[Math.floor(heights.length / 2)] ?? 0;
      const items = median > 0 ? raw.filter((i) => i.height <= median * 2.5) : raw;
      const lines = groupLines(items);
      pages.push({ lines, text: lines.map((l) => l.text).join("\n") });
      page.cleanup();
    }
    return pages;
  } finally {
    await task.destroy();
  }
}

/** Items within ~40% of a line height of each other share a line; lines run top to bottom. */
export function groupLines(items: PdfItem[]): PdfLine[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: PdfLine[] = [];
  for (const item of sorted) {
    const tolerance = Math.max(2, item.height * 0.4);
    const line = lines.find((l) => Math.abs(l.y - item.y) <= tolerance);
    if (line) line.items.push(item);
    else lines.push({ y: item.y, items: [item], text: "" });
  }
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
    line.text = line.items.map((i) => i.str.trim()).join(" ");
  }
  return lines.sort((a, b) => b.y - a.y);
}
