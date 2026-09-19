export const PAGE_SIZES = [10, 20, 50, 100];

export function paginate(items, requestedPage = 1, requestedSize = 20) {
  const size = PAGE_SIZES.includes(Number(requestedSize))
    ? Number(requestedSize)
    : 20;
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(pages, Math.max(1, Number(requestedPage) || 1));
  const offset = (page - 1) * size;
  return {
    items: items.slice(offset, offset + size),
    page,
    size,
    total,
    pages,
    start: total ? offset + 1 : 0,
    end: Math.min(offset + size, total),
  };
}

export function pageTokens(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1);
  const wanted = new Set([1, pages, page - 1, page, page + 1]);
  const numbers = [...wanted]
    .filter((value) => value >= 1 && value <= pages)
    .sort((a, b) => a - b);
  const tokens = [];
  for (const number of numbers) {
    if (tokens.length && number - tokens.at(-1) > 1) tokens.push("…");
    tokens.push(number);
  }
  return tokens;
}
