import React from 'react';
import { Suggestion } from '../types';
import { Lightbulb, Check, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SuggestionPanelProps {
  suggestions: Suggestion[];
  onAccept: (suggestion: Suggestion) => void;
  onReject: (suggestion: Suggestion) => void;
  mentorStyle: 'finch' | 'marcal' | 'hibrido';
}

export const SuggestionPanel: React.FC<SuggestionPanelProps> = ({ suggestions, onAccept, onReject, mentorStyle }) => {
  if (suggestions.length === 0) return null;

  const getBorderColor = () => {
    switch (mentorStyle) {
      case 'finch': return 'border-emerald-500/30';
      case 'marcal': return 'border-amber-500/30';
      default: return 'border-indigo-500/30';
    }
  };

  const getIconColor = () => {
    switch (mentorStyle) {
      case 'finch': return 'text-emerald-400';
      case 'marcal': return 'text-amber-400';
      default: return 'text-indigo-400';
    }
  };

  return (
    <div className="absolute top-4 right-4 z-20 w-80 space-y-3 pointer-events-none">
      <AnimatePresence>
        {suggestions.map((suggestion) => (
          <motion.div
            key={suggestion.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className={`pointer-events-auto bg-slate-900/95 backdrop-blur-md border ${getBorderColor()} rounded-xl p-4 shadow-2xl relative overflow-hidden group`}
          >
            {/* Progress Bar / Confidence */}
            <div className="absolute top-0 left-0 h-1 bg-slate-800 w-full">
              <div 
                className={`h-full ${mentorStyle === 'marcal' ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                style={{ width: `${suggestion.confidence * 100}%` }}
              />
            </div>

            <div className="flex gap-3 mt-2">
              <div className={`p-2 rounded-lg bg-slate-800 h-fit ${getIconColor()}`}>
                <Lightbulb className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-white leading-tight mb-1">{suggestion.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">{suggestion.description}</p>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => onAccept(suggestion)}
                    className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg py-1.5 px-3 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Check className="w-3 h-3" /> Aplicar
                  </button>
                  <button 
                    onClick={() => onReject(suggestion)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 rounded-lg py-1.5 px-3 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
