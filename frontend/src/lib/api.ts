/**
 * PRISMS Frontend API Client
 * Connects directly to the backend Express server with cookie-based credentials
 */

export interface UserRole {
  id: string;
  code: string;
  name: string;
  scopeType: "DEPARTMENT" | "INSTITUTE";
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
    departmentId: string;
    program: string;
    admissionStatus: string;
    department: { id: string; code: string; name: string };
  } | null;
  facultyProfile?: {
    id: string;
    employeeNumber?: string | null;
    departmentId: string;
    designation: string;
    department: { id: string; code: string; name: string };
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
        : isJson && data?.error
        ? data.error
        : `Request failed with status ${response.status}`;
    throw new ApiError(response.status, errorMsg, data);
  }

  return (isJson && data?.data !== undefined ? data.data : data) as T;
}

export const api = {
  // Auth
  login: (credentials: { collegeEmail: string; password: string }) =>
    request<{ user: AuthUser; accessToken: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),
  logout: () =>
    request<{ message: string }>("/api/auth/logout", {
      method: "POST",
    }),
  getCurrentUser: () =>
    request<AuthUser>("/api/auth/me"),

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
