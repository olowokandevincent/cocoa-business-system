import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, Users, Package, TrendingUp, UserCog, LogOut, Menu, X,
} from "lucide-react";
import { useState } from "react";
import { PinControls } from "@/components/PinControls";
import { CocoaBrand } from "@/components/CocoaMark";
import { ESTATE } from "@/styles/imagery";

const NAV = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard, testid: "nav-dashboard" },
  { name: "Customers", path: "/customers", icon: Users, testid: "nav-customers" },
  { name: "Cocoa Store", path: "/cocoa-records", icon: Package, testid: "nav-cocoa-records" },
  { name: "Cocoa Rate", path: "/cocoa-rate", icon: TrendingUp, testid: "nav-cocoa-rate" },
  { name: "Staff", path: "/staff", icon: UserCog, testid: "nav-staff", adminOnly: true },
];

export function Layout({ children }) {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const doLogout = async () => {
    await logout();
    navigate("/login");
  };

  const links = NAV.filter((n) => !n.adminOnly || user?.role === "admin");

  return (
    <div className="ce-shell">
      {/* the estate, sunk behind every page */}
      <div className="ce-wall" aria-hidden="true">
        <img src={ESTATE} alt="" />
      </div>

      <div className="ce-hdr-wrap">
        <header className="ce-hdr">
          <CocoaBrand />

          <nav className="hidden lg:flex ce-nav">
            {links.map((n) => {
              const Icon = n.icon;
              return (
                <Link
                  key={n.path}
                  to={n.path}
                  data-testid={n.testid}
                  className={loc.pathname === n.path ? "on" : ""}
                >
                  <Icon />
                  {n.name}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block ce-user">
              <b>{user?.name}</b>
              <span>{user?.role === "admin" ? "Owner" : "Staff"}</span>
            </div>
            <div className="hidden lg:flex items-center gap-2">
              <PinControls />
            </div>
            <button onClick={doLogout} data-testid="logout-button" className="hidden lg:flex ce-btn">
              <LogOut /> Log out
            </button>
            <button
              onClick={() => setOpen(!open)}
              data-testid="mobile-menu-toggle"
              aria-label="Menu"
              className="flex lg:hidden ce-btn"
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </header>

        {open && (
          <nav className="lg:hidden ce-menu" data-testid="mobile-menu">
            {links.map((n) => {
              const Icon = n.icon;
              return (
                <Link
                  key={n.path}
                  to={n.path}
                  onClick={() => setOpen(false)}
                  className={loc.pathname === n.path ? "on" : ""}
                >
                  <Icon /> {n.name}
                </Link>
              );
            })}
            <PinControls variant="mobile" />
            <button onClick={doLogout}>
              <LogOut /> Log out
            </button>
          </nav>
        )}
      </div>

      <main className="ce-main">{children}</main>
    </div>
  );
}
