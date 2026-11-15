import { Button, Card, Space, Typography, Upload } from "antd";
import { DeleteOutlined, FileTextOutlined, InboxOutlined } from "@ant-design/icons";
import type { IntakeSource } from "@/data/mockIntakeCases";

export function ChartNotesUpload({ files, onFilesChange }: {
  files: string[];
  source: IntakeSource;
  onFilesChange: (files: string[]) => void;
  onSourceChange?: (source: IntakeSource) => void;
}) {
  return (
    <Card size="small" title={<Space><FileTextOutlined className="text-primary" />Chart notes</Space>}>
      <Upload.Dragger multiple accept=".pdf,.tif,.tiff,.png,.jpg,.jpeg,.doc,.docx" showUploadList={false}
        beforeUpload={(file) => { onFilesChange([...files, file.name]); return false; }}>
        <InboxOutlined className="text-primary text-3xl" />
        <p className="my-2 text-sm">Drag and drop chart notes here, or click to upload</p>
      </Upload.Dragger>
      {files.map((file, index) => (
        <div key={`${file}-${index}`} className="mt-2 flex items-center justify-between gap-2 border border-border rounded-md px-3 py-1">
          <Typography.Text className="min-w-0 break-all">{file}</Typography.Text>
          <Button type="text" size="small" danger aria-label={`Remove ${file}`} icon={<DeleteOutlined />}
            onClick={() => onFilesChange(files.filter((_, i) => i !== index))} />
        </div>
      ))}
    </Card>
  );
}