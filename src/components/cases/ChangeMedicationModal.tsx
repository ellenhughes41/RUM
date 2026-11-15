import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Table as AntTable } from "antd";
import type { ColumnsType } from "antd/es/table";

export interface DrugOption {
  id: string;
  name: string;
  strength: string;
  form: string;
  route: string;
  gpi14: string;
  ndc: string;
}

export const MOCK_DRUGS: DrugOption[] = [
  { id: "d1", name: "Adalimumab (Humira)", strength: "40 mg / 0.4 mL", form: "Prefilled Syringe", route: "Subcutaneous", gpi14: "21400010100320", ndc: "00074-0554-02" },
  { id: "d2", name: "Adalimumab (Humira)", strength: "80 mg / 0.8 mL", form: "Prefilled Syringe", route: "Subcutaneous", gpi14: "21400010100340", ndc: "00074-0817-02" },
  { id: "d3", name: "Methylphenidate (Concerta)", strength: "27 mg", form: "ER Tablet", route: "Oral", gpi14: "61200030100320", ndc: "50458-0587-01" },
  { id: "d4", name: "Methylphenidate (Concerta)", strength: "54 mg", form: "ER Tablet", route: "Oral", gpi14: "61200030100360", ndc: "50458-0589-01" },
  { id: "d5", name: "Semaglutide (Ozempic)", strength: "0.5 mg / dose", form: "Injection Pen", route: "Subcutaneous", gpi14: "27997050100320", ndc: "00169-4130-12" },
  { id: "d6", name: "Semaglutide (Ozempic)", strength: "1 mg / dose", form: "Injection Pen", route: "Subcutaneous", gpi14: "27997050100340", ndc: "00169-4132-12" },
  { id: "d7", name: "Dupilumab (Dupixent)", strength: "300 mg / 2 mL", form: "Prefilled Syringe", route: "Subcutaneous", gpi14: "21500055100340", ndc: "00024-5914-01" },
  { id: "d8", name: "Atorvastatin (Lipitor)", strength: "40 mg", form: "Tablet", route: "Oral", gpi14: "39400010100340", ndc: "00071-0157-23" },
  { id: "d9", name: "Atorvastatin (Lipitor)", strength: "80 mg", form: "Tablet", route: "Oral", gpi14: "39400010100360", ndc: "00071-0158-23" },
  { id: "d10", name: "Metformin HCl (Glucophage)", strength: "500 mg", form: "Tablet", route: "Oral", gpi14: "27250020100320", ndc: "00087-6060-05" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (drug: DrugOption) => void;
  currentDrugName?: string;
}

export function ChangeMedicationModal({ open, onOpenChange, onConfirm, currentDrugName }: Props) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return MOCK_DRUGS.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.gpi14.includes(q)
    );
  }, [query]);

  const selected = MOCK_DRUGS.find(d => d.id === selectedId) || null;

  const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));
  const columns: ColumnsType<DrugOption> = [
    {
      title: "GPI-14",
      dataIndex: "gpi14",
      key: "gpi14",
      sorter: (a, b) => a.gpi14.localeCompare(b.gpi14),
      render: (v: string) => <span className="font-mono text-xs text-muted-foreground">{v}</span>,
    },
    {
      title: "Drug",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      filters: uniq(MOCK_DRUGS.map(d => d.name)).map(v => ({ text: v, value: v })),
      onFilter: (v, r) => r.name === v,
      render: (v: string) => <span className="text-sm font-medium">{v}</span>,
    },
    {
      title: "Strength",
      dataIndex: "strength",
      key: "strength",
      sorter: (a, b) => a.strength.localeCompare(b.strength),
    },
    {
      title: "Form",
      dataIndex: "form",
      key: "form",
      filters: uniq(MOCK_DRUGS.map(d => d.form)).map(v => ({ text: v, value: v })),
      onFilter: (v, r) => r.form === v,
      sorter: (a, b) => a.form.localeCompare(b.form),
    },
    {
      title: "Route",
      dataIndex: "route",
      key: "route",
      filters: uniq(MOCK_DRUGS.map(d => d.route)).map(v => ({ text: v, value: v })),
      onFilter: (v, r) => r.route === v,
      sorter: (a, b) => a.route.localeCompare(b.route),
    },
  ];

  const handleConfirm = () => {
    if (!selected) return;
    onConfirm(selected);
    onOpenChange(false);
    setQuery("");
    setSelectedId(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setQuery(""); setSelectedId(null); } }}>
      <DialogContent className="max-w-4xl p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle className="text-lg">Change medication</DialogTitle>
          {currentDrugName && (
            <div className="text-xs text-muted-foreground mt-0.5">Current: {currentDrugName}</div>
          )}
        </DialogHeader>

        <div className="px-6 py-4 border-b">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by drug name or GPI"
              className="pl-9 h-10"
            />
          </div>
        </div>

        <div className="px-3 py-2">
          <AntTable<DrugOption>
            size="small"
            rowKey="id"
            dataSource={results}
            columns={columns}
            pagination={false}
            scroll={{ y: 380 }}
            rowSelection={{
              type: "radio",
              selectedRowKeys: selectedId ? [selectedId] : [],
              onChange: (keys) => setSelectedId((keys[0] as string) ?? null),
            }}
            onRow={(record) => ({
              onClick: () => setSelectedId(record.id),
              style: { cursor: "pointer" },
            })}
            rowClassName={(record) => (record.id === selectedId ? "bg-[#12275e]/5" : "")}
          />
        </div>

        <DialogFooter className="px-6 py-3 border-t bg-gray-50">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleConfirm}
            disabled={!selected}
            className="!bg-[#12275e] !border-[#12275e] !text-white hover:!bg-[#1e3a8a] disabled:opacity-50"
          >
            Confirm selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}