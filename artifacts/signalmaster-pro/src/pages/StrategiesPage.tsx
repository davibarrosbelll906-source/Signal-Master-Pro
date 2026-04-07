import { useState } from "react";
import { BookOpen, Zap, Brain, BarChart2, Shield, Activity, ChevronDown, ChevronUp } from "lucide-react";

interface Strategy {
  id: string;
  title: string;
  tag: string;
  tagColor: string;
  icon: string;
  difficulty: 'Básico' | 'Intermediário' | 'Avançado';
  accuracy: string;
  desc: string;
  logic: string[];
  conditions: string[];
  avoid: string[];
}

const STRATEGIES: Strategy[] = [
  {
    id: 'dna',
    title: 'DNA de Candle',
    tag: 'IA / Quant',
    tagColor: 'text-purple-400 border-purple-400/30 bg-purple-400/5',
    icon: '🧬',
    difficulty: 'Avançado',
    accuracy: '78-84%',
    desc: 'O motor de IA analisa o formato, tamanho e relação sombra/corpo dos últimos 7 candles e gera uma "impressão digital" única, comparando com milhares de padrões históricos.',
    logic: [
      'Normaliza corpo e sombras dos 7 últimos candles em um vetor de 14 dimensões',
      'Calcula distância euclidiana com o banco de padrões históricos',
      'Retorna probabilidade direcional baseada nos padrões mais similares',
      'Score mínimo de 72% para gerar sinal válido',
    ],
    conditions: ['Entropia de Shannon < 0.6 (mercado previsível)', 'ATR normal (sem spike de volatilidade)', 'Pelo menos 50 candles de histórico'],
    avoid: ['Alta volatilidade (NFP, FOMC, CPI)', 'Gaps de abertura de sessão', 'Spreads acima do normal'],
  },
  {
    id: 'mmtrap',
    title: 'Market Maker Trap',
    tag: 'Price Action',
    tagColor: 'text-[var(--red)] border-[var(--red)]/30 bg-[var(--red)]/5',
    icon: '🪤',
    difficulty: 'Avançado',
    accuracy: '74-81%',
    desc: 'Detecta quando grandes players criam falsos rompimentos para capturar stops da massa antes de reverter o mercado na direção real.',
    logic: [
      'Identifica rompimento de suporte/resistência recente (≥ 3 toques)',
      'Verifica se o rompimento foi confirmado com volume (OBV)',
      'Se OBV não confirmar, sinaliza como falso rompimento (armadilha)',
      'Opera na direção contrária ao rompimento com alta confiança',
    ],
    conditions: ['Nível de S/R testado ≥ 3 vezes', 'OBV divergindo do preço no rompimento', 'RSI em zona extrema (>70 ou <30)'],
    avoid: ['Tendências fortes com rompimentos em série', 'Notícias de alta impacto pendentes', 'Sessão asiática (baixa liquidez)'],
  },
  {
    id: 'consensus',
    title: 'Multi-Universe Consensus',
    tag: 'Quantitativo',
    tagColor: 'text-[var(--blue)] border-[var(--blue)]/30 bg-[var(--blue)]/5',
    icon: '🌐',
    difficulty: 'Avançado',
    accuracy: '80-86%',
    desc: 'Executa 5 sub-motores independentes com parâmetros diferentes e só gera sinal quando a maioria (≥4/5) concorda na mesma direção.',
    logic: [
      'Motor 1: EMA 9/21/50 + RSI 14',
      'Motor 2: MACD (12,26,9) + Bollinger Bands 20',
      'Motor 3: Stochastic (14,3) + ADX 14',
      'Motor 4: DNA de Candle + Entropia Shannon',
      'Motor 5: Market Maker Trap + OBV',
      'Score ponderado por ML com pesos adaptativos por ativo',
    ],
    conditions: ['≥ 4 de 5 sub-motores concordam', 'Score mínimo de consenso: 74%', 'ADX > 20 (tendência definida)'],
    avoid: ['Quando apenas 3/5 concordam (sinal fraco)', 'Horários de baixa liquidez (22h-2h BRT)', 'Próximo a fechamento de sessões'],
  },
  {
    id: 'entropy',
    title: 'Entropia de Shannon',
    tag: 'Quantitativo',
    tagColor: 'text-teal-400 border-teal-400/30 bg-teal-400/5',
    icon: '📡',
    difficulty: 'Intermediário',
    accuracy: '70-76%',
    desc: 'Mede o grau de aleatoriedade (caos) do mercado. Quando a entropia está baixa, o mercado é mais previsível e os sinais têm maior acurácia.',
    logic: [
      'Divide as variações de preço em bins de distribuição',
      'Calcula H(X) = -Σ P(xi) × log2(P(xi))',
      'Entropia < 0.5: mercado muito previsível → sinais liberados',
      'Entropia 0.5-0.7: mercado moderado → sinais com filtro adicional',
      'Entropia > 0.7: mercado caótico → sinais bloqueados',
    ],
    conditions: ['Entropia < 0.65 para sinais padrão', 'Entropia < 0.5 para sinais PREMIUM', 'Calculado sobre janela de 20 candles'],
    avoid: ['Entropia > 0.7 independente de outros indicadores', 'Primeiros 15 min de abertura de sessão', 'Períodos de rollover de mercado'],
  },
  {
    id: 'ema_rsi',
    title: 'Confluência Tendencial',
    tag: 'Clássico',
    tagColor: 'text-[var(--green)] border-[var(--green)]/30 bg-[var(--green)]/5',
    icon: '📈',
    difficulty: 'Básico',
    accuracy: '68-74%',
    desc: 'Alinhamento da tendência macro (EMA 200) com entrada de precisão (RSI 14 em zona de sobrevenda/sobrecompra).',
    logic: [
      'EMA 9 > EMA 21 > EMA 50 → tendência de alta confirmada',
      'RSI < 35 em tendência de alta → sobrevenda: CALL',
      'RSI > 65 em tendência de baixa → sobrecompra: PUT',
      'Confirmação com candle de reversão (padrão engolfo/pin bar)',
    ],
    conditions: ['Tendência clara no M5 e M15', 'RSI em zona extrema (>65 ou <35)', 'Candle de confirmação formado'],
    avoid: ['RSI em zona neutra (45-55)', 'Lateralização (ADX < 20)', 'Contra-tendência sem confirmação'],
  },
  {
    id: 'macd_bb',
    title: 'MACD + Bollinger',
    tag: 'Clássico',
    tagColor: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5',
    icon: '⚡',
    difficulty: 'Intermediário',
    accuracy: '69-75%',
    desc: 'Combinação do cruzamento de MACD com a localização do preço nas Bandas de Bollinger para capturar reversões de volatilidade.',
    logic: [
      'MACD cruza para cima + preço na banda inferior → CALL',
      'MACD cruza para baixo + preço na banda superior → PUT',
      'Largura das bandas indica volatilidade (squeeze = atenção)',
      'Histograma do MACD confirma força do sinal',
    ],
    conditions: ['Cruzamento MACD dentro das últimas 3 barras', 'Preço tocando ou cruzando banda de Bollinger', 'Stochastic confirmando direção'],
    avoid: ['Bollinger muito estreito (baixa volatilidade)', 'MACD com divergências ainda não confirmadas', 'Múltiplos cruzamentos consecutivos (whipsaw)'],
  },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  'Básico': 'text-[var(--green)]',
  'Intermediário': 'text-yellow-400',
  'Avançado': 'text-[var(--red)]',
};

export default function StrategiesPage() {
  const [expanded, setExpanded] = useState<string | null>('consensus');
  const [filter, setFilter] = useState<'all' | 'Básico' | 'Intermediário' | 'Avançado'>('all');

  const filtered = STRATEGIES.filter(s => filter === 'all' || s.difficulty === filter);

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="text-[var(--blue)]" size={24} />
          <h1 className="text-2xl font-bold text-white">Estratégias & Educação</h1>
        </div>
        <div className="flex gap-1.5">
          {(['all', 'Básico', 'Intermediário', 'Avançado'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${filter === f ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-gray-500 hover:text-white hover:bg-white/5'}`}
            >
              {f === 'all' ? 'Todas' : f}
            </button>
          ))}
        </div>
      </div>

      <p className="text-gray-400 text-sm max-w-2xl">
        O SignalMaster Pro não é uma caixa preta. Entenda a matemática e lógica por trás de cada sinal gerado pelo motor de inteligência artificial.
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-black text-[var(--green)]">{STRATEGIES.length}</div>
          <div className="text-xs text-gray-500">Estratégias ativas</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-black text-[var(--blue)]">5</div>
          <div className="text-xs text-gray-500">Sub-motores paralelos</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-black text-[var(--gold)]">86%</div>
          <div className="text-xs text-gray-500">Acurácia máxima</div>
        </div>
      </div>

      {/* Strategy Accordion */}
      <div className="space-y-3">
        {filtered.map(s => {
          const isOpen = expanded === s.id;
          return (
            <div key={s.id} className={`glass-card transition-all overflow-hidden border ${isOpen ? 'border-white/15' : 'border-white/5'}`}>
              <button
                className="w-full p-5 flex items-center justify-between text-left group"
                onClick={() => setExpanded(isOpen ? null : s.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl shrink-0">
                    {s.icon}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-bold text-white group-hover:text-[var(--blue)] transition">{s.title}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${s.tagColor}`}>{s.tag}</span>
                      <span className={`text-[10px] font-bold ${DIFFICULTY_COLORS[s.difficulty]}`}>{s.difficulty}</span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1">{s.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <div className="text-right hidden md:block">
                    <div className="text-[10px] text-gray-600">Acurácia</div>
                    <div className="text-sm font-bold text-[var(--green)]">{s.accuracy}</div>
                  </div>
                  {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 border-t border-white/5 mt-0 pt-5 space-y-4">
                  <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-[var(--blue)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Brain size={12} /> Lógica
                      </h4>
                      <ul className="space-y-1.5">
                        {s.logic.map((l, i) => (
                          <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                            <span className="text-[var(--blue)] font-mono shrink-0">{i + 1}.</span> {l}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--green)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <CheckIcon /> Condições ideais
                      </h4>
                      <ul className="space-y-1.5">
                        {s.conditions.map((c, i) => (
                          <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                            <span className="text-[var(--green)] shrink-0">✓</span> {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--red)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Shield size={12} /> Evitar quando
                      </h4>
                      <ul className="space-y-1.5">
                        {s.avoid.map((a, i) => (
                          <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                            <span className="text-[var(--red)] shrink-0">✗</span> {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CheckIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
}
