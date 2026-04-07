import { useState, useEffect } from "react";
import { FileText, Download, FileSpreadsheet, AlertCircle, Brain, BarChart2, CheckCircle } from "lucide-react";

interface HistEntry {
  ts: number;
  result: 'win' | 'loss';
  asset?: string;
  category?: string;
  sess?: string;
  direction?: string;
  score?: number;
}

export default function ReportsPage() {
  const [hist, setHist] = useState<HistEntry[]>([]);
  const [lossAnalysis, setLossAnalysis] = useState<string[] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    try { setHist(JSON.parse(localStorage.getItem('smpH7') || '[]')); } catch {}
  }, []);

  const downloadCSV = () => {
    if (hist.length === 0) return;
    const header = 'Data,Hora,Ativo,Categoria,Sessão,Direção,Score,Resultado';
    const rows = hist.map(h => {
      const d = new Date(h.ts);
      return [
        d.toLocaleDateString('pt-BR'),
        d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        h.asset || '',
        h.category || '',
        h.sess || '',
        h.direction || '',
        h.score ? `${h.score}%` : '',
        h.result === 'win' ? 'WIN' : 'LOSS',
      ].join(',');
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `signalmaster_historico_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const downloadJSON = () => {
    if (hist.length === 0) return;
    const blob = new Blob([JSON.stringify(hist, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `signalmaster_historico_${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const analyzeLosses = () => {
    setAnalyzing(true);
    setTimeout(() => {
      const losses = hist.filter(h => h.result === 'loss').slice(-20);
      if (losses.length < 3) {
        setLossAnalysis(['Poucos dados de LOSS para análise (mínimo 3). Continue operando e registrando resultados.']);
        setAnalyzing(false); return;
      }

      const patterns: string[] = [];

      // Session analysis
      const sesCount: Record<string, number> = {};
      losses.forEach(h => { if (h.sess) sesCount[h.sess] = (sesCount[h.sess] || 0) + 1; });
      const worstSess = Object.entries(sesCount).sort(([, a], [, b]) => b - a)[0];
      if (worstSess && worstSess[1] >= 2) {
        const labels: Record<string, string> = { london: 'Londres', overlap: 'Overlap NY/Londres', ny: 'Nova York', asia: 'Ásia' };
        patterns.push(`🕐 ${Math.round((worstSess[1] / losses.length) * 100)}% dos seus losses ocorreram na sessão de ${labels[worstSess[0]] || worstSess[0]}. Considere evitar essa janela.`);
      }

      // Asset analysis
      const assetCount: Record<string, number> = {};
      losses.forEach(h => { if (h.asset) assetCount[h.asset] = (assetCount[h.asset] || 0) + 1; });
      const worstAsset = Object.entries(assetCount).sort(([, a], [, b]) => b - a)[0];
      if (worstAsset && worstAsset[1] >= 2) {
        patterns.push(`📊 O ativo ${worstAsset[0]} acumula ${worstAsset[1]} dos seus últimos losses. Reavalie se está operando no momento ideal para esse par.`);
      }

      // Direction bias
      const callLosses = losses.filter(h => h.direction === 'CALL').length;
      const putLosses = losses.filter(h => h.direction === 'PUT').length;
      if (callLosses > putLosses * 2) patterns.push('⬆️ Seus losses estão concentrados em sinais de CALL. O mercado pode estar em tendência de baixa ou você pode estar contra-tendência.');
      if (putLosses > callLosses * 2) patterns.push('⬇️ Seus losses estão concentrados em sinais de PUT. Verifique se está operando contra a tendência atual.');

      // Low score signals
      const lowScore = losses.filter(h => h.score && h.score < 68).length;
      if (lowScore >= 2) patterns.push(`⚠️ ${lowScore} losses vieram de sinais com score abaixo de 68%. Tente operar apenas FORTE (≥74%) e PREMIUM (≥82%) para melhorar sua assertividade.`);

      // Consecutive losses time pattern
      const hour = losses.map(h => new Date(h.ts).getHours());
      const hourCount: Record<number, number> = {};
      hour.forEach(h => { hourCount[h] = (hourCount[h] || 0) + 1; });
      const worstHour = Object.entries(hourCount).sort(([, a], [, b]) => b - a)[0];
      if (worstHour && parseInt(worstHour[1] as any) >= 2) {
        patterns.push(`⏰ Atenção ao horário das ${worstHour[0]}h: é quando você acumula mais losses. Evite operar nessa faixa horária.`);
      }

      if (patterns.length === 0) patterns.push('✅ Análise dos últimos losses não revelou padrões consistentes. Seus losses parecem distribuídos aleatoriamente, o que é esperado em uma estratégia saudável. Continue mantendo o risco controlado.');

      setLossAnalysis(patterns);
      setAnalyzing(false);
    }, 1500);
  };

  const wins = hist.filter(h => h.result === 'win').length;
  const losses = hist.filter(h => h.result === 'loss').length;
  const wr = hist.length > 0 ? Math.round((wins / hist.length) * 100) : 0;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <FileText className="text-[var(--blue)]" /> Relatórios & Exportação
      </h1>

      {/* Stats */}
      {hist.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="glass-card p-4 text-center"><div className="text-xs text-gray-500 mb-1">Total</div><div className="text-2xl font-black text-white">{hist.length}</div></div>
          <div className="glass-card p-4 text-center"><div className="text-xs text-gray-500 mb-1">WR</div><div className={`text-2xl font-black ${wr >= 65 ? 'text-[var(--green)]' : 'text-yellow-400'}`}>{wr}%</div></div>
          <div className="glass-card p-4 text-center"><div className="text-xs text-gray-500 mb-1">Período</div><div className="text-xs font-bold text-white mt-1">{new Date(Math.min(...hist.map(h => h.ts))).toLocaleDateString('pt-BR')} – hoje</div></div>
        </div>
      )}

      {/* Export options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div
          onClick={downloadCSV}
          className={`glass-card p-6 border border-[var(--green)]/20 hover:border-[var(--green)]/50 transition group cursor-pointer ${hist.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <div className="w-12 h-12 bg-[var(--green)]/15 rounded-xl flex items-center justify-center text-[var(--green)] mb-4 group-hover:scale-110 transition-transform">
            <FileSpreadsheet size={24} />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Histórico CSV</h2>
          <p className="text-sm text-gray-400 mb-4">Planilha com todas as operações: data, ativo, sessão, direção, score e resultado. Compatível com Excel e Google Sheets.</p>
          <div className="flex items-center gap-2 text-[var(--green)] font-bold text-sm">
            <Download size={16} /> Baixar CSV {hist.length > 0 && `(${hist.length} operações)`}
          </div>
        </div>

        <div
          onClick={downloadJSON}
          className={`glass-card p-6 border border-[var(--blue)]/20 hover:border-[var(--blue)]/50 transition group cursor-pointer ${hist.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <div className="w-12 h-12 bg-[var(--blue)]/15 rounded-xl flex items-center justify-center text-[var(--blue)] mb-4 group-hover:scale-110 transition-transform">
            <FileText size={24} />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Histórico JSON</h2>
          <p className="text-sm text-gray-400 mb-4">Exportação completa em JSON com todos os metadados. Útil para backup, migração ou análise avançada em ferramentas externas.</p>
          <div className="flex items-center gap-2 text-[var(--blue)] font-bold text-sm">
            <Download size={16} /> Baixar JSON
          </div>
        </div>
      </div>

      {/* Loss Analysis */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <Brain size={18} className="text-purple-400" /> Análise de Losses com IA
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          O motor de IA analisa seus {losses} losses recentes para encontrar padrões de horário, ativo, direção e score. Identifique o que está causando suas perdas.
        </p>
        <button
          onClick={analyzeLosses}
          disabled={losses < 3 || analyzing}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/20 border border-purple-500/30 text-purple-400 font-bold rounded-lg hover:bg-purple-500/30 transition text-sm disabled:opacity-40 mb-4"
        >
          {analyzing ? (
            <><span className="animate-spin">⚙️</span> Analisando padrões...</>
          ) : (
            <><Brain size={14} /> Analisar Últimos {Math.min(20, losses)} Losses</>
          )}
        </button>

        {lossAnalysis && (
          <div className="space-y-2.5">
            {lossAnalysis.map((insight, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-white/3 border border-white/5 rounded-xl text-sm text-gray-300 leading-relaxed">
                <span className="shrink-0 text-base">{insight.slice(0, 2)}</span>
                <span>{insight.slice(2)}</span>
              </div>
            ))}
          </div>
        )}

        {losses < 3 && (
          <div className="flex items-center gap-2 text-xs text-gray-600 mt-2">
            <AlertCircle size={13} /> Registre pelo menos 3 losses para habilitar a análise
          </div>
        )}
      </div>

      {/* Quick summary table */}
      {hist.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <BarChart2 size={14} className="text-[var(--green)]" /> Resumo por Categoria
          </h3>
          {(['forex', 'crypto', 'commodity'] as const).map(cat => {
            const catHist = hist.filter(h => h.category === cat);
            const catWins = catHist.filter(h => h.result === 'win').length;
            const catWR = catHist.length > 0 ? Math.round((catWins / catHist.length) * 100) : 0;
            if (catHist.length === 0) return null;
            return (
              <div key={cat} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 text-sm">
                <span className="text-gray-400 capitalize">{cat === 'forex' ? '💱 Forex' : cat === 'crypto' ? '₿ Crypto' : '🏅 Commodity'}</span>
                <div className="flex items-center gap-6">
                  <span className="text-gray-600 text-xs">{catHist.length} ops</span>
                  <span className={`font-bold ${catWR >= 65 ? 'text-[var(--green)]' : 'text-yellow-400'}`}>{catWR}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
