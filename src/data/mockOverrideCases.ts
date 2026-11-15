import { mockCases, type MockCase } from "./mockCases";

export type OverrideStatus = "In Review" | "Unapplied Override" | "Rejected test claim" | "Override confirmed";

export interface RejectCode {
  code: string;
  message: string;
}

export interface TestClaim {
  label: string;
  cid?: string;
  dateOfService: string;
  status: "PAID" | "REJECTED" | "PENDING";
  patientPay?: string;
  totalPaid?: string;
  authNumber?: string;
  rejects?: RejectCode[];
}

export interface PharmacistDecision {
  drugName: string;
  gpi: string;
  quantity: string;
  daysSupply: string;
  authStart: string;
  authEnd: string;
  reasonCode: string;
  approvalTypes: ("PA" | "ST" | "QL")[];
  additionalNote?: string;
}

export interface OverridePlacement {
  /** Overrides are placed either against a GPI or against a Catalog Code. */
  identifierType: "GPI" | "Catalog Code";
  identifier: string;
  authNumber?: string;
  createdAt?: string;
  effectiveFrom: string;
  effectiveTo: string;
  reasonCode: string;
  duplicateCleared?: boolean;
  placementError?: string;
}

export interface OverrideCase {
  id: string;
  caseId: string; // links to a MockCase id
  caseNumber: string;
  memberName: string;
  memberId: string;
  drugName: string;
  carrier: string;
  priority: "standard" | "expedited";
  /** Minutes left before the case is due. */
  remainingMinutes: number;
  status: OverrideStatus;
  claimedBy: string | null;
  approvedAt: string;
  updatedAt: string;
  /** Minutes elapsed since the case arrived from Case Review. */
  elapsedMinutes: number;
  decision: PharmacistDecision;
  override: OverridePlacement;
  claimA?: TestClaim;
  claimB?: TestClaim;
  claimNote?: string;
  /** Scheduled approval letter/fax send time (ISO), set on Confirm. */
  letterSendAt?: string;
  /** Snapshot used to undo a Confirm before the letter sends. */
  preConfirm?: { status: OverrideStatus; claimedBy: string | null };
}

export const currentOverrideTech = { id: "tech-1", name: "A. Rivera" };

export const OVERRIDE_STATUS_COLOR: Record<OverrideStatus, string> = {
  "In Review": "gold",
  "Unapplied Override": "error",
  "Rejected test claim": "error",
  "Override confirmed": "success",
};

export const OVERRIDE_STATUSES: OverrideStatus[] = ["In Review", "Unapplied Override", "Rejected test claim", "Override confirmed"];
export const ACTION_REQUIRED_STATUSES: OverrideStatus[] = ["In Review", "Unapplied Override", "Rejected test claim"];

export function isClaimable(status: OverrideStatus) {
  return ACTION_REQUIRED_STATUSES.includes(status);
}


const GPIS = [
  "27250030100320",
  "58200070100310",
  "22100010100320",
  "39400010100305",
  "66100025000320",
  "12100060100310",
];

const REASONS = ["PA-APPR", "MED-NEC", "FORM-EXC", "QL-OVR"];

const CATALOG_CODES = ["CAT-40192", "CAT-77310", "CAT-20884", "CAT-51126"];

const paid = (label: string, dos: string, auth: string, pay: string, total: string): TestClaim => ({
  label,
  dateOfService: dos,
  status: "PAID",
  patientPay: pay,
  totalPaid: total,
  authNumber: auth,
});

const rejected = (label: string, dos: string, rejects: RejectCode[]): TestClaim => ({
  label,
  dateOfService: dos,
  status: "REJECTED",
  patientPay: "—",
  totalPaid: "$0.00",
  rejects,
});

const APPROVAL_MIX: ("PA" | "ST" | "QL")[][] = [["PA"], ["PA", "QL"], ["PA", "ST"], ["PA"], ["ST"], ["PA", "ST", "QL"], ["QL"], ["PA"]];
const REMAINING = [45, 180, 600, 90, 1500, 30, 2880, 300];

const TODAY = "Today";
const PLUS30 = "Today + 30 days";

interface Seed {
  status: OverrideStatus;
  claimedByTech?: boolean;
  approvedAt: string;
  updatedAt: string;
  elapsedMinutes: number;
  duplicateCleared?: boolean;
  placementError?: string;
  claimA?: TestClaim;
  claimB?: TestClaim;
  claimNote?: string;
}

const SEEDS: Seed[] = [
  {
    status: "In Review",
    approvedAt: "Today 07:31",
    updatedAt: "12 min ago",
    elapsedMinutes: 12,
    claimA: paid("Claim A", TODAY, "AUTH-882401", "$25.00", "$1,204.18"),
    claimB: paid("Claim B", PLUS30, "AUTH-882402", "$25.00", "$1,204.18"),
  },
  {
    status: "In Review",
    approvedAt: "Today 07:02",
    updatedAt: "28 min ago",
    elapsedMinutes: 28,
    duplicateCleared: true,
    claimA: paid("Claim A", TODAY, "AUTH-882455", "$40.00", "$862.30"),
    claimB: paid("Claim B", PLUS30, "AUTH-882456", "$40.00", "$862.30"),
  },
  {
    status: "In Review",
    approvedAt: "Today 06:44",
    updatedAt: "35 min ago",
    elapsedMinutes: 35,
    claimA: paid("Claim A", TODAY, "AUTH-882470", "$0.00", "$2,455.00"),
    claimB: paid("Claim B", PLUS30, "AUTH-882471", "$0.00", "$2,455.00"),
  },
  {
    status: "In Review",
    approvedAt: "Today 06:10",
    updatedAt: "48 min ago",
    elapsedMinutes: 48,
    claimA: rejected("Claim A", TODAY, [{ code: "79", message: "REFILL TOO SOON" }]),
    claimB: paid("Claim B", PLUS30, "AUTH-882499", "$35.00", "$998.75"),
  },
  {
    status: "Rejected test claim",
    approvedAt: "Yesterday 16:44",
    updatedAt: "2 hr ago",
    elapsedMinutes: 120,
    claimA: rejected("Claim A", TODAY, [
      { code: "75", message: "PRIOR AUTHORIZATION NEEDED" },
    ]),
    claimB: rejected("Claim B", PLUS30, [
      { code: "75", message: "PRIOR AUTHORIZATION NEEDED" },
    ]),
  },
  {
    status: "Rejected test claim",
    approvedAt: "Yesterday 15:02",
    updatedAt: "3 hr ago",
    elapsedMinutes: 180,
    claimA: rejected("Claim A", TODAY, [
      { code: "7D", message: "NO PATIENT MATCH" },
      { code: "N1", message: "NO PATIENT MATCH" },
    ]),
    claimB: rejected("Claim B", PLUS30, [
      { code: "7D", message: "NO PATIENT MATCH" },
      { code: "N1", message: "NO PATIENT MATCH" },
    ]),
  },
  {
    status: "Unapplied Override",
    approvedAt: "Yesterday 14:20",
    updatedAt: "4 hr ago",
    elapsedMinutes: 240,
    placementError: "Placement failed — HTTP 500 (gateway timeout).",
  },
  {
    status: "In Review",
    approvedAt: "Yesterday 11:20",
    updatedAt: "Yesterday",
    elapsedMinutes: 1455,
    claimedByTech: true,
    claimA: paid("Claim A", TODAY, "AUTH-881120", "$15.00", "$540.00"),
    claimB: paid("Claim B", PLUS30, "AUTH-881121", "$15.00", "$540.00"),
  },
];

function sourceCases(): MockCase[] {
  const approved = mockCases.filter((c) => c.status === "Approved");
  const pool = approved.length >= SEEDS.length ? approved : mockCases;
  return Array.from({ length: SEEDS.length }, (_, i) => pool[i % pool.length]);
}

export const mockOverrideCases: OverrideCase[] = sourceCases().map((c, i) => {
  const s = SEEDS[i];
  const gpi = GPIS[i % GPIS.length];
  const reason = REASONS[i % REASONS.length];
  const qty = c.quantity || "30";
  // Every third override is placed against a Catalog Code rather than a GPI.
  const usesCatalogCode = i % 3 === 2;
  return {
    id: `ovr-${c.id}-${i}`,
    caseId: c.id,
    caseNumber: `CASE-${String(c.id).replace(/\D/g, "").slice(0, 5)}`,
    memberName: c.memberName,
    memberId: c.memberId,
    drugName: c.drugName,
    carrier: c.client,
    priority: c.priority,
    remainingMinutes: REMAINING[i % REMAINING.length],
    status: s.status,
    claimedBy: s.claimedByTech ? currentOverrideTech.id : null,
    approvedAt: s.approvedAt,
    updatedAt: s.updatedAt,
    decision: {
      drugName: c.drugName,
      gpi,
      quantity: qty,
      daysSupply: "30",
      authStart: "Sep 11, 2026",
      authEnd: "Mar 11, 2027",
      reasonCode: reason,
      approvalTypes: APPROVAL_MIX[i % APPROVAL_MIX.length],
    },
    override: {
      identifierType: usesCatalogCode ? "Catalog Code" : "GPI",
      identifier: usesCatalogCode ? CATALOG_CODES[i % CATALOG_CODES.length] : gpi,
      authNumber: String(882401 + i),
      createdAt: `2026-11-${i < 4 ? "05" : "04"}T${["07:35:12", "07:06:24", "06:48:36", "06:14:48", "16:48:12", "15:06:24", "14:24:36", "11:24:48"][i]}-05:00`,
      effectiveFrom: "Sep 11, 2026",
      effectiveTo: "Mar 11, 2027",
      reasonCode: "Other",
      duplicateCleared: s.duplicateCleared,
      placementError: s.placementError,
    },
    elapsedMinutes: s.elapsedMinutes,
    claimA: s.claimA ? { ...s.claimA, cid: String(282047531 + i * 2) } : undefined,
    claimB: s.claimB ? { ...s.claimB, cid: String(282047532 + i * 2) } : undefined,
    claimNote: s.claimNote,
  };
});

export function getCaseById(caseId: string): MockCase | undefined {
  return mockCases.find((c) => c.id === caseId);
}
