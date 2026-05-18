import React, { useState, useEffect, useRef } from 'react';
import { getModel, MODEL_IMAGE } from '../utils/modelConfig';
import { 
  Pencil, 
  MousePointer2, 
  Type, 
  Square, 
  Circle, 
  Eraser, 
  Undo, 
  Redo, 
  ZoomIn, 
  ZoomOut, 
  Mic, 
  Sparkles, 
  Bot, 
  Zap, 
  BrainCircuit, 
  FileText, 
  FileJson, 
  XCircle, 
  Hand,
  Bug // Debug icon
} from 'lucide-react';
import { 
  Canvas, 
  Rect, 
  Circle as FabricCircle, 
  IText, 
  Textbox,
  PencilBrush, 
  Line, 
  Object as FabricObject,
  Point,
  Group,
  Shadow
} from 'fabric'; 
import { VoiceCommand, MentorStyle, Suggestion } from '../types';
import { OpenAICompatClient as GoogleGenAI } from "../utils/openai";
import { useMemory } from '../hooks/useMemory';
import { SuggestionPanel } from './SuggestionPanel';
import { ToolButton } from './ToolButton';
import jsPDF from 'jspdf';

interface FunnelVisualCognitiveProps {
  userEmail: string;
  voiceTrigger?: VoiceCommand | null;
  onVoiceTriggerHandled?: () => void;
  onClose?: () => void;
  onCanvasUpdate?: (base64: string) => void;
  mentorStyle?: MentorStyle;
}

export const FunnelVisualCognitive: React.FC<FunnelVisualCognitiveProps> = ({ 
  userEmail, 
  voiceTrigger, 
  onVoiceTriggerHandled, 
  onClose, 
  onCanvasUpdate,
  mentorStyle = 'hibrido' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'rect' | 'circle' | 'text' | 'draw' | 'erase' | 'hand'>('select');
  const [color, setColor] = useState('#4F46E5'); 
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string>("Olá! Sou seu Sócio Artificial. O que vamos construir?");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isMicActive, setIsMicActive] = useState(false);
  
  // Memory Hook
  const { addMemory, retrieveMemories, isReady: isMemoryReady } = useMemory(userEmail);

  // History State
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isHistoryProcessing, setIsHistoryProcessing] = useState(false);

  // Initialize Canvas
  useEffect(() => {
    if (canvasRef.current && !fabricCanvas) {
      console.log("Initializing Fabric Canvas (Simple Mode)...");
      
      const width = window.innerWidth - 80;
      const height = window.innerHeight - 80;

      const canvas = new Canvas(canvasRef.current, {
        width: width,
        height: height,
        backgroundColor: '#0f172a',
        selection: true,
      });
      
      canvas.freeDrawingBrush = new PencilBrush(canvas);
      canvas.freeDrawingBrush.width = 3;
      canvas.freeDrawingBrush.color = color;

      setFabricCanvas(canvas);
      
      setHistory([JSON.stringify(canvas.toJSON())]);
      setHistoryIndex(0);

      console.log("Canvas Initialized:", canvas);

      // Event Listeners
      const handleSave = () => {
          if (!isHistoryProcessing) {
            setHistory(prev => {
                const newHistory = prev.slice(0, historyIndex + 1);
                newHistory.push(JSON.stringify(canvas.toJSON()));
                return newHistory;
            });
            setHistoryIndex(prev => prev + 1);
            
            if (onCanvasUpdate) {
                const base64 = canvas.toDataURL({ format: 'png', multiplier: 0.5 });
                onCanvasUpdate(base64.split(',')[1]);
            }
          }
      };

      canvas.on('object:added', handleSave);
      canvas.on('object:modified', handleSave);
      canvas.on('object:removed', handleSave);

      // Zoom
      canvas.on('mouse:wheel', (opt) => {
          const delta = opt.e.deltaY;
          let zoom = canvas.getZoom();
          zoom *= 0.999 ** delta;
          if (zoom > 20) zoom = 20;
          if (zoom < 0.01) zoom = 0.01;
          canvas.zoomToPoint(new Point(opt.e.offsetX, opt.e.offsetY), zoom);
          opt.e.preventDefault();
          opt.e.stopPropagation();
      });

      // Handle Resize
      const handleResize = () => {
          canvas.setDimensions({
              width: window.innerWidth - 80,
              height: window.innerHeight - 80
          });
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        canvas.dispose();
        setFabricCanvas(null);
      };
    }
  }, [canvasRef]); 

  // History Management (Separate Effect)
  useEffect(() => {
      if (!fabricCanvas) return;
      const handleSave = () => {
          if (isHistoryProcessing) return;
          const json = JSON.stringify(fabricCanvas.toJSON());
          setHistory(prev => {
              const newHistory = prev.slice(0, historyIndex + 1);
              newHistory.push(json);
              return newHistory;
          });
          setHistoryIndex(prev => prev + 1);
      };
      fabricCanvas.off('object:added');
      fabricCanvas.off('object:modified');
      fabricCanvas.off('object:removed');
      fabricCanvas.on('object:added', handleSave);
      fabricCanvas.on('object:modified', handleSave);
      fabricCanvas.on('object:removed', handleSave);
  }, [fabricCanvas, historyIndex, isHistoryProcessing]);

  // Proactive Suggestions (Marketing Triggers)
  useEffect(() => {
    if (!fabricCanvas) return;

    const checkTriggers = setInterval(() => {
        const objects = fabricCanvas.getObjects();
        const textObjects = objects.filter(o => o.type === 'text' || o.type === 'i-text').map((o: any) => o.text?.toLowerCase() || '');
        
        const newSuggestions: Suggestion[] = [];

        // Trigger 1: Checkout without Upsell
        const hasCheckout = textObjects.some(t => t.includes('checkout') || t.includes('pagamento'));
        const hasUpsell = textObjects.some(t => t.includes('upsell') || t.includes('order bump'));
        
        if (hasCheckout && !hasUpsell) {
            newSuggestions.push({
                id: 'upsell-missing',
                title: 'Oportunidade de Lucro',
                description: mentorStyle === 'finch' 
                     ? 'Dados mostram que um Order Bump aumenta o LTV em 20%. Adicione agora.' 
                    : 'Você tá deixando dinheiro na mesa! Bota um Upsell aí ou vai ficar no prejuízo.',
                type: 'optimization',
                confidence: 0.9,
                actionData: { type: 'DRAW_RECTANGLE', text: 'Upsell (Order Bump)', color: '#7C3AED' } // Purple
            });
        }

        // Trigger 2: VSL without Headline
        const hasVSL = textObjects.some(t => t.includes('vsl') || t.includes('video'));
        const hasHeadline = textObjects.some(t => t.includes('headline') || t.includes('promessa'));

        if (hasVSL && !hasHeadline) {
            newSuggestions.push({
                id: 'headline-missing',
                title: 'Falta a Promessa',
                description: 'Ninguém vê VSL sem uma Headline forte. Quer que eu crie uma?',
                type: 'missing_element',
                confidence: 0.85,
                actionData: { type: 'DRAW_TEXT', text: 'HEADLINE: Como [Benefício] sem [Dor]', color: '#EF4444', fontSize: 24 }
            });
        }

        setSuggestions(newSuggestions);

    }, 10000); // Check every 10 seconds

    return () => clearInterval(checkTriggers);
  }, [fabricCanvas, mentorStyle]);

  // Tool Logic
  useEffect(() => {
    if (!fabricCanvas) return;
    fabricCanvas.isDrawingMode = activeTool === 'draw';
    fabricCanvas.selection = activeTool === 'select';
    fabricCanvas.defaultCursor = activeTool === 'hand' ? 'grab' : activeTool === 'draw' ? 'crosshair' : activeTool === 'erase' ? 'not-allowed' : 'default';

    fabricCanvas.off('mouse:down');
    
    if (activeTool === 'hand') {
         let isDragging = false;
         let lastPosX = 0;
         let lastPosY = 0;
         const getClientPoint = (event: any) => {
            const touch = event.touches?.[0] || event.changedTouches?.[0];
            return {
              x: touch ? touch.clientX : event.clientX,
              y: touch ? touch.clientY : event.clientY,
            };
         };
         fabricCanvas.on('mouse:down', (opt) => {
            const point = getClientPoint(opt.e);
            isDragging = true;
            fabricCanvas.selection = false;
            lastPosX = point.x;
            lastPosY = point.y;
            fabricCanvas.defaultCursor = 'grabbing';
         });
         fabricCanvas.on('mouse:move', (opt) => {
            if (isDragging) {
                const point = getClientPoint(opt.e);
                const vpt = fabricCanvas.viewportTransform;
                if (vpt) {
                    vpt[4] += point.x - lastPosX;
                    vpt[5] += point.y - lastPosY;
                    fabricCanvas.requestRenderAll();
                    lastPosX = point.x;
                    lastPosY = point.y;
                }
            }
         });
         fabricCanvas.on('mouse:up', () => {
            isDragging = false;
            fabricCanvas.selection = true;
            fabricCanvas.defaultCursor = 'grab';
         });
    }

    if (activeTool === 'erase') {
        fabricCanvas.selection = false;
        fabricCanvas.on('mouse:down', (opt) => {
            if (opt.target) {
                fabricCanvas.remove(opt.target);
                fabricCanvas.requestRenderAll();
            }
        });
    }

    if (activeTool === 'rect' || activeTool === 'circle' || activeTool === 'text') {
        fabricCanvas.on('mouse:down', (opt) => {
            const pointer = fabricCanvas.getScenePoint(opt.e);
            let obj;

            if (activeTool === 'rect') {
                obj = new Rect({
                    left: pointer.x,
                    top: pointer.y,
                    width: 120,
                    height: 70,
                    fill: color,
                    stroke: '#fff',
                    strokeWidth: 2,
                    rx: 8,
                    ry: 8
                });
            } else if (activeTool === 'circle') {
                obj = new FabricCircle({
                    left: pointer.x,
                    top: pointer.y,
                    radius: 40,
                    fill: color,
                    stroke: '#fff',
                    strokeWidth: 2
                });
            } else if (activeTool === 'text') {
                obj = new IText('Novo Texto', {
                    left: pointer.x,
                    top: pointer.y,
                    fontFamily: 'Inter',
                    fill: '#fff',
                    fontSize: 20
                });
            }

            if (obj) {
                fabricCanvas.add(obj);
                fabricCanvas.setActiveObject(obj);
                setActiveTool('select'); 
            }
        });
    }
  }, [activeTool, fabricCanvas, color]);

  // Voice Command Listener
  useEffect(() => {
    if (voiceTrigger && voiceTrigger.action === 'DRAW_ON_CANVAS' && fabricCanvas) {
        const prompt = voiceTrigger.payload?.drawCommand?.prompt || voiceTrigger.payload?.description;
        
        if (prompt) {
            console.log("Voice Command Received:", prompt);
            handleAiDraw(prompt);
            if (onVoiceTriggerHandled) {
                onVoiceTriggerHandled();
            }
        }
    }
  }, [voiceTrigger, fabricCanvas]);

  // AI & Memory Logic
  const handleAiDraw = async (prompt: string) => {
      if (!prompt) return;
      
      setIsAiProcessing(true);
      setAiFeedback("Acessando memória e processando...");
      
      try {
          const apiKey = ((window as any).__NEURION_KEY__ || localStorage.getItem('neurion_openai_api_key') || '');
          if (!apiKey) {
              setAiFeedback("Erro: API Key não encontrada.");
              return;
          }

          // 1. Retrieve Context from Memory
          let memoryContext = "";
          try {
             if (isMemoryReady) {
                 const memories = await retrieveMemories(prompt, 3);
                 memoryContext = memories.map(m => m.content).join('\n');
             }
          } catch (err) {
              console.warn("Memory retrieval failed:", err);
          }

          const ai = new GoogleGenAI({ apiKey });
          const context = getCanvasContext();

          // 2. Define Persona
          let personaInstruction = "";
          if (mentorStyle === 'finch') {
              personaInstruction = "Você é Thiago Finch. Fale de LTV, conversão, ROI, Upsell. Seja técnico e frio.";
          } else if (mentorStyle === 'marcal') {
              personaInstruction = "Você é Pablo Marçal. Fale de destravar, governar, explodir na terra. Seja agressivo e motivacional.";
          } else {
              personaInstruction = "Você é um estrategista híbrido. Misture a técnica do Finch com a energia do Marçal.";
          }

          const systemPrompt = `
            ${personaInstruction}
            
            MEMÓRIA DE LONGO PRAZO (O que já fizemos antes):
            ${memoryContext || "Nenhuma memória relevante."}

            CONTEXTO ATUAL DO CANVAS (JSON):
            ${context}

            COMANDO DO USUÁRIO: "${prompt}"

            OBJETIVO:
            1. Gerar JSON para desenhar no canvas.
            2. Responder como o mentor escolhido.
            
            COMANDOS DISPONÍVEIS:
            - { "type": "DRAW_RECTANGLE", "x": number, "y": number, "width": number, "height": number, "text": string, "color": string }
            - { "type": "DRAW_CIRCLE", "x": number, "y": number, "radius": number, "text": string, "color": string }
            - { "type": "DRAW_ARROW", "from": { "x": number, "y": number }, "to": { "x": number, "y": number }, "color": string }
            - { "type": "DRAW_TEXT", "x": number, "y": number, "text": string, "fontSize": number, "color": string }
            - { "type": "CLEAR" }
            - { "type": "SUGGESTION", "message": "string" }

            REGRAS DE DESIGN:
            - Cores: Azul (#3B82F6 - Topo Funil/Anuncio), Roxo (#8B5CF6 - Captura/Quiz), Vermelho (#EF4444 - Oferta Principal), Verde (#10B981 - Checkout/Compra), Amarelo (#F59E0B - Upsell/Bump), Ciano (#06B6D4 - Remarketing).
            - Canvas tem 1200x700px. Centre o funil horizontalmente.
            - Para funis VERTICAIS: use X fixo (~500-550) e incremente Y de 120 em 120.
            - Para funis HORIZONTAIS: use Y fixo (~300) e incremente X de 220 em 220.
            - Blocos retangulares: width=180, height=70. NUNCA sobreponha blocos.
            - Setas SEMPRE verticais e centralizadas. Fórmula OBRIGATÓRIA:
              from = {x: bloco_x + 90, y: bloco_y + 70}   centro-inferior do bloco acima
              to   = {x: proximo_x + 90, y: proximo_y}     centro-superior do bloco abaixo
              AMBOS os valores de X devem ser IGUAIS (bloco_x + 90) para garantir alinhamento central.
              NUNCA use x diferente no from e no to para setas verticais.
            - Texto dos blocos: máximo 25 caracteres. Use abreviações se necessário.
            - Sempre inclua um SUGGESTION ao final explicando o funil criado.
            - Para um funil padrão de 4 etapas use: y=80, y=200, y=320, y=440.
            
            IMPORTANTE: 
            - RETORNE APENAS JSON VÁLIDO como array []. 
            - NÃO USE MARKDOWN. 
            - Cada elemento é um objeto com "type" obrigatório.
            - SEMPRE termine com um objeto {"type":"SUGGESTION","message":"..."}.
          `;

          const response = await ai.models.generateContent({
              model: getModel(),
              contents: systemPrompt,
              config: { responseMimeType: 'application/json' }
          });

          let jsonText = response.text || '[]';
          console.log("AI Raw Response (Voice OS):", jsonText); // Debug Critical

          // Robust JSON Extraction
          jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
          const jsonMatch = jsonText.match(/\[.*\]|\{.*\}/s);
          if (jsonMatch) {
              jsonText = jsonMatch[0];
          }

          let commands: any = [];
          try {
            const parsed = JSON.parse(jsonText);
            commands = Array.isArray(parsed) ? parsed : (parsed.commands || [parsed]);
          } catch (e) {
            console.error("JSON Parse Error", e, jsonText);
            setAiFeedback("Erro: A IA não gerou instruções válidas.");
            return;
          }
          
          if (!commands || commands.length === 0) {
              console.warn("No commands found in parsed JSON");
              setAiFeedback("A IA entendeu, mas não gerou desenhos.");
              return;
          }

          executeAiCommands(commands);
          
          // 3. Save to Memory
          const suggestion = commands.find((c: any) => c.type === 'SUGGESTION');
          const aiResponseText = suggestion ? suggestion.message : "Comando executado.";
          
          if (suggestion) setAiFeedback(suggestion.message);
          else setAiFeedback("Feito!");

          if (isMemoryReady) {
            await addMemory(
                `User: ${prompt} | AI: ${aiResponseText}`,
                'interaction',
                { mentorStyle }
            );
          }

      } catch (error) {
          console.error("AI Generation Error:", error);
          setAiFeedback("Erro de conexão ou processamento.");
      } finally {
          setIsAiProcessing(false);
      }
  };

  const executeAiCommands = (commands: any[]) => {
      if (!fabricCanvas) {
          console.error("Canvas not initialized");
          setAiFeedback("Erro interno: Canvas desconectado.");
          return;
      }

      const canvasW = fabricCanvas.width || 1200;
      const canvasH = fabricCanvas.height || 700;

      commands.forEach(cmd => {
          try {
            // Safe coordinate helpers
            const x = (typeof cmd.x === 'number' && !isNaN(cmd.x)) ? cmd.x : canvasW / 2 - 75;
            const y = (typeof cmd.y === 'number' && !isNaN(cmd.y)) ? cmd.y : canvasH / 2 - 40;

            if (cmd.type === 'DRAW_RECTANGLE') {
                const w = cmd.width  || 180;
                const h = cmd.height || 70;
                const fillColor = cmd.color || '#3B82F6';

                // Rect + Textbox grouped so text is always INSIDE the block
                const rect = new Rect({
                    left: 0, top: 0,
                    width: w, height: h,
                    fill: fillColor,
                    stroke: 'rgba(255,255,255,0.25)',
                    strokeWidth: 1.5,
                    rx: 10, ry: 10,
                    shadow: new Shadow('0 4px 20px rgba(0,0,0,0.4)'),
                });

                const label = new Textbox(cmd.text || '', {
                    left: 8, top: 0,
                    width: w - 16,
                    height: h,
                    fontSize: Math.min(14, Math.floor(w / (cmd.text?.length || 10) * 1.4)),
                    fill: '#ffffff',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: '600',
                    textAlign: 'center',
                    verticalAlign: 'center' as any,
                });

                // Center text vertically inside group
                const textH = label.calcTextHeight ? label.calcTextHeight() : 20;
                label.set({ top: (h - textH) / 2 });

                const group = new Group([rect, label], {
                    left: x, top: y,
                    selectable: true,
                    hasControls: true,
                });
                fabricCanvas.add(group);

            } else if (cmd.type === 'DRAW_CIRCLE') {
                const r = cmd.radius || 50;
                const fillColor = cmd.color || '#8B5CF6';

                const circle = new FabricCircle({
                    left: 0, top: 0,
                    radius: r,
                    fill: fillColor,
                    stroke: 'rgba(255,255,255,0.25)',
                    strokeWidth: 1.5,
                });

                const label = new Textbox(cmd.text || '', {
                    left: -r + 4, top: -12,
                    width: (r * 2) - 8,
                    fontSize: 13,
                    fill: '#ffffff',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: '600',
                    textAlign: 'center',
                });

                const group = new Group([circle, label], {
                    left: x, top: y,
                    selectable: true,
                });
                fabricCanvas.add(group);

            } else if (cmd.type === 'DRAW_ARROW') {
                // Always recalculate to center-bottom  center-top of blocks
                // Block default: width=180, height=70
                // from = center-bottom of upper block, to = center-top of lower block
                const blockW = cmd.blockWidth  || 180;
                const blockH = cmd.blockHeight || 70;

                // If AI provides block positions (preferred), derive arrow from them
                // Otherwise use raw from/to but force horizontal centering
                let fromX: number, fromY: number, toX: number, toY: number;

                if (cmd.from && cmd.to) {
                    // AI gave coords — but snap X to block center if nearby
                    fromX = cmd.from.x;
                    fromY = cmd.from.y;
                    toX   = cmd.to.x;
                    toY   = cmd.to.y;

                    // If from/to X are similar (vertical arrow), center both
                    const midX = (fromX + toX) / 2;
                    fromX = midX;
                    toX   = midX;
                } else {
                    fromX = x + blockW / 2;
                    fromY = y + blockH;
                    toX   = x + blockW / 2;
                    toY   = y + blockH + 50;
                }

                const stroke = cmd.color || 'rgba(255,255,255,0.55)';

                const line = new Line([fromX, fromY, toX, toY], {
                    stroke, strokeWidth: 2.5, selectable: true,
                });

                // Arrowhead
                const angle = Math.atan2(toY - fromY, toX - fromX);
                const arrowSize = 14;
                const ax1 = toX - arrowSize * Math.cos(angle - Math.PI / 6);
                const ay1 = toY - arrowSize * Math.sin(angle - Math.PI / 6);
                const ax2 = toX - arrowSize * Math.cos(angle + Math.PI / 6);
                const ay2 = toY - arrowSize * Math.sin(angle + Math.PI / 6);

                const head1 = new Line([toX, toY, ax1, ay1], { stroke, strokeWidth: 2.5 });
                const head2 = new Line([toX, toY, ax2, ay2], { stroke, strokeWidth: 2.5 });

                fabricCanvas.add(line, head1, head2);

            } else if (cmd.type === 'DRAW_TEXT') {
                const text = new IText(cmd.text || '', {
                    left: x, top: y,
                    fontSize: cmd.fontSize || 18,
                    fill: cmd.color || '#ffffff',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: '700',
                    shadow: new Shadow('0 2px 8px rgba(0,0,0,0.5)'),
                });
                fabricCanvas.add(text);

            } else if (cmd.type === 'CLEAR') {
                fabricCanvas.clear();
                fabricCanvas.backgroundColor = '#0f172a';

            } else if (cmd.type === 'SUGGESTION') {
                // Just feedback, no canvas draw
            }
          } catch (err) {
              console.error("Error executing command:", cmd, err);
          }
      });

      fabricCanvas.requestRenderAll();
  };

    const getCanvasContext = () => {
      if (!fabricCanvas) return "Canvas vazio.";
      return JSON.stringify(fabricCanvas.getObjects().map((obj: any) => ({
          type: obj.type, left: Math.round(obj.left), top: Math.round(obj.top),
          text: obj.text || '', fill: obj.fill
      })));
  };

  // Export Functions
  const exportToPDF = () => {
      if (!fabricCanvas) return;
      const imgData = fabricCanvas.toDataURL({ format: 'png', multiplier: 1 });
      const pdf = new jsPDF();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('neurion-funnel.pdf');
  };

  const exportToJSON = () => {
      if (!fabricCanvas) return;
      const json = JSON.stringify(fabricCanvas.toJSON());
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'neurion-funnel.json';
      a.click();
  };

  // Helper for Zoom
  const handleZoom = (factor: number) => {
      if (fabricCanvas) {
          let zoom = fabricCanvas.getZoom();
          zoom *= factor;
          if (zoom > 20) zoom = 20;
          if (zoom < 0.01) zoom = 0.01;
          fabricCanvas.setZoom(zoom);
      }
  };

  const undo = async () => {
      if (historyIndex > 0 && fabricCanvas) {
          setIsHistoryProcessing(true);
          const prevState = history[historyIndex - 1];
          await fabricCanvas.loadFromJSON(JSON.parse(prevState));
          fabricCanvas.renderAll();
          setHistoryIndex(prev => prev - 1);
          setIsHistoryProcessing(false);
      }
  };

  const redo = async () => {
      if (historyIndex < history.length - 1 && fabricCanvas) {
          setIsHistoryProcessing(true);
          const nextState = history[historyIndex + 1];
          await fabricCanvas.loadFromJSON(JSON.parse(nextState));
          fabricCanvas.renderAll();
          setHistoryIndex(prev => prev + 1);
          setIsHistoryProcessing(false);
      }
  };

  const clearCanvas = () => {
      if (fabricCanvas) {
          fabricCanvas.clear();
          fabricCanvas.backgroundColor = '#0f172a';
          fabricCanvas.renderAll();
      }
  };

  // Manual Test Function
  const manualTestDraw = () => {
      if (!fabricCanvas) {
          alert("Canvas não inicializado!");
          return;
      }
      try {
          const rect = new Rect({
              left: 100,
              top: 100,
              width: 100,
              height: 100,
              fill: 'red',
              stroke: 'white',
              strokeWidth: 2
          });
          fabricCanvas.add(rect);
          
          const text = new IText('Teste Manual', {
              left: 110,
              top: 140,
              fontSize: 16,
              fill: 'white',
              fontFamily: 'Inter'
          });
          fabricCanvas.add(text);
          
          fabricCanvas.requestRenderAll();
          console.log("Manual draw executed");
      } catch (e) {
          console.error("Manual draw failed:", e);
          alert("Erro ao desenhar manualmente: " + e);
      }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white overflow-hidden animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="h-14 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${mentorStyle === 'finch' ? 'bg-emerald-500/20 text-emerald-400' : mentorStyle === 'marcal' ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
                <h2 className="text-sm font-bold tracking-wide">NEURION VISUAL COGNITIVE</h2>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Modo: {mentorStyle.toUpperCase()}</span>
                    {isMemoryReady && <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Memória Ativa" />}
                </div>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={manualTestDraw} className="p-2 hover:bg-slate-800 rounded-lg text-yellow-400 hover:text-yellow-300" title="Teste Manual (Debug)">
                <Bug className="w-4 h-4" />
            </button>
            <button onClick={exportToPDF} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white" title="Exportar PDF">
                <FileText className="w-4 h-4" />
            </button>
            <button onClick={exportToJSON} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white" title="Salvar JSON">
                <FileJson className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-slate-800 mx-2" />
            <button onClick={onClose} className="p-2 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400">
                <XCircle className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* TOOLBAR */}
        <div className="w-16 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-4 gap-2 z-10">
            <ToolButton icon={<MousePointer2 />} active={activeTool === 'select'} onClick={() => setActiveTool('select')} tooltip="Selecionar (V)" />
            <ToolButton icon={<Hand />} active={activeTool === 'hand'} onClick={() => setActiveTool('hand')} tooltip="Mover (H)" />
            <div className="w-8 h-px bg-slate-800 my-1" />
            <ToolButton icon={<Pencil />} active={activeTool === 'draw'} onClick={() => setActiveTool('draw')} tooltip="Lápis (P)" />
            <ToolButton icon={<Square />} active={activeTool === 'rect'} onClick={() => setActiveTool('rect')} tooltip="Retângulo (R)" />
            <ToolButton icon={<Circle />} active={activeTool === 'circle'} onClick={() => setActiveTool('circle')} tooltip="Círculo (C)" />
            <ToolButton icon={<Type />} active={activeTool === 'text'} onClick={() => setActiveTool('text')} tooltip="Texto (T)" />
            <div className="w-8 h-px bg-slate-800 my-1" />
            <ToolButton icon={<Eraser />} active={activeTool === 'erase'} onClick={() => setActiveTool('erase')} tooltip="Borracha" />
            <ToolButton icon={<Undo />} active={false} onClick={undo} tooltip="Desfazer" />
            <ToolButton icon={<Redo />} active={false} onClick={redo} tooltip="Refazer" />
            <div className="mt-auto flex flex-col gap-3 items-center mb-2">
                <ToolButton icon={<ZoomIn />} active={false} onClick={() => handleZoom(1.1)} tooltip="Zoom In" />
                <ToolButton icon={<ZoomOut />} active={false} onClick={() => handleZoom(0.9)} tooltip="Zoom Out" />
                <input 
                    type="color" 
                    value={color} 
                    onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-8 rounded-full cursor-pointer border-2 border-slate-700 bg-transparent p-0 overflow-hidden"
                />
            </div>
        </div>

        {/* CANVAS WRAPPER */}
        <div className="flex-1 bg-slate-950 relative overflow-hidden cursor-crosshair">
            <canvas ref={canvasRef} className="w-full h-full" />
            
            {/* SUGGESTION PANEL */}
            <SuggestionPanel 
                suggestions={suggestions} 
                mentorStyle={mentorStyle}
                onAccept={(s) => {
                    executeAiCommands([s.actionData]);
                    setSuggestions(prev => prev.filter(p => p.id !== s.id));
                    addMemory(`User accepted suggestion: ${s.title}`, 'feedback', { accepted: true });
                }}
                onReject={(s) => {
                    setSuggestions(prev => prev.filter(p => p.id !== s.id));
                    addMemory(`User rejected suggestion: ${s.title}`, 'feedback', { accepted: false });
                }}
            />

            {/* AI OVERLAY */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4">
                <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
                    
                    {/* FEEDBACK TEXT */}
                    <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full mt-1 ${isAiProcessing ? 'bg-indigo-500 animate-pulse' : 'bg-slate-800'}`}>
                            {isAiProcessing ? <Sparkles className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-indigo-400" />}
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-1">
                                {mentorStyle === 'finch' ? 'Finch AI' : mentorStyle === 'marcal' ? 'Marçal AI' : 'Neurion AI'}
                            </p>
                            <p className="text-sm text-slate-200 leading-relaxed font-medium">
                                {aiFeedback}
                            </p>
                        </div>
                    </div>

                    {/* INPUT AREA */}
                    <div className="relative flex items-center gap-2 bg-slate-950/50 rounded-xl border border-slate-800 p-1 pl-3">
                        <input 
                            type="text"
                            placeholder="Descreva o que desenhar ou peça uma análise..."
                            className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-slate-500 h-10"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleAiDraw(e.currentTarget.value);
                                    e.currentTarget.value = '';
                                }
                            }}
                        />
                        <button 
                            className={`p-2 rounded-lg transition-colors ${isMicActive ? 'bg-red-500/20 text-red-400 animate-pulse' : 'hover:bg-slate-800 text-slate-400'}`}
                            onClick={() => setIsMicActive(!isMicActive)}
                        >
                            <Mic className="w-4 h-4" />
                        </button>
                        <button 
                            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                            onClick={(e) => {
                                const input = e.currentTarget.parentElement?.querySelector('input');
                                if (input) {
                                    handleAiDraw(input.value);
                                    input.value = '';
                                }
                            }}
                        >
                            <Zap className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};


