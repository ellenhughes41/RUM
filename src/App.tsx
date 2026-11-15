import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
// @ts-ignore
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider, theme } from "antd";
import PoliciesPage from "./pages/PoliciesPage";
import NewPolicyPage from "./pages/NewPolicyPage";
import CasesPage from "./pages/CasesPage";
import IntakePage from "./pages/IntakePage";
import TriagePage from "./pages/TriagePage";
import OverrideQueuePage from "./pages/OverrideQueuePage";
import LetterTemplatesPage from "./pages/LetterTemplatesPage";
import LetterTemplateEditorPage from "./pages/LetterTemplateEditorPage";
import OutboundPage from "./pages/OutboundPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#1677ff",
          borderRadius: 6,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          colorBgContainer: "#ffffff",
          colorBgLayout: "#f5f5f5",
          colorText: "rgba(0, 0, 0, 0.88)",
          colorTextSecondary: "rgba(0, 0, 0, 0.45)",
          colorBorder: "#d9d9d9",
          colorBorderSecondary: "#f0f0f0",
          colorSuccess: "#52c41a",
          colorWarning: "#faad14",
          colorError: "#ff4d4f",
        },
        components: {
          Layout: {
            siderBg: "#001529",
            headerBg: "#ffffff",
            bodyBg: "#f5f5f5",
          },
          Menu: {
            darkItemBg: "#001529",
            darkItemSelectedBg: "#1677ff",
            darkItemHoverBg: "rgba(255, 255, 255, 0.08)",
          },
          Table: {
            headerBg: "#fafafa",
            headerColor: "rgba(0, 0, 0, 0.88)",
            rowHoverBg: "#fafafa",
          },
        },
      }}
    >
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/cases" replace />} />
          <Route path="/policies" element={<PoliciesPage />} />
          <Route path="/policies/new" element={<NewPolicyPage />} />
          <Route path="/cases" element={<CasesPage />} />
          <Route path="/intake" element={<IntakePage />} />
          <Route path="/triage" element={<TriagePage />} />
          <Route path="/override-queue" element={<OverrideQueuePage />} />
          <Route path="/outbound" element={<OutboundPage />} />
          <Route path="/letter-templates" element={<LetterTemplatesPage />} />
          <Route path="/letter-templates/new" element={<LetterTemplateEditorPage />} />
          <Route path="/letter-templates/:id" element={<LetterTemplateEditorPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  </QueryClientProvider>
);

export default App;
