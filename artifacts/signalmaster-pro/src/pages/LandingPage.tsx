import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight, Activity, TrendingUp, ShieldCheck, Cpu, Brain, BarChart2,
  Zap, Trophy, Users, Check, Star, ChevronDown, ChevronUp, Globe
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

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#07070d] text-white overflow-x-hidden relative">
      {/* Bg gradients */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(68,136,255,0.07)_0%,transparent_50%),radial-gradient(ellipse_at_80%_80%,rgba(0,255,136,0.04)_0%,transparent_50%),radial-gradient(ellipse_at_60%_10%,rgba(170,68,255,0.05)_0%,transparent_50%)] pointer-events-none" />

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
            <Link href="/register" className="px-5 py-2 rounded-full bg-[var(--green)] text-black font-bold text-sm hover:opacity-90 transition shadow-[0_0_15px_rgba(0,255,136,0.2)]">
              Teste Grátis →
            </Link>
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
              <Link
                href="/register"
                className="px-8 py-4 rounded-2xl bg-[var(--green)] text-black font-black text-lg hover:opacity-95 transition shadow-[0_0_30px_rgba(0,255,136,0.25)] flex items-center justify-center gap-2 group"
              >
                🚀 Começar Teste Grátis — 3 Dias
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
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
                  <Link
                    href="/register"
                    className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition ${
                      i === 1
                        ? 'bg-[var(--blue)] text-white hover:opacity-90 shadow-[0_0_20px_rgba(68,136,255,0.2)]'
                        : i === 2
                        ? 'bg-[var(--gold)] text-black hover:opacity-90'
                        : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
                    }`}
                  >
                    Começar Teste Grátis <ArrowRight size={14} />
                  </Link>
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

        {/* CTA */}
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
              <Link
                href="/register"
                className="px-8 py-4 rounded-2xl bg-[var(--green)] text-black font-black text-lg hover:opacity-95 transition shadow-[0_0_30px_rgba(0,255,136,0.2)] flex items-center justify-center gap-2 group"
              >
                Criar Conta Grátis <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
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
            <Link href="/register" className="hover:text-white transition">Cadastro</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
