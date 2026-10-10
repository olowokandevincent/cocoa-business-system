import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, Users, Package, TrendingUp, UserCog, LogOut, Bean, Menu, X,
} from "lucide-react";
import { useState } from "react";
import { PinControls } from "@/components/PinControls";

const NAV = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard, testid: "nav-dashboard" },
  { name: "Customers", path: "/customers", icon: Users, testid: "nav-customers" },
  { name: "Cocoa Store", path: "/cocoa-records", icon: Package, testid: "nav-cocoa-records" },
  { name: "Cocoa Rate", path: "/cocoa-rate", icon: TrendingUp, testid: "nav-cocoa-rate" },
  { name: "Staff", path: "/staff", icon: UserCog, testid: "nav-staff", adminOnly: true },
];

// Full-bleed cocoa plantation behind the dashboard's frosted sheets.
const BACKDROP = "https://media.base44.com/images/public/6ac9ebc188dc43be05e8c9be/89228d8d8_generated_0f2be95c.jpg";

export function Layout({ children }) {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const isDashboard = loc.pathname === "/";

  const doLogout = async () => {
    await logout();
    navigate("/login");
  };

  const links = NAV.filter((n) => !n.adminOnly || user?.role === "admin");

  return (
    <div className={`min-h-screen ${isDashboard ? "bg-[#1d2a1c]" : "bg-[#FAF5EF]"}`}>
      {isDashboard && (
        <div className="gh-backdrop" aria-hidden="true">
          <img src={BACKDROP} alt="" />
          <div className="gh-scrim" />
        </div>
      )}

      <header className={`sticky top-0 z-40 px-4 sm:px-8 ${isDashboard ? "pt-6" : ""}`}>
        <div className="max-w-7xl mx-auto gh-hdr">
          <Link to="/" className="gh-brand" data-testid="brand-logo">
            <span className="gh-logo">
              <Bean className="w-6 h-6 text-[#FAF5EF]" />
            </span>
            <div>
              <div className="gh-bt">Cocoa Ledger</div>
              <div className="gh-bs">Private Business Records</div>
            </div>
          </Link>

          <nav className="hidden lg:flex gh-nav">
            {links.map((n) => {
              const active = loc.pathname === n.path;
              const Icon = n.icon;
              return (
                <Link
                  key={n.path}
                  to={n.path}
                  data-testid={n.testid}
                  className={active ? "on" : ""}
                >
                  <Icon />
                  {n.name}
                </Link>
              );
            })}
          </nav>

          <div className="gh-usr">
            <div className="hidden sm:block gh-un">
              <b>{user?.name}</b>
              <span>{user?.role === "admin" ? "Owner" : "Staff"}</span>
            </div>
            <div className="hidden lg:flex items-center gap-2">
              <PinControls />
            </div>
            <button
              onClick={doLogout}
              data-testid="logout-button"
              className="hidden lg:flex gh-btn"
            >
              <LogOut /> Log out
            </button>
            <button
              onClick={() => setOpen(!open)}
              data-testid="mobile-menu-toggle"
              aria-label="Menu"
              className="flex lg:hidden gh-btn"
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {open && (
          <nav
            className="lg:hidden max-w-7xl mx-auto mt-3 gh-glass p-4 space-y-1"
            data-testid="mobile-menu"
          >
            {links.map((n) => {
              const Icon = n.icon;
              const active = loc.pathname === n.path;
              return (
                <Link
                  key={n.path}
                  to={n.path}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold ${
                    active ? "bg-[#8C4A27] text-white" : "text-[#3B1E10] hover:bg-[#23372B]/5"
                  }`}
                >
                  <Icon className="w-5 h-5" /> {n.name}
                </Link>
              );
            })}
            <PinControls variant="mobile" />
            <button
              onClick={doLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold text-[#3B1E10] hover:bg-[#23372B]/5"
            >
              <LogOut className="w-5 h-5" /> Log out
            </button>
          </nav>
        )}
      </header>

      <main className={`relative z-10 max-w-7xl mx-auto ${isDashboard ? "" : "px-4 sm:px-6 py-8"}`}>
        {children}
      </main>
    </div>
  );
}
