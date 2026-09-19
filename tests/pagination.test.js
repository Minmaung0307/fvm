import test from "node:test";
import assert from "node:assert/strict";
import { paginate, pageTokens } from "../public/pagination.js";

test("pagination defaults to 20 and clamps pages after filtering", () => {
  const items = Array.from({ length: 47 }, (_, index) => index + 1);
  const second = paginate(items, 2, 20);
  assert.deepEqual(second.items, items.slice(20, 40));
  assert.deepEqual(
    { page: second.page, pages: second.pages, start: second.start, end: second.end },
    { page: 2, pages: 3, start: 21, end: 40 },
  );
  const filtered = paginate(items.slice(0, 4), 99, 20);
  assert.equal(filtered.page, 1);
  assert.equal(filtered.end, 4);
});

test("pagination supports approved sizes and compact page tokens", () => {
  assert.equal(paginate(Array(101), 1, 50).pages, 3);
  assert.equal(paginate(Array(101), 1, 17).size, 20);
  assert.deepEqual(pageTokens(5, 10), [1, "…", 4, 5, 6, "…", 10]);
});
