import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { KeyRound, Mail, User, Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function AccountSetup() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 6) return "Password must be at least 6 characters";
    if (!/[a-zA-Z]/.test(pw)) return "Password must contain at least one letter";
    if (!/[0-9]/.test(pw)) return "Password must contain at least one number";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pwError = validatePassword(password);
    if (pwError) {
      toast({ title: "Weak Password", description: pwError, variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords are the same.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/auth/setup-account", { password, email: email || undefined, fullName: fullName || undefined });
      toast({ title: "Account set up successfully!", description: "Your password has been updated. Welcome aboard!" });
      await refreshUser();
    } catch (error: any) {
      toast({ title: "Setup Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900" data-testid="text-setup-title">
              Set Up Your Account
            </CardTitle>
            <p className="text-sm text-gray-500 mt-2">
              Welcome, <strong>{user?.username}</strong>! Please create your own password to secure your account.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">
                  <User className="w-3.5 h-3.5 inline mr-1.5" />
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Dr. Your Name"
                  data-testid="input-setup-fullname"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="w-3.5 h-3.5 inline mr-1.5" />
                  Email (optional)
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  data-testid="input-setup-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  <KeyRound className="w-3.5 h-3.5 inline mr-1.5" />
                  New Password *
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Choose a strong password"
                    required
                    className="pr-10"
                    data-testid="input-setup-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Min 6 characters, must include a letter and a number</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  <KeyRound className="w-3.5 h-3.5 inline mr-1.5" />
                  Confirm Password *
                </Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Type your password again"
                  required
                  data-testid="input-setup-confirm-password"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !password || !confirmPassword}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg mt-2"
                data-testid="button-setup-submit"
              >
                {isSubmitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                ) : (
                  "Save & Continue"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-gray-400 mt-4">
          Khyber College of Dentistry &mdash; Dental Materials Department
        </p>
      </motion.div>
    </div>
  );
}
