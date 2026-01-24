import React from 'react';

interface FooterProps {
  username?: string;
}

export const Footer: React.FC<FooterProps> = ({ username }) => {
  return (
    <footer className="flex items-center justify-between bg-footer-blue text-white text-[11px] px-4 py-1 shrink-0 shadow-inner select-none z-20">
      <div className="flex items-center gap-4 overflow-hidden whitespace-nowrap">
        <div className="flex items-center gap-1">
          <span className="opacity-70">Empresa:</span>
          <span className="font-medium">MKG01T - NAVI-GÁS & Genericos Geral, Lda</span>
        </div>
        <div className="w-px h-3 bg-white/30 hidden sm:block"></div>
        <div className="hidden sm:flex items-center gap-1">
          <span className="opacity-70">Base de Dados:</span>
          <span className="font-medium">MSNAVIGAS01\PROFESSIONAL</span>
        </div>
        <div className="w-px h-3 bg-white/30 hidden md:block"></div>
        <div className="hidden md:flex items-center gap-1">
          <span className="opacity-70">Utilizador:</span>
          <span className="font-medium">{username || 'Utilizador'}</span>
        </div>
        <div className="w-px h-3 bg-white/30 hidden md:block"></div>
        <span className="font-bold hidden md:block">PT</span>
      </div>

      <div className="flex items-center gap-4 shrink-0 ml-4">
        <span className="font-medium">Lic.: VERSÃO DE DEMONSTRAÇÃO</span>
        <div className="size-2.5 bg-green-400 rounded-full border border-green-600 shadow-sm" title="Online"></div>
      </div>
    </footer>
  );
};