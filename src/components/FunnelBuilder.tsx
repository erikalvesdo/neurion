
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getModel, MODEL_IMAGE } from '../utils/modelConfig';
import { 
  Save, 
  Download, 
  Plus, 
  Trash2, 
  Layout, 
  ArrowRight, 
  MousePointer2, 
  Code2, 
  Undo2, 
  FolderOpen,
  MonitorPlay,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  FileText,
  Maximize2,
  X,
  Send,
  Loader2,
  Smartphone,
  Monitor,
  Paperclip,
  Image as ImageIcon,
  AlertCircle,
  FileVideo,
  FileType,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  History,
  Play,
  Pencil,
  Crown
} from 'lucide-react';
import { 
  CampaignState, 
  FunnelNode, 
  NodeType, 
  FunnelConnection, 
  FunnelProject 
} from '../types'; 
import { Card } from './Card';
import JSZip from 'jszip';
import { OpenAICompatClient as GoogleGenAI } from "../utils/openai";

// ... existing imports

// --- FINANCIAL VALIDATION HELPER ---
const validateFunnelFinancially = (nodes: FunnelNode[], userEmail: string) => {
  const simStateRaw = localStorage.getItem(`neurion_campaign_state_${userEmail}`);
  if (!simStateRaw) return null;
  
  const simState: CampaignState = JSON.parse(simStateRaw);
  
  // Estimate Conversion Rate based on funnel length/complexity
  let conversionRate = 0.02; // Base 2%
  const hasVSL = nodes.some(n => n.type === 'vsl');
  const hasUpsell = nodes.some(n => n.type === 'upsell');
  
  if (hasVSL) conversionRate += 0.01; // VSL increases conversion
  
  // Friction penalty
  conversionRate -= (nodes.length * 0.001); 
  if (conversionRate < 0.005) conversionRate = 0.005; // Min 0.5%

  // AOV (Average Order Value)
  let aov = simState.ticketPrice || 97;
  if (hasUpsell) aov *= 1.3; // Upsell increases AOV by ~30%
  
  // CPC (Cost Per Click) - Market Standard Estimate
  const cpc = 2.00; 
  
  // Projected CPA = CPC / ConversionRate
  const projectedCPA = cpc / conversionRate;
  
  // ROI = (AOV - CPA) / CPA
  const projectedROI = ((aov - projectedCPA) / projectedCPA) * 100;
  
  return {
    viable: projectedROI > 0,
    roi: projectedROI,
    cpa: projectedCPA,
    conversionRate: conversionRate * 100,
    aov
  };
};

// --- ICONS MAPPING ---
const KNOWLEDGE_BASE = [
  { q: "O que é um VSL?", a: "Video Sales Letter. Uma carta de vendas em formato de vídeo." },
  { q: "O que é um Upsell?", a: "Uma oferta adicional feita após a compra principal para aumentar o ticket médio." },
  { q: "O que é um Downsell?", a: "Uma oferta de menor valor feita quando o cliente recusa a oferta principal." },
  { q: "O que é uma Squeeze Page?", a: "Uma página focada exclusivamente na captura de leads (email/telefone)." },
  { q: "Qual a estrutura de um Checkout?", a: "Deve ser limpo, seguro, mostrar resumo do pedido, garantia e selos de segurança." }
];

const NodeIcons: Record<NodeType, React.ReactNode> = {
  capture: <FileText className="w-4 h-4" />,
  vsl: <MonitorPlay className="w-4 h-4" />,
  checkout: <ShoppingCart className="w-4 h-4" />,
  upsell: <TrendingUp className="w-4 h-4" />,
  downsell: <TrendingDown className="w-4 h-4" />,
  thankyou: <CheckCircle className="w-4 h-4" />,
};

const NodeColors: Record<NodeType, string> = {
  capture: 'border-blue-500 bg-blue-500/10 text-blue-400',
  vsl: 'border-cyan-500 bg-cyan-500/10 text-cyan-400',
  checkout: 'border-emerald-500 bg-emerald-500/10 text-emerald-400',
  upsell: 'border-purple-500 bg-purple-500/10 text-purple-400',
  downsell: 'border-orange-500 bg-orange-500/10 text-orange-400',
  thankyou: 'border-slate-500 bg-slate-500/10 text-slate-400',
};

const NodeLabels: Record<NodeType, string> = {
  capture: 'Página De Vendas',
  vsl: 'VSL',
  checkout: 'Checkout',
  upsell: 'Upsell',
  downsell: 'Downsell',
  thankyou: 'Obrigado',
};

const NodeObjectives: Record<NodeType, string> = {
  capture: `
    OBJETIVO TÉCNICO: PÁGINA DE VENDAS DE ALTA CONVERSÃO (Sales Page Premium).
    
    ESTRUTURA OBRIGATÓRIA (MÍNIMO 8 SEÇÕES):
    
    1. BARRA DE SOCIAL PROOF NO TOPO:
       - Badge animado com pulse: "🔴 LIVE · +2.847 pessoas visualizando agora"
       - Background: rgba(239,68,68,0.1), border: 1px solid rgba(239,68,68,0.3)
       - text-align: center, font-size: 0.8rem, padding: 10px
    
    2. HERO SECTION (min-height: 90vh, display: flex, align-items: center):
       - Container max-width: 900px, text-align: center, margin: 0 auto
       - PRE-HEADLINE: Texto pequeno uppercase tracking-widest em cor accent (ex: "✨ MÉTODO EXCLUSIVO")
       - HEADLINE MASSIVA: font-size: clamp(2.5rem, 5vw, 4rem), font-weight: 900, line-height: 1.05
         * Use background: linear-gradient(135deg, #06b6d4, #3b82f6, #8b5cf6) com -webkit-background-clip: text e color: transparent
       - SUB-HEADLINE: font-size: 1.25rem, color: #94a3b8, max-width: 650px, margin: 24px auto
       - IMAGEM HERO: Use <img> com src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=500&fit=crop" (ou imagem temática)
         * Estilo: border-radius: 20px, box-shadow: 0 30px 80px rgba(0,0,0,0.5), max-width: 700px, margin: 40px auto
         * Envolva em div com position: relative e adicione overlay com glow
       - BOTÃO CTA HERO com id="main-cta": padding: 20px 56px, font-size: 1.2rem, font-weight: 800
         * background: linear-gradient(135deg, #10b981, #059669), border-radius: 16px
         * box-shadow: 0 8px 32px rgba(16,185,129,0.4)
         * Hover: transform: translateY(-3px), box-shadow: 0 12px 40px rgba(16,185,129,0.6)
         * Texto: "QUERO ACESSAR AGORA →"
       - Texto de segurança abaixo: "🔒 Acesso imediato · Garantia de 7 dias · Pagamento seguro"
    
    3. SEÇÃO DE LOGOS/TRUST BAR:
       - Texto: "Confiado por milhares de pessoas" em cinza claro
       - Faixa com 4-5 badges simulados (divs com bordas arredondadas e texto): "⭐ 4.9/5", "🏆 +10.000 alunos", "🔒 100% Seguro", "✅ Garantia 7 dias"
       - Background: rgba(15,23,42,0.4), border-top/bottom: 1px solid rgba(148,163,184,0.08)
       - Display: flex, justify-content: center, gap: 32px, padding: 24px
    
    4. SEÇÃO PROBLEMA/DOR (background ligeiramente diferente):
       - Headline: "Você está cansado de..." com emoji ❌ 
       - Grid de 3 cards com ícones de problema:
         * Cada card: padding: 28px, border-radius: 16px, background glassmorphism
         * Ícone emoji grande (font-size: 2.5rem) no topo
         * Título do problema em negrito
         * Descrição curta em cinza
       - Transição para solução: "E se existisse uma forma de resolver isso de uma vez por todas?"
    
    5. SEÇÃO SOLUÇÃO/BENEFÍCIOS:
       - Headline: "Apresentamos o [Nome do Produto]" com gradiente de texto
       - IMAGEM do produto: Use <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop">
       - Grid de benefícios (2x3 ou 3x2) com ícones ✅:
         * Cada item: display: flex, gap: 12px, align-items: start
         * Ícone: ✅ em cor verde
         * Texto do benefício em bold + descrição
    
    6. SEÇÃO DEPOIMENTOS:
       - Headline: "Veja o que dizem sobre nós ⭐"
       - Grid de 3 cards de depoimento:
         * Avatar: div com 48px, border-radius: 50%, background: gradient, exibindo inicial
         * Nome + cargo/nicho
         * Texto do depoimento em itálico entre aspas
         * Estrelas: "⭐⭐⭐⭐⭐"
         * Card: glassmorphism com hover: transform: translateY(-4px)
    
    7. SEÇÃO FAQ:
       - Headline: "Perguntas Frequentes"
       - 4-5 perguntas em formato accordion (use <details><summary>)
       - Estilo: background cards, border-radius: 12px, margin-bottom: 12px
    
    8. SEÇÃO FINAL CTA:
       - Background com gradiente especial: linear-gradient(135deg, rgba(6,182,212,0.1), rgba(59,130,246,0.1))
       - Headline final de urgência: "Não perca essa oportunidade"
       - Botão CTA duplicado (mesmo estilo do hero)
       - Counter: "⏰ Oferta por tempo limitado"
       - Garantia visual com borda dourada
    
    9. RODAPÉ:
       - Texto legal: "© 2025 Todos os direitos reservados"
       - Links: Termos de Uso | Política de Privacidade
       - Color: #475569, padding: 40px 24px
    
    EFEITOS VISUAIS OBRIGATÓRIOS:
    - 3+ orbs decorativos: position: absolute, width: 400px, height: 400px, border-radius: 50%, 
      background: radial-gradient(circle, rgba(6,182,212,0.15), transparent), filter: blur(80px)
    - Animação fadeInUp em TODAS as seções
    - Shimmer/glow effect no botão CTA
    - Gradient dividers entre seções (height: 1px, background: linear-gradient)
    
    ELEMENTOS PROIBIDOS: Menu de navegação com links, distrações, imagens quebradas.
    IMAGENS: Use APENAS URLs do Unsplash (images.unsplash.com) com parâmetros w=, h=, fit=crop.
    COR DE ACENTO: Gradiente cyan-blue-purple (#06b6d4 → #3b82f6 → #8b5cf6).
  `,
  vsl: `
    OBJETIVO TÉCNICO: VIDEO SALES LETTER (Página de Vendas em Vídeo) - PREMIUM.
    
    ESTRUTURA OBRIGATÓRIA (MÍNIMO 10 SEÇÕES):
    
    1. BARRA DE URGÊNCIA FIXA NO TOPO:
       - position: sticky, top: 0, z-index: 100
       - background: linear-gradient(90deg, #991b1b, #dc2626, #991b1b)
       - Texto: "⚠️ ATENÇÃO: Esta oferta pode ser removida a qualquer momento" 
       - font-weight: 700, text-align: center, padding: 12px, animation: pulse
    
    2. HERO SECTION (min-height: 85vh):
       - PRE-HEADLINE: badge com "🔴 AO VIVO" pulsando
       - HEADLINE: font-size: clamp(2rem, 4.5vw, 3.5rem), font-weight: 900, line-height: 1.05
         * Parte em branco, parte com gradiente de texto (red-orange)
       - Player de Vídeo: div com aspect-ratio: 16/9, max-width: 800px
         * background: #000, border-radius: 20px
         * box-shadow: 0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)
         * Dentro: ícone de play grande centralizado (CSS triangle, width: 80px)
         * Overlay gradiente sutil
       - Abaixo do vídeo: "👆 Clique no Play para assistir a apresentação completa"
    
    3. SEÇÃO DE BENEFÍCIOS COM IMAGENS:
       - Headline: "O que você vai descobrir"
       - Grid 2 colunas: Imagem à esquerda + texto à direita (alternar)
       - Use imagens: <img src="https://images.unsplash.com/photo-1553877522-43269d4ea984?w=500&h=350&fit=crop">
       - 3 itens com ícones, título bold e descrição
    
    4. SEÇÃO PROVA SOCIAL:
       - Headline: "Resultados Reais de Pessoas Reais ⭐"
       - Grid de 3 cards com depoimentos detalhados:
         * Avatar circular com inicial + gradiente
         * Nome, cidade, estrelas (⭐⭐⭐⭐⭐)
         * Texto em itálico entre aspas
         * Card: glassmorphism, hover: translateY(-4px), transition: 0.3s
    
    5. SEÇÃO "PARA QUEM É":
       - Grid 2 colunas: "Para quem é ✅" vs "Para quem NÃO é ❌"
       - Itens em lista com ícones
    
    6. SEÇÃO BÔNUS:
       - Headline: "🎁 BÔNUS EXCLUSIVOS (Por Tempo Limitado)"
       - 3 cards de bônus com numeração (BÔNUS 1, 2, 3)
       - Cada card com ícone, título, descrição e "Valor: R$XX" riscado + "GRÁTIS" em verde
    
    7. SEÇÃO GARANTIA:
       - Card centralizado com border dourada (border: 2px solid #f59e0b)
       - Selo de garantia: emoji 🛡️ grande
       - Headline: "GARANTIA INCONDICIONAL DE 7 DIAS"
       - Texto explicativo sobre risco zero
    
    8. SEÇÃO OFERTA FINAL:
       - Background: linear-gradient com accent colors
       - Preço de-por: preço original riscado + preço atual grande com destaque
       - Parcelamento: "ou 12x de R$XX,XX"
       - BOTÃO CTA com id="main-cta": ENORME, verde, pulsando
         * Texto: "QUERO GARANTIR MINHA VAGA AGORA →"
       - Selos: "🔒 Pagamento Seguro | ✅ Acesso Imediato | 🛡️ Garantia 7 Dias"
    
    9. FAQ (4-5 perguntas com <details>/<summary>)
    
    10. RODAPÉ com disclaimers legais
    
    IMAGENS: Use APENAS URLs do Unsplash com parâmetros w=, h=, fit=crop.
    EFEITOS: orbs decorativos, fadeInUp, glow nos CTAs, gradient dividers.
    COR DE ACENTO: Vermelho-rosa (#ef4444 → #ec4899) para urgência, verde para CTA.
  `,
  checkout: `
    OBJETIVO TÉCNICO: CHECKOUT / PAGAMENTO (Alta Segurança e Confiança).
    
    ESTRUTURA OBRIGATÓRIA:
    1. HEADER LIMPO: Logo + "Checkout Seguro" com ícone 🔒.
    2. LAYOUT DIVIDIDO (desktop: 2 colunas, mobile: stack):
       - COLUNA ESQUERDA (60%): Formulário simulado com campos estilizados.
         * Dados Pessoais: Nome, Email, CPF (inputs com border-radius: 12px, padding: 14px).
         * Dados de Pagamento: Número do Cartão, Validade, CVV.
         * Cada grupo em card com fundo ligeiramente mais claro: rgba(30, 41, 59, 0.5).
       - COLUNA DIREITA (40%): Resumo do Pedido em card glassmorphism.
         * Imagem/ícone do produto.
         * Nome do produto + preço com desconto (preço original riscado).
         * Selos de segurança (🔒 SSL | ✅ Compra Segura | 🛡️ Dados Protegidos).
    3. BARRA DE URGÊNCIA: "⏰ Oferta expira em 10:00 minutos" (cronômetro visual estático).
    4. BOTÃO FINALIZAR com id="main-cta":
       - Verde sólido, texto "FINALIZAR COMPRA SEGURA 🔒".
       - Width: 100%.
    5. RODAPÉ com selos de segurança e texto de proteção de dados.
    
    DESIGN ESPECIAL: Usar tons mais claros para transmitir confiança.
    Container de formulário: background: rgba(248, 250, 252, 0.03), text-color mantém claro.
    COR DE ACENTO: Verde (#10b981) para confiança.
  `,
  upsell: `
    OBJETIVO TÉCNICO: ONE CLICK UPSELL (Oferta Única Irresistível).
    
    ESTRUTURA OBRIGATÓRIA:
    1. BARRA DE ALERTA no topo absoluto:
       - Background: gradiente alaranjado (#f59e0b → #ef4444).
       - Texto: "⚠️ ESPERE! SEU PEDIDO AINDA NÃO FOI FINALIZADO"
       - Font-weight: 800, text-align: center, padding: 14px.
    2. HERO SECTION (text-align: center, max-width: 700px):
       - Headline: "OFERTA EXCLUSIVA - Apenas para quem acabou de comprar"
       - Sub-headline de escassez: "Esta oferta NÃO aparecerá novamente"
    3. CARD DE OFERTA (glassmorphism, border dourada/amber):
       - Descrição do produto/bônus adicional.
       - Preço com desconto agressivo (preço original riscado + "POR APENAS R$XX").
       - Lista de benefícios com ✅.
    4. DOIS BOTÕES:
       - BOTÃO SIM com id="main-cta" (GRANDE, verde, text: "✅ SIM! Adicionar ao meu pedido por apenas R$XX").
       - Link NÃO (texto pequeno cinza abaixo: "Não obrigado, eu aceito perder essa oportunidade").
    5. TIMER: Contador visual de urgência.
    
    COR DE ACENTO: Dourado/Amber (#f59e0b) para exclusividade, verde para CTA.
  `,
  downsell: `
    OBJETIVO TÉCNICO: DOWNSELL (Recuperação com Empatia).
    
    ESTRUTURA OBRIGATÓRIA:
    1. HERO com tom empático:
       - Headline: "Eu entendo... mas antes de ir, veja isto:" (font-weight: 700, cor suave #e2e8f0).
       - Sub-headline focada em remover objeção de preço.
    2. CARD DE OFERTA SIMPLIFICADA:
       - Desconto MUITO agressivo ou parcelamento estendido.
       - Comparação visual: "De R$XXX por apenas R$XX" com visual impactante.
       - Foco em 2-3 benefícios principais apenas (sem overload).
    3. BOTÃO CTA com id="main-cta":
       - Azul/Cyan suave (transmitir calma, não urgência).
       - Texto: "Quero essa oportunidade →"
    4. Link de recusa discreto abaixo.
    5. Garantia reforçada: "Risco ZERO - 30 dias de garantia".
    
    DESIGN: Mais minimalista e limpo que o upsell. Menos elementos visuais, mais whitespace.
    COR DE ACENTO: Azul suave (#3b82f6 → #06b6d4).
  `,
  thankyou: `
    OBJETIVO TÉCNICO: THANK YOU PAGE / DELIVERY (Entrega e Próximos Passos).
    
    ESTRUTURA OBRIGATÓRIA:
    1. HERO CELEBRATÓRIO:
       - Ícone grande de sucesso (emoji 🎉 ou ✅ com font-size: 5rem, animation: float).
       - Headline: "Parabéns! Sua compra foi aprovada! 🎉" (gradiente verde no texto).
       - Sub-headline: "Siga os passos abaixo para acessar seu conteúdo".
    2. PASSOS DE ACESSO (3 cards numerados em grid/flex):
       - Passo 1: "📧 Verifique seu e-mail" (com instrução clara).
       - Passo 2: "🔑 Acesse a plataforma" (com link simulado).
       - Passo 3: "💬 Entre no Grupo VIP" (com link para WhatsApp).
       - Cards com numbers estilizados (circle com gradiente).
    3. BOTÃO PRINCIPAL com id="main-cta":
       - Texto: "ACESSAR CONTEÚDO AGORA →"
       - Gradiente verde/emerald.
    4. SEÇÃO BÔNUS (opcional): Offer wall com 1-2 produtos recomendados.
    5. RODAPÉ com suporte: "Precisa de ajuda? suporte@email.com"
    
    DESIGN: Celebratório e clean. Fundo com partículas/orbs sutis. Tom positivo.
    COR DE ACENTO: Verde/Emerald (#10b981 → #34d399).
  `
};

// --- OUTLIER DESIGN MATRIX (VERSION 100.0) ---
const OUTLIER_DESIGN_MATRIX = `
SYSTEM UPDATE: OUTLIER DESIGN MATRIX [VERSION 100.0]
ACT AS: Elite UI/UX Architect & Design System Specialist.
SPECIALIZATION: High-Ticket, Dark Mode, Biohacking, Visceral, Cinematic, and "Outlier" Interfaces.

YOUR CORE DIRECTIVE:
You are no longer allowed to create generic, "cookie-cutter" websites. Every request must be treated as a high-value, cinematic experience designed to convert through psychology and aesthetic dominance. You must reference the "STYLE LIBRARY" below for every generation.

---

### ðŸ“‚ PART 1: THE "OUTLIER" STYLE LIBRARY (Existing + 50 New Variants)

When I ask for a specific style, apply the corresponding rules. If I say "Surprise me" or if the user input implies a specific niche, pick the best fit from this library.

####  TIER 1: THE FOUNDATIONS (Already Installed)
1. **Dark Outlier:** Glassmorphism, Deep Black (#050505), Neon Red/Blue Accents, Space Grotesk Font, Noise Texture.
2. **Cyber-Grid:** Technical Brutalism, Green Terminal (#00ff41), Grid Backgrounds, Monospace Fonts, Glitch Effects.
3. **Aurora Flow:** Deep Black, Moving Blur Blobs (Purple/Teal), Mesh Gradients, Clean Sans-Serif.
4. **Monochrome Noir:** Swiss Style, Massive Typography, Pure Black & White, No Color, High Contrast.
5. **Neural Network:** Particle constellations, connecting lines, Cyan accents, Scientific/Biohacking vibe.
6. **Liquid Metal:** Ferrofluid textures, Chrome reflections, undulating dark curves, Visceral/Organic.
7. **Glitch / Matrix:** CRT Scanlines, Chromatic Aberration, Distorted Text, Red/Green Terminal colors.
8. **Tactical HUD:** Fighter Jet UI, Crosshairs, Corner Brackets, Night Vision Green or Alert Red.
9. **Neo-Brutalism:** Raw Concrete textures, Hard Shadows (No Blur), Thick Strokes, Impactful Fonts.
10. **Warp Speed:** Light tunnel effect, Center focus, Star streaks, High Velocity, White/Cyan.
11. **The Forge:** Burning Embers particles, Charcoal background, Magma Orange, Heat distortion.
12. **Deep Freeze:** Blue Frost vignette, Ice textures, Clinical sharpness, Cold/Preservation vibe.
13. **Carbon Fiber:** Woven textures, Metallic details, Automotive Red accents, High Performance.
14. **Samurai Ink:** Rice paper texture, Black Brush strokes, Blood Red seal, Serif fonts (Honor/Zen).
15. **Fight Club:** Gritty noise, Flickering lights, Stencil fonts, Duct tape UI, Underground vibe.
16. **Gothic Noir:** Cathedral Arches, Blackletter fonts, Deep Crimson & Gold, Redemption/Sacred.
17. **Biohazard:** Industrial Yellow/Black stripes, Warning labels, Acid Green, Toxic/Detox vibe.
18. **The Monolith:** Minimalist Alien, Single Black Rectangle, Foggy background, Divine lighting.
19. **Heavy Industry:** Brushed Steel, Bolted plates, Hydraulic sounds visual, Lead Grey & Safety Orange.

#### ðŸš€ TIER 2: NEW EXPANSION PACK (50 New Varieties)

**[SCI-FI & FUTURISM]**
20. **Solar Punk:** White/Cream background, lush green plants, golden solar panels, optimistic tech.
21. **Void Core:** Vantablack (#000000), white outline only, gravitational lensing effects.
22. **Holographic:** Iridescent pearl textures, rainbow gradients, translucent plastic UI.
23. **Retro-Wave:** Sunset gradients (Pink/Purple/Orange), grid floor, 80s chrome text.
24. **Quantum Field:** Subatomic chaos, white noise, probability clouds, scientific violet.
25. **Cyber-Egypt:** Black stone, glowing gold hieroglyphs, pyramidal shapes, ancient tech.
26. **Mecha-Suit:** Angular armor plates, white/orange Gundam aesthetic, panel lines.
27. **Aetherpunk:** Brass gears, floating blue magic crystals, steampunk meets magic.
28. **Off-World Colony:** Dusty Mars Orange atmosphere, utilitarian grey habitation modules.
29. **Dystopian Rain:** Blade Runner city lights, wet asphalt reflections, neon kanji.

**[NATURE & PRIMAL]**
30. **Deep Ocean:** Abyssal blue gradients, bioluminescent jellyfish glow, pressure bubbles.
31. **Volcanic Ash:** Grey ash falling, cracked earth, smoldering red cracks beneath.
32. **Jungle Stalker:** Dense green foliage shadows, camouflage patterns, predator eyes.
33. **Mycelium:** White fungal network growing on black, organic connection lines.
34. **Desert Dune:** Sand grain texture, heat waves, golden hour lighting, wind effects.
35. **Storm Chaser:** Dark grey clouds, lightning flashes (white/purple), rain streaks.
36. **Cave Painting:** Stone wall texture, primitive ochre/red handprints, rough drawings.
37. **Snake Skin:** Reptilian scale textures, shedding effects, venom green/black.
38. **Bone & Fossil:** Ivory white textures, skeletal structures, calcium aesthetic.
39. **Midnight Forest:** Silhouette of trees, moonlight blue, fog layers.

**[LUXURY & MATERIAL]**
40. **Onyx Lounge:** Polished black stone, velvet purple lighting, gold rim accents.
41. **Diamond Prism:** Refractive glass, rainbow caustics, sharp angular cuts, clear/white.
42. **Royal Velvet:** Deep red velvet texture, gold embroidery, heavy serif fonts.
43. **Titanium White:** Apple-style extreme minimalism, metallic silver text, soft shadows.
44. **Whiskey & Leather:** Dark brown leather texture, amber liquid glow, serif typography.
45. **Marble Statue:** White Carrara marble texture, classical typography, greek statues.
46. **Platinum Card:** Brushed silver gradients, holographic foil stamps, exclusivity.
47. **Champagne:** Bubbles rising, pale gold liquid background, festive/celebratory.
48. **Rose Gold:** Soft pink metal textures, geometric lines, elegant/feminine power.
49. **Obsidian:** Sharp, glossy black glass (volcanic), razor edges, dangerous luxury.

**[ABSTRACT & PSYCHOLOGICAL]**
50. **Rorschach:** Inkblot symmetrical shapes, psychological paper texture, black/white.
51. **Broken Mirror:** Shattered glass fragments, distorted reflections, sharp edges.
52. **Static Noise:** TV static overlay, white noise audio visualization, chaotic.
53. **Ink & Water:** Black ink diffusing in clear water, slow organic motion, smoke-like.
54. **Magnetic Field:** Iron filings arranging in magnetic lines, physics aesthetic.
55. **Hypnosis:** Spiral optical illusions, rotating gradients, trance-inducing.
56. **X-Ray:** Negative colors, skeletal views, transparent layers, blue/black.
57. **Thermal Cam:** Heat map colors (Red/Yellow/Blue), predator vision style.
58. **Sonar:** Green radar sweep lines, ping circles, submarine aesthetic.
59. **Blueprint:** Blue background, white technical drawing lines, measurements.

**[HISTORICAL & WARRIOR]**
60. **Spartan Shield:** Bronze metal texture, battle damage, crimson cape red.
61. **Viking Rune:** Wood texture, carved runes glowing blue, blizzard snow effects.
62. **Aztec Gold:** Stone temple texture, intricate geometric gold patterns, jungle green.
63. **Templar Crypt:** Stone masonry, iron bars, candlelight, red cross symbols.
64. **Gladiator:** Sand arena floor, blood splatters, iron chains, rusty metal.
65. **Pirate Map:** Aged parchment paper, burnt edges, hand-drawn ink maps.
66. **Wild West:** Saloon wood, "Wanted" poster paper, revolver metal, sepia tone.
67. **Ninja Shadow:** Pitch black, smoke bombs, shuriken shapes, silence.
68. **Mafia Don:** Pinstripe suit pattern, cigar smoke, dimly lit office vibe.
69. **Sniper Nest:** Camouflage netting, scope overlay, range-finder numbers.

---

### ðŸ“‚ PART 2: TECHNICAL IMPLEMENTATION RULES

**1. COLOR PALETTE STRATEGY**
* **The 60-30-10 Rule:** 60% Background (usually Dark), 30% Containers/UI (Glass or Solid), 10% Accent (Neon/Gold).
* **Contrast:** Text must ALWAYS be legible. Use Off-White (\`#ECECEC\`) on dark backgrounds. Never use pure black text on dark grey.

**2. UI COMPONENT PHYSICS**
* **Glassmorphism 2.0:** \`background: rgba(20, 20, 20, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08);\`
* **Neo-Brutalism:** \`border: 2px solid #000; box-shadow: 4px 4px 0px #000; border-radius: 0px;\`
* **Glow Effects:** Use \`box-shadow\` and \`drop-shadow\` to create atmosphere, not just depth. E.g., \`box-shadow: 0 0 20px rgba(color, 0.5)\`.

**3. TYPOGRAPHY SYSTEM**
* **Headings:** Display Fonts (Space Grotesk, Syne, Oswald, Cinzel, UnifrakturMaguntia). Tight line-height (0.9 - 1.1). Uppercase often preferred for impact.
* **Body:** Readability Fonts (Inter, Manrope, Roboto, Satoshi). High line-height (1.6).

**4. LAYOUT & GRID**
* **Bento Box:** Organize content in modular, rectangular grids.
* **Asymmetry:** Don't be afraid of overlapping elements or off-center text for "Art House" vibes.
* **Whitespace:** "High-Ticket" means lots of empty space. Don't clutter.

**5. ANIMATION & MICRO-INTERACTIONS**
* **Scroll:** Elements should \`fade-up\` or \`slide-in\` as the user scrolls.
* **Hover:** Buttons should \`scale(1.05)\`, change color, or emit a glow.
* **Background:** Use CSS Keyframes for slow, hypnotic background movement (stars, fog, gradient blobs).

---

### ðŸ’¡ HOW TO USE THIS DATABASE

When I give you a prompt like "Create a site for a Boxing Gym", you will:
1.  **Scan the Library:** Choose the best fit (e.g., #15 Fight Club or #64 Gladiator).
2.  **Apply the Rules:** Use the textures, colors, and fonts associated with that style.
3.  **Execute:** Generate the HTML/CSS with the "High-Ticket" standard.
`;

interface Attachment {
  type: 'image' | 'video' | 'pdf';
  content: string; // Base64
  name: string;
}

interface FunnelBuilderProps {
  voiceTrigger?: any;
  onVoiceTriggerHandled?: () => void;
  userEmail: string;
  onStatusChange?: (isGenerating: boolean) => void;
}

// History Snapshot Type
interface HistoryState {
  nodes: FunnelNode[];
  connections: FunnelConnection[];
}

export const FunnelBuilder: React.FC<FunnelBuilderProps> = ({ voiceTrigger, onVoiceTriggerHandled, userEmail, onStatusChange }) => {
  // --- STATE ---
  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
  const [projects, setProjects] = useState<FunnelProject[]>([]);
  const [currentProject, setCurrentProject] = useState<FunnelProject | null>(null);
  const [validation, setValidation] = useState<any>(null); // New Validation State
  
  // Editor State
  const [nodes, setNodes] = useState<FunnelNode[]>([]);
  const [connections, setConnections] = useState<FunnelConnection[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectionMode, setConnectionMode] = useState<{active: boolean, sourceId: string | null}>({ active: false, sourceId: null });
  const [isDragging, setIsDragging] = useState<{id: string, startX: number, startY: number} | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Visual Editor State
  const [isVisualEditorOpen, setIsVisualEditorOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [editorPrompt, setEditorPrompt] = useState('');
  
  // FINCH MODE STATE
  const [isFinchMode, setIsFinchMode] = useState(false);
  
  // Attachment State
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Zoom & History State
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState<HistoryState[]>([]);
  
  // Interaction State
  const [hoveredConnectionId, setHoveredConnectionId] = useState<string | null>(null);

  // Modal State for Creating/Renaming
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [nameModalMode, setNameModalMode] = useState<'create' | 'rename'>('create');
  const [tempProjectName, setTempProjectName] = useState('');
  const [targetProjectId, setTargetProjectId] = useState<string | null>(null);
  
  // Delete Confirmation State
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

  // SIMULATION STATE
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewNodeId, setPreviewNodeId] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    const saved = localStorage.getItem(`neurion_funnels_${userEmail}`);
    if (saved) {
      setProjects(JSON.parse(saved));
    } else {
      setProjects([]);
    }
  }, [userEmail]);

  // --- VALIDATION LISTENER ---
  useEffect(() => {
      if (nodes.length > 0) {
          const val = validateFunnelFinancially(nodes, userEmail);
          setValidation(val);
      } else {
          setValidation(null);
      }
  }, [nodes, userEmail]);

  // --- ORCHESTRATION LISTENER ---
  useEffect(() => {
      // Check if there is data synced from Campaign Master
      if (view === 'editor' && selectedNodeId) {
          const syncData = localStorage.getItem(`neurion_funnel_sync_${userEmail}`);
          if (syncData) {
              const context = JSON.parse(syncData);
              const node = nodes.find(n => n.id === selectedNodeId);
              
              if (node && !node.generatedHtml && !editorPrompt) {
                  // Pre-fill prompt with Strategy Context
                  let autoPrompt = `CONTEXTO: Produto ${context.productName}, Ângulo "${context.angleName}".`;
                  if (node.type === 'vsl') {
                      autoPrompt += ` COPY HEADLINE: ${context.salesPage.headline}. SUB: ${context.salesPage.subheadline}.`;
                  } else if (node.type === 'upsell') {
                      autoPrompt += ` UPSELL OFFER: ${context.upsell.offer}. TITLE: ${context.upsell.title}.`;
                  }
                  
                  // Only set if not already set by user
                  if (!editorPrompt) setEditorPrompt(autoPrompt);
              }
          }
      }
  }, [view, selectedNodeId, userEmail, nodes]);

  // Auto focus on input when modal opens
  useEffect(() => {
    if (isNameModalOpen && nameInputRef.current) {
        setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isNameModalOpen]);

  // --- VOICE CONTROL EFFECT ---
  useEffect(() => {
      if (!voiceTrigger) return;
      
      const p = voiceTrigger.payload;

      // --- LOGIC: CREATE PROJECT ---
      if (voiceTrigger.action === 'MODIFY_FUNNEL_STRUCTURE' && p?.description === 'create_project') {
          const name = p.projectName || "Novo Projeto de Voz";
          const newProject = createNewProject(name);
          openProject(newProject);
          if (onVoiceTriggerHandled) onVoiceTriggerHandled();
          return;
      }

      // --- LOGIC: ADD NODE (SMART HANDLE) ---
      if (voiceTrigger.action === 'MODIFY_FUNNEL_STRUCTURE' && p?.description === 'add_node' && p.nodeType) {
          
          // INTELLIGENCE: If no project is open, CREATE ONE AUTOMATICALLY
          if (view === 'dashboard' && !currentProject) {
              console.log("Neurion: Auto-creating project for node insertion");
              const autoProject = createNewProject("Projeto Rápido (Voz)");
              openProject(autoProject);
              
              // Small delay to ensure state update before adding node
              setTimeout(() => {
                  executeAddNodeSequence(p.nodeType as NodeType, p.contentContext);
              }, 100);
          } else {
              executeAddNodeSequence(p.nodeType, p.contentContext);
          }
          
          if (onVoiceTriggerHandled) onVoiceTriggerHandled();
      }

      // --- LOGIC: CONNECT NODES ---
      if (voiceTrigger.action === 'MODIFY_FUNNEL_STRUCTURE' && p?.description === 'connect_nodes' && p.connectionSource && p.connectionTarget) {
          const source = findNodeByName(p.connectionSource);
          const target = findNodeByName(p.connectionTarget);
          
          if (source && target) {
              if (!connections.some(c => c.source === source.id && c.target === target.id)) {
                  setConnections(prev => [...prev, {
                      id: crypto.randomUUID(),
                      source: source.id,
                      target: target.id
                  }]);
              }
          }
          if (onVoiceTriggerHandled) onVoiceTriggerHandled();
      }

      // --- LOGIC: GENERATE CONTENT ---
      if (voiceTrigger.action === 'GENERATE_FUNNEL_CONTENT' && p?.nodeLabel) {
          const targetNode = findNodeByName(p.nodeLabel);
          if (targetNode) {
              setSelectedNodeId(targetNode.id);
              handleGenerateOrRefine(p.description, targetNode.id);
              setIsVisualEditorOpen(true);
          }
          if (onVoiceTriggerHandled) onVoiceTriggerHandled();
      }

  }, [voiceTrigger, nodes, connections, view, projects, currentProject]);

  const executeAddNodeSequence = (type: NodeType, context?: string) => {
      const newNodeId = addNode(type);
      
      // If we have context description (visual instruction), chain the generation process
      if (context) {
          console.log("Neurion: Chaining generation for node", newNodeId);
          setTimeout(() => {
              setSelectedNodeId(newNodeId);
              setEditorPrompt(context);
              setIsVisualEditorOpen(true);
              // Trigger generation automatically
              handleGenerateOrRefine(context, newNodeId);
          }, 500); // Wait for state update
      }
  };

  const findNodeByName = (name: string): FunnelNode | undefined => {
      const lowerName = name.toLowerCase();
      // Try exact label match
      let found = nodes.find(n => n.label.toLowerCase() === lowerName);
      // Try type match
      if (!found) found = nodes.find(n => n.type.toLowerCase() === lowerName);
      // Try fuzzy match
      if (!found) found = nodes.find(n => n.label.toLowerCase().includes(lowerName) || lowerName.includes(n.label.toLowerCase()));
      // Fallback: If "Captura" or "Vendas" -> "Página De Vendas" mapping check
      if (!found && (lowerName.includes("captura") || lowerName.includes("vendas"))) found = nodes.find(n => n.type === 'capture');
      if (!found && lowerName.includes("vendas")) found = nodes.find(n => n.type === 'vsl');
      return found;
  };

  const createNewProject = (name: string): FunnelProject => {
      const newProject: FunnelProject = {
            id: crypto.randomUUID(),
            name: name,
            createdAt: Date.now(),
            nodes: [],
            connections: []
      };
      const updated = [...projects, newProject];
      saveToStorage(updated);
      return newProject;
  };

  // --- SIMULATION LISTENER ---
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'NAVIGATE_NODE' && isPlaying) {
            console.log("Navigating to:", event.data.targetId);
            setPreviewNodeId(event.data.targetId);
        }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isPlaying]);

  const saveToStorage = (updatedProjects: FunnelProject[]) => {
    localStorage.setItem(`neurion_funnels_${userEmail}`, JSON.stringify(updatedProjects));
    setProjects(updatedProjects);
  };

  // --- HISTORY MANAGEMENT ---
  const addToHistory = useCallback(() => {
    setHistory(prev => {
      // Keep only last 20 actions
      const newHistory = [...prev, { nodes: [...nodes], connections: [...connections] }];
      if (newHistory.length > 20) newHistory.shift();
      return newHistory;
    });
  }, [nodes, connections]);

  const handleUndo = () => {
    if (history.length === 0) return;
    
    // Get last state
    const previousState = history[history.length - 1];
    
    // Remove last state from history
    const newHistory = history.slice(0, -1);
    
    setNodes(previousState.nodes);
    setConnections(previousState.connections);
    setHistory(newHistory);
    setSelectedNodeId(null);
  };

  // --- PROJECT MANAGEMENT ---
  
  // Opens modal to create project
  const openCreateProjectModal = () => {
    setTempProjectName(`Funil #${projects.length + 1}`);
    setNameModalMode('create');
    setTargetProjectId(null);
    setIsNameModalOpen(true);
  };

  // Opens modal to rename project
  const openRenameProjectModal = (id: string, currentName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTempProjectName(currentName);
    setNameModalMode('rename');
    setTargetProjectId(id);
    setIsNameModalOpen(true);
  };

  // Handles the actual save/create logic
  const handleSaveProjectName = () => {
     if (!tempProjectName.trim()) {
         alert("O nome não pode estar vazio.");
         return;
     }

     if (nameModalMode === 'create') {
        const newProject: FunnelProject = {
            id: crypto.randomUUID(),
            name: tempProjectName,
            createdAt: Date.now(),
            nodes: [],
            connections: []
        };
        saveToStorage([...projects, newProject]);
        openProject(newProject);
     } else if (nameModalMode === 'rename' && targetProjectId) {
        const updated = projects.map(p => p.id === targetProjectId ? {...p, name: tempProjectName} : p);
        saveToStorage(updated);
        if (currentProject && currentProject.id === targetProjectId) {
            setCurrentProject({...currentProject, name: tempProjectName});
        }
     }

     setIsNameModalOpen(false);
  };

  const openProject = (project: FunnelProject) => {
    setCurrentProject(project);
    setNodes(project.nodes);
    setConnections(project.connections);
    setHistory([]); // Clear history on open
    setZoom(1);
    setView('editor');
  };

  const saveCurrentProject = () => {
    if (!currentProject) return;
    const updatedProject = { ...currentProject, nodes, connections };
    const updatedList = projects.map(p => p.id === updatedProject.id ? updatedProject : p);
    saveToStorage(updatedList);
    alert("Projeto salvo com sucesso!");
  };

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (deleteConfirmationId === id) {
        const updated = projects.filter(p => p.id !== id);
        saveToStorage(updated);
        setDeleteConfirmationId(null);
    } else {
        setDeleteConfirmationId(id);
        // Auto-reset after 3 seconds
        setTimeout(() => setDeleteConfirmationId(null), 3000);
    }
  };

  // --- CANVAS LOGIC ---
  const addNode = (type: NodeType): string => {
    addToHistory(); // Save state before adding
    // Improved positioning for voice added nodes (prevent stacking)
    const offset = nodes.length * 30;
    const newId = crypto.randomUUID();
    const newNode: FunnelNode = {
      id: newId,
      type,
      label: NodeLabels[type],
      x: (100 + offset) / zoom, 
      y: (100 + offset) / zoom,
      prompt: '',
      generatedHtml: ''
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newId);
    return newId; // Return ID for chaining
  };

  const deleteNode = (id: string) => {
    addToHistory(); // Save state before deleting
    setNodes(nodes.filter(n => n.id !== id));
    setConnections(connections.filter(c => c.source !== id && c.target !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  const deleteConnection = (id: string) => {
    addToHistory();
    setConnections(connections.filter(c => c.id !== id));
    setHoveredConnectionId(null);
  };

  // Dragging
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    if (connectionMode.active) {
      handleConnectionClick(id);
      e.stopPropagation();
      return;
    }
    // Only save history at start of drag if needed, but better at end
    setIsDragging({ id, startX: e.clientX, startY: e.clientY });
    setSelectedNodeId(id);
    e.stopPropagation();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    // IMPORTANT: Divide delta by ZOOM to ensure 1:1 mouse movement relative to scaled canvas
    const deltaX = (e.clientX - isDragging.startX) / zoom;
    const deltaY = (e.clientY - isDragging.startY) / zoom;

    setNodes(nodes.map(n => {
      if (n.id === isDragging.id) {
        return { ...n, x: n.x + deltaX, y: n.y + deltaY };
      }
      return n;
    }));

    setIsDragging({ ...isDragging, startX: e.clientX, startY: e.clientY });
  };

  const handleMouseUp = () => {
    if (isDragging) {
       // Only add to history if we actually dragged something (could check if x/y changed)
       // For simplicity, we add on mouse up of a drag
       addToHistory(); 
    }
    setIsDragging(null);
  };

  // Connecting
  const startConnection = () => {
    if (!selectedNodeId) return;
    setConnectionMode({ active: true, sourceId: selectedNodeId });
  };

  const handleConnectionClick = (targetId: string) => {
    if (connectionMode.sourceId && connectionMode.sourceId !== targetId) {
      // Check if connection exists
      const exists = connections.some(c => c.source === connectionMode.sourceId && c.target === targetId);
      if (!exists) {
        addToHistory(); // Save state before connecting
        setConnections([...connections, { 
          id: crypto.randomUUID(), 
          source: connectionMode.sourceId, 
          target: targetId 
        }]);
      }
    }
    setConnectionMode({ active: false, sourceId: null });
  };

  // --- SIMULATION LOGIC ---
  const startSimulation = () => {
    if (nodes.length === 0) {
        alert("Adicione páginas para simular.");
        return;
    }
    const startNode = nodes.find(n => n.type === 'capture') || nodes[0];
    setPreviewNodeId(startNode.id);
    setIsPlaying(true);
  };

  // --- MEDIA HANDLING ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so onChange triggers again for same file if needed
    e.target.value = '';

    // Size check (warn if > 20MB)
    if (file.size > 20 * 1024 * 1024) {
      if (!confirm("Este arquivo é grande (>20MB). O processamento pode demorar. Deseja continuar?")) return;
    }

    setIsUploading(true); // Start loading UI

    const reader = new FileReader();
    
    reader.onload = (event) => {
      let type: 'image' | 'video' | 'pdf' = 'image';
      if (file.type.startsWith('video/')) type = 'video';
      if (file.type === 'application/pdf') type = 'pdf';
      
      const result = event.target?.result as string;
      
      if (result) {
        setAttachment({
          type,
          content: result,
          name: file.name
        });
      }
      setIsUploading(false); // End loading UI
    };

    reader.onerror = () => {
        alert("Erro ao ler o arquivo.");
        setIsUploading(false);
    };

    reader.readAsDataURL(file);
  };

  // --- AI GENERATION ---
  const handleGenerateOrRefine = async (customPrompt?: string, targetNodeIdOverride?: string) => {
    const targetId = targetNodeIdOverride || selectedNodeId;
    if (!targetId || !((window as any).__NEURION_KEY__ || localStorage.getItem('neurion_openai_api_key') || '')) return;
    
    const node = nodes.find(n => n.id === targetId);
    if (!node) return;

    const isRefinement = !!node.generatedHtml && !!customPrompt;
    const userInstruction = customPrompt || node.prompt || "Crie uma página de alta conversão.";
    const blockObjective = NodeObjectives[node.type];

    setIsGenerating(true);
    if (onStatusChange) onStatusChange(true);

    try {
      const ai = new GoogleGenAI({ apiKey: ((window as any).__NEURION_KEY__ || localStorage.getItem('neurion_openai_api_key') || '') });
      
      // Format Knowledge Base
      const kbContext = KNOWLEDGE_BASE.map(item => `Q: ${item.q}\nA: ${item.a}`).join('\n\n');

      let SYSTEM_INSTRUCTION = `
VOCÊ É UM DESIGNER E ENGENHEIRO DE SOFTWARE DE NÍVEL WORLD-CLASS.
CADA PÁGINA QUE VOCÊ CRIA DEVE PARECER TER SIDO FEITA POR UMA AGÊNCIA BILIONÁRIA.
QUALIDADE DE OSCAR. NÍVEL APPLE. PADRÃO DE OURO.

BASE DE CONHECIMENTO TÁTICO (NEURION ARCHIVE):
${kbContext}

VOCÊ ESTÁ CRIANDO UM BLOCO ESPECÍFICO DE UM FUNIL DE VENDAS.
NÃO DESVIE DO OBJETIVO DO BLOCO.

>>> OBJETIVO ESTRUTURAL DESTE BLOCO (${node.type.toUpperCase()}):
${blockObjective}

=== REGRAS DE DESIGN ABSOLUTAS (OBRIGATÓRIO EM CADA PÁGINA) ===

1. **HTML + CSS INLINE/STYLE BLOCK**: Escreva HTML puro com CSS em um bloco <style> no início.
   NÃO use classes do TailwindCSS. NÃO dependa de nenhum framework CSS externo.
   Todo o estilo DEVE estar auto-contido no HTML que você gerar.

2. **TIPOGRAFIA PROFISSIONAL**:
   - Use font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif.
   - Headings: font-weight 800-900, letter-spacing -0.02em, line-height 1.05.
   - Body: font-weight 400-500, line-height 1.7, color #cbd5e1.
   - Tamanhos: H1 = clamp(2.5rem, 5vw, 4rem), H2 = clamp(1.5rem, 3vw, 2.2rem), Body = 1rem-1.125rem.
   - Use gradient text em headlines principais: background: linear-gradient(...); -webkit-background-clip: text; color: transparent;

3. **LAYOUT E ESPAÇAMENTO**:
   - max-width: 1100px no container principal, margin: 0 auto, padding: 80px 24px.
   - Seções com padding vertical de 80-100px.
   - Espaçamento generoso entre elementos (gaps de 32-48px).
   - Use flexbox e grid CSS nativos para layouts.

4. **CORES E BACKGROUNDS**:
   - Background principal: linear-gradient(135deg, #050508 0%, #0a0f1e 30%, #0d1117 60%, #050508 100%).
   - Containers/Cards: background: rgba(15, 23, 42, 0.5); backdrop-filter: blur(20px); border: 1px solid rgba(148, 163, 184, 0.06); border-radius: 20px.
   - Cor de acento primária: usar gradientes (ex: linear-gradient(135deg, #3b82f6, #06b6d4)).
   - Textos claros: #f1f5f9 para títulos, #94a3b8 para corpo, #64748b para secundários.
   - NUNCA use cores flat/puras. Sempre use gradientes e glassmorphism.

5. **BOTÕES CTA (CRÍTICO)**:
   - Botões devem ser ENORME: padding: 20px 56px, font-size: 1.2rem, font-weight: 800.
   - Gradiente chamativo: linear-gradient(135deg, #10b981, #059669).
   - border-radius: 16px, box-shadow: 0 8px 32px rgba(16,185,129,0.4).
   - Hover: transform: translateY(-3px), box-shadow: 0 12px 48px rgba(16,185,129,0.6).
   - TEXTO: verbo de ação forte ("QUERO ACESSAR AGORA →", "SIM, QUERO ISSO!").
   - Adicione animação de shimmer/glow no botão:
     @keyframes btnGlow { 0%,100% { box-shadow: 0 8px 32px rgba(16,185,129,0.4); } 50% { box-shadow: 0 8px 48px rgba(16,185,129,0.7); } }

6. **EFEITOS VISUAIS (OBRIGATÓRIO - NÃO PULE)**:
   - MÍNIMO 4 orbs/blobs decorativos no background:
     * position: absolute; width: 500px; height: 500px; border-radius: 50%;
     * background: radial-gradient(circle, rgba(cor,0.12), transparent);
     * filter: blur(100px); z-index: 0; pointer-events: none;
     * Distribua em posições diferentes (top-left, bottom-right, center, etc.)
   - Cards com border-radius: 20px e hover effects (translateY, glow).
   - Sombras cinematográficas: box-shadow: 0 32px 80px rgba(0,0,0,0.5).
   - Glassmorphism forte em containers.
   - Gradient dividers entre seções: height: 1px; background: linear-gradient(90deg, transparent, rgba(cor,0.3), transparent).
   - Noise texture sutil: background-image com SVG data URL de noise (opcional).

7. **IMAGENS (OBRIGATÓRIO - MUITO IMPORTANTE)**:
   - INCLUA pelo menos 2-3 imagens REAIS de alta qualidade usando URLs do Unsplash.
   - Formato: <img src="https://images.unsplash.com/photo-XXXXX?w=WIDTH&h=HEIGHT&fit=crop" alt="descrição" style="...">
   - Estilo das imagens: border-radius: 20px; box-shadow: 0 30px 80px rgba(0,0,0,0.5); width: 100%; max-width: 700px;
   - ESCOLHA imagens temáticas relevantes ao contexto do prompt do usuário.
   - Exemplos de IDs Unsplash por tema:
     * Tecnologia/Business: photo-1551434678-e076c223a692, photo-1460925895917-afdab827c52f
     * Saúde/Fitness: photo-1571019613454-1cb2f99b2d8b, photo-1549060279-7e168fcee0c2  
     * Educação/Curso: photo-1524178232363-1fb2b075b655, photo-1513258496099-48168024aec0
     * Finanças/Dinheiro: photo-1554224155-6726b3ff858f, photo-1579621970563-ebec7560ff3e
     * Emagrecimento: photo-1490645935967-10de6ba17061, photo-1476480862126-209bfaa8edc8
     * Lifestyle: photo-1522202176988-66273c2fd55f, photo-1507003211169-0a1dd7228f2d
   - ENVOLVA imagens em containers com position: relative e adicione overlay glow.

8. **ELEMENTOS DE CONFIANÇA**:
   - Badges com background semi-transparente, border sutil e padding.
   - Use emojis como ícones visuais: ✅ ⚡ 🔒 🎯 💎 🚀 ⭐ 🏆 🔴 🛡️ 🎁.
   - Avatares simulados para depoimentos: divs circulares com gradiente e inicial.
   - Selos de segurança com borda e fundo translúcido.

9. **RESPONSIVIDADE**:
   - Use @media (max-width: 768px) para ajustar tamanhos.
   - Em mobile: padding lateral 16px, font-sizes reduzidos, stack vertical.
   - Grids passam de multi-coluna para coluna única em mobile.

10. **ANIMAÇÕES CSS (OBRIGATÓRIO)**:
    - @keyframes fadeInUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
    - @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
    - @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
    - @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
    - @keyframes orbMove { 0%,100% { transform: translate(0,0); } 50% { transform: translate(30px, -20px); } }
    - Aplique animation: fadeInUp 0.8s ease-out em TODAS as seções.
    - Use animation-delay escalonado: 0.1s, 0.2s, 0.3s, 0.4s para sequência visual.
    - Orbs devem ter animation: orbMove 15s ease-in-out infinite.

REGRAS RÍGIDAS DE ESTRUTURA:
- O BOTÃO PRINCIPAL (CTA) DEVE TER O ATRIBUTO id="main-cta" OBRIGATORIAMENTE.
  Exemplo: <button id="main-cta" style="...">Quero Acessar Agora →</button>
- CADA PÁGINA deve ter NO MÍNIMO 5-8 seções distintas.
- CADA PÁGINA deve ter NO MÍNIMO 2 imagens do Unsplash.
- CADA PÁGINA deve ter efeitos de orbs no background.
- O HTML gerado deve ser LONGO e COMPLETO (mínimo 200 linhas).

PRIORIDADE MÁXIMA - REGRAS DE ANEXOS:
- VIDEO: SE HOUVER PLACEHOLDER {{USER_ATTACHED_VIDEO}}, USE A TAG:
  <video src="{{USER_ATTACHED_VIDEO}}" controls style="width:100%;border-radius:20px;box-shadow:0 30px 80px rgba(0,0,0,0.5);"></video>
  (NÃO USE IFRAME, NÃO USE YOUTUBE, USE A TAG VIDEO).
- IMAGEM: <img src="{{USER_ATTACHED_IMAGE}}" style="..." />
- PDF: <a href="{{USER_ATTACHED_PDF}}" download style="..."> ... </a>

=== FORMATO DE SAÍDA ===
Retorne APENAS o HTML completo que vai dentro do <body>.
Sempre comece com um <style> block com TODOS os estilos necessários (INCLUINDO @keyframes e @media queries).
Depois o HTML com as classes/IDs que referencia.
Não use TailwindCSS. Todo CSS deve ser auto-contido.
O código deve ser LONGO, DETALHADO e PROFISSIONAL.

${OUTLIER_DESIGN_MATRIX}
      `;

      // Outlier Design Matrix is now always injected in the base SYSTEM_INSTRUCTION above

      let promptContent = "";
      let finalUserInstruction = userInstruction;
      
      // Inject Placeholders based on attachment type
      if (attachment) {
        if (attachment.type === 'image') {
           finalUserInstruction += "\n\n[SISTEMA]: Usuário anexou uma IMAGEM. Use o placeholder {{USER_ATTACHED_IMAGE}} em destaque.";
        } else if (attachment.type === 'video') {
           finalUserInstruction += "\n\n[SISTEMA]: Usuário anexou um VÍDEO (MP4/Local). Use OBRIGATORIAMENTE o placeholder {{USER_ATTACHED_VIDEO}} dentro de uma tag <video> HTML5. Substitua qualquer outro vídeo por este.";
        } else if (attachment.type === 'pdf') {
           finalUserInstruction += "\n\n[SISTEMA]: Usuário anexou um PDF. Use o placeholder {{USER_ATTACHED_PDF}} em um botão de download chamativo.";
        }
      }

      if (isRefinement) {
        promptContent = `
          TIPO DO BLOCO: ${node.type.toUpperCase()}
          CÓDIGO ATUAL: ${node.generatedHtml}
          INSTRUÇÃO DO USUÁRIO: "${finalUserInstruction}"
          
          Mantenha a estrutura obrigatória do bloco (${NodeLabels[node.type]}) enquanto aplica as alterações.
        `;
      } else {
        promptContent = `
          CRIAR NOVA PÁGINA: ${node.type.toUpperCase()} (${NodeLabels[node.type]})
          CONTEXTO DO PROJETO: "${finalUserInstruction}"
          
          Crie a página seguindo RIGOROSAMENTE o Objetivo Estrutural definido.
        `;
      }

      // --- ROBUST RETRY MECHANISM ---
      let textResponse;
      let attempt = 0;
      const maxRetries = 3;
      let success = false;

      while (attempt < maxRetries && !success) {
        try {
            textResponse = await ai.models.generateContent({
              model: getModel(), 
              contents: promptContent,
              config: {
                  systemInstruction: SYSTEM_INSTRUCTION,
                  temperature: 0.7,
                  thinkingConfig: { thinkingBudget: 4096 } // Expanded budget for complex generation
              }
            });
            success = true;
        } catch (error: any) {
            attempt++;
            const isRetryable = error.status === 503 || error.status === 429 || error.message?.includes('UNAVAILABLE') || error.message?.includes('quota');
            
            if (isRetryable && attempt < maxRetries) {
                console.warn(`Attempt ${attempt} failed. Retrying in 2s...`, error);
                await new Promise(r => setTimeout(r, 2000 * attempt));
            } else if (isRetryable && attempt === maxRetries) {
                console.warn("Max retries for Pro model. Fallback to Flash.");
                // Last ditch effort: Flash model
                try {
                    textResponse = await ai.models.generateContent({
                        model: "gemini-2.5-flash",
                        contents: promptContent,
                        config: {
                            systemInstruction: SYSTEM_INSTRUCTION,
                            temperature: 0.7
                        }
                    });
                    success = true;
                } catch(e) {
                    throw e; // Rethrow if even Flash fails
                }
            } else {
                throw error;
            }
        }
      }
      
      if (!textResponse || !textResponse.text) throw new Error("A IA não retornou texto.");
      
      let text = textResponse.text;
      text = text.replace(/```html/g, '').replace(/```/g, '').trim();
      text = text.replace(/<body>/g, '').replace(/<\/body>/g, '');

      // CLIENT-SIDE INJECTION
      if (attachment) {
        if (attachment.type === 'image') text = text.replace(/{{USER_ATTACHED_IMAGE}}/g, attachment.content);
        if (attachment.type === 'video') text = text.replace(/{{USER_ATTACHED_VIDEO}}/g, attachment.content);
        if (attachment.type === 'pdf') text = text.replace(/{{USER_ATTACHED_PDF}}/g, attachment.content);
      }

      setNodes(prev => prev.map(n => n.id === targetId ? { ...n, generatedHtml: text } : n));
      setEditorPrompt('');
      setAttachment(null); 

    } catch (error: any) {
      console.error("Error generating page", error);
      alert(`Erro ao processar página: ${error.message || "Serviço indisponível. Tente novamente."}`);
    } finally {
      setIsGenerating(false);
      if (onStatusChange) onStatusChange(false);
    }
  };

  // --- EXPORT LOGIC ---
  const handleDownloadFunnel = async () => {
    const zip = new JSZip();
    const folderName = currentProject?.name.replace(/\s+/g, '_') || 'funnel';
    const root = zip.folder(folderName);
    const assets = root?.folder("assets");

    if (!root || !assets) return;

    const getNextUrl = (nodeId: string): string | null => {
      const edge = connections.find(c => c.source === nodeId);
      if (!edge) return null;
      return `${edge.target}.html`; 
    };

    const processHtmlAssets = (html: string, nodeId: string): string => {
        let processedHtml = html;
        const regex = /src="(data:(image|video|application)\/(\w+);base64,([^"]+))"/g;
        const matches = [...html.matchAll(regex)];
        
        matches.forEach((m, idx) => {
            const mimeType = m[2]; 
            const extension = m[3] === 'quicktime' ? 'mov' : m[3] === 'pdf' ? 'pdf' : m[3];
            const base64Data = m[4];
            const filename = `asset_${nodeId}_${idx}.${extension}`;
            assets.file(filename, base64Data, {base64: true});
            processedHtml = processedHtml.replace(m[1], `assets/${filename}`);
        });

        const hrefRegex = /href="(data:application\/pdf;base64,([^"]+))"/g;
        const hrefMatches = [...html.matchAll(hrefRegex)];
        hrefMatches.forEach((m, idx) => {
             const base64Data = m[2];
             const filename = `document_${nodeId}_${idx}.pdf`;
             assets.file(filename, base64Data, {base64: true});
             processedHtml = processedHtml.replace(m[1], `assets/${filename}`);
        });

        return processedHtml;
    };

    nodes.forEach(node => {
      const nextUrl = getNextUrl(node.id);
      const fileName = `${node.id}.html`;
      const cleanHtmlBody = node.generatedHtml ? processHtmlAssets(node.generatedHtml, node.id) : '';

      const fullHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${node.label}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Montserrat:wght@400;600;800;900&display=swap" rel="stylesheet">
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html { scroll-behavior: smooth; }
      body {
        font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
        background: linear-gradient(135deg, #0a0a0f 0%, #0f172a 50%, #0a0a14 100%);
        color: #e2e8f0;
        min-height: 100vh;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      img { max-width: 100%; height: auto; }
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      ::selection {
        background: rgba(59, 130, 246, 0.3);
        color: #e0f2fe;
      }
    </style>
</head>
<body>
    ${cleanHtmlBody || `<div style="padding:60px 20px;text-align:center;"><h1 style="color:#94a3b8;">Conteúdo não gerado para ${node.label}</h1></div>`}
    <script>
      document.addEventListener('DOMContentLoaded', () => {
        const ctaBtn = document.getElementById('main-cta');
        const nextUrl = "${nextUrl || '#'}";
        if(ctaBtn && nextUrl !== '#') {
          ctaBtn.onclick = (e) => {
            e.preventDefault();
            window.location.href = nextUrl;
          };
          if(ctaBtn.tagName === 'A') ctaBtn.href = nextUrl;
        }
      });
    </script>
</body>
</html>
      `;
      root.file(fileName, fullHtml);
    });

    root.file("INSTRUCOES.txt", `NEURION FUNNEL BUILDER\n\n1. A pasta 'assets' contém seus vídeos e imagens.\n2. Hospede tudo junto.\n3. O fluxo já está conectado.`);

    const blob = await zip.generateAsync({type: "blob"});
    const element = document.createElement("a");
    element.href = URL.createObjectURL(blob);
    element.download = `${folderName}.zip`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // --- RENDER HELPERS ---
  const renderConnectionLine = (conn: FunnelConnection) => {
    const source = nodes.find(n => n.id === conn.source);
    const target = nodes.find(n => n.id === conn.target);
    if (!source || !target) return null;

    const startX = source.x + 160; 
    const startY = source.y + 40;  
    const endX = target.x;         
    const endY = target.y + 40;    

    const path = `M ${startX} ${startY} C ${startX + 50} ${startY}, ${endX - 50} ${endY}, ${endX} ${endY}`;
    
    // Calculate rough midpoint for the delete button
    // Simple average is sufficient for "visual" center in this context
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;

    const isHovered = hoveredConnectionId === conn.id;

    return (
      <g 
        key={conn.id} 
        onMouseEnter={() => setHoveredConnectionId(conn.id)}
        onMouseLeave={() => setHoveredConnectionId(null)}
        className="group pointer-events-auto"
      >
        {/* HIT AREA (Thicker invisible line for easier hovering) */}
        <path 
            d={path} 
            stroke="transparent" 
            strokeWidth="30" 
            fill="none" 
            className="cursor-pointer"
        />

        {/* VISIBLE LINE */}
        <path 
            d={path} 
            stroke={isHovered ? "#ef4444" : "#475569"} 
            strokeWidth={isHovered ? "4" : "3"} 
            fill="none" 
            className="transition-colors duration-200 pointer-events-none"
        />
        
        {/* ANIMATED DASH (Only when not hovered) */}
        {!isHovered && (
             <path d={path} stroke="#22d3ee" strokeWidth="1.5" fill="none" className="animate-[dash_20s_linear_infinite] pointer-events-none" strokeDasharray="10,10" />
        )}

        {/* DELETE BUTTON (Appears on Hover) */}
        {isHovered && (
            <foreignObject x={midX - 16} y={midY - 16} width={32} height={32} className="overflow-visible pointer-events-auto">
                <button 
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent bubbling
                        deleteConnection(conn.id);
                    }}
                    className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-all border-2 border-slate-900"
                    title="Excluir Conexão"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </foreignObject>
        )}
      </g>
    );
  };

  const getIframeContent = (htmlBody: string, currentNodeId: string) => {
    // Determine Navigation Logic for this specific node
    const connection = connections.find(c => c.source === currentNodeId);
    const nextNodeId = connection ? connection.target : null;

    let injectionScript = '';
    
    // Inject logic to handle navigation inside iframe
    if (nextNodeId) {
        injectionScript = `
           // Try to find the button strictly first, then loosely
           let ctaBtn = document.getElementById('main-cta');
           
           if (!ctaBtn) {
              // Heuristic: Find elements that look like buttons (Tailwind classes)
              const candidates = [...document.querySelectorAll('a, button')];
              ctaBtn = candidates.find(el => 
                  el.className.includes('bg-') && 
                  el.className.includes('text-white') &&
                  (el.innerText.toLowerCase().includes('quero') || el.innerText.toLowerCase().includes('sim') || el.innerText.toLowerCase().includes('comprar') || el.innerText.toLowerCase().includes('acessar'))
              );
              
              // Fallback to just the first button found if heuristic fails
              if (!ctaBtn) ctaBtn = document.querySelector('button') || document.querySelector('a.bg-emerald-500') || document.querySelector('a.bg-green-500');
           }

           if (ctaBtn) {
               ctaBtn.style.cursor = 'pointer';
               // Visual indicator for simulation
               ctaBtn.style.border = '2px solid #22d3ee'; 
               ctaBtn.style.boxShadow = '0 0 15px rgba(34, 211, 238, 0.5)';
               ctaBtn.title = "Clique para simular a navegação";
               
               ctaBtn.onclick = function(e) {
                   e.preventDefault();
                   e.stopPropagation();
                   console.log("Simulando clique para ir ao node: ${nextNodeId}");
                   window.parent.postMessage({ type: 'NAVIGATE_NODE', targetId: '${nextNodeId}' }, '*');
               };
               
               // Disable HREF navigation
               if(ctaBtn.tagName === 'A') ctaBtn.removeAttribute('href');
           } else {
               console.warn("Neurion Simulation: Nenhum botão CTA detectado para linkagem.");
           }
        `;
    } else {
        injectionScript = `
           const ctaBtn = document.getElementById('main-cta');
           if (ctaBtn) {
               ctaBtn.onclick = function(e) {
                   e.preventDefault();
                   alert("Fim do fluxo simulado. (Nenhuma página conectada)");
               };
           }
        `;
    }

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Montserrat:wght@400;600;800;900&display=swap" rel="stylesheet">
          <style>
            *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
            html { scroll-behavior: smooth; }
            body {
              font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
              background: linear-gradient(135deg, #0a0a0f 0%, #0f172a 50%, #0a0a14 100%);
              color: #e2e8f0;
              min-height: 100vh;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
              overflow-x: hidden;
            }
            ::-webkit-scrollbar { width: 6px; }
            ::-webkit-scrollbar-track { background: transparent; }
            ::-webkit-scrollbar-thumb { background: rgba(100, 116, 139, 0.4); border-radius: 3px; }
            ::-webkit-scrollbar-thumb:hover { background: rgba(100, 116, 139, 0.6); }
            img { max-width: 100%; height: auto; }
            a { text-decoration: none; color: inherit; }
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(30px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.7; }
            }
            @keyframes shimmer {
              0% { background-position: -200% center; }
              100% { background-position: 200% center; }
            }
            @keyframes float {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
            }
            ::selection {
              background: rgba(59, 130, 246, 0.3);
              color: #e0f2fe;
            }
          </style>
        </head>
        <body>
          ${htmlBody}
          <script>
            window.onload = function() {
                ${injectionScript}
            }
          </script>
        </body>
      </html>
    `;
  };

  // --- VIEW: DASHBOARD ---
  if (view === 'dashboard') {
    return (
      <div className="animate-in fade-in duration-500 relative">
        <div className="flex justify-between items-center mb-8">
          <div>
             <h2 className="text-2xl font-bold text-white mb-2">Meus Projetos de Funil</h2>
             <p className="text-slate-400">Gerencie e construa suas estruturas de vendas.</p>
          </div>
          <button 
            onClick={openCreateProjectModal}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-5 h-5" />
            Novo Projeto
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.length === 0 && (
            <div className="col-span-full py-20 text-center bg-slate-800/50 rounded-2xl border border-slate-700 border-dashed">
              <FolderOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">Nenhum projeto encontrado.</p>
              <p className="text-slate-600 text-sm">Crie seu primeiro funil para começar.</p>
            </div>
          )}
          {projects.map(project => (
            <div key={project.id} onClick={() => openProject(project)} className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-cyan-500/50 cursor-pointer transition-all group relative">
               <div className="absolute top-4 right-4 z-20 flex gap-2">
                 <button 
                   onClick={(e) => openRenameProjectModal(project.id, project.name, e)}
                   className="p-2 bg-slate-900/80 hover:bg-cyan-500/20 rounded-lg text-slate-400 hover:text-cyan-400 transition-colors shadow-sm"
                   title="Renomear Projeto"
                 >
                   <Pencil className="w-4 h-4" />
                 </button>
                 <button 
                   onClick={(e) => deleteProject(project.id, e)}
                   className={`p-2 rounded-lg transition-colors shadow-sm ${
                       deleteConfirmationId === project.id 
                        ? 'bg-red-600 text-white hover:bg-red-700' 
                       : 'bg-slate-900/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400'
                   }`}
                   title={deleteConfirmationId === project.id ? "Confirmar Exclusão" : "Excluir Projeto"}
                 >
                   {deleteConfirmationId === project.id ? <Trash2 className="w-4 h-4 animate-pulse" /> : <Trash2 className="w-4 h-4" />}
                 </button>
               </div>
               <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center mb-4 text-cyan-400">
                 <Layout className="w-6 h-6" />
               </div>
               <h3 className="text-lg font-bold text-slate-200 mb-1 truncate pr-16">{project.name}</h3>
               <p className="text-xs text-slate-500">
                 {project.nodes.length} páginas  Criado em {new Date(project.createdAt).toLocaleDateString()}
               </p>
            </div>
          ))}
        </div>

        {/* --- NAME MODAL --- */}
        {isNameModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
                    <h3 className="text-lg font-bold text-white mb-4">
                        {nameModalMode === 'create' ? 'Novo Projeto' : 'Renomear Projeto'}
                    </h3>
                    <input 
                        ref={nameInputRef}
                        type="text" 
                        value={tempProjectName}
                        onChange={(e) => setTempProjectName(e.target.value)}
                        placeholder="Nome do Funil"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none mb-6"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveProjectName();
                            if (e.key === 'Escape') setIsNameModalOpen(false);
                        }}
                    />
                    <div className="flex justify-end gap-3">
                        <button 
                            onClick={() => setIsNameModalOpen(false)}
                            className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleSaveProjectName}
                            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-cyan-500/20"
                        >
                            {nameModalMode === 'create' ? 'Criar Projeto' : 'Salvar Alteração'}
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    );
  }

  // --- VIEW: EDITOR ---
  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <>
      <div className="h-[80vh] flex flex-col lg:flex-row gap-4 animate-in zoom-in-95 duration-300">
        
        {/* TOOLBAR (Left) */}
        <div className="w-full lg:w-48 flex flex-col gap-2">
          <Card className="h-full overflow-y-auto">
              <div className="mb-4 pb-4 border-b border-slate-700">
                <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors mb-4">
                  <Undo2 className="w-3 h-3" /> Voltar
                </button>
                <div className="flex items-center justify-between group">
                    <h3 className="font-bold text-slate-200 truncate flex-1" title={currentProject?.name}>{currentProject?.name}</h3>
                    {currentProject && (
                        <button 
                            onClick={(e) => openRenameProjectModal(currentProject.id, currentProject.name, e)}
                            className="p-1 text-slate-500 hover:text-white opacity-50 group-hover:opacity-100 transition-all"
                            title="Renomear"
                        >
                            <Pencil className="w-3 h-3" />
                        </button>
                    )}
                </div>
              </div>

              <div className="mb-4">
                 <button 
                    onClick={startSimulation}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                 >
                    <Play className="w-4 h-4 fill-current" />
                    Simular Funil
                 </button>
              </div>

              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Adicionar Página</p>
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                {(Object.keys(NodeLabels) as NodeType[]).map(type => (
                  <button 
                    key={type}
                    onClick={() => addNode(type)}
                    className={`text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all flex items-center gap-2 hover:bg-slate-700 ${NodeColors[type]}`}
                  >
                    {NodeIcons[type]}
                    {NodeLabels[type]}
                  </button>
                ))}
              </div>

              <div className="mt-auto pt-4 border-t border-slate-700 space-y-2">
                <button 
                  onClick={saveCurrentProject}
                  className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Save className="w-3 h-3" /> Salvar Projeto
                </button>
                <button 
                  onClick={handleDownloadFunnel}
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/10"
                >
                  <Download className="w-3 h-3" /> Baixar Funil
                </button>
              </div>
          </Card>
        </div>

        {/* CANVAS (Center) */}
        <div className="flex-1 relative bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-inner" 
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        > 
          {/* Background Grid */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
              backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              transform: `scale(${zoom})`,
              transformOrigin: '0 0'
          }}></div>

          {/* ZOOMABLE CONTAINER */}
          <div style={{ transform: `scale(${zoom})`, transformOrigin: '0 0', width: '100%', height: '100%' }}>
            
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
                {connections.map(conn => renderConnectionLine(conn))}
            </svg>

            {nodes.map(node => (
                <div
                key={node.id}
                onMouseDown={(e) => handleMouseDown(e, node.id)}
                style={{ transform: `translate(${node.x}px, ${node.y}px)` }}
                className={`absolute w-40 z-10 cursor-move transition-shadow ${
                    selectedNodeId === node.id ? 'ring-2 ring-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]' : ''
                }`}
                >
                    <div className={`bg-slate-900 border rounded-lg p-3 select-none flex flex-col gap-2 ${NodeColors[node.type]}`}>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{node.type}</span>
                            <div className="flex gap-1">
                                {node.generatedHtml && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" title="Código Gerado"></div>}
                            </div>
                        </div>
                        <p className="text-xs font-bold truncate leading-tight text-slate-200">{node.label}</p>
                        
                        {selectedNodeId === node.id && (
                            <button 
                            onClick={(e) => { e.stopPropagation(); setIsVisualEditorOpen(true); }}
                            className="w-full mt-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] py-1 rounded font-bold flex items-center justify-center gap-1 transition-colors"
                            >
                                <Maximize2 className="w-3 h-3" />
                                {node.generatedHtml ? 'Editar Visual' : 'Criar Visual'}
                            </button>
                        )}
                        
                        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-400 rounded-full"></div>
                        <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-400 rounded-full"></div>
                    </div>
                </div>
            ))}
          </div>

          {/* Controls Overlay (Zoom & Tools) */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
              
              {/* Actions */}
              <div className="bg-slate-800/90 backdrop-blur border border-slate-700 p-2 rounded-lg flex gap-2 shadow-xl">
                  <button 
                    onClick={handleUndo}
                    disabled={history.length === 0}
                    className="p-2 rounded hover:bg-slate-700 transition-colors text-slate-400 disabled:opacity-30"
                    title="Desfazer"
                  >
                    <History className="w-4 h-4" />
                  </button>
                  <div className="w-px bg-slate-700 mx-1"></div>
                  <button 
                    onClick={startConnection}
                    disabled={!selectedNodeId}
                    className={`p-2 rounded hover:bg-slate-700 transition-colors ${connectionMode.active ? 'bg-cyan-500/20 text-cyan-400 animate-pulse' : 'text-slate-400'} disabled:opacity-30`}
                    title="Conectar Blocos"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => selectedNodeId && deleteNode(selectedNodeId)}
                    disabled={!selectedNodeId}
                    className="p-2 rounded hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-colors disabled:opacity-30"
                    title="Deletar Bloco"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
              </div>

              {/* Zoom Controls */}
              <div className="bg-slate-800/90 backdrop-blur border border-slate-700 p-2 rounded-lg flex flex-col gap-2 shadow-xl">
                 <button 
                   onClick={() => setZoom(z => Math.min(z + 0.1, 2))}
                   className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                   title="Zoom In"
                 >
                   <ZoomIn className="w-4 h-4" />
                 </button>
                 <button 
                   onClick={() => setZoom(1)}
                   className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                   title="Reset Zoom"
                 >
                   <RotateCcw className="w-4 h-4" />
                 </button>
                 <button 
                   onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))}
                   className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                   title="Zoom Out"
                 >
                   <ZoomOut className="w-4 h-4" />
                 </button>
              </div>
          </div>
        </div>

        {/* INSPECTOR (Right) - Simplified */}
        <div className="w-full lg:w-72 flex flex-col">
          <Card className="h-full flex flex-col">
              {!selectedNode ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center p-4">
                  <MousePointer2 className="w-10 h-10 mb-2 opacity-50" />
                  <p className="text-sm">Selecione um bloco</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-4">
                  <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Nome</label>
                      <input 
                        type="text" 
                        value={selectedNode.label}
                        onChange={(e) => setNodes(nodes.map(n => n.id === selectedNode.id ? {...n, label: e.target.value} : n))}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm mt-1 focus:border-cyan-500 outline-none"
                      />
                  </div>

                  {/* OUTLIER MATRIX MODE - ALWAYS ACTIVE INDICATOR */}
                  <div 
                    className="flex items-center justify-between p-3 rounded-xl border bg-gradient-to-r from-emerald-900/40 to-slate-900 border-emerald-500/50 shadow-lg shadow-emerald-900/20"
                  >
                      <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-full bg-emerald-500 text-white">
                              <Crown className="w-4 h-4" />
                          </div>
                          <div>
                              <p className="text-xs font-bold text-emerald-400">Modo Outlier</p>
                              <p className="text-[10px] text-slate-500">Design Matrix v100.0 · Ativo</p>
                          </div>
                      </div>
                      <div className="w-10 h-5 rounded-full relative transition-colors bg-emerald-500">
                          <div className="absolute top-1 left-1 bg-white w-3 h-3 rounded-full translate-x-5"></div>
                      </div>
                  </div>

                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex-1 flex flex-col items-center justify-center text-center gap-3">
                     <div className={`w-16 h-16 rounded-full flex items-center justify-center ${selectedNode.generatedHtml ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-600'}`}>
                        {selectedNode.generatedHtml ? <CheckCircle className="w-8 h-8" /> : <Code2 className="w-8 h-8" />}
                     </div>
                     <div>
                       <h4 className="text-sm font-bold text-slate-200">
                          {selectedNode.generatedHtml ? 'Página Pronta' : 'Página Vazia'}
                       </h4>
                       <p className="text-xs text-slate-500 mt-1">
                          {selectedNode.generatedHtml ? 'Use o editor para refinar.' : 'Abra o editor para criar.'}
                       </p>
                     </div>
                     <button 
                       onClick={() => setIsVisualEditorOpen(true)}
                       className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all"
                     >
                        {selectedNode.generatedHtml ? 'Abrir Editor Visual' : 'Gerar Página Agora'}
                     </button>
                  </div>
                </div>
              )}
          </Card>
        </div>
      </div>

      {/* --- REUSED NAME MODAL (For Editor View too) --- */}
      {isNameModalOpen && (
            <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
                    <h3 className="text-lg font-bold text-white mb-4">
                        {nameModalMode === 'create' ? 'Novo Projeto' : 'Renomear Projeto'}
                    </h3>
                    <input 
                        ref={nameInputRef}
                        type="text" 
                        value={tempProjectName}
                        onChange={(e) => setTempProjectName(e.target.value)}
                        placeholder="Nome do Funil"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none mb-6"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveProjectName();
                            if (e.key === 'Escape') setIsNameModalOpen(false);
                        }}
                    />
                    <div className="flex justify-end gap-3">
                        <button 
                            onClick={() => setIsNameModalOpen(false)}
                            className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleSaveProjectName}
                            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-cyan-500/20"
                        >
                            {nameModalMode === 'create' ? 'Criar Projeto' : 'Salvar Alteração'}
                        </button>
                    </div>
                </div>
            </div>
      )}

      {/* --- VISUAL EDITOR MODAL (SINGLE PAGE EDIT) --- */}
      {isVisualEditorOpen && selectedNode && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-6 shadow-md">
                <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${NodeColors[selectedNode.type]}`}>
                        {NodeIcons[selectedNode.type]}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white leading-tight flex items-center gap-2">
                            {selectedNode.label}
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1"><Crown className="w-3 h-3" /> Outlier Mode</span>
                        </h2>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                           <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                           Editor em Tempo Real
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
                    <button 
                      onClick={() => setPreviewMode('desktop')}
                      className={`p-2 rounded ${previewMode === 'desktop' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      title="Desktop View"
                    >
                       <Monitor className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setPreviewMode('mobile')}
                      className={`p-2 rounded ${previewMode === 'mobile' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      title="Mobile View"
                    >
                       <Smartphone className="w-4 h-4" />
                    </button>
                </div>

                <button 
                   onClick={() => setIsVisualEditorOpen(false)}
                   className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                   <X className="w-6 h-6" />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* Left: Chat & Controls */}
                <div className="w-80 border-r border-slate-800 bg-slate-900 flex flex-col shadow-xl">
                   <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {!selectedNode.generatedHtml && (
                         <div className="bg-cyan-900/20 border border-cyan-500/30 p-4 rounded-xl">
                            <h3 className="text-cyan-400 font-bold text-sm mb-2">Vamos começar!</h3>
                            <p className="text-xs text-slate-300">Descreva como você quer essa página. Exemplo:</p>
                            <p className="text-xs text-slate-400 italic mt-2">"Uma página de captura preta e dourada para um curso de finanças, com headline chamativa e formulário simples."</p>
                         </div>
                      )}

                      {selectedNode.generatedHtml && (
                        <div className="space-y-4">
                            <div className="flex justify-end">
                                <div className="bg-slate-800 rounded-lg rounded-tr-none p-3 max-w-[90%] border border-slate-700">
                                   <p className="text-xs text-slate-300">{selectedNode.prompt || "Criação inicial"}</p>
                                </div>
                            </div>
                            <div className="flex justify-start">
                                <div className="bg-cyan-900/20 border border-cyan-500/20 rounded-lg rounded-tl-none p-3 max-w-[90%]">
                                   <p className="text-xs text-cyan-200 font-bold flex items-center gap-2">
                                     <CheckCircle className="w-3 h-3" /> Página Atualizada
                                   </p>
                                </div>
                            </div>
                        </div>
                      )}
                   </div>

                   {/* Input Area */}
                   <div className="p-4 border-t border-slate-800 bg-slate-900">
                      {isUploading && (
                         <div className="mb-2 flex items-center gap-2 text-cyan-400 text-xs animate-pulse bg-cyan-900/20 p-2 rounded">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Processando arquivo...
                         </div>
                      )}

                      {attachment && (
                          <div className="mb-2 flex items-center justify-between bg-slate-800 p-2 rounded-lg border border-slate-700">
                             <div className="flex items-center gap-2">
                                {attachment.type === 'video' ? <FileVideo className="w-4 h-4 text-emerald-400" /> : 
                                 attachment.type === 'pdf' ? <FileType className="w-4 h-4 text-red-400" /> :
                                 <ImageIcon className="w-4 h-4 text-emerald-400" />}
                                <span className="text-[10px] text-slate-200 font-bold truncate max-w-[150px]">{attachment.name}</span>
                             </div>
                             <button onClick={() => setAttachment(null)} className="text-slate-500 hover:text-white">
                                <X className="w-3 h-3" />
                             </button>
                          </div>
                      )}

                      <div className="relative">
                         <textarea 
                           value={editorPrompt}
                           onChange={(e) => setEditorPrompt(e.target.value)}
                           onKeyDown={(e) => {
                             if(e.key === 'Enter' && !e.shiftKey) {
                               e.preventDefault();
                               handleGenerateOrRefine(editorPrompt);
                             }
                           }}
                           placeholder={selectedNode.generatedHtml ? "Ex: Mude a cor do botão..." : "Descreva a página..."}
                           className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-4 pr-12 py-3 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none resize-none h-24 scrollbar-hide"
                         />
                         
                         {/* Attachment Button */}
                         <button 
                            onClick={() => fileInputRef.current?.click()}
                            className={`absolute bottom-3 right-12 p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all ${attachment ? 'text-emerald-400' : ''}`}
                            title="Anexar Arquivo (Vídeo, Imagem ou PDF)"
                         >
                            <Paperclip className="w-4 h-4" />
                         </button>
                         <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*,video/*,application/pdf" 
                            onChange={handleFileUpload}
                         />

                         <button 
                           onClick={() => handleGenerateOrRefine(editorPrompt)}
                           disabled={isGenerating || (!editorPrompt.trim() && !attachment)}
                           className="absolute bottom-3 right-3 p-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:bg-slate-700 text-white rounded-lg transition-all"
                         >
                           {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                         </button>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2 text-center flex items-center justify-center gap-1">
                         <AlertCircle className="w-3 h-3" />
                         Dica: Para VSLs, anexe o arquivo de vídeo.
                      </p>
                   </div>
                </div>

                {/* Right: Preview */}
                <div className="flex-1 bg-slate-950 flex items-center justify-center p-8 relative overflow-hidden">
                    {/* Grid Pattern */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
                        backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                    }}></div>

                    {selectedNode.generatedHtml ? (
                      <div className={`relative transition-all duration-500 shadow-2xl ${
                          previewMode === 'mobile' ? 'w-[375px] h-[750px]' : 'w-full h-full'
                      }`}>
                          {/* Device Frame (only for mobile) */}
                          {previewMode === 'mobile' && (
                             <div className="absolute inset-0 border-[12px] border-slate-800 rounded-[3rem] pointer-events-none z-20 shadow-2xl"></div>
                          )}
                          
                          <iframe
                             title="Preview"
                             srcDoc={getIframeContent(selectedNode.generatedHtml, selectedNode.id)}
                             className={`w-full h-full bg-slate-950 ${previewMode === 'mobile' ? 'rounded-[2.2rem]' : 'rounded-lg border border-slate-800'}`}
                          />

                          {isGenerating && (
                             <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-white rounded-lg">
                                <Loader2 className="w-10 h-10 animate-spin text-cyan-400 mb-4" />
                                <p className="font-bold animate-pulse">A IA está trabalhando...</p>
                                <p className="text-sm text-slate-400 mt-2">Reescrevendo código HTML e CSS</p>
                             </div>
                          )}
                      </div>
                    ) : (
                      <div className="text-center opacity-40 max-w-sm">
                         <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Code2 className="w-10 h-10 text-slate-400" />
                         </div>
                         <h3 className="text-xl font-bold text-white mb-2">Editor Vazio</h3>
                         <p className="text-slate-400">
                            Use o chat à esquerda para descrever sua página e a IA irá construí-la em tempo real.
                         </p>
                      </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* --- FUNNEL SIMULATION MODE --- */}
      {isPlaying && previewNodeId && (
        <div className="fixed inset-0 z-[150] bg-slate-950 flex flex-col animate-in fade-in duration-300">
           <div className="bg-slate-900 border-b border-slate-800 p-3 flex justify-between items-center px-6">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                 <span className="text-slate-200 font-bold text-sm tracking-widest uppercase">Simulando: {nodes.find(n => n.id === previewNodeId)?.label}</span>
              </div>
              <button 
                onClick={() => setIsPlaying(false)}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-lg text-xs font-bold transition-colors"
              >
                Encerrar Simulação
              </button>
           </div>
           <div className="flex-1 w-full h-full">
              {(() => {
                  const node = nodes.find(n => n.id === previewNodeId);
                  if (!node || !node.generatedHtml) {
                      return (
                          <div className="h-full flex flex-col items-center justify-center text-slate-500">
                             <AlertCircle className="w-12 h-12 mb-2" />
                             <p>Página não gerada ou não encontrada.</p>
                          </div>
                      )
                  }
                  return (
                    <iframe
                        key={previewNodeId} // Force re-render on node change
                        title="Simulation"
                        srcDoc={getIframeContent(node.generatedHtml, node.id)}
                        className="w-full h-full border-none bg-white"
                    />
                  )
              })()}
           </div>
        </div>
      )}
    </>
  );
};

