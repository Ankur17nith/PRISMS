/**
 * PRISMS Frontend API Client
 * Connects directly to the backend Express server with cookie-based credentials
 * and resilient mock fallback for offline demonstrations.
 */

export interface UserRole {
  id: string;
  code: string;
  name: string;
  scopeType: "DEPARTMENT" | "INSTITUTE";
  departmentId?: string | null;
  departmentCode?: string | null;
}

export interface AuthUser {
  id: string;
  collegeEmail: string;
  fullName: string;
  phone?: string | null;
  accountStatus: string;
  roles: UserRole[];
  studentProfile?: {
    id: string;
    rollNumber: string;
    departmentId?: string;
    program?: string;
    admissionStatus?: string;
    department?: { id: string; code: string; name: string };
  } | null;
  facultyProfile?: {
    id: string;
    employeeNumber?: string | null;
    departmentId?: string;
    designation: string;
    department?: { id: string; code: string; name: string };
  } | null;
}

export interface SubmissionItem {
  id: string;
  submissionReference: string;
  title: string;
  status: string;
  currentVersion: number;
  submittedAt: string | null;
  student: {
    rollNumber: string;
    program: string;
    user: { fullName: string; collegeEmail: string };
    department: { code: string; name: string };
  };
  stages?: Array<{
    id: string;
    sequenceOrder: number;
    status: string;
    stageDefinition: { code: string; name: string };
    assignments?: Array<{
      id: string;
      status: string;
      reviewer: { id: string; fullName: string; collegeEmail: string };
    }>;
  }>;
  files?: Array<{
    id: string;
    originalFileName: string;
    fileSizeBytes: number;
    scanStatus: string;
    sha256Checksum?: string;
    createdAt: string;
  }>;
  decisions?: Array<{
    id: string;
    decision: "APPROVE" | "REJECT";
    remarks?: string | null;
    createdAt: string;
    reviewer: { id: string; fullName: string };
  }>;
  comments?: Array<{
    id: string;
    commentText: string;
    author: { id: string; fullName: string };
    createdAt: string;
  }>;
}

export interface ReviewQueueItem {
  assignmentId: string;
  status: string;
  assignedAt: string;
  submission: SubmissionItem;
  stage: {
    code: string;
    name: string;
    sequenceOrder: number;
  };
}

export interface ScholarItem {
  scholarId: string;
  rollNumber: string;
  fullName: string;
  collegeEmail: string;
  program: string;
  admissionStatus: string;
  activeSubmission: {
    id: string;
    submissionReference: string;
    title: string;
    status: string;
    currentVersion: number;
    submittedAt: string | null;
    currentStage: string | null;
  } | null;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public data?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

// ------------------------------------------------------------- MOCK USERS
const MOCK_USERS: Record<string, AuthUser> = {
  "student1@example.test": {
    id: "demo-student-1",
    collegeEmail: "student1@example.test",
    fullName: "Aarav Sharma",
    accountStatus: "ACTIVE",
    roles: [{ id: "r-stu", code: "STUDENT", name: "Doctoral Student / Scholar", scopeType: "DEPARTMENT" }],
    studentProfile: {
      id: "stu-1",
      rollNumber: "21PHDCSE01",
      program: "PhD Computer Science & Engineering",
      admissionStatus: "CONFIRMED",
      department: { id: "dept-cse", code: "CSE", name: "Computer Science and Engineering" },
    },
  },
  "student1@nith.ac.in": {
    id: "demo-student-1",
    collegeEmail: "student1@nith.ac.in",
    fullName: "Aarav Sharma",
    accountStatus: "ACTIVE",
    roles: [{ id: "r-stu", code: "STUDENT", name: "Doctoral Student / Scholar", scopeType: "DEPARTMENT" }],
    studentProfile: {
      id: "stu-1",
      rollNumber: "21PHDCSE01",
      program: "PhD Computer Science & Engineering",
      admissionStatus: "CONFIRMED",
      department: { id: "dept-cse", code: "CSE", name: "Computer Science and Engineering" },
    },
  },
  "supervisor1@example.test": {
    id: "demo-sup-1",
    collegeEmail: "supervisor1@example.test",
    fullName: "Dr. Rajesh Kumar",
    accountStatus: "ACTIVE",
    roles: [{ id: "r-sup", code: "SUPERVISOR", name: "Thesis Supervisor", scopeType: "DEPARTMENT" }],
    facultyProfile: {
      id: "fac-1",
      employeeNumber: "FAC001",
      designation: "Associate Professor",
      department: { id: "dept-cse", code: "CSE", name: "Computer Science and Engineering" },
    },
  },
  "supervisor1@nith.ac.in": {
    id: "demo-sup-1",
    collegeEmail: "supervisor1@nith.ac.in",
    fullName: "Dr. Rajesh Kumar",
    accountStatus: "ACTIVE",
    roles: [{ id: "r-sup", code: "SUPERVISOR", name: "Thesis Supervisor", scopeType: "DEPARTMENT" }],
    facultyProfile: {
      id: "fac-1",
      employeeNumber: "FAC001",
      designation: "Associate Professor",
      department: { id: "dept-cse", code: "CSE", name: "Computer Science and Engineering" },
    },
  },
  "hod.cse@example.test": {
    id: "demo-hod-1",
    collegeEmail: "hod.cse@example.test",
    fullName: "Prof. Anil Verma",
    accountStatus: "ACTIVE",
    roles: [
      { id: "r-hod", code: "HOD", name: "Head of Department", scopeType: "DEPARTMENT" },
      { id: "r-sup", code: "SUPERVISOR", name: "Thesis Supervisor", scopeType: "DEPARTMENT" },
    ],
    facultyProfile: {
      id: "fac-3",
      employeeNumber: "FAC003",
      designation: "Professor & HOD",
      department: { id: "dept-cse", code: "CSE", name: "Computer Science and Engineering" },
    },
  },
  "hod_cse@nith.ac.in": {
    id: "demo-hod-1",
    collegeEmail: "hod_cse@nith.ac.in",
    fullName: "Prof. Anil Verma",
    accountStatus: "ACTIVE",
    roles: [
      { id: "r-hod", code: "HOD", name: "Head of Department", scopeType: "DEPARTMENT" },
      { id: "r-sup", code: "SUPERVISOR", name: "Thesis Supervisor", scopeType: "DEPARTMENT" },
    ],
    facultyProfile: {
      id: "fac-3",
      employeeNumber: "FAC003",
      designation: "Professor & HOD",
      department: { id: "dept-cse", code: "CSE", name: "Computer Science and Engineering" },
    },
  },
  "sdpc@example.test": {
    id: "demo-sdpc-1",
    collegeEmail: "sdpc@example.test",
    fullName: "Prof. Vikram Malhotra",
    accountStatus: "ACTIVE",
    roles: [
      { id: "r-sdpc", code: "CHAIRPERSON_SDPC", name: "SDPC Chairperson", scopeType: "INSTITUTE" },
      { id: "r-sdpc-alias", code: "SDPC", name: "SDPC Chairperson", scopeType: "INSTITUTE" },
    ],
    facultyProfile: {
      id: "fac-5",
      employeeNumber: "FAC005",
      designation: "Professor & SDPC Chair",
      department: { id: "dept-cse", code: "CSE", name: "Computer Science and Engineering" },
    },
  },
  "dean@example.test": {
    id: "demo-dean-1",
    collegeEmail: "dean@example.test",
    fullName: "Prof. Sanjay Gupta",
    accountStatus: "ACTIVE",
    roles: [
      { id: "r-dean", code: "DEAN_ACADEMICS", name: "Dean Academics", scopeType: "INSTITUTE" },
      { id: "r-dean-alias", code: "DEAN", name: "Dean Academics", scopeType: "INSTITUTE" },
    ],
    facultyProfile: {
      id: "fac-6",
      employeeNumber: "FAC006",
      designation: "Professor & Dean",
      department: { id: "dept-cse", code: "CSE", name: "Computer Science and Engineering" },
    },
  },
  "chairman@example.test": {
    id: "demo-chairman-1",
    collegeEmail: "chairman@example.test",
    fullName: "Prof. H. M. Suryavanshi",
    accountStatus: "ACTIVE",
    roles: [
      { id: "r-senate", code: "CHAIRPERSON_SENATE", name: "Chairperson Senate / Director", scopeType: "INSTITUTE" },
      { id: "r-chairman-alias", code: "CHAIRMAN", name: "Chairman Senate", scopeType: "INSTITUTE" },
    ],
    facultyProfile: {
      id: "fac-7",
      employeeNumber: "FAC007",
      designation: "Director & Chairman Senate",
      department: { id: "dept-cse", code: "CSE", name: "Computer Science and Engineering" },
    },
  },
};

function findMockUser(emailStr: string): AuthUser | null {
  const normalized = (emailStr || "").trim().toLowerCase();
  if (MOCK_USERS[normalized]) return MOCK_USERS[normalized];
  // Match prefix
  for (const [key, user] of Object.entries(MOCK_USERS)) {
    if (key.split("@")[0] === normalized.split("@")[0]) {
      return user;
    }
  }
  return null;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const defaultHeaders: Record<string, string> = {};
  if (!(options.body instanceof FormData)) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  const response = await fetch(endpoint, {
    ...options,
    credentials: "include",
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMsg =
      isJson && data?.message
        ? data.message
        : isJson && data?.error?.message
        ? data.error.message
        : isJson && data?.error
        ? data.error
        : `Request failed with status ${response.status}`;
    throw new ApiError(response.status, errorMsg, data);
  }

  return (isJson && data?.data !== undefined ? data.data : data) as T;
}

export const api = {
  // Auth
  login: async (credentials: { collegeEmail?: string; email?: string; password?: string }) => {
    const email = (credentials.email || credentials.collegeEmail || "").trim().toLowerCase();
    const password = credentials.password || "ChangeMe-Dev-123";

    try {
      const res = await request<{ user: { id: string; email: string; fullName: string } }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (typeof window !== "undefined") {
        localStorage.removeItem("prisms_demo_user");
      }
      return res;
    } catch (err) {
      // Fallback to high-fidelity demo authentication for testing/demonstration
      const mock = findMockUser(email);
      if (mock && typeof window !== "undefined") {
        localStorage.setItem("prisms_demo_user", JSON.stringify(mock));
        return { user: { id: mock.id, email: mock.collegeEmail, fullName: mock.fullName } };
      }
      throw err;
    }
  },

  logout: async () => {
    try {
      await request("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("prisms_demo_user");
        localStorage.removeItem("prisms_active_role");
      }
    }
    return { message: "Logged out" };
  },

  getCurrentUser: async (): Promise<AuthUser> => {
    try {
      const res = await request<{ user: AuthUser }>("/auth/me");
      const user = (res as { user?: AuthUser })?.user || (res as unknown as AuthUser);
      if (user && user.id) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("prisms_demo_user");
        }
        return user;
      }
      throw new Error("Invalid user profile");
    } catch (err) {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("prisms_demo_user");
        if (stored) {
          try {
            return JSON.parse(stored) as AuthUser;
          } catch {
            // ignore
          }
        }
      }
      throw err;
    }
  },

  // Thesis - Student
  getDraft: () =>
    request<{
      student: { id: string; rollNumber: string; fullName: string; departmentName: string; departmentCode: string };
      supervisor: { id: string; fullName: string; designation: string } | null;
      draft: { title: string; abstract?: string; keywords: string[]; fileScanId?: string; originalFileName?: string; fileSizeBytes?: number } | null;
    }>("/theses/draft"),

  saveDraft: (data: { title: string; abstract?: string; keywords?: string[]; fileScanId?: string }) =>
    request("/theses/draft", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  uploadThesisPdf: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<{
      fileScanId: string;
      originalFileName: string;
      fileSizeBytes: number;
      sha256Checksum: string;
    }>("/theses/upload", {
      method: "POST",
      body: formData,
    });
  },

  submitThesis: (data: { title: string; abstract?: string; keywords?: string[]; fileScanId: string }) =>
    request<SubmissionItem>("/theses/submit", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMySubmissions: () =>
    request<SubmissionItem[]>("/theses/my"),

  getSubmissionDetails: (submissionId: string) =>
    request<SubmissionItem>(`/theses/${submissionId}`),

  resubmitThesis: (submissionId: string, data: { title: string; abstract?: string; keywords?: string[]; fileScanId: string }) =>
    request<SubmissionItem>(`/theses/${submissionId}/resubmit`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Thesis - Reviewer & Routing
  getReviewQueue: (role?: string) =>
    request<ReviewQueueItem[]>(`/theses/queue${role ? `?role=${role}` : ""}`),

  getEligibleRecipients: (submissionId: string, role?: string) =>
    request<{
      currentStage: string;
      targetStage: string | null;
      eligibleRecipients: Array<{
        userId: string;
        fullName: string;
        collegeEmail: string;
        roleCode: string;
        designation?: string;
      }>;
    }>(`/theses/${submissionId}/eligible-recipients${role ? `?role=${role}` : ""}`),

  forwardSubmission: (
    submissionId: string,
    data: { role?: string; decision: "APPROVE"; remarks?: string; recipientUserIds: string[] }
  ) =>
    request(`/theses/${submissionId}/forward`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  returnSubmission: (
    submissionId: string,
    data: { role?: string; remarks: string }
  ) =>
    request(`/theses/${submissionId}/return`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  rejectSubmission: (
    submissionId: string,
    data: { role?: string; remarks: string }
  ) =>
    request(`/theses/${submissionId}/reject`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Supervisor Scholars
  getMyScholars: (status?: string) =>
    request<ScholarItem[]>(`/theses/scholars${status ? `?status=${status}` : ""}`),

  getScholarHistory: (scholarId: string) =>
    request<{ scholar: unknown; submissions: SubmissionItem[] }>(`/theses/scholars/${scholarId}/history`),

  // Document URLs
  getViewUrl: (submissionId: string, fileScanId: string) =>
    `/theses/${submissionId}/files/${fileScanId}/view`,

  getDownloadUrl: (submissionId: string, fileScanId: string) =>
    `/theses/${submissionId}/files/${fileScanId}/download`,
};
