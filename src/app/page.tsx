import { redirect } from "next/navigation";
import { getSession } from "@/lib/api-auth";

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    if (session.user.role === "SCANNER") {
      redirect("/scanner");
    }
    if (!session.user.currentSchoolId) {
      redirect("/select-school");
    }
    if (!session.user.currentSchoolYearId) {
      redirect("/select-school-year");
    }
    redirect("/dashboard");
  }
  redirect("/login");
}
