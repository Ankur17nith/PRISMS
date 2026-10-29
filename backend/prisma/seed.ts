import process from "node:process";
import "dotenv/config";
import argon2 from "argon2";
import { prisma } from "../src/lib/prisma.js";

const SEED_PASSWORD = process.env.SEED_PASSWORD || "ChangeMe-Dev-123";

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to run seed script in production environment.");
    process.exit(1);
  }

  console.log("Seeding PRISMS database with sample data...");

  const passwordHash = await argon2.hash(SEED_PASSWORD);

  // 1. Department
  const cse = await prisma.department.upsert({
    where: { code: "CSE" },
    update: { name: "Computer Science and Engineering" },
    create: { code: "CSE", name: "Computer Science and Engineering" },
  });
  console.log(`✓ Department: ${cse.name} (${cse.code})`);

  // 2. Roles
  const rolesData = [
    { code: "STUDENT", name: "Doctoral Student / Scholar", scopeType: "DEPARTMENT" as const },
    { code: "SUPERVISOR", name: "Thesis Supervisor", scopeType: "DEPARTMENT" as const },
    { code: "HOD", name: "Head of Department", scopeType: "DEPARTMENT" as const },
    { code: "DDPC", name: "Departmental Doctoral Programme Committee Convenor", scopeType: "DEPARTMENT" as const },
    { code: "CHAIRPERSON_SDPC", name: "Senate Doctoral Programme Committee Chairperson", scopeType: "INSTITUTE" as const },
    { code: "SDPC", name: "SDPC Chairperson (Alias)", scopeType: "INSTITUTE" as const },
    { code: "DEAN_ACADEMICS", name: "Dean of Academic Affairs", scopeType: "INSTITUTE" as const },
    { code: "DEAN", name: "Dean Academics (Alias)", scopeType: "INSTITUTE" as const },
    { code: "CHAIRPERSON_SENATE", name: "Chairperson Senate / Director", scopeType: "INSTITUTE" as const },
    { code: "CHAIRMAN", name: "Chairman Senate (Alias)", scopeType: "INSTITUTE" as const },
    { code: "ADMIN", name: "System Administrator", scopeType: "INSTITUTE" as const },
  ];

  const roleMap: Record<string, string> = {};
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name, scopeType: r.scopeType, isActive: true },
      create: { code: r.code, name: r.name, scopeType: r.scopeType, isActive: true },
    });
    roleMap[r.code] = role.id;
  }
  console.log(`✓ Seeded ${rolesData.length} roles`);

  // 3. Workflow Stage Definitions
  const stagesData = [
    { code: "SUPERVISOR_REVIEW", name: "Supervisor Review", sequenceNumber: 1, departmentScoped: true },
    { code: "HOD_REVIEW", name: "HOD Review", sequenceNumber: 2, departmentScoped: true },
    { code: "SDPC_REVIEW", name: "SDPC Review", sequenceNumber: 3, departmentScoped: false },
    { code: "DEAN_REVIEW", name: "Dean Academics Review", sequenceNumber: 3, departmentScoped: false },
    { code: "SENATE_REVIEW", name: "Senate Chairperson Review", sequenceNumber: 4, departmentScoped: false },
  ];

  for (const s of stagesData) {
    await prisma.workflowStageDefinition.upsert({
      where: { code: s.code },
      update: { name: s.name, sequenceNumber: s.sequenceNumber, departmentScoped: s.departmentScoped, isActive: true },
      create: { code: s.code, name: s.name, sequenceNumber: s.sequenceNumber, departmentScoped: s.departmentScoped, isActive: true },
    });
  }
  console.log(`✓ Seeded ${stagesData.length} workflow stages`);

  // Helper to upsert a user with active status
  async function upsertUser(email: string, fullName: string) {
    return await prisma.user.upsert({
      where: { collegeEmail: email },
      update: { fullName, passwordHash, accountStatus: "ACTIVE", emailVerifiedAt: new Date() },
      create: {
        collegeEmail: email,
        fullName,
        passwordHash,
        accountStatus: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
    });
  }

  // Helper to assign a role to user
  async function assignRole(userId: string, roleCode: string, departmentId?: string | null) {
    const roleId = roleMap[roleCode];
    if (!roleId) return;
    const existing = await prisma.userRole.findFirst({
      where: { userId, roleId, departmentId: departmentId ?? null, validUntil: null },
    });
    if (!existing) {
      await prisma.userRole.create({
        data: {
          userId,
          roleId,
          departmentId: departmentId ?? null,
          validFrom: new Date("2020-01-01"),
        },
      });
    }
  }

  // 4. Admin User
  const admin = await upsertUser("admin@example.test", "PRISMS Portal Administrator");
  await assignRole(admin.id, "ADMIN");

  // 5. Faculty Accounts
  const supervisor1User = await upsertUser("supervisor1@example.test", "Dr. Rajesh Kumar (Supervisor 1)");
  const supervisor1Faculty = await prisma.faculty.upsert({
    where: { userId: supervisor1User.id },
    update: { designation: "Associate Professor", departmentId: cse.id, employeeNumber: "FAC001" },
    create: { userId: supervisor1User.id, designation: "Associate Professor", departmentId: cse.id, employeeNumber: "FAC001" },
  });
  await assignRole(supervisor1User.id, "SUPERVISOR", cse.id);

  const supervisor2User = await upsertUser("supervisor2@example.test", "Dr. Sunita Rao (Supervisor 2)");
  const supervisor2Faculty = await prisma.faculty.upsert({
    where: { userId: supervisor2User.id },
    update: { designation: "Professor", departmentId: cse.id, employeeNumber: "FAC002" },
    create: { userId: supervisor2User.id, designation: "Professor", departmentId: cse.id, employeeNumber: "FAC002" },
  });
  await assignRole(supervisor2User.id, "SUPERVISOR", cse.id);

  const hodUser = await upsertUser("hod.cse@example.test", "Prof. Anil Verma (HOD CSE)");
  await prisma.faculty.upsert({
    where: { userId: hodUser.id },
    update: { designation: "Professor & HOD", departmentId: cse.id, employeeNumber: "FAC003" },
    create: { userId: hodUser.id, designation: "Professor & HOD", departmentId: cse.id, employeeNumber: "FAC003" },
  });
  await assignRole(hodUser.id, "HOD", cse.id);
  await assignRole(hodUser.id, "SUPERVISOR", cse.id); // Faculty can hold multiple roles!

  const ddpcUser = await upsertUser("ddpc.cse@example.test", "Dr. Meera Iyer (DDPC CSE)");
  await prisma.faculty.upsert({
    where: { userId: ddpcUser.id },
    update: { designation: "Associate Professor & DDPC", departmentId: cse.id, employeeNumber: "FAC004" },
    create: { userId: ddpcUser.id, designation: "Associate Professor & DDPC", departmentId: cse.id, employeeNumber: "FAC004" },
  });
  await assignRole(ddpcUser.id, "DDPC", cse.id);
  await assignRole(ddpcUser.id, "SUPERVISOR", cse.id);

  const sdpcUser = await upsertUser("sdpc@example.test", "Prof. Vikram Malhotra (Chairperson SDPC)");
  await prisma.faculty.upsert({
    where: { userId: sdpcUser.id },
    update: { designation: "Professor", departmentId: cse.id, employeeNumber: "FAC005" },
    create: { userId: sdpcUser.id, designation: "Professor", departmentId: cse.id, employeeNumber: "FAC005" },
  });
  await assignRole(sdpcUser.id, "CHAIRPERSON_SDPC");
  await assignRole(sdpcUser.id, "SDPC");

  const deanUser = await upsertUser("dean@example.test", "Prof. Sanjay Gupta (Dean Academics)");
  await prisma.faculty.upsert({
    where: { userId: deanUser.id },
    update: { designation: "Professor & Dean", departmentId: cse.id, employeeNumber: "FAC006" },
    create: { userId: deanUser.id, designation: "Professor & Dean", departmentId: cse.id, employeeNumber: "FAC006" },
  });
  await assignRole(deanUser.id, "DEAN_ACADEMICS");
  await assignRole(deanUser.id, "DEAN");

  const chairmanUser = await upsertUser("chairman@example.test", "Prof. H. M. Suryavanshi (Director & Chairman Senate)");
  await prisma.faculty.upsert({
    where: { userId: chairmanUser.id },
    update: { designation: "Director", departmentId: cse.id, employeeNumber: "FAC007" },
    create: { userId: chairmanUser.id, designation: "Director", departmentId: cse.id, employeeNumber: "FAC007" },
  });
  await assignRole(chairmanUser.id, "CHAIRPERSON_SENATE");
  await assignRole(chairmanUser.id, "CHAIRMAN");

  // 6. Student Accounts
  const student1User = await upsertUser("student1@example.test", "Aarav Sharma (Student 1)");
  const student1 = await prisma.student.upsert({
    where: { userId: student1User.id },
    update: { rollNumber: "21PHDCSE01", program: "PhD CSE", departmentId: cse.id, admissionStatus: "CONFIRMED" },
    create: {
      userId: student1User.id,
      rollNumber: "21PHDCSE01",
      program: "PhD CSE",
      departmentId: cse.id,
      admissionStatus: "CONFIRMED",
      enrollmentDate: new Date("2021-08-01"),
    },
  });
  await assignRole(student1User.id, "STUDENT", cse.id);

  const student2User = await upsertUser("student2@example.test", "Diya Patel (Student 2)");
  const student2 = await prisma.student.upsert({
    where: { userId: student2User.id },
    update: { rollNumber: "21PHDCSE02", program: "PhD CSE", departmentId: cse.id, admissionStatus: "CONFIRMED" },
    create: {
      userId: student2User.id,
      rollNumber: "21PHDCSE02",
      program: "PhD CSE",
      departmentId: cse.id,
      admissionStatus: "CONFIRMED",
      enrollmentDate: new Date("2021-08-01"),
    },
  });
  await assignRole(student2User.id, "STUDENT", cse.id);

  // 7. Active Supervision Assignments
  const now = new Date();
  const assign1 = await prisma.studentSupervisorAssignment.findFirst({
    where: { studentId: student1.id, facultyId: supervisor1Faculty.id, endDate: null },
  });
  if (!assign1) {
    await prisma.studentSupervisorAssignment.create({
      data: {
        studentId: student1.id,
        facultyId: supervisor1Faculty.id,
        startDate: new Date("2021-08-15"),
        assignedByUserId: admin.id,
      },
    });
  }

  const assign2 = await prisma.studentSupervisorAssignment.findFirst({
    where: { studentId: student2.id, facultyId: supervisor2Faculty.id, endDate: null },
  });
  if (!assign2) {
    await prisma.studentSupervisorAssignment.create({
      data: {
        studentId: student2.id,
        facultyId: supervisor2Faculty.id,
        startDate: new Date("2021-08-15"),
        assignedByUserId: admin.id,
      },
    });
  }
  console.log("✓ Active supervision assignments created for student1 -> supervisor1 and student2 -> supervisor2");

  console.log("🎉 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seeding failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
