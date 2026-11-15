import dayjs from "dayjs";

export type CaseStatus =
  | "Received"
  | "Tech Review"
  | "Ready for Clinical Review"
  | "RFI"
  | "Approved"
  | "Denied"
  | "Withdrawn"
  | "Dismissed";


export type CaseSubState =
  | "Copilot Reviewed - Unclaimed"
  | "Copilot Reviewed - Claimed"
  | "Manual Review Needed - Unclaimed"
  | "Manual Review Needed - Claimed";

export type CasePriority = "standard" | "expedited";
export type CaseSource = "RUM" | "MHK";
export type CaseRequestReason = "Prior Authorization" | "Non-Formulary";
export type CaseRequestSource = "Fax" | "Electronic" | "Portal";


export interface MockCase {
  id: string;
  memberName: string;
  memberId: string;
  drugName: string;
  drugClass: string;
  client: string;
  status: CaseStatus;
  subState: CaseSubState | null;
  priority: CasePriority;
  claimedBy: string | null;
  claimedAt: string | null;
  remainingMinutes: number | null;
  dueAt: string | null;
  source: CaseSource;
  receivedAt: string;
  techReviewAt: string | null;
  readyForClinicalReviewAt: string | null;
  rfiAt: string | null;
  decidedAt: string | null;
  requestType: string;
  requestReason: CaseRequestReason;
  requestSource: CaseRequestSource;
  ndc: string;
  quantity: string;
  providerName: string;
  providerPhone: string;
  providerFax: string;
}

export const CLIENTS = [
  "Mayo Clinic",
  "Acme Health",
  "Bluestone Plan",
  "Cobalt Co",
  "Delta Group",
];

export const STATUSES: CaseStatus[] = [
  "Received",
  "Tech Review",
  "Ready for Clinical Review",
  "RFI",
  "Approved",
  "Denied",
  "Withdrawn",
  "Dismissed",
];

export const PRIORITIES: CasePriority[] = ["standard", "expedited"];
export const CLAIM_STATES = ["claimed", "unclaimed"] as const;

const SUB_STATES: CaseSubState[] = [
  "Copilot Reviewed - Unclaimed",
  "Copilot Reviewed - Claimed",
  "Manual Review Needed - Unclaimed",
  "Manual Review Needed - Claimed",
];

const FIRST_NAMES = [
  "Emily","Michael","Sarah","David","Jessica","Christopher","Amanda","Daniel",
  "Ashley","Matthew","Jennifer","Joshua","Brittany","Andrew","Megan","Justin",
  "Rosa","Carlos","Linda","Robert","Patricia","James","Mary","John","Barbara",
  "William","Susan","Richard","Karen","Thomas","Nancy","Mark","Lisa","Paul",
];
const LAST_NAMES = [
  "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis",
  "Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Wilson","Anderson",
  "Thomas","Taylor","Moore","Jackson","Martin","Lee","Perez","Thompson",
  "White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson","Walker",
];
const DRUGS: Array<[string, string]> = [
  ["Ozempic", "GLP-1 Agonist"],
  ["Mounjaro", "GLP-1 Agonist"],
  ["Wegovy", "GLP-1 Agonist"],
  ["Humira", "TNF Inhibitor"],
  ["Enbrel", "TNF Inhibitor"],
  ["Stelara", "Interleukin Inhibitor"],
  ["Dupixent", "Interleukin Inhibitor"],
  ["Eliquis", "Anticoagulant"],
  ["Xarelto", "Anticoagulant"],
  ["Jardiance", "SGLT2 Inhibitor"],
  ["Trulicity", "GLP-1 Agonist"],
  ["Repatha", "PCSK9 Inhibitor"],
  ["Cosentyx", "Interleukin Inhibitor"],
  ["Skyrizi", "Interleukin Inhibitor"],
  ["Rinvoq", "JAK Inhibitor"],
  ["Xeljanz", "JAK Inhibitor"],
  ["Botox", "Neurotoxin"],
  ["Entyvio", "Integrin Inhibitor"],
];
const REVIEWERS = [
  "Dr. Allen","Dr. Chen","Dr. Patel","J. Murphy","K. Reyes","S. Okafor",
  "T. Nguyen","M. Goldberg",
];
const REQUEST_REASONS: CaseRequestReason[] = ["Prior Authorization", "Non-Formulary"];
const REQUEST_SOURCES: CaseRequestSource[] = ["Fax", "Electronic", "Portal"];
const NDCs = ["00024555601", "00169461715", "00093503001", "00597002001", "00173023301"];
const PROVIDERS = [
  "Dr. Amanda Foster",
  "Dr. Michael Torres, MD",
  "Dr. Sarah Chen",
  "Dr. James Patel",
  "Dr. Emily Rodriguez",
  "Dr. David Kim",
  "Dr. Lisa Nguyen",
];

// Simple seeded RNG so the dataset is stable across reloads.
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const pickWeighted = <T,>(entries: Array<[T, number]>): T => {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [v, w] of entries) {
    if ((r -= w) <= 0) return v;
  }
  return entries[entries.length - 1][0];
};

const STATUS_WEIGHTS: Array<[CaseStatus, number]> = [
  ["Received", 15],
  ["Tech Review", 15],
  ["Ready for Clinical Review", 30],
  ["RFI", 10],
  ["Approved", 15],
  ["Denied", 10],
  ["Withdrawn", 5],
  ["Dismissed", 5],
];

const FINAL_STATUSES = new Set<CaseStatus>([
  "Approved","Denied","Withdrawn","Dismissed",
]);

function generate(): MockCase[] {
  const out: MockCase[] = [];
  const now = dayjs();
  for (let i = 0; i < 500; i++) {
    const status = pickWeighted(STATUS_WEIGHTS);
    const priority: CasePriority = rand() < 0.18 ? "expedited" : "standard";
    const [drugName, drugClass] = pick(DRUGS);
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);

    // receivedAt: spread across last 18 months
    const receivedAt = now
      .subtract(Math.floor(rand() * 18 * 30), "day")
      .subtract(Math.floor(rand() * 24), "hour")
      .toISOString();

    const isFinal = FINAL_STATUSES.has(status);
    const decidedAt = isFinal
      ? dayjs(receivedAt).add(1 + Math.floor(rand() * 240), "hour").toISOString()
      : null;

    // State-transition timestamps (per case timeline logic).
    // RFI/Approved/Denied can only happen from Ready for Clinical Review.
    // Withdrawn/Dismissed can happen any time, so we use the generic decidedAt.
    const techReviewAt =
      status === "Received"
        ? null
        : dayjs(receivedAt).add(1 + Math.floor(rand() * 12), "hour").toISOString();
    const readyForClinicalReviewAt =
      !techReviewAt || status === "Tech Review"
        ? null
        : dayjs(techReviewAt).add(1 + Math.floor(rand() * 24), "hour").toISOString();
    const rfiAt =
      status === "RFI" && readyForClinicalReviewAt
        ? dayjs(readyForClinicalReviewAt).add(1 + Math.floor(rand() * 48), "hour").toISOString()
        : null;

    const dueAt = isFinal
      ? null
      : now.add(Math.floor(rand() * 96) - 24, "hour").toISOString();
    const remainingMinutes = isFinal
      ? null
      : dayjs(dueAt!).diff(now, "minute");

    let subState: CaseSubState | null = null;
    let claimedBy: string | null = null;
    let claimedAt: string | null = null;
    if (status === "Ready for Clinical Review") {
      subState = pick(SUB_STATES);
      if (subState.includes("Claimed")) {
        claimedBy = pick(REVIEWERS);
        claimedAt = dayjs(readyForClinicalReviewAt ?? receivedAt)
          .add(1 + Math.floor(rand() * 48), "hour")
          .toISOString();
      }
    } else if (status === "RFI" || isFinal) {
      if (rand() < 0.6) {
        claimedBy = pick(REVIEWERS);
        const base = rfiAt ?? readyForClinicalReviewAt ?? techReviewAt ?? receivedAt;
        const maxClaimHour = decidedAt
          ? Math.max(1, dayjs(decidedAt).diff(base, "hour") - 1)
          : 240;
        claimedAt = dayjs(base)
          .add(1 + Math.floor(rand() * maxClaimHour), "hour")
          .toISOString();
      }
    }


    out.push({
      id: `RX-${3000000 + Math.floor(rand() * 999999)}`,
      memberName: `${first} ${last}`,
      memberId: `M${100000 + Math.floor(rand() * 899999)}`,
      drugName,
      drugClass,
      client: pick(CLIENTS),
      status,
      subState,
      priority,
      claimedBy,
      claimedAt,
      remainingMinutes,
      dueAt,
      source: "RUM",
      receivedAt,
      techReviewAt,
      readyForClinicalReviewAt,
      rfiAt,
      decidedAt,
      requestType: "Organization Determination",
      requestReason: pickWeighted([
        ["Prior Authorization", 85],
        ["Non-Formulary", 15],
      ]),
      requestSource: pick(REQUEST_SOURCES),
      ndc: pick(NDCs),
      quantity: String(1 + Math.floor(rand() * 3)),
      providerName: pick(PROVIDERS),
      providerPhone: `(${[2,0,3].map(() => Math.floor(rand() * 10)).join("")}) ${[4,4,5].map(() => Math.floor(rand() * 10)).join("")}-${[8,8,2,0].map(() => Math.floor(rand() * 10)).join("")}`,
      providerFax: `(${[5,5,5].map(() => Math.floor(rand() * 10)).join("")}) ${[4,3,2].map(() => Math.floor(rand() * 10)).join("")}-${[1,0,9,9].map(() => Math.floor(rand() * 10)).join("")}`,
    });
  }
  return out;
}

export const mockCases: MockCase[] = generate();
