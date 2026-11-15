import type { Case } from "@/components/cases/CaseList";

/** Prototype-only, in-memory handoff between Override Queue and Clinical Review. */
export interface OverrideNote {
  caseNumber: string;
  text: string;
  at: string;
}

const notes: OverrideNote[] = [];
const sentBack: Case[] = [];

export function addOverrideNote(caseNumber: string, text: string) {
  notes.unshift({ caseNumber, text, at: new Date().toISOString() });
}

export function getOverrideNotes(caseNumber: string) {
  return notes.filter((n) => n.caseNumber === caseNumber);
}

export function sendBackToClinical(c: Case) {
  if (!sentBack.some((s) => s.caseNumber === c.caseNumber)) sentBack.push(c);
}

export function getSentBackCases(): Case[] {
  return [...sentBack];
}
