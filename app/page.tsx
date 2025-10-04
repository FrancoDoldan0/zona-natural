// app/page.tsx
import { redirect } from "next/navigation";

export const runtime = "edge";

export default function Home() {
  redirect("/landing"); // 308 implícito
}
