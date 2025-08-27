export const siteName  = process.env.SITE_NAME  || "Zona Natural";
export const siteUrl   = (process.env.SITE_URL  || "http://localhost:3000").replace(/\/$/, "");
export const currency  = process.env.CURRENCY   || "ARS";