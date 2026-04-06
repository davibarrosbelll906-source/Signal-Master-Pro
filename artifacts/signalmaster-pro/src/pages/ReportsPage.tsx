import { FileText, Download, FileSpreadsheet } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white">Relatórios & Exportação</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 border-[var(--blue)]/20 hover:border-[var(--blue)]/50 transition group cursor-pointer">
          <div className="w-12 h-12 bg-[var(--blue)]/20 rounded-lg flex items-center justify-center text-[var(--blue)] mb-4 group-hover:scale-110 transition-transform">
            <FileText size={24} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Relatório Completo (PDF)</h2>
          <p className="text-sm text-gray-400 mb-6">Gera um PDF detalhado com gráficos, histórico de operações e análise de performance por categoria e sessão.</p>
          <button className="flex items-center gap-2 text-[var(--blue)] font-bold text-sm">
            <Download size={16} /> Gerar PDF
          </button>
        </div>

        <div className="glass-card p-6 border-[var(--green)]/20 hover:border-[var(--green)]/50 transition group cursor-pointer">
          <div className="w-12 h-12 bg-[var(--green)]/20 rounded-lg flex items-center justify-center text-[var(--green)] mb-4 group-hover:scale-110 transition-transform">
            <FileSpreadsheet size={24} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Histórico Bruto (Excel)</h2>
          <p className="text-sm text-gray-400 mb-6">Planilha contendo todos os dados brutos de operações para análise em ferramentas externas ou contabilidade.</p>
          <button className="flex items-center gap-2 text-[var(--green)] font-bold text-sm">
            <Download size={16} /> Baixar .XLSX
          </button>
        </div>
      </div>

      <div className="glass-card p-6 mt-8">
        <h3 className="text-lg font-bold text-white mb-4">Relatório "Por que perdemos?"</h3>
        <p className="text-sm text-gray-400 mb-4">
          A Inteligência Artificial do SignalMaster analisa seus LOSS recentes para encontrar padrões. 
          Isso ajuda a entender se o problema foi o mercado, o horário ou a estratégia.
        </p>
        <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded font-medium text-sm transition">
          Analisar Últimos 10 LOSS
        </button>
      </div>
    </div>
  );
}
