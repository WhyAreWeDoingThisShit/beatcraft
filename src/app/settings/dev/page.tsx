import { redirect } from "next/navigation";
import { SeedPanel } from "./_components/seed-panel";

export default function DevPage() {
  if (process.env.NODE_ENV !== "development") {
    redirect("/");
  }

  return <SeedPanel />;
}
