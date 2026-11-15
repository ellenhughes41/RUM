import { useMemo, useState } from "react";
import { Modal, Input, List, Avatar } from "antd";
import { SearchOutlined, UserOutlined } from "@ant-design/icons";
import { mockMemberDirectory, type MemberRecord } from "@/data/mockIntakeCases";
import { toast } from "@/hooks/use-toast";

// Shared detach/dismiss/create-case logic so the Split screen and the document
// viewer's All pages grid behave identically.

const pageLabel = (pages: number[]) =>
  `${pages.length} page${pages.length === 1 ? "" : "s"} (${pages.sort((a, b) => a - b).join(", ")})`;

export function detachAndDismiss(pages: number[], transactionId?: string) {
  toast({
    title: "Detached and dismissed",
    description: `${pageLabel(pages)} moved out of ${transactionId ?? "this transaction"} and dismissed as their own transaction. Record kept — nothing deleted.`,
  });
}

export function detachToMember(pages: number[], memberName: string) {
  toast({
    title: "Detached to new transaction",
    description: `${pageLabel(pages)} detached and assigned to ${memberName}. The new transaction now appears in the intake queue.`,
  });
}

export function detachToNewCase(pages: number[], memberName?: string) {
  toast({
    title: "New case created",
    description: `${pageLabel(pages)} detached into a new case${memberName ? ` for ${memberName}` : ""} and opened in the case creation flow.`,
  });
}

interface MemberSearchModalProps {
  open: boolean;
  onCancel: () => void;
  onSelect: (member: MemberRecord) => void;
  title?: string;
  excludeMemberName?: string;
}

export function MemberSearchModal({
  open,
  onCancel,
  onSelect,
  title = "Assign to member",
  excludeMemberName,
}: MemberSearchModalProps) {
  const [search, setSearch] = useState("");

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pool = mockMemberDirectory.filter((m) => m.name !== excludeMemberName);
    if (!q) return pool;
    return pool.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.memberId.toLowerCase().includes(q) ||
        m.dob.includes(q),
    );
  }, [search, excludeMemberName]);

  const close = () => {
    setSearch("");
    onCancel();
  };

  return (
    <Modal
      open={open}
      onCancel={close}
      title={<div style={{ fontSize: 16, fontWeight: 600, color: "#12275e" }}>{title}</div>}
      footer={null}
      width={560}
      getContainer={false}
    >
      <Input
        autoFocus
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Search by name, member ID, or DOB"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 12 }}
      />
      <List
        style={{ maxHeight: 360, overflowY: "auto" }}
        dataSource={filteredMembers}
        locale={{ emptyText: "No members match" }}
        renderItem={(m: MemberRecord) => (
          <List.Item
            style={{ cursor: "pointer", padding: "10px 8px" }}
            onClick={() => {
              setSearch("");
              onSelect(m);
            }}
          >
            <List.Item.Meta
              avatar={<Avatar icon={<UserOutlined />} style={{ background: "#12275e" }} />}
              title={<span style={{ fontSize: 14 }}>{m.name}</span>}
              description={
                <span style={{ fontSize: 13, color: "#595959" }}>
                  DOB {m.dob} · {m.memberId} · {m.carrier}
                </span>
              }
            />
          </List.Item>
        )}
      />
    </Modal>
  );
}
