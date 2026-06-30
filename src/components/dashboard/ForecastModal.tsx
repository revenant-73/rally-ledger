import React from 'react';
import { X } from 'lucide-react';

interface ForecastModalProps {
  isOpen: boolean;
  onClose: () => void;
  forecast: {
    icon: React.ElementType;
    label: string;
    color: string;
    interpretation: string;
  };
}

const ForecastModal: React.FC<ForecastModalProps> = ({
  isOpen,
  onClose,
  forecast,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-brand-bg border border-brand-gray/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-brand-text-secondary hover:text-brand-text"
        >
          <X size={24} />
        </button>
        
        <div className={`flex items-center gap-3 mb-6 ${forecast.color}`}>
          <forecast.icon size={32} />
          <h2 className="text-2xl font-black uppercase tracking-tighter">{forecast.label}</h2>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-brand-text-secondary uppercase tracking-widest">Interpretation</h3>
          <p className="text-lg font-medium leading-relaxed">
            {forecast.interpretation}
          </p>
        </div>
        
        <button 
          onClick={onClose}
          className="mt-8 w-full py-4 bg-brand-gray/5 border border-brand-gray/10 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-brand-gray/10 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ForecastModal;
