import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import { LockProvider } from "@/context/LockContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Customers from "@/pages/Customers";
import CustomerProfile from "@/pages/CustomerProfile";
import CocoaRecords from "@/pages/CocoaRecords";
import CocoaRate from "@/pages/CocoaRate";
import Staff from "@/pages/Staff";

function Shell({ children, adminOnly }) {
  return (
    <ProtectedRoute adminOnly={adminOnly}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

function App() {
  useEffect(() => {
    document.title = "Cocoa Ledger — Private Business Records";
  }, []);

  return (
    <div className="App">
      <AuthProvider>
        <LockProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Shell><Dashboard /></Shell>} />
            <Route path="/customers" element={<Shell><Customers /></Shell>} />
            <Route path="/customers/:id" element={<Shell><CustomerProfile /></Shell>} />
            <Route path="/cocoa-records" element={<Shell><CocoaRecords /></Shell>} />
            <Route path="/cocoa-rate" element={<Shell><CocoaRate /></Shell>} />
            <Route path="/staff" element={<Shell adminOnly><Staff /></Shell>} />
          </Routes>
        </BrowserRouter>
        </LockProvider>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </div>
  );
}

export default App;
