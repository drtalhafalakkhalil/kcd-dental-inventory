import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Package,
  BarChart3,
  Upload,
  ArrowRightLeft,
  AlertTriangle,
  QrCode,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

const WELCOME_DISMISSED_KEY = "kcd_welcome_dismissed";

function AnimatedTooth() {
  return (
    <div className="relative w-28 h-28 shrink-0">
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 animate-pulse" />
      <div className="absolute inset-2 rounded-full bg-gradient-to-br from-cyan-50 to-white flex items-center justify-center">
        <svg
          viewBox="0 0 100 120"
          className="w-16 h-16 drop-shadow-lg"
          style={{ animation: "toothFloat 3s ease-in-out infinite" }}
        >
          <defs>
            <linearGradient id="toothGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#0891b2" />
              <stop offset="100%" stopColor="#0e7490" />
            </linearGradient>
            <linearGradient id="toothShine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="white" stopOpacity="0.6" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M50 8 C30 8 15 20 15 38 C15 52 20 60 25 75 C28 83 30 95 35 105 C37 110 40 112 42 112 C45 112 47 108 48 100 C49 92 50 88 50 88 C50 88 51 92 52 100 C53 108 55 112 58 112 C60 112 63 110 65 105 C70 95 72 83 75 75 C80 60 85 52 85 38 C85 20 70 8 50 8 Z"
            fill="url(#toothGrad)"
          />
          <path
            d="M50 8 C30 8 15 20 15 38 C15 45 17 50 20 56 C25 48 35 42 50 42 C65 42 75 48 80 56 C83 50 85 45 85 38 C85 20 70 8 50 8 Z"
            fill="url(#toothShine)"
          />
          <ellipse cx="38" cy="30" rx="6" ry="8" fill="white" opacity="0.3" />
          <circle cx="65" cy="25" rx="3" ry="3" fill="white" opacity="0.2"
            style={{ animation: "sparkle 2s ease-in-out infinite" }}
          />
          <circle cx="72" cy="18" rx="2" ry="2" fill="white" opacity="0.3"
            style={{ animation: "sparkle 2s ease-in-out infinite 0.5s" }}
          />
          <circle cx="30" cy="18" rx="2" ry="2" fill="white" opacity="0.25"
            style={{ animation: "sparkle 2s ease-in-out infinite 1s" }}
          />
        </svg>
      </div>
      <Sparkles
        className="absolute -top-1 -right-1 w-5 h-5 text-cyan-400"
        style={{ animation: "sparkle 2s ease-in-out infinite 0.3s" }}
      />
      <Sparkles
        className="absolute -bottom-1 -left-1 w-4 h-4 text-blue-400"
        style={{ animation: "sparkle 2s ease-in-out infinite 0.8s" }}
      />
      <Sparkles
        className="absolute top-2 -left-2 w-3 h-3 text-cyan-300"
        style={{ animation: "sparkle 2s ease-in-out infinite 1.3s" }}
      />
    </div>
  );
}

export default function WelcomeDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem(WELCOME_DISMISSED_KEY);
    if (!dismissed) {
      setOpen(true);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem(WELCOME_DISMISSED_KEY, "true");
    setOpen(false);
  };

  const features = [
    {
      icon: Package,
      title: "Inventory Management",
      description: "Track dental materials with full details and QR codes.",
      color: "text-cyan-600",
      bg: "bg-cyan-50",
    },
    {
      icon: ArrowRightLeft,
      title: "Stock Movements",
      description: "Record issues, receipts, returns with full audit trail.",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      icon: AlertTriangle,
      title: "Smart Alerts",
      description: "Low stock and expiry notifications at a glance.",
      color: "text-amber-500",
      bg: "bg-amber-50",
    },
    {
      icon: Upload,
      title: "Excel Import",
      description: "Bulk import inventory data from spreadsheets.",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      icon: BarChart3,
      title: "Reports & Analytics",
      description: "Summaries, movement history, and category insights.",
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      icon: QrCode,
      title: "QR Codes",
      description: "Auto-generated codes for quick item identification.",
      color: "text-pink-600",
      bg: "bg-pink-50",
    },
  ];

  return (
    <>
      <style>{`
        @keyframes toothFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .feature-card {
          animation: fadeSlideUp 0.4s ease-out forwards;
          opacity: 0;
        }
      `}</style>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto p-0 gap-0 border-0 shadow-2xl" data-testid="welcome-dialog">
          <div className="bg-gradient-to-br from-cyan-600 via-cyan-700 to-blue-700 p-6 sm:p-8 rounded-t-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="flex items-center gap-5 relative z-10">
              <AnimatedTooth />
              <div className="min-w-0">
                <p className="text-cyan-200 text-xs font-semibold uppercase tracking-widest mb-2">
                  Welcome to
                </p>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
                  Dental Materials Department
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-0.5 w-8 bg-gradient-to-r from-cyan-300 to-transparent rounded-full" />
                  <p className="text-base sm:text-lg font-semibold text-cyan-100">
                    Digital Inventory System
                  </p>
                </div>
                <p className="text-cyan-200/80 text-xs mt-2">
                  Khyber College of Dentistry
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-5 w-1 rounded-full bg-gradient-to-b from-cyan-500 to-blue-600" />
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                What you can do
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="feature-card flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200"
                  style={{ animationDelay: `${index * 0.08}s` }}
                >
                  <div className={`w-8 h-8 rounded-lg ${feature.bg} flex items-center justify-center shrink-0`}>
                    <feature.icon className={`w-4 h-4 ${feature.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{feature.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-100/60">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-600 mt-0.5 shrink-0" />
                <p className="text-xs text-cyan-800 leading-relaxed">
                  <span className="font-semibold">Getting started:</span> Use the sidebar to navigate. Start with the Dashboard for an overview, then explore Stock Movements to record issues and receipts.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 px-5 sm:px-6 py-4 bg-gray-50/50 rounded-b-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-0.5">Developed by</p>
                <p className="text-lg font-bold text-gray-900">Dr. Talha Falak Khalil</p>
                <p className="text-xs text-gray-500">Lecturer, Dental Materials Department, KCD</p>
              </div>
              <Button
                onClick={handleDismiss}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white px-6 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all duration-200 font-semibold"
                data-testid="button-dismiss-welcome"
              >
                Get Started
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
