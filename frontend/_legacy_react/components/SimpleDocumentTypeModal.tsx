import React from 'react';

export const SALES_DOCUMENT_TYPES = [
    { code: "FA", description: "Fatura" },
    { code: "NC", description: "Nota de Crédito" },
    { code: "ND", description: "Nota de Débito" },
    { code: "GR", description: "Guia de Remessa" },
    { code: "GT", description: "Guia de Transporte" },
    { code: "EC", description: "Encomenda de Cliente" },
    { code: "PP", description: "Proforma" }
];

interface SimpleDocumentTypeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: { code: string; description: string }) => void;
}

export const SimpleDocumentTypeModal: React.FC<SimpleDocumentTypeModalProps> = ({ isOpen, onClose, onSelect }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-sm shadow-lg w-[400px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-sm font-medium text-gray-700">Tipos de Documento</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>

                {/* List */}
                <div className="overflow-y-auto p-1">
                    <table className="w-full text-xs">
                        <thead className="bg-gray-50 text-gray-600 font-medium">
                            <tr>
                                <th className="px-2 py-1 text-left border-b">Código</th>
                                <th className="px-2 py-1 text-left border-b">Descrição</th>
                            </tr>
                        </thead>
                        <tbody>
                            {SALES_DOCUMENT_TYPES.map((type) => (
                                <tr
                                    key={type.code}
                                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                                    onClick={() => {
                                        onSelect(type);
                                        onClose();
                                    }}
                                >
                                    <td className="px-2 py-1.5 border-b border-gray-100 font-medium text-blue-600">{type.code}</td>
                                    <td className="px-2 py-1.5 border-b border-gray-100 text-gray-700">{type.description}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 flex justify-end">
                    <button onClick={onClose} className="px-3 py-1 bg-white border border-gray-300 rounded-sm text-xs hover:bg-gray-50">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};
