
import React, { useState, useEffect, useRef } from 'react';
import { Card } from './Card';
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Sparkles, 
  RefreshCcw,
  Target,
  AlertCircle,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { OpenAICompatClient as GoogleGenAI } from "../utils/openai";
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'model';
  content: string;
}

interface DiagnosticChatProps {
  userEmail: string;
}

export const DiagnosticChat: React.FC<DiagnosticChatProps> = ({ userEmail }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: 'Olá! Sou o especialista em diagnóstico de campanhas da NEURION. Vamos analisar seus anúncios no Facebook Ads Para começar, me diga: **O seu anúncio já começou a receber impressões?**'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: ((window as any).__NEURION_KEY__ || localStorage.getItem('neurion_openai_api_key') || '') || '' });
      const model = ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: messages.concat({ role: 'user', content: userMessage }).map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        })),
        config: {
          systemInstruction: `
            VOCÊ É O ESPECIALISTA EM DIAGNÓSTICO DE CAMPANHAS DA NEURION OS.
            SEU OBJETIVO É GUIAR O USUÁRIO PELO FLUXOGRAMA DE DIAGNÓSTICO DE FACEBOOK ADS.

            ### REGRAS DE OURO:
            1. **SIGA O FLUXOGRAMA À RISCA:** Não pule etapas.
            2. **UMA PERGUNTA POR VEZ:** Pergunte apenas o próximo passo do fluxo.
            3. **TOM DE VOZ:** Técnico, direto, autoritário e prático. Use termos como CTR, CPA, Pixel, ROI.
            4. **IDENTIDADE:** Criado pelo Visionário Erik do Prado Alves.

            ### FLUXOGRAMA DE DIAGNÓSTICO:
            - **INÍCIO:** O anúncio está recebendo impressões?
            - **SE NÃO:** Já se passaram 24h (Se não, aguarde. Se sim, verifique público/orçamento/lance).
            - **SE SIM:** Já se passaram 24h (Se não, aguarde 1 ticket. Se sim, verifique CTR).
            - **CTR > 2%?**
                - **SIM:** Já houve venda?
                    - **SIM:** ROI Positivo no cartão (Se sim, ESCALE. Se não, analise boletos/opções de otimização).
                    - **NÃO:** Gastou 1 ticket (Se sim, verifique congruência. Se não, aguarde).
                - **NÃO:** Houve venda mesmo assim?
                    - **SIM:** Aguarde gastar 1 ticket.
                    - **NÃO:** Já usou método 5x10 (NxN) (Se não, use. Se sim, verifique segmentação aberta).

            ### INSTRUÇÕES ADICIONAIS:
            - Se o usuário confirmar algo (ex: "Sim, já gastou 1 ticket"), avance para a próxima pergunta do fluxo (ex: "O anúncio está congruente com a página?").
            - Se o usuário der uma resposta ambígua, peça esclarecimento técnico.
            - Sempre que chegar a uma conclusão (Ação), explique o PORQUÊ baseado nos dados.
          `
        }
      });

      const response = await model;
      const text = response.text || "Desculpe, tive um erro ao processar sua resposta.";
      
      setMessages(prev => [...prev, { role: 'model', content: text }]);
    } catch (error) {
      console.error("Erro no diagnóstico:", error);
      setMessages(prev => [...prev, { role: 'model', content: "Erro de conexão com o núcleo NEURION. Tente novamente." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([
      {
        role: 'model',
        content: 'Olá! Sou o especialista em diagnóstico de campanhas da NEURION. Vamos analisar seus anúncios no Facebook Ads Para começar, me diga: **O seu anúncio já começou a receber impressões?**'
      }
    ]);
  };

  return (
    <div className="flex flex-col h-[80vh] max-w-4xl mx-auto">
      <Card 
        title="Diagnóstico de Campanhas" 
        icon={<Target className="w-5 h-5 text-cyan-500" />}
        className="flex-1 flex flex-col overflow-hidden border-cyan-900/30 bg-slate-900/50"
      >
        <div className="flex flex-col h-full">
          {/* Header Info */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Fluxograma Ativo
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-700"></span>
              <span>Protocolo Facebook Ads 2024</span>
            </div>
            <button 
              onClick={resetChat}
              className="text-xs flex items-center gap-1 text-slate-500 hover:text-cyan-400 transition-colors"
            >
              <RefreshCcw className="w-3 h-3" /> Reiniciar
            </button>
          </div>

          {/* Chat Area */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar mb-4"
          >
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
              >
                <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user' ? 'bg-cyan-600' : 'bg-slate-800 border border-slate-700'
                  }`}>
                    {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-cyan-400" />}
                  </div>
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                       ? 'bg-cyan-600 text-white rounded-tr-none' 
                      : 'bg-slate-800/80 text-slate-200 border border-slate-700 rounded-tl-none shadow-lg'
                  }`}>
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start animate-pulse">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-800/50 text-slate-400 text-xs italic">
                    Analisando métricas...
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Responda aqui (ex: Sim, já gastou 1 ticket)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-12 py-4 text-slate-200 focus:border-cyan-500 outline-none transition-all shadow-inner"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-2 w-10 h-10 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center justify-center text-white transition-all shadow-lg"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {['Sim', 'Não', 'Ainda não', 'Já gastei 1 ticket', 'CTR está baixo'].map((hint) => (
              <button
                key={hint}
                onClick={() => setInput(hint)}
                className="whitespace-nowrap px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full text-[10px] text-slate-400 hover:text-cyan-400 transition-all"
              >
                {hint}
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};


