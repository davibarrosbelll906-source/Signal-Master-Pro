import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ShieldAlert, ArrowRight, Loader2, Mail, RefreshCw, X } from "lucide-react";
import { useAppStore, initStore } from "@/lib/store";

async function apiPost(path: string, body: object) {
  const res = await fetch(`/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erro desconhecido");
  return data;
}

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const setCurrentUser = useAppStore(s => s.setCurrentUser);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [riskProfile, setRiskProfile] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const progress = (step / 3) * 100;

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) e.name = "Informe seu nome completo";
    if (!email.includes("@") || !email.includes(".")) e.email = "E-mail inválido";
    if (pass.length < 6) e.pass = "Senha deve ter pelo menos 6 caracteres";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) setStep(2);
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!riskProfile || !termsAccepted) return;
    setLoading(true);
    try {
      await apiPost("/send-otp", { email, name });
      setOtpSent(true);
      setStep(3);
      startResendCooldown(60);
    } catch (err: any) {
      setErrors(ev => ({ ...ev, otp: err.message }));
    } finally {
      setLoading(false);
    }
  };

  const startResendCooldown = (secs: number) => {
    setResendCooldown(secs);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(v => {
        if (v <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return v - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setOtpError("");
    try {
      await apiPost("/send-otp", { email, name });
      setOtp(["", "", "", "", "", ""]);
      startResendCooldown(60);
      otpRefs.current[0]?.focus();
    } catch (err: any) {
      setOtpError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    setOtpError("");
    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      otpRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) { setOtpError("Digite os 6 dígitos"); return; }
    setLoading(true);
    setOtpError("");
    try {
      await apiPost("/verify-otp", { email, code });
      createAccount();
    } catch (err: any) {
      setOtpError(err.message);
      setLoading(false);
    }
  };

  const createAccount = () => {
    initStore();
    const usersStr = localStorage.getItem("smpU7");
    const users = usersStr ? JSON.parse(usersStr) : [];
    const base = email.split("@")[0].replace(/[^a-z0-9]/gi, "").toLowerCase();
    const username = base || "user" + Math.floor(Math.random() * 9999);
    const newUser = {
      user: username,
      pass,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: "user",
      plan: "basico",
      trialEndsAt: Date.now() + 3 * 24 * 60 * 60 * 1000,
    };
    users.push(newUser);
    localStorage.setItem("smpU7", JSON.stringify(users));
    setCurrentUser(newUser);
    setLocation("/dashboard/signals");
  };

  return (
    <div className="min-h-screen bg-[#07070d] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(68,136,255,0.05)_0%,transparent_50%),radial-gradient(ellipse_at_80%_20%,rgba(170,68,255,0.05)_0%,transparent_50%)] pointer-events-none" />

      <div className="glass-card w-full max-w-lg p-8 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold text-white">Criar Conta</h2>
            <span className="text-sm text-[var(--green)] font-medium">Passo {step} de 3</span>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--green)] transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Trial badge */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--green)]/8 border border-[var(--green)]/15 mb-6">
          <span className="text-lg">🚀</span>
          <div>
            <div className="text-sm font-bold text-[var(--green)]">3 Dias Grátis — Sem cartão</div>
            <div className="text-xs text-gray-500">Acesso completo ao plano Pro por 72 horas</div>
          </div>
        </div>

        <AnimatePresence mode="wait">

          {/* STEP 1 — Dados */}
          {step === 1 && (
            <motion.form
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleStep1}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => { setName(e.target.value); setErrors(v => ({ ...v, name: "" })); }}
                  className={`w-full bg-white/5 border rounded-lg px-4 py-3 text-white focus:outline-none transition ${errors.name ? "border-[var(--red)]/60" : "border-white/10 focus:border-[var(--green)]"}`}
                  placeholder="Seu nome completo"
                />
                {errors.name && <p className="text-[var(--red)] text-xs mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErrors(v => ({ ...v, email: "" })); }}
                  className={`w-full bg-white/5 border rounded-lg px-4 py-3 text-white focus:outline-none transition ${errors.email ? "border-[var(--red)]/60" : "border-white/10 focus:border-[var(--green)]"}`}
                  placeholder="seu@email.com"
                />
                {errors.email && <p className="text-[var(--red)] text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Senha</label>
                <input
                  type="password"
                  required
                  value={pass}
                  onChange={e => { setPass(e.target.value); setErrors(v => ({ ...v, pass: "" })); }}
                  className={`w-full bg-white/5 border rounded-lg px-4 py-3 text-white focus:outline-none transition ${errors.pass ? "border-[var(--red)]/60" : "border-white/10 focus:border-[var(--green)]"}`}
                  placeholder="Mínimo 6 caracteres"
                />
                {errors.pass && <p className="text-[var(--red)] text-xs mt-1">{errors.pass}</p>}
                <div className="flex gap-1 mt-2">
                  <div className={`h-1 flex-1 rounded-full transition-colors ${pass.length > 0 ? "bg-red-400" : "bg-white/10"}`} />
                  <div className={`h-1 flex-1 rounded-full transition-colors ${pass.length > 5 ? "bg-yellow-400" : "bg-white/10"}`} />
                  <div className={`h-1 flex-1 rounded-full transition-colors ${pass.length > 8 ? "bg-[var(--green)]" : "bg-white/10"}`} />
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {pass.length === 0 ? "" : pass.length <= 5 ? "Senha fraca" : pass.length <= 8 ? "Senha média" : "Senha forte ✓"}
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-[var(--green)] text-black font-bold rounded-lg px-4 py-3 mt-2 hover:opacity-90 transition flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(0,255,136,0.15)]"
              >
                Próximo <ArrowRight size={18} />
              </button>

              <div className="text-center text-sm text-gray-400 pt-2">
                Já tem conta?{" "}
                <Link href="/login" className="text-white font-medium hover:text-[var(--green)] transition">
                  Fazer login
                </Link>
              </div>
            </motion.form>
          )}

          {/* STEP 2 — Perfil de risco */}
          {step === 2 && (
            <motion.form
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleStep2}
              className="space-y-5"
            >
              <div className="text-center mb-2">
                <ShieldAlert className="w-11 h-11 text-[var(--blue)] mx-auto mb-2" />
                <h3 className="text-lg font-bold text-white">Perfil de Risco</h3>
                <p className="text-sm text-gray-400">Como você reage a perdas sequenciais?</p>
              </div>

              <div className="space-y-2.5">
                {[
                  { label: "Paro imediatamente", sub: "Conservador — prioridade total na preservação de banca", icon: "🛡️" },
                  { label: "Reduzo o tamanho da entrada", sub: "Moderado — equilíbrio entre risco e retorno", icon: "⚖️" },
                  { label: "Faço Martingale controlado", sub: "Agressivo — aceito maior risco por maior retorno", icon: "🚀" },
                ].map((opt) => (
                  <label
                    key={opt.label}
                    className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${riskProfile === opt.label ? "border-[var(--green)]/50 bg-[var(--green)]/5" : "border-white/10 bg-white/3 hover:bg-white/6"}`}
                  >
                    <div className={`w-5 h-5 rounded-full border mt-0.5 shrink-0 flex items-center justify-center ${riskProfile === opt.label ? "border-[var(--green)]" : "border-gray-600"}`}>
                      {riskProfile === opt.label && <div className="w-2.5 h-2.5 rounded-full bg-[var(--green)]" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{opt.icon}</span>
                        <span className="font-semibold text-white text-sm">{opt.label}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{opt.sub}</div>
                    </div>
                    <input type="radio" name="risk" value={opt.label} checked={riskProfile === opt.label} onChange={() => setRiskProfile(opt.label)} className="hidden" />
                  </label>
                ))}
              </div>

              <label className="flex items-start gap-3 text-sm text-gray-400 cursor-pointer p-3 rounded-xl border border-white/5 hover:bg-white/3 transition">
                <div
                  className={`w-5 h-5 rounded border mt-0.5 shrink-0 flex items-center justify-center transition ${termsAccepted ? "bg-[var(--green)] border-[var(--green)]" : "border-gray-600 bg-white/5"}`}
                  onClick={() => setTermsAccepted(v => !v)}
                >
                  {termsAccepted && <Check size={12} className="text-black" />}
                </div>
                <span>Aceito os <span className="text-white">Termos de Serviço</span> e <span className="text-white">Política de Privacidade</span> e confirmo ter mais de 18 anos.</span>
                <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className="hidden" />
              </label>

              {errors.otp && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--red)]/10 border border-[var(--red)]/20 text-sm text-[var(--red)]">
                  <X size={14} className="shrink-0" /> {errors.otp}
                </div>
              )}

              <button
                type="submit"
                disabled={!riskProfile || !termsAccepted || loading}
                className="w-full bg-[var(--green)] text-black font-bold rounded-lg px-4 py-3 hover:opacity-90 transition flex justify-center items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,255,136,0.15)]"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Enviando código...</>
                ) : (
                  <><Mail size={18} /> Enviar Código de Verificação</>
                )}
              </button>

              <button type="button" onClick={() => setStep(1)} className="w-full text-gray-500 text-sm hover:text-gray-300 transition py-1">
                ← Voltar
              </button>
            </motion.form>
          )}

          {/* STEP 3 — OTP */}
          {step === 3 && (
            <motion.form
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleVerifyOtp}
              className="space-y-6 text-center"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-[var(--blue)]/10 border border-[var(--blue)]/25 flex items-center justify-center mx-auto mb-4">
                  <Mail size={24} className="text-[var(--blue)]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Verifique seu e-mail</h3>
                <p className="text-sm text-gray-400">
                  Enviamos um código de 6 dígitos para<br />
                  <span className="text-white font-medium">{email}</span>
                </p>
              </div>

              {/* OTP inputs */}
              <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className={`w-11 h-14 text-center text-2xl font-black rounded-xl border bg-white/5 text-white focus:outline-none transition ${
                      digit ? "border-[var(--green)]/60 bg-[var(--green)]/5" :
                      otpError ? "border-[var(--red)]/50" : "border-white/10 focus:border-[var(--green)]/50"
                    }`}
                  />
                ))}
              </div>

              {otpError && (
                <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-[var(--red)]/10 border border-[var(--red)]/20 text-sm text-[var(--red)]">
                  <X size={14} /> {otpError}
                </div>
              )}

              <p className="text-xs text-gray-500">O código expira em 10 minutos. Verifique também a caixa de spam.</p>

              <button
                type="submit"
                disabled={otp.join("").length !== 6 || loading}
                className="w-full bg-[var(--green)] text-black font-bold rounded-lg px-4 py-3 hover:opacity-90 transition flex justify-center items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,255,136,0.15)]"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Verificando...</>
                ) : (
                  <><Check size={18} /> Confirmar e Criar Conta</>
                )}
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || loading}
                className="flex items-center justify-center gap-2 w-full text-sm text-gray-500 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RefreshCw size={13} />
                {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : "Reenviar código"}
              </button>

              <button type="button" onClick={() => setStep(2)} className="text-gray-600 text-xs hover:text-gray-400 transition">
                ← Voltar
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
