import { useState, useEffect } from "react";

export interface PolicyVersionEntry {
  version: string;
  changedBy: string;
  changedAt: string;
  summary: string;
}

export interface Policy {
  id: string;
  name: string;
  category: string;
  status: "draft" | "published";
  company?: string;
  versionLetter?: string;
  basePolicyName?: string;
  isNew?: boolean;
  version?: string;
  versionHistory?: PolicyVersionEntry[];
  effectiveDate?: string;
  terminationDate?: string;
  drugList?: string;
  plans?: string;
  aiEnabled?: boolean;
  isDefault?: boolean;
  duplicateOfId?: string;
  lastUpdated?: string;
}

const STORAGE_KEY = "clinical-policies";
const STORAGE_VERSION_KEY = "clinical-policies-version";
const CURRENT_VERSION = 10;

const initialPolicies: Policy[] = [
  { id: "default", name: "Default", category: "General", status: "published", effectiveDate: "2024-01-01", terminationDate: undefined, plans: undefined, aiEnabled: true, isDefault: true },
  { id: "13", name: "Reorder policy example", category: "Oncology", status: "draft", effectiveDate: "2026-10-01", terminationDate: undefined, plans: "All", aiEnabled: true },
  { id: "1", name: "Dupixent", category: "Dermatology", status: "published", effectiveDate: "2025-01-01", terminationDate: undefined, plans: "All", aiEnabled: true },
  { id: "4", name: "Humira", category: "Rheumatology", status: "published", effectiveDate: "2024-06-15", terminationDate: "2026-06-30", plans: "All", aiEnabled: true },
  { id: "5", name: "Ozempic", category: "Endocrinology", status: "published", effectiveDate: "2025-03-01", terminationDate: undefined, plans: "All", aiEnabled: true },
  { id: "12", name: "Preferred GLP-1 and GIP/GLP-1", category: "Endocrinology", status: "published", effectiveDate: "2025-01-01", terminationDate: undefined, plans: "All", aiEnabled: true },
  { id: "6", name: "Qulipta (atogepant)", category: "Neurology", status: "published", effectiveDate: "2025-02-01", terminationDate: undefined, plans: "All", aiEnabled: true },
  { id: "2", name: "Evenity", category: "Rheumatology", status: "published", effectiveDate: "2024-09-01", terminationDate: undefined, plans: "All", aiEnabled: true },
  { id: "9", name: "Evenity - Manual Only", category: "Rheumatology", status: "draft", effectiveDate: "2024-09-01", terminationDate: undefined, plans: "1", aiEnabled: false },
  { id: "10", name: "Humira Q3 2026", category: "Rheumatology", status: "published", effectiveDate: "2026-07-01", terminationDate: undefined, plans: "All", aiEnabled: true },
  { id: "3", name: "Galantamine and Rivastigmine", category: "Neurology", status: "published", effectiveDate: "2024-11-01", terminationDate: undefined, plans: "All", aiEnabled: true },
  { id: "7", name: "Skyrizi (Risankizumab-rzaa)", category: "Dermatology", status: "published", effectiveDate: "2025-01-15", terminationDate: undefined, plans: "All", aiEnabled: true },
  { id: "8", name: "Rinvoq", category: "Rheumatology", status: "published", effectiveDate: "2024-08-01", terminationDate: "2026-08-01", plans: "All", aiEnabled: true },
  { id: "11", name: "Rinvoq (upadacitinib)", category: "Rheumatology", status: "draft", effectiveDate: "2025-03-01", terminationDate: undefined, plans: "All", aiEnabled: true, duplicateOfId: "8" },
];

export function usePolicies() {
  const [policies, setPolicies] = useState<Policy[]>(() => {
    try {
      const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
      const version = storedVersion ? parseInt(storedVersion, 10) : 1;
      if (version < CURRENT_VERSION) {
        localStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_VERSION));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialPolicies));
        return initialPolicies;
      }
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Failed to parse stored policies:", e);
    }
    localStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_VERSION));
    return initialPolicies;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(policies));
    } catch (e) {
      console.error("Failed to save policies:", e);
    }
  }, [policies]);

  return { policies, setPolicies };
}

export { initialPolicies };
