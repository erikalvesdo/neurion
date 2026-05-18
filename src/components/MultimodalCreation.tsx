
import React, { useState } from 'react';
import { generateImage } from '../utils/imageGen';
import { Card } from './Card';
import { 
  Image as ImageIcon, 
  Download, 
  Loader2, 
  Sparkles, 
  Trash2, 
  Maximize,
  Grid,
  Archive,
  X
} from 'lucide-react';
import { OpenAICompatClient as GoogleGenAI } from "../utils/openai";
import JSZip from 'jszip';
import { VoiceCommand } from '../types';

interface MultimodalCreationProps {
  userEmail: string;
  voiceTrigger?: VoiceCommand | null;
  onVoiceTriggerHandled?: () => void;
}

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  style: string;
  createdAt: number;
}

type ImageStyle = 'realistic' | 'cinematic' | 'cartoon' | 'painting' | '3d_render' | 'minimalist';

const STYLE_PROMPTS: Record<ImageStyle, string> = {
  realistic: "Fotografia de produto ultra-realista, iluminação de estúdio profissional, detalhes nítidos, 8k, alta resolução.",
  cinematic: "Cena cinematográfica widescreen, iluminação dramática, profundidade de campo rasa, color grading profissional, atmosfera épica.",
  cartoon: "Ilustração vetorial colorida em estilo cartoon moderno, traços limpos, cores vibrantes, fundo simples, alta qualidade.",
  painting: "Pintura digital artística, pinceladas visíveis, textura rica, iluminação suave, composição elegante.",
  '3d_render': "Renderização 3D ultra-detalhada, Octane render, Unreal Engine 5, texturas PBR realistas, iluminação volumétrica.",
  minimalist: "Design minimalista, fundo limpo, cores sólidas, composição geométrica, foco no produto, estilo Apple."
};

const STYLE_LABELS: Record<ImageStyle, string> = {
  realistic: "Fotografia Realista",
  cinematic: "Cinematográfico",
  cartoon: "Cartoon / Vetor",
  painting: "Pintura Digital",
  '3d_render': "Render 3D",
  minimalist: "Minimalista"
};

export const MultimodalCreation: React.FC<MultimodalCreationProps> = ({ userEmail }) => {
  const [prompt, setPrompt] = useState('');
  const [quantity, setQuantity] = useState(4);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('1:1');
  const [selectedStyles, setSelectedStyles] = useState<ImageStyle[]>(['realistic']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (selectedStyles.length === 0) {
        alert("Selecione pelo menos um estilo.");
        return;
    }

    setIsGenerating(true);
    setProgress(0);
    
    const apiKey = ((window as any).__NEURION_KEY__ || localStorage.getItem('neurion_openai_api_key') || '');
    if (!apiKey) {
        alert("API Key não configurada.");
        setIsGenerating(false);
        return;
    }

    const ai = new GoogleGenAI({ apiKey });
    const newImages: GeneratedImage[] = [];
    const totalImages = quantity;
    const batchSize = 3; // Limit concurrent requests

    // Distribute styles across the quantity
    const tasks: { style: ImageStyle, prompt: string, aspectRatio: string }[] = [];
    for (let i = 0; i < quantity; i++) {
        const style = selectedStyles[i % selectedStyles.length];
        tasks.push({ style, prompt, aspectRatio });
    }

    try {
        for (let i = 0; i < tasks.length; i += batchSize) {
            const batch = tasks.slice(i, i + batchSize);
            const promises = batch.map(async (task) => {
                const fullPrompt = `${task.prompt}. ${STYLE_PROMPTS[task.style]}. CLEAN IMAGE, NO TEXT, NO WATERMARK, NO LOGOS, NO TYPOGRAPHY. The image should be purely visual material suitable for video background or b-roll.`;
                try {
                    const base64Image = await generateImage(fullPrompt, task.aspectRatio as any, apiKey);

                    if (base64Image) {
                        return {
                            id: crypto.randomUUID(),
                            url: base64Image,
                            prompt: task.prompt,
                            style: task.style,
                            createdAt: Date.now()
                        };
                    }
                    return null;
                } catch (e) {
                    console.error("Image gen error", e);
                    return null;
                }
            });

            const results = await Promise.all(promises);
            results.forEach(img => {
                if (img) newImages.push(img);
            });
            
            setProgress(Math.round(((i + batch.length) / totalImages) * 100));
        }

        setGeneratedImages(prev => [...newImages, ...prev]);

    } catch (error) {
        console.error("Batch generation failed", error);
        alert("Erro na geração em lote. Tente novamente.");
    } finally {
        setIsGenerating(false);
        setProgress(0);
    }
  };

  const toggleStyle = (style: ImageStyle) => {
      setSelectedStyles(prev => 
          prev.includes(style) 
               ? prev.filter(s => s !== style)
              : [...prev, style]
      );
  };

  const downloadZip = async () => {
      if (generatedImages.length === 0) return;
      
      const zip = new JSZip();
      const folder = zip.folder("Neurion_Imagens");
      
      generatedImages.forEach((img, index) => {
          const base64Data = img.url.split(',')[1];
          folder?.file(`imagem_${index + 1}_${img.style}.png`, base64Data, { base64: true });
      });
      
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `Neurion_Batch_${Date.now()}.zip`;
      link.click();
  };

  const clearGallery = () => {
      if (confirm("Tem certeza que deseja limpar a galeria?")) {
          setGeneratedImages([]);
      }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
      
      {/* CONTROLS */}
      <div className="lg:col-span-4 space-y-6">
        <Card title="Configuração de Geração" icon={<Sparkles className="w-5 h-5 text-indigo-400" />}>
            <div className="space-y-6">
                
                {/* PROMPT */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Descrição do Produto</label>
                    <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-white focus:border-indigo-500 outline-none resize-none h-32 transition-all focus:ring-1 focus:ring-indigo-500/50"
                        placeholder="Descreva o produto, cenário, iluminação e detalhes..."
                    />
                </div>

                {/* QUANTITY */}
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quantidade</label>
                        <span className="text-xs font-bold text-indigo-400">{quantity} imagens</span>
                    </div>
                    <input 
                        type="range" 
                        min="1" 
                        max="20" 
                        value={quantity} 
                        onChange={(e) => setQuantity(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-600">
                        <span>1</span>
                        <span>10</span>
                        <span>20</span>
                    </div>
                </div>

                {/* ASPECT RATIO */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Proporção</label>
                    <div className="grid grid-cols-3 gap-2">
                        {(['1:1', '16:9', '9:16'] as const).map(ratio => (
                            <button
                                key={ratio}
                                onClick={() => setAspectRatio(ratio)}
                                className={`p-2 rounded-lg text-xs font-medium border transition-all ${
                                    aspectRatio === ratio
                                     ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                                    : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                                }`}
                            >
                                {ratio}
                            </button>
                        ))}
                    </div>
                </div>

                {/* STYLES */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estilos Visuais</label>
                    <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(STYLE_LABELS) as ImageStyle[]).map(style => (
                            <button
                                key={style}
                                onClick={() => toggleStyle(style)}
                                className={`p-2 rounded-lg text-xs font-medium border transition-all text-left flex items-center gap-2 ${
                                    selectedStyles.includes(style)
                                     ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                                    : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                                }`}
                            >
                                <div className={`w-3 h-3 rounded-full border ${selectedStyles.includes(style) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'}`} />
                                {STYLE_LABELS[style]}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ACTION */}
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim() || selectedStyles.length === 0}
                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Gerando {progress}%...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-5 h-5" />
                            Gerar Lote de Imagens
                        </>
                    )}
                </button>
            </div>
        </Card>
      </div>

      {/* GALLERY */}
      <div className="lg:col-span-8 space-y-6">
        <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <Grid className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-white">Galeria de Resultados</h3>
                    <p className="text-xs text-slate-500">{generatedImages.length} imagens geradas</p>
                </div>
            </div>
            <div className="flex gap-2">
                {generatedImages.length > 0 && (
                    <>
                        <button 
                            onClick={clearGallery}
                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Limpar Galeria"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={downloadZip}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-emerald-900/20"
                        >
                            <Archive className="w-4 h-4" />
                            Baixar ZIP
                        </button>
                    </>
                )}
            </div>
        </div>

        {generatedImages.length === 0 ? (
            <div className="h-96 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-600 gap-4">
                <ImageIcon className="w-12 h-12 opacity-20" />
                <p className="text-sm">Nenhuma imagem gerada ainda.</p>
            </div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {generatedImages.map((img) => (
                    <div key={img.id} className="group relative aspect-square bg-slate-900 rounded-xl overflow-hidden border border-slate-800 hover:border-indigo-500/50 transition-all">
                        <img src={img.url} alt={img.prompt} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
                            <span className="text-[10px] font-bold text-white bg-black/50 px-2 py-1 rounded-full uppercase tracking-wider border border-white/10">
                                {STYLE_LABELS[img.style as ImageStyle]}
                            </span>
                            <div className="flex gap-2 mt-2">
                                <button 
                                    onClick={() => setSelectedImage(img)}
                                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                                >
                                    <Maximize className="w-4 h-4" />
                                </button>
                                <a 
                                    href={img.url} 
                                    download={`neurion_${img.style}_${img.id.slice(0,4)}.png`}
                                    className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-full text-white transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                </a>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* LIGHTBOX MODAL */}
      {selectedImage && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col gap-4">
                  <div className="flex justify-between items-center text-white">
                      <div>
                          <h3 className="font-bold text-lg">{STYLE_LABELS[selectedImage.style as ImageStyle]}</h3>
                          <p className="text-xs text-slate-400 line-clamp-1">{selectedImage.prompt}</p>
                      </div>
                      <button 
                        onClick={() => setSelectedImage(null)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                      >
                          <X className="w-6 h-6" />
                      </button>
                  </div>
                  <div className="flex-1 bg-black rounded-lg overflow-hidden flex items-center justify-center border border-slate-800">
                      <img src={selectedImage.url} alt="Full size" className="max-w-full max-h-[80vh] object-contain" />
                  </div>
                  <div className="flex justify-center">
                      <a 
                          href={selectedImage.url} 
                          download={`neurion_full_${selectedImage.id}.png`}
                          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold shadow-lg shadow-indigo-900/50 transition-all"
                      >
                          <Download className="w-5 h-5" />
                          Baixar Imagem Original
                      </a>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};


