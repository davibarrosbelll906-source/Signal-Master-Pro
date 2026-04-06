# PROMPT COMPLETO — SignalMaster Pro v7 Ultimate
## Para usar no Lovable.dev
---

## VISÃO GERAL DO PROJETO

Crie um aplicativo web profissional chamado **SignalMaster Pro v7 Ultimate** — plataforma premium de sinais de trading para opções binárias com Forex, Criptomoedas e Commodities. Visual dark mode ultra-moderno, motor de sinais com IA adaptativa, ferramentas inovadoras de assertividade e experiência mobile-first. 100% frontend com localStorage. Pagamentos via Kiwify (externo).

---

## IDENTIDADE VISUAL & DESIGN SYSTEM

### Paleta de Cores Completa (CSS Variables)
```css
:root {
  /* Primárias */
  --green:         #00ff88;
  --green-glow:    rgba(0,255,136,0.15);
  --green-dark:    #00cc6a;
  --blue:          #4488ff;
  --blue-glow:     rgba(68,136,255,0.15);
  --purple:        #aa44ff;
  --purple-glow:   rgba(170,68,255,0.15);
  --orange:        #f7931a;
  --orange-glow:   rgba(247,147,26,0.15);

  /* Status */
  --red:           #ff4466;
  --yellow:        #ffcc00;
  --gold:          #ffd700;

  /* Fundos em camadas */
  --bg-0:  #07070d;
  --bg-1:  #0e0e18;
  --bg-2:  #16161e;
  --bg-3:  #1e1e2a;
  --bg-4:  #262636;

  /* Textos */
  --text-1: #ffffff;
  --text-2: #b0b0c8;
  --text-3: #606078;
  --text-4: #404055;
}
```

### Tipografia
- **Fonte:** Inter (Google Fonts)
- **Display (scores grandes):** 72px, weight 800, letter-spacing -2px
- **H1 (títulos):** 28px, weight 700, letter-spacing -0.5px
- **H2 (subtítulos):** 18px, weight 600
- **Body:** 14px, weight 400, line-height 1.6
- **Caption (badges/labels):** 11px, weight 500, letter-spacing 0.5px, uppercase
- Números importantes: fonte monospace para não "pular" ao atualizar

### Glassmorphism — Padrão de Todos os Cards
```css
.card {
  background: rgba(255,255,255,0.03);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 8px 32px rgba(0,0,0,0.4),
              inset 0 1px 0 rgba(255,255,255,0.05);
  border-radius: 16px;
}
```

### Efeitos Visuais Globais
- **Fundo da página:** gradiente radial duplo + textura de grade ultra-sutil
```css
body {
  background:
    radial-gradient(ellipse at 20% 50%, rgba(68,136,255,0.05) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(170,68,255,0.05) 0%, transparent 50%),
    #07070d;
}
```
- **Títulos principais:** gradiente animado: `linear-gradient(135deg, #00ff88, #4488ff)`
- **Sombras coloridas por estado:** BUY → sombra verde, SELL → sombra vermelha, PREMIUM → sombra dourada
- **Hover 3D nos cards:** leve inclinação 3D responsiva ao mouse com `perspective(1000px)`
- **Scrollbar personalizada:** fina (6px), arredondada, cor primária
- **Seleção de texto:** `::selection { background: rgba(0,255,136,0.3) }`
- **Focus rings:** cor da marca com glow sutil em todos os inputs

### Animações Obrigatórias
```css
/* Entrada de cards em cascata */
@keyframes cardEnter {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
/* card 1: delay 0ms, card 2: 80ms, card 3: 160ms... */

/* Pulso do sinal ativo */
@keyframes signalPulse {
  0%,100% { box-shadow: 0 0 20px rgba(0,255,136,0.2); }
  50%      { box-shadow: 0 0 40px rgba(0,255,136,0.5); }
}

/* Shimmer nas barras de progresso */
@keyframes shimmer {
  from { background-position: -200% center; }
  to   { background-position: 200% center; }
}

/* Score estilo slot machine */
@keyframes scoreReveal {
  0%   { transform: translateY(-100%); opacity: 0; }
  100% { transform: translateY(0);     opacity: 1; }
}
```

- **CountUp:** todos os números animam do zero ao valor real ao carregar
- **Flip counter:** WIN/LOSS incrementa com animação de virada (estilo placar de aeroporto)
- **Transição de abas:** conteúdo antigo desliza para esquerda, novo entra pela direita
- **Score reveal:** gira como slot machine por 0.8s antes de mostrar o valor
- **Loading skeleton:** fantasmas animados dos cards enquanto carrega (não tela em branco)
- **Empty states:** ilustração simples + mensagem quando não há dados

### Temas Visuais (5 Temas)
- 🌑 **Midnight** (padrão): fundo #07070d, destaque verde neon
- 🔥 **Lava**: fundo #0d0705, destaque #ff6622 (laranja/vermelho)
- 🌊 **Ocean**: fundo #050d12, destaque #00ddff (ciano)
- 🌿 **Matrix**: fundo #050d05, destaque #00ff44 (verde terminal)
- 🪙 **Gold** *(exclusivo Premium)*: fundo #0d0a05, destaque #ffd700

### Skin por Plano
- **Básico:** visual padrão
- **Pro:** badge dourado no avatar + borda dourada nos cards
- **Premium:** badge diamante + brilho sutil animado no card do sinal + tema Gold desbloqueado

---

## LANDING PAGE (Pública — Antes do Login)

### Hero Section
- Logo animado do app no centro com efeito de brilho ao entrar
- Título com gradiente animado: **"Sinais Precisos. Operações Vencedoras."**
- Subtítulo: *"Plataforma premium com IA adaptativa, DNA de mercado e ferramentas exclusivas para opções binárias."*
- Dois botões CTA: `[ 🚀 Começar Teste Grátis — 3 Dias ]` e `[ Já tenho conta ]`
- Fundo: partículas animadas simulando candlesticks + grid sutil

### Contador Animado (CountUp ao entrar na viewport)
```
┌────────────────┬──────────────────┬─────────────────┐
│   2.847+       │    76%           │   21            │
│ Sinais/mês     │ Assertividade    │ Pares ativos    │
└────────────────┴──────────────────┴─────────────────┘
```

### Como Funciona (3 passos com ícones animados)
1. 🔐 **Cadastre-se** — 30 segundos, sem cartão
2. 📊 **Escolha seu ativo** — Forex, Cripto ou Commodities
3. ⚡ **Receba o sinal** — opere com confiança e precisão

### Recursos (8 cards com ícones)
- ⚡ Sinais M1 em tempo real
- 🧬 DNA de Candle (exclusivo)
- 🪤 Detector de Armadilha MM
- 🌡️ Entropia de Mercado
- 📊 Assertividade histórica com gauge
- 🔊 Sons diferenciados por ativo
- ₿ Cripto + Forex + Commodities
- 📱 PWA instalável no celular

### Carrossel de Frases Motivacionais (troca a cada 5s, fade)
> *"Consistência é o que transforma um bom trader em um grande trader."*
> *"O mercado recompensa quem tem disciplina e método."*
> *"Não opere com emoção, opere com estratégia."*
> *"Gestão de banca é tão importante quanto o sinal."*
> *"Disciplina hoje, liberdade financeira amanhã."*
> *"O segredo não é prever o mercado, é seguir a estratégia."*
> *"Paciência é a virtude mais lucrativa no trading."*

### Depoimentos (3 cards glassmorphism)
- Avatar com inicial + gradiente único
- Nome parcial, estrelas ⭐⭐⭐⭐⭐, badge do plano, texto

### Planos e Preços — Integração Kiwify
```
┌──────────────┬──────────────────┬─────────────────┐
│  BÁSICO      │  PRO             │  PREMIUM        │
│  R$47/mês    │  R$97/mês        │  R$197/mês      │
│              │  [MAIS POPULAR]  │                 │
│ [Assinar →]  │  [Assinar →]     │  [Assinar →]    │
│ Kiwify link1 │  Kiwify link2    │  Kiwify link3   │
└──────────────┴──────────────────┴─────────────────┘
```
- Cada botão "Assinar" abre o link da Kiwify em nova aba (links configuráveis pelo Admin)
- Badge "✨ MAIS POPULAR" no plano Pro com animação de brilho
- Plano Vitalício: `R$997 — Pagamento único` como card especial abaixo com contador de vagas: "⚡ 8 vagas restantes"

### FAQ em Accordion animado (8 perguntas)
- Como funciona o teste grátis de 3 dias?
- Os sinais funcionam em qual corretora?
- Como funciona o DNA de Candle?
- Os pares cripto funcionam em opções binárias?
- Como é feito o pagamento?
- Como ativar meu acesso após pagar?
- Posso cancelar a qualquer momento?
- Existe app para celular?

### Footer
- Logo + slogan + links legais
- Botão WhatsApp flutuante (canto direito): abre `wa.me/[número]` configurável pelo Admin

---

## AUTENTICAÇÃO

### Tela de Login
**Visual:**
- Fundo: animação de candlesticks ou partículas financeiras
- Card central com glassmorphism real
- Logo animado no topo
- Gradiente radial no background centrado no card

**Campos e comportamentos:**
- E-mail ou usuário + senha com botão olho (mostrar/ocultar)
- Checkbox "Lembrar-me" estilizado
- Indicador de Caps Lock ativo
- Botão login com spinner ao clicar
- Animação shake + mensagem vermelha se credenciais erradas
- Frase motivacional rotativa abaixo do card (troca a cada 6s, fade-in/out)
- Link "Conheça a plataforma" → landing page
- Links "Esqueci minha senha" e "Criar conta grátis"

**Usuários padrão (localStorage):**
| Usuário | Senha | Papel | Plano |
|---|---|---|---|
| admin | admin123 | admin | premium |
| gerente | ger123 | gerente | premium |
| suporte | sup123 | suporte | pro |
| analista | ana123 | analista | pro |
| financeiro | fin123 | financeiro | premium |
| moderador | mod123 | moderador | basico |

---

### Cadastro Multi-Step (3 Etapas)

**Barra de progresso animada:** `●━━●━━●` com labels "Dados / Perfil / Verificação"

**Etapa 1 — Dados Básicos:**
- Nome completo, e-mail (validação em tempo real), usuário (gerado automaticamente, editável)
- Senha com barra de força animada: FRACA 🔴 / MÉDIA 🟡 / FORTE 🟢
- Confirmar senha com validação de igualdade
- Feedback: ✅ campo OK | ❌ campo inválido (em tempo real)

**Etapa 2 — Perfil do Trader:**
- Quiz de perfil de risco (4 perguntas, botões toggle):
  - Quanto você opera por dia? `[ 1-5 ] [ 5-15 ] [ 15+]`
  - Qual seu nível? `[ Iniciante ] [ Intermediário ] [ Avançado ]`
  - Mercado preferido: `[ Forex ] [ Cripto ] [ Ambos ]`
  - Capital médio: `[ Abaixo R$500 ] [ R$500-2000 ] [ Acima R$2000 ]`
- Resultado automático: **Perfil Conservador / Moderado / Agressivo**
- Sugestão automática de risco por operação baseada no perfil
- Pares favoritos (checkboxes com ícones)
- Plano de interesse (pré-selecionado se veio da landing page)

**Etapa 3 — Verificação:**
- 6 campos individuais de 1 dígito (auto-avança ao preencher)
- Código de demo: **123456**
- Temporizador de reenvio: "Reenviar em 60s"
- Checkbox de aceite Termos + Política (obrigatório)
- Botão "Concluir Cadastro"
- Após cadastro: toast de boas-vindas + trial de 3 dias ativado automaticamente

---

### Recuperação de Senha (3 Passos)

**Passo 1:** Informar e-mail → "✉️ Se o e-mail existir, você receberá o código"
**Passo 2:** 6 campos de código (demo: **654321**) + temporizador de reenvio
**Passo 3:** Nova senha com barra de força + confirmar → redireciona para login com sucesso

---

## SISTEMA DE TRIAL — 3 DIAS GRATUITOS

- `trialEndsAt = Date.now() + 3 * 24 * 60 * 60 * 1000` salvo no cadastro
- **Banner no topo do dashboard:**
  - Dia 3: azul → Dia 2: amarelo → Dia 1: vermelho pulsante
  - Countdown em tempo real: "⏳ Teste grátis: 2 dias, 4h e 32min restantes | [🚀 Assinar Agora]"
- **Badge "TRIAL"** no avatar da sidebar
- **Último dia:** modal ao abrir o app com urgência
- **Período de graça pós-trial:** 24h com banner vermelho urgente antes de bloquear
- **Tela de bloqueio:** elegante, não remove o conteúdo (apenas bloqueia interação), exibe os 3 planos com links Kiwify + botão WhatsApp suporte
- **Admins/gerentes:** nunca bloqueiam

---

## SISTEMA DE FRASES MOTIVACIONAIS

Banco de 15+ frases. Aparecem em:
- Landing page: carrossel automático
- Login: abaixo do card, troca a cada 6s
- Dashboard: "Frase do dia" (muda a cada 24h)
- Splash screen de carregamento
- Após WIN: toast verde positivo — *"Excelente! Continue com disciplina!"*
- Após LOSS: toast suave — *"Cada perda é uma lição. O próximo é seu!"*
- Conquista desbloqueada: frase motivacional temática

---

## ESTRUTURA DE NAVEGAÇÃO

### Sidebar Esquerda Colapsável
- Indicador de aba ativa desliza suavemente entre itens (não pisca)
- Avatar do usuário com gradiente único baseado no nome
- Badge do plano (Básico/Pro/Premium/Trial)
- Toggle dark/light no rodapé
- **Separação total Admin/Usuário:** aba Admin invisível para não-admins

### Grupos e Abas

#### 📊 Operações
- ⚡ **Sinais** (principal)
- 📋 **Histórico**
- 📈 **Analytics**
- 🔥 **Heatmap**
- ⚙️ **Backtesting**
- 🏆 **Placar por Ativo**

#### 📚 Gestão
- 📖 **Diário**
- 💰 **Banca**
- 🎯 **Metas**
- ⚠️ **Risco**

#### 📄 Relatórios
- 📄 **Relatórios**
- 📺 **Projetor**
- 📅 **Calendário**

#### 🌐 Sistema
- 💵 **Receita & Planos**
- 👥 **Equipe**
- 🤝 **Afiliados**
- 🏅 **Leaderboard**
- 📚 **Estratégias**
- 🏆 **Conquistas**
- ✉️ **Telegram**
- 🔔 **Notificações**
- 👤 **Meu Perfil**
- ⚙️ **Configurações**
- 🔐 **Admin** *(só admin)*

### Mobile: Bottom Navigation Bar
5 ícones fixos na parte inferior (igual app nativo):
`⚡ Sinais | 📋 Histórico | 📊 Analytics | 🎯 Metas | 👤 Perfil`

---

## ATIVOS DISPONÍVEIS

**Dropdown com 3 abas:** `[ ₿ Cripto ] [ 💱 Forex ] [ 🏅 Commodities ]`

Cada ativo mostra: ícone + nome + variação 24h + badge de volatilidade

```javascript
// Cripto (24h — Alta Volatilidade)
BTC/USD, ETH/USD, SOL/USD, BNB/USD, ADA/USD, DOGE/USD, XRP/USD, LTC/USD

// Forex
EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CAD, NZD/USD, EUR/GBP, GBP/JPY

// Commodities
XAU/USD (Ouro), XAG/USD (Prata), Petróleo WTI

const ASSET_CATEGORIES = {
  BTCUSD:'crypto', ETHUSD:'crypto', SOLUSD:'crypto', BNBUSD:'crypto',
  ADAUSD:'crypto', DOGEUSD:'crypto', XRPUSD:'crypto', LTCUSD:'crypto',
  EURUSD:'forex', GBPUSD:'forex', USDJPY:'forex', AUDUSD:'forex',
  USDCAD:'forex', NZDUSD:'forex', EURGBP:'forex', GBPJPY:'forex',
  XAUUSD:'commodity', XAGUSD:'commodity', USOIL:'commodity'
}
```

---

## ABA: SINAIS (Principal)

### Header de Contexto
- **Session Timer:** relógio em tempo real mostrando sessão ativa + countdown: `🇬🇧 Londres: aberta | ⏱️ NY abre em 2h 14min`
- **Termômetro de Mercado:** 🌡️ `QUENTE (operar) | MORNO (cautela) | FRIO (aguardar)` baseado em ADX + volatilidade + sessão
- **Aviso de Cripto:** banner amarelo quando par cripto selecionado: *"⚡ Alta volatilidade — Recomendamos M5 ou M15"*
- **Melhor janela horária do par** baseada no heatmap histórico

### Painel WIN/LOSS (Topo — Grande e Chamativo)
```
┌────────────────────────────────────────────────────────┐
│   ✅ 23 WINS  │  📊 71% WIN RATE  │  ❌ 9 LOSSES       │
│          🔥 Sequência atual: 3 WINS seguidos           │
│   Hoje: +R$180,50 estimado  │  Total: 847 sinais       │
│   ₿ Cripto: 68%  │  💱 Forex: 74%  │  🏅 Commodities: 71%│
└────────────────────────────────────────────────────────┘
```
- Números com flip counter animado ao atualizar
- Fundo muda: verde >60%, amarelo 50-60%, vermelho <50%
- Win rate separado por categoria

### Painel de Assertividade Histórica (Gauge Animado)
```
┌──────────────────────────────────────────────────────┐
│  🧬 ASSERTIVIDADE HISTÓRICA — BTC/USD M1             │
│                                                      │
│      [Velocímetro SVG semicircular animado]          │
│              73%  🟢 BOA                             │
│                                                      │
│  Base: 1.247 candles  │  Wins: 910  │  Losses: 337  │
│  Melhor sessão: 🇺🇸 NY (78%)                         │
│  Melhor hora: 14h-17h UTC                            │
│                                                      │
│  Por sessão:                                         │
│  🌏 Ásia:     58% ██████░░░░                         │
│  🇬🇧 Londres: 71% ███████░░░                         │
│  🇺🇸 NY:      78% ████████░░                         │
│  ⚡ Overlap:  82% █████████░                         │
└──────────────────────────────────────────────────────┘
```
- Gauge SVG com agulha que sobe do zero animada
- Cor dinâmica: vermelho <50%, amarelo 50-65%, verde >65%
- Atualiza ao trocar ativo

### Painel de Índice de Confiança Composto
Card ao lado do gauge:
```
🎯 ÍNDICE DE CONFIANÇA COMPOSTO
Score do motor:          78% (40%)
Histórico neste horário: 71% (30%)
Qualidade da sessão:     NY +15% (20%)
Contexto de mercado:     Trending (10%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONFIANÇA FINAL:         74% 🟢
```

### Ferramentas Inovadoras de Assertividade

**🧬 DNA de Candle (Fingerprint)**
Card expansível mostrando:
```
🧬 DNA MATCH ENCONTRADO
Padrão atual comparado com 1.247 históricos:
Das 94 vezes que esse fingerprint apareceu:
✅ 71 resultaram em CALL (75.5%)
❌ 23 resultaram em PUT (24.5%)
📊 Confiança do DNA: ALTA
```

**🪤 Detector de Armadilha MM (Market Maker Trap)**
Quando detectado:
```
🚨 MM TRAP DETECTADO
Spike acima da resistência rejeitado
Volume anormal: +180% da média
Sinal de reversão: SELL 🪤
Score especial: TRAP (alta probabilidade)
```

**🌡️ Entropia de Mercado**
```
🌡️ ENTROPIA DE MERCADO
[████████░░] 38% — MERCADO ORDENADO
✅ Condição favorável para operar
```
Verde <45% (ordenado) | Amarelo 45-65% | Vermelho >65% (caótico — bloqueia sinais)

**📅 DNA Temporal (Padrão Histórico do Momento)**
```
📅 PADRÃO HISTÓRICO — Quarta 14h UTC
BTC/USD neste exato horário historicamente:
📈 BULLISH 68% das vezes
Maior sequência de wins: 6
Score médio dos sinais: 74%
```

**🌐 Score de Ecossistema**
```
🌐 ECOSSISTEMA CRIPTO
BTC ↗️ | ETH ↗️ | BNB ↗️
Score do ecossistema: BULLISH 82%
→ Bônus +8% em sinais CALL
```

**🔮 Preditor de Fechamento de Vela**
```
🔮 PREDIÇÃO DE FECHAMENTO
Vela atual: 28s de vida (+0.04% até agora)
Com base em 1.247 candles similares:
Vai fechar BULLISH: 73% de probabilidade
Volume nos primeiros 30s: +40% do normal
```

**🌐 Consenso Multi-Universo**
```
🌐 CONSENSO MULTI-SISTEMA
Motor padrão:         BUY 78% ✅
Motor conservador:    BUY 71% ✅
Motor agressivo:      BUY 83% ✅
Motor volume:         BUY 76% ✅
Motor anti-tendência: SELL 52% ❌
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONSENSO: 4/5 → ✅ EMITIR SINAL
```

**📐 Momentum Assimétrico**
```
📐 MOMENTUM ASSIMÉTRICO
Quedas: 1.8x mais rápidas que subidas
Viés oculto: BEARISH
→ PUT favorecido +10%
```

### Card do Sinal — Redesign Premium
```
┌──────────────────────────────────────────────┐
│  ₿ BTC/USD  •  M1  •  🇺🇸 Nova York  💎 PREMIUM│
│──────────────────────────────────────────────│
│                                              │
│           🟢  B U Y                          │
│        [fonte 72px, glow verde]              │
│                                              │
│    ████████████░░░░  82%                     │
│    [barra shimmer animada]                   │
│                                              │
│  🌡️ Confiança: 74%  │  🌐 Consenso: 4/5 ✅   │
│  🧬 DNA Match: 75%  │  🌡️ Entropia: 38% ✅   │
│                                              │
│  ┌────────────┐  ┌────────────┐              │
│  │  ADX 28.5  │  │ 7🐂 1🐻 1⚪│              │
│  │  Trending  │  │   Votos    │              │
│  └────────────┘  └────────────┘              │
│                                              │
│  📋 Por que este sinal? ▼                    │
│  "EMA9 cruzou EMA21 ↗️ | RSI 58 neutro ↗️   │
│   MACD histograma positivo ↗️ | NY +15%"    │
│                                              │
│  📊 BTC/USD últimas 48h: 🟢8W/🔴2L (80%)    │
│                                              │
│     [Timer SVG circular: 08s]               │
│                                              │
│  [✅  W I N]         [❌  L O S S]           │
│  [📸 Exportar]  [📤 WhatsApp]               │
└──────────────────────────────────────────────┘
```

### Sinal do Dia ⭐
Card especial no topo uma vez por sessão:
```
⭐ SINAL DO DIA — Previsão
BTC/USD previsto para 14h30 UTC
Base: 73% histórico neste horário
Aguarde o sinal para confirmar entrada
```

### Alertas de Proteção
- **Detector Pump/Dump (Cripto):** `🚨 PUMP DETECTADO — BTC variou +6.3% em 15min — Sinal bloqueado`
- **Alerta de FOMO:** se WIN/LOSS marcado em <30s após sinal: *"Você confirmou muito rápido. A vela fechou?"*
- **Alerta de Overtrading:** após X sinais em 1h: *"Você operou 8 sinais na última hora. Considere uma pausa."*
- **Modo Proteção de Banca:** ao atingir limite de perdas consecutivas, bloqueia sinais por 30min com mensagem de proteção + botão de desbloqueio manual

### Exportar Sinal como Imagem (Canvas API)
Botão "📸 Exportar" gera PNG profissional com: logo, par, direção, score, qualidade, horário e marca d'água. Pronto para WhatsApp/Telegram/Stories.

### Quick Stats (4 cards menores)
Total Sinais | Win Rate Geral | Sequência Atual | Sinais FORTE

### Gráfico TradingView
Widget embarcado, tema sincronizado, altura 400px, recriado ao trocar ativo.

---

## MOTOR DE SINAIS v7 — ENGINE COM DADOS REAIS

> ⚠️ **CRÍTICO PARA O LOVABLE.DEV:** O motor de sinais DEVE usar os cálculos
> matemáticos reais definidos abaixo. NÃO substituir NENHUMA função de
> indicador por Math.random() ou valores hardcoded. Cada indicador tem sua
> fórmula matemática exata descrita. Os únicos valores aleatórios permitidos
> são na simulação de preços Forex (random walk Ornstein-Uhlenbeck), NUNCA
> nos indicadores em si. A assertividade do sistema depende 100% da
> corretude matemática dos cálculos de EMA, RSI, MACD, ADX, ATR, OBV,
> Bollinger e Stochastic.

---

### FONTE DE DADOS OBRIGATÓRIA — Binance WebSocket + REST

O engine NÃO usa Math.random() em nenhuma parte do cálculo de indicadores.
Todos os indicadores são calculados sobre velas REAIS da Binance.

#### Conexão WebSocket (Cripto)
```javascript
// Conectar ao stream de klines M1 da Binance
const ws = new WebSocket(
  `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_1m`
);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  const kline = data.k;
  // kline.o = open, kline.h = high, kline.l = low
  // kline.c = close, kline.v = volume, kline.x = isClosed
  updateCandleBuffer(kline);
};

// Ao perder conexão, reconectar automaticamente com backoff exponencial
ws.onclose = () => {
  setTimeout(() => connectWebSocket(symbol), 2000);
};
```

#### Busca de Velas Históricas (inicialização)
```javascript
// Buscar 200 velas históricas ao selecionar ativo cripto
async function loadHistoricalCandles(symbol) {
  const url = `https://api.binance.com/api/v3/klines`
    + `?symbol=${symbol}&interval=1m&limit=200`;
  const res = await fetch(url);
  const data = await res.json();
  // data: [[openTime, open, high, low, close, volume, ...], ...]
  return data.map(c => ({
    o: parseFloat(c[1]),
    h: parseFloat(c[2]),
    l: parseFloat(c[3]),
    c: parseFloat(c[4]),
    v: parseFloat(c[5]),
    t: c[0]
  }));
}
```

#### Forex/Commodities — Simulação Coerente (Random Walk com Reversão)
Para pares Forex (sem WebSocket público gratuito), usar simulação
COERENTE baseada em random walk com parâmetros reais de volatilidade
por par — NÃO ruído branco puro:
```javascript
const PAIR_VOLATILITY = {
  EURUSD: 0.0003, GBPUSD: 0.0005, USDJPY: 0.03,
  AUDUSD: 0.0004, USDCAD: 0.0004, NZDUSD: 0.0004,
  EURGBP: 0.0002, GBPJPY: 0.05,
  XAUUSD: 0.8,    XAGUSD: 0.015,  USOIL: 0.15
};

// Processo Ornstein-Uhlenbeck: reversão à média com drift
// Gera velas coerentes com tendência, suporte e resistência naturais
function generateForexCandle(prevClose, pair) {
  const vol = PAIR_VOLATILITY[pair] || 0.0003;
  const meanReversion = 0.05;
  const meanPrice = getMeanPrice(pair); // média móvel de 50 períodos
  const drift = -meanReversion * (prevClose - meanPrice);
  // Box-Muller para distribuição normal
  const u1 = Math.random(), u2 = Math.random();
  const normal = Math.sqrt(-2*Math.log(u1)) * Math.cos(2*Math.PI*u2);
  const change = drift + vol * normal;
  const close = prevClose + change;
  const spread = vol * 0.5;
  return {
    o: prevClose,
    h: Math.max(prevClose, close) + spread * Math.random(),
    l: Math.min(prevClose, close) - spread * Math.random(),
    c: close,
    v: 1000 + Math.random() * 500,
    t: Date.now()
  };
}
```

---

### BUFFER DE VELAS — Estrutura em Memória

```javascript
// Buffer principal — mantido em memória durante a sessão
const candleBuffer = {
  m1:  [],  // 200 velas M1 (dados reais via WS para cripto)
  m5:  [],  // 40 velas M5  (calculadas agrupando M1 de 5 em 5)
  m15: []   // 13 velas M15 (calculadas agrupando M1 de 15 em 15)
};

// M5 e M15 são SEMPRE derivados do buffer M1 — nunca buscados separadamente
function buildM5fromM1(m1Candles) {
  const result = [];
  for (let i = 0; i + 4 < m1Candles.length; i += 5) {
    const group = m1Candles.slice(i, i + 5);
    result.push({
      o: group[0].o,
      h: Math.max(...group.map(c => c.h)),
      l: Math.min(...group.map(c => c.l)),
      c: group[4].c,
      v: group.reduce((s, c) => s + c.v, 0),
      t: group[0].t
    });
  }
  return result;
}

function buildM15fromM1(m1Candles) {
  const result = [];
  for (let i = 0; i + 14 < m1Candles.length; i += 15) {
    const group = m1Candles.slice(i, i + 15);
    result.push({
      o: group[0].o,
      h: Math.max(...group.map(c => c.h)),
      l: Math.min(...group.map(c => c.l)),
      c: group[14].c,
      v: group.reduce((s, c) => s + c.v, 0),
      t: group[0].t
    });
  }
  return result;
}

// Atualizar buffer a cada nova vela M1 fechada
function updateCandleBuffer(kline) {
  if (!kline.x) {
    // Vela ainda aberta: atualizar último elemento
    candleBuffer.m1[candleBuffer.m1.length - 1] = {
      o: parseFloat(kline.o), h: parseFloat(kline.h),
      l: parseFloat(kline.l), c: parseFloat(kline.c),
      v: parseFloat(kline.v), t: kline.t
    };
  } else {
    // Vela fechou: adicionar nova e manter máx 200
    candleBuffer.m1.push({
      o: parseFloat(kline.o), h: parseFloat(kline.h),
      l: parseFloat(kline.l), c: parseFloat(kline.c),
      v: parseFloat(kline.v), t: kline.t
    });
    if (candleBuffer.m1.length > 200) candleBuffer.m1.shift();
    // Recalcular M5 e M15 a partir do M1 atualizado
    candleBuffer.m5  = buildM5fromM1(candleBuffer.m1);
    candleBuffer.m15 = buildM15fromM1(candleBuffer.m1);
  }
}
```

---

### CÁLCULO REAL DOS INDICADORES

#### EMA (Exponential Moving Average)
```javascript
// Fórmula exata de EMA — NÃO usar Math.random()
function calcEMA(closes, period) {
  if (closes.length < period) return closes[closes.length - 1];
  const k = 2 / (period + 1);
  // SMA inicial como seed
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  return ema;
}
// Usar: calcEMA(closes, 9), calcEMA(closes, 21), calcEMA(closes, 50)
```

#### RSI — Relative Strength Index (14 períodos)
```javascript
function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}
```

#### MACD (12, 26, 9)
```javascript
function calcMACD(closes) {
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macdLine = ema12 - ema26;

  // Série histórica de MACD para calcular linha de sinal
  const macdSeries = [];
  for (let i = 26; i <= closes.length; i++) {
    const slice = closes.slice(0, i);
    macdSeries.push(calcEMA(slice, 12) - calcEMA(slice, 26));
  }
  const signalLine = calcEMA(macdSeries, 9);
  const histogram  = macdLine - signalLine;

  return { macdLine, signalLine, histogram };
}
```

#### Bollinger Bands (20, 2)
```javascript
function calcBollinger(closes, period = 20, mult = 2) {
  if (closes.length < period) return { upper: 0, middle: 0, lower: 0, width: 0 };
  const slice = closes.slice(-period);
  const mean  = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / period;
  const std   = Math.sqrt(variance);
  return {
    upper:  mean + mult * std,
    middle: mean,
    lower:  mean - mult * std,
    width:  (2 * mult * std) / mean  // % de largura para detectar squeeze
  };
}
```

#### Stochastic %K (14 períodos)
```javascript
function calcStoch(highs, lows, closes, period = 14) {
  if (highs.length < period) return 50;
  const recentHighs  = highs.slice(-period);
  const recentLows   = lows.slice(-period);
  const highMax = Math.max(...recentHighs);
  const lowMin  = Math.min(...recentLows);
  const close   = closes[closes.length - 1];
  if (highMax === lowMin) return 50;
  return ((close - lowMin) / (highMax - lowMin)) * 100;
}
```

#### ADX — Average Directional Index (14 períodos)
```javascript
function calcADX(highs, lows, closes, period = 14) {
  if (closes.length < period + 1) return { adx: 15, plusDI: 20, minusDI: 20 };

  const trList = [], plusDMList = [], minusDMList = [];
  for (let i = 1; i < closes.length; i++) {
    const upMove   = highs[i]  - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    plusDMList.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDMList.push(downMove > upMove && downMove > 0 ? downMove : 0);
    trList.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i]  - closes[i - 1])
    ));
  }

  // Wilder's smoothing
  function wilderSmooth(arr, n) {
    let sum = arr.slice(0, n).reduce((a, b) => a + b, 0);
    const result = [sum];
    for (let i = n; i < arr.length; i++) {
      sum = sum - sum / n + arr[i];
      result.push(sum);
    }
    return result;
  }

  const smoothTR    = wilderSmooth(trList, period);
  const smoothPlusDM  = wilderSmooth(plusDMList, period);
  const smoothMinusDM = wilderSmooth(minusDMList, period);

  const last = smoothTR.length - 1;
  const plusDI  = smoothTR[last] ? (smoothPlusDM[last]  / smoothTR[last]) * 100 : 0;
  const minusDI = smoothTR[last] ? (smoothMinusDM[last] / smoothTR[last]) * 100 : 0;
  const dx = (plusDI + minusDI) ? Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100 : 0;

  // ADX = média suavizada do DX (simplificado: usar últimos `period` valores)
  const adx = dx; // Em implementação completa, calcular EMA do DX

  return { adx, plusDI, minusDI };
}
```

#### ATR — Average True Range (14 períodos)
```javascript
function calcATR(highs, lows, closes, period = 14) {
  if (closes.length < period + 1) return 0;
  const trs = [];
  for (let i = 1; i < closes.length; i++) {
    trs.push(Math.max(
      highs[i]  - lows[i],
      Math.abs(highs[i]  - closes[i - 1]),
      Math.abs(lows[i]   - closes[i - 1])
    ));
  }
  // Wilder's smoothing (equivalente a EMA com alpha = 1/period)
  const recent = trs.slice(-period);
  return recent.reduce((a, b) => a + b, 0) / period;
}
```

#### OBV — On-Balance Volume
```javascript
function calcOBV(closes, volumes) {
  let obv = 0;
  const obvSeries = [0];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1])      obv += volumes[i];
    else if (closes[i] < closes[i - 1]) obv -= volumes[i];
    // Se igual, OBV não muda
    obvSeries.push(obv);
  }
  // Tendência do OBV: comparar valor atual com EMA9 da série OBV
  const obvEma9 = calcEMA(obvSeries, 9);
  const trend   = obv > obvEma9 ? 'UP' : obv < obvEma9 ? 'DOWN' : 'NEUTRAL';
  return { obv, trend, obvEma9 };
}
```

---

### LÓGICA DE DECISÃO — VOTOS POR INDICADOR

Cada indicador retorna CALL (+1), PUT (-1) ou NEUTRAL (0):

```javascript
function getIndicatorVotes(buffer) {
  const closes  = buffer.m1.map(c => c.c);
  const highs   = buffer.m1.map(c => c.h);
  const lows    = buffer.m1.map(c => c.l);
  const volumes = buffer.m1.map(c => c.v);
  const price   = closes[closes.length - 1];

  // Calcular todos os indicadores sobre dados reais
  const ema9   = calcEMA(closes, 9);
  const ema21  = calcEMA(closes, 21);
  const ema50  = calcEMA(closes, 50);
  const rsiVal = calcRSI(closes);
  const macd   = calcMACD(closes);
  const bb     = calcBollinger(closes);
  const stoch  = calcStoch(highs, lows, closes);
  const adx    = calcADX(highs, lows, closes);
  const atr    = calcATR(highs, lows, closes);
  const obv    = calcOBV(closes, volumes);

  // HTF: calcular EMAs sobre velas M5 derivadas do buffer
  const m5closes = buffer.m5.map(c => c.c);
  const ema9m5   = calcEMA(m5closes, 9);
  const ema21m5  = calcEMA(m5closes, 21);
  const ema9m15  = calcEMA(buffer.m15.map(c => c.c), 9);
  const ema21m15 = calcEMA(buffer.m15.map(c => c.c), 21);

  const votes = {};

  // --- EMA: estrutura de tendência M1 ---
  if (ema9 > ema21 && ema21 > ema50)       votes.ema = 'CALL';
  else if (ema9 < ema21 && ema21 < ema50)  votes.ema = 'PUT';
  else                                      votes.ema = 'NEUTRAL';

  // --- HTF M5: confirma direção no timeframe superior ---
  if (ema9m5 > ema21m5)       votes.htf = 'CALL';
  else if (ema9m5 < ema21m5)  votes.htf = 'PUT';
  else                         votes.htf = 'NEUTRAL';

  // Bônus M15: se M15 também confirmar, registrar para uso no score
  const m15Confirm = (ema9m15 > ema21m15) ? 'CALL'
                   : (ema9m15 < ema21m15) ? 'PUT' : 'NEUTRAL';

  // --- RSI: momentum sem extremo oposto ---
  if (rsiVal > 55 && rsiVal < 75)       votes.rsi = 'CALL';
  else if (rsiVal < 45 && rsiVal > 25)  votes.rsi = 'PUT';
  else                                   votes.rsi = 'NEUTRAL';

  // --- MACD: direção do histograma + cruzamento ---
  if (macd.histogram > 0 && macd.macdLine > macd.signalLine)       votes.macd = 'CALL';
  else if (macd.histogram < 0 && macd.macdLine < macd.signalLine)  votes.macd = 'PUT';
  else                                                               votes.macd = 'NEUTRAL';

  // --- Bollinger: preço tocou banda + posição relativa ---
  if (price <= bb.lower)       votes.bb = 'CALL';
  else if (price >= bb.upper)  votes.bb = 'PUT';
  else                          votes.bb = 'NEUTRAL';

  // --- Stochastic: zonas de sobrevenda/sobrecompra ---
  if (stoch < 25)       votes.stoch = 'CALL';
  else if (stoch > 75)  votes.stoch = 'PUT';
  else                   votes.stoch = 'NEUTRAL';

  // --- Volume: direção do OBV ---
  votes.volume = obv.trend === 'UP' ? 'CALL'
               : obv.trend === 'DOWN' ? 'PUT' : 'NEUTRAL';

  // --- OBV slope (últimas 3 leituras) ---
  votes.obv = votes.volume;

  // --- Padrão de vela: análise das últimas 3 velas ---
  votes.candle = detectCandlePattern(buffer.m1.slice(-3));

  return {
    votes, adx, atr, rsiVal, bb, stoch, macd,
    ema9, ema21, ema50, price, m15Confirm,
    volumes, closes
  };
}
```

---

### DETECÇÃO DE PADRÕES DE CANDLE (MATEMÁTICA REAL)

```javascript
function detectCandlePattern(candles) {
  if (candles.length < 2) return 'NEUTRAL';
  const [prev2, prev1, curr] = candles.length >= 3
    ? candles : [null, candles[0], candles[1]];

  const body  = c => Math.abs(c.c - c.o);
  const range = c => c.h - c.l;
  const isBull = c => c.c > c.o;
  const isBear = c => c.c < c.o;

  // Doji: corpo < 10% do range → indecisão
  if (body(curr) < range(curr) * 0.10) return 'NEUTRAL';

  // Hammer / Pin Bar de alta (reversão bullish)
  const lowerShadow = Math.min(curr.c, curr.o) - curr.l;
  const upperShadow = curr.h - Math.max(curr.c, curr.o);
  if (lowerShadow > body(curr) * 2.0
      && upperShadow < body(curr) * 0.5
      && isBear(prev1)) return 'CALL';

  // Shooting Star (reversão bearish)
  if (upperShadow > body(curr) * 2.0
      && lowerShadow < body(curr) * 0.5
      && isBull(prev1)) return 'PUT';

  // Engulfing de alta
  if (prev1 && isBear(prev1) && isBull(curr)
      && curr.o < prev1.c && curr.c > prev1.o) return 'CALL';

  // Engulfing de baixa
  if (prev1 && isBull(prev1) && isBear(curr)
      && curr.o > prev1.c && curr.c < prev1.o) return 'PUT';

  // Morning Star (3 velas)
  if (prev2 && isBear(prev2)
      && body(prev1) < range(prev1) * 0.3
      && isBull(curr)
      && curr.c > (prev2.o + prev2.c) / 2) return 'CALL';

  // Evening Star (3 velas)
  if (prev2 && isBull(prev2)
      && body(prev1) < range(prev1) * 0.3
      && isBear(curr)
      && curr.c < (prev2.o + prev2.c) / 2) return 'PUT';

  // Three White Soldiers
  if (prev2 && isBull(prev2) && isBull(prev1) && isBull(curr)
      && curr.c > prev1.c && prev1.c > prev2.c) return 'CALL';

  // Three Black Crows
  if (prev2 && isBear(prev2) && isBear(prev1) && isBear(curr)
      && curr.c < prev1.c && prev1.c < prev2.c) return 'PUT';

  // Inside Bar: indecisão
  if (prev1 && curr.h < prev1.h && curr.l > prev1.l) return 'NEUTRAL';

  // Default: direção da vela atual
  return isBull(curr) ? 'CALL' : 'PUT';
}
```

---

### SCORE FINAL — CÁLCULO PONDERADO REAL

```javascript
// Pesos base dos indicadores
const BASE_WEIGHTS = {
  ema: 0.22, htf: 0.20, rsi: 0.18, macd: 0.18,
  bb: 0.10, stoch: 0.10, candle: 0.10,
  volume: 0.08, obv: 0.08
};

function calcFinalScore(indicatorData, session, assetCategory, mlWeights) {
  const { votes, adx, atr, rsiVal, bb, m15Confirm, closes } = indicatorData;

  // Usar pesos ML se disponíveis para este contexto, senão base
  const contextKey = `${session}_${assetCategory}`;
  let weights = { ...BASE_WEIGHTS, ...(mlWeights?.[contextKey] || {}) };

  // Ajuste de pesos para Cripto (mais sensível a volume)
  if (assetCategory === 'crypto') {
    weights.volume += 0.05;
    weights.obv    += 0.05;
    weights.rsi    += 0.03;
    // Normalizar para soma = 1
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    Object.keys(weights).forEach(k => weights[k] /= total);
  }

  let callScore = 0, putScore = 0, totalWeight = 0;
  for (const [indicator, vote] of Object.entries(votes)) {
    const w = weights[indicator] || 0.05;
    totalWeight += w;
    if (vote === 'CALL')    callScore += w;
    else if (vote === 'PUT') putScore  += w;
    // NEUTRAL: não soma para nenhum lado
  }

  const direction = callScore >= putScore ? 'CALL' : 'PUT';
  const rawScore  = totalWeight > 0
    ? Math.max(callScore, putScore) / totalWeight
    : 0.5;

  // --- Bônus de sessão ---
  const sessionBonus = {
    forex: {
      london: 0.12, ny: 0.15, overlap: 0.20,
      asia: -0.08,  off: -0.05
    },
    crypto: {
      ny: 0.15,     overlap: 0.20, london: 0.08,
      asia: -0.12,  midnight: -0.05
    },
    commodity: {
      london: 0.10, ny: 0.12, overlap: 0.15,
      asia: -0.05,  off: -0.03
    }
  };
  const bonus = sessionBonus[assetCategory]?.[session] ?? 0;

  // --- Penalidade ADX ---
  // ADX < 18: mercado sem direção → penalidade severa
  // ADX 18-25: trending fraco → penalidade leve
  // ADX > 25: trending forte → bônus
  const adxPenalty = adx.adx < 18 ? -0.20
                   : adx.adx < 25 ?  0.00
                   :                  0.05;

  // --- Bônus confirmação M15 ---
  const m15Bonus = (m15Confirm === direction) ? 0.08 : 0;

  // --- Penalidade ATR excessivo ---
  const atrMean = closes.slice(-20)
    .reduce((s, c, i, a) => i > 0 ? s + Math.abs(c - a[i-1]) : s, 0) / 19;
  const currentAtr = calcATR(
    candleBuffer.m1.map(c => c.h),
    candleBuffer.m1.map(c => c.l),
    closes
  );
  const atrPenalty = currentAtr > atrMean * 2.0 ? -0.12
                   : currentAtr < atrMean * 0.5 ?  0.05 : 0;

  // --- Ajuste RSI extremo ---
  const rsiPenalty = (direction === 'CALL' && rsiVal > 78) ? -0.10
                   : (direction === 'PUT'  && rsiVal < 22) ? -0.10 : 0;

  // --- Ajuste Bollinger ---
  const bbPenalty = (direction === 'CALL' && indicatorData.price > bb.upper) ? -0.08
                  : (direction === 'PUT'  && indicatorData.price < bb.lower) ? -0.08 : 0;

  const finalScore = Math.min(0.95,
    Math.max(0.35,
      rawScore + bonus + adxPenalty + m15Bonus + atrPenalty + rsiPenalty + bbPenalty
    )
  );

  return {
    direction,
    score: finalScore,
    rawScore,
    votes,
    adx,
    adjustments: { bonus, adxPenalty, m15Bonus, atrPenalty, rsiPenalty }
  };
}
```

---

### FILTRO ANTI-RUÍDO — REGRAS DURAS (OBRIGATÓRIAS)

Antes de emitir qualquer sinal, TODAS as condições abaixo devem passar:

```javascript
function validateSignal(result, buffer, config) {
  const { direction, score, adx, votes } = result;
  const closes  = buffer.m1.map(c => c.c);
  const rsiVal  = calcRSI(closes);

  // REGRA 1: Score mínimo configurável (padrão 65% — era 55%)
  if (score < (config.minScore / 100 || 0.65))
    return { blocked: 'SCORE_TOO_LOW', score };

  // REGRA 2: ADX obrigatório ≥ 18
  if (adx.adx < 18)
    return { blocked: 'ADX_TOO_LOW', adx: adx.adx };

  // REGRA 3: EMA M1 E HTF M5 devem apontar para a mesma direção
  // (pelo menos um dos dois deve confirmar)
  const trendConfirms = [votes.ema, votes.htf].filter(v => v === direction).length;
  if (trendConfirms === 0)
    return { blocked: 'NO_TREND_CONFIRM' };

  // REGRA 4: RSI não pode estar em extremo oposto ao sinal
  if (direction === 'CALL' && rsiVal > 80)
    return { blocked: 'RSI_OVERBOUGHT', rsi: rsiVal };
  if (direction === 'PUT' && rsiVal < 20)
    return { blocked: 'RSI_OVERSOLD', rsi: rsiVal };

  // REGRA 5: Mínimo 3 dos 5 indicadores principais confirmam a direção
  const main5 = ['ema', 'htf', 'rsi', 'macd', 'volume'];
  const confirms = main5.filter(k => votes[k] === direction).length;
  if (confirms < 3)
    return { blocked: 'INSUFFICIENT_CONFIRM', confirms };

  // REGRA 6: Horário morto (±1 minuto da hora cheia)
  const now = new Date();
  const mins = now.getMinutes();
  if (mins === 59 || mins === 0)
    return { blocked: 'DEAD_HOUR' };

  // REGRA 7: Entropia de mercado > 65% bloqueia
  const entropy = calcEntropy(buffer.m1.slice(-20));
  if (entropy > 0.65)
    return { blocked: 'HIGH_ENTROPY', entropy };

  // REGRA 8: Exaustão de tendência (3+ velas seguidas na mesma direção)
  const last3 = buffer.m1.slice(-3);
  const allBull = last3.every(c => c.c > c.o);
  const allBear = last3.every(c => c.c < c.o);
  if (direction === 'CALL' && allBull)
    result.score *= 0.92; // penalidade de exaustão, não bloqueia
  if (direction === 'PUT' && allBear)
    result.score *= 0.92;

  return result; // sinal válido — retorna com possível score ajustado
}
```

---

### ENTROPIA DE MERCADO — CÁLCULO DE SHANNON

```javascript
function calcEntropy(candles) {
  if (candles.length < 5) return 0.5;

  // Gerar sequência binária: 1 = vela de alta, 0 = vela de baixa
  const sequence = candles.map(c => c.c > c.o ? 1 : 0);

  // Contar ocorrências de padrões de 3 bits (8 combinações possíveis)
  const patterns = {};
  for (let i = 0; i < sequence.length - 2; i++) {
    const key = `${sequence[i]}${sequence[i+1]}${sequence[i+2]}`;
    patterns[key] = (patterns[key] || 0) + 1;
  }

  const total = Object.values(patterns).reduce((a, b) => a + b, 0);
  let entropy = 0;
  for (const count of Object.values(patterns)) {
    const p = count / total;
    if (p > 0) entropy -= p * Math.log2(p);
  }

  // Normalizar: entropia máxima de 3 bits = 3
  return Math.min(1, entropy / 3);
}
```

---

### DNA DE CANDLE — FINGERPRINT REAL

```javascript
function generateFingerprint(candles) {
  // Usa as últimas 7 velas para gerar uma assinatura numérica
  const recent = candles.slice(-7);
  return recent.map(c => {
    const body  = Math.abs(c.c - c.o);
    const range = c.h - c.l || 0.0001;
    return {
      bodyRatio:   Math.round((body / range) * 10) / 10,       // 0.0 - 1.0
      direction:   c.c > c.o ? 1 : -1,                          // +1 ou -1
      upperShadow: Math.round(((c.h - Math.max(c.c,c.o)) / range) * 10) / 10,
      lowerShadow: Math.round(((Math.min(c.c,c.o) - c.l) / range) * 10) / 10
    };
  });
}

function matchFingerprint(currentFP, historicalSignals) {
  // Comparar fingerprint atual com histórico salvo no localStorage
  let matches = 0, wins = 0;
  for (const hist of historicalSignals) {
    if (!hist.fingerprint || !hist.result) continue;
    const fp = hist.fingerprint;
    // Score de similaridade: quantos campos batem dentro de tolerância
    const similarity = currentFP.reduce((score, curr, i) => {
      if (!fp[i]) return score;
      const bodyMatch = Math.abs(curr.bodyRatio - fp[i].bodyRatio) < 0.2;
      const dirMatch  = curr.direction === fp[i].direction;
      return score + (bodyMatch && dirMatch ? 1 : 0);
    }, 0) / currentFP.length;

    if (similarity >= 0.7) {
      matches++;
      if (hist.result === 'win') wins++;
    }
  }
  return {
    matches,
    winRate: matches > 0 ? wins / matches : 0.5,
    confidence: matches >= 20 ? 'ALTA' : matches >= 10 ? 'MÉDIA' : 'BAIXA'
  };
}
```

---

### DETECTOR DE ARMADILHA MM (Market Maker Trap)

```javascript
function detectMMTrap(buffer) {
  const candles = buffer.m1;
  if (candles.length < 10) return null;

  const closes = candles.map(c => c.c);
  const highs  = candles.map(c => c.h);
  const lows   = candles.map(c => c.l);
  const volumes = candles.map(c => c.v);

  // Calcular resistência/suporte dos últimos 50 candles
  const recent50highs = highs.slice(-50);
  const recent50lows  = lows.slice(-50);
  const resistance = Math.max(...recent50highs.slice(0, -3)); // excluir últimas 3
  const support    = Math.min(...recent50lows.slice(0, -3));

  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];
  const avgVolume  = volumes.slice(-20, -1).reduce((a,b)=>a+b,0) / 19;

  // Trap de alta: spike acima da resistência + rejeição + volume anormal
  const bullTrap = prevCandle.h > resistance * 1.001       // spike acima
    && lastCandle.c < resistance                            // fechou abaixo
    && lastCandle.c < prevCandle.o                          // vela de reversão
    && volumes[volumes.length - 1] > avgVolume * 1.5;      // volume elevado

  // Trap de baixa: spike abaixo do suporte + rejeição
  const bearTrap = prevCandle.l < support * 0.999
    && lastCandle.c > support
    && lastCandle.c > prevCandle.o
    && volumes[volumes.length - 1] > avgVolume * 1.5;

  if (bullTrap) return {
    detected: true, type: 'BULL_TRAP', direction: 'PUT',
    volumeRatio: (volumes[volumes.length-1] / avgVolume * 100).toFixed(0)
  };
  if (bearTrap) return {
    detected: true, type: 'BEAR_TRAP', direction: 'CALL',
    volumeRatio: (volumes[volumes.length-1] / avgVolume * 100).toFixed(0)
  };

  return { detected: false };
}
```

---

### CONSENSO MULTI-UNIVERSO (5 Engines)

```javascript
function calcConsensus(buffer, session, assetCategory, mlWeights) {
  // Variações de ±10% nos pesos para 5 universos paralelos
  const variations = [
    {},           // universo 0: pesos originais
    { ema: +0.10, rsi: -0.05, macd: -0.05 },   // universo 1: tendência
    { rsi: +0.10, stoch: +0.05, ema: -0.15 },  // universo 2: momentum
    { volume: +0.15, obv: +0.10, candle: -0.25 }, // universo 3: volume
    { rsi: -0.10, macd: -0.10, candle: +0.20 } // universo 4: padrão
  ];

  const results = variations.map(variation => {
    // Criar cópia dos pesos e aplicar variação
    const weights = { ...BASE_WEIGHTS };
    for (const [k, delta] of Object.entries(variation)) {
      if (weights[k] !== undefined) weights[k] = Math.max(0.01, weights[k] + delta);
    }
    // Normalizar
    const total = Object.values(weights).reduce((a,b)=>a+b,0);
    Object.keys(weights).forEach(k => weights[k] /= total);

    const indicatorData = getIndicatorVotes(buffer);
    return calcFinalScore(indicatorData, session, assetCategory, { [`${session}_${assetCategory}`]: weights });
  });

  const callCount = results.filter(r => r.direction === 'CALL').length;
  const putCount  = results.filter(r => r.direction === 'PUT').length;
  const dominant  = callCount >= putCount ? 'CALL' : 'PUT';
  const agreement = Math.max(callCount, putCount);

  return {
    direction: dominant,
    agreement,    // de 5
    results,
    confirmed: agreement >= 4  // só emite se ≥ 4/5 concordam
  };
}
```

---

### ML POR CONTEXTO — AJUSTE REAL DE PESOS

```javascript
// Salvo em localStorage: smpML7 = { contexto: { indicador: peso } }
function updateMLWeights(signal, resultType) {
  const mlWeights = JSON.parse(localStorage.getItem('smpML7') || '{}');
  const context   = `${signal.sess}_${signal.assetCategory}`;
  if (!mlWeights[context]) mlWeights[context] = { ...BASE_WEIGHTS };

  const lr = 0.015; // learning rate conservador (1.5%)

  if (resultType === 'win') {
    // Reforçar indicadores que votaram na direção vencedora
    Object.entries(signal.votes || {}).forEach(([ind, vote]) => {
      if (vote === signal.dir && mlWeights[context][ind] !== undefined) {
        mlWeights[context][ind] = Math.min(0.40, mlWeights[context][ind] + lr);
      }
    });
  } else if (resultType === 'loss') {
    // Penalizar levemente indicadores que conduziram ao LOSS
    Object.entries(signal.votes || {}).forEach(([ind, vote]) => {
      if (vote === signal.dir && mlWeights[context][ind] !== undefined) {
        mlWeights[context][ind] = Math.max(0.02, mlWeights[context][ind] - lr * 0.5);
      }
    });
  }

  // Normalizar pesos do contexto para somar 1
  const total = Object.values(mlWeights[context]).reduce((a,b)=>a+b,0);
  if (total > 0) {
    Object.keys(mlWeights[context]).forEach(k => {
      mlWeights[context][k] = mlWeights[context][k] / total;
    });
  }

  localStorage.setItem('smpML7', JSON.stringify(mlWeights));
  return mlWeights;
}
```

---

### QUALIDADE EM 5 NÍVEIS — THRESHOLDS AJUSTADOS

Com dados reais, usar thresholds mais rigorosos:

| Nível | Score | Condição Extra |
|---|---|---|
| 🔴 EVITAR | < 62% | Sempre bloqueado — não emite |
| ⚪ FRACO | 62–68% | ADX ≥ 20, ≥ 3/5 confirmam |
| 🟡 MÉDIO | 68–74% | ADX ≥ 22, ≥ 3/5 confirmam |
| 🟢 FORTE | 74–82% | ADX ≥ 25, ≥ 4/5 confirmam |
| 💎 PREMIUM | ≥ 82% | ADX ≥ 28, ≥ 5/5 confirmam |

**Score mínimo padrão: 65%** (aumentado de 55% para reduzir ruído).
**Filtro FORTE only** recomendado como padrão para novos usuários.

---

### SESSÕES DE MERCADO

```javascript
function getCurrentSession() {
  const utcHour = new Date().getUTCHours();
  // Sessões Forex
  if (utcHour >= 8  && utcHour < 12)  return 'london';
  if (utcHour >= 12 && utcHour < 17)  return 'overlap'; // London + NY
  if (utcHour >= 17 && utcHour < 22)  return 'ny';
  if (utcHour >= 22 || utcHour < 3)   return 'asia';
  return 'off';
}
```

**Bônus/Penalidade por Sessão:**
- Forex: Londres +12% | NY +15% | Overlap +20% | Ásia -8%
- Cripto (24h): NY Peak +15% | Overlap +20% | Londres Cripto +8% | Ásia -12% | Madrugada -5%

---

### FILTRO DE NOTÍCIAS

Bloqueia sinais ±15min de notícias de alto impacto.
Pré-configurados: NFP, CPI, FOMC, ECB, PMI, Halvings cripto.
Banner vermelho: `"🚫 Sinal bloqueado — Notícia em Xmin"`
Buffer configurável: 5–30min.

---

### DETECTOR PUMP/DUMP (Cripto)

```javascript
function detectPumpDump(buffer, thresholdPct = 5) {
  const candles15m = buffer.m1.slice(-15); // últimos 15 minutos
  if (candles15m.length < 2) return false;
  const firstClose = candles15m[0].c;
  const lastClose  = candles15m[candles15m.length - 1].c;
  const change     = Math.abs((lastClose - firstClose) / firstClose) * 100;
  return change >= thresholdPct;
}
```

---

### SONS DIFERENCIADOS POR TIPO (Web Audio API)

```javascript
// NÃO usar bibliotecas externas — Web Audio API pura
function playSignalSound(type) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  const sounds = {
    forex_forte:   [[440, 0.0], [550, 0.15], [660, 0.30]],
    crypto_forte:  [[800, 0.0], [1000, 0.20]],
    btcusd:        [[600, 0.0], [800, 0.10], [1000, 0.20], [800, 0.30]],
    premium:       [[440, 0.0], [550, 0.15], [660, 0.30], [880, 0.45]],
    win:           [[523, 0.0], [659, 0.15], [784, 0.30]],
    loss:          [[400, 0.0], [350, 0.20], [300, 0.40]],
    pump_dump:     [[1200, 0.0], [1200, 0.10], [1200, 0.20]],
    alert_30s:     [[800, 0.0]]
  };

  const notes = sounds[type] || sounds.forex_forte;
  notes.forEach(([freq, delay]) => {
    const o2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    o2.connect(g2); g2.connect(ctx.destination);
    o2.frequency.value = freq;
    g2.gain.setValueAtTime(0.3, ctx.currentTime + delay);
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.3);
    o2.start(ctx.currentTime + delay);
    o2.stop(ctx.currentTime + delay + 0.3);
  });
}
```

---

### VIBRAÇÃO MOBILE

```javascript
const VIBRATION_PATTERNS = {
  forte:    [400],
  medio:    [200, 100, 200],
  win:      [100, 50, 100, 50, 200],
  loss:     [150],
  pump_dump:[500, 200, 500]
};
function vibrate(type) {
  if (navigator.vibrate) navigator.vibrate(VIBRATION_PATTERNS[type] || [200]);
}
```

---

### TIMING DO ENGINE

```javascript
// Intervalo a cada 1 segundo
setInterval(() => {
  const seconds = new Date().getSeconds();

  // Emitir sinal no segundo 48 de cada minuto
  if (seconds === 48) {
    runSignalEngine();
  }

  // Atualizar timer SVG circular de countdown
  updateCountdownTimer(seconds);

  // Alertas dos últimos 30s da vela
  if (seconds === 30) playSignalSound('alert_30s');

}, 1000);

function runSignalEngine() {
  const indicatorData = getIndicatorVotes(candleBuffer);
  const session       = getCurrentSession();
  const asset         = getCurrentAsset(); // par selecionado
  const category      = ASSET_CATEGORIES[asset];

  // Calcular score base
  const mlWeights = JSON.parse(localStorage.getItem('smpML7') || '{}');
  const scoreResult = calcFinalScore(indicatorData, session, category, mlWeights);

  // Validar sinal (regras duras)
  const cfg = getConfig();
  const validated = validateSignal(scoreResult, candleBuffer, cfg);
  if (validated?.blocked) {
    updateBlockedSignalUI(validated);
    return;
  }

  // Ferramentas extras
  const mmTrap    = detectMMTrap(candleBuffer);
  const consensus = calcConsensus(candleBuffer, session, category, mlWeights);
  const entropy   = calcEntropy(candleBuffer.m1.slice(-20));
  const fingerprint = generateFingerprint(candleBuffer.m1);
  const dnaMatch  = matchFingerprint(fingerprint, getHistory());

  // Consenso Multi-Universo: bloquear se < 4/5 concordam
  if (!consensus.confirmed) {
    updateBlockedSignalUI({ blocked: 'NO_CONSENSUS', agreement: consensus.agreement });
    return;
  }

  // Sinal válido — renderizar
  const signal = {
    ...validated,
    mmTrap, consensus, entropy, dnaMatch,
    fingerprint, session, asset, category,
    ts: Date.now()
  };

  renderSignalCard(signal);
  playSignalSound(getSoundType(signal));
  vibrate(signal.qual === 'premium' || signal.qual === 'forte' ? 'forte' : 'medio');
  sendTelegramIfEnabled(signal);
  triggerPushNotification(signal);
}
```

---

## ABA: HISTÓRICO

- Lista paginada com filtros: resultado, categoria, ativo, qualidade, período, sessão
- Colunas: direção, score, qualidade, ativo, categoria, sessão, horário, resultado, volatilidade no momento
- Cards de resumo no topo: Cripto vs Forex vs Commodities
- Botões WIN/LOSS para sinais pendentes
- **Modo Timeline Visual:** alternar entre tabela e linha do tempo com barras verdes/vermelhas
- **Replay de Sinal:** botão "▶️" abre modal com TradingView no horário exato + sobreposição do sinal
- **Análise de LOSS automática:** ao marcar LOSS, registra contexto completo para relatório "Por que perdemos?"

---

## ABA: ANALYTICS

8 gráficos Chart.js:
1. Win Rate por Sessão (inclui sessões cripto 24h)
2. Win Rate por Hora (00h-23h)
3. Win Rate por Qualidade (5 níveis)
4. Curva de Equity simulada
5. Precisão por Indicador (ranking)
6. Win Rate por Categoria (Cripto/Forex/Commodities)
7. **Correlação P&L × Estado Emocional** (do diário)
8. **Comparativo de Períodos** (esta semana vs anterior)

Filtros: período (7d/30d/90d/tudo) + categoria + ativo específico

**Comparativo com Benchmark:**
Linha de referência "Mercado sem ferramenta: 50%" vs "SignalMaster Pro: 74%"

---

## ABA: HEATMAP

- Grade 24h × 7 dias por win rate
- Toggle "Modo Cripto" (dados 24h separados)
- Tooltip: hora, dia, win rate, total, categoria dominante
- **Blacklist automática:** células consistentemente <55% marcadas automaticamente como "zona de risco" em vermelho escuro

---

## ABA: BACKTESTING

Configurações: período, banca, risco%, score mínimo, ops/dia, categoria, sessão específica
Resultados: Total Ops, Win Rate, Lucro Final, Max Drawdown, Sharpe Ratio
Gráfico equity + tabela por sessão + tabela por categoria + tabela Cripto vs Forex

---

## ABA: PLACAR POR ATIVO

Tabs: `[ Todos ] [ ₿ Cripto ] [ 💱 Forex ] [ 🏅 Commodities ]`
Colunas: Ativo, Categoria, Total, Wins, Losses, Win Rate, Melhor Sessão, Tendência, Volatilidade
- Mini sparkline de tendência
- Badge ⚡ para alta volatilidade
- **Dashboard Comparativo:** side-by-side de 2 ativos selecionados com todas as métricas

---

## ABA: CALENDÁRIO DE PERFORMANCE

Calendário mensal visual:
- Cada dia colorido por P&L: verde (lucro), vermelho (prejuízo), cinza (sem operações)
- Clique no dia: popup com total sinais, win rate, P&L estimado, estado emocional do diário
- Visão 30/60/90 dias
- **Snapshot Semanal Automático:** toda segunda, gera resumo da semana anterior salvo no histórico

---

## ABA: DIÁRIO DO TRADER

Formulário: data auto, estado emocional (6 opções), notas, lições, P&L, qtd operações, ativos operados
Lista de entradas com preview
Gráfico correlação P&L × estado emocional
**Relatório de Análise Emocional mensal:** quando estado "Focado" → melhor win rate, etc.

---

## ABA: BANCA

3 estratégias: Fixo / Martingale / Anti-Martingale
Aviso cripto: *"⚠️ Para cripto recomendamos máximo 1–2% de risco por operação"*
**Simulador de Banca em Tempo Real:** mini-card mostrando banca crescendo/diminuindo conforme WIN/LOSS marcados
**Calculadora de Economia:** *"Com 74% de assertividade e banca R$500 → +R$1.240 estimado este mês"*

---

## ABA: METAS

- Metas diária/semanal/mensal com barras de progresso shimmer
- Confetti animado (Canvas API puro) quando meta atingida
- Histórico de metas com badges de conquista

---

## ABA: CALCULADORA DE RISCO

Inputs: Win Rate%, Risco%, Banca, Payout%
Outputs: EV, Risco de Ruína, Kelly Criterion, Máx perdas consecutivas, Recomendação
**Modo Alta Volatilidade Cripto:** toggle que aumenta estimativa de drawdown em 20%

---

## ABA: RELATÓRIOS

**PDF (jsPDF):** cabeçalho, resumo por categoria, histórico 100 sinais, análise Cripto vs Forex
**Excel (SheetJS):** 4 sheets (Histórico, Por Ativo, Por Sessão, Cripto vs Forex)
**Certificado de Conquistas PDF:** gera certificado personalizado com nome, conquistas, win rate, data
**Relatório "Por que Perdemos?":** análise dos LOSS com padrões identificados (indicadores que mais erraram, horários, contextos)

---

## ABA: PROJETOR

Fullscreen para telão:
- Direção BUY/SELL em 80px+ com glow máximo
- Score em 120px+
- Badge categoria ₿/💱/🏅
- Countdown circular animado
- Fundo máximo contraste

---

## ABA: ESTRATÉGIAS

Cards educativos com:
- Estratégia + descrição simplificada
- Como identificar no gráfico
- Melhor ativo e sessão
- Taxa de acerto esperada

Estratégias: Price Action, S/R, Cruzamento EMA, Reversão Bollinger, Padrões de Candle, Divergência RSI, MM Trap, DNA de Candle

**Dica do Dia:** toast ao abrir o app com dica aleatória de um banco de 100+ dicas

**Glossário do Trader:** seção com termos explicados: ADX, OBV, Payout, Sessões, Spread, ATR, Entropia, etc.

---

## ABA: CONQUISTAS

### Grid de Badges com animação de brilho ao desbloquear

**Gerais:** Primeiro WIN | Em Chamas (5W seguidos) | Relâmpago (10W) | Diamante (50W) | Campeão (100W) | Consistente (7 dias) | Precisão (80%+ em 20+)

**Cripto:** Bitcoiner (10 ops BTC) | Surfista (WIN em alta volatilidade) | Visionário (3W seguidos ETH) | Para a Lua (30 ops cripto) | Hodler (50 ops cripto >65% WR)

**Forex:** Câmbio Mestre (30 ops) | Londoner (10W sessão Londres) | Wall Street (10W sessão NY)

**Metas:** Milionário (meta mensal batida 3x) | Consistência Máxima (7 dias sem LOSS streak)

Toast de conquista ao desbloquear: "🏆 Nova conquista: [Nome]! + frase motivacional"

**Exportar como Certificado PDF** com logo, nome, conquistas, win rate atual, data.

---

## ABA: LEADERBOARD

Tabs: `[ Geral ] [ ₿ Cripto ] [ 💱 Forex ]`
Mínimo 10 sinais julgados para aparecer
Medalhas 🥇🥈🥉 top 3 com fundo especial
Colunas: Posição, Trader (parcial), Ativo Favorito, Win Rate, Total, Maior Sequência, Plano
Posição do usuário logado sempre visível (mesmo fora do top)

**Modo Sala de Sinais:** tela simplificada tipo "ao vivo" para o admin transmitir para grupo:
- Sinal atual em fonte gigante
- Win rate do dia
- Chat de reações rápidas 👍 🚀 ✅

---

## ABA: TELEGRAM

Configuração do bot, toggles de envio
**Preview da mensagem:**
```
⚡ SignalMaster Pro v7
₿ BUY BTC/USD M1 [CRIPTO]
💎 Score: 85% (PREMIUM)
🧬 DNA Match: 75% | 🪤 MM Trap: Não
🌡️ Entropia: 38% ✅ | 🌐 Consenso: 4/5
🕐 Sessão: NY 🇺🇸 | Ecossistema: Bullish
📐 Assimetria: Bullish +12%
✅ Votos: 7🐂 1🐻 1⚪
📊 BTC/USD: tradingview.com/...
```

---

## ABA: NOTIFICAÇÕES

Central com tipos: info, success, warn, error
Notificações específicas cripto: pump/dump, assertividade alta, sessão Ásia iniciada
**Anúncios Push do Admin:** admin envia push para todos os usuários ativos pelo painel
Badge de não lidas no ícone do menu

---

## ABA: MEU PERFIL

- Avatar com gradiente único por nome
- Skin visual baseada no plano (borda dourada Pro, diamante Premium)
- Nome, usuário, e-mail, plano + data expiração, status trial
- Stats: total sinais, win rate, maior sequência, ativo favorito
- Perfil de risco (resultado do quiz do cadastro)
- Conquistas recentes (últimas 3)
- Código de afiliado com botão copiar + QR Code
- Ativo favorito padrão (dropdown)
- **Histórico de pagamentos** simulado
- **Modo Privacidade:** toggle que oculta todos os valores financeiros (R$ ••••)
- **PIN de Acesso Rápido Mobile:** configurar PIN de 4 dígitos para reentrar sem digitar senha
- **Preferências:** toggles de som, vibração, notificações push, e-mail digest
- **Log de Atividade:** últimos 10 acessos com data/hora/dispositivo aproximado
- **Backup:** botão exportar todos os dados como JSON | botão importar JSON
- **2FA Simulado:** ativar verificação em 2 etapas (código exibido na tela para demo)
- **Timeout de sessão:** configurar expiração por inatividade (15/30/60min)
- **Idioma:** 🇧🇷 PT-BR | 🇺🇸 EN | 🇪🇸 ES
- **Fuso horário:** input com conversão automática das sessões
- **Formato de moeda:** R$ | $ | €

---

## ABA: CONFIGURAÇÕES

### Pesos dos Indicadores
- Sliders para os 9 indicadores
- Badge "🤖 ML" quando ajustado automaticamente
- Perfis: `[ Padrão ] [ Otimizado Cripto ] [ Otimizado Forex ]`
- Histórico de ajustes ML
- Botão "Resetar para Padrão"
- **Sugestão do Admin:** card mostrando recomendações de ajuste baseadas nos últimos 7 dias de dados

### Geral
- Score mínimo (slider 40-90%) — padrão: 65%
- Alerta após X perdas consecutivas
- Toggles: som | som diferenciado cripto | vibração | Text-to-Speech | sinais FORTE only (padrão ON) | filtro notícias | bloqueio pump/dump | animações reduzidas

### Temas Visuais
- 5 temas: Midnight | Lava | Ocean | Matrix | Gold (Premium)
- Cor de destaque customizável (6 opções)

### Atalhos de Teclado
```
W → WIN    L → LOSS    S → Som
F → Fullscreen (Projetor)    1-9 → Abas
```

### Filtro de Notícias
- Adicionar manualmente + botão "Adicionar padrões"
- Eventos cripto: Halvings, Fork, Exchange listing
- Buffer configurável: 5-30min

### Compartilhamento
- Toggle WhatsApp ativo
- Número configurável do suporte
- Preview do texto gerado para WhatsApp

### Sobre
- Versão v7 Ultimate
- Botão "Instalar App (PWA)"
- Uso de armazenamento
- **Status de Serviço:** ✅ Sinais | ✅ TradingView | ✅ Telegram | ✅ Sistema

### Vídeo de Boas-Vindas
- URL do YouTube (configurável pelo Admin)
- Exibido na primeira vez que o usuário acessa

---

## ABA: RECEITA & PLANOS

### Planos e Links Kiwify
```
┌────────────────────────────────────────────────────────┐
│  BÁSICO R$47/mês  │  PRO R$97/mês  │ PREMIUM R$197/mês │
│  [Copiar Link]    │  [Copiar Link] │  [Copiar Link]    │
│  [QR Code PIX]    │  [QR Code PIX] │  [QR Code PIX]    │
│  [Kiwify ↗]       │  [Kiwify ↗]    │  [Kiwify ↗]       │
└────────────────────────────────────────────────────────┘
Vitalício: R$997 — [Copiar Link Kiwify] — "X vagas restantes"
```

### Configuração de Links Kiwify (Admin)
- Inputs para URL de cada plano
- Vagas disponíveis do plano vitalício (número editável)
- Toggle "Mostrar plano vitalício"

### Sistema de Cupons de Desconto
- Admin cadastra cupons: código + % desconto + validade + plano aplicável
- Campo de cupom visível na tela de upgrade/bloqueio
- Exibe preço riscado e novo valor

### Painel de Receita
Cards: Receita Total | Assinantes Ativos | MRR | Plano Mais Popular
Gráfico de crescimento de assinantes ao longo do tempo

### Painel de Controle de Mensalidades (CRÍTICO)
```
🔴 Vencendo hoje: 3 usuários → [Notificar]
🟡 Vencendo em 3 dias: 7 usuários → [Notificar]
🟢 Ativos: 47 usuários (R$4.109/mês estimado)
```
Botão "Notificar" envia mensagem pré-definida via WhatsApp

### QR Codes PIX por plano (qrcodejs)
Gerados automaticamente para os 4 valores (R$47, R$97, R$197, R$997)

---

## ABA: AFILIADOS

- Código único `SMP-XXXXXX` + link + QR Code
- Stats: indicações, conversões, comissão acumulada
- Regra: 10% do plano/mês enquanto ativo
- **Página de Afiliado Personalizada:** mini landing page com URL `/ref/SMP-XXXXXX` com nome do afiliado destacado
- Painel Admin: lista todos, "Marcar como Pago", total a pagar no mês

---

## ABA: EQUIPE

Membros com avatar gradiente, papel (badge colorido), plano, status, data entrada
Botões editar/remover (admin/gerente)
Papéis: Admin (branco) | Gerente (azul) | Suporte (verde) | Analista (amarelo) | Financeiro (roxo) | Moderador (vermelho)

---

## ABA: ADMIN (Somente role=admin)

### Gerenciar Usuários
Tabela: usuário | nome | papel | plano | trial (dias restantes) | status | ações
- Editar senha, papel, plano
- Estender trial: `[+3 dias]`
- Ativar/Desativar | Remover (com confirmação)
- Adicionar usuário: campos completos + toggle "Ativar trial"

### Configurações do Sistema
- Nome da plataforma | Logo (upload) | Mensagem de boas-vindas
- Links Kiwify para cada plano
- **Alertas globais:** banner configurável para todos os usuários
- **Pares por plano:** quais pares cada plano pode acessar (ex: cripto só Pro/Premium)
- **Mensagem de upgrade:** texto personalizado na tela de bloqueio pós-trial
- **WhatsApp de suporte:** número do botão flutuante
- **URL do vídeo de boas-vindas**
- **Número de vagas do vitalício**
- **Cupons de desconto:** cadastrar/gerenciar

### Painel de Sugestões do Admin
Card mostrando recomendações automáticas:
*"Nos últimos 7 dias, sinais na sessão Ásia tiveram 48% de assertividade. Recomendamos aumentar o score mínimo para 70% nessa sessão."*
Botão "Aplicar sugestão automaticamente"

### Sistema de Tickets de Suporte
- Lista de tickets: título, usuário, status (Aberto/Em Análise/Resolvido), data
- Responder ticket → notificação para o usuário
- Admin pode enviar push notification para todos os usuários ativos

---

## FUNCIONALIDADES GLOBAIS

### Tour de Onboarding (Primeira vez)
Tooltips animados guiando o usuário: painel WIN/LOSS → seletor de ativo → card do sinal → botões WIN/LOSS → histórico
Botão "Pular tour" sempre disponível. Progresso salvo no localStorage.

### PWA (Progressive Web App)
- Manifest + Service Worker + funcionamento offline
- Splash screen animada com logo ao abrir
- Ícone personalizado na tela inicial
- Shortcuts PWA: "Abrir Sinais" e "Ver Histórico"
- Status Bar com cor do tema (meta theme-color)
- Safe Area Insets para iPhones com notch

### Modo Offline Inteligente
- Banner "📡 Sem conexão — Sinais pausados" ao perder internet
- Ao reconectar: sincroniza histórico pendente + retoma engine

### FAB Mobile (Floating Action Button)
Botão flutuante no canto inferior direito com ações rápidas:
➕ Registrar operação manual | 📊 Ver assertividade | 🔊 Toggle som

### Gestos de Swipe (Mobile)
- Swipe direita no card do sinal → WIN ✅ com vibração positiva
- Swipe esquerda → LOSS ❌ com vibração curta
- Pull to refresh no topo da tela de sinais

### Modo Foco (Pomodoro do Trader)
Timer configurável (ex: 60min operar + 15min pausa). Ao terminar: som de intervalo + frase motivacional + sugestão de pausa.

### Modo Mão Única (Mobile)
Toggle que move todos os botões importantes para a parte inferior da tela.

### Retrato Fixo
Toggle para travar orientação em retrato no mobile.

### Botão WhatsApp Flutuante
Ícone verde fixo no canto direito → abre `wa.me/[número]` com mensagem pré-definida de suporte.

### Tema Dark/Light
Toggle no rodapé da sidebar. Sincronizado com preferência do sistema.

### Alerta de Streak de Perdas
Banner vermelho + som diferenciado + vibração ao atingir X perdas seguidas.

### Notificações Web Push
Permissão solicitada no login. Notifica sinais FORTE mesmo com app em segundo plano.

### Responsividade Mobile
Sidebar → drawer (hambúrguer). Cards empilham. Touch-friendly (botões ≥44px).
Bottom Navigation Bar nativo. Pull to refresh. Gestos de swipe.

---

## ESTRUTURA DE DADOS (localStorage)

```javascript
smpU7: [{
  id, user, pass, name, role, plan, refCode, referredBy, createdAt,
  trialEndsAt, favoriteAsset, preferredCategory,
  riskProfile,        // 'conservative'|'moderate'|'aggressive'
  language,           // 'pt'|'en'|'es'
  timezone,           // ex: 'America/Sao_Paulo'
  currency,           // 'BRL'|'USD'|'EUR'
  pin,                // PIN de 4 dígitos (hash)
  twoFactorEnabled,   // bool
  sessionTimeout,     // minutos
  privacyMode,        // bool
  activityLog: []     // últimos 10 acessos
}]

smpH7: [{
  id, asset, assetCategory, dir, score, qual, sess, adx,
  indicators, votes, fingerprint, ts, result,
  volatility, spread, atr, entropy,
  dnaMatch, mmTrap, consensus, temporalBias,
  ecosystemScore, asymmetryBias,
  mlAdjusted, lossContext  // dados para análise de LOSS
}]

smpCfg7: {
  minScore,       // padrão: 65
  maxLoss, sound, cryptoSound, vibration, tts,
  forteOnly,      // padrão: true
  theme, accentColor, mlEnabled,
  newsFilterEnabled, newsBuffer, pumpDumpBlock,
  weightProfile, weights, newsEvents,
  tgToken, tgChatId, tgAutoSend, tgForteOnly,
  kiwifyLinks: { basic, pro, premium, lifetime },
  lifetimeSlots, supportWhatsapp, welcomeVideoUrl,
  animations, focusMode, focusDuration, singleHandMode
}

smpML7: {
  // Pesos ML por contexto: "sessao_categoria" → { indicador: peso }
  // Ex: "ny_crypto" → { ema: 0.24, rsi: 0.20, ... }
}

smpAchievements7: [{ userId, unlocked:[], progress:{} }]
smpPix7: { key, name }
smpDiary7: [{ ts, mood, notes, lessons, pnl, ops, assetsTraded }]
smpNotif7: [{ ts, title, msg, type, read }]
smpGoals7: { daily, weekly, monthly, currentDaily, history:[] }
smpAff7:   [{ userId, commissions:[] }]
smpTickets7: [{ id, userId, title, desc, status, ts, reply }]
smpCoupons7: [{ code, discount, expiry, plan, active }]
smpSnapshots7: [{ week, signals, winRate, bestDay, bestPair, pnl, mood }]
```

---

## MAPEAMENTO ATIVOS → TRADINGVIEW

```javascript
const TV_SYMBOLS = {
  BTCUSD:'BINANCE:BTCUSDT', ETHUSD:'BINANCE:ETHUSDT',
  SOLUSD:'BINANCE:SOLUSDT', BNBUSD:'BINANCE:BNBUSDT',
  ADAUSD:'BINANCE:ADAUSDT', DOGEUSD:'BINANCE:DOGEUSDT',
  XRPUSD:'BINANCE:XRPUSDT', LTCUSD:'BINANCE:LTCUSDT',
  EURUSD:'FX:EURUSD',  GBPUSD:'FX:GBPUSD',
  USDJPY:'FX:USDJPY',  AUDUSD:'FX:AUDUSD',
  USDCAD:'FX:USDCAD',  NZDUSD:'FX:NZDUSD',
  EURGBP:'FX:EURGBP',  GBPJPY:'FX:GBPJPY',
  XAUUSD:'TVC:GOLD',   XAGUSD:'TVC:SILVER',
  USOIL:'TVC:USOIL'
}
```

---

## BIBLIOTECAS CDN

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script src="https://s3.tradingview.com/tv.js"></script>
```

---

## NOTAS TÉCNICAS

1. Sem backend — localStorage + objeto MEM como fallback
2. Sem inline handlers — só addEventListener
3. IIFE: `(function(){ 'use strict'; ... })()`
4. Compatível com file:// — sem APIs que bloqueiem origem nula
5. Signal Engine: setInterval 1s, emite no segundo 48
6. TradingView: recriar widget ao trocar ativo
7. Charts: destruir instância anterior antes de recriar
8. PWA: manifest como data URI + Service Worker inline
9. Sons: Web Audio API pura (oscillators) + Web Speech API para TTS
10. Vibração: navigator.vibrate()
11. Trial: trialEndsAt = Date.now() + 3×24×60×60×1000
12. Conquistas: verificar ao marcar WIN/LOSS e ao completar metas
13. DNA de Candle: fingerprint gerado por fórmula real (bodyRatio, shadows, direction)
14. Entropia: cálculo de Shannon sobre sequência binária das últimas 20 velas
15. Consenso: rodar engine 5x com variação ±10% nos pesos — bloquear se < 4/5
16. Kiwify: links externos configurados pelo Admin, abrem em nova aba
17. Canvas API: exportar sinal como PNG sem bibliotecas externas
18. Swipe: detectar via touch events (touchstart/touchend)
19. CountUp: animação JS pura nos números ao carregar
20. Separação Admin/User: verificar role no localStorage em cada aba
21. **CRÍTICO:** Indicadores EMA, RSI, MACD, ADX, ATR, OBV, Bollinger, Stoch —
    implementar com as fórmulas matemáticas exatas fornecidas. JAMAIS usar
    Math.random() para calcular indicadores. Binance WebSocket para cripto,
    random walk Ornstein-Uhlenbeck para Forex/Commodities.
22. Score mínimo padrão: 65% (não 55%)
23. ML salvo em smpML7 no localStorage, inicializado com BASE_WEIGHTS
24. Buffer de velas: máx 200 candles M1, M5/M15 derivados automaticamente

---

## FLUXO PRINCIPAL

```
Landing Page → [Assinar] → Kiwify (externo) → Admin ativa acesso
             → [Criar Conta] → Cadastro 3 etapas + Quiz → Trial 3 dias → Dashboard

Login → Tour de Onboarding (1ª vez) → Sidebar → Sinais (default)
  ↓
Frase do Dia + Dica do Dia
  ↓
Session Timer + Termômetro de Mercado + Banner Trial
  ↓
Painel WIN/LOSS (flip counter) + Painel Assertividade (gauge) + Índice de Confiança
  ↓
Selector de Ativo (Cripto/Forex/Commodities)
  ↓
loadHistoricalCandles() → connectWebSocket() → Buffer M1 preenchido
  ↓
DNA Temporal + Ecossistema + Entropia + Preditor Vela
  ↓
Signal Engine (setInterval 1s) → Segundo 48:
  1. getIndicatorVotes()     → EMA/RSI/MACD/BB/Stoch/ADX/ATR/OBV/Candle (fórmulas reais)
  2. calcFinalScore()        → Pesos ML + bônus sessão + penalidades
  3. validateSignal()        → 8 regras duras (score, ADX, tendência, RSI, confluência...)
  4. detectMMTrap()          → spike + rejeição + volume anormal
  5. calcConsensus()         → 5 engines, bloquear se < 4/5
  6. calcEntropy()           → Shannon nas últimas 20 velas
  7. generateFingerprint()   → DNA das últimas 7 velas
  8. matchFingerprint()      → comparar com histórico localStorage
  ↓
Score final → Qualidade (5 níveis, mín 65%) → Filtro mínimo
  ↓
Sinal válido → Card animado + Som diferenciado + Vibração + Push + Telegram
  ↓
WIN/LOSS (clique ou swipe) → updateMLWeights() → Conquistas → Stats → Leaderboard
  ↓
Snapshot automático semanal → Relatório "Por que perdemos?"
```

---

## CHECKLIST COMPLETO v7

### Autenticação & Onboarding
- [x] Landing page premium com Kiwify
- [x] Login glassmorphism com animações
- [x] Frases motivacionais rotativas
- [x] Cadastro multi-step com quiz de risco
- [x] Recuperação de senha 3 passos
- [x] Trial 3 dias + período de graça 24h
- [x] Tour de onboarding interativo
- [x] Vídeo de boas-vindas (URL admin)
- [x] Dica do dia ao abrir o app

### Motor de Sinais & Assertividade
- [x] Binance WebSocket para dados reais de cripto
- [x] Random walk Ornstein-Uhlenbeck para Forex/Commodities
- [x] Buffer de velas M1 (200 candles) + M5/M15 derivados
- [x] EMA 9/21/50 — fórmula matemática real
- [x] RSI(14) — fórmula Wilder real
- [x] MACD(12,26,9) — fórmula real
- [x] Bollinger Bands(20,2) — desvio padrão real
- [x] Stochastic %K(14) — fórmula real
- [x] ADX(14) — Wilder's smoothing real
- [x] ATR(14) — True Range real
- [x] OBV — acumulação/distribuição real
- [x] ML por contexto separado (smpML7)
- [x] Confluência obrigatória por categoria
- [x] Filtro HTF M5/M15 (derivado do buffer M1)
- [x] ADX mínimo 18 + Modo Tendência/Lateral adaptativo
- [x] Filtro S/R zones
- [x] Divergência RSI
- [x] Padrões de candle expandidos (10+ padrões matemáticos)
- [x] ATR adaptativo (penalidade/bônus)
- [x] Filtro horário morto
- [x] 🧬 DNA de Candle (fingerprint matemático real)
- [x] 🪤 Detector MM Trap (spike+rejeição+volume)
- [x] 🌡️ Entropia de Shannon (20 velas)
- [x] 📅 DNA Temporal (dia/hora)
- [x] 🌐 Score de Ecossistema
- [x] 🔮 Preditor de Fechamento de Vela
- [x] 🌐 Consenso Multi-Universo (5x engine, mín 4/5)
- [x] 📐 Momentum Assimétrico
- [x] Qualidade em 5 níveis (mín 62%, padrão 65%)
- [x] Sinal do Dia ⭐
- [x] Painel de Assertividade com gauge SVG animado
- [x] Índice de Confiança Composto
- [x] Signal Reasoning ("Por que este sinal?")
- [x] Histórico 48h no card do sinal
- [x] Benchmark comparison (vs 50% sem ferramenta)

### Multi-Ativo & Cripto
- [x] 21 pares em 3 categorias
- [x] Aviso de volatilidade cripto
- [x] Melhor janela horária por ativo
- [x] Sessões cripto adaptadas (24h)
- [x] Detector Pump/Dump (variação >5% em 15min)
- [x] Dominância BTC afetando altcoins
- [x] Correlação BTC+ETH

### Sons, Vibração & Notificações
- [x] Sons diferenciados Forex vs Cripto (Web Audio API pura)
- [x] Som exclusivo BTC/USD
- [x] Som PREMIUM especial
- [x] Text-to-Speech (Web Speech API)
- [x] Vibração diferenciada por tipo de evento
- [x] Alarm Pump/Dump
- [x] Web Push Notifications
- [x] Alerta streak de perdas

### UX & Design
- [x] Glassmorphism em todos os cards
- [x] Animações de entrada em cascata
- [x] CountUp em todos os números
- [x] Flip counter WIN/LOSS
- [x] Score reveal (slot machine)
- [x] Hover 3D nos cards
- [x] Shimmer nas barras de progresso
- [x] Transição de abas (slide)
- [x] 5 temas visuais
- [x] Skin por plano (básico/pro/premium)
- [x] Scrollbar personalizada
- [x] Loading skeleton
- [x] Empty states ilustrados
- [x] Micro-animações nos ícones
- [x] Bottom Navigation Bar mobile
- [x] Pull to Refresh
- [x] Swipe gestures (WIN/LOSS)
- [x] FAB Mobile
- [x] Safe Area Insets (iPhone)
- [x] Splash Screen animada (PWA)
- [x] Desktop: 3 colunas + painel lateral fixo
- [x] Atalhos de teclado
- [x] Modo Mão Única
- [x] Modo Foco (Pomodoro)
- [x] Retrato fixo mobile

### Proteção & Segurança
- [x] Alerta FOMO
- [x] Alerta overtrading
- [x] Modo Proteção de Banca (bloqueio automático)
- [x] Modo Privacidade (ocultar valores)
- [x] PIN de acesso rápido
- [x] 2FA simulado
- [x] Timeout de sessão
- [x] Log de atividade

### Gestão & Relatórios
- [x] Diário emocional + análise de correlação
- [x] Banca 3 estratégias + simulador em tempo real
- [x] Calculadora de risco + modo cripto
- [x] Calendário de performance
- [x] Snapshot semanal automático
- [x] Relatório "Por que perdemos?"
- [x] Replay de sinais
- [x] Exportar sinal como PNG (Canvas API)
- [x] Compartilhar no WhatsApp
- [x] PDF premium + Certificado de Conquistas
- [x] Excel com 4 sheets
- [x] Backup/Restore JSON
- [x] Comparativo de períodos
- [x] Dashboard comparativo de ativos

### Sistema & Admin
- [x] Conquistas com 20+ badges
- [x] Leaderboard por categoria + Sala de Sinais
- [x] Afiliados + página personalizada `/ref/`
- [x] Tickets de suporte in-app
- [x] Admin: gestão trial + links Kiwify + cupons
- [x] Admin: alertas globais + push para todos
- [x] Admin: sugestões automáticas de ajuste
- [x] Status de Serviço
- [x] Painel de mensalidades (vencendo hoje/3 dias)
- [x] Plano vitalício com contador de vagas
- [x] Cupons de desconto
- [x] Multi-idioma (PT/EN/ES)
- [x] Fuso horário configurável
- [x] Formato de moeda (R$/$/€)
- [x] Estratégias educativas + Glossário
- [x] PWA completo + Offline inteligente
- [x] Dark/Light + 5 temas
- [x] WhatsApp flutuante de suporte
- [x] 100% responsivo mobile
- [x] Separação total Admin/Usuário

---

*SignalMaster Pro v7 Ultimate — A plataforma mais completa e inovadora de sinais para opções binárias. Forex, Cripto e Commodities com tecnologia exclusiva de DNA de Candle, Detector de Armadilha MM, Entropia de Mercado e Consenso Multi-Universo. Motor de sinais com indicadores matemáticos reais via Binance WebSocket.*
