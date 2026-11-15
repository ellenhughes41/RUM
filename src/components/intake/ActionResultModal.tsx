import { useEffect, useState } from "react";
import { Modal, Button, Descriptions, Typography } from "antd";
import { CheckCircleFilled } from "@ant-design/icons";

const { Text } = Typography;

export interface ActionResult {
  title: string;
  message: string;
  caseNumber?: string;
  details?: { label: string; value: React.ReactNode }[];
}

type Listener = (r: ActionResult | null) => void;
let current: ActionResult | null = null;
const listeners = new Set<Listener>();

export function showActionResult(r: ActionResult, opts?: { ifIdle?: boolean }) {
  if (opts?.ifIdle && current) return;
  current = r;
  listeners.forEach((l) => l(current));
}
export function isActionResultOpen() {
  return !!current;
}
function clear() {
  current = null;
  listeners.forEach((l) => l(null));
}

interface HostProps {
  onShow?: () => void;
  onUndo: () => void;
  onGoToCase: (caseNumber?: string) => void;
}

export function ActionResultHost({ onShow, onUndo, onGoToCase }: HostProps) {
  const [result, setResult] = useState<ActionResult | null>(current);

  useEffect(() => {
    const l: Listener = (r) => {
      if (r && !result) onShow?.();
      setResult(r);
    };
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, [onShow, result]);

  return (
    <Modal
      open={!!result}
      onCancel={clear}
      width={480}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#12275e" }}>
          <CheckCircleFilled style={{ color: "#52c41a" }} />
          {result?.title}
        </div>
      }
      footer={
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Button
            onClick={() => {
              onUndo();
              clear();
            }}
          >
            Undo
          </Button>
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={clear}>Close</Button>
            <Button
              type="primary"
              style={{ background: "#12275e" }}
              onClick={() => {
                const cn = result?.caseNumber;
                clear();
                onGoToCase(cn);
              }}
            >
              Go to case
            </Button>
          </div>
        </div>
      }
    >
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Text style={{ fontSize: 14, color: "#595959" }}>{result.message}</Text>
          {(result.caseNumber || result.details?.length) && (
            <Descriptions size="small" column={1} bordered>
              {result.caseNumber && (
                <Descriptions.Item label="Case number">
                  <Text strong>{result.caseNumber}</Text>
                </Descriptions.Item>
              )}
              {result.details?.map((d) => (
                <Descriptions.Item key={d.label} label={d.label}>
                  {d.value}
                </Descriptions.Item>
              ))}
            </Descriptions>
          )}
        </div>
      )}
    </Modal>
  );
}
