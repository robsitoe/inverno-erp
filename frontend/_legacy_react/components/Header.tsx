import React from 'react';

interface HeaderProps {
  username?: string;
}

export const Header: React.FC<HeaderProps> = ({ username }) => {
  const navLinks = ["SISTEMA", "FERRAMENTAS", "PREFERÊNCIAS", "EVOLUÇÃO", "VER"];

  return (
    <header className="flex items-center justify-between bg-bg-app px-4 py-1.5 border-b border-gray-300 shadow-sm select-none shrink-0 z-20">
      <div className="flex items-center gap-6 text-xs">
        <p className="font-semibold text-gray-700 tracking-tight">PRIMAVERA PROFESSIONAL v9.15</p>
        <nav className="hidden md:flex items-center gap-4">
          {navLinks.map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase()}`}
              className="text-gray-600 hover:text-black hover:underline transition-colors font-medium"
            >
              {link}
            </a>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3 text-gray-600">
        <button className="hover:bg-gray-200 p-1 rounded transition-colors" title="Perfil">
          <span className="material-symbols-outlined text-[18px] align-middle">person</span>
        </button>
        <span className="text-xs font-medium hidden sm:block">{username || 'Utilizador'}</span>
        <div className="h-4 w-px bg-gray-300 mx-1 hidden sm:block"></div>
        <button className="hover:bg-gray-200 p-1 rounded transition-colors" title="Mudar Vista">
          <span className="material-symbols-outlined text-[18px] align-middle">view_in_ar</span>
        </button>
        <button className="hover:bg-gray-200 p-1 rounded transition-colors" title="Ajuda">
          <span className="material-symbols-outlined text-[18px] align-middle">help_outline</span>
        </button>
      </div>
    </header>
  );
};