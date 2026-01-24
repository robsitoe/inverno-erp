import React, { useState, useMemo } from 'react';
import { ENTITIES } from '../app/shared/constants';

interface EntityListModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (entity: any) => void;
}

export const EntityListModal: React.FC<EntityListModalProps> = ({ isOpen, onClose, onSelect }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredEntities = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();

        if (!query) return ENTITIES;

        return ENTITIES.filter(entity =>
            entity.name.toLowerCase().includes(query) ||
            entity.nif.toLowerCase().includes(query) ||
            entity.address.toLowerCase().includes(query)
        );
    }, [searchQuery]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-sm shadow-lg w-[700px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-sm font-medium text-gray-700">Lista de Entidades</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>

                {/* Search Bar */}
                <div className="px-3 py-2 border-b border-gray-200 bg-white">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Pesquisar por nome, NIF ou morada..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">search</span>
                    </div>
                </div>

                {/* List */}
                <div className="overflow-y-auto p-1 flex-1">
                    <table className="w-full text-xs">
                        <thead className="bg-gray-50 text-gray-600 font-medium sticky top-0">
                            <tr>
                                <th className="px-2 py-1 text-left border-b">Código</th>
                                <th className="px-2 py-1 text-left border-b">Nome</th>
                                <th className="px-2 py-1 text-left border-b">NIF</th>
                                <th className="px-2 py-1 text-left border-b">Morada</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEntities.map((entity) => (
                                <tr
                                    key={entity.code}
                                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                                    onClick={() => {
                                        onSelect(entity);
                                        onClose();
                                    }}
                                >
                                    <td className="px-2 py-1.5 border-b border-gray-100 font-medium text-blue-600">{entity.code}</td>
                                    <td className="px-2 py-1.5 border-b border-gray-100 text-gray-700">{entity.name}</td>
                                    <td className="px-2 py-1.5 border-b border-gray-100 text-gray-600">{entity.nif}</td>
                                    <td className="px-2 py-1.5 border-b border-gray-100 text-gray-500 truncate max-w-[200px]">{entity.address}</td>
                                </tr>
                            ))}
                            {filteredEntities.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-2 py-4 text-center text-gray-400 italic">
                                        Nenhuma entidade encontrada
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                    <span className="text-xs text-gray-500">{filteredEntities.length} entidade(s) encontrada(s)</span>
                    <button onClick={onClose} className="px-3 py-1 bg-white border border-gray-300 rounded-sm text-xs hover:bg-gray-50">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};
