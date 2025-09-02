export type CurrentUser = { id: string; email: string } | null;
export async function getCurrentUser(): Promise<CurrentUser> {
  // TODO: implementar con cookies/JWT. Por ahora, null.
  return null;
}