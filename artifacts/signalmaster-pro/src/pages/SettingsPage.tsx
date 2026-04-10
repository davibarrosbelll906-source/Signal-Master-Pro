import { useState, useEffect } from "react";
import { Save, Bell, Shield, Palette, Sliders, RotateCcw, CheckCircle } from "lucide-react";
import { applyTheme, type AppTheme } from "@/App";
import { PinSetup } from "@/components/PinLock";

interface Config {
  minScore: number;
  forteOnly: boolean;
  lunaMode: boolean;
  soundEnabled: boolean;
  soundOnlyStrong: boolean;
  vibrateEnabled: boolean;
  showLowQuality: boolean;
  alertSeconds: number;
  theme: string;
  currencySymbol: string;
  riskPerTrade: number;
  initialBank: number;
  maxDailyLoss: number;
  maxDailyOps: number;
  showVolume: boolean;
  showEntropy: boolean;
  showMMTrap: boolean;
  showDNA: boolean;
}

const DEFAULTS: Config = {
  minScore: 77,
  forteOnly: true,
  lunaMode: false,
  soundEnabled: true,
  soundOnlyStrong: true,
  vibrateEnabled: true,
  showLowQuality: false,
  alertSeconds: 48,
  theme: 'dark-green',
  currencySymbol: 'R$',
  riskPerTrade: 2,
  initialBank: 1000,
  maxDailyLoss: 10,
  maxDailyOps: 20,
  showVolume: true,
  showEntropy: true,
  showMMTrap: true,
  showDNA: true,
};

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-[var(--green)]' : 'bg-white/20'}`}
    >
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-5 flex items-center gap-2">
        <span className="text-[var(--green)]">{icon}</span>
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium text-white">{label}</div>
        {desc && <div className="text-xs text-gray-500 mt-0.5">{desc}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const [cfg, setCfg] = useState<Config>(DEFAULTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('smpCfg7') || '{}');
      setCfg({ ...DEFAULTS, ...stored });
    } catch {}
  }, []);

  const set = <K extends keyof Config>(key: K, value: Config[K]) =>
    setCfg(prev => ({ ...prev, [key]: value }));

  const save = () => {
    localStorage.setItem('smpCfg7', JSON.stringify(cfg));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const reset = () => {
    setCfg(DEFAULTS);
    localStorage.setItem('smpCfg7', JSON.stringify(DEFAULTS));
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
        <div className="flex gap-2">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 text-sm text-gray-400 transition"
          >
            <RotateCcw size={14} /> Padrão
          </button>
          <button
            onClick={save}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--green)] text-black font-bold rounded-lg hover:bg-[var(--green-dark)] transition text-sm"
          >
            {saved ? <><CheckCircle size={14} /> Salvo!</> : <><Save size={14} /> Salvar</>}
          </button>
        </div>
      </div>

      {/* Filtro de Sinais */}
      <Section title="Filtro de Sinais" icon={<Sliders size={14} />}>
        <Row label="Score Mínimo" desc={`Apenas sinais com score ≥ ${cfg.minScore}% serão emitidos`}>
          <div className="flex items-center gap-3">
            <input
              type="range" min={40} max={90} value={cfg.minScore}
              onChange={e => set('minScore', parseInt(e.target.value))}
              className="w-24 accent-[var(--green)]"
            />
            <span className="w-10 text-right text-sm font-mono text-[var(--green)]">{cfg.minScore}%</span>
          </div>
        </Row>

        <Row label="Apenas FORTE e PREMIUM" desc="Bloqueia sinais de qualidade MÉDIO e abaixo">
          <Toggle value={cfg.forteOnly} onChange={v => set('forteOnly', v)} />
        </Row>

        <Row
          label="Luna Mode S/R Forte"
          desc="Emite sinal APENAS em zona S/R forte (≥3 toques) + tendência alinhada + wick de rejeição"
        >
          <div className="flex items-center gap-2">
            {cfg.lunaMode && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                🌙 ATIVO
              </span>
            )}
            <Toggle value={cfg.lunaMode} onChange={v => set('lunaMode', v)} />
          </div>
        </Row>

        <Row label="Exibir sinais de baixa qualidade" desc="Mostrar FRACO e EVITAR (apenas informativo)">
          <Toggle value={cfg.showLowQuality} onChange={v => set('showLowQuality', v)} />
        </Row>

        <Row label="Segundo do sinal (padrão: 48)" desc="Motor calcula neste segundo de cada minuto">
          <div className="flex items-center gap-3">
            <input
              type="range" min={30} max={55} value={cfg.alertSeconds}
              onChange={e => set('alertSeconds', parseInt(e.target.value))}
              className="w-24 accent-[var(--blue)]"
            />
            <span className="w-6 text-right text-sm font-mono text-[var(--blue)]">{cfg.alertSeconds}s</span>
          </div>
        </Row>
      </Section>

      {/* Alertas */}
      <Section title="Alertas e Notificações" icon={<Bell size={14} />}>
        <Row label="Sons habilitados" desc="Emitir som ao receber novos sinais">
          <Toggle value={cfg.soundEnabled} onChange={v => set('soundEnabled', v)} />
        </Row>

        <Row label="Som apenas em FORTE/PREMIUM" desc="Silencia alertas de sinais médios e fracos">
          <Toggle value={cfg.soundOnlyStrong} onChange={v => set('soundOnlyStrong', v)} />
        </Row>

        <Row label="Vibração (mobile)" desc="Vibrar ao receber sinal de alta qualidade">
          <Toggle value={cfg.vibrateEnabled} onChange={v => set('vibrateEnabled', v)} />
        </Row>
      </Section>

      {/* Gestão de Risco */}
      <Section title="Gestão de Risco" icon={<Shield size={14} />}>
        <Row label="Banca inicial" desc="Valor de referência para cálculos de risco">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{cfg.currencySymbol}</span>
            <input
              type="number" value={cfg.initialBank} min={100} max={100000}
              onChange={e => set('initialBank', parseFloat(e.target.value))}
              className="w-28 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white text-right"
            />
          </div>
        </Row>

        <Row label="Risco por operação" desc="% da banca a arriscar por entrada">
          <div className="flex items-center gap-3">
            <input
              type="range" min={0.5} max={10} step={0.5} value={cfg.riskPerTrade}
              onChange={e => set('riskPerTrade', parseFloat(e.target.value))}
              className="w-24 accent-[var(--red)]"
            />
            <span className="w-10 text-right text-sm font-mono text-[var(--red)]">{cfg.riskPerTrade}%</span>
          </div>
        </Row>

        <Row label="Stop diário (% de perda)" desc="Parar de operar ao atingir esta perda no dia">
          <div className="flex items-center gap-3">
            <input
              type="range" min={5} max={30} value={cfg.maxDailyLoss}
              onChange={e => set('maxDailyLoss', parseInt(e.target.value))}
              className="w-24 accent-[var(--red)]"
            />
            <span className="w-10 text-right text-sm font-mono text-[var(--red)]">{cfg.maxDailyLoss}%</span>
          </div>
        </Row>

        <Row label="Máximo de operações/dia" desc="Limite de sinais acompanhados por dia">
          <div className="flex items-center gap-3">
            <input
              type="range" min={5} max={50} value={cfg.maxDailyOps}
              onChange={e => set('maxDailyOps', parseInt(e.target.value))}
              className="w-24 accent-[var(--blue)]"
            />
            <span className="w-10 text-right text-sm font-mono text-white">{cfg.maxDailyOps}</span>
          </div>
        </Row>

        <Row label="Moeda" desc="Símbolo monetário para exibição">
          <select
            value={cfg.currencySymbol}
            onChange={e => set('currencySymbol', e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
          >
            {['R$', 'US$', '€', '£', '¥'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Row>
      </Section>

      {/* TEMAS VISUAIS */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-5 flex items-center gap-2">
          <span className="text-[var(--green)]"><Palette size={14} /></span>
          Tema Visual
        </h3>
        {(() => {
          const themes: { id: AppTheme; label: string; primary: string; bg: string; desc: string }[] = [
            { id: 'midnight',  label: 'Midnight',  primary: '#00ff88', bg: '#07070d', desc: 'Verde neon clássico' },
            { id: 'lava',      label: 'Lava',      primary: '#ff4422', bg: '#0d0700', desc: 'Vermelho magma' },
            { id: 'ocean',     label: 'Ocean',     primary: '#00d4ff', bg: '#00070d', desc: 'Ciano marinho' },
            { id: 'matrix',    label: 'Matrix',    primary: '#00ff41', bg: '#000300', desc: 'Verde terminal' },
            { id: 'gold',      label: 'Gold',      primary: '#ffd700', bg: '#0a0800', desc: 'Âmbar premium' },
            { id: 'neon-void', label: 'Neon Void', primary: '#bf00ff', bg: '#06000d', desc: 'Roxo cyberpunk' },
          ];
          const [activeTheme, setActiveTheme] = useState<AppTheme>(
            () => (localStorage.getItem('smpTheme') as AppTheme) || 'midnight'
          );
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {themes.map(t => (
                <button
                  key={t.id}
                  onClick={() => { applyTheme(t.id); setActiveTheme(t.id); }}
                  className={`relative p-4 rounded-2xl border-2 transition-all duration-200 text-left group hover:scale-[1.02] active:scale-[0.98] ${
                    activeTheme === t.id
                      ? 'border-[var(--green)] shadow-lg shadow-[var(--green)]/20'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                  style={{ background: t.bg }}
                >
                  {activeTheme === t.id && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                      style={{ background: t.primary, color: '#000' }}>✓</div>
                  )}
                  <div className="w-8 h-8 rounded-full mb-3 shadow-lg" style={{ background: t.primary, boxShadow: `0 0 12px ${t.primary}60` }} />
                  <div className="text-sm font-black text-white">{t.label}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Exibição */}
      <Section title="Exibição do Painel" icon={<Palette size={14} />}>
        <Row label="Mostrar volume" desc="Exibir dados de volume nos sinais"><Toggle value={cfg.showVolume} onChange={v => set('showVolume', v)} /></Row>
        <Row label="Mostrar Entropia Shannon" desc="Índice de aleatoriedade do mercado"><Toggle value={cfg.showEntropy} onChange={v => set('showEntropy', v)} /></Row>
        <Row label="Mostrar detector MM Trap" desc="Alerta de armadilha do formador de mercado"><Toggle value={cfg.showMMTrap} onChange={v => set('showMMTrap', v)} /></Row>
        <Row label="Mostrar DNA de Candle" desc="Fingerprint e histórico de padrões"><Toggle value={cfg.showDNA} onChange={v => set('showDNA', v)} /></Row>
      </Section>

      {/* PIN Security */}
      <Section title="Segurança" icon={<Shield size={14} />}>
        <div className="text-xs text-gray-500 mb-3">Configure um PIN para bloquear automaticamente o app após 5 minutos de inatividade.</div>
        <PinSetup onClose={() => {}} />
      </Section>

      {/* Reset dados */}
      <div className="glass-card p-6 border border-[var(--red)]/20">
        <h3 className="text-sm font-bold text-[var(--red)] uppercase tracking-wider mb-4">Zona de Perigo</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white font-medium">Limpar histórico de sinais</div>
              <div className="text-xs text-gray-500">Remove todos os WINs/LOSSes registrados</div>
            </div>
            <button
              onClick={() => { if (confirm('Tem certeza? Esta ação não pode ser desfeita.')) { localStorage.removeItem('smpH7'); } }}
              className="px-3 py-1.5 bg-[var(--red)]/10 text-[var(--red)] border border-[var(--red)]/30 rounded-lg text-xs font-bold hover:bg-[var(--red)]/20 transition"
            >
              Limpar
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white font-medium">Resetar ML Weights</div>
              <div className="text-xs text-gray-500">Remove o aprendizado de indicadores</div>
            </div>
            <button
              onClick={() => { if (confirm('Tem certeza?')) { localStorage.removeItem('smpML7'); } }}
              className="px-3 py-1.5 bg-[var(--red)]/10 text-[var(--red)] border border-[var(--red)]/30 rounded-lg text-xs font-bold hover:bg-[var(--red)]/20 transition"
            >
              Resetar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
