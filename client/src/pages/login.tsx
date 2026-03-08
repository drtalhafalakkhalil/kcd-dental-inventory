import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, LogIn, Eye, EyeOff, Shield, UserPlus, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
    setEmail("");
    setError("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(username, password, rememberMe);
    } catch (err: any) {
      const msg = err?.message || "Login failed";
      if (msg.includes("401")) {
        setError("Invalid username or password");
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must contain at least one letter and one number");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/register-student", { username, password, fullName: fullName || undefined, email: email || undefined });
      toast({ title: "Registration successful!", description: "You can now sign in with your credentials." });
      resetForm();
      setMode("login");
    } catch (err: any) {
      setError(err?.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 relative overflow-hidden">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-200/20 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-200/20 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />
      <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-teal-100/30 rounded-full blur-2xl" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md px-4 relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="inline-block mb-4"
          >
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
                <GraduationCap className="w-10 h-10 text-white" />
              </div>
              <motion.div
                className="absolute -top-3 -right-3 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg text-lg"
                style={{ animation: "float 3s ease-in-out infinite" }}
              >
                🦷
              </motion.div>
            </div>
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-900" data-testid="text-login-title">
            Digital Inventory System
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Dental Materials Department, Khyber College of Dentistry
          </p>
        </div>

        <AnimatePresence mode="wait">
          {mode === "login" ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5 text-cyan-600" />
                    Sign In
                  </CardTitle>
                  <CardDescription>Enter your credentials to access the system</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
                        data-testid="text-login-error"
                      >
                        {error}
                      </motion.div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        autoComplete="username"
                        data-testid="input-username"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          autoComplete="current-password"
                          className="pr-10"
                          data-testid="input-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          data-testid="button-toggle-password"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="rememberMe"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                        data-testid="checkbox-remember-me"
                      />
                      <Label htmlFor="rememberMe" className="text-sm text-gray-600 cursor-pointer font-normal">
                        Remember me for 30 days
                      </Label>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg"
                      data-testid="button-login"
                    >
                      {isLoading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                        />
                      ) : (
                        <>
                          <LogIn className="w-4 h-4 mr-2" />
                          Sign In
                        </>
                      )}
                    </Button>
                  </form>

                  <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                    <p className="text-xs text-gray-500 mb-2">Are you a student?</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { resetForm(); setMode("register"); }}
                      className="text-cyan-600 border-cyan-200 hover:bg-cyan-50"
                      data-testid="button-goto-register"
                    >
                      <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                      Register as Student
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-cyan-600" />
                    Student Registration
                  </CardTitle>
                  <CardDescription>Create a view-only student account</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
                        data-testid="text-register-error"
                      >
                        {error}
                      </motion.div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="reg-fullname">Full Name</Label>
                      <Input
                        id="reg-fullname"
                        type="text"
                        placeholder="Your full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        data-testid="input-register-fullname"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-username">Username *</Label>
                      <Input
                        id="reg-username"
                        type="text"
                        placeholder="Choose a username (min 3 characters)"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        data-testid="input-register-username"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-email">Email (optional)</Label>
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        data-testid="input-register-email"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-password">Password *</Label>
                      <div className="relative">
                        <Input
                          id="reg-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Choose a password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="pr-10"
                          data-testid="input-register-password"
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
                      <Label htmlFor="reg-confirm">Confirm Password *</Label>
                      <Input
                        id="reg-confirm"
                        type={showPassword ? "text" : "password"}
                        placeholder="Type password again"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        data-testid="input-register-confirm"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg"
                      data-testid="button-register-submit"
                    >
                      {isLoading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                        />
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Create Student Account
                        </>
                      )}
                    </Button>
                  </form>

                  <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { resetForm(); setMode("login"); }}
                      className="text-gray-500 hover:text-gray-700"
                      data-testid="button-goto-login"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                      Back to Sign In
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-xs text-gray-400 mt-6">
          Khyber College of Dentistry &copy; 2026
        </p>
      </motion.div>
    </div>
  );
}
