
import React, { useEffect, useRef } from 'react';

export const SoundController: React.FC = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Inicializar AudioContext na primeira interação para contornar bloqueios de autoplay
    const initAudio = () => {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
            audioCtxRef.current = new AudioContextClass();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    };

    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('keydown', initAudio, { once: true });

    // --- SYNTHESIZERS ---

    const playStandardClick = () => {
      if (!audioCtxRef.current) return;
      const ctx = audioCtxRef.current;
      const t = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // Filter to soften the click
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3000, t);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      // Sound Profile: Short, clean digital "tick"
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.08);

      gain.gain.setValueAtTime(0.05, t); // Volume baixo para não incomodar
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      osc.start(t);
      osc.stop(t + 0.08);
    };

    const playHeavyAction = () => {
      if (!audioCtxRef.current) return;
      const ctx = audioCtxRef.current;
      const t = ctx.currentTime;

      // Oscillator 1: The "Body"
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(300, t);
      osc1.frequency.linearRampToValueAtTime(50, t + 0.3);
      
      gain1.gain.setValueAtTime(0.1, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      // Oscillator 2: The "High Tech Shimmer"
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1200, t);
      osc2.frequency.exponentialRampToValueAtTime(600, t + 0.2);

      gain2.gain.setValueAtTime(0.05, t);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc1.start(t);
      osc1.stop(t + 0.3);
      osc2.start(t);
      osc2.stop(t + 0.2);
    };

    const playToggleSound = () => {
        if (!audioCtxRef.current) return;
        const ctx = audioCtxRef.current;
        const t = ctx.currentTime;
  
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
  
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1800, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);
  
        gain.gain.setValueAtTime(0.03, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  
        osc.start(t);
        osc.stop(t + 0.05);
    };

    // --- GLOBAL LISTENER ---
    const handleGlobalClick = (e: MouseEvent) => {
       const target = e.target as HTMLElement;
       
       // Encontrar se o clique foi em algo interativo
       const interactiveEl = target.closest('button, a, input, [role="button"], select, textarea');
       
       if (interactiveEl) {
           const el = interactiveEl as HTMLElement;
           const text = el.textContent?.toLowerCase() || '';
           const type = (el as HTMLInputElement).type;

           // HEAVY ACTION keywords (Gerar, Salvar, Produzir, Entrar)
           if (
               text.includes('gerar') || 
               text.includes('produzir') || 
               text.includes('salvar') || 
               text.includes('entrar') || 
               text.includes('acessar') ||
               text.includes('criar')
           ) {
               playHeavyAction();
           } 
           // TOGGLES & CHECKBOXES
           else if (type === 'checkbox' || type === 'radio' || type === 'range') {
               playToggleSound();
           }
           // STANDARD NAVIGATION
           else {
               playStandardClick();
           }
       }
    };

    document.addEventListener('click', handleGlobalClick);

    return () => {
       document.removeEventListener('click', handleGlobalClick);
       document.removeEventListener('click', initAudio);
       document.removeEventListener('keydown', initAudio);
    };
  }, []);

  return null; // Componente sem UI visual
};
