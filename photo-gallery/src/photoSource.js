// Picsum remains the default unless mock mode is explicitly selected.
export function photoPageUrl(page) {
  const source = import.meta.env.VITE_PHOTO_SOURCE || "picsum";
  if (source === "picsum") return `https://picsum.photos/v2/list?page=${page}`;
  if (source === "mock") {
    const filename = page <= 3 ? `page-${page}.json` : "empty.json";
    return `${import.meta.env.BASE_URL}mock/${filename}`;
  }
  throw new Error('Invalid VITE_PHOTO_SOURCE. Use "picsum" or "mock".');
}
