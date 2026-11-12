import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Clock,
  Phone,
  MapPin,
  Trash2,
  Edit2,
  CalendarCheck,
} from 'lucide-react';
import { useAppStore } from '../../context/AppContext';
import { AppPanel, Modal, PageHeading, SectionHeading } from '../common/UIComponents';
import { Contact } from '../../types';

export const AppointmentsScreen: React.FC = () => {
  const store = useAppStore();
  const [showModal, setShowModal] = useState(false);
  const [selectedContactRef, setSelectedContactRef] = useState(store.contacts[0]?.reference || '');
  const [appointmentDateTime, setAppointmentDateTime] = useState('');
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentDateTime.trim()) return;

    const ref = editingContact ? editingContact.reference : selectedContactRef;
    store.saveAppointment(ref, appointmentDateTime.trim());

    setShowModal(false);
    setEditingContact(null);
    setAppointmentDateTime('');
  };

  const handleOpenEdit = (contact: Contact) => {
    setEditingContact(contact);
    setAppointmentDateTime(contact.appointment || '');
    setShowModal(true);
  };

  const handleOpenNew = () => {
    setEditingContact(null);
    setAppointmentDateTime('');
    setShowModal(true);
  };

  return (
    <div className="p-4 sm:p-7 max-w-7xl mx-auto space-y-6">
      <PageHeading
        eyebrow="Agenda · Relations clients"
        title="Rendez-vous"
        action={
          <button
            onClick={handleOpenNew}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#D39725] hover:bg-[#c2871b] text-white text-xs font-bold cursor-pointer shadow-xs"
          >
            <Plus size={16} />
            <span>Nouveau RDV</span>
          </button>
        }
      />

      {/* Overview Metric Banner */}
      <AppPanel className="bg-gradient-to-r from-[#FAF8F3] to-[#F6F0E5] border-[#E8D8BE]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#D39725]/20 text-[#D39725] flex items-center justify-center">
            <CalendarCheck size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-[#192A24]">
              {store.contactsWithAppointments.length}
            </div>
            <div className="text-xs text-[#7D8176]">
              rendez-vous fixé{store.contactsWithAppointments.length > 1 ? 's' : ''} au comptoir
            </div>
          </div>
        </div>
      </AppPanel>

      {/* Appointment Cards */}
      <div className="space-y-3">
        <SectionHeading title="Rendez-vous programmés" icon={<Calendar size={18} />} />

        {store.contactsWithAppointments.length === 0 ? (
          <AppPanel className="text-center py-10">
            <p className="text-xs text-gray-500">Aucun rendez-vous fixé pour le moment.</p>
          </AppPanel>
        ) : (
          store.contactsWithAppointments.map((contact) => (
            <AppPanel key={contact.reference} padding="p-4 sm:p-5" className="hover:border-[#D39725]/50 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[#F6F0E5] text-[#D39725] flex items-center justify-center flex-shrink-0">
                    <Calendar size={22} />
                  </div>

                  <div>
                    <div className="font-extrabold text-sm text-[#192A24]">{contact.name}</div>
                    <div className="text-xs text-[#7D8176] mt-0.5 flex items-center gap-2">
                      <span className="font-bold text-[#D39725]">{contact.appointment}</span>
                      <span>·</span>
                      <span>{contact.city}</span>
                    </div>
                    <div className="text-xs text-gray-500 font-mono mt-0.5">{contact.phone}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(contact)}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-[#D39725] cursor-pointer"
                    title="Modifier le rendez-vous"
                  >
                    <Edit2 size={16} />
                  </button>

                  <button
                    onClick={() => store.removeAppointment(contact.reference)}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-red-50 text-gray-400 hover:text-red-600 cursor-pointer"
                    title="Supprimer le rendez-vous"
                  >
                    
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </AppPanel>
          ))
        )}
      </div>

      {/* Modal Add/Edit Appointment */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingContact(null);
        }}
        title={editingContact ? `Modifier RDV · ${editingContact.name}` : 'Planifier un rendez-vous'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {!editingContact && (
            <div>
              <label className="block text-xs font-bold text-[#192A24] mb-1">Contact / Client</label>
              <select
                value={selectedContactRef}
                onChange={(e) => setSelectedContactRef(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-semibold"
              >
                {store.contacts.map((c) => (
                  <option key={c.reference} value={c.reference}>
                    {c.name} ({c.city})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Date et heure du rendez-vous</label>
            <input
              type="text"
              required
              value={appointmentDateTime}
              onChange={(e) => setAppointmentDateTime(e.target.value)}
              placeholder="ex: 24 oct. · 14h30"
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setEditingContact(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200"
            >
              Annuler
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold bg-[#D39725] text-white">
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
