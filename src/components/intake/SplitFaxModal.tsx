import { useMemo, useState } from "react";
import { Modal, Button, Tag, Typography, Space } from "antd";
import { WarningOutlined, SearchOutlined, InboxOutlined, UndoOutlined } from "@ant-design/icons";
import { mockMemberDirectory, type MemberRecord } from "@/data/mockIntakeCases";
import { MemberSearchModal } from "./pageDetach";


const { Text } = Typography;

// NOTE: Prototype. Interaction model: click thumbnails to select, then use the
// toolbar to either keep them with the original member or assign them to
// another member via search. May change after design review.

interface FaxPage {
  page: number;
  detectedMember: string | null; // null = low confidence
}

const MOCK_PAGES: FaxPage[] = [
  { page: 1, detectedMember: "Elena Ramirez" },
  { page: 2, detectedMember: "Elena Ramirez" },
  { page: 3, detectedMember: "John Travolta" },
  { page: 4, detectedMember: "John Travolta" },
  { page: 5, detectedMember: null },
];

// Palette used to color-code member groups. Index 0 is always the original member.
const GROUP_COLORS = [
  { border: "#0d9488", bg: "#f0fdfa" }, // teal — original
  { border: "#7c3aed", bg: "#f5f3ff" }, // purple
  { border: "#d97706", bg: "#fffbeb" }, // amber
  { border: "#db2777", bg: "#fdf2f8" }, // pink
  { border: "#2563eb", bg: "#eff6ff" }, // blue
];

const ORIGINAL_MEMBER = "Elena Ramirez";
const UNASSIGNED_KEY = "__unassigned__";
const NOT_A_MEMBER_KEY = "__not_a_member__";

interface SplitFaxModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  transactionId: string;
}

export function SplitFaxModal({ open, onCancel, onConfirm, transactionId }: SplitFaxModalProps) {
  // page -> memberKey (name string, or UNASSIGNED_KEY for low-confidence page 5)
  const [assignments, setAssignments] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      MOCK_PAGES.map((p) => [p.page, p.detectedMember === ORIGINAL_MEMBER ? ORIGINAL_MEMBER : UNASSIGNED_KEY]),
    ),
  );
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");

  const membersInUse = useMemo(() => {
    const order: string[] = [ORIGINAL_MEMBER];
    Object.values(assignments).forEach((m) => {
      if (m !== UNASSIGNED_KEY && m !== NOT_A_MEMBER_KEY && !order.includes(m)) order.push(m);
    });
    return order;
  }, [assignments]);

  const colorFor = (memberKey: string) => {
    if (memberKey === UNASSIGNED_KEY) return { border: "#9ca3af", bg: "#f9fafb" };
    if (memberKey === NOT_A_MEMBER_KEY) return { border: "#64748b", bg: "#f1f5f9" };
    const idx = membersInUse.indexOf(memberKey);
    return GROUP_COLORS[Math.max(0, idx) % GROUP_COLORS.length];
  };

  const summary = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(assignments).forEach((m) => {
      counts[m] = (counts[m] ?? 0) + 1;
    });
    const unassigned = counts[UNASSIGNED_KEY] ?? 0;
    const notMember = counts[NOT_A_MEMBER_KEY] ?? 0;
    const memberEntries = Object.entries(counts).filter(
      ([m]) => m !== UNASSIGNED_KEY && m !== NOT_A_MEMBER_KEY,
    );
    const parts = memberEntries.map(
      ([m, n]) => `${m}${m === ORIGINAL_MEMBER ? " (original)" : ""} — ${n} page${n === 1 ? "" : "s"}`,
    );
    const base = `This will create ${parts.length} transaction${parts.length === 1 ? "" : "s"}: ${parts.join(", ")}.`;
    const notMemberNote =
      notMember > 0
        ? ` ${notMember} page${notMember === 1 ? "" : "s"} filed to Not a member (kept and retrievable).`
        : "";
    return unassigned > 0
      ? `${base}${notMemberNote} ${unassigned} page${unassigned === 1 ? "" : "s"} still unassigned.`
      : `${base}${notMemberNote}`;
  }, [assignments]);

  const hasUnassigned = Object.values(assignments).some((m) => m === UNASSIGNED_KEY);


  const togglePage = (page: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(page)) next.delete(page);
      else next.add(page);
      return next;
    });
  };

  const assignSelectedTo = (memberKey: string) => {
    if (selected.size === 0) return;
    setAssignments((prev) => {
      const next = { ...prev };
      selected.forEach((p) => {
        next[p] = memberKey;
      });
      return next;
    });
    setSelected(new Set());
  };

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pool = mockMemberDirectory.filter((m) => m.name !== ORIGINAL_MEMBER);
    if (!q) return pool;
    return pool.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.memberId.toLowerCase().includes(q) ||
        m.dob.includes(q),
    );
  }, [search]);

  const reset = () => {
    setAssignments(
      Object.fromEntries(
        MOCK_PAGES.map((p) => [p.page, p.detectedMember === ORIGINAL_MEMBER ? ORIGINAL_MEMBER : UNASSIGNED_KEY]),
      ),
    );
    setSelected(new Set());
    setSearch("");
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  const handleConfirm = () => {
    reset();
    onConfirm();
  };

  return (
    <>
      <Modal
        open={open}
        onCancel={handleCancel}
        title={
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#12275e" }}>Split this fax</div>
          </div>
        }
        width={880}
        getContainer={false}
        footer={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Text style={{ fontSize: 14, marginRight: "auto" }}>{summary}</Text>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button
              type="primary"
              onClick={handleConfirm}
              disabled={hasUnassigned}
              style={hasUnassigned ? undefined : { background: "#12275e", borderColor: "#12275e" }}
            >
              Confirm split
            </Button>
          </div>
        }
      >
        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 12px",
            background: "#fafafa",
            border: "1px solid #d9d9d9",
            borderRadius: 6,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <Text style={{ fontSize: 14 }}>
            {selected.size === 0
              ? "Select pages to reassign"
              : `${selected.size} page${selected.size === 1 ? "" : "s"} selected`}
          </Text>
          <Space wrap style={{ marginLeft: "auto" }}>
            <Button
              disabled={selected.size === 0}
              onClick={() => assignSelectedTo(ORIGINAL_MEMBER)}
            >
              Keep with {ORIGINAL_MEMBER}
            </Button>
            {membersInUse
              .filter((m) => m !== ORIGINAL_MEMBER)
              .map((m) => (
                <Button
                  key={m}
                  disabled={selected.size === 0}
                  onClick={() => assignSelectedTo(m)}
                >
                  Move to {m}
                </Button>
              ))}
            <Button
              disabled={selected.size === 0}
              icon={<InboxOutlined />}
              onClick={() => assignSelectedTo(NOT_A_MEMBER_KEY)}
            >
              Not a member
            </Button>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              disabled={selected.size === 0}
              onClick={() => setPickerOpen(true)}
              style={
                selected.size === 0
                  ? undefined
                  : { background: "#12275e", borderColor: "#12275e" }
              }
            >
              Assign to another member…
            </Button>

          </Space>
        </div>

        {/* Thumbnails */}
        <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "8px 4px 16px" }}>
          {MOCK_PAGES.map((p) => {
            const memberKey = assignments[p.page];
            const color = colorFor(memberKey);
            const isSelected = selected.has(p.page);
            const isUnassigned = memberKey === UNASSIGNED_KEY;
            const isNotAMember = memberKey === NOT_A_MEMBER_KEY;
            return (
              <div
                key={p.page}
                onClick={() => togglePage(p.page)}
                style={{ flex: "0 0 auto", width: 150, cursor: "pointer", userSelect: "none" }}
              >
                <div
                  style={{
                    height: 180,
                    background: color.bg,
                    border: `2px ${isUnassigned ? "dashed" : "solid"} ${color.border}`,
                    borderLeft: `6px solid ${color.border}`,
                    borderRadius: 4,
                    padding: 12,
                    boxShadow: isSelected ? `0 0 0 3px ${color.border}55` : undefined,
                    outline: isSelected ? `1px solid ${color.border}` : "none",
                    position: "relative",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePage(p.page);
                    }}
                    style={{ position: "absolute", top: 6, right: 6 }}
                  />
                  {[80, 60, 90, 70, 85, 55, 75].map((w, i) => (
                    <div
                      key={i}
                      style={{
                        height: 6,
                        width: `${w}%`,
                        background: "#d9d9d9",
                        borderRadius: 2,
                        marginBottom: 8,
                      }}
                    />
                  ))}
                </div>
                <div style={{ marginTop: 8, textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Page {p.page}</div>
                  <div style={{ marginTop: 4 }}>
                    {p.detectedMember ? (
                      <Tag style={{ fontSize: 11, color: "#595959", background: "#f5f5f5", borderColor: "#d9d9d9" }}>
                        Detected: {p.detectedMember}
                      </Tag>
                    ) : (
                      <Tag icon={<WarningOutlined />} color="warning" style={{ fontSize: 11 }}>
                        Low confidence
                      </Tag>
                    )}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                      color: isUnassigned ? "#6b7280" : color.border,
                      fontWeight: 500,
                    }}
                  >
                    {isUnassigned
                      ? "Unassigned — pick a member"
                      : isNotAMember
                        ? "Not a member — kept in Unmatched pages"
                        : memberKey === ORIGINAL_MEMBER
                          ? `${memberKey} (original)`
                          : memberKey}
                  </div>
                  {isNotAMember && (
                    <Button
                      size="small"
                      type="link"
                      icon={<UndoOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setAssignments((prev) => ({ ...prev, [p.page]: UNASSIGNED_KEY }));
                      }}
                      style={{ fontSize: 11, padding: 0, height: "auto" }}
                    >
                      Restore
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 4,
            padding: "8px 12px",
            background: "#f1f5f9",
            border: "1px solid #cbd5e1",
            borderRadius: 6,
            fontSize: 13,
            color: "#475569",
          }}
        >
          <InboxOutlined style={{ marginRight: 6 }} />
          Pages marked <strong>Not a member</strong> aren't discarded — they're filed to
          Unmatched pages on this fax, so they stay retrievable if the mismatch was just a name
          typo. Use Restore to bring a page back for reassignment.
        </div>

      </Modal>

      {/* Member search picker (shared with the document viewer grid) */}
      <MemberSearchModal
        open={pickerOpen}
        onCancel={() => setPickerOpen(false)}
        excludeMemberName={ORIGINAL_MEMBER}
        onSelect={(m) => {
          assignSelectedTo(m.name);
          setPickerOpen(false);
        }}
      />

    </>
  );
}
