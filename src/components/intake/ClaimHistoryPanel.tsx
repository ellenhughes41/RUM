import { useEffect, useState } from "react";
import { Button, Select, Table, Tag } from "antd";
import { History, ChevronDown, Lock } from "lucide-react";
import { mockClaimsPool } from "@/components/cases/CaseDetail";

type IntakeClaimScope = "rejected-any" | "paid-any";
const INTAKE_CLAIM_SCOPES = [
  { value: "rejected-any", label: "Rejected claims of any drug" },
  { value: "paid-any", label: "Paid claims of any drug" },
];

const pool = (s: IntakeClaimScope) =>
  mockClaimsPool.filter((c) => c.status === (s === "paid-any" ? "Paid" : "Rejected"));

export function ClaimHistoryPanel({ locked }: { locked: boolean }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [scope, setScope] = useState<IntakeClaimScope>("rejected-any");
  const [claims, setClaims] = useState<typeof mockClaimsPool>([]);
  const [lastBatch, setLastBatch] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => { if (locked) setOpen(false); }, [locked]);

  const fetchClaims = (reset: boolean, s: IntakeClaimScope = scope) => {
    const all = pool(s);
    const offset = reset ? 0 : claims.length;
    const batch = all.slice(offset, offset + 50);
    setClaims(reset ? batch : [...claims, ...batch]);
    setLastBatch(batch.length);
    if (reset) setPage(1);
  };

  const toggle = () => {
    if (locked) return;
    const next = !open;
    setOpen(next);
    if (next && !loaded) { setLoaded(true); fetchClaims(true, "rejected-any"); }
  };

  const columns = [
    { title: "ID", dataIndex: "id", key: "id" },
    { title: "Drug", dataIndex: "drugName", key: "drug" },
    { title: "Status", dataIndex: "status", key: "status",
      render: (s: string) => <Tag color={s === "Paid" ? "green" : s === "Rejected" ? "red" : "default"}>{s}</Tag> },
    { title: "Source", dataIndex: "source", key: "source" },
    { title: "Date of Service", dataIndex: "dateOfService", key: "dos",
      sorter: (a: any, b: any) => a.dateOfService.localeCompare(b.dateOfService), defaultSortOrder: "descend" as const },
    { title: "Qty", dataIndex: "quantity", key: "qty" },
    { title: "Days Supply", dataIndex: "daysSupply", key: "ds" },
    { title: "GPI", dataIndex: "gpi", key: "gpi" },
    { title: "NDC", dataIndex: "ndc", key: "ndc" },
    { title: "Prescriber", key: "prescriber",
      render: (_: unknown, r: any) => `${r.prescriberFirstName ?? ""} ${r.prescriberLastName ?? ""}`.trim() },
    { title: "NPI", dataIndex: "prescriberNpi", key: "npi" },
    { title: "Processed", dataIndex: "processedAt", key: "processed",
      render: (v: string) => (v ? new Date(v).toLocaleString() : "—") },
    { title: "Plan", dataIndex: "planName", key: "plan" },
  ];

  return (
    <div className={`mb-4 rounded-md border border-border ${open ? "bg-muted/40" : ""}`}>
      <button
        type="button"
        onClick={toggle}
        disabled={locked}
        aria-expanded={open}
        className={`flex items-center gap-2 px-3 py-2 w-full text-sm text-muted-foreground transition-colors ${locked ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/50"}`}
      >
        <History className="h-4 w-4" />
        <span className="font-medium text-foreground">Claim History</span>
        {locked && (
          <span className="flex items-center gap-1 text-xs">
            <Lock className="h-3.5 w-3.5" /> Confirm the member first
          </span>
        )}
        <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && !locked && (
        <div className="pt-2 pb-3 px-3">
          <div className="flex items-center gap-2 mb-3">
            <Select size="small" style={{ width: 260 }} value={scope}
              onChange={(v) => setScope(v as IntakeClaimScope)} options={INTAKE_CLAIM_SCOPES} />
            <Button size="small" type="primary" onClick={() => fetchClaims(true)}>Fetch claims</Button>
          </div>
          <Table
            size="small"
            rowKey={(_r: any, i?: number) => String(i)}
            dataSource={claims}
            columns={columns as any}
            scroll={{ x: "max-content" }}
            locale={{ emptyText: "No pharmacy claims for this member." }}
            pagination={{
              current: page, pageSize, total: claims.length, showSizeChanger: true,
              pageSizeOptions: [5, 10, 25, 50], showTotal: (t) => `${t} total`,
              onChange: (p, ps) => { setPage(p); setPageSize(ps); },
            }}
          />
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>{claims.length} claims fetched</span>
            <Button size="small" disabled={lastBatch !== 50} onClick={() => fetchClaims(false)}>Fetch next 50</Button>
          </div>
        </div>
      )}
    </div>
  );
}
