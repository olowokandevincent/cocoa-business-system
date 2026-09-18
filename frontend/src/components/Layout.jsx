import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, Users, Package, TrendingUp, UserCog, LogOut, Bean, Menu, X,
} from "lucide-react";
import { useState } from "react";

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
    <div className="min-h-screen bg-[#FAF5EF]">
      <header className="sticky top-0 z-40 bg-[#3B1E10] text-[#FAF5EF] shadow-lg border-b-4 border-[#8C4A27]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-[72px]">
            <Link to="/" className="flex items-center gap-3 group" data-testid="brand-logo">
              <span className="w-11 h-11 rounded-full bg-[#8C4A27] flex items-center justify-center border-2 border-[#D97706]/60 group-hover:scale-105 transition-transform">
                <Bean className="w-6 h-6 text-[#FAF5EF]" />
              </span>
              <div className="leading-tight">
                <div className="font-heading text-xl sm:text-2xl font-bold">Cocoa Ledger</div>
                <div className="text-xs text-[#E3D5C5]">Private Business Records</div>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {links.map((n) => {
                const active = loc.pathname === n.path;
                const Icon = n.icon;
                return (
                  <Link
                    key={n.path}
                    to={n.path}
                    data-testid={n.testid}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-base font-semibold transition-colors ${
                      active ? "bg-[#8C4A27] text-white" : "text-[#E3D5C5] hover:bg-[#4d2a17]"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {n.name}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right leading-tight">
                <div className="font-semibold text-base">{user?.name}</div>
                <div className="text-xs uppercase tracking-wide text-[#D97706] font-bold">
                  {user?.role === "admin" ? "Owner" : "Staff"}
                </div>
              </div>
              <button
                onClick={doLogout}
                data-testid="logout-button"
                className="hidden lg:flex items-center gap-2 bg-[#4d2a17] hover:bg-[#5e3420] px-4 py-2.5 rounded-lg font-semibold transition-colors"
              >
                <LogOut className="w-5 h-5" /> Log out
              </button>
              <button
                onClick={() => setOpen(!open)}
                data-testid="mobile-menu-toggle"
                className="lg:hidden p-2 rounded-lg bg-[#4d2a17]"
              >
                {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {open && (
          <nav className="lg:hidden border-t border-[#4d2a17] px-4 py-3 space-y-1" data-testid="mobile-menu">
            <div className="relative rounded-xl overflow-hidden mb-3 h-28">
              <img
                src="https://images.unsplash.com/photo-1743252878695-367d69dc87a8?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"
                alt="Cocoa pods"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#3B1E10] via-[#3B1E10]/50 to-transparent" />
              <div className="relative z-10 h-full flex items-end gap-2 p-3">
                <Bean className="w-6 h-6 text-[#D97706]" />
                <span className="font-heading text-lg font-bold text-[#FAF5EF]">Cocoa Ledger</span>
              </div>
            </div>
            {links.map((n) => {
              const Icon = n.icon;
              const active = loc.pathname === n.path;
              return (
                <Link
                  key={n.path}
                  to={n.path}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-lg font-semibold ${
                    active ? "bg-[#8C4A27] text-white" : "text-[#E3D5C5]"
                  }`}
                >
                  <Icon className="w-5 h-5" /> {n.name}
                </Link>
              );
            })}
            <button
              onClick={doLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-lg font-semibold text-[#E3D5C5]"
            >
              <LogOut className="w-5 h-5" /> Log out
            </button>
          </nav>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
