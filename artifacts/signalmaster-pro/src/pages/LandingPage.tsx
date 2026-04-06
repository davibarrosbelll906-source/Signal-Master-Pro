import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Activity, TrendingUp, ShieldCheck } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#07070d] text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(68,136,255,0.05)_0%,transparent_50%),radial-gradient(ellipse_at_80%_20%,rgba(170,68,255,0.05)_0%,transparent_50%)] pointer-events-none"></div>
      
      <header className="container mx-auto px-4 py-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[var(--green)] flex items-center justify-center text-black font-bold animate-signal-pulse">
            S
          </div>
          <span className="font-bold text-xl tracking-tight">SignalMaster Pro</span>
        </div>
        <nav className="hidden md:flex gap-6">
          <a href="#funciona" className="text-gray-400 hover:text-white transition">Como Funciona</a>
          <a href="#planos" className="text-gray-400 hover:text-white transition">Planos</a>
          <a href="#faq" className="text-gray-400 hover:text-white transition">FAQ</a>
        </nav>
        <Link href="/login" className="px-6 py-2 rounded-full border border-gray-700 hover:border-gray-500 transition text-sm font-medium">
          Entrar
        </Link>
      </header>

      <main className="container mx-auto px-4 pt-20 pb-32 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto"
        >
          <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[var(--green)] text-sm font-medium mb-6">
            v7 Ultimate - Lançamento Oficial
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
            Sinais Precisos.<br/>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--green)] to-[var(--blue)] animate-shimmer block mt-2">
              Operações Vencedoras.
            </span>
          </h1>
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
            Plataforma profissional para traders exigentes. Inteligência Artificial, múltiplos indicadores e análise quantitativa em tempo real.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="px-8 py-4 rounded-full bg-[var(--green)] text-black font-bold text-lg hover:bg-[var(--green-dark)] transition shadow-[0_0_20px_rgba(0,255,136,0.3)] flex items-center justify-center gap-2 group">
              🚀 Começar Teste Grátis — 3 Dias
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/login" className="px-8 py-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition font-medium text-lg flex items-center justify-center">
              Já tenho conta
            </Link>
          </div>
        </motion.div>

        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-8 text-center"
          >
            <Activity className="w-10 h-10 text-[var(--blue)] mx-auto mb-4" />
            <div className="text-4xl font-bold text-white mb-2">2.847+</div>
            <div className="text-gray-400">Sinais por mês</div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-8 text-center"
          >
            <TrendingUp className="w-10 h-10 text-[var(--green)] mx-auto mb-4" />
            <div className="text-4xl font-bold text-white mb-2">76%</div>
            <div className="text-gray-400">Assertividade Média</div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-8 text-center"
          >
            <ShieldCheck className="w-10 h-10 text-[var(--purple)] mx-auto mb-4" />
            <div className="text-4xl font-bold text-white mb-2">21</div>
            <div className="text-gray-400">Pares Monitorados</div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
