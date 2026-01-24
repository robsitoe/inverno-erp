import React, { useState } from 'react';

interface DocumentListModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (docNumber: string) => void;
}

interface Document {
    numero: string;
    tipo: string;
    entidade: string;
    data: string;
    total: string;
    estado: string;
}

export const DocumentListModal: React.FC<DocumentListModalProps> = ({ isOpen, onClose, onSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

    // Sample documents - in a real app, this would come from an API
    const documents: Document[] = [
        { numero: 'FA 2025/001', tipo: 'Fatura', entidade: 'Cliente A', data: '21/11/2025', total: '1.250,00', estado: 'Fechado' },
        { numero: 'FA 2025/002', tipo: 'Fatura', entidade: 'Cliente B', data: '22/11/2025', total: '850,50', estado: 'Fechado' },
        { numero: 'FA 2025/003', tipo: 'Fatura', entidade: 'Cliente C', data: '23/11/2025', total: '2.100,00', estado: 'Aberto' },
        { numero: 'OR 2025/001', tipo: 'Orçamento', entidade: 'Cliente D', data: '20/11/2025', total: '3.500,00', estado: 'Pendente' },
        { numero: 'OR 2025/002', tipo: 'Orçamento', entidade: 'Cliente E', data: '21/11/2025', total: '1.800,00', estado: 'Aprovado' },
        { numero: 'EC 2025/001', tipo: 'Encomenda', entidade: 'Cliente F', data: '19/11/2025', total: '5.200,00', estado: 'Em Processamento' },
        { numero: 'EC 2025/002', tipo: 'Encomenda', entidade: 'Cliente G', data: '20/11/2025', total: '950,00', estado: 'Concluído' },
        { numero: 'FA 2025/004', tipo: 'Fatura', entidade: 'Cliente H', data: '24/11/2025', total: '1.450,00', estado: 'Aberto' },
        { numero: 'FA 2025/005', tipo: 'Fatura', entidade: 'Cliente I', data: '25/11/2025', total: '680,00', estado: 'Fechado' },
        { numero: 'OR 2025/003', tipo: 'Orçamento', entidade: 'Cliente J', data: '22/11/2025', total: '4.200,00', estado: 'Pendente' },
    ];

    const filteredDocuments = documents.filter(doc =>
        doc.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.tipo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.entidade.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    const handleSelect = () => {
        if (selectedDoc) {
            onSelect(selectedDoc);
            onClose();
        }
    };

    const handleDoubleClick = (docNumber: string) => {
        onSelect(docNumber);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#ECE9D8] border-2 border-gray-400 shadow-2xl w-[900px] max-h-[80vh] flex flex-col">
                {/* Title Bar */}
                <div className="bg-gradient-to-r from-[#0A4DAA] to-[#3A7FD5] text-white px-2 py-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">list_alt</span>
                        <span className="text-sm font-semibold">Lista de Documentos</span>
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
                        { icon: 'refresh', label: 'Atualizar' },
                        { icon: 'filter_list', label: 'Filtros' },
                        { icon: 'print', label: 'Imprimir' },
                        { icon: 'file_download', label: 'Exportar' },
                    ].map((item, idx) => (
                        <React.Fragment key={idx}>
                            <button className="flex flex-col items-center gap-0.5 px-2 py-1 hover:bg-gray-200 border border-transparent hover:border-gray-400 rounded-sm text-[10px]">
                                <span className="material-symbols-outlined text-[20px] text-gray-700">{item.icon}</span>
                                <span className="text-gray-700">{item.label}</span>
                            </button>
                            {idx === 1 && <div className="w-px h-8 bg-gray-400 mx-1"></div>}
                        </React.Fragment>
                    ))}
                </div>

                {/* Search Bar */}
                <div className="bg-[#ECE9D8] border-b border-gray-400 px-3 py-2">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-gray-700">Pesquisar:</label>
                        <div className="flex-1 flex items-center border border-gray-400 bg-white rounded-sm">
                            <span className="material-symbols-outlined text-gray-500 text-[18px] ml-1">search</span>
                            <input
                                type="text"
                                className="flex-1 px-2 py-1 text-xs focus:outline-none"
                                placeholder="Número, tipo ou entidade..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                </div>

                {/* Document List */}
                <div className="flex-1 overflow-auto bg-white m-2 border border-gray-400">
                    <table className="w-full border-collapse text-xs">
                        <thead className="bg-gradient-to-b from-[#E8E8E8] to-[#D4D4D4] sticky top-0 z-10">
                            <tr>
                                <th className="px-3 py-2 border-b-2 border-gray-400 text-left font-semibold text-gray-700">Número</th>
                                <th className="px-3 py-2 border-b-2 border-gray-400 text-left font-semibold text-gray-700">Tipo</th>
                                <th className="px-3 py-2 border-b-2 border-gray-400 text-left font-semibold text-gray-700">Entidade</th>
                                <th className="px-3 py-2 border-b-2 border-gray-400 text-left font-semibold text-gray-700">Data</th>
                                <th className="px-3 py-2 border-b-2 border-gray-400 text-right font-semibold text-gray-700">Total (MT)</th>
                                <th className="px-3 py-2 border-b-2 border-gray-400 text-center font-semibold text-gray-700">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDocuments.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-3 py-8 text-center text-gray-500 italic">
                                        Nenhum documento encontrado
                                    </td>
                                </tr>
                            ) : (
                                filteredDocuments.map((doc, idx) => (
                                    <tr
                                        key={idx}
                                        className={`cursor-pointer hover:bg-blue-100 ${selectedDoc === doc.numero ? 'bg-blue-200' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                            }`}
                                        onClick={() => setSelectedDoc(doc.numero)}
                                        onDoubleClick={() => handleDoubleClick(doc.numero)}
                                    >
                                        <td className="px-3 py-1.5 border-b border-gray-200 font-medium text-blue-600">{doc.numero}</td>
                                        <td className="px-3 py-1.5 border-b border-gray-200">{doc.tipo}</td>
                                        <td className="px-3 py-1.5 border-b border-gray-200">{doc.entidade}</td>
                                        <td className="px-3 py-1.5 border-b border-gray-200">{doc.data}</td>
                                        <td className="px-3 py-1.5 border-b border-gray-200 text-right font-mono">{doc.total}</td>
                                        <td className="px-3 py-1.5 border-b border-gray-200 text-center">
                                            <span className={`px-2 py-0.5 rounded-sm text-[10px] font-semibold ${doc.estado === 'Fechado' ? 'bg-green-100 text-green-700' :
                                                doc.estado === 'Aberto' ? 'bg-yellow-100 text-yellow-700' :
                                                    doc.estado === 'Aprovado' ? 'bg-blue-100 text-blue-700' :
                                                        doc.estado === 'Concluído' ? 'bg-green-100 text-green-700' :
                                                            'bg-gray-100 text-gray-700'
                                                }`}>
                                                {doc.estado}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Info */}
                <div className="bg-[#ECE9D8] border-t border-gray-400 px-3 py-1 text-xs text-gray-600">
                    Total de documentos: <span className="font-semibold">{filteredDocuments.length}</span>
                    {selectedDoc && <span className="ml-4">Selecionado: <span className="font-semibold text-blue-600">{selectedDoc}</span></span>}
                </div>

                {/* Bottom Buttons */}
                <div className="bg-[#ECE9D8] border-t border-gray-400 px-3 py-2 flex justify-end gap-2">
                    <button
                        onClick={handleSelect}
                        disabled={!selectedDoc}
                        className={`px-4 py-1 border border-gray-400 text-xs font-semibold rounded-sm shadow-sm ${selectedDoc
                            ? 'bg-[#E0E0E0] hover:bg-gray-200 cursor-pointer'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        Selecionar
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
