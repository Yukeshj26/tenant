// app/(dashboard)/layout.tsx — Protected layout with sidebar (Vithara light theme)

import Sidebar from "@/components/Sidebar";
import { AuthProvider } from "@/contexts/AuthContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div style={{ display: "flex", minHeight: "100vh", background: "#faf7f2" }}>
        <Sidebar />
        <main
          style={{
            marginLeft: "240px",
            flex: 1,
            padding: "2rem 2.5rem",
            maxWidth: "calc(100vw - 240px)",
            overflowX: "hidden",
            background: "#faf7f2",
          }}
        >
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
