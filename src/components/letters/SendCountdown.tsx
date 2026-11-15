import { useEffect, useState } from "react";
import { Button } from "antd";
import dayjs from "dayjs";

interface Props {
  sendAt: Date;
  pendingLabel?: string; // e.g. "Sends in"
  sentLabel?: string; // e.g. "Sent at"
  actionLabel?: string; // e.g. "Retract"
  onAction?: () => void;
}

export function SendCountdown({ sendAt, pendingLabel = "Sends in", sentLabel = "Sent at", actionLabel = "Retract", onAction }: Props) {
  const [now, setNow] = useState(Date.now());
  const remaining = sendAt.getTime() - now;
  useEffect(() => {
    if (remaining <= 0) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [remaining <= 0]); // eslint-disable-line react-hooks/exhaustive-deps

  if (remaining <= 0) {
    return <span style={{ fontSize: 12, fontWeight: 500 }}>{sentLabel} {dayjs(sendAt).format("h:mm A")}</span>;
  }
  const secs = Math.ceil(remaining / 1000);
  const mmss = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{pendingLabel} {mmss}</span>
      {onAction && <Button size="small" danger onClick={onAction}>{actionLabel}</Button>}
    </span>
  );
}
