import { useSyncExternalStore } from "react";
import dayjs from "dayjs";

export type LetterTrigger = "Denied" | "RFI Requested" | "Closed – RFI Expired" | "Cold Outreach" | "Dismissed as Unnecessary";
export type LetterChannel = "Fax" | "Letter" | "All";
export type TemplateStatus = "Draft" | "Active" | "Inactive";

export interface LetterTemplate {
  id: string;
  name: string;
  trigger: LetterTrigger;
  channel?: LetterChannel;
  policy: string;
  body: string;
  effectiveDate: string; // YYYY-MM-DD
  terminationDate?: string; // YYYY-MM-DD
  published: boolean;
  publishedAt?: string;
  predecessorId?: string;
  createdAt: string;
}

const STORAGE_KEY = "letter-templates";
const STORAGE_VERSION_KEY = "letter-templates-version";
const CURRENT_VERSION = 5;

const BASE_BODY = `<p>Dear {{member_name}},</p><p>We have reviewed the prior authorization request for {{drug_name}} submitted by {{prescriber_name}} under the {{policy_name}} policy.</p><p>{{denial_reason}}</p><p>{{denial_criteria}}</p><p>If you wish to appeal this decision, you must do so by {{appeal_deadline}}. {{appeal_instructions}}</p><p>Sincerely,<br/>Prior Authorization Department</p>`;

const COLD_OUTREACH_BODY = `<p>Dear Prescriber,</p><p>We are reviewing a prior authorization request for {{drug_name}} for your patient {{member_name}} (member ID {{member_id}}).</p><p>To help us complete this review, please fax back the patient’s most recent chart notes, including relevant diagnoses, prior treatments and lab results.</p><p>Thank you,<br/>Prior Authorization Department</p>`;

const DUPLICATE_BODY = `<p>Dear Provider,</p><p>The fax we received for {{member_name}} / {{drug_name}} duplicates case {{case_id}}, which is already on file.</p><p>No further action is needed.</p><p>Thank you,<br/>Prior Authorization Department</p>`;

const initialTemplates: LetterTemplate[] = [
  { id: "1", name: "Standard Denial Notice", trigger: "Denied", policy: "All policies", body: BASE_BODY, effectiveDate: "2025-01-01", published: true, predecessorId: "1a", createdAt: "2024-12-01" },
  { id: "1a", name: "Standard Denial Notice (2024)", trigger: "Denied", policy: "All policies", body: BASE_BODY, effectiveDate: "2024-01-01", terminationDate: "2024-12-31", published: true, createdAt: "2023-12-01" },
  { id: "2", channel: "Fax", name: "Dupixent Denial – Dermatology", trigger: "Denied", policy: "Dupixent", body: BASE_BODY, effectiveDate: "2025-02-15", terminationDate: "2026-12-31", published: true, createdAt: "2025-01-10" },
  { id: "3", name: "Standard RFI Request", trigger: "RFI Requested", policy: "All policies", body: BASE_BODY, effectiveDate: "2024-11-01", published: true, createdAt: "2024-10-01" },
  { id: "4", name: "GLP-1 Additional Records Request", trigger: "RFI Requested", policy: "Preferred GLP-1 and GIP/GLP-1", body: BASE_BODY, effectiveDate: "2026-11-01", published: false, createdAt: "2026-06-01" },
  { id: "5", name: "RFI Expiration Closure Notice", trigger: "Closed – RFI Expired", policy: "All policies", body: BASE_BODY, effectiveDate: "2024-06-15", published: true, createdAt: "2024-05-01" },
  { id: "6", channel: "Letter", name: "Humira Closure – No Response", trigger: "Closed – RFI Expired", policy: "Humira", body: BASE_BODY, effectiveDate: "2023-08-01", terminationDate: "2025-07-31", published: true, createdAt: "2023-07-01" },
  { id: "7", channel: "Letter", name: "Ozempic Denial – Step Therapy", trigger: "Denied", policy: "Ozempic", body: BASE_BODY, effectiveDate: "2026-09-01", published: false, createdAt: "2026-05-01" },
  { id: "8", channel: "Fax", name: "Qulipta Chart Notes Request", trigger: "RFI Requested", policy: "Qulipta (atogepant)", body: BASE_BODY, effectiveDate: "2024-02-01", terminationDate: "2025-12-31", published: true, createdAt: "2024-01-01" },
  { id: "9", channel: "Fax", name: "Standard Cold Outreach Request", trigger: "Cold Outreach", policy: "All policies", body: COLD_OUTREACH_BODY, effectiveDate: "2025-01-01", published: true, createdAt: "2024-12-15" },
  { id: "11", channel: "All", name: "Duplicate Request Notice", trigger: "Dismissed as Unnecessary", policy: "All policies", body: DUPLICATE_BODY, effectiveDate: "2025-01-01", published: true, createdAt: "2024-12-15" },
];
function load(): LetterTemplate[] {
  try {
    const v = Number(localStorage.getItem(STORAGE_VERSION_KEY) || 0);
    if (v === CURRENT_VERSION) {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to load letter templates", e);
  }
  localStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_VERSION));
  return initialTemplates;
}

let templates: LetterTemplate[] = load();
const listeners = new Set<() => void>();

function emit() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (e) {
    console.error("Failed to persist letter templates", e);
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const getSnapshot = () => templates;

export function deriveStatus(t: LetterTemplate, today = dayjs()): TemplateStatus {
  if (!t.published) return "Draft";
  const startsOk = !dayjs(t.effectiveDate).isAfter(today, "day");
  const endsOk = !t.terminationDate || !dayjs(t.terminationDate).isBefore(today, "day");
  return startsOk && endsOk ? "Active" : "Inactive";
}

export function isEffectiveDateLocked(t: LetterTemplate, today = dayjs()): boolean {
  return t.published && !dayjs(t.effectiveDate).isAfter(today, "day");
}

/** Returns overlapping templates in the same (trigger, policy) group. */
export function findOverlaps(
  candidate: Pick<LetterTemplate, "id" | "trigger" | "policy" | "effectiveDate" | "terminationDate">,
  opts: { ignoreIds?: string[] } = {},
): LetterTemplate[] {
  const ignore = new Set([candidate.id, ...(opts.ignoreIds ?? [])]);
  const cStart = dayjs(candidate.effectiveDate);
  const cEnd = candidate.terminationDate ? dayjs(candidate.terminationDate) : null;
  return templates.filter((t) => {
    if (ignore.has(t.id) || !t.published) return false;
    if (t.trigger !== candidate.trigger || t.policy !== candidate.policy) return false;
    const oStart = dayjs(t.effectiveDate);
    const oEnd = t.terminationDate ? dayjs(t.terminationDate) : null;
    const startsBeforeOtherEnds = !oEnd || !cStart.isAfter(oEnd, "day");
    const endsAfterOtherStarts = !cEnd || !cEnd.isBefore(oStart, "day");
    return startsBeforeOtherEnds && endsAfterOtherStarts;
  });
}

export function getLineage(t: LetterTemplate): LetterTemplate[] {
  const group = templates.filter((x) => x.trigger === t.trigger && x.policy === t.policy);
  return group.sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
}

export function upsertTemplate(t: LetterTemplate) {
  const idx = templates.findIndex((x) => x.id === t.id);
  templates = idx >= 0 ? templates.map((x) => (x.id === t.id ? t : x)) : [...templates, t];
  emit();
}

export function getTemplate(id?: string) {
  return templates.find((t) => t.id === id);
}

export interface PublishResult {
  ok: boolean;
  error?: string;
}

export function publishTemplate(t: LetterTemplate): PublishResult {
  const predecessor = t.predecessorId ? templates.find((x) => x.id === t.predecessorId) : undefined;
  const autoTermination = predecessor
    ? dayjs(t.effectiveDate).subtract(1, "day").format("YYYY-MM-DD")
    : undefined;

  if (predecessor && dayjs(autoTermination).isBefore(dayjs(predecessor.effectiveDate), "day")) {
    return {
      ok: false,
      error: `Effective date must be after the predecessor's effective date (${dayjs(predecessor.effectiveDate).format("MMM D, YYYY")}).`,
    };
  }

  const conflicts = findOverlaps(t, predecessor ? { ignoreIds: [predecessor.id] } : {});
  if (conflicts.length) {
    const c = conflicts[0];
    return {
      ok: false,
      error: `Overlapping date range with "${c.name}" (${dayjs(c.effectiveDate).format("MMM D, YYYY")} – ${c.terminationDate ? dayjs(c.terminationDate).format("MMM D, YYYY") : "open-ended"}) for the same Trigger and Policy. Adjust the effective or termination date before publishing.`,
    };
  }

  if (predecessor) {
    const guard = allPoliciesGuard([
      { ...t, published: true },
      { id: predecessor.id, terminationDate: autoTermination },
    ]);
    if (!guard.ok) return guard;
  } else {
    const guard = allPoliciesGuard([{ ...t, published: true }]);
    if (!guard.ok) return guard;
  }

  const published: LetterTemplate = { ...t, published: true, publishedAt: dayjs().toISOString() };
  const exists = templates.some((x) => x.id === t.id);
  templates = exists ? templates.map((x) => (x.id === t.id ? published : x)) : [...templates, published];
  if (predecessor) {
    templates = templates.map((x) =>
      x.id === predecessor.id ? { ...x, terminationDate: autoTermination } : x,
    );
  }
  emit();
  return { ok: true };
}

export const ALL_POLICIES = "All policies";
export const TRIGGERS: LetterTrigger[] = ["Denied", "RFI Requested", "Closed – RFI Expired", "Cold Outreach", "Dismissed as Unnecessary"];

export function isLive(t: LetterTemplate, today = dayjs()) {
  return deriveStatus(t, today) === "Active";
}

/** Simulates the template set after applying pending changes, then reports triggers with no live All-policies letter. */
export function triggersMissingAllPolicies(
  overrides: Array<Partial<LetterTemplate> & { id: string }> = [],
  today = dayjs(),
): LetterTrigger[] {
  const simulated = templates.map((t) => {
    const o = overrides.find((x) => x.id === t.id);
    return o ? ({ ...t, ...o } as LetterTemplate) : t;
  });
  overrides
    .filter((o) => !templates.some((t) => t.id === o.id))
    .forEach((o) => simulated.push(o as LetterTemplate));
  return TRIGGERS.filter(
    (trigger) =>
      !simulated.some(
        (t) => t.trigger === trigger && t.policy === ALL_POLICIES && isLive(t, today),
      ),
  );
}

export interface GuardResult {
  ok: boolean;
  error?: string;
}

function allPoliciesGuard(
  overrides: Array<Partial<LetterTemplate> & { id: string }>,
): GuardResult {
  const missing = triggersMissingAllPolicies(overrides);
  const currentlyMissing = triggersMissingAllPolicies();
  const newlyMissing = missing.filter((m) => !currentlyMissing.includes(m));
  if (newlyMissing.length) {
    return {
      ok: false,
      error: `This change would leave the "${newlyMissing.join('", "')}" trigger without a live "All policies" template, so some cases would resolve to no letter. Publish a replacement All-policies template for that trigger first.`,
    };
  }
  return { ok: true };
}

export function terminateTemplate(id: string, date: string): GuardResult {
  const guard = allPoliciesGuard([{ id, terminationDate: date }]);
  if (!guard.ok) return guard;
  templates = templates.map((t) => (t.id === id ? { ...t, terminationDate: date } : t));
  emit();
  return { ok: true };
}

/** (a) exact policy match if live, else (b) the All-policies template. */
export function resolveTemplate(trigger: LetterTrigger, policy: string, today = dayjs()) {
  const live = templates.filter((t) => t.trigger === trigger && isLive(t, today));
  const exact = live.find((t) => t.policy === policy);
  const fallback = live.find((t) => t.policy === ALL_POLICIES);
  const match = exact ?? fallback;
  return { template: match, matchedOn: exact ? "policy" : match ? "all-policies" : "none" } as const;
}

/** Re-links templates scoped to a predecessor policy onto its successor version. */
export function relinkPolicy(fromPolicyName: string, toPolicyName: string): number {
  const affected = templates.filter((t) => t.policy === fromPolicyName);
  if (!affected.length) return 0;
  templates = templates.map((t) => (t.policy === fromPolicyName ? { ...t, policy: toPolicyName } : t));
  emit();
  return affected.length;
}

export function duplicateTemplate(id: string): LetterTemplate | undefined {
  const src = templates.find((t) => t.id === id);
  if (!src) return undefined;
  const copy: LetterTemplate = {
    ...src,
    id: `t-${Date.now()}`,
    name: `${src.name} (Copy)`,
    published: false,
    publishedAt: undefined,
    terminationDate: undefined,
    effectiveDate: dayjs().add(1, "day").format("YYYY-MM-DD"),
    predecessorId: src.published ? src.id : src.predecessorId,
    createdAt: dayjs().format("YYYY-MM-DD"),
  };
  templates = [...templates, copy];
  emit();
  return copy;
}

export function useLetterTemplates() {
  const list = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { templates: list };
}

export { BASE_BODY };
