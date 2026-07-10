"use client";
// Sidebar navigation — Vithara Care Clinic warm-brown theme

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Users, Brain, TrendingUp,
  BarChart3, MessageSquare, Shield, Settings,
  Building2, ChevronRight, LogOut, ExternalLink, CreditCard,
} from "lucide-react";

const navItems = [
  { href: "/dashboard",   label: "Dashboard",    icon: LayoutDashboard },
  { href: "/tenants",     label: "Tenants",       icon: Users           },
  { href: "/predictions", label: "Predictions",   icon: Brain           },
  { href: "/payments",    label: "Payments",      icon: CreditCard      },
  { href: "/retention",   label: "Retention",     icon: Shield          },
  { href: "/analytics",   label: "Analytics",     icon: BarChart3       },
  { href: "/chatbot",     label: "AI Assistant",  icon: MessageSquare   },
  { href: "/settings",    label: "Settings",      icon: Settings        },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside
      id="sidebar-nav"
      style={{
        width: "240px",
        minHeight: "100vh",
        background: "#eae3d5",
        borderRight: "1px solid rgba(122,158,126,0.25)",
        display: "flex",
        flexDirection: "column",
        padding: "1.5rem 0.875rem",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 40,
        boxShadow: "2px 0 12px rgba(44,44,44,0.04)",
      }}
    >
      {/* Logo */}
      <div style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "0 0.625rem", marginBottom: "2rem",
        paddingBottom: "1.5rem",
        borderBottom: "1px solid rgba(44,44,44,0.08)",
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: "linear-gradient(135deg, #c4714a, #d9916e)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
          boxShadow: "0 4px 12px rgba(196,113,74,0.3)",
        }}>
          <Building2 size={20} color="white" />
        </div>
        <div>
          <div style={{
            fontWeight: 700, fontSize: "1rem",
            color: "#2c2c2c",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            letterSpacing: "0.01em",
            lineHeight: 1.1,
          }}>
            TenantSense
          </div>
          <div style={{
            fontSize: "0.6rem", color: "#c4714a",
            fontWeight: 700, letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginTop: "0.15rem",
          }}>
            AI PLATFORM
          </div>
        </div>
      </div>

      {/* Section label */}
      <div style={{
        fontSize: "0.65rem",
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: "#888880",
        fontWeight: 700,
        padding: "0 0.625rem",
        marginBottom: "0.6rem",
      }}>
        Navigation
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "3px" }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`nav-link${isActive ? " active" : ""}`}
              id={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <Icon size={16} />
              <span>{label}</span>
              {isActive && <ChevronRight size={13} style={{ marginLeft: "auto", opacity: 0.5 }} />}
            </Link>
          );
        })}
      </nav>

      {/* TN Government Portal */}
      <div style={{
        marginTop: "1.25rem",
        padding: "0.875rem",
        borderRadius: 12,
        background: "linear-gradient(135deg, rgba(196,113,74,0.08), rgba(122,158,126,0.08))",
        border: "1px solid rgba(196,113,74,0.18)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: "0.5rem" }}>
          <div style={{
            width: 20, height: 20, borderRadius: 5,
            background: "linear-gradient(135deg, #f7941d, #006400)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, fontSize: "8px", fontWeight: 900, color: "white",
          }}>TN</div>
          <span style={{
            fontSize: "0.67rem", fontWeight: 700, color: "#2c2c2c",
            letterSpacing: "0.04em", textTransform: "uppercase",
          }}>TN Tenancy Portal</span>
        </div>
        <p style={{
          fontSize: "0.64rem", color: "#666660", lineHeight: 1.5,
          margin: "0 0 0.6rem 0",
        }}>
          No agreement? Register on the official Tamil Nadu Government portal.
        </p>
        <a
          href="https://www.tenancy.tn.gov.in/"
          target="_blank"
          rel="noopener noreferrer"
          id="tn-portal-sidebar-link"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 5, padding: "0.45rem 0.625rem",
            background: "linear-gradient(135deg, #c4714a, #d9916e)",
            color: "white", borderRadius: 8, textDecoration: "none",
            fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.04em",
            boxShadow: "0 2px 8px rgba(196,113,74,0.25)",
          }}
        >
          <ExternalLink size={10} /> Register Tenancy Agreement
        </a>
      </div>

      {/* User info */}
      {user && (
        <div style={{
          marginTop: "auto",
          paddingTop: "1.25rem",
          borderTop: "1px solid rgba(44,44,44,0.08)",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "0.75rem 0.625rem",
            borderRadius: 12,
            background: "rgba(44,44,44,0.04)",
            border: "1px solid rgba(44,44,44,0.06)",
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "linear-gradient(135deg, #a8c5ac, #7a9e7e)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 600, fontSize: "0.8rem",
              flexShrink: 0,
            }}>
              {user.full_name?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: "0.82rem", fontWeight: 600,
                color: "#2c2c2c", whiteSpace: "nowrap",
                overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {user.full_name}
              </div>
              <div style={{ fontSize: "0.67rem", color: "#888880", textTransform: "capitalize" }}>
                {user.role.replace(/_/g, " ")}
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
