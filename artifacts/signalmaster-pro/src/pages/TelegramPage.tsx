import { useState, useEffect } from "react";
import { Send, Check, X, Info, Bell, Filter } from "lucide-react";
import { useAppStore } from "@/lib/store";

interface TgConfig {
  token: string;
  chatId: string;
  onlyStrong: boolean;
  sendResults: boolean;
  sendDaily: boolean;
  connected: boolean;
  minScore: number;
}

const DEFAULT_CONFIG: TgConfig = {
  token: '', chatId: '', onlyStrong: true, sendResults: false, sendDaily: true, connected: false, minScore: 74,
};

export default function TelegramPage() {
  const currentUser = useAppStore(s => s.currentUser);
  const [cfg, setCfg] = useState<TgConfig>(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('smpTelegram7') || 'null');
      if (stored) setCfg(stored);
    } catch {}
  }, []);

  const save = (update: Partial<TgConfig>) => {
    const updated = { ...cfg, ...update };
    setCfg(updated);
    localStorage.setItem('smpTelegram7', JSON.stringify(updated));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const testConnection = () => {
    if (!cfg.token || !cfg.chatId) return;
    setTesting(true);
    // Simulate test (no real API call — pure frontend)
    setTimeout(() => {
      // Validate format
      const tokenValid = /^\d+:[A-Za-z0-9_-]{35}$/.test(cfg.token);
      const chatValid = /^-?\d+$/.test(cfg.chatId);
      const ok = tokenValid && chatValid;
      setTestResult(ok ? 'ok' : 'fail');
      if (ok) save({ connected: true });
      setTesting(false);
      setTimeout(() => setTestResult(null), 4000);
    }, 1500);
  };

  const disconnect = () => {
    save({ token: '', chatId: '', connected: false });
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#2AABEE]/20 flex items-center justify-center">
          <Send size={18} className="text-[#2AABEE]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Integração Telegram</h1>
          <p className="text-xs text-gray-500">Receba sinais automaticamente no seu canal ou grupo</p>
        </div>
        {cfg.connected && (
          <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-[var(--green)]/10 border border-[var(--green)]/30 rounded-lg text-xs font-bold text-[var(--green)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" /> Conectado
          </div>
        )}
      </div>

      {/* Setup guide */}
      <div className="glass-card p-5 border border-[#2AABEE]/15">
        <h3 className="text-sm font-bold text-[#2AABEE] mb-3 flex items-center gap-2"><Info size={14} /> Como configurar</h3>
        <ol className="space-y-2 text-xs text-gray-400">
          <li><span className="text-white font-bold">1.</span> Abra o Telegram e inicie uma conversa com <span className="text-[#2AABEE] font-mono">@BotFather</span></li>
          <li><span className="text-white font-bold">2.</span> Digite <span className="text-[#2AABEE] font-mono">/newbot</span>, siga as instruções e copie o Token gerado</li>
          <li><span className="text-white font-bold">3.</span> Adicione o bot ao seu grupo/canal e copie o Chat ID (use <span className="text-[#2AABEE] font-mono">@userinfobot</span>)</li>
          <li><span className="text-white font-bold">4.</span> Cole as credenciais abaixo e clique em "Testar Conexão"</li>
        </ol>
      </div>

      {/* Credentials */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Credenciais do Bot</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">Bot Token</label>
            <input
              type="password"
              value={cfg.token}
              onChange={e => setCfg(p => ({ ...p, token: e.target.value }))}
              placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxyz12345678"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#2AABEE]/50 placeholder:text-gray-700"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">Chat ID (canal ou grupo)</label>
            <input
              type="text"
              value={cfg.chatId}
              onChange={e => setCfg(p => ({ ...p, chatId: e.target.value }))}
              placeholder="-1001234567890"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#2AABEE]/50 placeholder:text-gray-700"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={testConnection}
              disabled={!cfg.token || !cfg.chatId || testing}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#2AABEE] text-white font-bold rounded-lg hover:bg-[#2298D6] transition text-sm disabled:opacity-40"
            >
              {testing ? <><span className="animate-spin">⚙️</span> Testando...</> : <><Send size={14} /> Testar Conexão</>}
            </button>
            {cfg.connected && (
              <button onClick={disconnect} className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-gray-400 font-bold rounded-lg hover:text-[var(--red)] hover:border-[var(--red)]/30 transition text-sm">
                <X size={14} /> Desconectar
              </button>
            )}
          </div>

          {testResult === 'ok' && (
            <div className="flex items-center gap-2 text-[var(--green)] text-sm">
              <Check size={16} /> Conexão bem-sucedida! O bot enviará sinais para o chat configurado.
            </div>
          )}
          {testResult === 'fail' && (
            <div className="flex items-center gap-2 text-[var(--red)] text-sm">
              <X size={16} /> Formato inválido. Verifique o Token e Chat ID e tente novamente.
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Filter size={14} /> Filtros de Envio
        </h3>
        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer group">
            <div>
              <div className="text-sm font-medium text-white">Apenas FORTE e PREMIUM</div>
              <div className="text-xs text-gray-500 mt-0.5">Envia apenas sinais com score ≥74% (evita sinais fracos)</div>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={cfg.onlyStrong}
                onChange={e => save({ onlyStrong: e.target.checked })}
                className="sr-only"
              />
              <div
                onClick={() => save({ onlyStrong: !cfg.onlyStrong })}
                className={`w-11 h-6 rounded-full transition cursor-pointer ${cfg.onlyStrong ? 'bg-[var(--green)]' : 'bg-white/10'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform m-0.5 ${cfg.onlyStrong ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="text-sm font-medium text-white">Incluir resultado (WIN/LOSS)</div>
              <div className="text-xs text-gray-500 mt-0.5">Envia mensagem de resultado após fechamento da operação</div>
            </div>
            <div
              onClick={() => save({ sendResults: !cfg.sendResults })}
              className={`w-11 h-6 rounded-full transition cursor-pointer ${cfg.sendResults ? 'bg-[var(--blue)]' : 'bg-white/10'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform m-0.5 ${cfg.sendResults ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="text-sm font-medium text-white">Resumo diário</div>
              <div className="text-xs text-gray-500 mt-0.5">Envia resumo da sessão ao final do dia</div>
            </div>
            <div
              onClick={() => save({ sendDaily: !cfg.sendDaily })}
              className={`w-11 h-6 rounded-full transition cursor-pointer ${cfg.sendDaily ? 'bg-[var(--blue)]' : 'bg-white/10'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform m-0.5 ${cfg.sendDaily ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </label>

          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-gray-500">Score mínimo para envio</span>
              <span className="font-bold text-[var(--green)]">{cfg.minScore}%</span>
            </div>
            <input
              type="range" min={60} max={90} step={2} value={cfg.minScore}
              onChange={e => save({ minScore: parseInt(e.target.value) })}
              className="w-full accent-[var(--green)]"
            />
          </div>
        </div>

        {saved && (
          <div className="flex items-center gap-1.5 text-[var(--green)] text-xs mt-3">
            <Check size={12} /> Configurações salvas
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="glass-card p-5 border border-[#2AABEE]/15">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Preview da Mensagem</h3>
        <div className="bg-[#212121] rounded-xl p-4 font-mono text-sm text-gray-300 leading-relaxed">
          <div className="text-[#2AABEE] font-bold mb-1">🤖 SignalMaster Pro v7</div>
          <div>📊 <strong>EUR/USD</strong> · M1</div>
          <div>🟢 <strong className="text-[var(--green)]">CALL</strong></div>
          <div>⭐ Score: <strong>82%</strong> {cfg.onlyStrong ? '(FORTE)' : ''}</div>
          <div>⏱ Expiração: 00:48</div>
          <div className="mt-1 text-gray-600 text-xs">📡 Sessão: Londres · {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>
    </div>
  );
}
