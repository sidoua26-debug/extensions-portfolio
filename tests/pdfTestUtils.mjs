import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const toUint8 = (data) => {
  if (data instanceof Uint8Array) return Uint8Array.from(data);
  return new Uint8Array(data.slice(0));
};

/**
 * Repository-owned test helper to extract plain text per page from PDF bytes.
 * Uses pdfjs-dist declared in the portfolio's package.json.
 *
 * @param {Uint8Array|Buffer} pdfBytes
 * @param {number[]} pageNumbers 1-indexed page numbers
 * @returns {Promise<Record<number, string>>}
 */
export async function extractPagesText(pdfBytes, pageNumbers) {
  const loadingTask = getDocument({ data: toUint8(pdfBytes), isEvalSupported: false });
  const pdf = await loadingTask.promise;
  const out = {};
  for (const pageNumber of pageNumbers) {
    const page = await pdf.getPage(pageNumber);
    try {
      const text = await page.getTextContent();
      out[pageNumber] = text.items.map((item) => ('str' in item ? item.str : '')).join(' ').trim();
    } finally {
      page.cleanup();
    }
  }
  await loadingTask.destroy();
  return out;
}
