import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bean, Loader2, Lock } from "lucide-react";

export default function Login() {
  const { login, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (ok) navigate("/");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2" data-testid="login-container">
      {/* Left: imagery */}
      <div className="relative hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1743252878695-367d69dc87a8?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"
          alt="Cocoa pods on the tree"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[#3B1E10]/70" />
        <div className="relative z-10 h-full flex flex-col justify-end p-12 text-[#FAF5EF]">
          <Bean className="w-14 h-14 text-[#D97706] mb-6" />
          <h1 className="font-heading text-5xl font-bold leading-tight mb-4">
            Your notebook,<br />now unbreakable.
          </h1>
          <p className="text-xl text-[#E3D5C5] max-w-md">
            Every customer, debt, and bag of cocoa — recorded, searchable, and never lost.
          </p>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-[#FAF5EF]">
        <div className="w-full max-w-md animate-fade-up">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <span className="w-12 h-12 rounded-full bg-[#8C4A27] flex items-center justify-center">
              <Bean className="w-7 h-7 text-[#FAF5EF]" />
            </span>
            <span className="font-heading text-2xl font-bold text-[#3B1E10]">Cocoa Ledger</span>
          </div>

          <h2 className="font-heading text-4xl font-bold text-[#24140E] mb-2">Welcome back</h2>
          <p className="text-lg text-[#5C4638] mb-8">Sign in to open your business records.</p>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-lg font-semibold text-[#24140E]">Email</Label>
              <Input
                id="email"
                type="email"
                data-testid="login-email-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-2 h-14 text-lg bg-white border-2 border-[#8C6D58] focus-visible:ring-4 focus-visible:ring-[#8C4A27]/30"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-lg font-semibold text-[#24140E]">Password</Label>
              <Input
                id="password"
                type="password"
                data-testid="login-password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-2 h-14 text-lg bg-white border-2 border-[#8C6D58] focus-visible:ring-4 focus-visible:ring-[#8C4A27]/30"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div data-testid="login-error" className="bg-[#FEF2F2] border-2 border-[#DC2626] text-[#991B1B] rounded-lg px-4 py-3 font-semibold">
                {error}
              </div>
            )}

            <Button
              type="submit"
              data-testid="login-submit-button"
              disabled={loading}
              className="w-full h-14 text-lg font-bold bg-[#8C4A27] hover:bg-[#3B1E10] text-white border-2 border-[#3B1E10]/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign in</>}
            </Button>
          </form>

          <div className="mt-8 flex items-center gap-2 text-[#5C4638] text-sm">
            <Lock className="w-4 h-4" />
            Private system. Only the owner and trusted staff can log in.
          </div>
        </div>
      </div>
    </div>
  );
}
