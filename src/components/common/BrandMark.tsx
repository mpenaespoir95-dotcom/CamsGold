import React from 'react';

export const BrandMark: React.FC<{ compact?: boolean; inverted?: boolean }> = ({
  compact = false,
  inverted = false,
}) => {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`relative overflow-hidden rounded-xl bg-[#D39725] shadow-xs flex-shrink-0 ${
          compact ? 'w-9 h-9' : 'w-11 h-11'
        }`}
      >
        <img
          src="/cams_gold.jpeg"
          alt="Cams Gold"
          className="w-full h-full object-cover"
          onError={(e) => {
            // fallback if image fails
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>
      <div className="flex flex-col text-left">
        <span
          className={`font-black leading-tight tracking-tight ${
            inverted ? 'text-white' : 'text-[#192A24]'
          } ${compact ? 'text-lg' : 'text-xl'}`}
        >
          CAMS GOLD
        </span>
        <span className="text-[10px] font-bold tracking-[0.16em] text-[#D39725] uppercase">
          OR · DEVISES · PARTENAIRES
        </span>
      </div>
    </div>
  );
};
