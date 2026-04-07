import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ShieldAlert, ArrowRight, Loader2 } from "lucide-react";
import { useAppStore, initStore } from "@/lib/store";

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

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) e.name = "Informe seu nome completo";
    if (!email.includes("@") || !email.includes(".")) e.email = "E-mail inválido";
    if (pass.length < 6) e.pass = "Senha deve ter pelo menos 6 caracteres";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    if (!riskProfile) return;
    if (!termsAccepted) return;
    setLoading(true);
    initStore();
    setTimeout(() => {
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
    }, 1000);
  };

  const progress = (step / 2) * 100;

  return (
    <div className="min-h-screen bg-[#07070d] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(68,136,255,0.05)_0%,transparent_50%),radial-gradient(ellipse_at_80%_20%,rgba(170,68,255,0.05)_0%,transparent_50%)] pointer-events-none" />

      <div className="glass-card w-full max-w-lg p-8 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold text-white">Criar Conta</h2>
            <span className="text-sm text-[var(--green)] font-medium">Passo {step} de 2</span>
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

        <form onSubmit={handleNext}>
          <AnimatePresence mode="wait">

            {/* STEP 1 — Dados pessoais */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
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
              </motion.div>
            )}

            {/* STEP 2 — Perfil de risco + termos */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
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
                      className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                        riskProfile === opt.label
                          ? "border-[var(--green)]/50 bg-[var(--green)]/5"
                          : "border-white/10 bg-white/3 hover:bg-white/6"
                      }`}
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
                  <span>
                    Aceito os <span className="text-white underline cursor-pointer">Termos de Serviço</span> e <span className="text-white underline cursor-pointer">Política de Privacidade</span> e confirmo ter mais de 18 anos.
                  </span>
                  <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className="hidden" />
                </label>

                <button
                  type="submit"
                  disabled={!riskProfile || !termsAccepted || loading}
                  className="w-full bg-[var(--green)] text-black font-bold rounded-lg px-4 py-3 hover:opacity-90 transition flex justify-center items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,255,136,0.15)]"
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Criando conta...</>
                  ) : (
                    <><Check size={18} /> Concluir Cadastro</>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full text-gray-500 text-sm hover:text-gray-300 transition py-1"
                >
                  ← Voltar
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {step === 1 && (
          <div className="mt-6 text-center text-sm text-gray-400">
            Já tem conta?{" "}
            <Link href="/login" className="text-white font-medium hover:text-[var(--green)] transition">
              Fazer login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
