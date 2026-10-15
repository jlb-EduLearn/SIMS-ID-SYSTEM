import { getSession } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Palette, Printer, Building2, Calendar, Layers } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WorkflowTip } from "@/components/layout/workflow-tip";

export default async function DashboardPage() {
  const session = await getSession();
  const schoolId = session?.user?.currentSchoolId;
  const schoolYearId = session?.user?.currentSchoolYearId;

  let stats = {
    students: 0,
    templates: 0,
    sections: 0,
    unassignedStudents: 0,
    schoolName: session?.user?.currentSchoolName || "",
    schoolYearName: session?.user?.currentSchoolYearName || "",
  };

  if (schoolId && schoolYearId) {
    const [studentCount, templateCount, sectionCount, unassignedStudents] =
      await Promise.all([
        prisma.student.count({
          where: {
            schoolId,
            schoolYearId,
            isActive: true,
            recordType: "STUDENT",
          },
        }),
        prisma.idTemplate.count({ where: { schoolId, isActive: true } }),
        prisma.gradeSection.count({
          where: { schoolId, schoolYearId, isActive: true },
        }),
        prisma.student.count({
          where: {
            schoolId,
            schoolYearId,
            recordType: "STUDENT",
            isActive: true,
            OR: [{ section: null }, { section: "" }],
          },
        }),
      ]);
    stats = {
      students: studentCount,
      templates: templateCount,
      sections: sectionCount,
      unassignedStudents,
      schoolName: session!.user.currentSchoolName || "",
      schoolYearName: session!.user.currentSchoolYearName || "",
    };
  } else if (schoolId) {
    const templateCount = await prisma.idTemplate.count({
      where: { schoolId, isActive: true },
    });
    stats = {
      ...stats,
      templates: templateCount,
      schoolName: session!.user.currentSchoolName || "",
    };
  }

  const enrollmentComplete =
    stats.students > 0 &&
    stats.sections > 0 &&
    stats.unassignedStudents === 0;

  const workflowSteps = [
    {
      step: 1,
      title: "Select school",
      description: "Pick the school you're working with",
      done: !!schoolId,
      href: "/select-school",
    },
    {
      step: 2,
      title: "Manage school years",
      description: "Create or switch the active year",
      done: !!schoolYearId,
      href: "/select-school-year",
    },
    {
      step: 3,
      title: "Set up sections",
      description: "Grade levels and section names",
      done: stats.sections > 0,
      href: "/dashboard/students",
    },
    {
      step: 4,
      title: "Add students",
      description: "Add or import student records",
      done: stats.students > 0,
      href: "/dashboard/students",
    },
    {
      step: 5,
      title: "Enroll by section",
      description: "Assign students to sections",
      done: enrollmentComplete,
      href: "/dashboard/students?view=enroll",
    },
    {
      step: 6,
      title: "Design template",
      description: "Portrait or landscape ID layout",
      done: stats.templates > 0,
      href: "/dashboard/templates",
    },
    {
      step: 7,
      title: "Print IDs",
      description: "Generate cards and log prints",
      done: false,
      href: "/dashboard/print",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          {stats.schoolName} ·{" "}
          <span className="font-medium text-foreground">
            {stats.schoolYearName || "No year selected"}
          </span>
        </p>
      </div>

      {schoolYearId && stats.unassignedStudents > 0 && (
        <WorkflowTip title="Enrollment still in progress">
          <p>
            <strong>{stats.unassignedStudents}</strong> student
            {stats.unassignedStudents !== 1 ? "s" : ""} in this year do not have
            a section yet.{" "}
            <Link
              href="/dashboard/students?view=enroll"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Open Section Enrollment
            </Link>{" "}
            to assign them, or import/add records on Students first.
          </p>
        </WorkflowTip>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.students}</div>
            <p className="text-xs text-muted-foreground">This school year</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sections</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sections}</div>
            <p className="text-xs text-muted-foreground">
              {stats.unassignedStudents > 0
                ? `${stats.unassignedStudents} unassigned`
                : "All assigned"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Templates</CardTitle>
            <Palette className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.templates}</div>
            <p className="text-xs text-muted-foreground">This school only</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">School year</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold leading-tight">
              {stats.schoolYearName || "—"}
            </div>
            <Link
              href="/select-school-year"
              className="text-xs text-primary underline-offset-2 hover:underline"
            >
              Manage years
            </Link>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Organization</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="truncate text-sm font-semibold">
              {session?.user?.organizationName}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Print</CardTitle>
            <Printer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/dashboard/print">
              <Button size="sm" className="w-full">
                Print IDs
              </Button>
            </Link>
            <Link
              href="/dashboard/print-logs"
              className="block text-center text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
            >
              Print logs
            </Link>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Recommended workflow</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Follow these steps at the start of each school year. Student records
          are always scoped to the active year shown in the sidebar.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {workflowSteps.map((step) => (
            <Link key={step.step} href={step.href}>
              <Card
                className={`h-full border-0 shadow-sm transition-shadow hover:shadow-md ${
                  step.done ? "bg-primary/5 ring-1 ring-primary/20" : ""
                }`}
              >
                <CardContent className="pt-6">
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        step.done
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {step.step}
                    </span>
                    <h3 className="font-semibold leading-tight">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
