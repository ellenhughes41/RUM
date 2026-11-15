import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { usePolicies } from "@/hooks/use-policies";
import { Check, X, Sparkles, User, FileText, Copy, FileX, XCircle, Pencil, AlertTriangle, ArrowLeftRight, MessageSquarePlus, MoreHorizontal, Undo2, History, Stethoscope, StickyNote, Plus, ChevronDown, ChevronUp, Send, Building2, ExternalLink, Clock, Wrench, ClipboardList, Activity, CheckCircle, Paperclip, Download } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Button as AntButton, Input as AntInput, Pagination as AntPagination, Table as AntTable } from "antd";
import { Select as AntSelect } from "antd";
const { TextArea: AntTextArea } = AntInput;

import { Case } from "./CaseList";
import { cn } from "@/lib/utils";
import { RequestInformationModal } from "./RequestInformationModal";
import { DenialTemplateModal } from "./DenialTemplateModal";
import { ApprovalConfirmModal } from "./ApprovalConfirmModal";
import { OutcomePanel } from "./OutcomePanel";
import { getOverrideNotes } from "@/lib/overrideHandoff";
import { EditOutlined } from "@ant-design/icons";
import { FixCriteriaModal } from "./FixCriteriaModal";
import { ChangeMedicationModal } from "./ChangeMedicationModal";
import { useToast } from "@/hooks/use-toast";

import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// Mock claims history data
const mockClaimsHistory = [{
  id: "h1",
  date: "2024-11-15",
  drug: "Dupixent",
  decision: "approved",
  type: "Reauthorization"
}, {
  id: "h2",
  date: "2024-05-22",
  drug: "Dupixent",
  decision: "approved",
  type: "Initial"
}, {
  id: "h3",
  date: "2023-08-10",
  drug: "Humira",
  decision: "denied",
  type: "Initial"
}, {
  id: "h4",
  date: "2023-03-05",
  drug: "Enbrel",
  decision: "approved",
  type: "Initial"
}];

// Mock previous diagnoses
const mockPreviousDiagnoses = [{
  id: "d1",
  code: "L20.81",
  description: "Atopic dermatitis, moderate",
  date: "2024-05-22",
  provider: "Dr. Foster"
}, {
  id: "d2",
  code: "J30.1",
  description: "Allergic rhinitis due to pollen",
  date: "2023-11-15",
  provider: "Dr. Chen"
}, {
  id: "d3",
  code: "H10.10",
  description: "Acute atopic conjunctivitis",
  date: "2023-08-10",
  provider: "Dr. Foster"
}];

// Mock Member History - prior cases
const mockMemberCases = [
  {
    caseNumber: "RX-3041287",
    medication: "Dupixent",
    status: "Approved",
    requestDate: "2024-11-15",
    providerName: "Dr. Amanda Foster",
    chartNotes: "dupixent-reauth-2024-11.pdf",
  },
  {
    caseNumber: "RX-3019844",
    medication: "Dupixent",
    status: "Approved",
    requestDate: "2024-05-22",
    providerName: "Dr. Amanda Foster",
    chartNotes: "dupixent-initial-2024-05.pdf",
  },
  {
    caseNumber: "RX-2988102",
    medication: "Humira",
    status: "Denied",
    requestDate: "2023-08-10",
    providerName: "Dr. Michael Torres, MD",
    chartNotes: "humira-denial-2023-08.pdf",
  },
  {
    caseNumber: "RX-2954013",
    medication: "Enbrel",
    status: "Approved",
    requestDate: "2023-03-05",
    providerName: "Dr. Sarah Chen",
    chartNotes: "enbrel-initial-2023-03.pdf",
  },
  {
    caseNumber: "RX-2921554",
    medication: "Stelara",
    status: "Approved",
    requestDate: "2022-11-18",
    providerName: "Dr. Michael Torres, MD",
    chartNotes: "stelara-initial-2022-11.pdf",
  },
  {
    caseNumber: "RX-2899012",
    medication: "Stelara",
    status: "Withdrawn",
    requestDate: "2022-07-02",
    providerName: "Dr. Sarah Chen",
    chartNotes: "stelara-withdrawn-2022-07.pdf",
  },
  {
    caseNumber: "RX-2854221",
    medication: "Cosentyx",
    status: "Denied",
    requestDate: "2022-02-14",
    providerName: "Dr. James Patel",
    chartNotes: "cosentyx-denial-2022-02.pdf",
  },
  {
    caseNumber: "RX-2810344",
    medication: "Otezla",
    status: "Approved",
    requestDate: "2021-09-09",
    providerName: "Dr. Emily Rodriguez",
    chartNotes: "otezla-initial-2021-09.pdf",
  },
  {
    caseNumber: "RX-2784009",
    medication: "Methotrexate",
    status: "Approved",
    requestDate: "2021-05-21",
    providerName: "Dr. David Kim",
    chartNotes: "mtx-initial-2021-05.pdf",
  },
  {
    caseNumber: "RX-2751120",
    medication: "Prednisone",
    status: "Approved",
    requestDate: "2021-01-08",
    providerName: "Dr. Lisa Nguyen",
    chartNotes: "prednisone-2021-01.pdf",
  },
  {
    caseNumber: "RX-2710087",
    medication: "Rinvoq",
    status: "Dismissed",
    requestDate: "2020-10-30",
    providerName: "Dr. James Patel",
    chartNotes: "rinvoq-dismissed-2020-10.pdf",
  },
];

// Mock Member History - pharmacy claims
const mockMemberClaims = [
  {
    id: 100234,
    dateOfService: "2025-04-12",
    drugName: "Dupixent 300 MG/2 ML",
    status: "Paid",
    gpi: "21504010100320",
    ndc: "00024559101",
    quantity: 2,
    daysSupply: 28,
    prescriberFirstName: "Amanda",
    prescriberLastName: "Foster",
    prescriberNpi: "1396728451",
    processedAt: "2025-04-12T10:14:00Z",
    planName: "Mayo Clinic - Commercial PPO",
    source: "Pharmacy",
  },
  {
    id: 100198,
    dateOfService: "2025-03-15",
    drugName: "Dupixent 300 MG/2 ML",
    status: "Paid",
    gpi: "21504010100320",
    ndc: "00024559101",
    quantity: 2,
    daysSupply: 28,
    prescriberFirstName: "Amanda",
    prescriberLastName: "Foster",
    prescriberNpi: "1396728451",
    processedAt: "2025-03-15T09:42:00Z",
    planName: "Mayo Clinic - Commercial PPO",
    source: "Tredium Test",
  },
  {
    id: 100021,
    dateOfService: "2024-12-04",
    drugName: "Albuterol HFA 90 MCG",
    status: "Paid",
    gpi: "44201002020320",
    ndc: "66993001968",
    quantity: 1,
    daysSupply: 30,
    prescriberFirstName: "Sarah",
    prescriberLastName: "Chen",
    prescriberNpi: "1740521299",
    processedAt: "2024-12-04T16:08:00Z",
    planName: "Mayo Clinic - Commercial PPO",
    source: "Pharmacy",
  },
  {
    id: 99887,
    dateOfService: "2024-10-22",
    drugName: "Dupixent 300 MG/2 ML",
    status: "Rejected",
    gpi: "21504010100320",
    ndc: "00024559101",
    quantity: 2,
    daysSupply: 28,
    prescriberFirstName: "Amanda",
    prescriberLastName: "Foster",
    prescriberNpi: "1396728451",
    processedAt: "2024-10-22T11:03:00Z",
    planName: "Mayo Clinic - Commercial PPO",
    source: "Pharmacy",
  },
  {
    id: 99654,
    dateOfService: "2024-08-19",
    drugName: "Atorvastatin 40 MG Tablet",
    status: "Paid",
    gpi: "39400010100310",
    ndc: "00378395293",
    quantity: 30,
    daysSupply: 30,
    prescriberFirstName: "David",
    prescriberLastName: "Kim",
    prescriberNpi: "1487329012",
    processedAt: "2024-08-19T08:55:00Z",
    planName: "Mayo Clinic - Commercial PPO",
    source: "Tredium Test",
  },
  {
    id: 99412,
    dateOfService: "2024-07-02",
    drugName: "Lisinopril 10 MG Tablet",
    status: "Paid",
    gpi: "36100050100310",
    ndc: "00603418321",
    quantity: 30,
    daysSupply: 30,
    prescriberFirstName: "Lisa",
    prescriberLastName: "Nguyen",
    prescriberNpi: "1659331204",
    processedAt: "2024-07-02T14:21:00Z",
    planName: "Mayo Clinic - Commercial PPO",
    source: "Pharmacy",
  },
  {
    id: 99201,
    dateOfService: "2024-05-17",
    drugName: "Metformin 500 MG Tablet",
    status: "Rejected",
    gpi: "27250040000310",
    ndc: "00093104801",
    quantity: 60,
    daysSupply: 30,
    prescriberFirstName: "Sarah",
    prescriberLastName: "Chen",
    prescriberNpi: "1740521299",
    processedAt: "2024-05-17T09:30:00Z",
    planName: "Mayo Clinic - Commercial PPO",
    source: "Pharmacy",
  },
  {
    id: 98990,
    dateOfService: "2024-03-04",
    drugName: "Dupixent 300 MG/2 ML",
    status: "Reversed",
    gpi: "21504010100320",
    ndc: "00024559101",
    quantity: 2,
    daysSupply: 28,
    prescriberFirstName: "Amanda",
    prescriberLastName: "Foster",
    prescriberNpi: "1396728451",
    processedAt: "2024-03-04T10:12:00Z",
    planName: "Mayo Clinic - Commercial PPO",
    source: "Pharmacy",
  },
  {
    id: 98712,
    dateOfService: "2024-01-15",
    drugName: "Albuterol HFA 90 MCG",
    status: "Rejected",
    gpi: "44201002020320",
    ndc: "66993001968",
    quantity: 1,
    daysSupply: 30,
    prescriberFirstName: "Sarah",
    prescriberLastName: "Chen",
    prescriberNpi: "1740521299",
    processedAt: "2024-01-15T17:45:00Z",
    planName: "Mayo Clinic - Commercial PPO",
    source: "Tredium Test",
  },
];

// Case GPI-14 used to scope pharmacy claim fetches
const CASE_GPI = "21504010100320";

// Larger synthetic pool so batch fetching (50 at a time) can be demonstrated
export const mockClaimsPool = Array.from({ length: 260 }, (_, i) => {
  const base = mockMemberClaims[i % mockMemberClaims.length];
  const cycle = Math.floor(i / mockMemberClaims.length);
  return {
    ...base,
    id: base.id - cycle * 1000,
    dateOfService: base.dateOfService,
  };
});

type ClaimScope = "paid-case-gpi" | "all-case-gpi" | "paid-all-drugs" | "rejected-all-drugs";

const CLAIM_SCOPES: { value: ClaimScope; label: string }[] = [
  { value: "paid-case-gpi", label: "Paid claims of case GPI-14" },
  { value: "all-case-gpi", label: "All claims of case GPI-14" },
  { value: "paid-all-drugs", label: "Paid claims of all drugs" },
  { value: "rejected-all-drugs", label: "Rejected claims of any drug" },
];

function filterClaimsByScope(scope: ClaimScope) {
  return mockClaimsPool.filter((c) => {
    if (scope === "paid-case-gpi") return c.gpi === CASE_GPI && c.status === "Paid";
    if (scope === "all-case-gpi") return c.gpi === CASE_GPI;
    if (scope === "rejected-all-drugs") return c.status === "Rejected";
    return c.status === "Paid";
  });
}

// Mock diagnoses per case (for diagnosis selection step)
interface CaseDiagnosis {
  id: string;
  code: string;
  description: string;
  policyName: string;
}

const mockCaseDiagnoses: Record<string, CaseDiagnosis[]> = {
  // Leanne Reynolds - Zepbound
  "7": [
  { id: "dx1", code: "E66.01", description: "Morbid obesity due to excess calories", policyName: "Zepbound (Tirzepatide) - Obesity" },
  { id: "dx2", code: "K75.81", description: "Metabolic dysfunction-associated steatohepatitis (MASH)", policyName: "Zepbound (Tirzepatide) - MASH" }],

  // Sarah Johnson - Dupixent
  "1": [
  { id: "dx1", code: "L20.81", description: "Atopic dermatitis, moderate", policyName: "Dupixent Prior Authorization Criteria" },
  { id: "dx2", code: "J45.40", description: "Moderate persistent asthma, uncomplicated", policyName: "Dupixent - Asthma Criteria" }],

  // James Wilson - Ozempic (deny case)
  "2": [
  { id: "dx1", code: "K75.81", description: "Metabolic dysfunction-associated steatohepatitis (MASH)", policyName: "Ozempic (Semaglutide) - MASH" }],

  // Emily Thompson - Humira
  "5": [
  { id: "dx1", code: "M05.79", description: "Rheumatoid arthritis with rheumatoid factor", policyName: "Humira (Adalimumab) - Rheumatoid Arthritis" },
  { id: "dx2", code: "K50.90", description: "Crohn's disease, unspecified", policyName: "Humira (Adalimumab) - Crohn's Disease" },
  { id: "dx3", code: "L40.50", description: "Arthropathic psoriasis, unspecified", policyName: "Humira (Adalimumab) - Psoriatic Arthritis" }],

  // Robert Chen - Galantamine
  "4": [
  { id: "dx1", code: "G30.1", description: "Alzheimer's disease with late onset", policyName: "Galantamine - Alzheimer's Dementia" }],

  // Rosa Delgado - Ozempic (GLP-1 for T2DM)
  "rosa-ozempic": [
  { id: "dx1", code: "E11.40", description: "Type 2 diabetes mellitus with diabetic neuropathy, unspecified", policyName: "RWRX.1379 — Preferred GLP-1 and GIP/GLP-1" }],
  "rosa-ozempic-ai": [
  { id: "dx1", code: "E11.40", description: "Type 2 diabetes mellitus with diabetic neuropathy, unspecified", policyName: "RWRX.1379 — Preferred GLP-1 and GIP/GLP-1" }]
};

// Default diagnoses for cases without specific mock data
const defaultDiagnoses: CaseDiagnosis[] = [
{ id: "dx1", code: "L20.81", description: "Atopic dermatitis, moderate", policyName: "Prior Authorization Criteria" },
{ id: "dx2", code: "J30.1", description: "Allergic rhinitis due to pollen", policyName: "Prior Authorization Criteria - Allergic Rhinitis" }];



const mockCaseInternalNotes = [{
  id: "n1",
  author: "MHK",
  date: "2025-05-06",
  preview: "2 entries",
  fullContent: "25-05-06 13:30 [victor.canales@rightwayhealthcare.com] New attachment\n\n25-05-05 16:22 [jennifer.nguyen@rightwayhealthcare.com] 75 PRIOR AUTHORIZATION REQUIRED. Claim Id : 78345025"
}];

// Robert Chen - includes documented diagnosis source
const CHIN_DIAGNOSIS_TEXT = "Alzheimer's disease with late onset (ICD-10: G30.1); Dementia in Alzheimer's, mild (F02.80)";
const chinInternalNotes = [{
  id: "chin-dx",
  author: "MHK",
  date: "2025-06-09",
  preview: "Diagnosis confirmed",
  fullContent: `25-06-09 14:12 [dr.park@rightwayhealthcare.com] Diagnosis confirmed: ${CHIN_DIAGNOSIS_TEXT}. Patient meets criteria for cholinesterase inhibitor therapy.`
}, {
  id: "n1",
  author: "MHK",
  date: "2025-05-06",
  preview: "2 entries",
  fullContent: "25-05-06 13:30 [victor.canales@rightwayhealthcare.com] New attachment\n\n25-05-05 16:22 [jennifer.nguyen@rightwayhealthcare.com] 75 PRIOR AUTHORIZATION REQUIRED. Claim Id : 78345025"
}];
// Mock policy attachments keyed by policy name
const mockPolicyAttachments: Record<string, { id: string; name: string; type: string; size: string }[]> = {
  "Dupixent": [
    { id: "a1", name: "Dupixent_FDA_Label.pdf", type: "PDF", size: "2.4 MB" },
    { id: "a2", name: "Dupixent_Clinical_Guidelines.pdf", type: "PDF", size: "1.8 MB" },
    { id: "a3", name: "Dupixent_Formulary_Reference.docx", type: "DOCX", size: "540 KB" },
  ],
  "Humira": [
    { id: "a4", name: "Humira_Prescribing_Info.pdf", type: "PDF", size: "3.1 MB" },
    { id: "a5", name: "Humira_Step_Therapy_Protocol.pdf", type: "PDF", size: "890 KB" },
  ],
  "Ozempic": [
    { id: "a6", name: "Ozempic_Label.pdf", type: "PDF", size: "1.5 MB" },
    { id: "a7", name: "Ozempic_Clinical_Trial_Data.pdf", type: "PDF", size: "4.2 MB" },
    { id: "a8", name: "Ozempic_Coverage_Criteria.xlsx", type: "XLSX", size: "320 KB" },
  ],
  "Evenity": [
    { id: "a9", name: "Evenity_FDA_Approval.pdf", type: "PDF", size: "1.9 MB" },
    { id: "a10", name: "Evenity_REMS_Guide.pdf", type: "PDF", size: "750 KB" },
  ],
  "Rinvoq": [
    { id: "a11", name: "Rinvoq_Prescribing_Information.pdf", type: "PDF", size: "2.7 MB" },
    { id: "a12", name: "Rinvoq_Safety_Update.pdf", type: "PDF", size: "1.1 MB" },
  ],
  "Default": [
    { id: "a13", name: "General_Policy_Guidelines.pdf", type: "PDF", size: "980 KB" },
  ],
};

// Helper function to calculate time remaining
const getTimeRemaining = (deadline: string): {
  text: string;
  isUrgent: boolean;
} => {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffMs = deadlineDate.getTime() - now.getTime();
  if (diffMs <= 0) {
    return {
      text: "Overdue",
      isUrgent: true
    };
  }
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffMinutes = Math.floor(diffMs % (1000 * 60 * 60) / (1000 * 60));
  const isUrgent = diffHours < 4;
  if (diffHours < 1) {
    return {
      text: `${diffMinutes}m remaining`,
      isUrgent
    };
  } else if (diffHours < 24) {
    const hours = Math.floor(diffHours);
    return {
      text: `${hours}h ${diffMinutes}m remaining`,
      isUrgent
    };
  } else {
    const days = Math.floor(diffHours / 24);
    const remainingHours = Math.floor(diffHours % 24);
    return {
      text: `${days}d ${remainingHours}h remaining`,
      isUrgent
    };
  }
};
type AIRuleStatus = "confirmed" | "incorrect" | "missing" | "pending";
type CriteriaStatus = "pending" | "documented" | "not-included" | "denied";
interface ManualCriteria {
  id: string;
  category: string;
  rule: string;
  subItems?: string[];
  isConditional?: boolean;
  requiredCount?: number;
  aiSelectedSubItems?: number[];
  aiEvidenceBySubItem?: Record<number, string>;
}
const manualReviewCriteria: ManualCriteria[] = [{
  id: "1",
  category: "Patient Eligibility (Age)",
  rule: "Patient is 6 months of age or older"
}, {
  id: "2",
  category: "Diagnosis / Indication",
  rule: "Diagnosis of moderate-to-severe chronic atopic dermatitis"
}, {
  id: "3",
  category: "Prerequisites (Step Therapy)",
  rule: "History of failure, contraindication, or intolerance to ONE of the following therapies OR previous trial of a biologic medication:",
  isConditional: true,
  requiredCount: 1,
  aiSelectedSubItems: [0],
  aiEvidenceBySubItem: {
    0: "Triamcinolone 0.1% cream — 6 week trial, inadequate response"
  },
  subItems: ["Medium to very-high potency topical corticosteroid (e.g., Elocon, Synalar, Lidex)", "Topical calcineurin inhibitor (e.g., Elidel, Protopic)", "Eucrisa (crisaborole)", "Phototherapy treatment (UV-A, UV-B, combination, or NB-UVB)"]
}, {
  id: "4",
  category: "Exclusions",
  rule: "Patient is not receiving Dupixent in combination with another biologic medication (e.g., Xolair, Rituxan, Enbrel, Remicade/Inflectra)"
}, {
  id: "5",
  category: "Prescriber Requirements",
  rule: "Prescribed by one of the following specialists:",
  subItems: ["Dermatologist", "Allergist", "Immunologist"]
}];

// Rosa Delgado — RWRX.1379 Preferred GLP-1 and GIP/GLP-1 (Ozempic)
const manualReviewCriteriaRosaOzempic: ManualCriteria[] = [{
  id: "r1",
  category: "FDA-Approved Diagnosis",
  rule: "Must have chart note documentation supporting an FDA-approved diagnosis (Type 2 Diabetes Mellitus).",
  isConditional: true,
  requiredCount: 1,
  subItems: [
    "Chart notes or medical records referencing diagnosis of Type II Diabetes Mellitus or specific ICD-10 code (E11.X)",
    "Lab values confirming presence of Type II Diabetes Mellitus — Fasting plasma glucose, Hemoglobin A1C (HbA1c), oral glucose tolerance test, or random plasma glucose with classic hyperglycemia symptoms",
    "Prior history of treatment with antidiabetic medications (e.g., metformin, sulfonylureas, DPP-4 inhibitors, insulin) which did not result in successful therapy",
    "Prior trial of any ONE oral antidiabetic drug"
  ]
}, {
  id: "r2",
  category: "Prior Oral Antidiabetic Drug Trial",
  rule: "Prior trial of any ONE oral antidiabetic drug."
}, {
  id: "r3",
  category: "Exclusion Check",
  rule: "Must NOT have a diagnosis of Type 1 Diabetes Mellitus or Latent Autoimmune Diabetes in Adults (LADA, Type 1.5 Diabetes Mellitus)."
}];

// Rosa Delgado AI — pre-populated rule checks
export const mockRuleChecksRosaAI: RuleCheck[] = [{
  id: "rai2", category: "FDA-Approved Diagnosis",
  rule: "Must have chart note documentation supporting an FDA-approved diagnosis (Type 2 Diabetes Mellitus).",
  passed: true,
  isConditional: true,
  requiredCount: 1,
  parentStatement: "Must have chart note documentation supporting an FDA-approved diagnosis (Type 2 Diabetes Mellitus). At least 1 of the following criteria must be met:",
  subOptions: [
    { id: "rai2-a", text: "Chart notes or medical records referencing diagnosis of Type II Diabetes Mellitus or specific ICD-10 code (E11.X)", aiSelected: true, extractedValue: "ICD10:E11.40 — Type 2 diabetes mellitus with diabetic neuropathy", sourceLocation: "Problem List, Page 4" },
    { id: "rai2-b", text: "Lab values confirming presence of Type II Diabetes Mellitus — Fasting plasma glucose, Hemoglobin A1C (HbA1c), oral glucose tolerance test, or random plasma glucose with classic hyperglycemia symptoms", aiSelected: false },
    { id: "rai2-c", text: "Prior history of treatment with antidiabetic medications (e.g., metformin, sulfonylureas, DPP-4 inhibitors, insulin) which did not result in successful therapy", aiSelected: false },
    { id: "rai2-d", text: "Prior trial of any ONE oral antidiabetic drug", aiSelected: true, extractedValue: "glimepiride 4 MG, linagliptin 5 MG [Tradjenta], metformin 1000 MG", sourceLocation: "Medications, Page 4" }
  ]
}, {
  id: "rai3", category: "Prior Oral Antidiabetic Drug Trial", rule: "Prior trial of any ONE oral antidiabetic drug.", passed: true,
  extractedValue: 'Active: glimepiride 4 MG Oral Tablet QD — Active: linagliptin 5 MG Oral Tablet [Tradjenta] QD — Active: metformin hydrochloride 1000 MG Oral Tablet BID', sourceLocation: "Medications, Page 4"
}, {
  id: "rai4", category: "Exclusion Check", rule: "Must NOT have a diagnosis of Type 1 Diabetes Mellitus or Latent Autoimmune Diabetes in Adults (LADA, Type 1.5 Diabetes Mellitus).", passed: true,
  extractedValue: 'Problem list documents E11.40 (Type 2 DM with neuropathy). No documentation of Type 1 Diabetes (E10.x), LADA, or autoimmune diabetes found across 7 pages.', sourceLocation: "Problem List, Page 4"
}];

interface AIEvidenceItem { quote: string; page: number; }
const rosaAIEvidenceMap: Record<string, AIEvidenceItem[]> = {
  "rai2": [{ quote: '08/17/2016 Active: Type 2 diabetes mellitus with diabetic neuropathy, unspecified (ICD10:E11.40)', page: 4 }],
  "rai3": [
    { quote: 'Active: glimepiride 4 MG Oral Tablet QD — Active: linagliptin 5 MG Oral Tablet [Tradjenta] QD — Active: metformin hydrochloride 1000 MG Oral Tablet BID', page: 4 },
    { quote: "BG's uncontrolled on glargine, glimepiride, metformin, and linagliptan. A1c currently 8.1%.", page: 6 }
  ],
  "rai4": [{ quote: 'Problem list documents E11.40 (Type 2 DM with neuropathy). No documentation of Type 1 Diabetes (E10.x), LADA, or autoimmune diabetes found across 7 pages.', page: 4 }],
};

const rosaInternalNotes = [{
  id: "rn1",
  author: "MHK",
  date: "2025-05-06",
  preview: "2 entries",
  fullContent: "25-05-06 13:30 [victor.canales@rightwayhealthcare.com] New attachment\n\n25-05-05 16:22 [jennifer.nguyen@rightwayhealthcare.com] 75 PRIOR AUTHORIZATION REQUIRED. Claim Id : 78345025"
}];

const getInitialManualConditionalSelections = (): Record<string, Set<number>> => {
  const initial: Record<string, Set<number>> = {};
  manualReviewCriteria.forEach((criteria) => {
    if (criteria.isConditional && criteria.subItems?.length) {
      initial[criteria.id] = new Set(criteria.aiSelectedSubItems || []);
    }
  });
  return initial;
};

const getInitialManualConditionalDocs = (): Record<string, Record<number, string>> => {
  const initial: Record<string, Record<number, string>> = {};
  manualReviewCriteria.forEach((criteria) => {
    if (criteria.isConditional && criteria.aiEvidenceBySubItem) {
      initial[criteria.id] = { ...criteria.aiEvidenceBySubItem };
    }
  });
  return initial;
};

interface ConditionalSubOption {

  id: string;
  text: string;
  aiSelected: boolean;
  extractedValue?: string;
  sourceLocation?: string;
}

export interface RuleCheck {
  id: string;
  category: string;
  rule: string;
  passed: boolean;
  extractedValue?: string;
  sourceLocation?: string;
  isConditional?: boolean;
  requiredCount?: number;
  parentStatement?: string;
  subOptions?: ConditionalSubOption[];
}
export const mockRuleChecks: RuleCheck[] = [{
  id: "1",
  category: "Age",
  rule: "Patient must be 18 years or older",
  passed: true,
  extractedValue: "38 years old",
  sourceLocation: "Demographics, Page 1"
}, {
  id: "2",
  category: "Diagnosis",
  rule: "Primary diagnosis of moderate-to-severe atopic dermatitis",
  passed: true,
  extractedValue: "ICD-10: L20.81 - Atopic dermatitis, moderate",
  sourceLocation: "Assessment, Page 2"
}, {
  id: "3",
  category: "Prior Therapy (Step Therapy)",
  rule: "History of failure, contraindication, or intolerance to ONE of the following therapies OR previous trial of a biologic medication:",
  passed: true,
  extractedValue: "",
  sourceLocation: "Medication History, Page 3",
  isConditional: true,
  requiredCount: 1,
  parentStatement: "History of failure, contraindication, or intolerance to ONE of the following therapies OR previous trial of a biologic medication: (document drug, date of trial, and/or contraindication to medication)",
  subOptions: [
  { id: "so1", text: "Medium to very-high potency topical corticosteroid (e.g., Elocon, Synalar, Lidex)", aiSelected: true, extractedValue: "Triamcinolone 0.1% cream — 6 week trial, inadequate response", sourceLocation: "Medication History, Page 3" },
  { id: "so2", text: "Topical calcineurin inhibitor (e.g., Elidel, Protopic)", aiSelected: false },
  { id: "so3", text: "Eucrisa (crisaborole)", aiSelected: false },
  { id: "so4", text: "Phototherapy treatment (UV-A, UV-B, combination, or NB-UVB)", aiSelected: false }]

}, {
  id: "4",
  category: "Prescriber Specialty",
  rule: "Must be prescribed by dermatologist or allergist",
  passed: true,
  extractedValue: "Dr. Amanda Foster, MD - Dermatology",
  sourceLocation: "Header, Page 1"
}, {
  id: "5",
  category: "Contraindications",
  rule: "No known hypersensitivity to dupilumab",
  passed: true,
  extractedValue: "Allergy list reviewed - No biologics listed",
  sourceLocation: "Allergies, Page 1"
}];

// David Park - Dupixent Reauthorization
export const mockRuleChecksDupixentReauth: RuleCheck[] = [{
  id: "dr1",
  category: "Age",
  rule: "Patient must be 18 years or older",
  passed: true,
  extractedValue: "45 years old",
  sourceLocation: "Demographics, Page 1"
}, {
  id: "dr2",
  category: "Diagnosis",
  rule: "Confirmed diagnosis of moderate-to-severe atopic dermatitis",
  passed: true,
  extractedValue: "ICD-10: L20.84 — Atopic dermatitis, moderate-to-severe",
  sourceLocation: "Assessment, Page 1"
}, {
  id: "dr3",
  category: "Prior Therapy (Step Therapy)",
  rule: "History of failure, contraindication, or intolerance to ONE of the following therapies OR previous trial of a biologic medication:",
  passed: true,
  extractedValue: "",
  sourceLocation: "Prior Therapy History, Page 2",
  isConditional: true,
  requiredCount: 1,
  parentStatement: "History of failure, contraindication, or intolerance to ONE of the following therapies OR previous trial of a biologic medication: (document drug, date of trial, and/or contraindication to medication)",
  subOptions: [
  { id: "dso1", text: "Medium to very-high potency topical corticosteroid (e.g., Elocon, Synalar, Lidex)", aiSelected: true, extractedValue: "Clobetasol 0.05% cream — 12 week trial, developed skin thinning", sourceLocation: "Prior Therapy History, Page 2" },
  { id: "dso2", text: "Topical calcineurin inhibitor (e.g., Elidel, Protopic)", aiSelected: true, extractedValue: "Tacrolimus 0.1% ointment — 8 week trial, intolerable stinging/burning", sourceLocation: "Prior Therapy History, Page 2" },
  { id: "dso3", text: "Eucrisa (crisaborole)", aiSelected: false },
  { id: "dso4", text: "Phototherapy treatment (UV-A, UV-B, combination, or NB-UVB)", aiSelected: false }]

}, {
  id: "dr4",
  category: "Clinical Response",
  rule: "Documented clinical improvement on current therapy (EASI-75 or IGA improvement)",
  passed: true,
  extractedValue: "EASI 28.6 → 4.2 (85% improvement), IGA 4 → 1, BSA 42% → <5%",
  sourceLocation: "Assessment, Page 1"
}, {
  id: "dr5",
  category: "Prescriber Specialty",
  rule: "Must be prescribed by dermatologist or allergist",
  passed: true,
  extractedValue: "Dr. Nina Patel, MD, FAAD — Board Certified Dermatologist",
  sourceLocation: "Header, Page 1"
}, {
  id: "dr6",
  category: "Contraindications",
  rule: "No known hypersensitivity to dupilumab; no concurrent biologic use",
  passed: false,
  extractedValue: "History of anaphylactic reaction to dupilumab documented (urticaria, angioedema, dyspnea following 3rd injection, 02/2023)",
  sourceLocation: "Adverse Effects Monitoring, Page 2"
}];

export const mockRuleChecksDeny: RuleCheck[] = [{
  id: "1",
  category: "Age",
  rule: "Patient must be 18 years or older",
  passed: true,
  extractedValue: "52 years old",
  sourceLocation: "Demographics, Page 1"
}, {
  id: "2",
  category: "Diagnosis",
  rule: "Confirmed diagnosis of metabolic dysfunction-associated steatohepatitis (MASH)",
  passed: true,
  extractedValue: "ICD-10: K75.81 - MASH confirmed via liver biopsy",
  sourceLocation: "Assessment, Page 2"
}, {
  id: "3",
  category: "BMI",
  rule: "BMI ≥ 30 kg/m²",
  passed: true,
  extractedValue: "BMI 31.2 kg/m²",
  sourceLocation: "Vitals, Page 1"
}, {
  id: "4",
  category: "Lifestyle Modifications",
  rule: "Trial of diet and lifestyle modifications for at least 3 months",
  passed: true,
  extractedValue: "6-month lifestyle intervention program documented",
  sourceLocation: "History of Present Illness, Page 2"
}, {
  id: "4b",
  category: "Liver Biopsy",
  rule: "Liver biopsy within 24 months confirming MASH diagnosis",
  passed: false,
  extractedValue: "Liver biopsy dated 36 months ago - exceeds 24-month requirement",
  sourceLocation: "Lab Results, Page 3"
}, {
  id: "5",
  category: "Hemoglobin A1c",
  rule: "Baseline hemoglobin A1c documented within the last 90 days",
  passed: false,
  extractedValue: "",
  sourceLocation: ""
}, {
  id: "6",
  category: "Exclusions",
  rule: "No history of medullary thyroid carcinoma or MEN 2",
  passed: true,
  extractedValue: "No thyroid conditions documented",
  sourceLocation: "Medical History, Page 1"
}, {
  id: "7",
  category: "Prescriber",
  rule: "Must be prescribed by appropriate specialist or PCP with weight management training",
  passed: true,
  extractedValue: "Dr. Michael Torres, MD - Internal Medicine",
  sourceLocation: "Header, Page 1"
}];

// Leanne Reynolds - Zepbound for weight loss
export const mockRuleChecksZepbound: RuleCheck[] = [{
  id: "1",
  category: "Patient Eligibility (Age)",
  rule: "Patient must be 18 years or older",
  passed: true,
  extractedValue: "46 years old",
  sourceLocation: "Demographics, Page 1"
}, {
  id: "2",
  category: "Diagnosis / Indication",
  rule: "Diagnosis of obesity or overweight with weight-related comorbidity",
  passed: true,
  extractedValue: "ICD-10: E66.9 - Obesity, unspecified with sleep apnea",
  sourceLocation: "Assessment, Page 2"
}, {
  id: "3",
  category: "BMI Requirements",
  rule: "Documented BMI ≥ 30 kg/m², OR BMI ≥ 27 kg/m² with at least one weight-related comorbidity",
  passed: true,
  extractedValue: "BMI 27.74 kg/m² with documented sleep apnea and chronic back pain",
  sourceLocation: "Vitals & Assessment, Page 3"
}, {
  id: "4",
  category: "Weight-Related Comorbidities",
  rule: "Hypertension, Type 2 Diabetes, Dyslipidemia, or Cardiovascular Disease",
  passed: true,
  extractedValue: "Sleep apnea (G47.33), Chronic back pain - qualifies as weight-related comorbidity",
  sourceLocation: "Problem List, Page 2"
}, {
  id: "5",
  category: "Lifestyle Modifications",
  rule: "Must be used in combination with reduced-calorie diet and increased physical activity",
  passed: true,
  extractedValue: "Tried diet, meal delivery 1600 cal/day - unable to maintain weight loss",
  sourceLocation: "History of Present Illness, Page 1"
}, {
  id: "6",
  category: "Prerequisites (Step Therapy)",
  rule: "Failure of structured lifestyle modification program for at least 3 months",
  passed: true,
  extractedValue: "6+ months of documented diet attempts with meal delivery service",
  sourceLocation: "History of Present Illness, Page 1"
}, {
  id: "7",
  category: "Exclusions",
  rule: "Personal or family history of medullary thyroid carcinoma (MTC), Multiple Endocrine Neoplasia syndrome type 2 (MEN 2), Concurrent use with other GLP-1 agonists",
  passed: true,
  extractedValue: "No thyroid conditions, no MEN 2, no concurrent GLP-1 use - history of DCIS breast cancer only",
  sourceLocation: "Medical History, Page 2"
}, {
  id: "8",
  category: "Prescriber Requirements",
  rule: "Must be prescribed by or in consultation with Endocrinologist, Obesity Medicine Specialist, or Primary Care Physician with documented weight management training",
  passed: true,
  extractedValue: "Dr. Sarah Chen, MD - Obesity Medicine Specialist",
  sourceLocation: "Header, Page 1"
}];

// Leanne Reynolds - Zepbound for MASH (alternative indication)
export const mockRuleChecksZepboundMASH: RuleCheck[] = [{
  id: "m1",
  category: "Patient Eligibility (Age)",
  rule: "Patient must be 18 years or older",
  passed: true,
  extractedValue: "46 years old",
  sourceLocation: "Demographics, Page 1"
}, {
  id: "m2",
  category: "Diagnosis / Indication",
  rule: "Diagnosis of metabolic dysfunction-associated steatohepatitis (MASH) with liver fibrosis",
  passed: false,
  extractedValue: "NAFLD documented but MASH diagnosis not confirmed",
  sourceLocation: "Assessment, Page 2"
}, {
  id: "m3",
  category: "Liver Fibrosis Stage",
  rule: "Documented liver fibrosis stage F2-F3 (moderate to advanced fibrosis)",
  passed: false,
  extractedValue: "Fibrosis staging not documented in chart",
  sourceLocation: ""
}, {
  id: "m4",
  category: "Imaging/Biopsy",
  rule: "FibroScan, MR elastography, or liver biopsy within 12 months confirming fibrosis stage",
  passed: false,
  extractedValue: "",
  sourceLocation: ""
}, {
  id: "m5",
  category: "Lab Requirements",
  rule: "Elevated liver enzymes (ALT/AST) documented within 6 months",
  passed: true,
  extractedValue: "ALT: 68 U/L (elevated), AST: 52 U/L (elevated) - 3 months ago",
  sourceLocation: "Lab Results, Page 4"
}, {
  id: "m6",
  category: "Exclusions",
  rule: "No decompensated cirrhosis, active hepatitis B/C, or excessive alcohol use",
  passed: true,
  extractedValue: "No cirrhosis, Hep B/C negative, alcohol use: social only",
  sourceLocation: "Medical History, Page 2"
}, {
  id: "m7",
  category: "Cardiovascular Risk",
  rule: "Documentation of cardiovascular disease or high cardiovascular risk",
  passed: true,
  extractedValue: "Hypertension, elevated LDL - high CV risk documented",
  sourceLocation: "Problem List, Page 2"
}, {
  id: "m8",
  category: "Prescriber Requirements",
  rule: "Must be prescribed by Hepatologist or Gastroenterologist",
  passed: false,
  extractedValue: "Dr. Sarah Chen, MD - Obesity Medicine Specialist (not hepatology/GI)",
  sourceLocation: "Header, Page 1"
}];
export const mockRuleChecksHumira: RuleCheck[] = [{
  id: "1",
  category: "Age",
  rule: "Patient must be 18 years or older",
  passed: true,
  extractedValue: "29 years old",
  sourceLocation: "Demographics, Page 1"
}, {
  id: "2",
  category: "Diagnosis",
  rule: "Confirmed diagnosis of moderate-to-severe rheumatoid arthritis",
  passed: true,
  extractedValue: "ICD-10: M05.79 - Rheumatoid arthritis with rheumatoid factor",
  sourceLocation: "Assessment, Page 1"
}, {
  id: "3",
  category: "Prior Therapy",
  rule: "Trial and failure of at least one conventional DMARD (e.g., methotrexate) for minimum 3 months",
  passed: false,
  extractedValue: "",
  sourceLocation: ""
}, {
  id: "4",
  category: "Lab Work",
  rule: "Baseline TB test and Hepatitis B/C screening within 6 months",
  passed: true,
  extractedValue: "QuantiFERON-TB Gold: Negative (12/15/2023), Hep B/C Panel: Negative",
  sourceLocation: "Lab Results, Page 4"
}, {
  id: "5",
  category: "Disease Activity",
  rule: "Documentation of active disease with elevated inflammatory markers or joint involvement",
  passed: false,
  extractedValue: "",
  sourceLocation: ""
}, {
  id: "6",
  category: "Contraindications",
  rule: "No active serious infections or history of recurrent infections",
  passed: true,
  extractedValue: "No active infections documented, no history of recurrent infections",
  sourceLocation: "Medical History, Page 2"
}, {
  id: "7",
  category: "Prescriber",
  rule: "Must be prescribed by a rheumatologist",
  passed: true,
  extractedValue: "Dr. Lisa Wong, MD - Rheumatology",
  sourceLocation: "Header, Page 1"
}];

// Robert Chen - Galantamine for Alzheimer's dementia
export const mockRuleChecksGalantamine: RuleCheck[] = [{
  id: "g1",
  category: "Age",
  rule: "Patient must be 18 years or older",
  passed: true,
  extractedValue: "56 years old (calculated from DOB 05/30/1968)",
  sourceLocation: "Case Details — Member DOB"
}, {
  id: "g2",
  category: "Diagnosis",
  rule: "Confirmed diagnosis of mild-to-moderate Alzheimer's dementia",
  passed: true,
  extractedValue: "ICD-10: G30.1 - Alzheimer's disease with late onset; F02.80 - Dementia in Alzheimer's, mild",
  sourceLocation: "Assessment, Page 1"
}, {
  id: "g3",
  category: "MMSE Score",
  rule: "Mini-Mental State Examination (MMSE) score between 10 and 26",
  passed: true,
  extractedValue: "MMSE: 18/30 (moderate cognitive impairment)",
  sourceLocation: "Cognitive Testing, Page 1"
}, {
  id: "g4",
  category: "Prior Therapy",
  rule: "Trial and failure or intolerance of donepezil (Aricept) for at least 3 months",
  passed: true,
  extractedValue: "Donepezil 10mg x 4 months — discontinued due to GI side effects (nausea, vomiting)",
  sourceLocation: "Medication History, Page 2"
}, {
  id: "g5",
  category: "Renal Function",
  rule: "Estimated GFR ≥ 9 mL/min (galantamine dose adjustment required for moderate renal impairment)",
  passed: true,
  extractedValue: "eGFR: 72 mL/min/1.73m² (normal)",
  sourceLocation: "Lab Results, Page 2"
}, {
  id: "g6",
  category: "Hepatic Function",
  rule: "No severe hepatic impairment (Child-Pugh score ≤ 9)",
  passed: true,
  extractedValue: "Liver function tests within normal limits; no hepatic disease documented",
  sourceLocation: "Lab Results, Page 2"
}, {
  id: "g7",
  category: "Contraindications",
  rule: "No known hypersensitivity to galantamine or rivastigmine",
  passed: true,
  extractedValue: "Allergy list: Penicillin only — no cholinesterase inhibitor allergy",
  sourceLocation: "Allergies, Page 1"
}, {
  id: "g8",
  category: "Prescriber",
  rule: "Must be prescribed by a neurologist, geriatrician, or psychiatrist",
  passed: true,
  extractedValue: "Dr. James Park, MD — Neurology",
  sourceLocation: "Header, Page 1"
}];
interface CaseDetailProps {
  caseData: Case;
  onHighlightRule?: (category: string | null, failed?: boolean, customText?: string | null, page?: number | null) => void;
  highlightedRule?: string | null;
  isClaimed?: boolean;
  onClaimCase?: () => void;
  onRequestInformation?: (letter?: string) => void;
  onCaseCompleted?: (
    decision: "approved" | "denied",
    details?: {
      note?: string;
      effectiveDate?: string;
      terminationDate?: string;
      letter?: string;
    }
  ) => void;
  outcome?: import("@/types/caseOutcome").CaseOutcome;
  onRetractOutcome?: () => void;
  isPanelOpen?: boolean;
  hideActionBar?: boolean;
  previewMode?: boolean;
}

function NoteItem({ note, forceOpen, highlightText, flashHighlight }: { note: { id: string; author: string; date: string; preview: string; fullContent: string }; forceOpen?: boolean; highlightText?: string; flashHighlight?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);
  useEffect(() => {
    if (forceOpen) setIsExpanded(true);
  }, [forceOpen]);
  const renderContent = () => {
    if (highlightText && note.fullContent.includes(highlightText)) {
      const idx = note.fullContent.indexOf(highlightText);
      const before = note.fullContent.slice(0, idx);
      const after = note.fullContent.slice(idx + highlightText.length);
      return (
        <>
          {before}
          <span
            id="chin-diagnosis-source"
            className={cn(
              "rounded px-0.5 transition-colors duration-300",
              flashHighlight && "ring-2 ring-amber-400 bg-amber-100 text-foreground"
            )}
          >
            {highlightText}
          </span>
          {after}
        </>
      );
    }
    return note.fullContent;
  };
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setIsExpanded(!isExpanded)}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-foreground">{note.author}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{note.preview}</span>
          <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
        </div>
      </div>
      {isExpanded && (
        <pre className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap mt-2 font-sans">{renderContent()}</pre>
      )}
    </div>
  );
}

export function CaseDetail({
  caseData,
  onHighlightRule,
  highlightedRule,
  isClaimed = false,
  onClaimCase,
  onRequestInformation,
  onCaseCompleted,
  outcome,
  onRetractOutcome,
  isPanelOpen = true,
  hideActionBar = false,
  previewMode = false
}: CaseDetailProps) {
  const [isRequestInformationOpen, setIsRequestInformationOpen] = useState(false);
  const [isDenialModalOpen, setIsDenialModalOpen] = useState(false);
  const [isClaimsHistoryOpen, setIsClaimsHistoryOpen] = useState(false);
  const [flashDOB, setFlashDOB] = useState(false);
  const [isChangeMedOpen, setIsChangeMedOpen] = useState(false);
  const [drugNameOverride, setDrugNameOverride] = useState<string | null>(null);
  const [flashDiagnosis, setFlashDiagnosis] = useState(false);
  const [forceOpenNoteId, setForceOpenNoteId] = useState<string | null>(null);
  const [zepboundIndication, setZepboundIndication] = useState<"obesity" | "mash">("obesity");
  const [criteriaStatuses, setCriteriaStatuses] = useState<Record<string, CriteriaStatus>>({});
  const [criteriaDocumentation, setCriteriaDocumentation] = useState<Record<string, string>>({});
  const [criteriaDenialReasons, setCriteriaDenialReasons] = useState<Record<string, string>>({});
  const [editingCriteriaId, setEditingCriteriaId] = useState<string | null>(null);
  const [editingDenialId, setEditingDenialId] = useState<string | null>(null);

  // AI rule verification states
  const [aiRuleStatuses, setAiRuleStatuses] = useState<Record<string, AIRuleStatus>>({});
  const [aiRuleEdits, setAiRuleEdits] = useState<Record<string, {
    extractedValue: string;
    sourceLocation: string;
  }>>({});
  const [editingAiRuleId, setEditingAiRuleId] = useState<string | null>(null);
  const [aiRulePassOverrides, setAiRulePassOverrides] = useState<Record<string, boolean>>({});
  const [aiRuleNotes, setAiRuleNotes] = useState<Record<string, string>>({});
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [aiWrongDataFlags, setAiWrongDataFlags] = useState<Record<string, boolean>>({});
  const [confirmedRules, setConfirmedRules] = useState<Set<string>>(new Set());
  const [confirmedManualCriteria, setConfirmedManualCriteria] = useState<Set<string>>(new Set());
  const [alternatePolicyDismissed, setAlternatePolicyDismissed] = useState(false);

  // Pre-review selection states
  const [selectedAuthType, setSelectedAuthType] = useState<"initial" | "reauthorization" | "discontinuation" | null>(null);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<string | null>(null);
  const [selectedSecondaryBlock, setSelectedSecondaryBlock] = useState<string | null>(null);
  const [selectedDrug, setSelectedDrug] = useState<string | null>(null);
  const [selectedCustom, setSelectedCustom] = useState<string | null>(null);
  const [selectedQL, setSelectedQL] = useState<string | null>(null);
  const [selectedNF, setSelectedNF] = useState<string | null>(null);
  const [rulesLoaded, setRulesLoaded] = useState(false);
  const caseDiagnoses = mockCaseDiagnoses[caseData.id] || defaultDiagnoses;
  const activeManualCriteria = caseData.id === "rosa-ozempic" ? manualReviewCriteriaRosaOzempic : manualReviewCriteria;
  const caseSpecific = (caseData.id === "rosa-ozempic" || caseData.id === "rosa-ozempic-ai") ? {
    ndc: "00169461715", quantity: "1", daysSupply: "28",
    providerName: "Dr. Michael Torres, MD", providerNPI: "1876543210",
    providerPhone: "(503) 445-8820", providerFax: "(503) 445-8821",
    providerAddress: "1820 SW Canyon Rd, Portland, OR 97221",
  } : {
    ndc: "00024555601", quantity: "2", daysSupply: "28",
    providerName: "Dr. Amanda Foster", providerNPI: "1234567890",
    providerPhone: "(555) 432-1098", providerFax: "(555) 432-1099",
    providerAddress: "1200 Medical Center Dr, Suite 340, Boston, MA 02115",
  };
  const preReviewComplete = caseData.manualReview ? rulesLoaded : true;
  const selectedDiagnosisData = caseDiagnoses.find((d) => d.id === selectedDiagnosis);
  const { policies: allPolicies } = usePolicies();
   const [selectedPolicyOverride, setSelectedPolicyOverride] = useState<string | null>(null);
   const [policySearchQuery, setPolicySearchQuery] = useState("");
  const displayPolicyName = selectedPolicyOverride || selectedDiagnosisData?.policyName || (caseData.id === "new-drug-manual" ? "Default Policy" : ((caseData.id === "rosa-ozempic" || caseData.id === "rosa-ozempic-ai") ? "Preferred GLP-1 and GIP/GLP-1" : caseData.drugName));
  const selectedPolicy = allPolicies.find(p => p.name === displayPolicyName || p.id === displayPolicyName || (caseData.drugName && p.name.toLowerCase() === caseData.drugName.toLowerCase())) || allPolicies.find(p => p.isDefault);

  // Patient history section states
  const [isCaseDetailsExpanded, setIsCaseDetailsExpanded] = useState(false);
  const [caseInternalNotes, setCaseInternalNotes] = useState(() => [
    ...getOverrideNotes(caseData.caseNumber).map((n, i) => ({
      id: `ovr-note-${i}-${n.at}`,
      author: "Override Queue",
      date: n.at.split("T")[0],
      preview: "[Override Queue] " + n.text.slice(0, 30) + (n.text.length > 30 ? "..." : ""),
      fullContent: `${n.at.replace("T", " ").slice(0, 16)} [Override Queue] ${n.text}`,
    })),
    ...mockCaseInternalNotes,
  ]);
  const [editQuantity, setEditQuantity] = useState(caseSpecific.quantity);
  const [editDaysSupply, setEditDaysSupply] = useState(caseSpecific.daysSupply);
  const [isEditingCaseDetails, setIsEditingCaseDetails] = useState(false);
  const [draftQty, setDraftQty] = useState("");
  const [draftDays, setDraftDays] = useState("");
  const [newNoteInput, setNewNoteInput] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isInternalNotesOpen, setIsInternalNotesOpen] = useState(false);
  const [isPolicyAttachmentsOpen, setIsPolicyAttachmentsOpen] = useState(false);
  const [isMemberHistoryOpen, setIsMemberHistoryOpen] = useState(false);
  const [memberHistoryTab, setMemberHistoryTab] = useState<"cases" | "claims">("cases");
  const [casesPage, setCasesPage] = useState(1);
  const [casesPageSize, setCasesPageSize] = useState(5);
  const [claimsPage, setClaimsPage] = useState(1);
  const [claimsPageSize, setClaimsPageSize] = useState(5);
  const [claimScope, setClaimScope] = useState<ClaimScope>("paid-case-gpi");
  const [fetchedClaims, setFetchedClaims] = useState<typeof mockClaimsPool>(() =>
    filterClaimsByScope("paid-case-gpi").slice(0, 50)
  );
  const [lastBatchSize, setLastBatchSize] = useState(
    filterClaimsByScope("paid-case-gpi").slice(0, 50).length
  );

  const fetchClaims = (reset: boolean) => {
    const pool = filterClaimsByScope(claimScope);
    const offset = reset ? 0 : fetchedClaims.length;
    const batch = pool.slice(offset, offset + 50);
    setFetchedClaims(reset ? batch : [...fetchedClaims, ...batch]);
    setLastBatchSize(batch.length);
    if (reset) setClaimsPage(1);
  };
  const [isCaseDetailsOpen, setIsCaseDetailsOpen] = useState(false);
  const [isProviderPopupOpen, setIsProviderPopupOpen] = useState(false);
  const [requestType, setRequestType] = useState("Organization Determination");
  const [priorityLevel, setPriorityLevel] = useState("Standard");
  const [internalNote, setInternalNote] = useState("");

  // Override flow states
  const [overrideMode, setOverrideMode] = useState<Record<string, "wrong-criteria" | "pharmacist-exception" | "missing-criteria" | null>>({});
  const [overrideCorrectedCriteria, setOverrideCorrectedCriteria] = useState<Record<string, string>>({});
  const [overrideExceptionNote, setOverrideExceptionNote] = useState<Record<string, string>>({});
  const [missingCriteriaNote, setMissingCriteriaNote] = useState<Record<string, string>>({});
  const [missingCriteriaFlags, setMissingCriteriaFlags] = useState<Record<string, boolean>>({});
  const [missingCriteriaInputText, setMissingCriteriaInputText] = useState<Record<string, string>>({});
  const [missingInlineOverride, setMissingInlineOverride] = useState<Record<string, { choice: "pass-corrected" | "fail-corrected" | null; text: string }>>({});
  const [expandedRuleText, setExpandedRuleText] = useState<Record<string, boolean>>({});
  const [correctedCriteriaInput, setCorrectedCriteriaInput] = useState("");
  const [correctedCriteriaPassFail, setCorrectedCriteriaPassFail] = useState<boolean>(true);
  const [exceptionNoteInput, setExceptionNoteInput] = useState("");

  // Drag-capture state: per-rule map so multiple criteria can have pending drops
  const [dragCaptureStates, setDragCaptureStates] = useState<Record<string, {
    option: "pass-corrected" | "fail-corrected";
    capturedText: string;
  }>>({});
  const [isDragOver, setIsDragOver] = useState(false);
  // Track which rule's extraction box is being hovered during any drag
  const [dragHoveredRuleId, setDragHoveredRuleId] = useState<string | null>(null);
  // Inline editing of extracted chart note values
  const [inlineEditingRuleId, setInlineEditingRuleId] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState("");

  // Conditional rule sub-option state
  const [conditionalSelections, setConditionalSelections] = useState<Record<string, Set<string>>>(() => {
    // Initialize from AI pre-selections
    const initial: Record<string, Set<string>> = {};
    const allChecks = [...mockRuleChecks, ...mockRuleChecksDupixentReauth, ...mockRuleChecksDeny, ...mockRuleChecksZepbound, ...mockRuleChecksZepboundMASH, ...mockRuleChecksHumira, ...mockRuleChecksGalantamine, ...mockRuleChecksRosaAI];
    allChecks.forEach((check) => {
      if (check.isConditional && check.subOptions) {
        const selected = new Set<string>();
        check.subOptions.forEach((opt) => {if (opt.aiSelected) selected.add(opt.id);});
        initial[check.id] = selected;
      }
    });
    return initial;
  });
  const [conditionalDocs, setConditionalDocs] = useState<Record<string, Record<string, string>>>(() => {
    // Initialize from AI extracted values
    const initial: Record<string, Record<string, string>> = {};
    const allChecks = [...mockRuleChecks, ...mockRuleChecksDupixentReauth, ...mockRuleChecksDeny, ...mockRuleChecksZepbound, ...mockRuleChecksZepboundMASH, ...mockRuleChecksHumira, ...mockRuleChecksGalantamine, ...mockRuleChecksRosaAI];
    allChecks.forEach((check) => {
      if (check.isConditional && check.subOptions) {
        const docs: Record<string, string> = {};
        check.subOptions.forEach((opt) => {if (opt.extractedValue) docs[opt.id] = opt.extractedValue;});
        if (Object.keys(docs).length > 0) initial[check.id] = docs;
      }
    });
    return initial;
  });

  const [manualConditionalSelections, setManualConditionalSelections] = useState<Record<string, Set<number>>>(() => getInitialManualConditionalSelections());
  const [manualConditionalDocs, setManualConditionalDocs] = useState<Record<string, Record<number, string>>>(() => getInitialManualConditionalDocs());

  const toggleConditionalSubOption = (ruleId: string, optionId: string) => {
    setConditionalSelections((prev) => {
      const current = new Set(prev[ruleId] || []);
      if (current.has(optionId)) current.delete(optionId);else
      current.add(optionId);
      return { ...prev, [ruleId]: current };
    });
  };

  const updateConditionalDoc = (ruleId: string, optionId: string, value: string) => {
    setConditionalDocs((prev) => ({
      ...prev,
      [ruleId]: { ...(prev[ruleId] || {}), [optionId]: value }
    }));
  };

  const toggleManualConditionalSubOption = (criteriaId: string, optionIndex: number) => {
    setManualConditionalSelections((prev) => {
      const current = new Set(prev[criteriaId] || []);
      if (current.has(optionIndex)) current.delete(optionIndex);else
      current.add(optionIndex);
      return { ...prev, [criteriaId]: current };
    });
  };

  const updateManualConditionalDoc = (criteriaId: string, optionIndex: number, value: string) => {
    setManualConditionalDocs((prev) => ({
      ...prev,
      [criteriaId]: { ...(prev[criteriaId] || {}), [optionIndex]: value }
    }));
  };

  // Reset review state and auto-highlight first rule on case load
  useEffect(() => {
    // When an outcome already exists (Approved/Denied/RFI), pre-mark all rules
    // and manual criteria as reviewed so the case reads as completed.
    if (outcome) {
      setConfirmedRules(new Set(ruleChecks.map((r) => r.id)));
      setConfirmedManualCriteria(new Set(activeManualCriteria.map((c) => c.id)));
    } else {
      setConfirmedRules(new Set());
      setConfirmedManualCriteria(new Set());
    }
    setOverrideCorrectedCriteria({});
    setOverrideExceptionNote({});
    setMissingCriteriaFlags({});
    setMissingCriteriaInputText({});
    setAiRuleStatuses({});
    setAiRulePassOverrides({});
    setAiWrongDataFlags({});
    setDragCaptureStates({});
    setIsDragOver(false);
    setOverrideMode({});
    setFixedRuleOriginals({});
    setSelectedAuthType(null);
    setSelectedDiagnosis(null);
    setManualConditionalSelections(getInitialManualConditionalSelections());
    setManualConditionalDocs(getInitialManualConditionalDocs());
    setCaseInternalNotes(
      (caseData.id === "rosa-ozempic" || caseData.id === "rosa-ozempic-ai")
        ? rosaInternalNotes
        : caseData.id === "4"
          ? chinInternalNotes
          : mockCaseInternalNotes
    );
    if (ruleChecks.length > 0 && !caseData.manualReview) {
      const first = ruleChecks[0];
      const isPassed = first.passed;
      const sourcePageMatch = first.sourceLocation?.match(/Page\s*(\d+)/i);
      const sourcePage = sourcePageMatch ? parseInt(sourcePageMatch[1], 10) : null;
      onHighlightRule?.(first.category, !isPassed, null, sourcePage);
    }
  }, [caseData.id]);
  const handleStartOverride = (ruleId: string, type: "wrong-criteria" | "pharmacist-exception" | "missing-criteria") => {
    // Handle missing-criteria immediately without setting overrideMode (no text input needed)
    if (type === "missing-criteria") {
      setMissingCriteriaFlags((prev) => ({
        ...prev,
        [ruleId]: true
      }));
      setAiRuleStatuses((prev) => ({
        ...prev,
        [ruleId]: "missing"
      }));
      setAiRulePassOverrides((prev) => ({
        ...prev,
        [ruleId]: false
      }));
      toast({
        title: "Marked as Missing",
        description: "Criteria has been marked as missing."
      });
      return;
    }

    // For wrong-criteria, set override mode and pre-populate with existing extracted value
    if (type === "wrong-criteria") {
      const ruleCheck = getRuleChecks().find((r) => r.id === ruleId);
      const existingValue = overrideCorrectedCriteria[ruleId] || ruleCheck?.extractedValue || "";
      setCorrectedCriteriaInput(existingValue);
      const currentPassed = aiRulePassOverrides[ruleId] !== undefined ? aiRulePassOverrides[ruleId] : ruleCheck?.passed ?? true;
      setCorrectedCriteriaPassFail(currentPassed);
      setOverrideMode((prev) => ({
        ...prev,
        [ruleId]: type
      }));
      return;
    }
    if (type === "pharmacist-exception") {
      // Show the override mode to allow optional note entry
      setExceptionNoteInput("");
      setOverrideMode((prev) => ({
        ...prev,
        [ruleId]: type
      }));
      return;
    }
  };
  const handleSaveOverride = (ruleId: string) => {
    const mode = overrideMode[ruleId];
    if (mode === "wrong-criteria") {
      if (!correctedCriteriaInput.trim()) {
        toast({
          title: "Corrected criteria required",
          description: "Please enter the correct criteria from the chart note.",
          variant: "destructive"
        });
        return;
      }
      const correctedText = correctedCriteriaInput.trim();
      setOverrideCorrectedCriteria((prev) => ({
        ...prev,
        [ruleId]: correctedText
      }));
      setAiWrongDataFlags((prev) => ({
        ...prev,
        [ruleId]: true
      }));
      // Clear missing criteria flag since we now have a value
      setMissingCriteriaFlags((prev) => {
        const updated = {
          ...prev
        };
        delete updated[ruleId];
        return updated;
      });
      // Set pass/fail based on user's selection
      setAiRulePassOverrides((prev) => ({
        ...prev,
        [ruleId]: correctedCriteriaPassFail
      }));
      toast({
        title: "Override Saved",
        description: `Corrected criteria recorded and marked as ${correctedCriteriaPassFail ? "passed" : "failed"}.`
      });
    } else if (mode === "pharmacist-exception") {
      // Toggle the pass/fail status and save the optional note
      const ruleCheck = getRuleChecks().find((r) => r.id === ruleId);
      const currentPassed = aiRulePassOverrides[ruleId] !== undefined ? aiRulePassOverrides[ruleId] : ruleCheck?.passed ?? true;
      const newPassed = !currentPassed;
      setAiRulePassOverrides((prev) => ({
        ...prev,
        [ruleId]: newPassed
      }));
      // Save the note if provided, otherwise use space to indicate overrule is active
      setOverrideExceptionNote((prev) => ({
        ...prev,
        [ruleId]: exceptionNoteInput.trim() || " "
      }));
      // Save note to aiRuleNotes if provided
      if (exceptionNoteInput.trim()) {
        setAiRuleNotes((prev) => ({
          ...prev,
          [ruleId]: exceptionNoteInput.trim()
        }));
      }
      toast({
        title: "Pharmacist Overrule Applied",
        description: `Status changed to ${newPassed ? "Passed" : "Failed"}.${exceptionNoteInput.trim() ? " Note saved." : ""}`
      });
    } else if (mode === "missing-criteria") {
      // Missing criteria flags already set in handleStartOverride
      // Just save the optional note if provided
      if (exceptionNoteInput.trim()) {
        setMissingCriteriaNote((prev) => ({
          ...prev,
          [ruleId]: exceptionNoteInput.trim()
        }));
      }
      toast({
        title: "Note Saved",
        description: "Missing criteria note has been saved."
      });
    }
    setOverrideMode((prev) => ({
      ...prev,
      [ruleId]: null
    }));
    setCorrectedCriteriaInput("");
    setExceptionNoteInput("");
  };
  const handleCancelOverride = (ruleId: string) => {
    const mode = overrideMode[ruleId];

    // If canceling pharmacist exception, check for saved override
    if (mode === "pharmacist-exception") {
      if (!overrideExceptionNote[ruleId]) {
        // Revert to original state
        setAiRulePassOverrides((prev) => {
          const updated = {
            ...prev
          };
          delete updated[ruleId];
          return updated;
        });
      }
    }
    // If canceling missing criteria, revert to original state
    if (mode === "missing-criteria") {
      // Check if there's a saved note - if not, we should revert the missing state
      if (!missingCriteriaNote[ruleId]) {
        setMissingCriteriaFlags((prev) => {
          const updated = {
            ...prev
          };
          delete updated[ruleId];
          return updated;
        });
        setAiRuleStatuses((prev) => {
          const updated = {
            ...prev
          };
          delete updated[ruleId];
          return updated;
        });
        setAiRulePassOverrides((prev) => {
          const updated = {
            ...prev
          };
          delete updated[ruleId];
          return updated;
        });
      }
    }
    setOverrideMode((prev) => ({
      ...prev,
      [ruleId]: null
    }));
    setCorrectedCriteriaInput("");
    setExceptionNoteInput("");
  };
  const handleFlagWrongData = (ruleId: string) => {
    setAiWrongDataFlags((prev) => ({
      ...prev,
      [ruleId]: true
    }));
    toast({
      title: "Flagged as Wrong Data",
      description: "This extraction has been flagged for review.",
      variant: "destructive"
    });
  };
  const handleUnflagWrongData = (ruleId: string) => {
    setAiWrongDataFlags((prev) => {
      const updated = {
        ...prev
      };
      delete updated[ruleId];
      return updated;
    });
    toast({
      title: "Flag Removed",
      description: "The wrong data flag has been removed."
    });
  };
  const {
    toast
  } = useToast();
  const handleSendToTechReview = (issueType: string, note: string) => {
    const issueLabels: Record<string, string> = {
      "incorrect-member": "Incorrect Member Connection",
      "wrong-drug": "Wrong Drug",
      "manual-error": "Manual/Document Error"
    };
    toast({
      title: "Sent to Tech Review",
      description: `Case flagged for "${issueLabels[issueType] || issueType}". The tech team has been notified.`
    });
    onRequestInformation?.();
  };
  const handleSetAiRuleStatus = (ruleId: string, status: AIRuleStatus) => {
    setAiRuleStatuses((prev) => ({
      ...prev,
      [ruleId]: status
    }));
    if (status !== "pending") {
      setEditingAiRuleId(null);
      toast({
        title: status === "confirmed" ? "Finding Confirmed" : status === "incorrect" ? "Marked as Incorrect" : "Marked as Missing",
        description: "Your feedback has been recorded."
      });
    }
  };
  const handleToggleRulePass = (ruleId: string, currentPassed: boolean) => {
    const newPassed = !currentPassed;
    setAiRulePassOverrides((prev) => ({
      ...prev,
      [ruleId]: newPassed
    }));
    toast({
      title: newPassed ? "Marked as Passed" : "Marked as Failed",
      description: "Criteria status has been updated.",
      variant: newPassed ? "default" : "destructive"
    });
  };
  const handleEditAiRule = (ruleId: string, check: {
    extractedValue?: string;
    sourceLocation?: string;
  }) => {
    setEditingAiRuleId(ruleId);
    if (!aiRuleEdits[ruleId]) {
      setAiRuleEdits((prev) => ({
        ...prev,
        [ruleId]: {
          extractedValue: check.extractedValue || "",
          sourceLocation: check.sourceLocation || ""
        }
      }));
    }
  };
  const handleSaveAiRuleEdit = (ruleId: string) => {
    setEditingAiRuleId(null);
    setAiRuleStatuses((prev) => ({
      ...prev,
      [ruleId]: "confirmed"
    }));
    toast({
      title: "Changes Saved",
      description: "The extracted information has been updated."
    });
  };
  const handleStartAddNote = (ruleId: string) => {
    setEditingNoteId(ruleId);
    setNoteInput(aiRuleNotes[ruleId] || "");
  };
  const handleSaveNote = (ruleId: string) => {
    if (noteInput.trim()) {
      setAiRuleNotes((prev) => ({
        ...prev,
        [ruleId]: noteInput.trim()
      }));
      toast({
        title: "Note Saved",
        description: "Your note has been added to this criteria."
      });
    }
    setEditingNoteId(null);
    setNoteInput("");
  };
  const handleCancelNote = () => {
    setEditingNoteId(null);
    setNoteInput("");
  };
  const handleSetCriteriaStatus = (criteriaId: string, status: CriteriaStatus) => {
    if (status === "documented") {
      setCriteriaStatuses((prev) => ({
        ...prev,
        [criteriaId]: status
      }));
      setEditingCriteriaId(criteriaId);
      setEditingDenialId(null);
    } else if (status === "denied") {
      // Open denial reason input
      setEditingDenialId(criteriaId);
      setEditingCriteriaId(null);
    } else {
      setCriteriaStatuses((prev) => ({
        ...prev,
        [criteriaId]: status
      }));
      setEditingCriteriaId(null);
      setEditingDenialId(null);
      setCriteriaDocumentation((prev) => ({
        ...prev,
        [criteriaId]: ""
      }));
      setCriteriaDenialReasons((prev) => ({
        ...prev,
        [criteriaId]: ""
      }));
      toast({
        title: "Marked as Not Included",
        description: `Criteria status saved for data collection.`
      });
    }
  };
  const handleSaveDenialReason = (criteriaId: string) => {
    setCriteriaStatuses((prev) => ({
      ...prev,
      [criteriaId]: "denied"
    }));
    setEditingDenialId(null);
    toast({
      title: "Denial Reason Saved",
      description: "Criteria marked as denied with reason."
    });
  };
  const handleSaveDocumentation = (criteriaId: string) => {
    setEditingCriteriaId(null);
    toast({
      title: "Documentation Saved",
      description: "Chart note excerpt saved for AI training data."
    });
  };

  // Select appropriate rule checks based on case
  const getRuleChecks = () => {
    if (caseData.id === "7") {
      // Leanne Reynolds - Zepbound with indication toggle
      return zepboundIndication === "mash" ? mockRuleChecksZepboundMASH : mockRuleChecksZepbound;
    }
    if (caseData.id === "5") return mockRuleChecksHumira; // Emily Thompson - Humira
    if (caseData.id === "4") return mockRuleChecksGalantamine; // Robert Chen - Galantamine
    if (caseData.id === "6") return mockRuleChecksDupixentReauth; // David Park - Dupixent Reauth
    if (caseData.id === "rosa-ozempic-ai") return mockRuleChecksRosaAI;
    if (caseData.aiRecommendation === "deny") return mockRuleChecksDeny;
    return mockRuleChecks;
  };
  const ruleChecks = getRuleChecks();

  // Auto-mark criteria with no extracted value as missing
  useEffect(() => {
    const emptyValueRules = ruleChecks.filter((check) => !check.extractedValue || check.extractedValue.trim() === "");
    if (emptyValueRules.length > 0) {
      const newMissingFlags: Record<string, boolean> = {};
      const newStatuses: Record<string, AIRuleStatus> = {};
      const newPassOverrides: Record<string, boolean> = {};
      emptyValueRules.forEach((check) => {
        // Only auto-mark if not already manually overridden
        if (!overrideCorrectedCriteria[check.id] && !overrideExceptionNote[check.id]) {
          newMissingFlags[check.id] = true;
          newStatuses[check.id] = "missing";
          newPassOverrides[check.id] = false;
        }
      });
      if (Object.keys(newMissingFlags).length > 0) {
        setMissingCriteriaFlags((prev) => ({
          ...prev,
          ...newMissingFlags
        }));
        setAiRuleStatuses((prev) => ({
          ...prev,
          ...newStatuses
        }));
        setAiRulePassOverrides((prev) => ({
          ...prev,
          ...newPassOverrides
        }));
      }
    }
  }, [caseData.id, zepboundIndication]);
  const passedRules = ruleChecks.filter((r) => r.passed).length;
  const rulesForRequest = ruleChecks.
  filter((r) => missingCriteriaFlags[r.id]).
  map((r) => ({
    id: r.id,
    category: r.category,
    rule: r.rule
  }));

  // Check if all manual review criteria have been marked
  const allCriteriaMarked = caseData.manualReview ? activeManualCriteria.every((criteria) => criteriaStatuses[criteria.id] === "documented" || criteriaStatuses[criteria.id] === "not-included" || criteriaStatuses[criteria.id] === "denied") : true;
  const markedCriteriaCount = activeManualCriteria.filter((criteria) => criteriaStatuses[criteria.id] && criteriaStatuses[criteria.id] !== "pending").length;

  // AI rule review tracking
  const isRuleReviewed = (ruleId: string) => {
    return confirmedRules.has(ruleId) || !!overrideCorrectedCriteria[ruleId] || !!overrideExceptionNote[ruleId] || missingCriteriaFlags[ruleId] && aiRuleStatuses[ruleId] === "missing";
  };
  const reviewedRuleCount = ruleChecks.filter((r) => isRuleReviewed(r.id)).length;
  const allRulesReviewed = reviewedRuleCount === ruleChecks.length;
  const hasFailedReviewedRule = ruleChecks.some((r) => {
    if (!isRuleReviewed(r.id)) return false;
    const isPassed = aiRulePassOverrides[r.id] !== undefined ? aiRulePassOverrides[r.id] : r.passed;
    return !isPassed;
  });

  // Focus the next unreviewed rule after confirming one
  const focusNextUnreviewedRule = (currentRuleId: string) => {
    const currentIndex = ruleChecks.findIndex((r) => r.id === currentRuleId);
    for (let i = 1; i <= ruleChecks.length; i++) {
      const nextIndex = (currentIndex + i) % ruleChecks.length;
      const nextRule = ruleChecks[nextIndex];
      if (!isRuleReviewed(nextRule.id) && nextRule.id !== currentRuleId) {
        const nextIsPassed = aiRulePassOverrides[nextRule.id] !== undefined ? aiRulePassOverrides[nextRule.id] : nextRule.passed;
        const sourcePageMatch = nextRule.sourceLocation?.match(/Page\s*(\d+)/i);
        const sourcePage = sourcePageMatch ? parseInt(sourcePageMatch[1], 10) : null;
        onHighlightRule?.(nextRule.category, !nextIsPassed, overrideCorrectedCriteria[nextRule.id] || null, sourcePage);
        return;
      }
    }
    onHighlightRule?.(null);
  };

  // Get missed criteria for denial template
  const getMissedCriteria = () => {
    if (caseData.manualReview) {
      // For manual review, get criteria marked as "not-included" or "denied"
      return activeManualCriteria.filter((c) => criteriaStatuses[c.id] === "not-included" || criteriaStatuses[c.id] === "denied").map((c) => ({
        category: c.category,
        rule: c.rule,
        extractedValue: criteriaDenialReasons[c.id] || undefined
      }));
    } else {
      // For AI-assisted, get failed rule checks
      return ruleChecks.filter((r) => !r.passed).map((r) => ({
        category: r.category,
        rule: r.rule,
        extractedValue: r.extractedValue
      }));
    }
  };

  // Get met criteria for approval modal
  const getMetCriteria = () => {
    const checks = getRuleChecks();
    return checks.filter((r) => {
      // Check if passed (considering overrides)
      const isPassed = aiRulePassOverrides[r.id] !== undefined ? aiRulePassOverrides[r.id] : r.passed;
      // Exclude missing criteria
      return isPassed && !missingCriteriaFlags[r.id];
    }).map((r) => ({
      category: r.category,
      rule: r.rule,
      extractedValue: overrideCorrectedCriteria[r.id] || r.extractedValue
    }));
  };
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [fixModalRuleId, setFixModalRuleId] = useState<string | null>(null);
  // Track original state before a fix so we can undo
  const [fixedRuleOriginals, setFixedRuleOriginals] = useState<Record<string, {
    passed: boolean;
    wasMissing: boolean;
    extractedValue?: string;
  }>>({});

  const handleApplyFix = (ruleId: string, option: "pass-corrected" | "fail-corrected" | "not-documented" | "clinical-judgment", text?: string) => {
    // Store original state before fix (only if not already stored)
    if (!fixedRuleOriginals[ruleId]) {
      const ruleCheck = getRuleChecks().find((r) => r.id === ruleId);
      const originalPassed = aiRulePassOverrides[ruleId] !== undefined ? aiRulePassOverrides[ruleId] : ruleCheck?.passed ?? true;
      setFixedRuleOriginals((prev) => ({
        ...prev,
        [ruleId]: {
          passed: originalPassed,
          wasMissing: !!missingCriteriaFlags[ruleId],
          extractedValue: ruleCheck?.extractedValue
        }
      }));
    }

    if (option === "pass-corrected" || option === "fail-corrected") {
      const isPassing = option === "pass-corrected";
      setMissingCriteriaFlags((prev) => {const u = { ...prev };delete u[ruleId];return u;});
      setAiRulePassOverrides((prev) => ({ ...prev, [ruleId]: isPassing }));
      // Keep card open with documentation pre-filled from modal, user must confirm via Agree/Disagree
      setDragCaptureStates((prev) => ({ ...prev, [ruleId]: { option, capturedText: text || "" } }));
      // Remove any existing overrides so the drag capture area shows instead of the collapsed corrected section
      setOverrideCorrectedCriteria((prev) => {const u = { ...prev };delete u[ruleId];return u;});
      setAiWrongDataFlags((prev) => {const u = { ...prev };delete u[ruleId];return u;});
      // Ensure card is not marked as reviewed
      setConfirmedRules((prev) => {const next = new Set(prev);next.delete(ruleId);return next;});
      toast({ title: "Status Updated", description: `Criteria marked as ${isPassing ? "passed" : "failed"}. Review documentation below.` });
      return;
    } else if (option === "not-documented") {
      setMissingCriteriaFlags((prev) => ({ ...prev, [ruleId]: true }));
      setAiRuleStatuses((prev) => ({ ...prev, [ruleId]: "missing" }));
      setAiRulePassOverrides((prev) => ({ ...prev, [ruleId]: false }));
      toast({ title: "Marked as Missing", description: "Criteria has been marked as not documented." });
    } else if (option === "clinical-judgment") {
      const ruleCheck = getRuleChecks().find((r) => r.id === ruleId);
      const currentPassed = aiRulePassOverrides[ruleId] !== undefined ? aiRulePassOverrides[ruleId] : ruleCheck?.passed ?? true;
      setAiRulePassOverrides((prev) => ({ ...prev, [ruleId]: !currentPassed }));
      setOverrideExceptionNote((prev) => ({ ...prev, [ruleId]: text || " " }));
      if (text) setAiRuleNotes((prev) => ({ ...prev, [ruleId]: text }));
      toast({ title: "Clinical Judgment Applied", description: `Status changed to ${!currentPassed ? "Passed" : "Failed"}.` });
    }
    // Mark as reviewed after any fix and focus next
    setConfirmedRules((prev) => new Set([...prev, ruleId]));
    focusNextUnreviewedRule(ruleId);
  };

  const handleDragCaptureDrop = (e: React.DragEvent, ruleId?: string) => {
    e.preventDefault();
    setIsDragOver(false);
    setDragHoveredRuleId(null);
    const droppedText = e.dataTransfer.getData("text/plain").trim();
    if (!droppedText || !ruleId) return;
    if (dragCaptureStates[ruleId]) {
      setDragCaptureStates((prev) => {
        const existing = prev[ruleId]?.capturedText ?? "";
        const combined = existing ? `${existing}\n${droppedText}` : droppedText;
        return { ...prev, [ruleId]: { ...prev[ruleId], capturedText: combined } };
      });
    } else {
      // No Fix was clicked — auto-enter drag capture with the dropped text
      const ruleCheck = getRuleChecks().find((r) => r.id === ruleId);
      const currentPassed = aiRulePassOverrides[ruleId] !== undefined ? aiRulePassOverrides[ruleId] : ruleCheck?.passed ?? true;
      setDragCaptureStates((prev) => ({ ...prev, [ruleId]: { option: currentPassed ? "pass-corrected" : "fail-corrected", capturedText: droppedText } }));
    }
  };

  const handleDragCaptureConfirm = (ruleId: string) => {
    const state = dragCaptureStates[ruleId];
    if (!state || !state.capturedText.trim()) return;
    const { option, capturedText } = state;
    const isPassing = option === "pass-corrected";
    setOverrideCorrectedCriteria((prev) => ({ ...prev, [ruleId]: capturedText }));
    setAiWrongDataFlags((prev) => ({ ...prev, [ruleId]: true }));
    setMissingCriteriaFlags((prev) => {const u = { ...prev };delete u[ruleId];return u;});
    setAiRulePassOverrides((prev) => ({ ...prev, [ruleId]: isPassing }));
    setConfirmedRules((prev) => new Set([...prev, ruleId]));
    setDragCaptureStates((prev) => {const u = { ...prev };delete u[ruleId];return u;});
    setIsDragOver(false);
    toast({ title: "Fix Applied", description: `Corrected data saved and marked as ${isPassing ? "passed" : "failed"}.` });
    focusNextUnreviewedRule(ruleId);
  };

  const handleDragCaptureCancel = (ruleId: string) => {
    setDragCaptureStates((prev) => {const u = { ...prev };delete u[ruleId];return u;});
    setIsDragOver(false);
    setDragHoveredRuleId(null);
  };
  const handleApproveClick = () => {
    setIsApprovalModalOpen(true);
  };
  const handleConfirmApproval = (details: {
    note?: string;
    effectiveDate: string;
    terminationDate: string;
  }) => {
    toast({
      title: "Case Approved",
      description: `Prior authorization for ${caseData.drugName} has been approved.`
    });
    if (details.note) {
      console.log("Approval note:", details.note);
    }
    onCaseCompleted?.("approved", details);
  };
  const handleDenyClick = () => {
    setIsDenialModalOpen(true);
  };
  const handleConfirmDenial = (letter: string) => {
    toast({
      title: "Case Denied",
      description: `Prior authorization for ${caseData.drugName} has been denied.`,
      variant: "destructive"
    });
    onCaseCompleted?.("denied", { letter });
  };
  const handleRequestInfoSubmit = (selectedRules: string[], letterContent: string) => {
    const selectedRuleNames = ruleChecks.filter((r) => selectedRules.includes(r.id)).map((r) => r.category);
    toast({
      title: "Information Requested",
      description: `Request sent for: ${selectedRuleNames.join(", ")}`
    });
    onRequestInformation?.(letterContent);
  };
  return <div className="flex flex-col bg-white rounded-lg p-6 shadow-sm px-[16px] py-[16px]">
      {/* Claim Banner */}
      {!isClaimed && onClaimCase && <div className="flex items-center justify-between rounded-md border border-amber-400 bg-amber-50 px-4 py-2.5 mb-4">
          <span className="text-sm text-amber-700">This case is unclaimed. Claim it to begin review.</span>
           <Button variant="default" className="!bg-[#1677ff] !border-[#1677ff] !text-white hover:!bg-[#4096ff] h-9 px-5 text-sm" onClick={onClaimCase}>
             <Plus className="h-4 w-4 mr-1.5" />
             Claim
           </Button>
        </div>}

      {/* Patient Name Header */}
      <h2 className="text-2xl font-bold text-foreground mb-1">{caseData.memberName}</h2>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0 text-xs text-muted-foreground">
        <span className="whitespace-nowrap inline-flex items-center gap-1">
          <span className="font-semibold">Medication:</span> {drugNameOverride || caseData.drugName}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => { if (isClaimed) setIsChangeMedOpen(true); }}
                  disabled={!isClaimed}
                  aria-label="Edit medication"
                  className={cn(
                    "ml-1 inline-flex items-center justify-center h-5 w-5 rounded transition-colors",
                    isClaimed
                      ? "text-muted-foreground hover:text-foreground hover:bg-gray-100 cursor-pointer"
                      : "text-gray-300 cursor-not-allowed"
                  )}
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              {!isClaimed && (
                <TooltipContent side="top">Claim the case to edit the drug</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </span>
        <span
          id="member-dob-source"
          className={cn(
            "whitespace-nowrap rounded px-1 -mx-1 transition-all duration-300",
            flashDOB && "ring-2 ring-amber-400 bg-amber-50"
          )}
        >
          <span className="font-semibold">DOB:</span> {caseData.memberDOB}
        </span>
        <span className="whitespace-nowrap"><span className="font-semibold">Case:</span> {(() => {
          let h = 0;
          for (let i = 0; i < caseData.id.length; i++) h = (h * 31 + caseData.id.charCodeAt(i)) >>> 0;
          return String(h % 90000000000 + 10000000000);
        })()}</span>
      </div>
      {caseData.diagnosisCode && <div className="text-xs text-muted-foreground mt-1">
        <span className="whitespace-nowrap"><span className="font-semibold">ICD:</span> {caseData.diagnosisCode}</span>
      </div>}
      <div className="mb-5" />

      {/* Clinical Policy Info Bar */}
      {caseData.id === "7" && !alternatePolicyDismissed && (
        <div className="flex items-start justify-between gap-3 rounded-md border border-amber-400 bg-amber-50 px-4 py-2.5 mb-4">
          <span className="text-sm text-amber-700">
            We found another policy that may be applicable for this case: Humira Q3 2026
          </span>
          <button
            onClick={() => setAlternatePolicyDismissed(true)}
            className="text-amber-700 hover:text-amber-900 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-4">
        <span className="whitespace-nowrap"><span className="font-semibold">Clinical Policy:</span></span>
        <DropdownMenu onOpenChange={(open) => { if (!open) setPolicySearchQuery(""); }}>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-input bg-background px-3 py-1 text-xs font-medium transition-colors hover:text-[#1677ff] hover:border-[#1677ff] [&:hover_svg]:stroke-[#1677ff]">
              {displayPolicyName}
              <ChevronDown className="h-3 w-3 opacity-50 transition-colors" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[260px] p-0">
            <div className="p-2 border-b border-border">
              <input
                type="text"
                placeholder="Search policies..."
                value={policySearchQuery}
                onChange={(e) => setPolicySearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs outline-none placeholder:text-muted-foreground focus:border-[#1677ff]"
              />
            </div>
            <div className="max-h-[250px] overflow-y-auto p-1">
              {allPolicies
                .filter((policy) => policy.name.toLowerCase().includes(policySearchQuery.toLowerCase()))
                .map((policy) => (
                <DropdownMenuItem
                  key={policy.id}
                  onClick={() => { setSelectedPolicyOverride(policy.name); setPolicySearchQuery(""); }}
                  className={cn(
                    "text-xs",
                    displayPolicyName === policy.name && "font-semibold bg-accent"
                  )}
                >
                  {policy.name}
                </DropdownMenuItem>
              ))}
              {allPolicies.filter((policy) => policy.name.toLowerCase().includes(policySearchQuery.toLowerCase())).length === 0 && (
                <div className="px-2 py-3 text-xs text-muted-foreground text-center">No policies found</div>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="whitespace-nowrap flex items-center gap-1">
          <Clock className="h-3 w-3" /> {caseData.authorizationLength || "12 months"}
        </span>
      </div>

      {/* Pre-review Dropdowns (shown for both AI and manual flows) */}
      <div className="mb-4 rounded-lg border border-border bg-card p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Authorization Type</label>
            <AntSelect
              allowClear
              placeholder="Select authorization type"
              value={selectedAuthType || undefined}
              onChange={(v) => { setSelectedAuthType((v as any) || null); setRulesLoaded(false); }}
              options={[
                { value: "initial", label: "Initial Authorization" },
                { value: "reauthorization", label: "Reauthorization" },
              ]}
            />
          </div>
          {caseData.id === "new-drug-manual" ? (<>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Quantity Limit</label>
            <AntSelect
              allowClear
              placeholder="Select Quantity Limit"
              value={selectedQL || undefined}
              onChange={(v) => { setSelectedQL(v || null); setRulesLoaded(false); }}
              options={[
                { value: "within", label: "Within Quantity Limit" },
                { value: "exceeds", label: "Exceeds Quantity Limit" },
              ]}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Non Formulary</label>
            <AntSelect
              allowClear
              placeholder="Select Non Formulary"
              value={selectedNF || undefined}
              onChange={(v) => { setSelectedNF(v || null); setRulesLoaded(false); }}
              options={[
                { value: "non-formulary", label: "Non-Formulary Exception" },
                { value: "on-formulary", label: "On Formulary" },
              ]}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Custom</label>
            <AntSelect
              allowClear
              placeholder="Select Custom"
              value={selectedCustom || undefined}
              onChange={(v) => { setSelectedCustom(v || null); setRulesLoaded(false); }}
              options={[
                { value: "off-label", label: "Off-Label Drug Use" },
                { value: "specialty", label: "Medical Specialty Review" },
              ]}
            />
          </div>
          </>) : (<>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Diagnosis</label>
            <AntSelect
              allowClear
              showSearch
              placeholder="Select diagnosis"
              value={selectedDiagnosis || undefined}
              onChange={(v) => { setSelectedDiagnosis(v || null); setRulesLoaded(false); }}
              optionFilterProp="label"
              options={caseDiagnoses.map((dx) => ({ value: dx.id, label: `${dx.description} (${dx.code})` }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Drug</label>
            <AntSelect
              allowClear
              showSearch
              placeholder="Select drug"
              value={selectedDrug || undefined}
              onChange={(v) => { setSelectedDrug(v || null); setRulesLoaded(false); }}
              optionFilterProp="label"
              options={[
                { value: caseData.drugName || "current", label: caseData.drugName || "Current Drug" },
                { value: "methotrexate", label: "Methotrexate" },
                { value: "sulfasalazine", label: "Sulfasalazine" },
                { value: "hydroxychloroquine", label: "Hydroxychloroquine" },
              ]}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Custom</label>
            <AntSelect
              allowClear
              placeholder="Select custom option"
              value={selectedCustom || undefined}
              onChange={(v) => { setSelectedCustom(v || null); setRulesLoaded(false); }}
              options={[
                { value: "off-label", label: "Off-Label Drug Use" },
                { value: "specialty", label: "Medical Specialty Review" },
              ]}
            />
          </div>
          </>)}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => {
              if (selectedPolicy?.id) {
                window.open(`/policies?policy=${encodeURIComponent(selectedPolicy.id)}`, "_blank", "noopener,noreferrer");
              }
            }}
            disabled={!selectedPolicy?.id}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-medium transition-colors",
              !selectedPolicy?.id
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-[#12275e] text-white hover:bg-[#1a3576]"
            )}
          >
            <ExternalLink className="h-3 w-3" />
            Show Policy
          </button>
          <button
            onClick={() => setRulesLoaded(true)}
            disabled={rulesLoaded}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-medium transition-colors",
              rulesLoaded
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-[#12275e] text-white hover:bg-[#1a3576]"
            )}
          >
            <ClipboardList className="h-3 w-3" />
            {rulesLoaded ? "Rules Loaded" : "Get Rules"}
          </button>
          {!previewMode && (
          <button
            onClick={() => toast({ title: "Sent to Copilot", description: `${displayPolicyName} sent to Copilot.` })}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-[#12275e] px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#1a3576]"
          >
            <Sparkles className="h-3 w-3" />
            Send to Copilot
          </button>
          )}
        </div>
      </div>

      {/* Case Details Dropdown */}
      <Collapsible open={isCaseDetailsOpen} onOpenChange={setIsCaseDetailsOpen} className={cn("mb-4 rounded-md border border-border", isCaseDetailsOpen && "bg-muted/40")}>
        <CollapsibleTrigger className="flex items-center gap-2 px-3 py-2 w-full text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
          <ClipboardList className="h-4 w-4" />
          <span className="font-medium text-foreground">Case Details</span>
          <ChevronDown className={cn("h-4 w-4 ml-auto transition-transform", isCaseDetailsOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 pb-3 px-3 border-t border-border bg-card">
          <div className="flex items-center justify-between gap-4 text-sm py-1">
            <span className="text-muted-foreground">Request Type</span>
            <span className="text-primary text-right">{requestType}</span>
          </div>
          {caseData.relatedCases && caseData.relatedCases.length > 0 && (
            <div className="flex items-center justify-between gap-4 text-sm py-1">
              <span className="text-muted-foreground shrink-0">Related Cases</span>
              <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-right min-w-0">
                {caseData.relatedCases.map((relatedCase) => (
                  <Link key={relatedCase.id} to={`/cases?case=${encodeURIComponent(relatedCase.id)}`} className="text-primary underline">
                    {relatedCase.caseNumber}
                  </Link>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-4 text-sm py-1">
            <span className="text-muted-foreground">Request Reason</span>
            <span className="text-primary text-right">{caseData.id === "new-drug-manual" ? "Non-Formulary" : "Prior Authorization"}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-sm py-1">
            <span className="text-muted-foreground">Priority Level</span>
            <span className="text-primary text-right">{priorityLevel}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-sm py-1">
            <span className="text-muted-foreground">Source</span>
            <span className="text-primary text-right">Fax</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-sm py-1">
            <span className="text-muted-foreground">NDC</span>
            <span className="text-primary text-right">{caseSpecific.ndc}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-sm py-1">
            <span className="text-muted-foreground">Quantity</span>
            <span className="text-primary text-right">
              {isEditingCaseDetails ? <AntInput size="small" className="w-[120px] max-w-full" aria-label="Quantity" value={draftQty} onChange={(e) => setDraftQty(e.target.value)} /> : editQuantity}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 text-sm py-1">
            <span className="text-muted-foreground">Days Supply</span>
            <span className="text-primary text-right">
              {isEditingCaseDetails ? <AntInput size="small" className="w-[120px] max-w-full" aria-label="Days Supply" value={draftDays} onChange={(e) => setDraftDays(e.target.value)} /> : editDaysSupply}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 text-sm py-1">
            <span className="text-muted-foreground shrink-0">Provider Name</span>
            <Button variant="link" className="h-auto p-0 text-sm font-normal text-right whitespace-normal" onClick={() => setIsProviderPopupOpen(true)}>
              {caseSpecific.providerName}
            </Button>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            {isEditingCaseDetails ? (
              <>
                <AntButton size="small" onClick={() => setIsEditingCaseDetails(false)}>Cancel</AntButton>
                <AntButton size="small" type="primary" onClick={() => { setEditQuantity(draftQty.trim() || editQuantity); setEditDaysSupply(draftDays.trim() || editDaysSupply); setIsEditingCaseDetails(false); toast({ title: "Case details updated" }); }}>Save</AntButton>
              </>
            ) : (
              <AntButton size="small" icon={<EditOutlined />} onClick={() => { setDraftQty(editQuantity); setDraftDays(editDaysSupply); setIsEditingCaseDetails(true); }}>Edit</AntButton>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Internal Notes Dropdown */}
      <Collapsible open={isInternalNotesOpen} onOpenChange={setIsInternalNotesOpen} className={cn("mb-4 rounded-md border border-border", isInternalNotesOpen && "bg-muted/40")}>
        <CollapsibleTrigger className="flex items-center gap-2 px-3 py-2 w-full text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
          <MessageSquarePlus className="h-4 w-4" />
          <span className="font-medium text-foreground">Internal Notes</span>
          {caseInternalNotes.length > 0 &&
        <span className="text-xs text-muted-foreground">({caseInternalNotes.length})</span>
        }
          <ChevronDown className={cn("h-4 w-4 ml-auto transition-transform", isInternalNotesOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 pb-3 space-y-3 px-3">
          {/* Existing notes */}
          {caseInternalNotes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              forceOpen={forceOpenNoteId === note.id}
              highlightText={caseData.id === "4" && note.id === "chin-dx" ? CHIN_DIAGNOSIS_TEXT : undefined}
              flashHighlight={flashDiagnosis && note.id === "chin-dx"}
            />
          ))}

          {/* Add new note */}
          <div className="flex gap-2">
            <AntTextArea
            placeholder="Add a note..."
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
            className="min-h-[60px] text-sm flex-1" />
          
          </div>
          {internalNote.trim().length > 0 &&
        <div className="flex justify-end">
              <button
            onClick={() => {
              setCaseInternalNotes((prev) => [{
                id: `n${Date.now()}`,
                author: "MHK",
                date: new Date().toISOString().split("T")[0],
                preview: internalNote.trim().slice(0, 30) + (internalNote.trim().length > 30 ? "..." : ""),
                fullContent: `${new Date().toISOString().replace("T", " ").slice(0, 16)} [pharmacist@rightwayhealthcare.com] ${internalNote.trim()}`
              }, ...prev]);
              setInternalNote("");
            }}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            
                <Send className="h-3 w-3" />
                Add Note
              </button>
            </div>
        }
        </CollapsibleContent>
      </Collapsible>

      {/* Member History Dropdown */}
      <Collapsible open={isMemberHistoryOpen} onOpenChange={setIsMemberHistoryOpen} className={cn("mb-4 rounded-md border border-border", isMemberHistoryOpen && "bg-muted/40")}>
        <CollapsibleTrigger className="flex items-center gap-2 px-3 py-2 w-full text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
          <History className="h-4 w-4" />
          <span className="font-medium text-foreground">Member History</span>
          <ChevronDown className={cn("h-4 w-4 ml-auto transition-transform", isMemberHistoryOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 pb-3 px-3">
          <Tabs value={memberHistoryTab} onValueChange={(v) => setMemberHistoryTab(v as "cases" | "claims")}>
            <TabsList className="mb-2">
              <TabsTrigger value="cases">Cases</TabsTrigger>
              <TabsTrigger value="claims">Pharmacy Claims</TabsTrigger>
            </TabsList>
            <TabsContent value="cases" className="mt-0">
              <div className="rounded-md border border-border overflow-x-auto bg-background">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="text-left font-medium px-3 py-2">Case #</th>
                      <th className="text-left font-medium px-3 py-2">Medication</th>
                      <th className="text-left font-medium px-3 py-2">Status</th>
                      <th className="text-left font-medium px-3 py-2">Request Date</th>
                      <th className="text-left font-medium px-3 py-2">Provider</th>
                      <th className="text-left font-medium px-3 py-2">Chart Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockMemberCases.slice((casesPage - 1) * casesPageSize, casesPage * casesPageSize).map((c) => (
                      <tr key={c.caseNumber} className="border-t border-border">
                        <td className="px-3 py-2 font-medium text-foreground">{c.caseNumber}</td>
                        <td className="px-3 py-2">{c.medication}</td>
                        <td className="px-3 py-2">
                          <Badge variant={c.status === "Approved" ? "default" : c.status === "Denied" ? "destructive" : "secondary"}>
                            {c.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">{c.requestDate}</td>
                        <td className="px-3 py-2">{c.providerName}</td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => toast({ title: "Downloading attachment…", description: c.chartNotes })}
                            aria-label="Download chart notes"
                            className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-2">
                <AntPagination
                  size="small"
                  current={casesPage}
                  pageSize={casesPageSize}
                  total={mockMemberCases.length}
                  showSizeChanger
                  pageSizeOptions={[5, 10, 20, 50]}
                  onChange={(p, ps) => { setCasesPage(p); setCasesPageSize(ps); }}
                  onShowSizeChange={(_, ps) => { setCasesPageSize(ps); setCasesPage(1); }}
                  showTotal={(total) => `${total} total`}
                />
              </div>
            </TabsContent>
            <TabsContent value="claims" className="mt-0">
              <div className="flex items-center gap-2 mb-3">
                <AntSelect
                  size="small"
                  style={{ width: 260 }}
                  value={claimScope}
                  onChange={(v) => setClaimScope(v as ClaimScope)}
                  options={CLAIM_SCOPES}
                />
                <AntButton size="small" type="primary" onClick={() => fetchClaims(true)}>
                  Fetch claims
                </AntButton>
              </div>
              <AntTable
                size="small"
                rowKey={(_r: any, i?: number) => String(i)}
                dataSource={fetchedClaims}
                pagination={{
                  current: claimsPage,
                  pageSize: claimsPageSize,
                  total: fetchedClaims.length,
                  showSizeChanger: true,
                  pageSizeOptions: ["5", "10", "20", "50"],
                  onChange: (p, ps) => { setClaimsPage(p); setClaimsPageSize(ps); },
                  showTotal: (total) => `${total} total`,
                }}
                scroll={{ x: "max-content" }}
                columns={[
                  {
                    title: "ID",
                    dataIndex: "id",
                    sorter: (a: any, b: any) => a.id - b.id,
                    filters: Array.from(new Set(mockMemberClaims.map(c => c.id))).map(v => ({ text: String(v), value: v })),
                    onFilter: (v, r: any) => r.id === v,
                  },
                  {
                    title: "Drug",
                    dataIndex: "drugName",
                    sorter: (a: any, b: any) => a.drugName.localeCompare(b.drugName),
                    filters: Array.from(new Set(mockMemberClaims.map(c => c.drugName))).map(v => ({ text: v, value: v })),
                    onFilter: (v, r: any) => r.drugName === v,
                  },
                  {
                    title: "Status",
                    dataIndex: "status",
                    sorter: (a: any, b: any) => a.status.localeCompare(b.status),
                    filters: Array.from(new Set(mockMemberClaims.map(c => c.status))).map(v => ({ text: v, value: v })),
                    onFilter: (v, r: any) => r.status === v,
                    render: (s: string) => (
                      <Badge variant={s === "Paid" ? "default" : s === "Rejected" ? "destructive" : "secondary"}>{s}</Badge>
                    ),
                  },
                  {
                    title: "Source",
                    dataIndex: "source",
                    sorter: (a: any, b: any) => a.source.localeCompare(b.source),
                    filters: Array.from(new Set(mockMemberClaims.map(c => c.source))).map(v => ({ text: v, value: v })),
                    onFilter: (v, r: any) => r.source === v,
                  },
                  {
                    title: "Date of Service",
                    dataIndex: "dateOfService",
                    sorter: (a: any, b: any) => a.dateOfService.localeCompare(b.dateOfService),
                    filters: Array.from(new Set(mockMemberClaims.map(c => c.dateOfService))).map(v => ({ text: v, value: v })),
                    onFilter: (v, r: any) => r.dateOfService === v,
                  },
                  {
                    title: "Qty",
                    dataIndex: "quantity",
                    sorter: (a: any, b: any) => a.quantity - b.quantity,
                    filters: Array.from(new Set(mockMemberClaims.map(c => c.quantity))).map(v => ({ text: String(v), value: v })),
                    onFilter: (v, r: any) => r.quantity === v,
                  },
                  {
                    title: "Days Supply",
                    dataIndex: "daysSupply",
                    sorter: (a: any, b: any) => a.daysSupply - b.daysSupply,
                    filters: Array.from(new Set(mockMemberClaims.map(c => c.daysSupply))).map(v => ({ text: String(v), value: v })),
                    onFilter: (v, r: any) => r.daysSupply === v,
                  },
                  {
                    title: "GPI",
                    dataIndex: "gpi",
                    sorter: (a: any, b: any) => a.gpi.localeCompare(b.gpi),
                    filters: Array.from(new Set(mockMemberClaims.map(c => c.gpi))).map(v => ({ text: v, value: v })),
                    onFilter: (v, r: any) => r.gpi === v,
                    render: (v: string) => <span className="font-mono">{v}</span>,
                  },
                  {
                    title: "NDC",
                    dataIndex: "ndc",
                    sorter: (a: any, b: any) => a.ndc.localeCompare(b.ndc),
                    filters: Array.from(new Set(mockMemberClaims.map(c => c.ndc))).map(v => ({ text: v, value: v })),
                    onFilter: (v, r: any) => r.ndc === v,
                    render: (v: string) => <span className="font-mono">{v}</span>,
                  },
                  {
                    title: "Prescriber",
                    key: "prescriber",
                    sorter: (a: any, b: any) =>
                      `${a.prescriberLastName} ${a.prescriberFirstName}`.localeCompare(`${b.prescriberLastName} ${b.prescriberFirstName}`),
                    filters: Array.from(new Set(mockMemberClaims.map(c => `${c.prescriberFirstName} ${c.prescriberLastName}`))).map(v => ({ text: v, value: v })),
                    onFilter: (v, r: any) => `${r.prescriberFirstName} ${r.prescriberLastName}` === v,
                    render: (_: any, r: any) => `${r.prescriberFirstName} ${r.prescriberLastName}`,
                  },
                  {
                    title: "NPI",
                    dataIndex: "prescriberNpi",
                    sorter: (a: any, b: any) => a.prescriberNpi.localeCompare(b.prescriberNpi),
                    filters: Array.from(new Set(mockMemberClaims.map(c => c.prescriberNpi))).map(v => ({ text: v, value: v })),
                    onFilter: (v, r: any) => r.prescriberNpi === v,
                    render: (v: string) => <span className="font-mono">{v}</span>,
                  },
                  {
                    title: "Processed",
                    dataIndex: "processedAt",
                    sorter: (a: any, b: any) => a.processedAt.localeCompare(b.processedAt),
                    filters: Array.from(new Set(mockMemberClaims.map(c => c.processedAt))).map(v => ({ text: new Date(v).toLocaleString(), value: v })),
                    onFilter: (v, r: any) => r.processedAt === v,
                    render: (v: string) => new Date(v).toLocaleString(),
                  },
                  {
                    title: "Plan",
                    dataIndex: "planName",
                    sorter: (a: any, b: any) => a.planName.localeCompare(b.planName),
                    filters: Array.from(new Set(mockMemberClaims.map(c => c.planName))).map(v => ({ text: v, value: v })),
                    onFilter: (v, r: any) => r.planName === v,
                  },
                ]}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-muted-foreground">
                  {fetchedClaims.length} claims fetched
                </span>
                <AntButton
                  size="small"
                  disabled={lastBatchSize !== 50}
                  onClick={() => fetchClaims(false)}
                >
                  Fetch next 50
                </AntButton>
              </div>
            </TabsContent>
          </Tabs>
        </CollapsibleContent>
      </Collapsible>

      {/* Policy Attachments Dropdown */}
      <Collapsible open={isPolicyAttachmentsOpen} onOpenChange={setIsPolicyAttachmentsOpen} className={cn("mb-4 rounded-md border border-border", isPolicyAttachmentsOpen && "bg-muted/40")}>
        <CollapsibleTrigger className="flex items-center gap-2 px-3 py-2 w-full text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
          <Paperclip className="h-4 w-4" />
          <span className="font-medium text-foreground">Attachments</span>
          {(() => {
            const attachments = mockPolicyAttachments[displayPolicyName] || mockPolicyAttachments["Default"] || [];
            return attachments.length > 0 ? <span className="text-xs text-muted-foreground">({attachments.length})</span> : null;
          })()}
          <ChevronDown className={cn("h-4 w-4 ml-auto transition-transform", isPolicyAttachmentsOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 pb-3 space-y-1 px-3">
          {(() => {
            const attachments = mockPolicyAttachments[displayPolicyName] || mockPolicyAttachments["Default"] || [];
            if (attachments.length === 0) {
              return <p className="text-xs text-muted-foreground py-2">No attachments available for this policy.</p>;
            }
            return attachments.map((att) => (
              <button
                key={att.id}
                onClick={() => {
                  toast({ title: "Downloading…", description: `${att.name} (${att.size})` });
                }}
                className="flex items-center gap-2 w-full rounded-md border border-border bg-background px-3 py-2 text-left text-xs hover:bg-muted/50 transition-colors group"
              >
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate flex-1 font-medium text-foreground">{att.name}</span>
                <span className="text-muted-foreground shrink-0">{att.size}</span>
                <Download className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            ));
          })()}
        </CollapsibleContent>
      </Collapsible>

      <div className="border-b border-border mb-5 -mx-6" style={{ width: "calc(100% + 48px)" }} />

      {/* AI Review Badge */}
      {caseData.id === "rosa-ozempic-ai" && (
        <div className="flex items-center gap-1.5 mb-4 -mt-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700">
            <Sparkles className="h-3.5 w-3.5" />
            AI Review
          </span>
        </div>
      )}

      {/* Rule Checklist or Clinical Policy */}
      {caseData.manualReview ? <div className="mb-6 flex-1">

          {/* Manual criteria - gated behind pre-review selections */}
          {preReviewComplete ? <div className="space-y-2">
            {activeManualCriteria.map((criteria, index) => {
          const status = criteriaStatuses[criteria.id] || "pending";
          const documentation = criteriaDocumentation[criteria.id] || "";
          const denialReason = criteriaDenialReasons[criteria.id] || "";
          const isEditing = editingCriteriaId === criteria.id;
          const isEditingDenial = editingDenialId === criteria.id;
          const isManualConfirmed = confirmedManualCriteria.has(criteria.id);
          return <div key={criteria.id} onClick={() => {
            if (isManualConfirmed) {
              setConfirmedManualCriteria((prev) => {const n = new Set(prev);n.delete(criteria.id);return n;});
            }
          }} className={cn(
            "group relative rounded-lg border p-4 transition-all duration-200 px-[12px] py-[12px]",
            isManualConfirmed && "!p-3 cursor-pointer",
            status === "documented" && "border-[#b7eb8f] bg-[#f6ffed] hover:border-[#95de64]",
            status === "not-included" && "border-gray-200 bg-white hover:border-gray-300",
            status === "denied" && "border-red-300 bg-red-50 hover:border-red-400",
            isEditingDenial && "border-red-300 bg-red-50",
            status === "pending" && !isEditingDenial && "border-gray-200 bg-white hover:border-gray-300"
          )}>
                  <div className="flex items-start gap-3">
                    {/* Status icon - left side */}
                    <div className="mt-0.5 flex-shrink-0">
                      {status === "documented" ?
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#52c41a] text-white">
                          <Check className="h-3 w-3" />
                        </div> :
                status === "denied" ?
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white">
                          <X className="h-3 w-3" />
                        </div> :
                status === "not-included" ?
                <span className="text-gray-400">📋</span> :

                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted-foreground/30 text-white">
                          <span className="text-[12px] font-bold">{index + 1}</span>
                        </div>
                }
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn(
                    "text-sm font-semibold",
                    status === "documented" && "text-[#389e0d]",
                    status === "denied" && "text-red-600",
                    status === "not-included" && "text-gray-500",
                    status === "pending" && "text-gray-500"
                  )}>
                          {status === "documented" ? "Pass Criteria:" : status === "denied" ? "Fail Criteria:" : status === "not-included" ? "Missing Criteria:" : "Pending Criteria:"} {criteria.category}
                        </span>
                        {isManualConfirmed && <span className="text-[12px] text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1">
                            <Check className="h-3 w-3 text-[#52c41a]" /> Reviewed
                          </span>}
                      </div>
                      {isManualConfirmed ? null : <>
                      <p className="text-sm text-foreground mt-1"><span className="font-semibold">Rule:</span> {criteria.rule}</p>
                      {criteria.isConditional && criteria.subItems ? (() => {
                  const selections = manualConditionalSelections[criteria.id] || new Set<number>();
                  const docs = manualConditionalDocs[criteria.id] || {};
                  const selectedCount = selections.size;
                  const required = criteria.requiredCount || 1;
                  const condPassed = selectedCount >= required;

                  return (
                    <div className="mt-3 rounded-lg border border-border bg-background/60 p-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <p className="text-xs font-medium text-foreground">Select + document qualifying sub-point(s)</p>
                              <span className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[12px] font-semibold",
                          condPassed ?
                          "border-success/30 bg-success/10 text-success" :
                          "border-border bg-muted text-muted-foreground"
                        )}>
                                {selectedCount} of {criteria.subItems.length} · {required} required
                              </span>
                            </div>
                            <div className="space-y-2">
                              {criteria.subItems.map((item, i) => {
                          const isSelected = selections.has(i);
                          const docValue = docs[i] || "";

                          return (
                            <div
                              key={i}
                              className={cn(
                                "rounded-md border p-2.5 transition-colors",
                                isSelected ?
                                "border-success/40 bg-success/5" :
                                "border-border bg-card"
                              )}>
                              
                                    <div className="flex items-start gap-2.5">
                                      <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleManualConditionalSubOption(criteria.id, i)}
                                  className={cn(
                                    "mt-0.5",
                                    isSelected && "border-success data-[state=checked]:bg-success data-[state=checked]:text-success-foreground"
                                  )} />
                                
                                      <div className="min-w-0 flex-1">
                                        <p className={cn("text-sm", isSelected ? "text-foreground font-medium" : "text-muted-foreground")}>{item}</p>
                                        {isSelected &&
                                  <div className="mt-2">
                                            <p className="mb-1 text-[12px] font-medium text-success">Evidence</p>
                                            <AntTextArea
                                      value={docValue}
                                      onChange={(e) => updateManualConditionalDoc(criteria.id, i, e.target.value)}
                                      placeholder="Document chart evidence for this sub-point..."
                                      className="min-h-[40px] resize-none text-xs"
                                      rows={1} />
                                    
                                          </div>
                                  }
                                      </div>
                                    </div>
                                  </div>);

                        })}
                            </div>
                          </div>);

                })() : criteria.subItems && <ul className="mt-2 ml-4 space-y-1 text-sm text-muted-foreground list-disc">
                          {criteria.subItems.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>}
                      
                      {/* Pass documentation input */}
                      {isEditing && <div className="mt-3 space-y-2">
                          {/* For conditional rules, no whole-rule documentation needed — sub-option evidence is sufficient */}
                          {!(criteria.isConditional && criteria.subItems) && <AntTextArea placeholder="Document the passing criteria (e.g., source, evidence found)..." value={documentation} onChange={(e) => setCriteriaDocumentation((prev) => ({
                    ...prev,
                    [criteria.id]: e.target.value
                  }))} className="min-h-[60px] text-sm" autoFocus />}
                          <div className="flex gap-2">
                            <Button size="sm" className="h-7 text-xs !bg-[#52c41a] !border-[#52c41a] !text-white hover:!bg-[#389e0d]" onClick={() => {
                      setCriteriaStatuses((prev) => ({ ...prev, [criteria.id]: "documented" }));
                      setEditingCriteriaId(null);
                      setConfirmedManualCriteria((prev) => new Set([...prev, criteria.id]));
                      toast({ title: "Criteria Passed", description: `${criteria.category} marked as documented.` });
                    }}>
                              Confirm Pass
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingCriteriaId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>}
                      
                      {/* Denial Reason Input */}
                      {isEditingDenial && <div className="mt-3 space-y-2">
                          <AntTextArea placeholder="Enter reason for failure..." value={denialReason} onChange={(e) => setCriteriaDenialReasons((prev) => ({
                    ...prev,
                    [criteria.id]: e.target.value
                  }))} className="min-h-[60px] text-sm" autoFocus />
                          <div className="flex gap-2">
                            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => {
                      setCriteriaStatuses((prev) => ({ ...prev, [criteria.id]: "denied" }));
                      setEditingDenialId(null);
                      setConfirmedManualCriteria((prev) => new Set([...prev, criteria.id]));
                      toast({ title: "Criteria Failed", description: `${criteria.category} marked as failed.` });
                    }}>
                              Confirm Fail
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingDenialId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>}
                      
                      {/* Documented status with documentation */}
                      {status === "documented" && !isEditing && <div className="mt-2">
                          {documentation && <Collapsible>
                              <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-[#389e0d] cursor-pointer hover:opacity-80 transition-opacity">
                                <ChevronDown className="h-3 w-3 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                                Documentation
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="mt-1 rounded-md border border-border bg-white p-2.5">
                                  <p className="text-sm italic text-[#389e0d]">"{documentation}"</p>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>}
                          <AntButton type="text" size="small" style={{ fontSize: 12 }} className="mt-1" onClick={() => {
                    setCriteriaStatuses((prev) => ({ ...prev, [criteria.id]: "pending" }));
                    setConfirmedManualCriteria((prev) => {const n = new Set(prev);n.delete(criteria.id);return n;});
                  }}>
                            <Undo2 className="h-3 w-3 mr-1" /> Undo
                          </AntButton>
                        </div>}

                      {/* Denied status */}
                      {status === "denied" && !isEditingDenial && <div className="mt-2">
                          {denialReason && <div className="mb-1">
                              <p className="text-xs text-red-600 italic">"{denialReason}"</p>
                            </div>}
                          <AntButton type="text" size="small" style={{ fontSize: 12 }} onClick={() => {
                    setCriteriaStatuses((prev) => ({ ...prev, [criteria.id]: "pending" }));
                    setCriteriaDenialReasons((prev) => ({ ...prev, [criteria.id]: "" }));
                    setConfirmedManualCriteria((prev) => {const n = new Set(prev);n.delete(criteria.id);return n;});
                  }}>
                            <Undo2 className="h-3 w-3 mr-1" /> Undo
                          </AntButton>
                        </div>}

                      {/* Not included status */}
                      {status === "not-included" && <div className="mt-2">
                          <AntButton type="text" size="small" style={{ fontSize: 12 }} onClick={() => {
                    setCriteriaStatuses((prev) => ({ ...prev, [criteria.id]: "pending" }));
                    setConfirmedManualCriteria((prev) => {const n = new Set(prev);n.delete(criteria.id);return n;});
                  }}>
                            <Undo2 className="h-3 w-3 mr-1" /> Undo
                          </AntButton>
                        </div>}
                      
                      {/* Action Buttons - only show when pending and not editing */}
                      {status === "pending" && !isEditing && !isEditingDenial && <div className="mt-3 flex items-center gap-2">
                        <AntButton size="small" icon={<Check className="h-3 w-3" />} style={{ fontSize: 12 }} className="hover:!text-[#389e0d] hover:!border-[#389e0d]" onClick={() => setEditingCriteriaId(criteria.id)}>
                          Pass
                        </AntButton>
                        <AntButton size="small" danger icon={<X className="h-3 w-3" />} style={{ fontSize: 12 }} onClick={() => setEditingDenialId(criteria.id)}>
                          Fail
                        </AntButton>
                        <AntButton type="text" size="small" style={{ fontSize: 12 }} onClick={() => {
                    setCriteriaStatuses((prev) => ({ ...prev, [criteria.id]: "not-included" }));
                    setConfirmedManualCriteria((prev) => new Set([...prev, criteria.id]));
                    toast({ title: "Missing", description: `${criteria.category} marked as not documented.` });
                  }}>
                          Not Found
                        </AntButton>
                      </div>}
                      </>}
                    </div>
                  </div>
                </div>;
        })}
          </div> : <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-8 text-center">
              <ClipboardList className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Complete the selections above to load the clinical policy criteria.
              </p>
            </div>}
        </div> : <div className="mb-6 flex-1">

          <div className="mb-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  
                  {preReviewComplete


              }
                </div>
              </div>
              {/* Indication Toggle for Zepbound - only show after pre-review */}
              {preReviewComplete && caseData.id === "7" && (() => {
            const obesityPassed = mockRuleChecksZepbound.every((r) => r.passed);
            const mashPassed = mockRuleChecksZepboundMASH.every((r) => r.passed);
            return <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-0.5">
                    <button onClick={() => setZepboundIndication("obesity")} className={cn("flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors", zepboundIndication === "obesity" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                      Obesity
                      <div className={cn("flex h-4 w-4 items-center justify-center rounded-full border", obesityPassed ? "border-success" : "border-destructive")}>
                        {obesityPassed ? <Check className="h-2.5 w-2.5 text-success" /> : <X className="h-2.5 w-2.5 text-destructive" />}
                      </div>
                    </button>
                    <button onClick={() => setZepboundIndication("mash")} className={cn("flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors", zepboundIndication === "mash" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                      MASH
                      <div className={cn("flex h-4 w-4 items-center justify-center rounded-full border", mashPassed ? "border-success" : "border-destructive")}>
                        {mashPassed ? <Check className="h-2.5 w-2.5 text-success" /> : <X className="h-2.5 w-2.5 text-destructive" />}
                      </div>
                    </button>
                  </div>;
          })()}
            </div>
          </div>


          {/* Rule Verification Criteria - always shown for AI reviews */}
          <div className="space-y-2">
            {ruleChecks.map((check, index) => {
          const ruleStatus = aiRuleStatuses[check.id] || "pending";
          const isEditing = editingAiRuleId === check.id;
          const editedValues = aiRuleEdits[check.id] || {
            extractedValue: check.extractedValue || "",
            sourceLocation: check.sourceLocation || ""
          };
          const displayValue = aiRuleEdits[check.id]?.extractedValue ?? check.extractedValue;
          const isPassed = aiRulePassOverrides[check.id] !== undefined ? aiRulePassOverrides[check.id] : check.passed;
          const sourcePageMatch = check.sourceLocation?.match(/Page\s*(\d+)/i);
          const sourcePage = sourcePageMatch ? parseInt(sourcePageMatch[1], 10) : null;

          // ── Conditional Rule Card ──
          if (check.isConditional && check.subOptions) {
            const selections = conditionalSelections[check.id] || new Set<string>();
            const docs = conditionalDocs[check.id] || {};
            const selectedCount = selections.size;
            const required = check.requiredCount || 1;
            const condPassed = selectedCount >= required;
            const isReviewed = confirmedRules.has(check.id);

            return (
              <div
                key={check.id}
                className={cn(
                  "group relative rounded-lg border p-4 transition-all duration-200 px-[12px] py-[12px]",
                  isReviewed && "!p-3",
                  fixedRuleOriginals[check.id] && isReviewed && "cursor-pointer",
                  condPassed ?
                  "border-[#b7eb8f] bg-[#f6ffed] hover:border-[#95de64]" :
                  "border-red-300 bg-red-50 hover:border-red-400",
                  highlightedRule === check.category && "ring-2 ring-blue-400 ring-offset-2"
                )}
                onClick={() => {
                  if (fixedRuleOriginals[check.id] && isReviewed) {
                    setFixModalRuleId(check.id);
                  }
                }}>
                
                <div className="flex items-start gap-3">
                  {/* Status icon - left side */}
                  <div className="mt-0.5 flex-shrink-0">
                    <div className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full",
                      condPassed ? "bg-[#52c41a] text-white" : "bg-red-500 text-white"
                    )}>
                      {condPassed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className={cn("flex items-center justify-between", !isReviewed && "mb-1")}>
                      <div className="flex flex-col gap-[2px]">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-sm font-semibold",
                            condPassed ? "text-[#389e0d]" : "text-red-600"
                          )}>
                            {condPassed ? "Pass Criteria:" : "Fail Criteria:"} {check.category}
                          </span>
                        </div>
                        <span className="text-[12px] text-muted-foreground">{required} required</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isReviewed &&
                        <span className="text-[12px] text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1">
                            <Check className="h-3 w-3 text-[#52c41a]" /> Reviewed
                          </span>
                        }
                      </div>
                    </div>

                    {isReviewed ? null :
                    <>
                        {/* Parent statement */}
                        <p className="text-sm text-foreground mb-3">
                          <span className="font-bold">Rule:</span> {check.parentStatement || check.rule}
                        </p>

                        {/* Separator */}
                        <div className="border-t border-border/60 mb-3" />

                        {/* Sub-options list */}
                        <div className="space-y-2">
                          {check.subOptions.map((opt, optIdx) => {
                          const isSelected = selections.has(opt.id);
                          const docValue = docs[opt.id] || "";
                          return (
                            <div
                              key={opt.id}
                              className={cn(
                                "rounded-lg border p-3 transition-all duration-150",
                                isSelected ?
                                "border-success/40 bg-success/5" :
                                "border-border bg-card hover:border-muted-foreground/30"
                              )}>
                              
                                <div className="flex items-start gap-2.5">
                                  <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleConditionalSubOption(check.id, opt.id)}
                                  className={cn(
                                    "mt-0.5",
                                    isSelected && "border-success data-[state=checked]:bg-success data-[state=checked]:text-white"
                                  )}
                                  onClick={(e) => e.stopPropagation()} />
                                
                                  <div className="flex-1 min-w-0">
                                    <p className={cn(
                                    "text-[13px] leading-relaxed",
                                    isSelected ? "text-foreground font-medium" : "text-muted-foreground"
                                  )}>
                                      <span className="text-[12px] font-bold text-muted-foreground mr-1.5">{optIdx + 1}.</span>
                                      {opt.text}
                                    </p>
                                    {/* AI evidence block for Rosa AI case sub-options */}
                                    {isSelected && caseData.id === "rosa-ozempic-ai" && opt.aiSelected && opt.extractedValue && opt.sourceLocation && (() => {
                                      const pageMatch = opt.sourceLocation?.match(/Page\s*(\d+)/i);
                                      const page = pageMatch ? parseInt(pageMatch[1], 10) : null;
                                      return (
                                        <div 
                                          className="mt-2 rounded-md border border-blue-200 bg-blue-50/50 p-2.5 cursor-pointer hover:bg-blue-100/60 active:scale-[0.98] active:bg-blue-100/80 transition-all duration-150" 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (page) onHighlightRule?.(check.category, false, null, page);
                                          }}
                                        >
                                          <p className="text-[12px] text-foreground italic leading-relaxed">"{opt.extractedValue}"</p>
                                          {page && (
                                            <span className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-medium text-blue-600">
                                              📄 Page {page}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })()}
                                    {/* Inline documentation field - shown when selected (non-AI or non-Rosa AI) */}
                                    {isSelected && !(caseData.id === "rosa-ozempic-ai" && opt.aiSelected && opt.extractedValue) &&
                                  <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                                        <Collapsible>
                                          <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity text-gray-600">
                                            <ChevronDown className="h-3 w-3 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                                            Documentation
                                          </CollapsibleTrigger>
                                          <CollapsibleContent>
                                            <div className="mt-1">
                                              <AntTextArea
                                            value={docValue}
                                            onChange={(e) => updateConditionalDoc(check.id, opt.id, e.target.value)}
                                            placeholder="Document supporting evidence from chart note..."
                                            className="min-h-[40px] text-xs border-border bg-card focus-visible:ring-ring resize-none"
                                            rows={1}
                                            onInput={(e) => {
                                              const target = e.target as HTMLTextAreaElement;
                                              target.style.height = 'auto';
                                              target.style.height = target.scrollHeight + 'px';
                                            }}
                                            ref={(el) => {
                                              const textarea = el?.resizableTextArea?.textArea;
                                              if (textarea) {
                                                textarea.style.height = 'auto';
                                                textarea.style.height = textarea.scrollHeight + 'px';
                                              }
                                            }} />
                                            </div>
                                          </CollapsibleContent>
                                        </Collapsible>
                                      </div>
                                  }
                                    {/* Show AI source if present and not selected */}
                                    {!isSelected && opt.aiSelected && opt.extractedValue &&
                                  <p className="text-[12px] text-muted-foreground mt-1 italic">
                                        AI found: {opt.extractedValue}
                                      </p>
                                  }
                                  </div>
                                </div>
                              </div>);

                        })}
                        </div>

                        {/* Action buttons */}
                        {!previewMode && <div className="mt-3 flex items-center gap-4">
                          <AntButton type="primary" size="small" icon={<CheckCircle className="h-3 w-3" />} style={{ fontSize: 12, backgroundColor: "#12275e", borderColor: "#12275e" }} onClick={(e) => {
                          e.stopPropagation();
                          setConfirmedRules((prev) => new Set([...prev, check.id]));
                          focusNextUnreviewedRule(check.id);
                          toast({ title: "Agreed", description: `${check.category} marked as reviewed.` });
                        }}>
                            Agree
                          </AntButton>
                          <AntButton type="text" size="small" style={{ fontSize: 12 }} onClick={(e) => {
                          e.stopPropagation();
                          setFixModalRuleId(check.id);
                        }}>
                            Override
                          </AntButton>
                        </div>}
                      </>
                    }
                  </div>
                </div>
              </div>);

          }

          // ── Standard Rule Card ──
          return <div key={check.id} onClick={() => {
            if (confirmedRules.has(check.id)) {
              setConfirmedRules((prev) => {const n = new Set(prev);n.delete(check.id);return n;});
              return;
            }
            if (!isEditing) {
              if (missingCriteriaFlags[check.id]) {
                onHighlightRule?.(highlightedRule === check.category ? null : check.category, false, null, null);
                return;
              }
              onHighlightRule?.(highlightedRule === check.category ? null : check.category, !isPassed, overrideCorrectedCriteria[check.id] || null, highlightedRule === check.category ? null : sourcePage);
            }
          }} className={cn("group relative rounded-lg border border-gray-200 bg-white p-4 transition-all duration-200 px-[12px] py-[12px] hover:border-gray-300", !isEditing && "cursor-pointer", confirmedRules.has(check.id) && "!p-3", highlightedRule === check.category && "ring-2 ring-blue-400 ring-offset-2")}>
                  <div className={cn("flex", !isPanelOpen ? "flex-row gap-3" : "flex-col")}>
                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3">
                    {/* Status icon */}
                    <div className="mt-0.5 flex-shrink-0">
                      {missingCriteriaFlags[check.id] ?
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white text-[11px] font-semibold">
                          {index + 1}
                        </div> :
                    isPassed ?
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#52c41a] text-white text-[11px] font-semibold">
                          {index + 1}
                        </div> :

                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white">
                          <X className="h-3 w-3" />
                        </div>
                    }
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col gap-[2px]">
                      <div className={cn("flex items-center justify-between")}>
                        <span className={cn("text-sm font-semibold", missingCriteriaFlags[check.id] ? "text-orange-600" : isPassed ? "text-[#389e0d]" : "text-red-600")}>
                          {missingCriteriaFlags[check.id] ? "Missing Criteria" : isPassed ? "Pass Criteria" : `Fail Criteria: ${check.category}`}
                        </span>
                        {confirmedRules.has(check.id) && <span className="text-[12px] text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1">
                            <Check className="h-3 w-3 text-[#52c41a]" /> Reviewed
                          </span>}
                      </div>
                      
                      {/* Collapsed state - only show criteria and status */}
                      {confirmedRules.has(check.id) ? null : <>
                      <div className="text-sm text-foreground">
                        <p className={cn(!expandedRuleText[check.id] && "line-clamp-3")}>
                          <span className="font-semibold">Rule:</span> {check.rule}
                        </p>
                        {check.rule && check.rule.length > 140 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setExpandedRuleText((prev) => ({ ...prev, [check.id]: !prev[check.id] })); }}
                            className="mt-0.5 text-xs text-blue-600 hover:text-blue-700 underline"
                          >
                            {expandedRuleText[check.id] ? "Show Less" : "Show More"}
                          </button>
                        )}
                      </div>
                      
                      {/* AI Evidence blocks for Rosa AI case */}
                      {caseData.id === "rosa-ozempic-ai" && rosaAIEvidenceMap[check.id] && (
                        <div className="mt-2 space-y-1.5">
                          <span className="block text-[11px] font-semibold uppercase tracking-wider text-primary mb-1">Documentation</span>
                          {rosaAIEvidenceMap[check.id].map((ev, evIdx) => (
                            <div
                              key={evIdx}
                              className="rounded-md border border-transparent bg-[#ECEDE5] hover:bg-[#EAF3DE] hover:border-[#95de64] px-3 py-2 cursor-pointer transition-colors"
                              onClick={(e) => { e.stopPropagation(); onHighlightRule?.(check.category, false, null, ev.page); }}
                            >
                              <div className="text-sm leading-relaxed">
                                <span className="text-blue-600 font-medium mr-1.5">Page {ev.page}</span>
                                <span className="text-foreground">"{ev.quote}"</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* AI Extracted Value - Display with Edit Icon (hide when missing) */}
                      {/* When in wrong-criteria mode, show editable inline */}
                      {overrideMode[check.id] === "wrong-criteria" && <div className="mt-2 rounded-md p-2 border border-amber-500/50 px-[16px] py-[8px] bg-orange-100" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1 mb-1">
                            <AlertTriangle className="h-2.5 w-2.5 text-amber-600" />
                            <span className="text-[12px] uppercase tracking-wide text-amber-700 dark:text-amber-400">Edit extracted value</span>
                          </div>
                          <p className="text-[12px] text-amber-700 dark:text-amber-400 mb-2">Copy the exact criteria from the chart note to help improve AI accuracy</p>
                          <AntTextArea value={correctedCriteriaInput} onChange={(e) => setCorrectedCriteriaInput(e.target.value)} placeholder="Edit or delete the extracted text..."  autoFocus />
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[12px] uppercase tracking-wide text-muted-foreground">Status:</span>
                            <button type="button" onClick={() => setCorrectedCriteriaPassFail(true)} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border transition-colors", correctedCriteriaPassFail ? "bg-success/20 text-success border-success/50" : "bg-muted text-muted-foreground border-border hover:bg-success/10 hover:text-success")}>
                              <Check className="h-3 w-3" />
                              Pass
                            </button>
                            <button type="button" onClick={() => setCorrectedCriteriaPassFail(false)} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border transition-colors", !correctedCriteriaPassFail ? "bg-destructive/20 text-destructive border-destructive/50" : "bg-muted text-muted-foreground border-border hover:bg-destructive/10 hover:text-destructive")}>
                              <X className="h-3 w-3" />
                              Fail
                            </button>
                          </div>
                          <div className="flex justify-end gap-2 mt-2">
                            <Button variant="ghost" size="sm" onClick={() => handleCancelOverride(check.id)}>
                              Cancel
                            </Button>
                            <Button size="sm" onClick={() => handleSaveOverride(check.id)}>
                              Save
                            </Button>
                          </div>
                        </div>}
                      
                      {/* Normal extracted value display / Drag capture target */}
                      {!isEditing && !overrideCorrectedCriteria[check.id] && overrideMode[check.id] !== "wrong-criteria" && !(caseData.id === "rosa-ozempic-ai" && rosaAIEvidenceMap[check.id]) && (() => {
                        const dragCaptureState = dragCaptureStates[check.id] || null;
                        const isDragTarget = !!dragCaptureState;
                        const isHoverTarget = dragHoveredRuleId === check.id;
                        const isActiveTarget = isDragTarget || isHoverTarget;
                        const hasCaptured = isDragTarget && dragCaptureState.capturedText;
                        const showExtracted = displayValue && !missingCriteriaFlags[check.id];
                        const showMissing = missingCriteriaFlags[check.id] && !isActiveTarget;

                        // Show nothing if no value, not missing, and not a drag target
                        if (!showExtracted && !missingCriteriaFlags[check.id] && !isActiveTarget) return null;

                        return (
                          <div className="mt-3" onClick={isActiveTarget ? (e) => e.stopPropagation() : undefined}>
                            {/* Co-pilot's reasoning (pass only) */}
                            {isPassed && !isDragTarget && !showMissing && (
                              <Collapsible onClick={(e) => e.stopPropagation()}>
                                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md bg-gray-100 hover:bg-gray-200/70 px-3 py-2 text-xs font-medium text-primary transition-colors mb-2">
                                  Co-pilot's reasoning
                                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="rounded-md border border-border bg-white p-2.5 mb-2 text-xs text-muted-foreground">
                                    AI matched the required criterion against extracted documentation in the chart note.
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            )}
                            {isPassed && !isDragTarget && !showMissing && <div className="border-t border-border -mx-1 mb-2" />}
                            {/* Label */}
                            {isDragTarget ?
                            <>
                                <div className="flex items-center gap-1 mb-1">
                                  <ChevronDown className={cn("h-3 w-3", dragCaptureState.option === "fail-corrected" ? "text-destructive" : "text-accent")} />
                                  <span className={cn("text-xs font-medium", dragCaptureState.option === "fail-corrected" ? "text-destructive" : "text-accent")}>
                                    Documentation
                                  </span>
                                </div>
                                <div
                                onDragOver={(e) => {e.preventDefault();setIsDragOver(true);}}
                                onDragLeave={() => {setIsDragOver(false);}}
                                onDrop={(e) => handleDragCaptureDrop(e, check.id)}
                                className={cn(
                                  "rounded-md border p-2.5 transition-all duration-200 relative",
                                  isDragOver ?
                                  "border-accent border-2 border-dashed bg-accent/10 scale-[1.01]" :
                                  "border-border bg-white"
                                )}>
                            
                                  <AntTextArea
                                  value={dragCaptureState?.capturedText || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const ruleId = check.id;
                                    setDragCaptureStates((prev) => ({ ...prev, [ruleId]: { ...prev[ruleId], capturedText: val } }));
                                  }}
                                  placeholder={isDragOver ? "Drop here..." : "Type or drag documentation here..."}
                                  className="min-h-[60px] text-sm border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-white resize-none placeholder:text-muted-foreground/60"
                                  onClick={(e) => e.stopPropagation()} />
                            
                                </div>
                              </> :
                            showMissing ? null :
                            (() => {
                              const pageMatch = check.sourceLocation?.match(/Page\s+(\d+)/i);
                              const pageNum = pageMatch ? parseInt(pageMatch[1], 10) : null;
                              return (
                                <div>
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                                      Documentation
                                    </span>
                                    {caseData.id === "4" && check.category === "Age" && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const el = document.getElementById("member-dob-source");
                                          if (el) {
                                            el.scrollIntoView({ behavior: "smooth", block: "center" });
                                            setFlashDOB(true);
                                            setTimeout(() => setFlashDOB(false), 1800);
                                          }
                                        }}
                                        className="text-xs text-blue-600 hover:text-blue-700 underline"
                                      >
                                        (see source)
                                      </button>
                                    )}
                                    {caseData.id === "4" && check.category === "Diagnosis" && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setIsInternalNotesOpen(true);
                                          setForceOpenNoteId("chin-dx");
                                          setTimeout(() => {
                                            const el = document.getElementById("chin-diagnosis-source");
                                            if (el) {
                                              el.scrollIntoView({ behavior: "smooth", block: "center" });
                                            }
                                            setFlashDiagnosis(true);
                                            setTimeout(() => setFlashDiagnosis(false), 1800);
                                          }, 250);
                                        }}
                                        className="text-xs text-blue-600 hover:text-blue-700 underline"
                                      >
                                        (see source)
                                      </button>
                                    )}
                                  </div>
                                  {inlineEditingRuleId === check.id ? (
                                    <div className="rounded-md border border-border bg-white p-2.5" onClick={(e) => e.stopPropagation()}>
                                      <AntTextArea
                                        value={inlineEditValue}
                                        onChange={(e) => setInlineEditValue(e.target.value)}
                                        className="min-h-[60px] text-sm border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-white resize-none"
                                        autoFocus
                                        onBlur={() => {
                                          if (inlineEditValue.trim()) {
                                            setOverrideCorrectedCriteria((prev) => ({ ...prev, [check.id]: inlineEditValue.trim() }));
                                            setAiWrongDataFlags((prev) => ({ ...prev, [check.id]: true }));
                                            setConfirmedRules((prev) => new Set([...prev, check.id]));
                                          }
                                          setInlineEditingRuleId(null);
                                          setInlineEditValue("");
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div
                                      onClick={(e) => { e.stopPropagation(); onHighlightRule?.(check.category, false, null, pageNum); }}
                                      onDoubleClick={(e) => { e.stopPropagation(); setInlineEditingRuleId(check.id); setInlineEditValue(displayValue || ""); }}
                                      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); if (!isDragTarget) setDragHoveredRuleId(check.id); }}
                                      onDragLeave={() => { setIsDragOver(false); if (!isDragTarget) setDragHoveredRuleId(null); }}
                                      onDrop={(e) => handleDragCaptureDrop(e, check.id)}
                                      className="rounded-md border border-transparent bg-[#ECEDE5] hover:bg-[#EAF3DE] hover:border-[#95de64] px-3 py-2 cursor-pointer transition-colors"
                                      title="Click to view in chart • Double-click to edit"
                                    >
                                      <div className="text-sm leading-relaxed">
                                        {pageNum !== null && (
                                          <span className="text-blue-600 font-medium mr-1.5">Page {pageNum}</span>
                                        )}
                                        <span className="text-foreground">"{displayValue}"</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()
                            }

                            {/* Missing (non-drag) display */}
                            {showMissing && null}

                            {/* Agree/Disagree buttons for documentation review */}
                            {isDragTarget &&
                            <div className="flex items-center gap-2 mt-3">
                                <Button variant="outline" size="sm" className="h-8 px-3 text-xs gap-1.5"
                              disabled={!dragCaptureState!.capturedText.trim()}
                              onClick={() => handleDragCaptureConfirm(check.id)}>
                            
                                  {fixedRuleOriginals[check.id] ? "Save" : "Agree ✓"}
                                </Button>
                                {fixedRuleOriginals[check.id] ?
                              <Button variant="ghost" size="sm" className="h-8 px-3 text-xs gap-1.5" onClick={(e) => {
                                e.stopPropagation();
                                const original = fixedRuleOriginals[check.id];
                                setAiRulePassOverrides((prev) => {const u = { ...prev };delete u[check.id];return u;});
                                setOverrideCorrectedCriteria((prev) => {const u = { ...prev };delete u[check.id];return u;});
                                setAiWrongDataFlags((prev) => {const u = { ...prev };delete u[check.id];return u;});
                                setOverrideExceptionNote((prev) => {const u = { ...prev };delete u[check.id];return u;});
                                setAiRuleNotes((prev) => {const u = { ...prev };delete u[check.id];return u;});
                                setDragCaptureStates((prev) => {const u = { ...prev };delete u[check.id];return u;});
                                if (original.wasMissing) {
                                  setMissingCriteriaFlags((prev) => ({ ...prev, [check.id]: true }));
                                  setAiRuleStatuses((prev) => ({ ...prev, [check.id]: "missing" }));
                                } else {
                                  setMissingCriteriaFlags((prev) => {const u = { ...prev };delete u[check.id];return u;});
                                  setAiRuleStatuses((prev) => {const u = { ...prev };delete u[check.id];return u;});
                                }
                                setConfirmedRules((prev) => {const next = new Set(prev);next.delete(check.id);return next;});
                                setFixedRuleOriginals((prev) => {const u = { ...prev };delete u[check.id];return u;});
                                toast({ title: "Fix Reverted", description: "Criteria restored to original state." });
                              }}>
                                    <Undo2 className="h-3 w-3" />
                                    Undo
                                  </Button> :

                              <Button variant="ghost" size="sm" className="h-8 px-3 text-xs gap-1.5" onClick={() => handleDragCaptureCancel(check.id)}>
                                    Disagree
                                  </Button>
                              }
                              </div>
                            }
                          </div>);

                      })()}
                      
                      {/* Corrected Criteria - Replaces original extraction */}
                      {!isEditing && overrideCorrectedCriteria[check.id] && <div className="mt-3 group/extract">
                          <Collapsible onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between">
                              <CollapsibleTrigger className={cn("flex items-center gap-1 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity", isPassed ? "text-success" : "text-destructive")}>
                                <ChevronDown className="h-3 w-3 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                                Documentation
                              </CollapsibleTrigger>
                            </div>
                            <CollapsibleContent>
                              <div className="mt-1 rounded-md border border-border bg-white p-2.5">
                                {inlineEditingRuleId === check.id ?
                              <div onClick={(e) => e.stopPropagation()}>
                                    <AntTextArea
                                  value={inlineEditValue}
                                  onChange={(e) => setInlineEditValue(e.target.value)}
                                  className="min-h-[60px] text-sm border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-white resize-none"
                                  autoFocus
                                  onBlur={() => {
                                    if (inlineEditValue.trim()) {
                                      setOverrideCorrectedCriteria((prev) => ({ ...prev, [check.id]: inlineEditValue.trim() }));
                                    }
                                    setInlineEditingRuleId(null);
                                    setInlineEditValue("");
                                  }} />
                                  </div> :

                              <p
                                className={cn("text-sm italic cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 transition-colors", isPassed ? "text-success" : "text-destructive")}
                                onClick={(e) => {e.stopPropagation();setInlineEditingRuleId(check.id);setInlineEditValue(overrideCorrectedCriteria[check.id]);}}
                                title="Click to edit">
                            "{overrideCorrectedCriteria[check.id]}"</p>
                              }
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </div>}
                      
                      {/* Override: Pharmacist Overrule Display */}
                      {overrideExceptionNote[check.id] && !overrideMode[check.id] && <div className="mt-2 space-y-1.5 group/overrule">
                          <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
                            <ArrowLeftRight className="h-3 w-3" />
                            <span>Pharmacist overrule applied</span>
                            <div className="ml-auto flex items-center gap-1">
                              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground hover:bg-secondary" onClick={(e) => {
                              e.stopPropagation();
                              setOverrideExceptionNote((prev) => {
                                const updated = {
                                  ...prev
                                };
                                delete updated[check.id];
                                return updated;
                              });
                              setAiRulePassOverrides((prev) => {
                                const updated = {
                                  ...prev
                                };
                                delete updated[check.id];
                                return updated;
                              });
                              toast({
                                title: "Override Removed",
                                description: "Pharmacist overrule has been deleted and status reverted."
                              });
                            }}>
                                <Undo2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {aiRuleNotes[check.id] && aiRuleNotes[check.id].trim() !== "" &&
                        <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 p-2">
                              <p className="text-xs text-foreground">{aiRuleNotes[check.id]}</p>
                            </div>
                        }
                        </div>}
                      

                      {/* Override: Pharmacist Overrule Input */}
                      {overrideMode[check.id] === "pharmacist-exception" && <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1 mb-1">
                            <ArrowLeftRight className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Pharmacist Overrule</span>
                          </div>
                          <p className="text-[12px] text-muted-foreground italic">Use when applying clinical judgement to override a requirement</p>
                          <AntTextArea value={exceptionNoteInput} onChange={(e) => setExceptionNoteInput(e.target.value)} placeholder="Optional: Add an internal note for this overrule..."  autoFocus />
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleCancelOverride(check.id)}>
                              Cancel
                            </Button>
                            <Button size="sm" onClick={() => handleSaveOverride(check.id)}>
                              Apply Overrule
                            </Button>
                          </div>
                        </div>}
                      
                      {/* Override: Missing Criteria Input */}
                      {overrideMode[check.id] === "missing-criteria" && <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1 mb-1">
                            <FileX className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-medium text-destructive">Missing Criteria</span>
                          </div>
                          <AntTextArea value={exceptionNoteInput} onChange={(e) => setExceptionNoteInput(e.target.value)} placeholder="Optional: Add a note about the missing criteria..."  autoFocus />
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleCancelOverride(check.id)}>
                              Cancel
                            </Button>
                            <Button size="sm" onClick={() => handleSaveOverride(check.id)}>
                              Save
                            </Button>
                          </div>
                        </div>}
                      
                       {/* Agree / Override buttons at bottom of card (only when panel is open) */}
                       {!previewMode && !isEditing && editingNoteId !== check.id && !overrideMode[check.id] && !dragCaptureStates[check.id] &&
                      <>
                      {/* Inline override options for Missing Criteria */}
                      {missingCriteriaFlags[check.id] && missingInlineOverride[check.id] && (
                        <div className="mt-3 border-t border-dashed border-blue-300 pt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                          {([
                            { value: "pass-corrected" as const, label: "Pass criteria with note", icon: <CheckCircle className="h-4 w-4" />, color: "#52c41a" },
                            { value: "fail-corrected" as const, label: "Fail criteria with note", icon: <X className="h-4 w-4" />, color: "#ff4d4f" },
                          ]).map((opt) => {
                            const selected = missingInlineOverride[check.id]?.choice === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setMissingInlineOverride((prev) => ({ ...prev, [check.id]: { ...(prev[check.id] || { text: "" }), choice: opt.value } }))}
                                className={cn(
                                  "w-full flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors",
                                  selected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
                                )}
                              >
                                <div className="flex items-center gap-2.5">
                                  <span className={cn(
                                    "flex h-4 w-4 items-center justify-center rounded-full border-2",
                                    selected ? "border-blue-500" : "border-gray-300"
                                  )}>
                                    {selected && <span className="h-2 w-2 rounded-full bg-blue-500" />}
                                  </span>
                                  <span className="text-sm font-medium text-foreground">{opt.label}</span>
                                </div>
                                <span style={{ color: opt.color }}>{opt.icon}</span>
                              </button>
                            );
                          })}
                          {missingInlineOverride[check.id]?.choice && (
                            <div className="pt-1">
                              <label className="text-xs font-medium text-blue-600 block mb-1.5">Evidence from chart note</label>
                              <AntTextArea
                                rows={3}
                                value={missingInlineOverride[check.id]?.text || ""}
                                onChange={(e) => setMissingInlineOverride((prev) => ({ ...prev, [check.id]: { ...(prev[check.id] || { choice: null }), text: e.target.value } }))}
                                placeholder="Add the data from the chart note"
                              />
                            </div>
                          )}
                        </div>
                      )}
                      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                          {fixedRuleOriginals[check.id] ? <>
                            <button className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground" onClick={(e) => {
                            e.stopPropagation();
                            const original = fixedRuleOriginals[check.id];
                            setAiRulePassOverrides((prev) => {const u = { ...prev };delete u[check.id];return u;});
                            setOverrideCorrectedCriteria((prev) => {const u = { ...prev };delete u[check.id];return u;});
                            setAiWrongDataFlags((prev) => {const u = { ...prev };delete u[check.id];return u;});
                            setOverrideExceptionNote((prev) => {const u = { ...prev };delete u[check.id];return u;});
                            setAiRuleNotes((prev) => {const u = { ...prev };delete u[check.id];return u;});
                            setDragCaptureStates((prev) => {const u = { ...prev };delete u[check.id];return u;});
                            if (original.wasMissing) {
                              setMissingCriteriaFlags((prev) => ({ ...prev, [check.id]: true }));
                              setAiRuleStatuses((prev) => ({ ...prev, [check.id]: "missing" }));
                            } else {
                              setMissingCriteriaFlags((prev) => {const u = { ...prev };delete u[check.id];return u;});
                              setAiRuleStatuses((prev) => {const u = { ...prev };delete u[check.id];return u;});
                            }
                            setConfirmedRules((prev) => {const next = new Set(prev);next.delete(check.id);return next;});
                            setFixedRuleOriginals((prev) => {const u = { ...prev };delete u[check.id];return u;});
                            toast({ title: "Fix Reverted", description: "Criteria restored to original state." });
                          }}>
                              <Undo2 className="h-3 w-3" /> Undo
                            </button>
                          </> : <>
                            <AntButton type="primary" size="small" icon={<CheckCircle className="h-3 w-3" />} style={{ fontSize: 12, backgroundColor: "#12275e", borderColor: "#12275e" }} onClick={(e) => {
                            e.stopPropagation();
                            const inline = missingCriteriaFlags[check.id] ? missingInlineOverride[check.id] : null;
                            if (inline && inline.choice) {
                              handleApplyFix(check.id, inline.choice, inline.text?.trim() || undefined);
                              setMissingInlineOverride((prev) => { const u = { ...prev }; delete u[check.id]; return u; });
                              return;
                            }
                            setConfirmedRules((prev) => new Set([...prev, check.id]));
                            focusNextUnreviewedRule(check.id);
                            toast({ title: "Agreed", description: `${check.category} marked as reviewed.` });
                          }}>
                              Agree
                            </AntButton>
                            <AntButton size="small" style={{ fontSize: 12 }} onClick={(e) => {
                            e.stopPropagation();
                            if (missingCriteriaFlags[check.id]) {
                              setMissingInlineOverride((prev) => prev[check.id] ? (() => { const u = { ...prev }; delete u[check.id]; return u; })() : ({ ...prev, [check.id]: { choice: null, text: "" } }));
                              return;
                            }
                            setFixModalRuleId(check.id);
                          }}>
                              Override
                            </AntButton>
                          </>}
                        </div>
                      </>
                      }
                       </>}
                    </div>
                  </div>
                  </div>
                  </div>
                </div>;
        })}
          </div>

          {/* Manual Review Criteria - shown below AI checks for Emily Thompson (case 5) */}
          {caseData.id === "5" && (
            <div className="mt-6">
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-xs text-amber-700">
                  <span className="font-semibold">Manual Review Required:</span> The following criteria could not be verified by AI and require manual review.
                </p>
              </div>
              <div className="space-y-2">
                {[
                  { id: "manual-1", category: "Concurrent Medications", rule: "Patient is not currently receiving Humira in combination with another biologic DMARD (e.g., Enbrel, Remicade, Orencia, Rituxan)" },
                  { id: "manual-2", category: "Patient Consent", rule: "Patient has been counseled on risks of immunosuppression, including serious infections and malignancies, and has provided informed consent" },
                ].map((criteria, index) => {
                  const status = criteriaStatuses[criteria.id] || "pending";
                  const documentation = criteriaDocumentation[criteria.id] || "";
                  const denialReason = criteriaDenialReasons[criteria.id] || "";
                  const isEditing = editingCriteriaId === criteria.id;
                  const isEditingDenial = editingDenialId === criteria.id;
                  return (
                    <div key={criteria.id} className={cn(
                      "group relative rounded-lg border p-4 transition-all duration-200 px-[12px] py-[12px]",
                      status === "documented" && "border-[#b7eb8f] bg-[#f6ffed] hover:border-[#95de64]",
                      status === "not-included" && "border-gray-200 bg-white hover:border-gray-300",
                      status === "denied" && "border-red-300 bg-red-50 hover:border-red-400",
                      isEditingDenial && "border-red-300 bg-red-50",
                      status === "pending" && !isEditingDenial && "border-gray-200 bg-white hover:border-gray-300"
                    )}>
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex-shrink-0">
                          {status === "documented" ? (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#52c41a] text-white">
                              <Check className="h-3 w-3" />
                            </div>
                          ) : status === "denied" ? (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white">
                              <X className="h-3 w-3" />
                            </div>
                          ) : status === "not-included" ? (
                            <span className="text-gray-400">📋</span>
                          ) : (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-white">
                              <User className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col gap-[2px]">
                            <span className={cn(
                              "text-sm font-semibold",
                              status === "documented" && "text-[#389e0d]",
                              status === "denied" && "text-red-600",
                              status === "not-included" && "text-gray-500",
                              status === "pending" && "text-amber-600"
                            )}>
                              {status === "documented" ? "Pass Criteria:" : status === "denied" ? "Fail Criteria:" : status === "not-included" ? "Missing Criteria:" : "Manual Review:"} {criteria.category}
                            </span>
                          </div>
                          <p className="text-sm text-foreground mt-1"><span className="font-semibold">Rule:</span> {criteria.rule}</p>

                          {/* Action buttons */}
                          {status === "pending" && !isEditingDenial && editingCriteriaId !== criteria.id && (
                            <div className="mt-3 flex items-center gap-2">
                              <AntButton size="small" icon={<Check className="h-3 w-3" />} style={{ fontSize: 12 }} className="hover:!text-[#389e0d] hover:!border-[#389e0d]" onClick={() => {
                                setEditingCriteriaId(criteria.id);
                              }}>
                                Pass
                              </AntButton>
                              <AntButton size="small" danger icon={<X className="h-3 w-3" />} style={{ fontSize: 12 }} onClick={() => {
                                setEditingDenialId(criteria.id);
                              }}>
                                Fail
                              </AntButton>
                              <AntButton type="text" size="small" style={{ fontSize: 12 }} onClick={() => {
                                setCriteriaStatuses(prev => ({ ...prev, [criteria.id]: "not-included" }));
                                toast({ title: "Missing", description: `${criteria.category} marked as not documented.` });
                              }}>
                                Not Found
                              </AntButton>
                            </div>
                          )}

                          {/* Pass documentation input */}
                          {editingCriteriaId === criteria.id && status === "pending" && (
                            <div className="mt-3 space-y-2">
                              <AntTextArea
                                placeholder="Document the passing criteria (e.g., source, evidence found)..."
                                value={documentation}
                                onChange={(e) => setCriteriaDocumentation(prev => ({ ...prev, [criteria.id]: e.target.value }))}
                                className="min-h-[60px] text-sm"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button size="sm" className="h-7 text-xs !bg-[#52c41a] !border-[#52c41a] !text-white hover:!bg-[#389e0d]" onClick={() => {
                                  setCriteriaStatuses(prev => ({ ...prev, [criteria.id]: "documented" }));
                                  setEditingCriteriaId(null);
                                  toast({ title: "Criteria Passed", description: `${criteria.category} marked as documented.` });
                                }}>
                                  Confirm Pass
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingCriteriaId(null)}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Denial reason input */}
                          {isEditingDenial && (
                            <div className="mt-3 space-y-2">
                              <AntTextArea
                                placeholder="Enter reason for failure..."
                                value={denialReason}
                                onChange={(e) => setCriteriaDenialReasons(prev => ({ ...prev, [criteria.id]: e.target.value }))}
                                className="min-h-[60px] text-sm"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => {
                                  setCriteriaStatuses(prev => ({ ...prev, [criteria.id]: "denied" }));
                                  setEditingDenialId(null);
                                  toast({ title: "Criteria Failed", description: `${criteria.category} marked as failed.` });
                                }}>
                                  Confirm Fail
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingDenialId(null)}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Show documented status with documentation */}
                          {status === "documented" && (
                            <div className="mt-2">
                              {documentation && (
                                <Collapsible>
                                  <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-[#389e0d] cursor-pointer hover:opacity-80 transition-opacity">
                                    <ChevronDown className="h-3 w-3 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                                    Documentation
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="mt-1 rounded-md border border-border bg-white p-2.5">
                                      <p className="text-sm italic text-[#389e0d]">"{documentation}"</p>
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              )}
                              <AntButton type="text" size="small" style={{ fontSize: 12 }} className="mt-1" onClick={() => {
                                setCriteriaStatuses(prev => ({ ...prev, [criteria.id]: "pending" }));
                              }}>
                                <Undo2 className="h-3 w-3 mr-1" /> Undo
                              </AntButton>
                            </div>
                          )}
                          {status === "denied" && denialReason && (
                            <div className="mt-2">
                              <p className="text-xs text-red-600 italic">"{denialReason}"</p>
                              <AntButton type="text" size="small" style={{ fontSize: 12 }} className="mt-1" onClick={() => {
                                setCriteriaStatuses(prev => ({ ...prev, [criteria.id]: "pending" }));
                                setCriteriaDenialReasons(prev => ({ ...prev, [criteria.id]: "" }));
                              }}>
                                <Undo2 className="h-3 w-3 mr-1" /> Undo
                              </AntButton>
                            </div>
                          )}
                          {status === "not-included" && (
                            <div className="mt-2">
                              <AntButton type="text" size="small" style={{ fontSize: 12 }} onClick={() => {
                                setCriteriaStatuses(prev => ({ ...prev, [criteria.id]: "pending" }));
                              }}>
                                <Undo2 className="h-3 w-3 mr-1" /> Undo
                              </AntButton>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>}

      {/* Action Buttons - Bottom Bar */}
      {hideActionBar ? null : outcome ? (
        <div className="mt-4 border-t border-border pt-4">
          <OutcomePanel outcome={outcome} copilotUsedFallback={!caseData.manualReview} onRetract={onRetractOutcome} />
        </div>
      ) : (
      <div className="mt-4 border-t border-border pt-4">
        {!caseData.manualReview && (
          <p className="text-center text-xs text-muted-foreground font-medium mb-2">{reviewedRuleCount} of {ruleChecks.length} confirmed</p>
        )}
        <div className="flex items-center gap-2">
        <Button
        variant="outline"
        size="sm"
        onClick={() => setIsRequestInformationOpen(true)}
        className="!flex-1 !h-8 !text-xs !font-medium !border-[#d9d9d9] !text-[#595959] hover:!text-white hover:!bg-[#1677ff] hover:!border-[#1677ff]">
        
          <Send className="h-3.5 w-3.5 mr-1.5" />
          Request Information
        </Button>
        <Button
        variant="deny"
        size="sm"
        className="!flex-1 !h-8 !text-xs !font-medium !bg-[#ff4d4f] !border-[#ff4d4f] !text-white hover:!bg-[#cf1322] hover:!border-[#cf1322]"
        onClick={handleDenyClick}>
        
          <X className="h-3.5 w-3.5 mr-1.5" />
          Deny
        </Button>
        <Button
        variant="approve"
        size="sm"
        className={cn(
          "!flex-1 !h-8 !text-xs !font-medium !text-white",
          (!caseData.manualReview ? !allRulesReviewed || hasFailedReviewedRule : !allCriteriaMarked) ?
          "!bg-[#b7eb8f] !border-[#b7eb8f] !opacity-100" :
          "!bg-[#52c41a] !border-[#52c41a] hover:!bg-[#389e0d] hover:!border-[#389e0d]"
        )}
        onClick={handleApproveClick}
        disabled={!caseData.manualReview ? !allRulesReviewed || hasFailedReviewedRule : !allCriteriaMarked}>
        
          <Check className="h-3.5 w-3.5 mr-1.5" />
          Approve
        </Button>
        </div>
      </div>
      )}

      <RequestInformationModal isOpen={isRequestInformationOpen} onClose={() => setIsRequestInformationOpen(false)} rules={rulesForRequest} onSubmitProviderRequest={handleRequestInfoSubmit} onSubmitTechReview={handleSendToTechReview} memberName={caseData.memberName} caseNumber={caseData.caseNumber} drugName={caseData.drugName} memberId={(caseData as { memberId?: string }).memberId} policyName={displayPolicyName} />
      
      <DenialTemplateModal isOpen={isDenialModalOpen} onClose={() => setIsDenialModalOpen(false)} onConfirmDenial={handleConfirmDenial} memberName={caseData.memberName} drugName={caseData.drugName} caseNumber={caseData.caseNumber} memberId={(caseData as { memberId?: string }).memberId} policyName={displayPolicyName} missedCriteria={getMissedCriteria()} />
      
      <ApprovalConfirmModal quantity={editQuantity} daysSupply={editDaysSupply} isOpen={isApprovalModalOpen} onClose={() => setIsApprovalModalOpen(false)} onConfirmApproval={handleConfirmApproval} memberName={caseData.memberName} drugName={caseData.drugName} caseNumber={caseData.caseNumber} metCriteria={getMetCriteria()} />

      <ChangeMedicationModal
        open={isChangeMedOpen}
        onOpenChange={setIsChangeMedOpen}
        currentDrugName={drugNameOverride || caseData.drugName}
        onConfirm={(drug) => {
          setDrugNameOverride(`${drug.name} ${drug.strength}`);
          toast({ title: "Medication updated", description: `${drug.name} ${drug.strength}` });
        }}
      />
      
      {(() => {
      const fixRule = fixModalRuleId ? getRuleChecks().find((r) => r.id === fixModalRuleId) : null;
      const fixIsPassed = fixModalRuleId ? aiRulePassOverrides[fixModalRuleId] !== undefined ? aiRulePassOverrides[fixModalRuleId] : fixRule?.passed ?? true : true;
      const fixStatus: "Pass" | "Fail" | "Missing" = fixModalRuleId && missingCriteriaFlags[fixModalRuleId] ? "Missing" : fixIsPassed ? "Pass" : "Fail";
      return <FixCriteriaModal
        isOpen={!!fixModalRuleId}
        onClose={() => setFixModalRuleId(null)}
        criteriaName={fixRule?.category || ""}
        currentStatus={fixStatus}
        currentExtractedValue={fixRule?.extractedValue}
        onApplyFix={(option, text) => {if (fixModalRuleId) handleApplyFix(fixModalRuleId, option, text);}} />;

    })()}
      
      {/* Claims History Dialog */}
      <Dialog open={isClaimsHistoryOpen} onOpenChange={setIsClaimsHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Claims History - {caseData.memberName}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Drug</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockClaimsHistory.map((claim) => <TableRow key={claim.id}>
                    <TableCell className="font-medium">{claim.date}</TableCell>
                    <TableCell>{claim.drug}</TableCell>
                    <TableCell>{claim.type}</TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", claim.decision === "approved" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                        {claim.decision === "approved" ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        {claim.decision === "approved" ? "Approved" : "Denied"}
                      </span>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
            {mockClaimsHistory.length === 0 && <p className="text-center text-muted-foreground py-8">No previous claims found for this member.</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Provider Details Popup */}
      <Dialog open={isProviderPopupOpen} onOpenChange={setIsProviderPopupOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Provider Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-foreground">Name:</span>
              <span className="text-muted-foreground">{caseSpecific.providerName}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-foreground">NPI:</span>
              <span className="text-muted-foreground">{caseSpecific.providerNPI}</span>
            </div>
            <div className="flex items-center gap-x-4 text-xs">
              <span className="whitespace-nowrap"><span className="font-semibold text-foreground">Phone:</span> <span className="text-muted-foreground">{caseSpecific.providerPhone}</span></span>
              <span className="whitespace-nowrap"><span className="font-semibold text-foreground">Fax:</span> <span className="text-muted-foreground">{caseSpecific.providerFax}</span></span>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <span className="font-semibold text-foreground">Address:</span>
              <span className="text-muted-foreground">{caseSpecific.providerAddress}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
}