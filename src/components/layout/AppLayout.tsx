import { ReactNode, useState, createContext, useContext } from "react";
import { Layout } from "antd";
import { AppSidebar } from "./AppSidebar";

interface SidebarContextType {
  isExpanded: boolean;
  collapse: () => void;
  expand: () => void;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function useSidebarContext() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebarContext must be used within AppLayout");
  }
  return context;
}

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  const sidebarContext: SidebarContextType = {
    isExpanded: isSidebarExpanded,
    collapse: () => setIsSidebarExpanded(false),
    expand: () => setIsSidebarExpanded(true),
    toggle: () => setIsSidebarExpanded(!isSidebarExpanded),
  };

  return (
    <SidebarContext.Provider value={sidebarContext}>
      <Layout style={{ minHeight: "100vh" }}>
        <AppSidebar
          isExpanded={isSidebarExpanded}
          onToggle={() => setIsSidebarExpanded(!isSidebarExpanded)}
        />
        <Layout
          style={{
            marginLeft: isSidebarExpanded ? 180 : 64,
            transition: "margin-left 0.2s",
          }}
        >
          {children}
        </Layout>
      </Layout>
    </SidebarContext.Provider>
  );
}
