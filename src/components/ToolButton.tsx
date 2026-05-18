import React from 'react';

interface ToolButtonProps {
  icon: React.ReactElement;
  active: boolean;
  onClick: () => void;
  tooltip: string;
  className?: string;
}

export const ToolButton: React.FC<ToolButtonProps> = ({ icon, active, onClick, tooltip, className }) => (
    <button 
        onClick={onClick}
        title={tooltip}
        className={`p-3 rounded-xl transition-all duration-300 ${
            active 
             ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 scale-105' 
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        } ${className || ''}`}
    >
        {React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 20 })}
    </button>
);
