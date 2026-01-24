import React, { useState } from 'react';

interface DocumentTypeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (docType: string) => void;
}

export const DocumentTypeModal: React.FC<DocumentTypeModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [selectedType, setSelectedType] = useState('Pedido Cotação');
    const [valorLimite, setValorLimite] = useState('0,00');
    const [isReceberChecked, setIsReceberChecked] = useState(false);
    const [isPagarChecked, setIsPagarChecked] = useState(false);
    const [permiteDocs, setPermiteDocs] = useState(false);

    const documentTypes = [
        'Pedido Cotação',
        'Pedido Cotação',
        'Cotação',
        'Encomenda',
        'Stock/Trans.',
        'Financeiro'
    ];

    const options = [
        { id: 'emissao-indiferenciado', label: 'Emissão para cliente indiferenciado' },
        { id: 'sugestao-estatisticas', label: 'Sugestão para as estatísticas' },
        { id: 'ligacao-tesouraria', label: 'Ligação à Tesouraria' },
        { id: 'sugestao-provisoes', label: 'Sugestão para provisões' },
        { id: 'calculo-comissoes', label: 'Cálculo de comissões' },
        { id: 'ligacao-contas', label: 'Ligação às Contas Correntes' },
        { id: 'ligacao-stocks', label: 'Ligação aos stocks' },
        { id: 'gestao-limite', label: 'Gestão de limite de crédito' },
        { id: 'ultrapassa-qtd', label: 'Ultrapassa quantidade:', hasInput: true },
        { id: 'sujeito-recapitulativos', label: 'Sujeito a recapitulativos' },
        { id: 'sujeito-conversao', label: 'Sujeito a conversão' },
        { id: 'segura-controlo', label: 'Segura controlo de qtd. satisfeita na cópia e transformação' },
        { id: 'recolha-identificacao', label: 'Recolha do n.º de identificação da DE' },
        { id: 'permite-linhas-neg', label: 'Permite Linhas Negativas' },
        { id: 'permite-docs-neg', label: 'Permite Documentos Negativos', indent: true },
        { id: 'deduz-liquida', label: 'Deduz ou Liquida IVA no recebimento/liquidação' },
        { id: 'doc-nao-valorizado', label: 'Documento não Valorizado' }
    ];

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm(selectedType);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#ECE9D8] border-2 border-gray-400 shadow-2xl w-[800px] max-h-[90vh] flex flex-col">
                {/* Title Bar */}
                <div className="bg-gradient-to-r from-[#0A4DAA] to-[#3A7FD5] text-white px-2 py-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">description</span>
                        <span className="text-sm font-semibold">Documento de Venda</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="hover:bg-red-600 w-5 h-5 flex items-center justify-center text-white font-bold text-lg leading-none"
                    >
                        ×
                    </button>
                </div>

                {/* Toolbar */}
                <div className="bg-[#ECE9D8] border-b border-gray-400 px-2 py-1 flex items-center gap-1">
                    {[
                        { icon: 'save', label: 'Gravar' },
                        { icon: 'add_circle', label: 'Novo' },
                        { icon: 'block', label: 'Anular' },
                        { icon: 'list', label: 'Listas' },
                        { icon: 'settings', label: 'Contexto' },
                        { icon: 'help_outline', label: 'Ajuda' },
                        { icon: 'close', label: 'Cancelar' }
                    ].map((item, idx) => (
                        <React.Fragment key={idx}>
                            <button className="flex flex-col items-center gap-0.5 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-400 rounded-sm text-[10px]">
                                <span className="material-symbols-outlined text-[20px] text-gray-700">{item.icon}</span>
                                <span className="text-gray-700">{item.label}</span>
                            </button>
                            {(idx === 1 || idx === 3 || idx === 4) && <div className="w-px h-8 bg-gray-400 mx-1"></div>}
                        </React.Fragment>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-3 bg-[#ECE9D8]">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Left Column */}
                        <div className="space-y-3">
                            {/* Document Type */}
                            <div className="bg-white border border-gray-400 p-2">
                                <label className="text-xs font-semibold text-gray-700 mb-1 block">Tipo Doc.:</label>
                                <select
                                    className="w-full border border-gray-400 px-1 py-1 text-xs focus:outline-none focus:border-blue-500"
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value)}
                                >
                                    {documentTypes.map((type, idx) => (
                                        <option key={idx} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Permitted Document */}
                            <div className="bg-white border border-gray-400 p-2">
                                <label className="text-xs text-gray-700 mb-1 block">Documento permitido a:</label>
                                <div className="space-y-1">
                                    <label className="flex items-center gap-2 text-xs">
                                        <input
                                            type="radio"
                                            name="docPermitido"
                                            checked={isReceberChecked}
                                            onChange={() => {
                                                setIsReceberChecked(true);
                                                setIsPagarChecked(false);
                                            }}
                                            className="w-3 h-3"
                                        />
                                        <span>Documento a Receber</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-xs">
                                        <input
                                            type="radio"
                                            name="docPermitido"
                                            checked={isPagarChecked}
                                            onChange={() => {
                                                setIsReceberChecked(false);
                                                setIsPagarChecked(true);
                                            }}
                                            className="w-3 h-3"
                                        />
                                        <span>Documento a Pagar</span>
                                    </label>
                                </div>
                            </div>

                            {/* Characteristics */}
                            <div className="bg-white border border-gray-400 p-2">
                                <label className="text-xs font-semibold text-gray-700 mb-2 block">Características</label>
                                <div className="space-y-1">
                                    <label className="flex items-center gap-2 text-xs">
                                        <input type="radio" name="caracteristica" className="w-3 h-3" defaultChecked />
                                        <span>Documento a Receber</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-xs">
                                        <input type="radio" name="caracteristica" className="w-3 h-3" />
                                        <span>Documento a Pagar</span>
                                    </label>
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                    <label className="text-xs">Valor limite:</label>
                                    <input
                                        type="text"
                                        className="border border-gray-400 px-1 py-0.5 text-xs w-20 text-right"
                                        value={valorLimite}
                                        onChange={(e) => setValorLimite(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* External/Credit Documents */}
                            <div className="bg-white border border-gray-400 p-2">
                                <label className="flex items-center gap-2 text-xs mb-2">
                                    <input
                                        type="checkbox"
                                        checked={permiteDocs}
                                        onChange={(e) => setPermiteDocs(e.target.checked)}
                                        className="w-3 h-3"
                                    />
                                    <span>Permite Documentos Externo/Crédito</span>
                                </label>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs w-24">Doc. Externo:</label>
                                        <select className="flex-1 border border-gray-400 px-1 py-0.5 text-xs bg-gray-100" disabled={!permiteDocs}>
                                            <option></option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs w-24">Série Externo:</label>
                                        <select className="flex-1 border border-gray-400 px-1 py-0.5 text-xs bg-gray-100" disabled={!permiteDocs}>
                                            <option></option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Fiscal Designation */}
                            <div className="bg-white border border-gray-400 p-2">
                                <label className="text-xs font-semibold text-gray-700 mb-1 block">Designação Fiscal - Impressão</label>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs w-24">Designação:</label>
                                        <input type="text" className="flex-1 border border-gray-400 px-1 py-0.5 text-xs" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Options */}
                        <div className="bg-white border border-gray-400 p-2">
                            <label className="text-xs font-semibold text-gray-700 mb-2 block">Opções</label>
                            <div className="space-y-1 max-h-[500px] overflow-y-auto">
                                {options.map((option) => (
                                    <label
                                        key={option.id}
                                        className={`flex items-center gap-2 text-xs ${option.indent ? 'ml-4' : ''}`}
                                    >
                                        <input type="checkbox" className="w-3 h-3" />
                                        <span className={option.label.includes('Ultrapassa') ? 'text-gray-700' : ''}>{option.label}</span>
                                        {option.hasInput && (
                                            <input
                                                type="text"
                                                className="border border-gray-400 px-1 py-0.5 text-xs w-16 ml-auto"
                                                placeholder="Avisar"
                                            />
                                        )}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Buttons */}
                <div className="bg-[#ECE9D8] border-t border-gray-400 px-3 py-2 flex justify-end gap-2">
                    <button
                        onClick={handleConfirm}
                        className="px-4 py-1 bg-[#E0E0E0] border border-gray-400 hover:bg-gray-200 text-xs font-semibold rounded-sm shadow-sm"
                    >
                        OK
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-1 bg-[#E0E0E0] border border-gray-400 hover:bg-gray-200 text-xs font-semibold rounded-sm shadow-sm"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};
