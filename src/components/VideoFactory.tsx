
import { generateImage } from '../utils/imageGen';
import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { 
  Sparkles, 
  Loader2, 
  Download, 
  Clock, 
  AlertTriangle, 
  Film,
  Zap,
  Image as ImageIcon,
  Clapperboard,
  Layers,
  FileText,
  RefreshCcw,
} from 'lucide-react';
import { OpenAICompatClient as GoogleGenAI, Type } from "../utils/openai";
import { VideoQueueItem, StoryboardScene, VoiceCommand } from '../types';
import JSZip from 'jszip';

interface VideoFactoryProps {
    voiceTrigger?: VoiceCommand | null;
    onVoiceTriggerHandled?: () => void;
    userEmail: string; // User email passed from parent
}

export const VideoFactory: React.FC<VideoFactoryProps> = ({ voiceTrigger, onVoiceTriggerHandled, userEmail }) => {
  // Storyboard Input State
  const [productName, setProductName] = useState('');
  const [briefing, setBriefing] = useState('');
  const [style, setStyle] = useState<'cinematic' | 'advertising'>('cinematic');
  
  // Storyboard System State
  const [queue, setQueue] = useState<VideoQueueItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);

  // Load user-specific queue
  useEffect(() => {
    // Load queue from storage
    const savedQueue = localStorage.getItem(`neurion_video_queue_${userEmail}`);
    if (savedQueue) {
      try {
          const parsed = JSON.parse(savedQueue);
          setQueue(parsed);
      } catch (e) {
          console.error("Erro ao carregar fila", e);
      }
    } else {
        setQueue([]);
    }
  }, [userEmail]);

  useEffect(() => {
    // SAVE TO STORAGE (SANITIZED) - PREVENTS BLUE SCREEN / CRASH
    // We strictly remove the base64Image data before saving to localStorage
    // because localStorage has a 5MB limit. Storing HD images crashes the tab.
    const saveQueueToStorage = () => {
        try {
            const safeQueue = queue.map(item => ({
                ...item,
                // Keep everything EXCEPT the image data
                scenes: item.scenes?.map(scene => ({
                    ...scene,
                    base64Image: undefined 
                }))
            }));
            localStorage.setItem(`neurion_video_queue_${userEmail}`, JSON.stringify(safeQueue));
        } catch (e) {
            console.warn("Storage quota exceeded. History not fully saved.", e);
        }
    };

    saveQueueToStorage();
  }, [queue, userEmail]);

  // --- VOICE CONTROL ---
  useEffect(() => {
      if (voiceTrigger && voiceTrigger.action === 'GENERATE_VIDEO' && !isSubmitting) {
          const p = voiceTrigger.payload;
          
          const overrides = {
              productName: p?.productName || "Produto Sem Nome",
              briefing: p?.description || "Vídeo gerado por comando de voz.",
              style: p?.videoStyle || style
          };
          setProductName(overrides.productName);
          setBriefing(overrides.briefing);
          setStyle(overrides.style);
          setTimeout(() => {
              addToQueue(true, overrides); // true = voice mode
          }, 100);

          if (onVoiceTriggerHandled) onVoiceTriggerHandled();
      }
  }, [voiceTrigger]);

  // --- STORYBOARD LOGIC ---
  const addToQueue = async (isVoice = false, overrides?: { productName: string, briefing: string, style?: any }) => {
     const currentProduct = overrides?.productName || productName;
     const currentBriefing = overrides?.briefing || briefing;
     const currentStyle = overrides?.style || style;

     if (!isVoice && (!currentProduct || !currentBriefing)) {
         alert("Preencha o nome do produto e o briefing do vídeo.");
         return;
     }

     if (!((window as any).__NEURION_KEY__ || localStorage.getItem('neurion_openai_api_key') || '')) {
         alert("API Key não encontrada.");
         return;
     }

     setIsSubmitting(true);

     const newItem: VideoQueueItem = {
         id: crypto.randomUUID(),
         productName: currentProduct || "Projeto Voz",
         prompt: currentBriefing || "Gerado por voz",
         status: 'processing',
         createdAt: Date.now(),
         progress: 5,
         scenes: []
     };

     // Optimistic UI Update
     setQueue(prev => [newItem, ...prev]);

     // Trigger Background Process
     processStoryboardGeneration(newItem, currentStyle);

     setProductName('');
     setBriefing('');
     setIsSubmitting(false);
  };

  const generateImagesForScenes = async (scenes: StoryboardScene[], itemId: string, styleMode: string) => {
    const apiKey = ((window as any).__NEURION_KEY__ || localStorage.getItem('neurion_openai_api_key') || '') || '';
    const ai = new GoogleGenAI({ apiKey });
    
    const processedScenes: StoryboardScene[] = [];

    // SEQUENTIAL GENERATION TO AVOID RATE LIMITS (BUT NO RETRIES/WAITS)
    for (const scene of scenes) {
        let base64Image = undefined;
        
        const enhancedPrompt = `${styleMode === 'cinematic' ? 'Cinematic shot, 8k, dramatic lighting, movie scene' : 'Professional advertising photography, bright, clean, commercial'}, ${scene.imagePrompt}, --no text, --no typography, --no words`;

        try {
            // Modo Free  Pollinations.AI | Modo Pro  OpenAI
            const imgResult = await generateImage(enhancedPrompt, '16:9', apiKey);
            if (imgResult) {
                base64Image = imgResult;
            }
        } catch (err: any) {
            console.error(`Erro ao gerar imagem da cena ${scene.sceneId}:`, err);
        }

        // Update Progress UI
        setQueue(currentQueue => {
            const currentItem = currentQueue.find(q => q.id === itemId);
            if (!currentItem) return currentQueue;
            const step = 60 / scenes.length; 
            const newProgress = Math.min((currentItem.progress || 30) + step, 99);
            return currentQueue.map(q => q.id === itemId ? { ...q, progress: Math.floor(newProgress) } : q);
        });

        processedScenes.push({ ...scene, base64Image });
    }

    return processedScenes;
  };

  const processStoryboardGeneration = async (item: VideoQueueItem, activeStyle: string) => {
    try {
        const apiKey = ((window as any).__NEURION_KEY__ || localStorage.getItem('neurion_openai_api_key') || '') || '';
        const ai = new GoogleGenAI({ apiKey });
        
        updateItemStatus(item.id, 'processing', 10);
        
        const scriptPrompt = `
          Você é um Diretor de Cinema premiado. Crie um roteiro de vídeo curto (15-30s) de alta conversão para o produto: "${item.productName}".
          Contexto/Briefing: "${item.prompt}".
          Estilo: ${activeStyle === 'cinematic' ? 'Cinematográfico, emocional, épico' : 'Comercial, dinâmico, direto ao ponto'}.

          Divida o vídeo em exatamente 4 CENAS CHAVE.
          Para cada cena, forneça:
          1. Narração (O que o locutor diz).
          2. Descrição Visual (O que aparece na tela).
          3. Prompt de Imagem (Inglês, detalhado, para gerar a imagem da cena, sem texto na imagem).
        `;

        const scriptResponse = await ai.models.generateContent({
            model: 'OpenAI-2.5-flash',
            contents: scriptPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        scenes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    sceneId: { type: Type.INTEGER },
                                    narration: { type: Type.STRING },
                                    visualDescription: { type: Type.STRING },
                                    imagePrompt: { type: Type.STRING }
                                },
                                required: ["sceneId", "narration", "visualDescription", "imagePrompt"]
                            }
                        }
                    }
                }
            }
        });

        const scriptData = JSON.parse(scriptResponse.text || '{ "scenes": [] }');
        const scenes: StoryboardScene[] = scriptData.scenes;
        
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, scenes, progress: 30 } : q));
        const updatedScenes = await generateImagesForScenes(scenes, item.id, activeStyle);

        setQueue(prev => prev.map(q => q.id === item.id ? { 
            ...q, 
            status: 'completed', 
            progress: 100, 
            scenes: updatedScenes 
        } : q));

    } catch (error) {
        console.error("Storyboard Generation Error:", error);
        updateItemStatus(item.id, 'failed', 0, false, "Erro ao gerar storyboard.");
    }
  };

  const handleRestoreImages = async (item: VideoQueueItem) => {
      if (!item.scenes || isRestoring) return;
      setIsRestoring(item.id);
      updateItemStatus(item.id, 'processing', 0);
      try {
          const updatedScenes = await generateImagesForScenes(item.scenes, item.id, style);
          setQueue(prev => prev.map(q => q.id === item.id ? { 
            ...q, 
            status: 'completed', 
            progress: 100, 
            scenes: updatedScenes 
          } : q));
      } catch (e) {
          console.error("Failed to restore", e);
          updateItemStatus(item.id, 'failed', 0, false, "Erro ao restaurar imagens.");
      } finally {
          setIsRestoring(null);
      }
  };

  const updateItemStatus = (id: string, status: VideoQueueItem['status'], progress?: number, incrementProgress: boolean = false, error?: string) => {
      setQueue(prev => prev.map(q => {
          if (q.id !== id) return q;
          return { ...q, status, progress: progress !== undefined ? progress : q.progress, errorMessage: error };
      }));
  };

  const deleteItem = (id: string) => {
      setQueue(prev => prev.filter(i => i.id !== id));
  };

  const handleDownloadStoryboard = async (item: VideoQueueItem) => {
      if (!item.scenes) return;
      const zip = new JSZip();
      const folder = zip.folder(`Storyboard_${item.productName.replace(/\s+/g, '_')}`);
      if (!folder) return;

      let scriptContent = `PRODUTO: ${item.productName}\nBRIEFING: ${item.prompt}\n\n`;
      item.scenes.forEach(scene => {
          scriptContent += `[CENA ${scene.sceneId}]\n`;
          scriptContent += `VISUAL: ${scene.visualDescription}\n`;
          scriptContent += `NARRAÇÃO: "${scene.narration}"\n`;
          scriptContent += `-----------------------------------\n\n`;
      });
      folder.file("Roteiro.txt", scriptContent);

      let hasImages = false;
      item.scenes.forEach(scene => {
          if (scene.base64Image) {
              const base64Data = scene.base64Image.split(',')[1];
              folder.file(`Cena_${scene.sceneId}.png`, base64Data, {base64: true});
              hasImages = true;
          }
      });

      if (!hasImages) {
          alert("Atenção: As imagens expiraram ou não foram carregadas. Clique em 'Restaurar Imagens' antes de baixar.");
          return;
      }

      const blob = await zip.generateAsync({type: "blob"});
      const element = document.createElement("a");
      element.href = URL.createObjectURL(blob);
      element.download = `Storyboard_${item.productName}.zip`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
      
      {/* LEFT: CONTROL PANEL (STORYBOARD) */}
      <div className="lg:col-span-4 space-y-6">
          <Card title="Fábrica de Storyboards" icon={<Clapperboard className="w-5 h-5 text-violet-400" />}>
              <div className="space-y-4">
                  <div className="bg-violet-500/10 border border-violet-500/30 p-4 rounded-lg mb-4">
                      <h4 className="text-violet-400 font-bold text-sm mb-1 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" /> Geração Gratuita
                      </h4>
                      <p className="text-xs text-slate-400">
                          Esta ferramenta cria roteiros completos e gera as imagens (keyframes) de cada cena.
                      </p>
                      <div className="mt-2 flex items-start gap-2 bg-slate-900/50 p-2 rounded">
                          <AlertTriangle className="w-3 h-3 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <p className="text-[10px] text-slate-400 leading-tight">
                              As imagens são salvas apenas na memória temporária para performance. Baixe o pack imediatamente após a geração.
                          </p>
                      </div>
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Nome do Produto</label>
                      <input 
                          type="text" 
                          value={productName}
                          onChange={(e) => setProductName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:ring-2 focus:ring-violet-500 outline-none"
                          placeholder="Ex: Drone X-Pro"
                      />
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Briefing do Vídeo (Cena)</label>
                      <textarea 
                          value={briefing}
                          onChange={(e) => setBriefing(e.target.value)}
                          rows={5}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:ring-2 focus:ring-violet-500 outline-none resize-none"
                          placeholder="Descreva a ideia: Um vídeo mostrando a resistência do drone, cenas na chuva, voando alto..."
                      />
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Estilo Visual</label>
                      <div className="grid grid-cols-2 gap-2">
                          <button 
                              onClick={() => setStyle('cinematic')}
                              className={`p-3 rounded-lg text-xs font-bold border transition-all flex flex-col items-center gap-2 ${
                                  style === 'cinematic' 
                                   ? 'bg-violet-900/30 border-violet-500 text-violet-400' 
                                  : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'
                              }`}
                          >
                              <Film className="w-5 h-5" />
                              Cinematográfico
                          </button>
                          <button 
                              onClick={() => setStyle('advertising')}
                              className={`p-3 rounded-lg text-xs font-bold border transition-all flex flex-col items-center gap-2 ${
                                  style === 'advertising' 
                                   ? 'bg-pink-900/30 border-pink-500 text-pink-400' 
                                  : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'
                              }`}
                          >
                              <Zap className="w-5 h-5" />
                              Comercial TV
                          </button>
                      </div>
                  </div>

                  <div className="pt-4 border-t border-slate-700">
                      <button 
                          onClick={() => addToQueue(false)}
                          disabled={isSubmitting}
                          className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg ${
                              isSubmitting
                               ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-violet-500/20'
                          }`}
                      >
                          {isSubmitting ? (
                              <>
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                  Criando Roteiro...
                              </>
                          ) : (
                              <>
                                  <Layers className="w-5 h-5" />
                                  Gerar Storyboard
                              </>
                          )}
                      </button>
                  </div>
              </div>
          </Card>
      </div>

      {/* RIGHT: RENDER QUEUE (STORYBOARD) */}
      <div className="lg:col-span-8">
          <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-violet-400" />
                  Histórico de Produção
              </h3>
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
                  {queue.length} projetos
              </span>
          </div>

          <div className="space-y-6">
              {queue.length === 0 && (
                  <div className="h-64 flex flex-col items-center justify-center bg-slate-800/50 rounded-xl border border-slate-700 border-dashed text-slate-500">
                      <Clapperboard className="w-12 h-12 mb-2 opacity-20" />
                      <p>Nenhum storyboard criado ainda.</p>
                  </div>
              )}

              {queue.map((item) => (
                  <div key={item.id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-lg animate-in slide-in-from-right-4 duration-500">
                      <div className="p-4 bg-slate-900/50 border-b border-slate-700 flex justify-between items-center">
                          <div>
                              <h4 className="font-bold text-white text-lg">{item.productName}</h4>
                              <p className="text-[10px] text-slate-400">
                                  {new Date(item.createdAt).toLocaleTimeString()}  {item.scenes?.length || 0} Cenas
                              </p>
                          </div>
                          <div className="flex gap-2">
                              {item.status === 'processing' && (
                                  <div className="flex items-center gap-2 text-violet-400 bg-violet-900/20 px-3 py-1 rounded-full text-xs font-bold border border-violet-500/20">
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      Processando... {item.progress}%
                                  </div>
                              )}
                              {item.status === 'completed' && (
                                  <button 
                                      onClick={() => handleDownloadStoryboard(item)}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                  >
                                      <Download className="w-3 h-3" /> Baixar Pack
                                  </button>
                              )}
                              {item.status === 'completed' && item.scenes?.length && !item.scenes[0].base64Image && !isRestoring && (
                                  <button 
                                      onClick={() => handleRestoreImages(item)}
                                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                      title="Imagens não salvas no histórico para evitar travamento. Clique para regenerar."
                                  >
                                      <RefreshCcw className="w-3 h-3" /> Restaurar Imagens
                                  </button>
                              )}
                              <button onClick={() => deleteItem(item.id)} className="p-1.5 hover:bg-rose-500/20 hover:text-rose-400 text-slate-500 rounded transition-colors"><XCircleIcon className="w-4 h-4" /></button>
                          </div>
                      </div>

                      <div className="p-4">
                          {item.status === 'processing' && !item.scenes?.length ? (
                              <div className="text-center py-8 text-slate-500 flex flex-col items-center">
                                  <Sparkles className="w-8 h-8 text-violet-500 animate-pulse mb-2" />
                                  <p className="text-sm">Escrevendo roteiro com IA...</p>
                              </div>
                          ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {item.scenes?.map((scene) => (
                                      <div key={scene.sceneId} className="bg-black/40 rounded-lg p-3 border border-slate-700/50 flex gap-3">
                                          <div className="w-32 h-20 bg-black rounded overflow-hidden flex-shrink-0 border border-slate-800 relative group">
                                              {scene.base64Image ? (
                                                  <img src={scene.base64Image} className="w-full h-full object-cover" alt={`Cena ${scene.sceneId}`} />
                                              ) : (
                                                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 bg-slate-900">
                                                      <ImageIcon className="w-6 h-6 opacity-30 mb-1" />
                                                      <span className="text-[8px] uppercase tracking-wide opacity-50">Expirado</span>
                                                  </div>
                                              )}
                                              <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 rounded font-bold">#{scene.sceneId}</div>
                                          </div>
                                          <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-1 mb-1"><FileText className="w-3 h-3 text-violet-400" /><span className="text-[10px] font-bold text-violet-300 uppercase">Narração</span></div>
                                              <p className="text-xs text-slate-300 line-clamp-2 italic mb-2">"{scene.narration}"</p>
                                              <div className="flex items-center gap-1 mb-0.5"><Film className="w-3 h-3 text-slate-500" /><span className="text-[10px] font-bold text-slate-500 uppercase">Visual</span></div>
                                              <p className="text-[10px] text-slate-400 line-clamp-2">{scene.visualDescription}</p>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                          {item.status === 'failed' && (
                              <div className="text-rose-400 text-sm text-center py-4 bg-rose-900/10 rounded-lg border border-rose-900/30">
                                  <AlertTriangle className="w-5 h-5 mx-auto mb-1" />
                                  Erro: {item.errorMessage}
                              </div>
                          )}
                      </div>
                  </div>
              ))}
          </div>
      </div>

    </div>
  );
};

// Helper Icon
const XCircleIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
);


