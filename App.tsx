import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Appointment, ModalInfo, Client } from './types';
import Header from './components/Header';
import AppointmentForm from './components/AppointmentForm';
import AppointmentList from './components/AppointmentList';
import Modal from './components/Modal';
import RevenueDashboard from './components/RevenueDashboard';
import ClientList from './components/ClientList';

const APP_STORAGE_KEY = 'spacoDelasAppointments';

const App: React.FC = () => {
    const [appointments, setAppointments] = useState<Appointment[]>(() => {
        try {
            const savedAppointments = localStorage.getItem(APP_STORAGE_KEY);
            if (savedAppointments) {
                const parsedAppointments = JSON.parse(savedAppointments) as (Omit<Appointment, 'datetime'> & { datetime: string })[];
                return parsedAppointments.map(appt => ({
                    ...appt,
                    datetime: new Date(appt.datetime),
                }));
            }
        } catch (error) {
            console.error("Failed to load appointments from local storage", error);
        }
        return [];
    });
    
    const [modalInfo, setModalInfo] = useState<ModalInfo>({
        isOpen: false,
        title: '',
        message: '',
    });

    const [activeView, setActiveView] = useState<'appointments' | 'clients'>('appointments');

    useEffect(() => {
        try {
            localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(appointments));
        } catch (error) {
            console.error("Failed to save appointments to local storage", error);
        }
    }, [appointments]);

    const showModal = (title: string, message: string) => {
        setModalInfo({ isOpen: true, title, message });
    };

    const closeModal = () => {
        setModalInfo({ isOpen: false, title: '', message: '' });
    };

    const handleScheduleAppointment = useCallback((newAppointmentData: Omit<Appointment, 'id' | 'status'>) => {
        if (newAppointmentData.datetime < new Date()) {
            showModal("Erro", "Não é possível agendar um horário no passado.");
            return;
        }

        const newAppointment: Appointment = {
            ...newAppointmentData,
            id: Date.now(),
            status: 'scheduled',
        };

        setAppointments(prevAppointments => {
            const updatedAppointments = [...prevAppointments, newAppointment];
            updatedAppointments.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
            return updatedAppointments;
        });
        
        showModal(
            "Sucesso",
            `Agendamento para ${newAppointment.service} para a cliente ${newAppointment.clientName} marcado para ${newAppointment.datetime.toLocaleString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' })}.`
        );
        
        const sanitizedClientPhone = newAppointment.clientPhone.replace(/\D/g, '');
        let fullPhoneNumberForApi = sanitizedClientPhone;

        if (!fullPhoneNumberForApi.startsWith('55')) {
            fullPhoneNumberForApi = `55${fullPhoneNumberForApi}`;
        }

        const clientMessage = `Olá, ${newAppointment.clientName}! ✨\n\nSeu agendamento no salão foi confirmado com sucesso!\n\n*Serviço:* ${newAppointment.service}\n*Valor:* R$ ${newAppointment.value.toFixed(2)}\n*Data:* ${newAppointment.datetime.toLocaleDateString('pt-BR')}\n*Hora:* ${newAppointment.datetime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n\nMal podemos esperar para te ver! 🌸`;
        const encodedClientMessage = encodeURIComponent(clientMessage);
        const clientWhatsappUrl = `https://wa.me/${fullPhoneNumberForApi}?text=${encodedClientMessage}`;
        window.open(clientWhatsappUrl, '_blank');

    }, []);

    const handleCancelAppointment = useCallback((appointmentId: number) => {
        const appointmentToCancel = appointments.find(appt => appt.id === appointmentId);
        if (appointmentToCancel) {
            setAppointments(prev => prev.filter(appt => appt.id !== appointmentId));
            showModal(
                "Cancelado",
                `O agendamento para ${appointmentToCancel.service} de ${appointmentToCancel.clientName} foi cancelado.`
            );
        }
    }, [appointments]);

    const handleCompleteAppointment = useCallback((appointmentId: number) => {
        setAppointments(prev => 
            prev.map(appt => 
                appt.id === appointmentId ? { ...appt, status: 'completed' } : appt
            )
        );
        const completedAppt = appointments.find(a => a.id === appointmentId);
        if(completedAppt) {
            showModal("Finalizado", `O agendamento de ${completedAppt.service} para ${completedAppt.clientName} foi marcado como finalizado.`);
        }
    }, [appointments]);

    const upcomingAppointments = useMemo(() => {
        return appointments.filter(appt => appt.status === 'scheduled');
    }, [appointments]);

    const projectedRevenue = useMemo(() => {
        return upcomingAppointments.reduce((total, appt) => total + appt.value, 0);
    }, [upcomingAppointments]);

    const monthlyRevenue = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return appointments.reduce((total, appt) => {
            if (
                appt.status === 'completed' &&
                appt.datetime.getMonth() === currentMonth &&
                appt.datetime.getFullYear() === currentYear
            ) {
                return total + appt.value;
            }
            return total;
        }, 0);
    }, [appointments]);

    const clients = useMemo(() => {
        const clientData: { [phone: string]: { name: string; totalSpent: number; lastVisit: Date | null } } = {};

        appointments.forEach(appt => {
            if (!clientData[appt.clientPhone]) {
                clientData[appt.clientPhone] = {
                    name: appt.clientName,
                    totalSpent: 0,
                    lastVisit: null
                };
            }
            clientData[appt.clientPhone].name = appt.clientName;

            if (appt.status === 'completed') {
                clientData[appt.clientPhone].totalSpent += appt.value;
                const currentLastVisit = clientData[appt.clientPhone].lastVisit;
                if (!currentLastVisit || appt.datetime > currentLastVisit) {
                    clientData[appt.clientPhone].lastVisit = appt.datetime;
                }
            }
        });

        const clientList: Client[] = Object.entries(clientData).map(([phone, data]) => {
            let daysSinceLastVisit: number | null = null;
            if (data.lastVisit) {
                const diffTime = Math.abs(new Date().getTime() - data.lastVisit.getTime());
                daysSinceLastVisit = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }
            return {
                phone,
                name: data.name,
                totalSpent: data.totalSpent,
                daysSinceLastVisit,
            };
        });

        clientList.sort((a, b) => a.name.localeCompare(b.name));
        return clientList;
    }, [appointments]);

    const TabButton: React.FC<{ label: string; viewName: 'appointments' | 'clients' }> = ({ label, viewName }) => (
        <button
            onClick={() => setActiveView(viewName)}
            className={`px-6 py-3 text-lg font-bold rounded-t-lg transition-colors duration-300 focus:outline-none ${
                activeView === viewName
                    ? 'bg-white/80 text-pink-600 shadow-inner'
                    : 'bg-transparent text-pink-800 hover:bg-white/40'
            }`}
        >
            {label}
        </button>
    );

    const sparkleSvg = `<svg width="20" height="20" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 0 L55.9 44.1 L100 50 L55.9 55.9 L50 100 L44.1 55.9 L0 50 L44.1 44.1 Z" fill="rgba(236, 72, 153, 0.08)" /></svg>`;
    const bgStyle = { backgroundImage: `url('data:image/svg+xml;base64,${btoa(sparkleSvg)}')` };


    return (
        <div className="min-h-screen bg-pink-50 text-pink-900 font-sans p-4 sm:p-6 md:p-8" style={bgStyle}>
            <div className="max-w-7xl mx-auto">
                <Header />
                
                <div className="mt-8 flex justify-center border-b-2 border-pink-200">
                    <TabButton label="Agendamentos" viewName="appointments" />
                    <TabButton label="Clientes" viewName="clients" />
                </div>

                <main className="mt-2">
                    {activeView === 'appointments' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
                            <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-pink-100">
                                <AppointmentForm onSchedule={handleScheduleAppointment} />
                            </div>
                            <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-pink-100">
                                <AppointmentList 
                                    appointments={upcomingAppointments} 
                                    onCancel={handleCancelAppointment}
                                    onComplete={handleCompleteAppointment}
                                />
                            </div>
                            <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-pink-100">
                                <RevenueDashboard
                                    projectedRevenue={projectedRevenue}
                                    monthlyRevenue={monthlyRevenue}
                                />
                            </div>
                        </div>
                    )}
                     {activeView === 'clients' && (
                        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-pink-100 mt-6">
                            <ClientList clients={clients} />
                        </div>
                    )}
                </main>
            </div>
            <Modal
                isOpen={modalInfo.isOpen}
                title={modalInfo.title}
                message={modalInfo.message}
                onClose={closeModal}
            />
        </div>
    );
};

export default App;