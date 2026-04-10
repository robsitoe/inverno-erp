import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';

const cylinderTypes = [
    { id: '9kg', name: '9KG', price: '950.00 MT' },
    { id: '14kg', name: '14KG', price: '1,450.00 MT' },
    { id: '19kg', name: '19KG', price: '1,950.00 MT' },
];

export const ResellerOrderScreen = () => {
    const [order, setOrder] = useState<{ [key: string]: number }>({});

    const updateOrder = (id: string, delta: number) => {
        setOrder(prev => ({
            ...prev,
            [id]: Math.max(0, (prev[id] || 0) + delta)
        }));
    };

    const totalCylinders = Object.values(order).reduce((acc, qty) => acc + qty, 0);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Nova Encomenda</Text>
                <Text style={styles.subtitle}>Selecione as garrafas para encomendar</Text>
            </View>

            <ScrollView style={styles.scroll}>
                {cylinderTypes.map(type => (
                    <View key={type.id} style={styles.card}>
                        <View>
                            <Text style={styles.typeName}>{type.name}</Text>
                            <Text style={styles.typePrice}>{type.price}</Text>
                        </View>
                        <View style={styles.controls}>
                            <TouchableOpacity onPress={() => updateOrder(type.id, -1)} style={styles.btnSmall}>
                                <Text style={styles.btnText}>-</Text>
                            </TouchableOpacity>
                            <Text style={styles.qtyText}>{order[type.id] || 0}</Text>
                            <TouchableOpacity onPress={() => updateOrder(type.id, 1)} style={styles.btnSmall}>
                                <Text style={styles.btnText}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total Botijas:</Text>
                    <Text style={styles.totalValue}>{totalCylinders}</Text>
                </View>
                <TouchableOpacity style={styles.mainBtn} disabled={totalCylinders === 0}>
                    <Text style={styles.mainBtnText}>Confirmar Encomenda</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0E1A' },
    header: { padding: 24, paddingBottom: 12 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF' },
    subtitle: { fontSize: 16, color: '#A0A0A0', marginTop: 4 },
    scroll: { padding: 20 },
    card: {
        backgroundColor: '#161B2E',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#2A3043'
    },
    typeName: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
    typePrice: { fontSize: 14, color: '#00D1FF', marginTop: 4 },
    controls: { flexDirection: 'row', alignItems: 'center' },
    btnSmall: {
        width: 40, height: 40,
        backgroundColor: '#2A3043',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center'
    },
    btnText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
    qtyText: { color: '#FFFFFF', fontSize: 22, marginHorizontal: 20, fontWeight: 'bold', minWidth: 30, textAlign: 'center' },
    footer: { padding: 24, borderTopWidth: 1, borderTopColor: '#2A3043' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    totalLabel: { fontSize: 18, color: '#A0A0A0' },
    totalValue: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
    mainBtn: {
        backgroundColor: '#0070F3',
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center'
    },
    mainBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }
});
