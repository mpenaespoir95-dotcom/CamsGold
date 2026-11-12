import React from 'react';

export const PageHeading: React.FC<{
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}> = ({ eyebrow, title, action }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#AA6B0B]">
          {eyebrow}
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#192A24] tracking-tight mt-0.5">
          {title}
        </h1>
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
};

export const AppPanel: React.FC<{
  children: React.ReactNode;
  className?: string;
  padding?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}> = ({ children, className = '', padding = 'p-5 sm:p-6', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-[#FFFDFA] rounded-2xl border border-[#E8D8BE] shadow-[0_4px_20px_rgba(53,40,15,0.04)] ${padding} ${className}`}
    >
      {children}
    </div>
  );
};

export const SectionHeading: React.FC<{
  title: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
}> = ({ title, icon, trailing }) => {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2.5">
        {icon && <span className="text-[#D39725]">{icon}</span>}
        <h2 className="text-lg font-bold text-[#192A24] tracking-tight">{title}</h2>
      </div>
      {trailing && <div>{trailing}</div>}
    </div>
  );
};

export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  printMode?: boolean;
}> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-xl', printMode = false }) => {
  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs ${printMode ? 'print-modal-backdrop' : ''}`}>
      <div
        className={`bg-[#FFFDFA] w-full ${maxWidth} rounded-2xl border border-[#E8D8BE] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col ${printMode ? 'print-modal-container' : ''}`}
      >
        <div className={`px-6 py-4 border-b border-[#E8D8BE] flex items-center justify-between bg-[#F6F0E5]/50 ${printMode ? 'print:hidden' : ''}`}>
          <h3 className="text-lg font-bold text-[#192A24]">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#7D8176] hover:text-[#192A24] hover:bg-black/5 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className={`p-6 overflow-y-auto ${printMode ? 'print-modal-content' : ''}`}>{children}</div>
      </div>
    </div>
  );
};
