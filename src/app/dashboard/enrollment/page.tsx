import { redirect } from "next/navigation";

export default function EnrollmentRedirectPage() {
  redirect("/dashboard/students?view=enroll");
}
