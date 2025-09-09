export function r2KeyForProductImage(productId: string, fileName: string) {
  const safe = fileName.replace(/[^a-z0-9_.-]/gi, '-').toLowerCase();
  return `products/${productId}/${Date.now()}-${safe}`;
}
