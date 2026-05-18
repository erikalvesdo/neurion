
import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { 
  Copy, 
  Download, 
  Link as LinkIcon, 
  Code2, 
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Eye,
  MonitorPlay,
  Sparkles,
  Pencil,
  Trash2,
  Wand2,
  XCircle,
  Zap
} from 'lucide-react';
import { OpenAICompatClient as GoogleGenAI } from "../utils/openai";
import JSZip from 'jszip';

interface PageClonerProps {
  userEmail: string;
  onStatusChange?: (isGenerating: boolean) => void;
}

export const PageCloner: React.FC<PageClonerProps> = ({ userEmail, onStatusChange }) => {
  const [htmlInput, setHtmlInput] = useState('');
  const [originalBaseUrl, setOriginalBaseUrl] = useState(''); 
  const [checkoutUrl, setCheckoutUrl] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedHtml, setProcessedHtml] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0); 

  // AI Refinement State
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [refinementMode, setRefinementMode] = useState<'smart' | 'full'>('smart');

  // --- LOGIC: PROCESS CLONING ---
  const processCloning = async (overrideHtml?: string, overrideBaseUrl?: string) => {
      const htmlToProcess = overrideHtml || htmlInput;
      const baseToUse = overrideBaseUrl || originalBaseUrl;

      if (!htmlToProcess) {
          alert("Insira o código HTML na caixa de texto.");
          return;
      }
      
      // Auto-prompt for Base URL if it looks like it needs one (Next.js assets often start with /)
      if (!baseToUse && (htmlToProcess.includes('/_next/') || htmlToProcess.includes('src="/'))) {
          const userUrl = prompt("URL ORIGINAL NECESSÁRIA:\nPara que as imagens e estilos carreguem corretamente, precisamos do link original (ex: https://site.com):");
          if (userUrl) {
               setOriginalBaseUrl(userUrl);
               // Recursive call with new base
               processCloning(htmlToProcess, userUrl);
               return;
          }
      }
      
      setIsProcessing(true);

      try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlToProcess, 'text/html');
          const finalBaseUrl = baseToUse || originalBaseUrl;

          // 1. SUPRESSOR DE ERROS (ANTI-WHITE SCREEN & NEXT.JS HYDRATION FIX)
          // Based on the Audit, we inject a script to mock React hydration events
          const antiCrashScript = doc.createElement('script');
          antiCrashScript.innerHTML = `
            window.onerror = function() { return true; }; 
            window.console.error = function() { }; 
            window.fbq = function(){}; 
            window.gtag = function(){};
            
            // ANTI-FRAGILE HYDRATION MOCK (From Neurion Audit)
            window.addEventListener('load', function() {
                if (window.__NEXT_DATA__ || window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
                    // Triggers events that might unblock lazy loaded content
                    document.dispatchEvent(new Event('DOMContentLoaded'));
                    window.dispatchEvent(new Event('resize'));
                    window.dispatchEvent(new Event('scroll'));
                }
            });
          `;
          doc.head.insertBefore(antiCrashScript, doc.head.firstChild);

          // 2. REESCRITA ABSOLUTA DE ASSETS (Hard Fix para Next.js)
          if (finalBaseUrl) {
              const elements = doc.querySelectorAll('[src], [href], [srcset]');
              elements.forEach(el => {
                  ['src', 'href', 'srcset'].forEach(attr => {
                      const val = el.getAttribute(attr);
                      if (val && val.startsWith('/')) {
                          el.setAttribute(attr, finalBaseUrl + val);
                      }
                  });
              });

              // Base Tag Fallback
              const existingBase = doc.querySelector('base');
              if (existingBase) existingBase.remove();
              const baseTag = doc.createElement('base');
              baseTag.href = finalBaseUrl.endsWith('/') ? finalBaseUrl : `${finalBaseUrl}/`;
              doc.head.insertBefore(baseTag, doc.head.firstChild);
          }

          // 3. CHECKOUT REPLACEMENT
          let replacedCount = 0;
          
          if (checkoutUrl) {
              // Limpeza básica de links
              const anchors = doc.querySelectorAll('a');
              anchors.forEach(a => {
                  const href = a.getAttribute('href');
                  if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                      // Check for generic payment/checkout terms
                      if (href.includes('pay') || href.includes('checkout') || href.includes('kiwify') || href.includes('hotmart') || href.includes('eduzz')) {
                          a.href = checkoutUrl;
                          replacedCount++;
                      }
                  }
              });
          }

          // 4. SERIALIZE
          const newHtml = doc.documentElement.outerHTML;
          setProcessedHtml(newHtml);
          setPreviewKey(prev => prev + 1);
          
      } catch (error) {
          console.error(error);
          alert("Erro ao processar o HTML.");
      } finally {
          setIsProcessing(false);
      }
  };

  // --- LOGIC: AI REFINEMENT ---
  const handleAiRefinement = async () => {
      if (!processedHtml || !refinementPrompt) return;
      
      let apiKey = ((window as any).__NEURION_KEY__ || localStorage.getItem('neurion_openai_api_key') || '');
      if (!apiKey) {
      }

      if (!apiKey) {
          alert("Configure sua API Key nas configurações para usar a IA.");
          return;
      }

      setIsRefining(true);
      if (onStatusChange) onStatusChange(true);
      setRefinementMode('smart'); // Reset visualization

      try {
          const ai = new GoogleGenAI({ apiKey });
          
          // OTIMIZAÇÃO HÍBRIDA DE VELOCIDADE & SEGURANÇA:
          // A IA decide se retorna apenas um patch CSS (Instantâneo) ou o HTML inteiro (Demorado).
          // CRÍTICO: Instruções de segurança para não quebrar a página ao traduzir.
          const result = await ai.models.generateContent({
              model: 'gemini-2.5-flash', 
              config: {
                  systemInstruction: `
                    VOCÊ É UM OTIMIZADOR DE PÁGINAS WEB ULTRA-RÁPIDO.
                    
                    SEU OBJETIVO: Atender a solicitação do usuário da maneira MAIS RÁPIDA possível.

                    PROTOCOLO DE DECISÃO:
                    1. MUDANÇAS VISUAIS SIMPLES (Cor, Fundo, Tamanho, Margem, Ocultar elemento, Bordas, Fontes):
                       - NÃO RETORNE O HTML COMPLETO.
                       - RETORNE APENAS UM BLOCO <style> com CSS !important para forçar a mudança.
                       - Exemplo de resposta: <style> body { background-color: #000 !important; } .btn { color: white !important; } </style>

                    2. MUDANÇAS DE CONTEÚDO (TRADUÇÃO, TEXTO, ESTRUTURA, IMAGENS):
                       - VOCÊ PRECISA REESCREVER O CÓDIGO HTML.
                       - REGRA DE OURO (ANTI-BLACK SCREEN): VOCÊ É ESTRITAMENTE PROIBIDO DE REMOVER TAGS <HEAD>, <SCRIPT>, <LINK> OU <STYLE> EXISTENTES.
                       - Se você remover os scripts/estilos originais, a página ficará QUEBRADA (TELA PRETA).
                       - Mantenha toda a estrutura técnica, altere APENAS o texto visível ou as imagens solicitadas.
                       - RETORNE O CÓDIGO HTML COMPLETO E VÁLIDO.
                       
                    REGRA CRUCIAL: Retorne APENAS o código. Sem markdown (~~~). Sem explicação.
                  `,
                  temperature: 0.3, 
              },
              contents: [
                  {
                      parts: [
                          { text: `CÓDIGO ATUAL:\n${processedHtml}` }, // Pass full HTML, do not truncate to avoid data loss
                          { text: `SOLICITAÇÃO: ${refinementPrompt}` }
                      ]
                  }
              ]
          });

          let output = result.text || '';
          output = output.replace(/^```html/, '').replace(/^```css/, '').replace(/^```/, '').replace(/```$/, '').trim();

          if (output.length < 10) throw new Error("Resposta da IA inválida");

          // HYBRID HANDLER
          if (output.startsWith('<style') && output.endsWith('</style>')) {
              // MODE: FAST CSS PATCH
              console.log("Neurion: Aplicando Patch CSS Rápido");
              setRefinementMode('smart');
              // Inject style before head close, or at end of body if no head
              let newHtml = processedHtml;
              if (newHtml.includes('</head>')) {
                  newHtml = newHtml.replace('</head>', `${output}\n</head>`);
              } else {
                  newHtml = newHtml + output;
              }
              setProcessedHtml(newHtml);
          } else {
              // MODE: FULL REWRITE
              console.log("Neurion: Reescrevendo HTML Completo");
              setRefinementMode('full');
              setProcessedHtml(output);
          }

          setPreviewKey(prev => prev + 1);
          setRefinementPrompt('');
          
      } catch (error) {
          console.error(error);
          // Fallback to simpler instruction if hybrid fails
          alert("A IA teve dificuldade ou o código é muito grande.");
      } finally {
          setIsRefining(false);
          if (onStatusChange) onStatusChange(false);
      }
  };

  const handleDownload = async () => {
      if (!processedHtml) return;
      const zip = new JSZip();
      zip.file("index.html", processedHtml);
      zip.file("LEIA_ME.txt", "Para funcionar perfeitamente, hospede este arquivo (Vercel, Netlify). Testar direto no computador pode bloquear alguns scripts devido a segurança do navegador.");
      
      const blob = await zip.generateAsync({type:"blob"});
      const element = document.createElement("a");
      element.href = URL.createObjectURL(blob);
      element.download = "Pagina_Clonada_Neurion.zip";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
  };

  const handleReset = () => {
      setProcessedHtml(null);
      setHtmlInput('');
      setOriginalBaseUrl('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
      
      {/* LEFT: CONTROLS */}
      <div className="lg:col-span-4 space-y-6">
        <Card title="Clonador AI (Manual)" icon={<Copy className="w-5 h-5 text-emerald-400" />}>
            <div className="space-y-4">
                
                {/* CREDIT TO CREATOR */}
                <div className="bg-gradient-to-r from-cyan-900/40 to-blue-900/40 border border-cyan-500/30 p-3 rounded-lg flex items-center justify-center gap-2 mb-2 shadow-inner">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <p className="text-xs text-cyan-200 font-bold tracking-wide">
                        Essa ferramenta é única e feita exclusivamente pelo criador.
                    </p>
                </div>

                {/* WARNING BOX */}
                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-amber-400">Atenção: Não clona Quizzes</p>
                        <p className="text-xs text-slate-400 mt-1">
                            Esta ferramenta é exclusiva para clonar <strong>Páginas de Vendas Estáticas</strong> (Landing Pages, VSLs, Advertoriais).
                            <br/><br/>
                            Ela <strong>não funciona</strong> em Quizzes dinâmicos ou sites que dependem de lógica complexa de servidor.
                        </p>
                    </div>
                </div>

                <div>
                    <div className="mb-4 bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-lg">
                        <label className="block text-xs font-bold text-yellow-400 mb-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            URL ORIGINAL (Obrigatório)
                        </label>
                        <input 
                            type="text" 
                            value={originalBaseUrl}
                            onChange={(e) => setOriginalBaseUrl(e.target.value)}
                            placeholder="https://site-da-pagina.com"
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-yellow-500 outline-none placeholder:text-slate-600"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                            Essencial para carregar imagens e CSS corretamente (Ex: Next.js).
                        </p>
                    </div>
                    
                    <label className="block text-sm font-medium text-slate-400 mb-1 flex justify-between">
                        Código HTML (Source Code)
                        <span className="text-xs text-slate-500">Ctrl+U no site original</span>
                    </label>
                    <textarea 
                        value={htmlInput}
                        onChange={(e) => setHtmlInput(e.target.value)}
                        placeholder="Cole o código fonte (view-source) aqui..."
                        className="w-full h-48 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-mono resize-none scrollbar-hide"
                    />
                </div>

                {/* CHECKOUT REPLACEMENT */}
                <div className="bg-emerald-900/10 border border-emerald-500/30 p-3 rounded-lg">
                    <label className="block text-sm font-bold text-emerald-400 mb-1 flex items-center gap-2">
                        <LinkIcon className="w-4 h-4" /> Seu Link de Checkout
                    </label>
                    <input 
                        type="text" 
                        value={checkoutUrl}
                        onChange={(e) => setCheckoutUrl(e.target.value)}
                        placeholder="https://pay.kiwify.com.br/..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-emerald-800/50"
                    />
                    <p className="text-[9px] text-emerald-400/60 mt-2">
                        Substituiremos automaticamente os links de compra da página original pelo seu link.
                    </p>
                </div>

                <button 
                    onClick={() => processCloning()}
                    disabled={isProcessing}
                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                    Clonar Página de Vendas
                </button>

                {processedHtml && (
                    <div className="mt-6 pt-6 border-t border-slate-700 space-y-4 animate-in slide-in-from-top-2">
                        
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                Clone Pronto
                            </h4>
                            <button onClick={handleReset} className="text-xs text-slate-500 hover:text-rose-400 transition-colors" title="Limpar">
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                        
                        {/* AI REFINEMENT INPUT */}
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-600 shadow-inner relative overflow-hidden">
                            {/* Fast Mode Indicator */}
                            <div className="absolute top-0 right-0 p-1.5 opacity-20">
                                <Zap className="w-12 h-12 text-cyan-400" />
                            </div>

                            <label className="text-xs font-bold text-slate-300 flex items-center gap-2 mb-3 relative z-10">
                                <div className="bg-cyan-500/20 p-1 rounded">
                                   <Sparkles className="w-3 h-3 text-cyan-400" />
                                </div>
                                Editor Mágico (IA Híbrida)
                            </label>
                            
                            <div className="relative z-10">
                                <input 
                                    type="text"
                                    value={refinementPrompt}
                                    onChange={(e) => setRefinementPrompt(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAiRefinement()}
                                    placeholder="Ex: Traduza para Português..."
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-3 pr-10 py-3 text-xs text-white focus:border-cyan-500 outline-none placeholder:text-slate-500 shadow-inner"
                                />
                                <button 
                                    onClick={handleAiRefinement}
                                    disabled={isRefining || !refinementPrompt}
                                    className="absolute right-1 top-1.5 p-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md disabled:opacity-50 transition-colors shadow-lg"
                                    title="Aplicar Ajuste"
                                >
                                    {isRefining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2 relative z-10">
                                *Dica: Alterações visuais são rápidas. Traduções exigem reescrita completa (pode demorar).
                            </p>
                        </div>

                        {/* DOWNLOAD BUTTON */}
                        <button 
                            onClick={handleDownload}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
                        >
                            <Download className="w-5 h-5" /> Baixar HTML Pronto
                        </button>

                    </div>
                )}

            </div>
        </Card>
      </div>

      {/* RIGHT: PREVIEW */}
      <div className="lg:col-span-8 flex flex-col h-full min-h-[600px]">
          <div className="bg-slate-900 border border-slate-800 rounded-xl flex-1 flex flex-col overflow-hidden shadow-2xl relative">
              
              {/* HEADER */}
              <div className="bg-slate-950 border-b border-slate-800 p-3 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                          <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                          <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
                      </div>
                      <div className="h-6 w-px bg-slate-800 mx-2"></div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Eye className="w-3 h-3" /> Preview
                      </span>
                  </div>
                  {processedHtml && (
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-900/20 px-3 py-1 rounded-full border border-emerald-900/50 animate-pulse">
                          <CheckCircle2 className="w-3 h-3" />
                          Links Trocados
                      </div>
                  )}
              </div>

              {/* IFRAME */}
              <div className="flex-1 bg-white relative">
                  {!processedHtml ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-500 p-8 text-center">
                          <MonitorPlay className="w-16 h-16 mb-4 opacity-20" />
                          <p className="text-lg font-medium">Aguardando...</p>
                          <p className="text-sm opacity-60 max-w-md mt-2">
                              Cole o código HTML da página de vendas e clique em "Clonar".
                          </p>
                      </div>
                  ) : (
                      <>
                        <iframe 
                            key={previewKey}
                            srcDoc={processedHtml}
                            className="w-full h-full border-none"
                            sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups" 
                            title="Cloned Page Preview"
                        />
                        
                        {/* WARNING IF NO BASE URL */}
                        {!originalBaseUrl && (htmlInput.includes('/_next/') || htmlInput.includes('src="/')) && (
                            <div className="absolute top-4 left-4 right-4 bg-red-600 text-white p-3 rounded shadow-xl text-center text-xs font-bold z-50">
                                ALERTA: Você não definiu a URL ORIGINAL. A página pode estar sem estilo (tela branca/quebrada).
                                <br/>Preencha o campo "URL ORIGINAL" na lateral esquerda.
                            </div>
                        )}

                        {isRefining && (
                            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-white">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-20 animate-pulse"></div>
                                    <Pencil className="w-12 h-12 text-cyan-400 mb-4 animate-bounce relative z-10" />
                                </div>
                                <h3 className="text-xl font-bold animate-pulse">Aplicando Ajustes...</h3>
                                <p className="text-sm text-slate-400 mt-2">
                                    {refinementMode === 'smart' ? 'Modo Turbo (CSS)' : 'Reescrevendo Estrutura (Pode demorar)'}
                                </p>
                            </div>
                        )}
                      </>
                  )}
              </div>

          </div>
      </div>

    </div>
  );
};


