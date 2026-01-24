import React from 'react';
import { SalesDocumentForm } from './SalesDocumentForm';

interface MainContentProps {
  activeView: string;
}

export const MainContent: React.FC<MainContentProps> = ({ activeView }) => {
  // Simple SVG pattern as background to match the screenshot's technical feel
  const bgPattern = `data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C92AC' fill-opacity='0.05' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E`;

  if (activeView === 'sales-form' || activeView === 'internal-docs') {
    return <SalesDocumentForm viewMode={activeView} />;
  }

  return (
    <main 
        className="flex-1 bg-bg-app relative overflow-hidden"
        style={{ backgroundImage: `url("${bgPattern}")` }}
    >
      {/* This area is intentionally left empty to mimic the dashboard idle state, 
          but could contain dashboard widgets in a real app. */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none shadow-inner"></div>
    </main>
  );
};