import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useAppStore, initStore } from "@/lib/store";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();
  const setCurrentUser = useAppStore(s => s.setCurrentUser);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    initStore();

    setTimeout(() => {
      const usersStr = localStorage.getItem('smpU7');
      if (usersStr) {
        const users = JSON.parse(usersStr);
        const found = users.find((u: any) => (u.user === user || u.email === user) && u.pass === pass);
        if (found) {
          setCurrentUser(found);
          setLocation("/dashboard/signals");
        } else {
          setError("Credenciais inválidas");
        }
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#07070d] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(68,136,255,0.05)_0%,transparent_50%),radial-gradient(ellipse_at_80%_20%,rgba(170,68,255,0.05)_0%,transparent_50%)] pointer-events-none"></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card w-full max-w-md p-8 relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded bg-[var(--green)] flex items-center justify-center text-black font-bold mx-auto mb-4 animate-signal-pulse text-xl">
            S
          </div>
          <h1 className="text-2xl font-bold text-white">Acesso Restrito</h1>
          <p className="text-gray-400 mt-2">Área do trader profissional</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Usuário ou E-mail</label>
            <input 
              type="text" 
              value={user}
              onChange={e => setUser(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--green)] transition"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Senha</label>
            <div className="relative">
              <input 
                type={showPass ? "text" : "password"} 
                value={pass}
                onChange={e => setPass(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--green)] transition pr-10"
                required
              />
              <button 
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded"
            >
              {error}
            </motion.div>
          )}

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-gray-400 cursor-pointer hover:text-white">
              <input type="checkbox" className="rounded border-white/10 bg-white/5 text-[var(--green)] focus:ring-[var(--green)]" />
              Lembrar-me
            </label>
            <Link href="/forgot" className="text-[var(--green)] hover:text-[var(--green-dark)] transition">
              Esqueci minha senha
            </Link>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[var(--green)] text-black font-bold rounded-lg px-4 py-3 mt-4 hover:bg-[var(--green-dark)] transition shadow-[0_0_15px_rgba(0,255,136,0.2)] flex justify-center items-center h-[50px]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar no Sistema"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          Não tem uma conta? <Link href="/register" className="text-white font-medium hover:text-[var(--green)] transition">Criar conta grátis</Link>
        </div>
      </motion.div>
      
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center text-sm text-gray-500 max-w-sm w-full opacity-60">
        "Consistência é o que transforma um bom trader em um grande trader."
      </div>
    </div>
  );
}
