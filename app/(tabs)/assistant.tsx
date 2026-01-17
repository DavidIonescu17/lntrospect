import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator, Modal, FlatList, ScrollView } from 'react-native';
import { auth, db } from '../../firebaseConfig'; 
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, addDoc, Timestamp } from 'firebase/firestore';
import { FontAwesome } from '@expo/vector-icons';
import CryptoJS from 'crypto-js';
import { getEncryptionKey } from '../utils/encryption'; 

export default function TherapyTab() {
    const [user, setUser] = useState<any>(null);
    const [psychologist, setPsychologist] = useState<any>(null);
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Shared Notes Modal State
    const [notesModalVisible, setNotesModalVisible] = useState(false);
    const [sharedNotes, setSharedNotes] = useState<any[]>([]);
    const [loadingNotes, setLoadingNotes] = useState(false);
    
    // Appointments Modal State
    const [appointmentsModalVisible, setAppointmentsModalVisible] = useState(false);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loadingAppointments, setLoadingAppointments] = useState(false);
    const [requestModalVisible, setRequestModalVisible] = useState(false);
    const [requestDate, setRequestDate] = useState('');
    const [requestTime, setRequestTime] = useState('');
    const [requestNotes, setRequestNotes] = useState('');
    
    useEffect(() => {
        const fetchData = async () => {
            if (!auth.currentUser) return;
            const userRef = doc(db, 'users', auth.currentUser.uid);
            const snap = await getDoc(userRef);
            if (snap.exists()) {
                const data = snap.data();
                setUser(data);
                if (data.psychologistId) {
                    const docRef = doc(db, 'users', data.psychologistId);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) setPsychologist(docSnap.data());
                }
            }
        };
        fetchData();
        
        // Set up appointment reminders check
        checkAppointmentReminders();
        const reminderInterval = setInterval(checkAppointmentReminders, 60000); // Check every minute
        
        return () => clearInterval(reminderInterval);
    }, []);

    const checkAppointmentReminders = async () => {
        if (!auth.currentUser || !user?.psychologistId) return;
        
        try {
            const now = new Date();
            const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
            
            const q = query(
                collection(db, 'appointments'),
                where('clientId', '==', auth.currentUser.uid),
                where('status', '==', 'confirmed')
            );
            
            const snapshot = await getDocs(q);
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const appointmentTime = data.scheduledTime.toDate();
                
                // Check if appointment is in 24 hours (with 5-minute window)
                if (Math.abs(appointmentTime.getTime() - in24Hours.getTime()) < 5 * 60 * 1000) {
                    Alert.alert(
                        'Appointment Reminder',
                        `You have an appointment in 24 hours with ${psychologist?.fullName || 'your psychologist'}`,
                        [{ text: 'OK' }]
                    );
                }
                
                // Check if appointment is in 1 hour (with 5-minute window)
                if (Math.abs(appointmentTime.getTime() - in1Hour.getTime()) < 5 * 60 * 1000) {
                    Alert.alert(
                        'Appointment Starting Soon',
                        `Your appointment with ${psychologist?.fullName || 'your psychologist'} starts in 1 hour`,
                        [{ text: 'OK' }]
                    );
                }
            });
        } catch (error) {
            console.error('Error checking reminders:', error);
        }
    };

    const handleConnect = async () => {
        if (code.length < 5) return Alert.alert("Error", "Enter a valid code.");
        setLoading(true);
        try {
            const q = query(collection(db, 'users'), where('pairingCode', '==', code.toUpperCase().trim()));
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                Alert.alert("Invalid Code", "No psychologist found.");
                setLoading(false);
                return;
            }
            const docUser = snapshot.docs[0];
            const docData = docUser.data();
            await updateDoc(doc(db, 'users', auth.currentUser!.uid), { psychologistId: docUser.id });
            setPsychologist(docData);
            Alert.alert("Connected!", `You are now linked to ${docData.fullName}`);
        } catch (err) {
            Alert.alert("Error", "Connection failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        Alert.alert("Disconnect", "Are you sure?", [
            { text: "Cancel" },
            { text: "Yes", onPress: async () => {
                await updateDoc(doc(db, 'users', auth.currentUser!.uid), { psychologistId: null });
                setPsychologist(null);
            }}
        ]);
    };

    const handleOpenSharedNotes = async () => {
        setNotesModalVisible(true);
        setLoadingNotes(true);
        try {
            const key = await getEncryptionKey(); 
            
            const q = query(
                collection(db, 'journal_entries'),
                where('userId', '==', auth.currentUser!.uid),
                where('isShared', '==', true), 
                orderBy('createdAt', 'desc') 
            );

            const snapshot = await getDocs(q);
            const notes = snapshot.docs.map(doc => {
                const data = doc.data();
                let displayText = data.sharedText; 

                if (!displayText && data.encryptedContent && key) {
                     try {
                        const bytes = CryptoJS.AES.decrypt(data.encryptedContent, key);
                        const decrypted = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
                        displayText = decrypted.text;
                     } catch (e) { displayText = "Error decrypting"; }
                }

                let dateDisplay = 'Unknown Date';
                if (data.date) {
                    dateDisplay = new Date(data.date).toLocaleDateString();
                } else if (data.createdAt?.toDate) {
                    dateDisplay = data.createdAt.toDate().toLocaleDateString();
                }

                return {
                    id: doc.id,
                    ...data,
                    text: displayText,
                    date: dateDisplay
                };
            });
            setSharedNotes(notes);
        } catch (error: any) {
            console.log("Error details:", error);
            if (error.message.includes('index')) {
                Alert.alert("System Error", "Database index required. Check console.");
            } else {
                Alert.alert("Error", "Could not fetch shared notes");
            }
        } finally {
            setLoadingNotes(false);
        }
    };

    const handleOpenAppointments = async () => {
        setAppointmentsModalVisible(true);
        setLoadingAppointments(true);
        try {
            const q = query(
                collection(db, 'appointments'),
                where('clientId', '==', auth.currentUser!.uid),
                orderBy('scheduledTime', 'desc')
            );
            
            const snapshot = await getDocs(q);
            const appts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                scheduledTime: doc.data().scheduledTime.toDate()
            }));
            setAppointments(appts);
        } catch (error) {
            Alert.alert("Error", "Could not load appointments");
        } finally {
            setLoadingAppointments(false);
        }
    };

    const handleRequestAppointment = async () => {
        if (!requestDate || !requestTime) {
            Alert.alert("Error", "Please enter both date and time");
            return;
        }

        try {
            const scheduledTime = new Date(`${requestDate}T${requestTime}`);
            
            await addDoc(collection(db, 'appointments'), {
                clientId: auth.currentUser!.uid,
                psychologistId: user.psychologistId,
                scheduledTime: Timestamp.fromDate(scheduledTime),
                status: 'pending',
                clientNotes: requestNotes,
                createdAt: Timestamp.now()
            });

            Alert.alert("Success", "Appointment request sent! Your psychologist will confirm.");
            setRequestModalVisible(false);
            setRequestDate('');
            setRequestTime('');
            setRequestNotes('');
            handleOpenAppointments();
        } catch (error) {
            Alert.alert("Error", "Failed to request appointment");
        }
    };

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'confirmed': return '#48BB78';
            case 'pending': return '#ECC94B';
            case 'cancelled': return '#F56565';
            default: return '#A0AEC0';
        }
    };

    const getStatusIcon = (status: string) => {
        switch(status) {
            case 'confirmed': return 'check-circle';
            case 'pending': return 'clock-o';
            case 'cancelled': return 'times-circle';
            default: return 'question-circle';
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.header}>My Therapy</Text>

            {psychologist ? (
                <View style={styles.card}>
                    <View style={styles.doctorHeader}>
                        <View style={styles.iconBox}>
                            <FontAwesome name="user-md" size={32} color="#6B4EFF" />
                        </View>
                        <View>
                            <Text style={styles.docLabel}>Your Psychologist</Text>
                            <Text style={styles.docName}>{psychologist.fullName || "Dr. Unknown"}</Text>
                        </View>
                    </View>
                    
                    <View style={styles.divider} />
                    
                    <TouchableOpacity style={styles.actionRow} onPress={handleOpenAppointments}>
                        <FontAwesome name="calendar" size={20} color="#4A5568" />
                        <Text style={styles.actionText}>View Appointments</Text>
                        <FontAwesome name="chevron-right" size={14} color="#CBD5E0" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionRow} onPress={handleOpenSharedNotes}>
                        <FontAwesome name="file-text-o" size={20} color="#4A5568" />
                        <Text style={styles.actionText}>Shared Notes</Text>
                        <FontAwesome name="chevron-right" size={14} color="#CBD5E0" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleDisconnect} style={styles.disconnectBtn}>
                        <Text style={styles.disconnectText}>Disconnect</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.centerContent}>
                    <FontAwesome name="link" size={60} color="#E2E8F0" />
                    <Text style={styles.title}>Connect with your Doctor</Text>
                    <Text style={styles.subtitle}>
                        Enter the pairing code provided by your psychologist to start sharing data.
                    </Text>

                    <TextInput 
                        style={styles.input} 
                        placeholder="e.g. DAN-8821" 
                        placeholderTextColor="#A0AEC0"
                        value={code}
                        onChangeText={setCode}
                        autoCapitalize="characters"
                    />

                    <TouchableOpacity style={styles.button} onPress={handleConnect} disabled={loading}>
                        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Connect Account</Text>}
                    </TouchableOpacity>
                </View>
            )}

            {/* Shared Notes Modal */}
            <Modal visible={notesModalVisible} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={{ flex: 1, backgroundColor: '#F7FAFC' }}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Notes Shared with Doctor</Text>
                        <TouchableOpacity onPress={() => setNotesModalVisible(false)}>
                            <FontAwesome name="close" size={24} color="#2D3748" />
                        </TouchableOpacity>
                    </View>

                    {loadingNotes ? (
                        <ActivityIndicator size="large" color="#6B4EFF" style={{ marginTop: 50 }} />
                    ) : (
                        <FlatList
                            data={sharedNotes}
                            contentContainerStyle={{ padding: 20 }}
                            keyExtractor={item => item.id}
                            ListEmptyComponent={
                                <View style={{ alignItems: 'center', marginTop: 50 }}>
                                    <FontAwesome name="folder-open-o" size={40} color="#CBD5E0" />
                                    <Text style={styles.emptyText}>You haven't shared any notes yet.</Text>
                                    <Text style={styles.emptySubText}>Go to your Journal to share entries.</Text>
                                </View>
                            }
                            renderItem={({ item }) => (
                                <View style={styles.noteCard}>
                                    <View style={styles.noteHeader}>
                                        <Text style={styles.noteDate}>{item.date}</Text>
                                        <View style={styles.sharedBadge}>
                                            <FontAwesome name="eye" size={12} color="white" />
                                            <Text style={styles.sharedBadgeText}>Shared</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.noteText} numberOfLines={3}>{item.text}</Text>
                                </View>
                            )}
                        />
                    )}
                </SafeAreaView>
            </Modal>

            {/* Appointments Modal */}
            <Modal visible={appointmentsModalVisible} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={{ flex: 1, backgroundColor: '#F7FAFC' }}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>My Appointments</Text>
                        <TouchableOpacity onPress={() => setAppointmentsModalVisible(false)}>
                            <FontAwesome name="close" size={24} color="#2D3748" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity 
                        style={styles.requestButton}
                        onPress={() => setRequestModalVisible(true)}
                    >
                        <FontAwesome name="plus" size={16} color="white" />
                        <Text style={styles.requestButtonText}>Request New Appointment</Text>
                    </TouchableOpacity>

                    {loadingAppointments ? (
                        <ActivityIndicator size="large" color="#6B4EFF" style={{ marginTop: 50 }} />
                    ) : (
                        <FlatList
                            data={appointments}
                            contentContainerStyle={{ padding: 20 }}
                            keyExtractor={item => item.id}
                            ListEmptyComponent={
                                <View style={{ alignItems: 'center', marginTop: 50 }}>
                                    <FontAwesome name="calendar-o" size={40} color="#CBD5E0" />
                                    <Text style={styles.emptyText}>No appointments yet.</Text>
                                </View>
                            }
                            renderItem={({ item }) => (
                                <View style={styles.appointmentCard}>
                                    <View style={styles.appointmentHeader}>
                                        <View>
                                            <Text style={styles.appointmentDate}>
                                                {item.scheduledTime.toLocaleDateString('en-US', { 
                                                    weekday: 'long', 
                                                    month: 'long', 
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </Text>
                                            <Text style={styles.appointmentTime}>
                                                {item.scheduledTime.toLocaleTimeString('en-US', { 
                                                    hour: '2-digit', 
                                                    minute: '2-digit' 
                                                })}
                                            </Text>
                                        </View>
                                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                                            <FontAwesome name={getStatusIcon(item.status)} size={12} color="white" />
                                            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                                        </View>
                                    </View>
                                    {item.clientNotes && (
                                        <Text style={styles.appointmentNotes}>Note: {item.clientNotes}</Text>
                                    )}
                                </View>
                            )}
                        />
                    )}
                </SafeAreaView>
            </Modal>

            {/* Request Appointment Modal */}
            <Modal visible={requestModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Request Appointment</Text>
                        
                        <Text style={styles.inputLabel}>Preferred Date</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="YYYY-MM-DD"
                            value={requestDate}
                            onChangeText={setRequestDate}
                        />
                        
                        <Text style={styles.inputLabel}>Preferred Time</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="HH:MM (24-hour format)"
                            value={requestTime}
                            onChangeText={setRequestTime}
                        />
                        
                        <Text style={styles.inputLabel}>Notes (Optional)</Text>
                        <TextInput
                            style={[styles.modalInput, { height: 80 }]}
                            placeholder="Any specific concerns or topics..."
                            value={requestNotes}
                            onChangeText={setRequestNotes}
                            multiline
                        />

                        <TouchableOpacity style={styles.submitButton} onPress={handleRequestAppointment}>
                            <Text style={styles.submitButtonText}>Send Request</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.cancelModalButton} 
                            onPress={() => setRequestModalVisible(false)}
                        >
                            <Text style={styles.cancelModalText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7FAFC', padding: 20 },
    header: { fontSize: 28, fontWeight: 'bold', color: '#2D3748', marginBottom: 20 },
    card: { backgroundColor: 'white', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    doctorHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    iconBox: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F3F0FF', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    docLabel: { fontSize: 12, color: '#718096', textTransform: 'uppercase', letterSpacing: 1 },
    docName: { fontSize: 20, fontWeight: 'bold', color: '#2D3748' },
    divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 10 },
    actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F7FAFC' },
    actionText: { flex: 1, marginLeft: 15, fontSize: 16, color: '#4A5568' },
    disconnectBtn: { marginTop: 20, alignItems: 'center', padding: 10 },
    disconnectText: { color: '#E53E3E', fontWeight: 'bold' },
    centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: -50 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#2D3748', marginTop: 20 },
    subtitle: { textAlign: 'center', color: '#718096', marginVertical: 10, paddingHorizontal: 20 },
    input: { width: '100%', backgroundColor: 'white', height: 56, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 20, fontSize: 18, marginTop: 20, textAlign: 'center' },
    button: { width: '100%', backgroundColor: '#6B4EFF', height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 15 },
    btnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: '#E2E8F0', backgroundColor: 'white' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2D3748' },
    emptyText: { fontSize: 16, color: '#718096', fontWeight: '600', marginTop: 20 },
    emptySubText: { fontSize: 14, color: '#A0AEC0', marginTop: 5 },
    noteCard: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    noteDate: { fontSize: 14, color: '#718096', fontWeight: '600' },
    sharedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#6B4EFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
    sharedBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    noteText: { fontSize: 16, color: '#2D3748', lineHeight: 22 },
    requestButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#6B4EFF', margin: 20, padding: 15, borderRadius: 12, gap: 8 },
    requestButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    appointmentCard: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    appointmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    appointmentDate: { fontSize: 16, color: '#2D3748', fontWeight: 'bold' },
    appointmentTime: { fontSize: 14, color: '#718096', marginTop: 4 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 4 },
    statusText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
    appointmentNotes: { fontSize: 14, color: '#4A5568', marginTop: 8, fontStyle: 'italic' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 25 },
    inputLabel: { fontSize: 14, color: '#4A5568', fontWeight: '600', marginTop: 15, marginBottom: 5 },
    modalInput: { backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 15, fontSize: 16 },
    submitButton: { backgroundColor: '#6B4EFF', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 },
    submitButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    cancelModalButton: { padding: 15, alignItems: 'center', marginTop: 10 },
    cancelModalText: { color: '#718096' },
});