import { PrismaClient, StudentCategory } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  createDefaultFrontDesign,
  createDefaultBackDesign,
} from "../src/types/template";

const prisma = new PrismaClient();

const SCHOOL_NAMES = [
  "Riverside Elementary",
  "Oakwood High School",
  "Maple Grove Academy",
  "Sunset Middle School",
  "Pine Valley School",
  "Cedar Hills Academy",
  "Willow Creek Elementary",
  "Brookside High School",
  "Greenfield Academy",
  "Lakeview School",
  "Mountain View Elementary",
  "Harbor City High",
  "Springfield Academy",
  "Westfield School",
  "Northgate Elementary",
  "Southpark High School",
  "Eastside Academy",
  "Central District School",
  "Heritage Elementary",
  "Liberty High School",
  "Summit Academy",
  "Valley View School",
  "Horizon Elementary",
  "Starlight High",
  "Blue Ridge Academy",
  "Golden Gate School",
  "Silver Creek Elementary",
  "Crystal Lake High",
  "Emerald City Academy",
  "Redwood School",
  "Aspen Grove Elementary",
  "Birchwood High",
  "Cherry Blossom Academy",
  "Diamond Valley School",
  "Evergreen Elementary",
  "Fairview High School",
  "Grandview Academy",
  "Highland Park School",
  "Ironwood Elementary",
  "Juniper High",
  "Kingsbridge Academy",
  "Lincoln Park School",
  "Meadowbrook Elementary",
  "Newbridge High",
  "Orchard Hills Academy",
  "Parkside School",
  "Quail Ridge Elementary",
  "Riverdale High",
  "Stonebridge Academy",
  "Timberline School",
  "Union Hill Elementary",
  "Vista Grande High",
  "Whitewater Academy",
  "Yellowstone School",
  "Zephyr Elementary",
];

const FIRST_NAMES = [
  "Maria", "Juan", "Ana", "Jose", "Rosa", "Pedro", "Carmen", "Luis",
  "Elena", "Miguel", "Sofia", "Carlos", "Isabel", "Antonio", "Lucia",
  "Francisco", "Teresa", "Manuel", "Patricia", "Rafael",
];

const LAST_NAMES = [
  "Santos", "Reyes", "Cruz", "Bautista", "Garcia", "Mendoza", "Torres",
  "Flores", "Ramos", "Gonzales", "Aquino", "Dela Cruz", "Villanueva",
  "Fernandez", "Castillo", "Morales", "Rivera", "Domingo", "Santiago",
  "Navarro",
];

const CATEGORIES: StudentCategory[] = [
  "PRE_KINDER",
  "KINDER",
  "GRADE_SCHOOL",
  "JUNIOR_HIGH",
  "SENIOR_HIGH",
  "TERTIARY",
];

const CATEGORY_GRADES: Record<StudentCategory, string[]> = {
  PRE_KINDER: ["Pre-Kinder"],
  KINDER: ["Kinder"],
  GRADE_SCHOOL: ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6"],
  JUNIOR_HIGH: ["Grade 7", "Grade 8", "Grade 9", "Grade 10"],
  SENIOR_HIGH: ["Grade 11", "Grade 12"],
  TERTIARY: [],
};

const TERTIARY_GRADES = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const TERTIARY_COURSES = [
  "BS Computer Science",
  "BS Nursing",
  "BS Education",
  "BS Business Administration",
  "BS Information Technology",
];

async function main() {
  console.log("Seeding database...");

  await prisma.student.deleteMany();
  await prisma.idTemplate.deleteMany();
  await prisma.schoolYear.deleteMany();
  await prisma.userSchool.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();
  await prisma.organization.deleteMany();

  const org = await prisma.organization.create({
    data: { name: "Metro Education District", slug: "metro-ed" },
  });

  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: "admin@demo.org",
      passwordHash,
      name: "System Administrator",
      role: "ADMIN",
    },
  });

  const operator = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: "operator@demo.org",
      passwordHash,
      name: "School Operator",
      role: "OPERATOR",
    },
  });

  const scannerPasswordHash = await bcrypt.hash("12345678", 10);
  const scanner = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: "age-scanner1@scanner.local",
      passwordHash: scannerPasswordHash,
      name: "AGE Scanner 1",
      role: "SCANNER",
    },
  });

  const frontDesign = JSON.stringify(createDefaultFrontDesign());
  const backDesign = JSON.stringify(createDefaultBackDesign());

  for (let i = 0; i < SCHOOL_NAMES.length; i++) {
    const code = `SCH-${String(i + 1).padStart(3, "0")}`;
    const school = await prisma.school.create({
      data: {
        organizationId: org.id,
        name: SCHOOL_NAMES[i],
        code,
        address: `${100 + i} Education Blvd, District ${Math.floor(i / 10) + 1}`,
      },
    });

    if (i < 5) {
      await prisma.userSchool.create({
        data: { userId: operator.id, schoolId: school.id },
      });
    }

    if (i === 0) {
      await prisma.userSchool.create({
        data: { userId: scanner.id, schoolId: school.id },
      });
    }

    const year2024 = await prisma.schoolYear.create({
      data: { schoolId: school.id, name: "2024-2025", isCurrent: false },
    });
    const year2025 = await prisma.schoolYear.create({
      data: { schoolId: school.id, name: "2025-2026", isCurrent: true },
    });

    await prisma.idTemplate.create({
      data: {
        schoolId: school.id,
        name: "Standard Student ID",
        description: `${school.name} default template`,
        orientation: "LANDSCAPE",
        width: 1011,
        height: 638,
        frontDesign,
        backDesign,
        isDefault: true,
      },
    });

    const studentCount = 8 + (i % 8);
    for (let j = 0; j < studentCount; j++) {
      const category = CATEGORIES[j % CATEGORIES.length];
      const firstName = FIRST_NAMES[(i + j) % FIRST_NAMES.length];
      const lastName = LAST_NAMES[(i * 2 + j) % LAST_NAMES.length];
      const isTertiary = category === "TERTIARY";
      const grades = CATEGORY_GRADES[category];
      const grade = isTertiary ? null : grades[j % grades.length];

      await prisma.student.create({
        data: {
          schoolId: school.id,
          schoolYearId: year2025.id,
          studentId: `${code}-${String(j + 1).padStart(4, "0")}`,
          category,
          firstName,
          lastName,
          middleName: j % 3 === 0 ? LAST_NAMES[(j + 5) % LAST_NAMES.length] : null,
          grade,
          customGradeName: isTertiary
            ? TERTIARY_GRADES[j % TERTIARY_GRADES.length]
            : null,
          course: isTertiary
            ? TERTIARY_COURSES[j % TERTIARY_COURSES.length]
            : null,
          section: ["A", "B", "C", "D"][j % 4],
          dateOfBirth: `${2006 + (j % 6)}-0${(j % 9) + 1}-15`,
          gender: j % 2 === 0 ? "Male" : "Female",
          address: `${j + 1} Student St`,
          contactPhone: `+63 917 ${String(100 + j).padStart(3, "0")} ${String(4567 + j).slice(0, 4)}`,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(" ", "")}@student.edu`,
        },
      });
    }

    // Fewer students in previous school year
    for (let j = 0; j < 3; j++) {
      await prisma.student.create({
        data: {
          schoolId: school.id,
          schoolYearId: year2024.id,
          studentId: `${code}-PY-${String(j + 1).padStart(3, "0")}`,
          category: "GRADE_SCHOOL",
          firstName: FIRST_NAMES[j],
          lastName: LAST_NAMES[j],
          grade: `Grade ${j + 1}`,
          section: "A",
          gender: "Male",
        },
      });
    }

    if ((i + 1) % 10 === 0) console.log(`  Created ${i + 1} schools...`);
  }

  console.log("\nSeed complete!");
  console.log(`  Schools: ${SCHOOL_NAMES.length} (each with own templates)`);
  console.log(`  School years: 2024-2025 & 2025-2026 per school`);
  console.log(`  Admin: admin@demo.org / password123`);
  console.log(`  Scanner: age-scanner1 / 12345678  (open /scanner)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
