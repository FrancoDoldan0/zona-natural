export function getCsrfTokenFromCookie(): string {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(/(?:^|;\\s*)csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}
