import React, { useState } from 'react';
import { DocumentTypeModal } from './DocumentTypeModal';
import { DocumentListModal } from './DocumentListModal';
import { SimpleDocumentTypeModal } from './SimpleDocumentTypeModal';
import { EntityListModal } from './EntityListModal';

interface SalesDocumentFormProps {
  viewMode?: string;
}

export const SalesDocumentForm: React.FC<SalesDocumentFormProps> = ({ viewMode = 'sales-form' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDocListOpen, setIsDocListOpen] = useState(false);
  const [isDocTypeSelectorOpen, setIsDocTypeSelectorOpen] = useState(false);
  const [isEntityListOpen, setIsEntityListOpen] = useState(false);

  const [selectedDocNumber, setSelectedDocNumber] = useState('');
  const [selectedDocDescription, setSelectedDocDescription] = useState('');

  const [selectedEntityCode, setSelectedEntityCode] = useState('');
  const [selectedEntityName, setSelectedEntityName] = useState('');
  const [selectedEntityNif, setSelectedEntityNif] = useState('');
  const [selectedEntityAddress, setSelectedEntityAddress] = useState('');

  const isInternal = viewMode === 'internal-docs';

  const toolbarItems = isInternal
    ? [
      { label: "Gravar", icon: "save" },
      { label: "Novo", icon: "add_circle" },
      { label: "Duplicar", icon: "content_copy" },
      { label: "Imprimir", icon: "print" },
      { label: "Procurar", icon: "search" },
      { label: "Enviar", icon: "send" },
      { label: "CRM", icon: "contacts" },
      { label: "Contexto", icon: "settings" },
      { label: "Ajuda", icon: "help_outline" },
      { label: "Cancelar", icon: "logout" },
    ]
    : [
      { label: "Gravar", icon: "save" },
      { label: "Novo", icon: "add_circle" },
      { label: "Anular", icon: "block" },
      { label: "Duplicar", icon: "content_copy" },
      { label: "Anular e Duplicar", icon: "file_copy" },
      { label: "Imprimir", icon: "print" },
      { label: "Rascunhos", icon: "history_edu" },
      { label: "Procurar", icon: "search" },
      { label: "Enviar", icon: "send" },
      { label: "CRM", icon: "contacts" },
      { label: "Contexto", icon: "settings" },
      { label: "Ajuda", icon: "help_outline" },
      { label: "Cancelar", icon: "logout" },
    ];

  const tabs = [
    "Geral", "Condições", "Transação", "Fatura", "Impressão",
    "Carga/Descarga", "Observações", "Estado", "Anexos"
  ];

  const gridHeaders = [
    "Artigo", "Arm.", "Localização", "Lote", "Descrição",
    "CIVA", "IVA", "Pr. Unit.", "Desc.", "UN", "Qtd.",
    "Total Liq.", "Projeto", "Elem. PEP", "Cód. Barras",
    "IVA - Regra Cálculo", "Valor Total", "Contrato", "N.º Processo"
  ];

  // Configurations based on mode
  const documentRefLabel = isInternal ? "N.º Doc:" : "V/Refer.";
  const defaultDocValue = isInternal ? "" : "FA";
  const defaultDate = isInternal ? "2011-07-19" : "2025-11-21";

  // Helper to render dividers in toolbar
  const shouldRenderDivider = (idx: number) => {
    if (isInternal) {
      // Dividers for Internal Docs layout
      return idx === 2 || idx === 3 || idx === 4 || idx === 6;
    } else {
      // Dividers for Sales layout
      return idx === 4 || idx === 6 || idx === 9;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-bg-app text-xs overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-300 bg-[#F0F0F0] shadow-sm shrink-0 overflow-x-auto">
        {toolbarItems.map((item, idx) => (
          <React.Fragment key={idx}>
            <button
              className="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-sm transition-all text-gray-700 whitespace-nowrap group"
              onClick={() => {
                if (item.label === 'Novo') {
                  setIsModalOpen(true);
                }
              }}
            >
              <span className="material-symbols-outlined text-[18px] text-gray-600 group-hover:text-primary">{item.icon}</span>
              <span>{item.label}</span>
            </button>
            {shouldRenderDivider(idx) && <div className="w-px h-4 bg-gray-300 mx-1"></div>}
          </React.Fragment>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-end px-1 pt-2 border-b border-gray-300 bg-[#E0E0E0] shrink-0 gap-1 overflow-x-auto">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            className={`px-3 py-1 border-t-2 border-x border-b-0 rounded-t-sm text-[11px] font-medium transition-colors relative -mb-px ${idx === 0
              ? "bg-[#F0F0F0] border-t-primary border-x-gray-300 text-black pb-1.5 z-10"
              : "bg-[#D4D4D4] border-t-transparent border-x-transparent hover:bg-[#E8E8E8] text-gray-600"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Form Header */}
      <div className="flex flex-col p-2 bg-[#F0F0F0] border-b border-gray-300 shrink-0 h-auto gap-2">
        <div className="flex flex-col md:flex-row gap-2 h-full">

          {/* Left Inputs Area */}
          <div className="flex-1 flex flex-col gap-1.5">
            {/* Row 1 */}
            <div className="flex items-center gap-2">
              <label
                className="w-20 text-blue-600 font-medium text-right cursor-pointer hover:underline"
                onClick={() => setIsDocTypeSelectorOpen(true)}
                title="Clique para selecionar tipo de documento"
              >
                Documento:
              </label>
              <div className="flex items-center border border-gray-300 bg-white rounded-sm h-5 w-24 relative">
                <input
                  className="w-full h-full px-1 focus:outline-none"
                  value={selectedDocNumber || defaultDocValue}
                  onChange={(e) => setSelectedDocNumber(e.target.value)}
                  readOnly={!isInternal}
                />
                <button
                  className="absolute right-0 top-0 bottom-0 px-0.5 bg-gray-100 border-l hover:bg-gray-200 text-blue-600 text-[10px] font-bold"
                  onClick={() => setIsDocTypeSelectorOpen(true)}
                  title="Selecionar Tipo de Documento"
                >
                  F4
                </button>
              </div>
              <input
                className="flex-1 h-5 border border-gray-300 px-1 bg-[#FDFDFD] rounded-sm focus:outline-none focus:border-blue-500"
                value={selectedDocDescription}
                disabled
              />

              <div className="flex items-center gap-2 ml-4">
                <label className="font-medium">Data Doc.:</label>
                <input type="date" className="h-5 border border-gray-300 px-1 w-28 rounded-sm text-xs" defaultValue={defaultDate} />
              </div>
            </div>

            {/* Row 2 */}
            <div className="flex items-center gap-2">
              <label className="w-20 text-blue-600 font-medium text-right">Entidade:</label>
              <div className="flex items-center border border-gray-300 bg-white rounded-sm h-5 w-24 relative">
                <input
                  className="w-full h-full px-1 focus:outline-none"
                  value={selectedEntityCode}
                  onChange={(e) => setSelectedEntityCode(e.target.value)}
                />
                <button
                  className="absolute right-0 top-0 bottom-0 px-0.5 bg-gray-100 border-l hover:bg-gray-200 text-blue-600 text-[10px] font-bold"
                  onClick={() => setIsEntityListOpen(true)}
                >
                  F4
                </button>
              </div>
              <input
                className="flex-1 h-5 border border-gray-300 px-1 bg-white rounded-sm focus:outline-none focus:border-blue-500"
                value={selectedEntityName}
                onChange={(e) => setSelectedEntityName(e.target.value)}
              />

              <div className="flex items-center gap-2 ml-4">
                <label className="font-medium text-blue-600">Data Venc.:</label>
                <input type="date" className="h-5 border border-gray-300 px-1 w-28 rounded-sm text-xs" defaultValue={defaultDate} />
              </div>
            </div>

            {/* Row 3 - Read Only Address/Name Lines */}
            <div className="flex items-center gap-2">
              <div className="w-20"></div>
              <input
                className="flex-1 h-5 border border-gray-300 px-1 bg-[#F8F8F8] text-gray-500 rounded-sm"
                value={selectedEntityAddress}
                readOnly
              />
              <div className="flex items-center gap-2 ml-4">
                <label className="font-medium w-[58px] text-right">Desc. Cli.</label>
                <input className="h-5 border border-gray-300 px-1 w-28 text-right rounded-sm" defaultValue="0,00" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-20"></div>
              <div className="flex-1 flex gap-1">
                <input className="w-24 h-5 border border-gray-300 px-1 bg-[#F8F8F8] text-gray-500 rounded-sm relative" readOnly />
                <span className="absolute ml-[80px] mt-[2px] text-blue-600 text-[10px] font-bold z-10 cursor-pointer">F4</span>
                <input className="flex-1 h-5 border border-gray-300 px-1 bg-[#F8F8F8] text-gray-500 rounded-sm relative" readOnly />
                <span className="absolute right-[430px] mt-[2px] text-blue-600 text-[10px] font-bold z-10 cursor-pointer">F4</span>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <label className="font-medium w-[58px] text-right">Desc. Financ.</label>
                <input className="h-5 border border-gray-300 px-1 w-28 text-right rounded-sm" defaultValue="0,00" />
              </div>
            </div>

            {/* Row 4 */}
            <div className="flex items-center gap-2 mt-1">
              <label className="w-20 font-medium text-right">Contribuinte:</label>
              <input
                className="w-32 h-5 border border-gray-300 px-1 bg-white rounded-sm"
                value={selectedEntityNif}
                onChange={(e) => setSelectedEntityNif(e.target.value)}
              />
              <label className="ml-4 font-medium text-gray-500">{documentRefLabel}</label>
              <input className="flex-1 h-5 border border-gray-300 px-1 bg-white rounded-sm" />
              <span className="material-symbols-outlined text-lg text-gray-400 cursor-pointer">search</span>
            </div>
          </div>

          {/* Right Side Summary Panel */}
          <div className="w-56 bg-[#FDFDFD] border border-gray-300 p-2 shadow-sm flex flex-col gap-1 text-[11px]">
            {[
              { label: "Merc./Serv.:", val: "" },
              { label: "Descontos:", val: "" },
              { label: "IVA:", val: "" },
              { label: "Outros:", val: "" },
              { label: "Subtotal:", val: "" },
              { label: "Acerto:", val: "" },
              { label: "Ecovalor:", val: "" },
            ].map((row, i) => (
              <div key={i} className="flex justify-between text-gray-700">
                <span>{row.label}</span>
                <span className="font-mono">{row.val}</span>
              </div>
            ))}
            <div className="mt-auto pt-1 border-t border-gray-200 flex justify-between font-bold text-black text-xs">
              <span>Total: MT</span>
              <span>0,00</span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Grid */}
      <div className="flex-1 overflow-auto bg-white relative border-t border-gray-300">
        <table className="w-full border-collapse text-[11px] min-w-max">
          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
            <tr>
              {gridHeaders.map((h, i) => (
                <th
                  key={i}
                  className={`px-2 py-1 border-r border-b border-gray-300 text-blue-600 font-medium text-left whitespace-nowrap ${i === 0 ? 'border-l' : ''}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Render 20 empty rows to simulate the grid feel */}
            {Array.from({ length: 20 }).map((_, idx) => (
              <tr key={idx} className="hover:bg-blue-50">
                {gridHeaders.map((_, colIdx) => (
                  <td key={colIdx} className="border-r border-b border-gray-200 h-6 px-1"></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Scrollbar styling is handled in global CSS, but we can simulate the look of the empty space */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0px_0px_4px_rgba(0,0,0,0.05)]"></div>
      </div>

      {/* Document Type Modal */}
      <DocumentTypeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={(docType) => {
          console.log('Selected document type:', docType);
          // Here you would handle the document creation
        }}
      />

      {/* Document List Modal */}
      <DocumentListModal
        isOpen={isDocListOpen}
        onClose={() => setIsDocListOpen(false)}
        onSelect={(docNumber) => {
          setSelectedDocNumber(docNumber);
          console.log('Selected document:', docNumber);
        }}
      />

      {/* Simple Document Type Selector Modal */}
      <SimpleDocumentTypeModal
        isOpen={isDocTypeSelectorOpen}
        onClose={() => setIsDocTypeSelectorOpen(false)}
        onSelect={(type) => {
          setSelectedDocNumber(type.code);
          setSelectedDocDescription(type.description);
        }}
      />

      {/* Entity List Modal */}
      <EntityListModal
        isOpen={isEntityListOpen}
        onClose={() => setIsEntityListOpen(false)}
        onSelect={(entity) => {
          setSelectedEntityCode(entity.code);
          setSelectedEntityName(entity.name);
          setSelectedEntityNif(entity.nif);
          setSelectedEntityAddress(entity.address);
        }}
      />
    </div>
  );
};