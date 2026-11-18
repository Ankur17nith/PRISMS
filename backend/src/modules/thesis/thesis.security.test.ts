import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import { signAccessToken } from "../auth/auth.tokens.js";

/**
 * Security / workflow regressions. Uses its own freshly created scholar so it cannot interfere
 * with the other suites, which share the same test database.
 */
const pdf = (tag: string) => Buffer.from(`%PDF-1.4\n% ${tag} ${Date.now()}-${Math.random()}\n%%EOF`);

describe("Security & parallel-review regressions", () => {
  const tokens: Record<string, string> = {};
  const ids: Record<string, string> = {};
  let sup1StudentUserId = "";

  const auth = (who: string) => ({ Authorization: `Bearer ${tokens[who]}` });
  const userByEmail = async (email: string) => prisma.user.findUniqueOrThrow({ where: { collegeEmail: email } });

  before(async () => {
    for (const [k, email] of Object.entries({
      sup1: "supervisor1@example.test",
      sup2: "supervisor2@example.test",
      hod: "hod.cse@example.test",
      sdpc: "sdpc@example.test",
      dean: "dean@example.test",
      chairman: "chairman@example.test",
    })) {
      const u = await userByEmail(email);
      ids[k] = u.id;
      tokens[k] = signAccessToken(u.id);
    }

    // Fresh scholar supervised by supervisor1 (isolated from the shared seeded scholars).
    const cse = await prisma.department.findUniqueOrThrow({ where: { code: "CSE" } });
    const sup1Faculty = await prisma.faculty.findUniqueOrThrow({ where: { userId: ids.sup1! } });
    const admin = await userByEmail("admin@example.test");
    const email = "sec.scholar@example.test";
    const user =
      (await prisma.user.findUnique({ where: { collegeEmail: email } })) ??
      (await prisma.user.create({
        data: { collegeEmail: email, fullName: "Security Test Scholar", accountStatus: "ACTIVE", emailVerifiedAt: new Date() },
      }));
    sup1StudentUserId = user.id;
    const student =
      (await prisma.student.findUnique({ where: { userId: user.id } })) ??
      (await prisma.student.create({
        data: {
          userId: user.id,
          rollNumber: "SECTEST01",
          program: "PhD CSE",
          departmentId: cse.id,
          admissionStatus: "CONFIRMED",
          enrollmentDate: new Date("2021-08-01"),
        },
      }));
    const hasAssignment = await prisma.studentSupervisorAssignment.findFirst({ where: { studentId: student.id, endDate: null } });
    if (!hasAssignment) {
      await prisma.studentSupervisorAssignment.create({
        data: { studentId: student.id, facultyId: sup1Faculty.id, startDate: new Date("2021-08-15"), assignedByUserId: admin.id },
      });
    }
    tokens.scholar = signAccessToken(user.id);

    // Reset any earlier run of this suite.
    const theses = await prisma.thesis.findMany({ where: { studentId: student.id } });
    for (const t of theses) {
      await prisma.reviewComment.deleteMany({ where: { submission: { thesisId: t.id } } });
      await prisma.review.deleteMany({ where: { assignment: { stage: { submission: { thesisId: t.id } } } } });
      await prisma.reviewAssignment.deleteMany({ where: { stage: { submission: { thesisId: t.id } } } });
      await prisma.submissionStage.deleteMany({ where: { submission: { thesisId: t.id } } });
      await prisma.thesisFile.deleteMany({ where: { submission: { thesisId: t.id } } });
      await prisma.thesisSubmission.deleteMany({ where: { thesisId: t.id } });
      await prisma.thesis.delete({ where: { id: t.id } });
    }
  });

  const upload = async (who: string, tag: string) =>
    request(app).post("/theses/upload").set(auth(who)).attach("file", pdf(tag), { filename: "t.pdf", contentType: "application/pdf" });

  let sid = "";
  let firstKey = "";

  it("rejects thesis upload from accounts without a student profile", async () => {
    const res = await upload("sup1", "nonstudent");
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, "NOT_A_STUDENT");
  });

  it("sanitizes client supplied filenames (no header/quote injection) and rejects reused storage keys cleanly", async () => {
    await request(app)
      .put("/theses/draft")
      .set(auth("scholar"))
      .send({ workingTitle: "Security Regression Thesis", abstract: "An abstract that is long enough to pass validation.", researchArea: "Security" })
      .expect(200);
    const up = await upload("scholar", "first");
    assert.equal(up.status, 201);
    firstKey = up.body.file.storageKey;

    const sub = await request(app)
      .post("/theses/submit")
      .set(auth("scholar"))
      .send({ storageKey: firstKey, originalFilename: 'evil"; filename*=UTF-8\'\'x.exe' });
    assert.equal(sub.status, 201);
    sid = sub.body.submissionId;

    const file = await prisma.thesisFile.findUniqueOrThrow({ where: { storageKey: firstKey } });
    assert.match(file.originalFilename, /^[a-zA-Z0-9._-]+\.pdf$/);

    // The same key can never be attached to a second submission (clean 409, not a 500).
    const reuse = await request(app)
      .post("/theses/resubmit")
      .set(auth("scholar"))
      .send({ storageKey: firstKey, originalFilename: "again.pdf" });
    assert.notEqual(reuse.status, 500);
    assert.ok(reuse.status >= 400 && reuse.status < 500);
  });

  it("does not trust a client supplied ?role=HOD: a plain supervisor cannot list or read department scholars", async () => {
    const plain = await request(app).get("/theses/supervisor/scholars?status=all").set(auth("sup2"));
    assert.equal(plain.status, 200);

    const claimed = await request(app).get("/theses/supervisor/scholars?status=all&role=HOD").set(auth("sup2"));
    assert.equal(claimed.status, 403);
    assert.equal(claimed.body.error.code, "ROLE_UNAUTHORIZED");

    const student = await prisma.student.findUniqueOrThrow({ where: { userId: sup1StudentUserId } });
    const history = await request(app).get(`/theses/supervisor/scholars/${student.id}?role=HOD`).set(auth("sup2"));
    assert.equal(history.status, 403);
    const plainHistory = await request(app).get(`/theses/supervisor/scholars/${student.id}`).set(auth("sup2"));
    assert.equal(plainHistory.status, 403);

    // A genuine HOD still can.
    const hod = await request(app).get("/theses/supervisor/scholars?status=all&role=HOD").set(auth("hod"));
    assert.equal(hod.status, 200);
    assert.ok(hod.body.scholars.some((s: any) => s.rollNumber === "SECTEST01"));
  });

  it("parallel SDPC/Dean branches work in either order (Dean first) and converge on Senate", async () => {
    const rec = await request(app).get(`/theses/${sid}/recipients`).set(auth("sup1"));
    await request(app).post(`/theses/${sid}/forward`).set(auth("sup1")).send({ recipientUserIds: [rec.body.recipients[0].userId] }).expect(200);
    await request(app).post(`/theses/${sid}/forward`).set(auth("hod")).send({ recipientUserIds: [ids.sdpc, ids.dean] }).expect(200);

    // Dean acts FIRST. Previously this 403'd whenever the SDPC stage happened to be listed first.
    const deanRec = await request(app).get(`/theses/${sid}/recipients`).set(auth("dean"));
    assert.equal(deanRec.status, 200);
    await request(app).post(`/theses/${sid}/forward`).set(auth("dean")).send({ recipientUserIds: [ids.chairman] }).expect(200);

    let detail = await request(app).get(`/theses/${sid}`).set(auth("scholar"));
    assert.equal(detail.body.submission.stages.some((s: any) => s.stageCode === "SENATE_REVIEW"), false, "Senate must wait for SDPC");

    await request(app).post(`/theses/${sid}/forward`).set(auth("sdpc")).send({ recipientUserIds: [ids.chairman] }).expect(200);
    detail = await request(app).get(`/theses/${sid}`).set(auth("scholar"));
    assert.ok(detail.body.submission.stages.some((s: any) => s.stageCode === "SENATE_REVIEW"));

    await request(app).post(`/theses/${sid}/forward`).set(auth("chairman")).send({ summary: "Approved" }).expect(200);
    detail = await request(app).get(`/theses/${sid}`).set(auth("scholar"));
    assert.equal(detail.body.submission.status, "APPROVED");
  });
});
