import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const DriverDeliveryScreen = () => {
    return (
        <SafeAreaView style={styles.container}>
            {/* Map Placeholder */}
            <View style={styles.mapContainer}>
                <View style={styles.mapGraphic}>
                    <Text style={styles.mapText}>Visualização do Mapa Logístico</Text>
                    <View style={styles.routeLine} />
                    <View style={[styles.marker, { top: '30%', left: '40%' }]} />
                    <View style={[styles.marker, { top: '60%', left: '70%', backgroundColor: '#00D1FF' }]} />
                </View>
            </View>

            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Próxima Entrega</Text>
                    <Text style={styles.customerName}>Revendedor Matola A</Text>
                </View>

                <View style={styles.inventoryRow}>
                    <View style={styles.invItem}><Text style={styles.invQty}>08</Text><Text style={styles.invLabel}>9KG</Text></View>
                    <View style={styles.invItem}><Text style={styles.invQty}>03</Text><Text style={styles.invLabel}>14KG</Text></View>
                    <View style={styles.invItem}><Text style={styles.invQty}>02</Text><Text style={styles.invLabel}>19KG</Text></View>
                </View>

                <TouchableOpacity style={styles.deliverBtn}>
                    <Text style={styles.deliverBtnText}>Confirmar Entrega</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0E1A' },
    mapContainer: { flex: 1, backgroundColor: '#111625', margin: 16, borderRadius: 24, overflow: 'hidden' },
    mapGraphic: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F121D' },
    mapText: { color: '#4A5568', fontSize: 14, fontWeight: '500' },
    routeLine: { position: 'absolute', width: 2, height: '50%', backgroundColor: 'rgba(0, 209, 255, 0.2)', transform: [{ rotate: '45deg' }] },
    marker: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: '#FF6B00', borderWidth: 2, borderColor: '#FFFFFF' },
    card: {
        backgroundColor: '#161B2E',
        margin: 20,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#2A3043',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10
    },
    cardHeader: { marginBottom: 20 },
    cardTitle: { fontSize: 14, color: '#A0A0A0', textTransform: 'uppercase', letterSpacing: 1 },
    customerName: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginTop: 4 },
    inventoryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, paddingHorizontal: 10 },
    invItem: { alignItems: 'center' },
    invQty: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF' },
    invLabel: { fontSize: 12, color: '#00D1FF', marginTop: 4, fontWeight: 'bold' },
    deliverBtn: {
        backgroundColor: '#0070F3',
        height: 65,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#0070F3',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8
    },
    deliverBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }
});
