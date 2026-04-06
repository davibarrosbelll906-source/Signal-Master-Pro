import { Link } from "wouter";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-[#07070d] flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Recuperar Senha</h1>
        <p className="text-gray-400 mb-6">Insira seu e-mail para receber um link de redefinição.</p>
        <input 
          type="email" 
          placeholder="Seu e-mail" 
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--green)] mb-4"
        />
        <button className="w-full bg-[var(--green)] text-black font-bold rounded-lg px-4 py-3 hover:bg-[var(--green-dark)] transition mb-4">
          Enviar Link
        </button>
        <Link href="/login" className="text-sm text-gray-400 hover:text-white transition">
          Voltar para o Login
        </Link>
      </div>
    </div>
  );
}
