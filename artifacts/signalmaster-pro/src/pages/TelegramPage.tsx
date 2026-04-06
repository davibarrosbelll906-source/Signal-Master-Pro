import { Send } from "lucide-react";

export default function TelegramPage() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#2AABEE] flex items-center justify-center text-white">
          <Send size={20} className="-ml-1" />
        </div>
        <h1 className="text-2xl font-bold text-white">Integração Telegram</h1>
      </div>

      <div className="glass-card p-8">
        <p className="text-gray-400 mb-6">Conecte o SignalMaster Pro ao seu canal ou grupo do Telegram para receber os sinais automaticamente.</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Bot Token</label>
            <input type="password" placeholder="123456789:ABCdefGHIjklMNO..." className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-[#2AABEE] focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Chat ID</label>
            <input type="text" placeholder="-1001234567890" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-[#2AABEE] focus:outline-none" />
          </div>
          
          <div className="pt-4 border-t border-white/10 mt-6">
            <h3 className="font-bold text-white mb-3">Filtros de Envio</h3>
            <label className="flex items-center gap-3 text-gray-300 cursor-pointer mb-2">
              <input type="checkbox" defaultChecked className="rounded bg-white/5 border-white/10 text-[#2AABEE]" />
              Enviar apenas sinais FORTE e PREMIUM
            </label>
            <label className="flex items-center gap-3 text-gray-300 cursor-pointer">
              <input type="checkbox" className="rounded bg-white/5 border-white/10 text-[#2AABEE]" />
              Incluir resultado (WIN/LOSS) após fechamento
            </label>
          </div>

          <button className="w-full bg-[#2AABEE] text-white font-bold py-3 rounded-lg hover:bg-[#2298D6] transition mt-6">
            Testar Conexão
          </button>
        </div>
      </div>
    </div>
  );
}
