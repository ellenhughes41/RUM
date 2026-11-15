import { useLocation, useNavigate } from "react-router-dom";
import { Layout, Menu, Avatar, Typography } from "antd";
import {
  FileTextOutlined,
  TeamOutlined,
  BarChartOutlined,
  InboxOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  MenuOutlined,
  SendOutlined } from
"@ant-design/icons";

const { Sider } = Layout;
const { Text } = Typography;

const menuItems = [
{
  key: "/intake",
  icon: <InboxOutlined />,
  label: "Case Intake"
},
{
  key: "/cases",
  icon: <TeamOutlined />,
  label: "Clinical Review"
},
{
  key: "/override-queue",
  icon: <SafetyCertificateOutlined />,
  label: "Override Queue"
},
{
  key: "/outbound",
  icon: <SendOutlined />,
  label: "Outbound Communication"
},
{
  key: "/policies",
  icon: <FileTextOutlined />,
  label: "Clinical Policies"
},
{
  key: "/triage",
  icon: <BarChartOutlined />,
  label: "Triage"
},
{
  key: "/letter-templates",
  icon: <MailOutlined />,
  label: "Letter Templates"
}];


interface AppSidebarProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export function AppSidebar({ isExpanded, onToggle }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const selectedKey = menuItems.find(
    (item) => location.pathname.startsWith(item.key)
  )?.key || "/cases";

  return (
    <Sider
      collapsed={!isExpanded}
      onCollapse={() => onToggle()}
      trigger={null}
      width={180}
      collapsedWidth={64}
      style={{
        overflow: "auto",
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 40,
        background: "#fff",
        borderRight: "1px solid #f0f0f0"
      }}
      theme="light">
      
      {/* Logo area */}
      <div
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: isExpanded ? "flex-start" : "center",
          padding: isExpanded ? "0 16px" : "0 8px",
          gap: 10
        }}>
        
        <MenuOutlined
          onClick={onToggle}
          style={{ fontSize: 16, color: "rgba(0,0,0,0.65)", cursor: "pointer" }} />
        
        {isExpanded &&
        <Text strong style={{ fontSize: 15, color: "rgba(0,0,0,0.85)" }}>
            PA Co-Pilot
          </Text>
        }
      </div>

      <Menu
        theme="light"
        mode="inline"
        selectedKeys={[selectedKey]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
        style={{ borderRight: 0 }} />
      

      {/* Footer - User */}
      



































      
    </Sider>);

}