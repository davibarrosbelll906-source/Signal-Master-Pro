import { useLocation } from "wouter";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Activity, TrendingUp, ShieldCheck, Cpu, Brain, BarChart2,
  Zap, Trophy, Users, Check, Star, ChevronDown, ChevronUp, Globe,
  X, User, Phone, Mail, Loader2
} from "lucide-react";
import { useState } from "react";

const features = [
  { icon: Cpu, color: 'text-[var(--blue)]', bg: 'bg-[var(--blue)]/10 border-[var(--blue)]/20', title: '5 Motores de IA', desc: 'Multi-Universe Consensus com EMA, RSI, MACD, ADX, ATR, OBV, Bollinger e Stochastic calculados em tempo real.' },
  { icon: Brain, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', title: 'DNA de Candle', desc: 'Sistema proprietário de fingerprinting de padrões de candles + Market Maker Trap Detector + Entropia de Shannon.' },
  { icon: Activity, color: 'text-[var(--green)]', bg: 'bg-[var(--green)]/10 border-[var(--green)]/20', title: 'Binance WebSocket', desc: 'Dados de crypto em tempo real via WebSocket. Forex e Commodities com simulação Ornstein-Uhlenbeck calibrada.' },
  { icon: BarChart2, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', title: '20+ Páginas de Análise', desc: 'Heatmap de horário, backtesting, equity curve, heatmap hora×dia, calendário mensal, exportação CSV/JSON.' },
  { icon: ShieldCheck, color: 'text-teal-400', bg: 'bg-teal-400/10 border-teal-400/20', title: 'Gestão de Banca', desc: 'Kelly Criterion, cálculo de risco de ruína, simulador Soros/Martingale, diário de operações com humor e notas.' },
  { icon: Trophy, color: 'text-[var(--gold)]', bg: 'bg-yellow-500/10 border-yellow-500/20', title: 'Gamificação Completa', desc: '12 conquistas, sistema de metas, leaderboard global, ranking por ativo, notificações automáticas de milestones.' },
];

const plans = [
  {
    name: 'Starter', price: 'R$ 97', period: '/mês', color: 'border-white/15',
    badge: null, icon: '📦',
    features: ['Sinais M1 (Forex e Crypto)', 'Histórico até 30 dias', 'Analytics básico', 'Diário de Trading', 'Suporte via ticket']
  },
  {
    name: 'Pro', price: 'R$ 197', period: '/mês', color: 'border-[var(--blue)]/50',
    badge: 'Mais Popular', icon: '🔥',
    features: ['Tudo do Starter', '+ Commodities (XAUUSD, USOIL)', 'Backtesting histórico', 'Heatmap por horário', 'Calculadora de risco Kelly', 'Sistema de Metas', 'Ranking Global', 'Telegram Bot integrado']
  },
  {
    name: 'Premium', price: 'R$ 397', period: '/mês', color: 'border-[var(--gold)]/50',
    badge: '💎 Elite', icon: '💎',
    features: ['Tudo do Pro', 'Projetor para lives/grupos', 'Painel de Afiliados', 'Exportação CSV/JSON', 'Análise AI de losses', 'Suporte prioritário', 'Tema Gold exclusivo', 'Acesso às atualizações beta']
  },
];

const faqs = [
  { q: 'O sistema garante lucro?', a: 'Não. Trading envolve risco. O SignalMaster Pro fornece sinais baseados em análise técnica avançada com alta assertividade histórica, mas os resultados passados não garantem resultados futuros. Use sempre gerenciamento de risco.' },
  { q: 'Como funciona o sinal no segundo 48?', a: 'Os motores de IA analisam os últimos 200 candles M1 no segundo 48 de cada minuto. Quando 4 dos 5 motores concordam na mesma direção (CALL ou PUT), o sinal é liberado com a qualidade calculada.' },
  { q: 'Funciona com qual corretora?', a: 'O sistema é independente de corretora. Os sinais são exibidos na tela e você os executa manualmente na sua plataforma preferida (IQ Option, Quotex, Pocket Option, etc.).' },
  { q: 'Há período de trial?', a: 'Sim! Ao criar sua conta, você tem 3 dias de acesso completo ao plano Pro para testar a plataforma sem compromisso. Nenhum cartão exigido.' },
  { q: 'Posso usar no celular?', a: 'Sim. A plataforma é responsiva com menu mobile completo. Para a melhor experiência recomendamos o navegador Chrome ou Safari.' },
];

const testimonials = [
  { name: 'Rafael M.', city: 'São Paulo', wr: '79%', ops: 847, text: 'Uso há 6 meses. A diferença de usar sinais com contexto de sessão e qualidade calculada é enorme. Minha consistência melhorou muito.' },
  { name: 'Juliana C.', city: 'Curitiba', wr: '73%', ops: 412, text: 'O Heatmap me mostrou que eu operava nos piores horários. Depois de ajustar, minha taxa de acerto subiu 18 pontos em um mês.' },
  { name: 'Diego A.', city: 'Fortaleza', wr: '81%', ops: 1203, text: 'Analista há 4 anos. A implementação do Multi-Universe Consensus e DNA de Candle é a mais sofisticada que vi em ferramenta para trader de varejo.' },
];

// ─── LEAD CAPTURE MODAL ───────────────────────────────────────────────────────
interface LeadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function LeadModal({ onClose, onSuccess }: LeadModalProps) {
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatWpp = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!nome.trim() || nome.trim().length < 2) e.nome = 'Informe seu nome completo';
    const digits = whatsapp.replace(/\D/g, '');
    if (digits.length < 10) e.whatsapp = 'WhatsApp inválido';
    if (!email.includes('@') || !email.includes('.')) e.email = 'E-mail inválido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));

    const lead = { nome: nome.trim(), whatsapp: whatsapp.replace(/\D/g, ''), email: email.trim().toLowerCase(), ts: Date.now() };
    try {
      const leads = JSON.parse(localStorage.getItem('smpLeads') || '[]');
      leads.unshift(lead);
      localStorage.setItem('smpLeads', JSON.stringify(leads));
    } catch {}

    setLoading(false);
    setSubmitted(true);
    setTimeout(onSuccess, 1800);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
        className="w-full max-w-md glass-card p-8 relative border border-[var(--green)]/20 shadow-[0_0_60px_rgba(0,255,136,0.08)]"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition"
        >
          <X size={14} />
        </button>

        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Header */}
              <div className="mb-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[var(--green)]/15 border border-[var(--green)]/25 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🚀</span>
                </div>
                <h2 className="text-xl font-black text-white mb-1">Acesso Grátis por 3 Dias</h2>
                <p className="text-sm text-gray-400">Preencha os dados abaixo para liberar seu acesso ao <span className="text-[var(--green)] font-bold">SignalMaster Pro v7</span></p>
              </div>

              {/* Social proof mini */}
              <div className="flex items-center justify-center gap-3 mb-6 py-3 rounded-xl bg-white/3 border border-white/5">
                <div className="flex -space-x-2">
                  {['R','J','D','K','M'].map((l, i) => (
                    <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--green)]/60 to-[var(--blue)]/60 border-2 border-[#07070d] flex items-center justify-center text-[10px] font-bold text-white">{l}</div>
                  ))}
                </div>
                <div className="text-xs text-gray-400"><span className="text-white font-bold">1.200+ traders</span> já usam a plataforma</div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nome */}
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Nome Completo</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={nome}
                      onChange={e => { setNome(e.target.value); setErrors(ev => ({ ...ev, nome: '' })); }}
                      placeholder="Seu nome"
                      className={`w-full bg-white/5 border rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[var(--green)]/50 transition ${errors.nome ? 'border-[var(--red)]/60' : 'border-white/10'}`}
                    />
                  </div>
                  {errors.nome && <p className="text-[var(--red)] text-xs mt-1">{errors.nome}</p>}
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">WhatsApp</label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="tel"
                      value={whatsapp}
                      onChange={e => { setWhatsapp(formatWpp(e.target.value)); setErrors(ev => ({ ...ev, whatsapp: '' })); }}
                      placeholder="(11) 99999-9999"
                      className={`w-full bg-white/5 border rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[var(--green)]/50 transition ${errors.whatsapp ? 'border-[var(--red)]/60' : 'border-white/10'}`}
                    />
                  </div>
                  {errors.whatsapp && <p className="text-[var(--red)] text-xs mt-1">{errors.whatsapp}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">E-mail</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setErrors(ev => ({ ...ev, email: '' })); }}
                      placeholder="seu@email.com"
                      className={`w-full bg-white/5 border rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[var(--green)]/50 transition ${errors.email ? 'border-[var(--red)]/60' : 'border-white/10'}`}
                    />
                  </div>
                  {errors.email && <p className="text-[var(--red)] text-xs mt-1">{errors.email}</p>}
                </div>

                {/* CTA */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl bg-[var(--green)] text-black font-black text-base hover:opacity-95 active:scale-[0.98] transition-all shadow-[0_0_25px_rgba(0,255,136,0.25)] flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
                >
                  {loading ? (
                    <><Loader2 size={16} className="animate-spin" /> Liberando acesso...</>
                  ) : (
                    <><ArrowRight size={16} /> Quero Meu Acesso Grátis</>
                  )}
                </button>

                <p className="text-[10px] text-gray-600 text-center leading-relaxed">
                  Ao continuar você concorda com nossos termos de uso. Sem spam. Seus dados são privados e protegidos.
                </p>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.1 }}
                className="w-20 h-20 rounded-full bg-[var(--green)]/15 border-2 border-[var(--green)]/40 flex items-center justify-center mx-auto mb-5 shadow-[0_0_30px_rgba(0,255,136,0.2)]"
              >
                <span className="text-4xl">✅</span>
              </motion.div>
              <h3 className="text-xl font-black text-white mb-2">Acesso Liberado!</h3>
              <p className="text-sm text-gray-400 mb-1">Redirecionando para criar sua conta...</p>
              <div className="mt-4 flex justify-center">
                <div className="w-8 h-1 bg-[var(--green)]/30 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[var(--green)] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1.6, ease: 'linear' }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [, navigate] = useLocation();

  const openModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowLeadModal(true);
  };

  const handleLeadSuccess = () => {
    setShowLeadModal(false);
    navigate('/register');
  };

  return (
    <div className="min-h-screen bg-[#07070d] text-white overflow-x-hidden relative">
      {/* Bg gradients */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(68,136,255,0.07)_0%,transparent_50%),radial-gradient(ellipse_at_80%_80%,rgba(0,255,136,0.04)_0%,transparent_50%),radial-gradient(ellipse_at_60%_10%,rgba(170,68,255,0.05)_0%,transparent_50%)] pointer-events-none" />

      {/* LEAD MODAL */}
      <AnimatePresence>
        {showLeadModal && (
          <LeadModal
            onClose={() => setShowLeadModal(false)}
            onSuccess={handleLeadSuccess}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#07070d]/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--green)] flex items-center justify-center text-black font-black animate-signal-pulse text-sm">S</div>
            <div>
              <div className="font-bold text-sm leading-tight">SignalMaster Pro</div>
              <div className="text-[9px] text-[var(--green)] font-bold tracking-widest">v7 ULTIMATE</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="text-gray-400 hover:text-white transition">Funcionalidades</a>
            <a href="#como-funciona" className="text-gray-400 hover:text-white transition">Como Funciona</a>
            <a href="#planos" className="text-gray-400 hover:text-white transition">Planos</a>
            <a href="#faq" className="text-gray-400 hover:text-white transition">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition hidden sm:block">Entrar</Link>
            <button
              onClick={openModal}
              className="px-5 py-2 rounded-full bg-[var(--green)] text-black font-bold text-sm hover:opacity-90 transition shadow-[0_0_15px_rgba(0,255,136,0.2)]"
            >
              Teste Grátis →
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10">

        {/* HERO */}
        <section className="container mx-auto px-4 pt-24 pb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--green)]/10 border border-[var(--green)]/20 text-[var(--green)] text-sm font-medium mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
              v7 Ultimate — Lançamento Oficial
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-none">
              Sinais Precisos.<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--green)] via-[var(--blue)] to-purple-400 animate-shimmer">
                Resultados Reais.
              </span>
            </h1>
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              A plataforma mais avançada de sinais para opções binárias. 5 motores de IA, dados ao vivo da Binance, e mais de 20 ferramentas de análise profissional.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <button
                onClick={openModal}
                className="px-8 py-4 rounded-2xl bg-[var(--green)] text-black font-black text-lg hover:opacity-95 transition shadow-[0_0_30px_rgba(0,255,136,0.25)] flex items-center justify-center gap-2 group"
              >
                🚀 Começar Teste Grátis — 3 Dias
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <Link
                href="/login"
                className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition font-semibold text-lg flex items-center justify-center"
              >
                Já tenho conta
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-1.5"><Check size={14} className="text-[var(--green)]" /> Sem cartão de crédito</div>
              <div className="flex items-center gap-1.5"><Check size={14} className="text-[var(--green)]" /> Cancele quando quiser</div>
              <div className="flex items-center gap-1.5"><Check size={14} className="text-[var(--green)]" /> 3 dias grátis</div>
              <div className="flex items-center gap-1.5"><Globe size={14} className="text-[var(--green)]" /> 100% Online</div>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20">
            {[
              { icon: Activity, val: '2.847+', label: 'Sinais/mês', color: 'text-[var(--blue)]' },
              { icon: TrendingUp, val: '76%', label: 'Assertividade Média', color: 'text-[var(--green)]' },
              { icon: Users, val: '1.200+', label: 'Traders Ativos', color: 'text-purple-400' },
              { icon: Trophy, val: '21', label: 'Pares Monitorados', color: 'text-[var(--gold)]' },
            ].map(({ icon: Icon, val, label, color }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="glass-card p-6 text-center"
              >
                <Icon size={22} className={`${color} mx-auto mb-3`} />
                <div className="text-3xl font-black text-white mb-1">{val}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="container mx-auto px-4 py-20">
          <div className="text-center mb-14">
            <div className="text-xs text-[var(--blue)] font-bold uppercase tracking-wider mb-3">Tecnologia Exclusiva</div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Tudo que você precisa para operar com confiança</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Ferramentas profissionais que antes eram exclusivas de fundos quantitativos — agora na palma da sua mão.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, color, bg, title, desc }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className={`glass-card p-6 border hover:border-opacity-50 transition group`}
              >
                <div className={`w-11 h-11 rounded-xl border flex items-center justify-center mb-4 ${bg}`}>
                  <Icon size={20} className={color} />
                </div>
                <h3 className="font-bold text-white mb-2 text-lg">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="como-funciona" className="py-20 bg-white/2">
          <div className="container mx-auto px-4">
            <div className="text-center mb-14">
              <div className="text-xs text-[var(--green)] font-bold uppercase tracking-wider mb-3">Simples de Usar</div>
              <h2 className="text-3xl md:text-4xl font-black text-white">Como funciona</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                { step: '01', icon: Zap, title: 'Aguarde o Segundo 48', desc: 'No segundo 48 de cada minuto, os 5 motores de IA analisam 200 candles M1 com todos os indicadores técnicos.', color: 'text-[var(--green)]' },
                { step: '02', icon: Brain, title: 'Receba o Sinal', desc: 'Quando 4/5 motores concordam, você recebe o sinal com direção (CALL/PUT), ativo, qualidade e score de confiança.', color: 'text-[var(--blue)]' },
                { step: '03', icon: BarChart2, title: 'Opere e Registre', desc: 'Execute na sua corretora e marque WIN ou LOSS. O sistema aprende e melhora os pesos automaticamente.', color: 'text-purple-400' },
              ].map(({ step, icon: Icon, title, desc, color }, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center"
                >
                  <div className={`text-5xl font-black ${color} opacity-20 mb-3`}>{step}</div>
                  <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center border ${color === 'text-[var(--green)]' ? 'bg-[var(--green)]/10 border-[var(--green)]/20' : color === 'text-[var(--blue)]' ? 'bg-[var(--blue)]/10 border-[var(--blue)]/20' : 'bg-purple-500/10 border-purple-500/20'}`}>
                    <Icon size={24} className={color} />
                  </div>
                  <h3 className="font-bold text-white text-xl mb-3">{title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="container mx-auto px-4 py-20">
          <div className="text-center mb-14">
            <div className="text-xs text-purple-400 font-bold uppercase tracking-wider mb-3">Social Proof</div>
            <h2 className="text-3xl md:text-4xl font-black text-white">O que nossos traders dizem</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6"
              >
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} size={12} className="fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-400 text-sm leading-relaxed mb-5 italic">"{t.text}"</p>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-sm">{t.name}</div>
                    <div className="text-xs text-gray-600">{t.city}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[var(--green)] font-black">{t.wr}</div>
                    <div className="text-xs text-gray-600">{t.ops} ops</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* PLANS */}
        <section id="planos" className="py-20 bg-white/2">
          <div className="container mx-auto px-4">
            <div className="text-center mb-14">
              <div className="text-xs text-[var(--gold)] font-bold uppercase tracking-wider mb-3">Planos</div>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Escolha seu plano</h2>
              <p className="text-gray-400">Comece grátis por 3 dias. Sem cartão de crédito.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {plans.map((plan, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`glass-card p-8 border ${plan.color} relative ${i === 1 ? 'md:scale-105 shadow-[0_0_40px_rgba(68,136,255,0.1)]' : ''}`}
                >
                  {plan.badge && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold ${i === 1 ? 'bg-[var(--blue)] text-white' : 'bg-[var(--gold)] text-black'}`}>
                      {plan.badge}
                    </div>
                  )}
                  <div className="text-3xl mb-2">{plan.icon}</div>
                  <div className="font-bold text-xl text-white mb-1">{plan.name}</div>
                  <div className="mb-6">
                    <span className="text-4xl font-black text-white">{plan.price}</span>
                    <span className="text-gray-500 text-sm">{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-gray-400">
                        <Check size={14} className="text-[var(--green)] mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={openModal}
                    className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition ${
                      i === 1
                        ? 'bg-[var(--blue)] text-white hover:opacity-90 shadow-[0_0_20px_rgba(68,136,255,0.2)]'
                        : i === 2
                        ? 'bg-[var(--gold)] text-black hover:opacity-90'
                        : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
                    }`}
                  >
                    Começar Teste Grátis <ArrowRight size={14} />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="container mx-auto px-4 py-20 max-w-3xl">
          <div className="text-center mb-14">
            <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-3">Dúvidas</div>
            <h2 className="text-3xl md:text-4xl font-black text-white">Perguntas Frequentes</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className={`glass-card overflow-hidden transition border ${openFaq === i ? 'border-[var(--green)]/30' : 'border-transparent'}`}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="font-semibold text-white text-sm pr-4">{faq.q}</span>
                  {openFaq === i ? <ChevronUp size={16} className="text-[var(--green)] shrink-0" /> : <ChevronDown size={16} className="text-gray-500 shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-sm text-gray-400 leading-relaxed border-t border-white/5 pt-4">
                    {faq.a}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="container mx-auto px-4 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card p-12 text-center border border-[var(--green)]/15 bg-gradient-to-br from-[var(--green)]/5 to-transparent max-w-3xl mx-auto"
          >
            <div className="text-4xl mb-4">🚀</div>
            <h2 className="text-3xl font-black text-white mb-4">Pronto para operar com precisão?</h2>
            <p className="text-gray-400 mb-8">Junte-se a mais de 1.200 traders que já usam o SignalMaster Pro v7 Ultimate.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={openModal}
                className="px-8 py-4 rounded-2xl bg-[var(--green)] text-black font-black text-lg hover:opacity-95 transition shadow-[0_0_30px_rgba(0,255,136,0.2)] flex items-center justify-center gap-2 group"
              >
                Criar Conta Grátis <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <Link
                href="/login"
                className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition font-semibold text-lg flex items-center justify-center"
              >
                Já tenho conta
              </Link>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[var(--green)] flex items-center justify-center text-black font-bold text-xs">S</div>
            <span className="font-bold text-gray-400">SignalMaster Pro v7</span>
          </div>
          <div className="text-center">
            ⚠️ Trading envolve risco. Sinais não garantem lucro. Use sempre gerenciamento de risco.
          </div>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-white transition">Login</Link>
            <button onClick={openModal} className="hover:text-white transition">Cadastro</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
