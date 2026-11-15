export type IntakeSource = "Fax" | "Electronic" | "Phone" | "Email" | "Web" | "Mail";
export type IntakeQueueKey = "raw" | "unassigned" | "rfi";
export type IntakeStatus = "overdue" | "manual" | "waiting";

// Mocked "current tech" identity. No auth yet — this stands in for the signed-in
// pharmacy technician so we can demonstrate the "My cases" queue.
export const currentTech = { id: "tech-1", name: "You" } as const;

export interface MemberRecord {
  id: string;
  name: string;
  dob: string;
  memberId: string;
  personCode: string;
  carrier: string;
  plan: string;
  group: string;
  effectiveDate: string;
  termDate?: string;
  address?: MailingAddress;
}

export interface MailingAddress { line1: string; line2: string; city: string; state: string; zip: string; }

export interface DrugRecord {
  id: string;
  name: string;
  ndc: string;
  strength: string;
  form: string;
  gpi14?: string;
  route?: string;
}

export interface PriorCase {
  id: string;
  caseNumber: string;
  date: string;
  drug: string;
  outcome: string;
  fields: {
    notes?: string;
    diagnosis?: string;
    quantity?: string;
    daysSupply?: string;
  };
}

export interface IntakeCase {
  id: string;
  transactionId: string; // fax intake ID or e-request ID
  caseNumber?: string; // assigned once confirmed
  source: IntakeSource;
  queue: IntakeQueueKey;
  status: IntakeStatus;
  /** null = unclaimed and visible in the shared queue. Otherwise the tech id that owns it. */
  claimedBy: string | null;
  receivedAt: string;
  // Drug / member hints (from OCR / e-request)
  drugHint: string;
  memberHint: string | null; // null = unidentified (raw fax)
  bestGuessMemberId?: string;
  bestGuessDrugId?: string;
  bestGuessDiagnosis?: string;
  bestGuessQuantity?: string;
  bestGuessDaysSupply?: string;
  bestGuessDirections?: string;
  priorCaseIds?: string[];
  /** Manually created intake saved before chart notes arrived. */
  isDraft?: boolean;
  /** Created inline in My cases; never released into the shared Intake tab. */
  isManualIntake?: boolean;
  chartNoteFiles?: string[];
  intakeNotes?: string;
  mixedPatient?: { mismatchedPages: { page: number; patientName: string }[] };
  // Unassigned queue: test-claim outcome preview shown in queue + middle panel.
  testOutcome?:
    | "pa_required"
    | "non_formulary"
    | "excluded"
    | "step_therapy"
    | "quantity_limit"
    | "paid_unexpected";
  // RFI-specific
  rfi?: {
    requestedAt: string;
    dueAt: string;
    remaining: string;
    requestedFields: string[];
    note: string;
  };
}

export const mockMemberDirectory: MemberRecord[] = [
  { id: "m1", name: "Rosa Delgado", dob: "1953-10-15", memberId: "MHK-88214", personCode: "01", carrier: "Mayo Clinic", plan: "Commercial PPO", group: "GRP-4402", effectiveDate: "2024-01-01", address: { line1: "4120 Mesa Verde Dr", line2: "Apt 2B", city: "Rochester", state: "MN", zip: "55901" } },
  { id: "m2", name: "Marcus Bell", dob: "1979-04-02", memberId: "MHK-77190", personCode: "01", carrier: "BCBS", plan: "Federal Employee", group: "GRP-1120", effectiveDate: "2022-07-01", address: { line1: "88 Harbor St", line2: "", city: "Baltimore", state: "MD", zip: "21202" } },
  { id: "m3", name: "Priya Shah", dob: "1988-11-23", memberId: "MHK-90512", personCode: "02", carrier: "Aetna", plan: "Choice POS II", group: "GRP-3308", effectiveDate: "2023-01-01", address: { line1: "1501 Oak Park Ave", line2: "Unit 304", city: "Chicago", state: "IL", zip: "60614" } },
  { id: "m4", name: "Kenji Watanabe", dob: "1965-06-18", memberId: "MHK-66741", personCode: "01", carrier: "UHC", plan: "Choice Plus", group: "GRP-2205", effectiveDate: "2020-03-15", address: { line1: "672 Cedar Ln", line2: "", city: "Seattle", state: "WA", zip: "98103" } },
  { id: "m5", name: "Elena Ramirez", dob: "1992-01-30", memberId: "MHK-55302", personCode: "03", carrier: "Cigna", plan: "Open Access Plus", group: "GRP-7781", effectiveDate: "2024-06-01", address: { line1: "2290 Palm Ct", line2: "", city: "Miami", state: "FL", zip: "33130" } },
  { id: "m6", name: "David Nguyen", dob: "1971-08-09", memberId: "MHK-44821", personCode: "01", carrier: "Humana", plan: "Gold Plus HMO", group: "GRP-9911", effectiveDate: "2021-11-01", termDate: "2026-12-31", address: { line1: "915 Riverbend Rd", line2: "Suite 12", city: "Louisville", state: "KY", zip: "40202" } },
  { id: "m7", name: "Sarah Chen", dob: "1985-03-12", memberId: "MHK-77341", personCode: "01", carrier: "BCBS", plan: "PPO Select", group: "GRP-5521", effectiveDate: "2023-04-01", address: { line1: "33 Maple Ave", line2: "", city: "Boston", state: "MA", zip: "02116" } },
  { id: "m8", name: "Marcus Webb", dob: "1978-11-02", memberId: "MHK-64210", personCode: "01", carrier: "Aetna", plan: "Open Access", group: "GRP-6602", effectiveDate: "2022-01-01", address: { line1: "7400 Lakeview Blvd", line2: "Apt 9", city: "Hartford", state: "CT", zip: "06103" } },
];


export const mockDrugDirectory: DrugRecord[] = [
  { id: "d1", name: "Ozempic (semaglutide)", ndc: "0169-4132-12", strength: "1 mg/0.74 mL", form: "Injection Pen", gpi14: "27997050100320", route: "Subcutaneous" },
  { id: "d1b", name: "Ozempic (semaglutide)", ndc: "0169-4181-12", strength: "0.5 mg/0.37 mL", form: "Injection Pen", gpi14: "27997050100310", route: "Subcutaneous" },
  { id: "d2", name: "Humira (adalimumab)", ndc: "0074-4339-02", strength: "40 mg/0.4 mL", form: "Injection Pen", gpi14: "21504040102120", route: "Subcutaneous" },
  { id: "d3", name: "Dupixent (dupilumab)", ndc: "0024-5591-01", strength: "300 mg/2 mL", form: "Prefilled Syringe", gpi14: "21504060102040", route: "Subcutaneous" },
  { id: "d4", name: "Zepbound (tirzepatide)", ndc: "0002-1495-80", strength: "5 mg/0.5 mL", form: "Injection Pen", gpi14: "27997055100330", route: "Subcutaneous" },
  { id: "d4b", name: "Zepbound (tirzepatide)", ndc: "0002-1494-80", strength: "2.5 mg/0.5 mL", form: "Injection Pen", gpi14: "27997055100320", route: "Subcutaneous" },
  { id: "d5", name: "Rinvoq (upadacitinib)", ndc: "0074-2306-30", strength: "15 mg", form: "Oral Tablet ER", gpi14: "21504092000320", route: "Oral" },
  { id: "d6", name: "Wegovy (semaglutide)", ndc: "0169-5842-14", strength: "2.4 mg/0.75 mL", form: "Injection Pen", gpi14: "27997050100420", route: "Subcutaneous" },
  { id: "d7", name: "Trulicity (dulaglutide)", ndc: "0002-1433-80", strength: "1.5 mg/0.5 mL", form: "Injection Pen", gpi14: "27997050200310", route: "Subcutaneous" },
  { id: "d1c", name: "Ozempic (semaglutide)", ndc: "0169-4132-15", strength: "1 mg/3 mL", form: "Injection Pen", gpi14: "27997050100321", route: "Subcutaneous" },
];

export const mockPriorCases: Record<string, PriorCase[]> = {
  m1: [
    {
      id: "pc1",
      caseNumber: "PA-2025-118440",
      date: "2025-11-04",
      drug: "Ozempic 0.5 mg",
      outcome: "Approved",
      fields: {
        notes: "Member trialed metformin + glimepiride. A1c 8.1%.",
        diagnosis: "Type 2 diabetes with neuropathy (E11.40)",
        quantity: "2 pens",
        daysSupply: "28",
      },
    },
    {
      id: "pc2",
      caseNumber: "PA-2025-092103",
      date: "2025-05-19",
      drug: "Ozempic 0.25 mg",
      outcome: "Approved",
      fields: {
        notes: "Initial titration dose. Endo consult on file.",
        diagnosis: "Type 2 diabetes mellitus",
        quantity: "1 pen",
        daysSupply: "28",
      },
    },
  ],
  m2: [
    {
      id: "pc3",
      caseNumber: "PA-2025-104520",
      date: "2025-09-12",
      drug: "Humira 40 mg",
      outcome: "Approved",
      fields: {
        notes: "Failed methotrexate 3 months. Rheum note attached.",
        diagnosis: "Rheumatoid arthritis (M06.9)",
        quantity: "2 pens",
        daysSupply: "28",
      },
    },
  ],
  m4: [
    {
      id: "pc4",
      caseNumber: "PA-2025-131802",
      date: "2025-12-01",
      drug: "Dupixent 300 mg",
      outcome: "Approved",
      fields: {
        notes: "Severe atopic dermatitis, failed topical steroids.",
        diagnosis: "Atopic dermatitis (L20.9)",
        quantity: "2 syringes",
        daysSupply: "28",
      },
    },
  ],
  m5: [
    {
      id: "pc5",
      caseNumber: "PA-2026-004120",
      date: "2026-04-22",
      drug: "Zepbound 2.5 mg",
      outcome: "Approved",
      fields: {
        notes: "Initial titration dose. BMI 34.2. Failed 6-mo lifestyle program documented.",
        diagnosis: "Obesity (E66.9)",
        quantity: "1 pen",
        daysSupply: "28",
      },
    },
    {
      id: "pc6",
      caseNumber: "PA-2025-118902",
      date: "2025-11-15",
      drug: "Wegovy 1.7 mg",
      outcome: "Discontinued",
      fields: {
        notes: "Member switched off Wegovy due to GI intolerance; provider transitioning to Zepbound.",
        diagnosis: "Obesity (E66.9)",
        quantity: "1 pen",
        daysSupply: "28",
      },
    },
    {
      id: "pc7",
      caseNumber: "PA-2025-097745",
      date: "2025-07-08",
      drug: "Wegovy 0.5 mg",
      outcome: "Approved",
      fields: {
        notes: "Initial GLP-1 for weight management. BMI 35.1, comorbid HTN.",
        diagnosis: "Obesity with hypertension (E66.9, I10)",
        quantity: "1 pen",
        daysSupply: "28",
      },
    },
    {
      id: "pc8",
      caseNumber: "PA-2025-064210",
      date: "2025-03-02",
      drug: "Saxenda 3 mg",
      outcome: "Denied",
      fields: {
        notes: "Denied for insufficient documentation of 6-month lifestyle modification program.",
        diagnosis: "Obesity (E66.9)",
        quantity: "5 pens",
        daysSupply: "30",
      },
    },
    {
      id: "pc9",
      caseNumber: "PA-2024-118033",
      date: "2024-11-18",
      drug: "Contrave 8/90 mg",
      outcome: "Discontinued",
      fields: {
        notes: "Member discontinued after 8 weeks due to persistent nausea and insomnia. No meaningful weight change.",
        diagnosis: "Obesity (E66.9)",
        quantity: "120 tablets",
        daysSupply: "30",
      },
    },
    {
      id: "pc10",
      caseNumber: "PA-2024-090217",
      date: "2024-08-05",
      drug: "Phentermine 37.5 mg",
      outcome: "Approved",
      fields: {
        notes: "Short-term monotherapy trial. BP monitored; discontinued at 12 weeks per label.",
        diagnosis: "Obesity (E66.9)",
        quantity: "30 tablets",
        daysSupply: "30",
      },
    },
    {
      id: "pc11",
      caseNumber: "PA-2024-051188",
      date: "2024-05-14",
      drug: "Ozempic 0.5 mg",
      outcome: "Denied",
      fields: {
        notes: "Denied — off-label for weight loss without T2DM diagnosis on file at time of request.",
        diagnosis: "Obesity (E66.9)",
        quantity: "1 pen",
        daysSupply: "28",
      },
    },
  ],
};


export const mockIntakeCases: IntakeCase[] = [
  // ---- Raw intake ----
  {
    id: "intake-1",
    transactionId: "FAX-88123",
    mixedPatient: { mismatchedPages: [{ page: 3, patientName: "Marcus Webb" }] },
    source: "Fax",
    queue: "raw",
    status: "overdue",
    claimedBy: null,
    receivedAt: "2026-07-13 08:12 AM",
    drugHint: "Ozempic",
    memberHint: "Rosa Delgado",
    bestGuessMemberId: "m1",
    bestGuessDrugId: "d1",
    bestGuessDiagnosis: "Type 2 diabetes with neuropathy (E11.40)",
    bestGuessQuantity: "2 pens",
    bestGuessDaysSupply: "28",
    bestGuessDirections: "Inject 1 mg subcutaneously once weekly",
    priorCaseIds: ["pc1", "pc2"],
  },
  {
    id: "intake-2",
    transactionId: "FAX-88124",
    source: "Fax",
    queue: "raw",
    status: "manual",
    claimedBy: null,
    receivedAt: "2026-07-13 09:47 AM",
    drugHint: "Unclear (fax)",
    memberHint: null,
    bestGuessDirections: "Illegible sig",
  },
  {
    id: "intake-3",
    transactionId: "CMM-450012",
    source: "Electronic",
    queue: "raw",
    status: "manual",
    claimedBy: null,
    receivedAt: "2026-07-13 09:02 AM",
    drugHint: "Humira",
    memberHint: "Marcus Bell (mismatch)",
    bestGuessMemberId: "m2",
    bestGuessDrugId: "d2",
    bestGuessDiagnosis: "Rheumatoid arthritis",
    bestGuessQuantity: "2 pens",
    bestGuessDaysSupply: "28",
  },
  {
    id: "intake-4",
    transactionId: "FAX-88129",
    source: "Fax",
    queue: "raw",
    status: "waiting",
    claimedBy: "tech-1",
    receivedAt: "2026-07-13 10:15 AM",
    drugHint: "Dupixent",
    memberHint: "Kenji Watanabe",
    bestGuessMemberId: "m4",
    bestGuessDrugId: "d3",
    bestGuessDiagnosis: "Atopic dermatitis",
    bestGuessQuantity: "2 syringes",
    bestGuessDaysSupply: "28",
    priorCaseIds: ["pc4"],
  },
  // ---- Unassigned ----
  {
    id: "intake-5",
    transactionId: "FAX-88101",
    caseNumber: "PA-2026-005010",
    source: "Fax",
    queue: "unassigned",
    status: "waiting",
    claimedBy: null,
    receivedAt: "2026-07-13 07:40 AM",
    drugHint: "Zepbound",
    memberHint: "Elena Ramirez",
    bestGuessMemberId: "m5",
    bestGuessDrugId: "d4",
    bestGuessDiagnosis: "Obesity (E66.9)",
    bestGuessQuantity: "1 pen",
    bestGuessDaysSupply: "28",
    priorCaseIds: ["pc5", "pc6", "pc7", "pc8"],
  },

  {
    id: "intake-6",
    transactionId: "CMM-450004",
    caseNumber: "PA-2026-005011",
    source: "Electronic",
    queue: "unassigned",
    status: "overdue",
    claimedBy: "tech-2",
    receivedAt: "2026-07-13 06:22 AM",
    drugHint: "Rinvoq",
    memberHint: "David Nguyen",
    bestGuessMemberId: "m6",
    bestGuessDrugId: "d5",
    bestGuessDiagnosis: "Rheumatoid arthritis",
    bestGuessQuantity: "30 tablets",
    bestGuessDaysSupply: "30",
  },
  {
    id: "intake-7",
    transactionId: "FAX-88132",
    caseNumber: "PA-2026-005012",
    source: "Fax",
    queue: "unassigned",
    status: "waiting",
    claimedBy: null,
    receivedAt: "2026-07-13 10:48 AM",
    drugHint: "Humira",
    memberHint: "Marcus Bell",
    bestGuessMemberId: "m2",
    bestGuessDrugId: "d2",
    bestGuessDiagnosis: "Rheumatoid arthritis (M06.9)",
    bestGuessQuantity: "2 pens",
    bestGuessDaysSupply: "28",
    priorCaseIds: ["pc3"],
  },
  {
    id: "intake-8",
    transactionId: "CMM-450019",
    caseNumber: "PA-2026-005013",
    source: "Electronic",
    queue: "unassigned",
    status: "manual",
    claimedBy: null,
    receivedAt: "2026-07-13 11:05 AM",
    drugHint: "Wegovy",
    memberHint: "Rosa Delgado",
    bestGuessMemberId: "m1",
    bestGuessDrugId: "d6",
    bestGuessDiagnosis: "Obesity (E66.9)",
    bestGuessQuantity: "1 pen",
    bestGuessDaysSupply: "28",
  },
  {
    id: "intake-9",
    transactionId: "CMM-450088",
    caseNumber: "CASE-2026-1204",
    source: "Electronic",
    queue: "unassigned",
    status: "waiting",
    claimedBy: "tech-1",
    receivedAt: "2026-07-20 08:30 AM",
    drugHint: "Trulicity",
    memberHint: "Sarah Chen",
    bestGuessMemberId: "m7",
    bestGuessDrugId: "d7",
    bestGuessDiagnosis: "Type 2 diabetes mellitus (E11.9)",
    bestGuessQuantity: "4 pens",
    bestGuessDaysSupply: "28",
    testOutcome: "pa_required",
  },
  {
    id: "intake-10",
    transactionId: "FAX-88210",
    caseNumber: "CASE-2026-1198",
    source: "Fax",
    queue: "unassigned",
    status: "manual",
    claimedBy: null,
    receivedAt: "2026-07-19 02:15 PM",
    drugHint: "Ozempic",
    memberHint: "Marcus Webb",
    bestGuessMemberId: "m8",
    bestGuessDrugId: "d1c",
    bestGuessDiagnosis: "Type 2 diabetes mellitus (E11.9)",
    bestGuessQuantity: "1 pen",
    bestGuessDaysSupply: "28",
    testOutcome: "paid_unexpected",
  },
  {
    id: "intake-nf1",
    transactionId: "CMM-450101",
    caseNumber: "CASE-2026-1211",
    source: "Electronic",
    queue: "unassigned",
    status: "waiting",
    claimedBy: "tech-1",
    receivedAt: "2026-07-28 09:12 AM",
    drugHint: "Dupixent",
    memberHint: "Kenji Watanabe",
    bestGuessMemberId: "m4",
    bestGuessDrugId: "d3",
    bestGuessDiagnosis: "Atopic dermatitis (L40.50)",
    bestGuessQuantity: "2 syringes",
    bestGuessDaysSupply: "28",
    testOutcome: "non_formulary",
  },
  {
    id: "intake-ex1",
    transactionId: "FAX-88301",
    caseNumber: "CASE-2026-1212",
    source: "Fax",
    queue: "unassigned",
    status: "waiting",
    claimedBy: "tech-1",
    receivedAt: "2026-07-28 11:44 AM",
    drugHint: "Wegovy",
    memberHint: "Elena Ramirez",
    bestGuessMemberId: "m5",
    bestGuessDrugId: "d6",
    bestGuessDiagnosis: "Obesity (E66.9)",
    bestGuessQuantity: "1 pen",
    bestGuessDaysSupply: "28",
    testOutcome: "excluded",
  },
  {
    id: "intake-st1",
    transactionId: "CMM-450115",
    caseNumber: "CASE-2026-1213",
    source: "Electronic",
    queue: "unassigned",
    status: "waiting",
    claimedBy: "tech-1",
    receivedAt: "2026-07-29 08:05 AM",
    drugHint: "Zepbound",
    memberHint: "Rosa Delgado",
    bestGuessMemberId: "m1",
    bestGuessDrugId: "d4",
    bestGuessDiagnosis: "Type 2 diabetes mellitus (E11.9)",
    bestGuessQuantity: "1 pen",
    bestGuessDaysSupply: "28",
    testOutcome: "step_therapy",
  },
  {
    id: "intake-ql1",
    transactionId: "FAX-88322",
    caseNumber: "CASE-2026-1214",
    source: "Fax",
    queue: "unassigned",
    status: "waiting",
    claimedBy: "tech-1",
    receivedAt: "2026-07-29 03:31 PM",
    drugHint: "Ozempic",
    memberHint: "Marcus Bell",
    bestGuessMemberId: "m2",
    bestGuessDrugId: "d1",
    bestGuessDiagnosis: "Type 2 diabetes mellitus (E11.9)",
    bestGuessQuantity: "3 pens",
    bestGuessDaysSupply: "30",
    testOutcome: "quantity_limit",
  },

  {
    id: "intake-11",
    transactionId: "PHN-77001",
    source: "Phone",
    queue: "raw",
    status: "manual",
    claimedBy: null,
    receivedAt: "2026-07-13 11:22 AM",
    drugHint: "Trulicity",
    memberHint: "Sarah Chen",
    bestGuessMemberId: "m7",
    bestGuessDrugId: "d7",
    bestGuessDiagnosis: "Type 2 diabetes mellitus (E11.9)",
    bestGuessQuantity: "4 pens",
    bestGuessDaysSupply: "28",
  },
  {
    id: "intake-12",
    transactionId: "EML-55220",
    source: "Email",
    queue: "raw",
    status: "waiting",
    claimedBy: null,
    receivedAt: "2026-07-13 12:04 PM",
    drugHint: "Rinvoq",
    memberHint: "David Nguyen",
    bestGuessMemberId: "m6",
    bestGuessDrugId: "d5",
    bestGuessDiagnosis: "Rheumatoid arthritis",
    bestGuessQuantity: "30 tablets",
    bestGuessDaysSupply: "30",
  },
  {
    id: "intake-13",
    transactionId: "WEB-30188",
    source: "Web",
    queue: "raw",
    status: "waiting",
    claimedBy: null,
    receivedAt: "2026-07-13 12:31 PM",
    drugHint: "Wegovy",
    memberHint: "Elena Ramirez",
    bestGuessMemberId: "m5",
    bestGuessDrugId: "d6",
    bestGuessDiagnosis: "Obesity (E66.9)",
    bestGuessQuantity: "1 pen",
    bestGuessDaysSupply: "28",
  },
  {
    id: "intake-14",
    transactionId: "MAIL-12045",
    source: "Mail",
    queue: "raw",
    status: "manual",
    claimedBy: null,
    receivedAt: "2026-07-13 09:00 AM",
    drugHint: "Humira",
    memberHint: "Marcus Bell",
    bestGuessMemberId: "m2",
    bestGuessDrugId: "d2",
    bestGuessDiagnosis: "Rheumatoid arthritis (M06.9)",
    bestGuessQuantity: "2 pens",
    bestGuessDaysSupply: "28",
    priorCaseIds: ["pc3"],
  },
];

/* ---------------- Member match candidates ----------------
   The fax match layer returns a ranked list of candidate members (1..N),
   each with a 0-100 match score and a short reason. */
export interface MemberCandidate {
  memberId: string; // MemberRecord.id
  score: number; // 0-100
  reason: string;
}

const memberCandidatesByCase: Record<string, MemberCandidate[]> = {
  "intake-1": [
    { memberId: "m1", score: 96, reason: "Name + DOB match" },
    { memberId: "m3", score: 71, reason: "Shared subscriber ID" },
    { memberId: "m5", score: 58, reason: "Name similarity only" },
    { memberId: "m7", score: 41, reason: "Partial DOB match" },
  ],
  "intake-4": [
    { memberId: "m4", score: 91, reason: "Shared subscriber ID" },
    { memberId: "m6", score: 63, reason: "Name + DOB collision" },
    { memberId: "m3", score: 45, reason: "Name similarity only" },
  ],
  "intake-2": [
    { memberId: "m2", score: 88, reason: "Name + DOB match" },
    { memberId: "m8", score: 74, reason: "Name + DOB collision" },
    { memberId: "m4", score: 52, reason: "Shared group number" },
  ],
};

/** Ranked candidate list for a given intake case, highest score first. */
export function getMemberCandidates(caseId: string, bestGuessMemberId?: string): MemberCandidate[] {
  const explicit = memberCandidatesByCase[caseId];
  if (explicit) return [...explicit].sort((a, b) => b.score - a.score);
  if (!bestGuessMemberId) return [];
  // Default: single high-confidence candidate.
  return [{ memberId: bestGuessMemberId, score: 93, reason: "Name + DOB match" }];
}

/* ---------------- Per-field extraction confidence ----------------
   The extractor emits a 0-100 confidence score for each auto-populated
   field. The UI compares these against a single configurable threshold. */
export type ExtractedFieldKey =
  | "memberName"
  | "memberDob"
  | "cardholderId"
  | "drugName"
  | "drugStrength"
  | "drugForm"
  | "drugNdc"
  | "quantity"
  | "daysSupply"
  | "diagnosis"
  | "directions";

export type ExtractionConfidence = Partial<Record<ExtractedFieldKey, number>>;

/** Baseline scores used when a case has no specific override. */
const defaultExtractionConfidence: Required<ExtractionConfidence> = {
  memberName: 96,
  memberDob: 94,
  cardholderId: 91,
  drugName: 95,
  drugStrength: 88,
  drugForm: 92,
  drugNdc: 90,
  quantity: 86,
  daysSupply: 89,
  diagnosis: 84,
  directions: 81,
};

/** Case-specific overrides. A couple of fields sit below the 70 threshold. */
const extractionConfidenceByCase: Record<string, ExtractionConfidence> = {
  "intake-1": { drugStrength: 54, cardholderId: 62, directions: 68 },
  "intake-2": { memberName: 41, cardholderId: 38, drugName: 44, drugStrength: 36 },
  "intake-3": { cardholderId: 57, quantity: 64 },
  "intake-4": { drugStrength: 66 },
  "intake-5": { drugStrength: 61, cardholderId: 69 },
  "intake-9": { diagnosis: 58 },
  "intake-10": { drugStrength: 49, quantity: 67 },
};

/** Confidence score (0-100) for a single extracted field on a case. */
export function getFieldConfidence(caseId: string, field: ExtractedFieldKey): number {
  return extractionConfidenceByCase[caseId]?.[field] ?? defaultExtractionConfidence[field];
}
