export const MAX_REVIEW_IMAGES = 5;

export function getReviewImages(review) {
  const raw = review?.imageUrls;
  // Keep server dictionary keys intact; older read-only responses may contain an array.
  const entries = Array.isArray(raw) ? raw.map((url, index) => [`image${index + 1}`, url])
    : raw && typeof raw === "object" ? Object.entries(raw)
      : review?.imageUrl ? [["image1", review.imageUrl]] : [];
  return entries.filter(([, url]) => typeof url === "string" && url.trim())
    .map(([key, url]) => ({ key, url: url.trim(), status: "ready" }));
}

export function reviewImageMap(images) {
  return Object.fromEntries(images.filter((image) => image.status === "ready" && image.url)
    .map((image) => [image.key, image.url]));
}

export function reviewImagePatch(original, images) {
  const next = reviewImageMap(images);
  return Object.fromEntries([
    ...original.filter((image) => !Object.hasOwn(next, image.key)).map((image) => [image.key, null]),
    ...Object.entries(next).filter(([key, url]) => !original.some((image) => image.key === key && image.url === url)),
  ]);
}
