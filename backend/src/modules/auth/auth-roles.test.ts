import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../lib/prisma.js";
import { getActiveRoles, normalizeRoleCode } from "./auth.service.js";

describe("Faculty Role Normalization & Deduplication", () => {
  let sdpcUserId: string;
  let deanUserId: string;
  let chairmanUserId: string;
  let hodUserId: string;

  before(async () => {
    const [sdpc, dean, chairman, hod] = await Promise.all([
      prisma.user.findUnique({ where: { collegeEmail: "sdpc@example.test" } }),
      prisma.user.findUnique({ where: { collegeEmail: "dean@example.test" } }),
      prisma.user.findUnique({ where: { collegeEmail: "chairman@example.test" } }),
      prisma.user.findUnique({ where: { collegeEmail: "hod.cse@example.test" } }),
    ]);

    if (sdpc) sdpcUserId = sdpc.id;
    if (dean) deanUserId = dean.id;
    if (chairman) chairmanUserId = chairman.id;
    if (hod) hodUserId = hod.id;
  });

  it("should normalize role code aliases correctly", () => {
    assert.equal(normalizeRoleCode("SDPC"), "CHAIRPERSON_SDPC");
    assert.equal(normalizeRoleCode("sdpc"), "CHAIRPERSON_SDPC");
    assert.equal(normalizeRoleCode("DEAN"), "DEAN_ACADEMICS");
    assert.equal(normalizeRoleCode("dean"), "DEAN_ACADEMICS");
    assert.equal(normalizeRoleCode("CHAIRMAN"), "CHAIRPERSON_SENATE");
    assert.equal(normalizeRoleCode("chairman"), "CHAIRPERSON_SENATE");
    assert.equal(normalizeRoleCode("HOD"), "HOD");
    assert.equal(normalizeRoleCode("SUPERVISOR"), "SUPERVISOR");
  });

  it("should deduplicate SDPC and CHAIRPERSON_SDPC roles into single canonical role", async () => {
    if (!sdpcUserId) return;
    const roles = await getActiveRoles(sdpcUserId);
    const codes = roles.map((r) => r.code);

    assert.equal(codes.filter((c) => c === "CHAIRPERSON_SDPC").length, 1);
    assert.equal(codes.includes("SDPC"), false);
    assert.equal(roles[0].name, "SDPC Chairperson");
  });

  it("should deduplicate DEAN and DEAN_ACADEMICS into single canonical role", async () => {
    if (!deanUserId) return;
    const roles = await getActiveRoles(deanUserId);
    const codes = roles.map((r) => r.code);

    assert.equal(codes.filter((c) => c === "DEAN_ACADEMICS").length, 1);
    assert.equal(codes.includes("DEAN"), false);
    assert.equal(roles[0].name, "Dean of Academic Affairs");
  });

  it("should deduplicate CHAIRMAN and CHAIRPERSON_SENATE into single canonical role", async () => {
    if (!chairmanUserId) return;
    const roles = await getActiveRoles(chairmanUserId);
    const codes = roles.map((r) => r.code);

    assert.equal(codes.filter((c) => c === "CHAIRPERSON_SENATE").length, 1);
    assert.equal(codes.includes("CHAIRMAN"), false);
    assert.equal(roles[0].name, "Chairperson Senate / Director");
  });

  it("should preserve distinct genuine multi-roles such as HOD and SUPERVISOR", async () => {
    if (!hodUserId) return;
    const roles = await getActiveRoles(hodUserId);
    const codes = roles.map((r) => r.code);

    assert.ok(codes.includes("HOD"));
    assert.ok(codes.includes("SUPERVISOR"));
    assert.equal(roles.length, 2);
  });
});
