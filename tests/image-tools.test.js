import test from "node:test";
import assert from "node:assert/strict";
import { optimizedImageName, scaledImageSize } from "../public/image-tools.js";

test("large photos are resized proportionally while small photos stay unchanged", () => {
  assert.deepEqual(scaledImageSize(4000, 3000), { width: 2000, height: 1500 });
  assert.deepEqual(scaledImageSize(1200, 800), { width: 1200, height: 800 });
});

test("optimized image filenames use the encoded image format", () => {
  assert.equal(optimizedImageName("family.photo.JPG", "image/webp"), "family.photo.webp");
});
