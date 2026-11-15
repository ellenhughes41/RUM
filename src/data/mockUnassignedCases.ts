export type TestClaimOutcome =
  | "pa_required"
  | "non_formulary"
  | "excluded"
  | "step_therapy"
  | "quantity_limit"
  | "paid_unexpected";

export interface PaHistoryRecord {
  id: string;
  drugName: string;
  status: "Active" | "Expired" | "Denied" | "Withdrawn";
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  current: boolean;
}

export interface UnassignedCase {
  id: string;
  caseNumber: string;
  memberName: string;
  memberId: string;
  drugName: string;
  drugStrength: string;
  receivedAt: string;
  claimedBy: string | null;
  returnedByPharmacist: boolean;
  returnReason?: string;
  /** Client/plan sponsor. True Data clients route Non-Formulary + appeals differently. */
  client: string;
  isTrueDataClient: boolean;
  isAppeal: boolean;
  testClaim: {
    outcome: TestClaimOutcome;
    runAt: string;
    /** Treium claim ID (CID) */
    claimId: string;
    rejectCode?: string;
    rejectReason?: string;
    /** Full list of NCPDP reject codes returned on the claim (may be several). */
    rejects?: Array<{ code: string; message: string }>;
    paidAmount?: string;
    requestedQuantity?: string;
    planLimitQuantity?: string;
  };
  paHistory: PaHistoryRecord[];
  suggestedDx: { code: string; label: string };
  /** Clinical-Review-style header + Case Details fields (optional). */
  memberDOB?: string;
  priority?: string;
  source?: string;
  ndc?: string;
  quantity?: string;
  daysSupply?: string;
  providerName?: string;
  diagnosis?: string;
}

/** Provider letter templates offered on RFI / Dismiss, keyed by test claim result. */
export const letterTemplatesByOutcome: Record<TestClaimOutcome, Array<{ value: string; label: string }>> = {
  pa_required: [
    { value: "tpl-pa-standard", label: "PA template — standard request" },
    { value: "tpl-pa-clinical", label: "PA template — clinical info needed" },
  ],
  non_formulary: [
    { value: "tpl-nf-standard", label: "Non-formulary template — standard" },
    { value: "tpl-nf-exception", label: "Non-formulary template — exception request" },
  ],
  excluded: [{ value: "tpl-excl-standard", label: "Excluded template — standard" }],
  step_therapy: [
    { value: "tpl-st-standard", label: "Step therapy template — standard" },
    { value: "tpl-st-history", label: "Step therapy template — trial history request" },
  ],
  quantity_limit: [{ value: "tpl-ql-standard", label: "Quantity limit template — standard" }],
  paid_unexpected: [{ value: "tpl-generic", label: "General notice template" }],
};

/** Mock formulary lookup used by the "Paid, unexpected" anomaly state. */
export const mockFormulary: Array<{
  drug: string;
  client: string;
  status: "Covered" | "Excluded" | "Non-formulary";
  tier: string;
}> = [
  { drug: "Humira", client: "DHL", status: "Covered", tier: "Tier 4 — Specialty" },
  { drug: "Humira", client: "RO", status: "Non-formulary", tier: "—" },
  { drug: "Wegovy", client: "DHL", status: "Excluded", tier: "—" },
  { drug: "Wegovy", client: "Northwind Health", status: "Covered", tier: "Tier 3" },
  { drug: "Ozempic", client: "Northwind Health", status: "Covered", tier: "Tier 2" },
  { drug: "Mounjaro", client: "Northwind Health", status: "Covered", tier: "Tier 3" },
  { drug: "Zepbound", client: "DHL", status: "Non-formulary", tier: "—" },
  { drug: "Enbrel", client: "RO", status: "Covered", tier: "Tier 4 — Specialty" },
];


export const currentTech = { id: "tech-1", name: "You" } as const;

export const mockUnassignedCases: UnassignedCase[] = [
  {
    id: "u1",
    caseNumber: "CASE-102394",
    memberName: "Elena Ramirez",
    memberId: "MHK-55302",
    drugName: "Wegovy",
    drugStrength: "2.4 mg/0.75 mL",
    receivedAt: "Today, 9:14 AM",
    claimedBy: null,
    returnedByPharmacist: false,
    client: "Northwind Health",
    isTrueDataClient: false,
    isAppeal: false,
    testClaim: {
      outcome: "pa_required",
      runAt: "Today, 9:19 AM",
      claimId: "CID-8841207",
      rejectCode: "75",
      rejectReason: "Prior Authorization Required",
    },
    paHistory: [
      {
        id: "pa-1",
        drugName: "Saxenda 3 mg",
        status: "Expired",
        startDate: "2025-02-01",
        endDate: "2026-02-01",
        current: false,
      },
    ],
    suggestedDx: { code: "E66.9", label: "Obesity, unspecified" },
  },
  {
    id: "u2",
    caseNumber: "CASE-102401",
    memberName: "Marcus Bell",
    memberId: "MHK-77190",
    drugName: "Humira",
    drugStrength: "40 mg/0.4 mL",
    receivedAt: "Today, 8:42 AM",
    claimedBy: null,
    returnedByPharmacist: false,
    client: "DHL",
    isTrueDataClient: true,
    isAppeal: false,
    testClaim: {
      outcome: "paid_unexpected",
      runAt: "Today, 8:47 AM",
      claimId: "CID-8841219",
      paidAmount: "$0.00 copay",
    },
    paHistory: [
      {
        id: "pa-2",
        drugName: "Humira 40 mg",
        status: "Active",
        startDate: "2025-10-01",
        endDate: "2026-09-01",
        current: true,
      },
    ],
    suggestedDx: { code: "L40.50", label: "Arthropathic psoriasis, unspecified" },
  },
  {
    id: "u3",
    caseNumber: "CASE-102377",
    memberName: "Rosa Delgado",
    memberId: "MHK-88214",
    drugName: "Mounjaro",
    drugStrength: "5 mg/0.5 mL",
    receivedAt: "Yesterday, 4:11 PM",
    claimedBy: "tech-1",
    returnedByPharmacist: true,
    returnReason: "Missing recent A1c value — need clinical notes from last 90 days.",
    client: "Northwind Health",
    isTrueDataClient: false,
    isAppeal: false,
    testClaim: {
      outcome: "step_therapy",
      runAt: "Yesterday, 4:16 PM",
      claimId: "CID-8840992",
      rejectCode: "608",
      rejectReason: "Step Therapy — preferred alternative required",
    },
    paHistory: [],
    suggestedDx: { code: "E11.9", label: "Type 2 diabetes mellitus without complications" },
  },
  {
    id: "u4",
    caseNumber: "CASE-102410",
    memberName: "Kenji Watanabe",
    memberId: "MHK-66741",
    drugName: "Ozempic",
    drugStrength: "1 mg/0.75 mL",
    receivedAt: "Today, 10:02 AM",
    claimedBy: null,
    returnedByPharmacist: false,
    client: "RO",
    isTrueDataClient: true,
    isAppeal: false,
    testClaim: {
      outcome: "non_formulary",
      runAt: "Today, 10:06 AM",
      claimId: "CID-8841233",
      rejectCode: "70",
      rejectReason: "Product/Service Not Covered — non-formulary",
    },
    paHistory: [
      {
        id: "pa-3",
        drugName: "Ozempic 0.5 mg",
        status: "Active",
        startDate: "2025-09-15",
        endDate: "2026-09-15",
        current: true,
      },
    ],
    suggestedDx: { code: "E11.9", label: "Type 2 diabetes mellitus without complications" },
  },
];


// Small ICD-10 mock list for the searchable diagnosis dropdown.
export const mockIcd10: Array<{ code: string; label: string }> = [
  { code: "E66.9", label: "Obesity, unspecified" },
  { code: "E66.01", label: "Morbid (severe) obesity due to excess calories" },
  { code: "E11.9", label: "Type 2 diabetes mellitus without complications" },
  { code: "E11.65", label: "Type 2 diabetes mellitus with hyperglycemia" },
  { code: "E11.40", label: "Type 2 diabetes mellitus with diabetic neuropathy, unspecified" },
  { code: "L40.50", label: "Arthropathic psoriasis, unspecified" },
  { code: "L40.0", label: "Psoriasis vulgaris" },
  { code: "M06.9", label: "Rheumatoid arthritis, unspecified" },
  { code: "K50.90", label: "Crohn's disease, unspecified, without complications" },
  { code: "J45.40", label: "Moderate persistent asthma, uncomplicated" },
  { code: "I10", label: "Essential (primary) hypertension" },
  { code: "E78.5", label: "Hyperlipidemia, unspecified" },
];
