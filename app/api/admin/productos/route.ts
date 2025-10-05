// app/api/admin/productos/route.ts
export const runtime = "edge";

// Alias en español que reexporta los handlers reales
export { GET, POST, PUT, OPTIONS } from "../products/route";
