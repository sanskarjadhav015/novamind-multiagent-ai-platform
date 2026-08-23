import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Coins, Crown, Sparkles, X, Zap } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { createOrder } from "../features/createOrder";
import { verifyPayment } from "../features/verifyPayment";
import { setUserdata } from "../redux/userSlice";

/**
 * ============================================================================
 * BILLING & SUBSCRIPTION DRAWER COMPONENT (`BillingDrawer.jsx`)
 * ============================================================================
 * Features:
 * - Displays active user plan and animated credit balance progress bar.
 * - Pricing cards for Starter (₹199) and Pro (₹499) tiers.
 * - Integrates Razorpay checkout modal with HMAC-SHA256 server verification.
 * ============================================================================
 */
function BillingDrawer({ open, onClose }) {
  const { userData } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const [upgradingPlan, setUpgradingPlan] = useState(null);

  // Initiates Razorpay Order and opens modal
  const handleUpgrade = async (plan) => {
    try {
      setUpgradingPlan(plan);
      const data = await createOrder(plan);

      if (!data?.order?.id) {
        console.error("Failed to create Razorpay order:", data);
        return;
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data?.order?.amount,
        currency: data?.order?.currency,
        name: "NovaMind",
        description: `${data?.plan?.name || plan} Plan`,
        order_id: data?.order?.id,

        handler: async (response) => {
          try {
            // Cryptographic server-side verification
            const paymentData = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (paymentData?.success) {
              if (paymentData?.user) {
                dispatch(setUserdata(paymentData.user));
              } else {
                dispatch(
                  setUserdata({
                    ...userData,
                    plan: paymentData?.plan?.id || plan,
                    credits:
                      (userData?.credits || 0) +
                      (paymentData?.plan?.credits || 0),
                    totalCredits:
                      (userData?.totalCredits || 0) +
                      (paymentData?.plan?.credits || 0),
                  })
                );
              }

              onClose();
            }
          } catch (err) {
            console.error("Payment verification failed:", err);
          }
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("Upgrade error:", error);
    } finally {
      setUpgradingPlan(null);
    }
  };

  const currentCredits = userData?.credits ?? 0;
  const totalCredits = userData?.totalCredits || 100;

  const creditPercentage = Math.min(
    Math.round((currentCredits / (totalCredits || 1)) * 100),
    100
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm"
          />

          {/* Slide-over Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-[460px] flex-col border-l border-white/[0.08] bg-[#0c0e15] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] p-5 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Crown size={16} />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-white tracking-tight">
                    Billing & Credits
                  </h2>
                  <p className="text-xs text-slate-400">
                    Manage your balance and plan tier
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer border-none"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              
              {/* Current Status Card */}
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4.5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Current Plan
                    </span>
                    <h3 className="text-lg font-bold capitalize text-white flex items-center gap-2 mt-0.5">
                      <span>{userData?.plan || "Free"}</span>
                      <span className="text-[10.5px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full uppercase">
                        Active
                      </span>
                    </h3>
                  </div>

                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Sparkles size={18} />
                  </div>
                </div>

                {/* Meter */}
                <div className="space-y-1.5 pt-2 border-t border-white/[0.04]">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Coins size={12} className="text-amber-400" />
                      Remaining Credits
                    </span>
                    <span className="font-semibold text-white">
                      {currentCredits} <span className="text-slate-500">/ {totalCredits}</span>
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                      style={{ width: `${creditPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Pricing Cards */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Upgrade Plans
                </h4>

                {/* Starter Plan */}
                <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:border-white/[0.12] p-5 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-base font-bold text-white">
                        Starter Plan
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Ideal for casual building and queries
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-indigo-300">
                        ₹199
                      </span>
                      <span className="text-[11px] text-slate-500 block">one-time</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-slate-300 border-t border-white/[0.04] pt-3">
                    <div className="flex items-center gap-2">
                      <Check size={13} className="text-emerald-400 shrink-0" />
                      <span><strong>500</strong> AI Generation Credits</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check size={13} className="text-emerald-400 shrink-0" />
                      <span>Access to Coding, Vision & PDF Agents</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check size={13} className="text-emerald-400 shrink-0" />
                      <span>Live Sandbox & Monaco Code Editor</span>
                    </div>
                  </div>

                  <button
                    disabled={upgradingPlan === "starter"}
                    className="mt-4.5 w-full flex items-center justify-center gap-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] py-2.5 text-xs font-semibold text-white transition-all cursor-pointer disabled:opacity-50"
                    onClick={() => handleUpgrade("starter")}
                  >
                    {upgradingPlan === "starter" ? (
                      <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span>Upgrade to Starter</span>
                    )}
                  </button>
                </div>

                {/* Pro Plan */}
                <div className="relative rounded-2xl border border-indigo-500/40 bg-gradient-to-b from-indigo-500/[0.08] to-violet-500/[0.03] p-5 shadow-lg shadow-indigo-500/10">
                  <div className="absolute -top-2.5 right-4 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                    Most Popular
                  </div>

                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                        <span>Pro Plan</span>
                        <Zap size={14} className="text-amber-400 fill-amber-400" />
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        For heavy workflows & power creators
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-indigo-300">
                        ₹499
                      </span>
                      <span className="text-[11px] text-slate-500 block">one-time</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-slate-300 border-t border-white/[0.06] pt-3">
                    <div className="flex items-center gap-2">
                      <Check size={13} className="text-emerald-400 shrink-0" />
                      <span><strong>1000</strong> AI Generation Credits</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check size={13} className="text-emerald-400 shrink-0" />
                      <span>All 8 Autonomous Agents Unlocked</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check size={13} className="text-emerald-400 shrink-0" />
                      <span>Priority Vector RAG & Fast Compute</span>
                    </div>
                  </div>

                  <button
                    disabled={upgradingPlan === "pro"}
                    className="mt-4.5 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:opacity-95 active:scale-[0.99] py-2.5 text-xs font-semibold text-white transition-all cursor-pointer shadow-md shadow-indigo-500/25 border-none disabled:opacity-50"
                    onClick={() => handleUpgrade("pro")}
                  >
                    {upgradingPlan === "pro" ? (
                      <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span>Upgrade to Pro</span>
                    )}
                  </button>
                </div>

              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default BillingDrawer;