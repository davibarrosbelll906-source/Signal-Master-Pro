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

  // Step 1
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  // Step 2
  const [riskProfile, setRiskProfile] = useState<string | null>(null);

  // Step 3
  const [otp, setOtp] = useState("");

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) setStep(s => s + 1);
    else handleComplete();
  };

  const handleComplete = () => {
    setLoading(true);
    initStore();
    setTimeout(() => {
      const usersStr = localStorage.getItem('smpU7');
      const users = usersStr ? JSON.parse(usersStr) : [];
      const username = email.split('@')[0] || 'user' + Math.floor(Math.random()*1000);
      const newUser = {
        user: username,
        pass: pass,
        name: name,
        email: email,
        role: 'user',
        plan: 'basico',
        trialEndsAt: Date.now() + 3*24*60*60*1000
      };
      users.push(newUser);
      localStorage.setItem('smpU7', JSON.stringify(users));
      setCurrentUser(newUser);
      setLocation("/dashboard/signals");
    }, 1000);
  };

  const progress = (step / 3) * 100;

  return (
    <div className="min-h-screen bg-[#07070d] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(68,136,255,0.05)_0%,transparent_50%),radial-gradient(ellipse_at_80%_20%,rgba(170,68,255,0.05)_0%,transparent_50%)] pointer-events-none"></div>

      <div className="glass-card w-full max-w-lg p-8 relative z-10">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold text-white">Criar Conta</h2>
            <span className="text-sm text-[var(--green)] font-medium">Passo {step} de 3</span>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[var(--green)] transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        <form onSubmit={handleNext}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nome Completo</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[var(--green)] focus:outline-none transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">E-mail</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[var(--green)] focus:outline-none transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Senha</label>
                  <input type="password" required value={pass} onChange={e => setPass(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[var(--green)] focus:outline-none transition" />
                  <div className="flex gap-1 mt-2">
                    <div className={`h-1 flex-1 rounded-full ${pass.length > 0 ? 'bg-red-400' : 'bg-white/10'}`}></div>
                    <div className={`h-1 flex-1 rounded-full ${pass.length > 5 ? 'bg-yellow-400' : 'bg-white/10'}`}></div>
                    <div className={`h-1 flex-1 rounded-full ${pass.length > 8 ? 'bg-[var(--green)]' : 'bg-white/10'}`}></div>
                  </div>
                </div>
                <button type="submit" className="w-full bg-[var(--green)] text-black font-bold rounded-lg px-4 py-3 mt-6 hover:bg-[var(--green-dark)] transition flex justify-center items-center gap-2">
                  Próximo <ArrowRight size={18} />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="text-center mb-4">
                  <ShieldAlert className="w-12 h-12 text-[var(--blue)] mx-auto mb-2" />
                  <h3 className="text-lg font-medium text-white">Perfil de Risco</h3>
                  <p className="text-sm text-gray-400">Como você reage a perdas sequenciais?</p>
                </div>
                
                <div className="space-y-3">
                  {['Paro imediatamente (Conservador)', 'Reduzo a mão (Moderado)', 'Faço Martingale (Agressivo)'].map((opt, i) => (
                    <label key={i} className={`block p-4 rounded-xl border cursor-pointer transition-all ${riskProfile === opt ? 'border-[var(--green)] bg-[var(--green)]/5' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${riskProfile === opt ? 'border-[var(--green)]' : 'border-gray-500'}`}>
                          {riskProfile === opt && <div className="w-3 h-3 rounded-full bg-[var(--green)]"></div>}
                        </div>
                        <span className="text-white">{opt}</span>
                      </div>
                      <input type="radio" name="risk" value={opt} checked={riskProfile === opt} onChange={() => setRiskProfile(opt)} className="hidden" />
                    </label>
                  ))}
                </div>

                <button type="submit" disabled={!riskProfile} className="w-full bg-[var(--green)] text-black font-bold rounded-lg px-4 py-3 hover:bg-[var(--green-dark)] transition flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  Próximo <ArrowRight size={18} />
                </button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 text-center">
                <h3 className="text-lg font-medium text-white mb-2">Verificação de Segurança</h3>
                <p className="text-sm text-gray-400">Insira o código de 6 dígitos enviado para seu e-mail.<br/>(Demo: digite 123456)</p>
                
                <div className="flex justify-center gap-2">
                  <input 
                    type="text" 
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-48 text-center text-2xl tracking-[0.5em] bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[var(--green)] focus:outline-none transition" 
                    placeholder="000000"
                  />
                </div>

                <label className="flex items-start gap-3 text-sm text-gray-400 mt-6 text-left cursor-pointer">
                  <input type="checkbox" required className="mt-1 rounded border-white/10 bg-white/5 text-[var(--green)] focus:ring-[var(--green)]" />
                  <span>Aceito os Termos de Serviço e Política de Privacidade e confirmo ter mais de 18 anos.</span>
                </label>

                <button type="submit" disabled={otp.length !== 6 || loading} className="w-full bg-[var(--green)] text-black font-bold rounded-lg px-4 py-3 hover:bg-[var(--green-dark)] transition flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,255,136,0.2)]">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check size={18} /> Concluir Cadastro</>}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
        
        {step === 1 && (
          <div className="mt-6 text-center text-sm text-gray-400">
            Já tem conta? <Link href="/login" className="text-white font-medium hover:text-[var(--green)] transition">Fazer login</Link>
          </div>
        )}
      </div>
    </div>
  );
}
