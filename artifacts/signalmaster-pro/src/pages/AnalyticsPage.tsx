export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Analytics</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 h-64 flex items-center justify-center text-gray-500">
          Gráfico: Win Rate por Sessão
        </div>
        <div className="glass-card p-6 h-64 flex items-center justify-center text-gray-500">
          Gráfico: Evolução de Patrimônio
        </div>
        <div className="glass-card p-6 h-64 flex items-center justify-center text-gray-500">
          Gráfico: Assertividade por Categoria
        </div>
        <div className="glass-card p-6 h-64 flex items-center justify-center text-gray-500">
          Gráfico: Ranking de Indicadores
        </div>
      </div>
    </div>
  );
}
