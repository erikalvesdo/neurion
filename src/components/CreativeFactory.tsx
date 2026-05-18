
import React, { useState, useEffect, useRef } from 'react';
import { getModel } from '../utils/modelConfig';
import { generateImage } from '../utils/imageGen';
import { Card } from './Card';
import { BrainCircuit, Wand2, Download, Image as ImageIcon, Copy, Loader2, Sparkles, ShieldCheck, Layers, Palette, FileImage, PenTool, BookOpen, Type as TypeIcon, Paperclip, X, AlignLeft, ImageOff, FileText, CheckCircle2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { CreativeInput, FactoryResult, AngleResult, VisualStyle, VoiceCommand } from '../types';
import { OpenAICompatClient as GoogleGenAI, Type } from "../utils/openai";
import JSZip from 'jszip';
import { KNOWLEDGE_BASE } from '../data/knowledgeBase';

interface CreativeFactoryProps {
  onStatusChange?: (isGenerating: boolean) => void;
  voiceTrigger?: VoiceCommand | null;
  onVoiceTriggerHandled?: () => void;
  onCreativesGenerated?: (result: FactoryResult) => void;
  userEmail: string;
}

interface CopyPerformance {
  copyId: string;
  headline: string;
  cta?: string;
  approved: boolean;
  timestamp: number;
}

const INITIAL_INPUT: CreativeInput = {
  productName: '',
  niche: 'emagrecimento',
  targetAudience: '',
  painPoint: '',
  offerDetails: '',
  contentReferences: '',
  referenceImage: '',
  desire: '',
  mechanism: '',
  expertMode: true,
  textOnlyMode: false,
  angleCount: 1,
  visualStyle: 'cinematic'
};

export const CreativeFactory: React.FC<CreativeFactoryProps> = ({ onStatusChange, voiceTrigger, onVoiceTriggerHandled, onCreativesGenerated, userEmail }) => {
  const [input, setInput] = useState<CreativeInput>(INITIAL_INPUT);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [result, setResult] = useState<FactoryResult | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFeedback = (creative: any, isApproved: boolean) => {
      const feedback: CopyPerformance = {
          copyId: creative.id || Date.now().toString(),
          headline: creative.headline,
          approved: isApproved,
          timestamp: Date.now()
      };
      
      const existing = JSON.parse(localStorage.getItem(`neurion_copy_feedback_${userEmail}`) || '[]');
      existing.push(feedback);
      localStorage.setItem(`neurion_copy_feedback_${userEmail}`, JSON.stringify(existing));
      
      alert(isApproved ? "Feedback positivo registrado! A IA aprenderá com isso." : "Feedback negativo registrado. Ajustaremos os próximos.");
  };

  // --- HANDLE VOICE TRIGGER ---
  useEffect(() => {
      if (voiceTrigger && voiceTrigger.action === 'CREATE_CREATIVES' && !isGenerating) {
          const payload = voiceTrigger.payload;
          
          const voiceInput: CreativeInput = {
              ...input,
              productName: payload?.productName || input.productName || "Produto Sem Nome",
              angleCount: payload?.angleCount || 1,
              offerDetails: payload?.description || input.offerDetails || "Oferta gerada por voz",
              painPoint: payload?.painPoint || input.painPoint || "Dor genérica para criação rápida",
              visualStyle: payload?.visualStyle || input.visualStyle,
              expertMode: payload?.expertMode !== undefined ? payload.expertMode : input.expertMode,
              textOnlyMode: false
          };

          setInput(voiceInput);
          handleGenerate(true, voiceInput);

          if (onVoiceTriggerHandled) onVoiceTriggerHandled();
      }
  }, [voiceTrigger]);

  const speakCompletion = () => {
      const utterance = new SpeechSynthesisUtterance(`Os criativos estão prontos.`);
      utterance.lang = 'pt-BR';
      utterance.pitch = 0.8;
      utterance.rate = 1.1;
      window.speechSynthesis.speak(utterance);
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      alert("Texto copiado!");
  };

  // --- IMAGE UPLOAD HANDLER ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
          alert("A imagem deve ter no máximo 5MB.");
          return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
          const base64 = event.target?.result as string;
          setInput(prev => ({ ...prev, referenceImage: base64 }));
      };
      reader.readAsDataURL(file);
      e.target.value = ''; // Reset input
  };

  // --- ROBUST JSON PARSER HELPER ---
  const cleanAndParseJson = (text: string | undefined): FactoryResult => {
      if (!text) return { angles: [] };
      
      let cleaned = text.trim();
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```$/, '');
      
      // Basic repair for truncated JSON
      if (!cleaned.endsWith('}')) {
          if (!cleaned.endsWith(']')) cleaned += ']';
          if (!cleaned.endsWith('}')) cleaned += '}}';
      }

      const firstBrace = cleaned.indexOf('{');
      const firstBracket = cleaned.indexOf('[');
      
      let start = -1;
      let end = -1;
      
      if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
           start = firstBrace;
           end = cleaned.lastIndexOf('}');
      } else if (firstBracket !== -1) {
           start = firstBracket;
           end = cleaned.lastIndexOf(']');
      }
      
      if (start !== -1 && end !== -1) {
          cleaned = cleaned.substring(start, end + 1);
      }

      try {
          const parsed = JSON.parse(cleaned);
          
          if (Array.isArray(parsed)) {
              if (parsed.length > 0 && (parsed[0].angleName || parsed[0].creatives)) {
                  return { angles: parsed };
              }
              return { angles: [] };
          }

          if (parsed && typeof parsed === 'object') {
             if (Array.isArray(parsed.angles)) {
                 return parsed as FactoryResult;
             }
             if (parsed.angleName && Array.isArray(parsed.creatives)) {
                 return { angles: [parsed] };
             }
          }
          
          return { angles: [] }; 
      } catch (e) {
          console.error("Falha Crítica no JSON Parse:", e, "Texto:", text);
          return { angles: [] };
      }
  };

  const handleGenerate = async (isVoice: boolean = false, overrideInput?: CreativeInput) => {
    
    const currentInput = overrideInput || input;

    let apiKey = ((window as any).__NEURION_KEY__ || localStorage.getItem('neurion_openai_api_key') || '');
    if (!apiKey) {
    }

    if (!apiKey) {
      alert("Erro: Chave de API não configurada. Vá em Configurações (ícone de engrenagem) e adicione sua chave.");
      return;
    }

    if (!isVoice && (!currentInput.productName || !currentInput.painPoint || !currentInput.offerDetails)) {
      alert("Por favor, preencha as informações do produto (Nome, Dor e Oferta) para garantir a qualidade da copy.");
      return;
    }

    setIsGenerating(true);
    if (onStatusChange) onStatusChange(true);
    setResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });

      if (currentInput.textOnlyMode) {
          setGenerationStep('Aplicando Lógica Profunda e Escrevendo Copys...');
      } else {
          setGenerationStep('Extraindo contexto do produto e gerando conceitos...');
      }

      const visualInstruction = currentInput.visualStyle === 'wikihow' 
         ? "ESTILO VISUAL: WIKIHOW / ILUSTRAÇÃO TUTORIAL. \nREGRA DE OURO DO TEXTO: Se a imagem precisar ter algum texto escrito (ex: balão de fala, placa de aviso, rótulo), o 'imagePrompt' DEVE especificar explicitamente: 'text in Portuguese saying \"TEXTO AQUI\"'. \nPROIBIDO: Texto em inglês. Se for gerar texto, que seja em Português do Brasil."
        : "ESTILO VISUAL: FOTOGRAFIA CINEMATOGRÁFICA / REALISMO. \nREGRA DE OURO DO TEXTO: Evite texto se possível. MAS, se a cena exigir texto (ex: placa de rua, tela de celular, caderno), o 'imagePrompt' DEVE ordenar: 'text in Portuguese reading \"PALAVRA EM PT-BR\"'. \nPROIBIDO: Texto em inglês. Garanta que qualquer escrita seja em Português.";

      // Format Knowledge Base
      const kbContext = KNOWLEDGE_BASE.map(item => `Q: ${item.q}\nA: ${item.a}`).join('\n\n');

      let systemInstruction = `
        VOCÊ É A FÁBRICA DE CRIATIVOS "NEURION" — O SISTEMA MAIS AVANÇADO DE CRIAÇÃO DE ANÚNCIOS DO MUNDO.
        Você é um Diretor de Arte Premiado + Copywriter de Performance Sênior + Estrategista de CTR.
        
        SUA MISSÃO: Criar criativos que PAREM O SCROLL. Cada criativo deve ter uma taxa de retenção EXCEPCIONAL.
        
        BASE DE CONHECIMENTO TÁTICO (NEURION ARCHIVE):
        ${kbContext}

        >>> MISSÃO CRÍTICA (NÃO FALHE NISSO):
        O usuário forneceu detalhes específicos sobre uma DOR (Problema) e uma OFERTA (Solução).
        Seus criativos DEVEM ser 100% baseados nessas informações. 
        NÃO GERE CONTEÚDO GENÉRICO.
        
        TÉCNICAS DE ALTO CTR OBRIGATÓRIAS:
        1. PATTERN INTERRUPT: A imagem deve CHOCAR ou SURPREENDER visualmente para parar o scroll.
        2. CURIOSITY GAP: O headline deve criar um gap de curiosidade que FORCE o clique.
        3. EMOTIONAL TRIGGER: Use emoções primárias (medo, desejo, raiva, esperança) na copy.
        4. SPECIFICITY: Use números específicos ("Em 14 dias" ao invés de "Rapidamente").
        5. SOCIAL PROOF: Incorpore elementos de prova social quando possível.
        
        SE O USUÁRIO DISSE "DOR NAS COSTAS", A IMAGEM TEM QUE MOSTRAR ALGUÉM COM A MÃO NAS COSTAS EM CLOSE-UP DRAMÁTICO.
        SE O USUÁRIO DISSE "INVESTIMENTO", A IMAGEM TEM QUE MOSTRAR GRÁFICOS COM SETAS VERDES, NOTAS DE DINHEIRO, OU TELA DE CELULAR COM APP DE INVESTIMENTO.
        
        INPUTS DO USUÁRIO PARA ANALISAR AGORA:
        1. PRODUTO: ${currentInput.productName}
        2. DOR PRINCIPAL (Foco Visual): ${currentInput.painPoint}
        3. DETALHES DA OFERTA (Contexto): ${currentInput.offerDetails}
        
        REGRAS DE GERAÇÃO VISUAL (imagePrompt) - QUALIDADE PREMIUM:
        - O 'imagePrompt' DEVE SER EM INGLÊS (para o gerador entender), MAS...
        - **IMPORTANTE:** Se você descrever qualquer texto que apareça DENTRO da imagem, especifique que ele deve estar em PORTUGUÊS.
        - Exemplo Correto: "...a sign that says in Portuguese 'PERIGO'..."
        - A CENA VISUAL deve ser CINEMATOGRÁFICA: iluminação dramática, composição profissional, cores vibrantes.
        - CADA imagePrompt deve ter NO MÍNIMO 50 palavras descritivas.
        - INCLUA detalhes técnicos: "cinematic lighting, shallow depth of field, golden hour, 4K detail, professional advertising photography"
        - Descreva a EMOÇÃO na cena: expressão facial específica, linguagem corporal, ambiente.
        - PROIBIDO: Prompts vagos como "happy person". 
        - CORRETO: "Close-up of a frustrated middle-aged Brazilian woman, standing on a bathroom scale, looking disappointed at the number, soft morning light from window, bathroom setting, cinematic composition, shallow depth of field, emotional expression showing frustration and determination"

        FORMATO DE RESPOSTA (JSON OBRIGATÓRIO):
        Retorne APENAS um objeto JSON com a seguinte estrutura exata:
        {
          "angles": [
            {
              "angleName": "Nome do Ângulo (Baseado na Dor/Oferta)",
              "angleExplanation": "Por que esse ângulo ataca a dor ${currentInput.painPoint}?",
              "creatives": [
                {
                   "id": "1",
                   "hookType": "Tipo de Gancho (ex: Pattern Interrupt Visual, Curiosity Gap, Prova Social Chocante, Identificação Imediata)",
                   "headline": "Título da Imagem (Curto, Impactante, com números específicos se possível)",
                   "subheadline": "Texto de apoio que cria urgência ou curiosidade",
                   "primaryText": "Copy COMPLETA para legenda do anúncio (mínimo 4 linhas). Use: gancho → identificação → agitação → solução → CTA. Inclua emojis estratégicos.",
                   "imagePrompt": "Descrição visual ULTRA-DETALHADA em INGLÊS (mínimo 50 palavras) com: cena, iluminação, emoção, composição, ângulo de câmera, profundidade de campo. Se houver texto na imagem, especifique que é em Português."
                }
              ]
            }
          ]
        }

        QUANTIDADE: Gere ${currentInput.angleCount} Ângulos distintos. 2 Criativos por ângulo.
        CADA ÂNGULO deve usar uma ESTRATÉGIA DE GANCHO DIFERENTE (Pattern Interrupt, Curiosity Gap, Fear Appeal, Social Proof, Before/After).
        ${visualInstruction}
      `;

      if (currentInput.referenceImage) {
          systemInstruction += `\n>>> VISÃO COMPUTACIONAL AVANÇADA (IMAGEM ANEXADA): O usuário anexou uma imagem. Use como contexto visual e temático.`;
      }

      const promptText = `
        ANALISE PROFUNDAMENTE:
        DOR: "${currentInput.painPoint}"
        OFERTA: "${currentInput.offerDetails}"
        
        Gere os criativos. Certifique-se que o 'imagePrompt' descreva a dor visualmente.
        SE HOUVER TEXTO NA IMAGEM, GARANTA QUE SEJA EM PORTUGUÊS (PT-BR).
      `;

      const contentParts: any[] = [{ text: promptText }];
      
      if (currentInput.referenceImage) {
          const base64Data = currentInput.referenceImage.split(',')[1];
          contentParts.push({
              inlineData: {
                  mimeType: "image/png",
                  data: base64Data
              }
          });
      }

      let textResponse;
      let retries = 0;
      let success = false;

      while(retries < 2 && !success) {
          try {
              textResponse = await ai.models.generateContent({
                model: getModel(),
                contents: contentParts,
                config: {
                  systemInstruction: systemInstruction,
                  responseMimeType: "application/json",
                  thinkingConfig: { thinkingBudget: 2048 },
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      angles: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            angleName: { type: Type.STRING },
                            angleExplanation: { type: Type.STRING },
                            creatives: {
                              type: Type.ARRAY,
                              items: {
                                type: Type.OBJECT,
                                properties: {
                                  id: { type: Type.STRING },
                                  hookType: { type: Type.STRING },
                                  headline: { type: Type.STRING },
                                  subheadline: { type: Type.STRING },
                                  primaryText: { type: Type.STRING },
                                  imagePrompt: { type: Type.STRING },
                                },
                                required: ["headline", "imagePrompt", "primaryText", "hookType", "subheadline"]
                              }
                            }
                          },
                          required: ["angleName", "creatives"]
                        }
                      }
                    }
                  }
                }
              });
              success = true;
          } catch (error: any) {
              if (error.status === 429 || error.status === 503 || error.message?.includes('429')) {
                  console.warn("Quota exceeded. Fallback to Flash.");
                  setGenerationStep("Otimizando uso de recursos... Alternando para Modo Rápido.");
                  // Fallback to Flash immediately
                  textResponse = await ai.models.generateContent({
                      model: 'OpenAI-2.5-flash',
                      contents: contentParts,
                      config: {
                          systemInstruction: systemInstruction + "\n\nIMPORTANTE: Retorne APENAS JSON VÁLIDO seguindo o esquema.",
                          responseMimeType: "application/json"
                      }
                  });
                  success = true;
              } else {
                  if(retries === 1) throw error;
                  retries++;
                  await new Promise(r => setTimeout(r, 2000));
              }
          }
      }

      if(!textResponse) throw new Error("Falha ao conectar com a IA.");

      const generatedData = cleanAndParseJson(textResponse.text);

      if (!generatedData.angles || generatedData.angles.length === 0) {
          throw new Error("Falha na geração: Estrutura JSON inválida ou vazia retornada pela IA. Tente simplificar o input.");
      }

      if (!currentInput.textOnlyMode) {
          setGenerationStep('A Fábrica Visual está operando... (Isso pode levar um tempo)');
      } else {
          setGenerationStep('Organizando os textos...');
      }
      
      const processedAngles: AngleResult[] = [];

      for (const angle of generatedData.angles) {
        const processedCreatives = [];
        const creativesList = Array.isArray(angle.creatives) ? angle.creatives : [];

        for (let j = 0; j < creativesList.length; j++) {
          const creative = creativesList[j];
          let base64Image = undefined;
          
          if (!currentInput.textOnlyMode) {
              setGenerationStep(`Renderizando: ${angle.angleName} - ${creative.hookType}...`);
              
              const antiWatermark = "CLEAN IMAGE, NO WATERMARK, NO LOGO, NO TEXT OVERLAY, PROFESSIONAL QUALITY.";
              
              // Enhanced prompt engineering for high-CTR creatives
              let finalPrompt = "";
              if (currentInput.visualStyle === 'wikihow') {
                finalPrompt = `(WikiHow style illustration:1.5), vector art, instructional drawing, white background, clean lines, vibrant colors, professional editorial quality, (Portuguese text only:1.5), (no English text:2.0), ${antiWatermark}, Scene description: ${creative.imagePrompt}`;
              } else {
                finalPrompt = `(Award-winning advertising photography:1.5), (ultra high resolution:1.3), cinematic dramatic lighting, shallow depth of field, professional color grading, editorial quality, magazine cover quality, (Portuguese text only:1.5), (no English text:2.0), ${antiWatermark}, Scene description: ${creative.imagePrompt}`;
              }

              // Use HIGH quality for professional ad creatives
              setGenerationStep(`Gerando imagem ${j + 1} de ${creativesList.length} (Alta Qualidade)...`);
              base64Image = await generateImage(finalPrompt, '1:1', apiKey, true);
          }

          processedCreatives.push({
            ...creative,
            base64Image
          });
        }

        processedAngles.push({
          ...angle,
          creatives: processedCreatives
        });
      }

      const finalResult = { angles: processedAngles };
      setResult(finalResult);
      if (onCreativesGenerated) onCreativesGenerated(finalResult);
      
      localStorage.setItem(`neurion_generated_creatives_${userEmail}`, Date.now().toString());
      
      try {
          // Salva no localStorage sem imagens (para não estourar o limite de storage)
          const safeResult = {
              angles: processedAngles.map(angle => ({
                  ...angle,
                  creatives: angle.creatives.map(c => {
                      const { base64Image, ...rest } = c;
                      return rest;
                  })
              }))
          };
          localStorage.setItem(`neurion_latest_strategy_${userEmail}`, JSON.stringify(safeResult));
      } catch (e) {
          console.warn("Storage quota exceeded.", e);
      }

      if (isVoice) speakCompletion();

    } catch (error: any) {
      console.error("Erro geral:", error);
      alert(`Erro na produção: ${error.message || "A IA não retornou dados válidos."}`);
    } finally {
      setIsGenerating(false);
      if (onStatusChange) onStatusChange(false);
      setGenerationStep('');
    }
  };

  const handleDownloadPackage = async () => {
    if (!result) return;
    setIsZipping(true);

    try {
        const zip = new JSZip();
        const safeProductName = input.productName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'neurion_pack';
        const rootFolder = zip.folder(`NEURION_${safeProductName}`);
        
        if (!rootFolder) return;

        let content = `NEURION - PACOTE INDUSTRIAL DE CRIATIVOS\nPRODUTO: ${input.productName}\n=====================\n\n`;

        result.angles.forEach((angle, idx) => {
            content += `>>> ÂNGULO ${idx + 1}: ${angle.angleName.toUpperCase()}\n`;
            content += `LÓGICA: ${angle.angleExplanation}\n-------------------\n`;
            angle.creatives.forEach((creative, cIdx) => {
                content += `[VARIAÇÃO ${cIdx + 1} - ${creative.hookType}]\n`;
                if (!input.textOnlyMode) content += `ARQUIVO: Angulo_${idx+1}_Var_${cIdx+1}.png\n`;
                content += `HEADLINE: ${creative.headline}\nSUBHEADLINE: ${creative.subheadline}\nCOPY:\n${creative.primaryText}\nPROMPT: ${creative.imagePrompt}\n\n`;
            });
            content += `=====================\n\n`;
        });

        rootFolder.file("Estrategia_e_Copys.txt", content);

        if (!input.textOnlyMode) {
            for (let idx = 0; idx < result.angles.length; idx++) {
                const angle = result.angles[idx];
                for (let cIdx = 0; cIdx < angle.creatives.length; cIdx++) {
                    const creative = angle.creatives[cIdx];
                    if (!creative.base64Image) continue;
                    if (creative.base64Image.startsWith('data:')) {
                        const base64Data = creative.base64Image.split(',')[1];
                        rootFolder.file(`Angulo_${idx+1}_Var_${cIdx+1}_${creative.hookType.replace(/[^a-z0-9]/gi, '')}.png`, base64Data, {base64: true});
                    }
                }
            }
        }

        const blob = await zip.generateAsync({type: "blob"});
        const element = document.createElement("a");
        element.href = URL.createObjectURL(blob);
        element.download = `Pack_Criativos_${safeProductName}.zip`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);

    } catch (error) {
        console.error("Erro ao criar ZIP:", error);
        alert("Erro ao compactar arquivos.");
    } finally {
        setIsZipping(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
      
      {/* INPUTS */}
      <div className="lg:col-span-4 space-y-6">
        <Card title="Painel de Controle da Fábrica" icon={<BrainCircuit className="w-5 h-5" />}>
          <div className="space-y-4">
            
            <div className="bg-gradient-to-r from-cyan-900/40 to-blue-900/40 border border-cyan-500/30 p-3 rounded-lg flex items-center justify-center gap-2 mb-2 shadow-inner">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <p className="text-xs text-cyan-200 font-bold tracking-wide">
                    Essa ferramenta é única e feita exclusivamente pelo criador.
                </p>
            </div>

            <div>
               <label className="block text-sm font-medium text-slate-400 mb-1">Produto</label>
               <input 
                 type="text" 
                 value={input.productName}
                 onChange={(e) => setInput({...input, productName: e.target.value})}
                 placeholder="Ex: Protocolo Zero Barriga"
                 className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none"
               />
            </div>
            
            <div>
               <label className="block text-sm font-medium text-slate-400 mb-1">Dor Principal</label>
               <textarea 
                 value={input.painPoint}
                 onChange={(e) => setInput({...input, painPoint: e.target.value})}
                 rows={2}
                 className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none resize-none"
               />
            </div>

            <div>
               <label className="block text-sm font-medium text-slate-400 mb-1">Contexto da Oferta (Vital)</label>
               <textarea 
                 value={input.offerDetails}
                 onChange={(e) => setInput({...input, offerDetails: e.target.value})}
                 placeholder="Cole o texto da VSL, promessas, garantias, bônus..."
                 rows={4}
                 className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none resize-none text-xs"
               />
            </div>

            <div className="space-y-2">
               <label className="block text-sm font-medium text-slate-400 flex items-center gap-2">
                  <BookOpen className="w-3 h-3 text-cyan-400" />
                  Referências & Inspirações
               </label>
               
               <textarea 
                 value={input.contentReferences}
                 onChange={(e) => setInput({...input, contentReferences: e.target.value})}
                 placeholder="Cole copys de referência, transcrições ou textos..."
                 rows={2}
                 className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none resize-none text-xs placeholder:text-slate-600 mb-2"
               />

               {input.textOnlyMode && (
                   <div className="relative group animate-in fade-in slide-in-from-top-1">
                       {input.referenceImage ? (
                           <div className="relative w-full h-24 rounded-lg overflow-hidden border border-emerald-500/50 group-hover:border-emerald-400 transition-colors">
                               <img src={input.referenceImage} alt="Referência" className="w-full h-full object-cover opacity-70" />
                               <button 
                                    onClick={() => setInput(prev => ({...prev, referenceImage: ''}))}
                                    className="absolute top-2 right-2 bg-black/60 hover:bg-red-600 text-white p-1 rounded-full transition-colors"
                               >
                                   <X className="w-3 h-3" />
                               </button>
                           </div>
                       ) : (
                           <div 
                                onClick={() => fileInputRef.current?.click()}
                                className={`w-full h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all border-emerald-500/50 bg-emerald-900/10 hover:bg-emerald-900/20`}
                           >
                               <Paperclip className="w-5 h-5 mb-1 text-emerald-400" />
                               <span className="text-[10px] font-medium text-emerald-300">
                                   Anexar Imagem para Análise Visual (Opcional)
                               </span>
                           </div>
                       )}
                       <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleImageUpload}
                       />
                   </div>
               )}
            </div>

            <div className="border-t border-slate-700 pt-4 space-y-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Configuração da Produção</p>
                
                <div className="space-y-2">
                    <div className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${input.textOnlyMode ? 'bg-emerald-900/30 border-emerald-500/50' : 'bg-slate-900 border-slate-700'}`}>
                        <div className="flex flex-col">
                            <span className={`text-xs font-medium ml-1 flex items-center gap-1.5 ${input.textOnlyMode ? 'text-emerald-400' : 'text-slate-300'}`}>
                                <FileText className="w-3.5 h-3.5" />
                                Modo Apenas Copy
                            </span>
                        </div>
                        <button 
                            onClick={() => setInput(prev => ({...prev, textOnlyMode: !prev.textOnlyMode}))}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${input.textOnlyMode ? 'bg-emerald-500' : 'bg-slate-600'}`}
                        >
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${input.textOnlyMode ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-lg border border-slate-700">
                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-slate-300 ml-1">Modo Visionário</span>
                        </div>
                        <button 
                            onClick={() => setInput({...input, expertMode: !input.expertMode})}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${input.expertMode ? 'bg-cyan-500' : 'bg-slate-600'}`}
                        >
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${input.expertMode ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>

                <div>
                   <div className="flex justify-between mb-1">
                     <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                       <Layers className="w-4 h-4 text-cyan-400" />
                       Quantidade de Ângulos
                     </label>
                     <span className="text-cyan-400 font-bold">{input.angleCount} ({input.angleCount * 2} {input.textOnlyMode ? 'copys' : 'criativos'})</span>
                   </div>
                   <input 
                     type="range" 
                     min="1" 
                     max="3" 
                     step="1"
                     value={input.angleCount}
                     onChange={(e) => setInput({...input, angleCount: Number(e.target.value)})}
                     className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                   />
                </div>

                <div className={`transition-opacity duration-300 ${input.textOnlyMode ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100'}`}>
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-2 justify-between">
                       <span className="flex items-center gap-2"><Palette className="w-4 h-4 text-cyan-400" /> Estilo Visual (IA)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                           onClick={() => setInput({...input, visualStyle: 'cinematic'})}
                           className={`p-3 rounded-lg text-xs font-bold border transition-all flex flex-col items-center gap-2 ${
                               input.visualStyle === 'cinematic' 
                                ? 'bg-cyan-900/30 border-cyan-500 text-cyan-400' 
                               : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'
                           }`}
                        >
                           <FileImage className="w-5 h-5" />
                           Realista
                        </button>
                        <button 
                           onClick={() => setInput({...input, visualStyle: 'wikihow'})}
                           className={`p-3 rounded-lg text-xs font-bold border transition-all flex flex-col items-center gap-2 ${
                               input.visualStyle === 'wikihow' 
                                ? 'bg-yellow-900/30 border-yellow-500 text-yellow-400' 
                               : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'
                           }`}
                        >
                           <PenTool className="w-5 h-5" />
                           WikiHow
                        </button>
                    </div>
                </div>
            </div>

            <button 
              onClick={() => handleGenerate(false)}
              disabled={isGenerating}
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg ${
                isGenerating 
                   ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : input.textOnlyMode 
                     ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20'
                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-500/20'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processando...
                </>
              ) : (
                input.textOnlyMode ? (
                    <>
                        <FileText className="w-5 h-5" />
                        Gerar {input.angleCount * 2} Copys
                    </>
                ) : (
                    <>
                        <Wand2 className="w-5 h-5" />
                        Produzir {input.angleCount * 2} Criativos
                    </>
                )
              )}
            </button>
          </div>
        </Card>
      </div>

      {/* RESULTS */}
      <div className="lg:col-span-8 space-y-8">
         {!result && !isGenerating && (
           <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-slate-500 bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-700 p-8">
             <Layers className="w-16 h-16 mb-4 opacity-20" />
             <h3 className="text-xl font-semibold mb-2">Linha de Produção Pronta</h3>
             <p className="text-center max-w-md text-sm">
               Configure os parâmetros ao lado para iniciar a geração.
             </p>
           </div>
         )}

         {isGenerating && (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-slate-800/50 rounded-xl border border-slate-700 p-8 text-center">
              <Sparkles className="w-12 h-12 text-cyan-400 animate-pulse mb-6" />
              <div className="space-y-4 max-w-md w-full">
                 <p className="text-slate-300 font-medium text-lg animate-pulse">{generationStep}</p>
                 <div className="w-full bg-slate-700 rounded-full h-2.5">
                    <div className="bg-cyan-500 h-2.5 rounded-full animate-progress" style={{width: '60%'}}></div>
                 </div>
              </div>
            </div>
         )}

         {result && (
           <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
             
             <div className="flex justify-between items-center bg-slate-800/80 p-4 rounded-xl border border-slate-700 backdrop-blur sticky top-24 z-10 shadow-xl">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        Produção Concluída
                    </h2>
                    <p className="text-xs text-slate-400">{result.angles.length} Ângulos Gerados  {result.angles.length * 2} Criativos Totais</p>
                </div>
                <button 
                  onClick={handleDownloadPackage}
                  disabled={isZipping}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isZipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Baixar ZIP Completo
                </button>
             </div>

             {result.angles.map((angle, idx) => (
                <div key={idx} className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-700 pb-2 mt-4">
                        <div className="bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded text-xs font-bold">ÂNGULO {idx + 1}</div>
                        <h3 className="text-lg font-bold text-slate-200">{angle.angleName}</h3>
                    </div>
                    <p className="text-xs text-slate-400 italic bg-slate-900/50 p-2 rounded border border-slate-800/50">
                        "{angle.angleExplanation}"
                    </p>

                    <div className={`grid ${input.textOnlyMode ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-6`}>
                        {angle.creatives.map((creative, cIdx) => (
                            <Card key={cIdx} className={`bg-slate-900 border-slate-800 flex flex-col h-full overflow-hidden group hover:border-slate-600 transition-colors ${input.textOnlyMode ? 'border-l-4 border-l-emerald-500' : ''}`}>
                                
                                {/* FEEDBACK BUTTONS OVERLAY */}
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                    <button 
                                        onClick={() => handleFeedback(creative, true)}
                                        className="p-1.5 bg-slate-800/80 hover:bg-emerald-600 text-slate-300 hover:text-white rounded-full backdrop-blur border border-slate-600"
                                        title="Aprovar (IA Aprende)"
                                    >
                                        <ThumbsUp className="w-3 h-3" />
                                    </button>
                                    <button 
                                        onClick={() => handleFeedback(creative, false)}
                                        className="p-1.5 bg-slate-800/80 hover:bg-rose-600 text-slate-300 hover:text-white rounded-full backdrop-blur border border-slate-600"
                                        title="Rejeitar"
                                    >
                                        <ThumbsDown className="w-3 h-3" />
                                    </button>
                                </div>

                                {input.textOnlyMode ? (
                                    <div className="p-2 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500">
                                                    <AlignLeft className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Variação {cIdx + 1} - {creative.hookType}</span>
                                                    <h3 className="text-lg font-bold text-white leading-tight mt-0.5">{creative.headline}</h3>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => copyToClipboard(`${creative.headline}\n\n${creative.primaryText}`)}
                                                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
                                                title="Copiar Texto"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-serif text-slate-300 leading-relaxed text-sm whitespace-pre-line shadow-inner">
                                            {creative.primaryText}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Subheadline</p>
                                                <p className="text-xs text-yellow-400/90 bg-yellow-900/10 p-2 rounded border border-yellow-900/20">
                                                    {creative.subheadline}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                                    <ImageOff className="w-3 h-3" /> Sugestão Visual
                                                </p>
                                                <p className="text-[10px] text-slate-500 italic bg-slate-800 p-2 rounded border border-slate-700 line-clamp-3">
                                                    {creative.imagePrompt}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${cIdx === 0 ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                                                <span className="text-xs font-bold text-slate-300">Variação {cIdx === 0 ? 'A' : 'B'}</span>
                                            </div>
                                            <span className="text-[10px] text-slate-500 uppercase tracking-wider border border-slate-800 px-1 rounded">
                                                {creative.hookType}
                                            </span>
                                        </div>

                                        <div className="aspect-square bg-slate-900 rounded-lg overflow-hidden relative mb-4 border border-slate-800 shadow-lg group-hover:shadow-cyan-500/10 transition-shadow">
                                            {creative.base64Image ? (
                                                <>
                                                    <img src={creative.base64Image} alt="Ad Creative" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                                                    <a 
                                                        href={creative.base64Image} 
                                                        download={`neurion_creative_${idx}_${cIdx}.png`}
                                                        className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </a>
                                                </>
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 p-4 text-center border border-dashed border-slate-700 rounded">
                                                    <ImageIcon className="w-8 h-8 text-slate-600 mb-2" />

                                                    <p className="text-[10px] text-slate-600">Falha ao renderizar imagem</p>
                                                </div>
                                            )}
                                            
                                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-12 pointer-events-none">
                                                <p className="text-white font-bold text-sm leading-tight drop-shadow-md line-clamp-2">{creative.headline}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3 flex-1 flex flex-col">
                                            <div className="bg-slate-900/50 p-3 rounded border border-slate-800 flex-1 relative">
                                                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line line-clamp-6 hover:line-clamp-none transition-all">{creative.primaryText}</p>
                                            </div>
                                            
                                            <div className="bg-slate-900 p-2 rounded border border-slate-800">
                                                <p className="text-[10px] text-slate-500 font-mono mb-1">PROMPT:</p>
                                                <p className="text-[10px] text-slate-400 line-clamp-2 italic">{creative.imagePrompt}</p>
                                            </div>
                                        </div>
                                    </>
                                )}

                            </Card>
                        ))}
                    </div>
                </div>
             ))}
           </div>
         )}
      </div>

    </div>
  );
};



