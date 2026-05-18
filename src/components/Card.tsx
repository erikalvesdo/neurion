import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, children, className = '', icon }) => {
  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-lg ${className}`}>
      {title && (
        <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-3">
          {icon && <span className="text-cyan-400">{icon}</span>}
          <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
};
