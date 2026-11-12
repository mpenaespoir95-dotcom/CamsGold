import React, { useState } from 'react';
import {
  LayoutDashboard,
  Wallet,
  ShoppingBag,
  ArrowLeftRight,
  Handshake,
  Landmark,
  Boxes,
  FileBarChart,
  CalendarCheck,
  Users,
  MessageSquare,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { useAppStore } from '../../context/AppContext';
import { Modal } from '../common/UIComponents';

interface ModuleItem {
  id: number;
  label: string;
  icon: React.ReactNode;
  destination: number;
}

export const ModuleHomeScreen: React.FC<{ onNavigate: (dest: number) => void }> = ({ onNavigate }) => {
  const store = useAppStore();
  const [showRdvSmsModal, setShowRdvSmsModal] = useState(false);

  const modules: ModuleItem[] = [
    { id: 0, label: 'Tableau de bord', icon: <LayoutDashboard size={28} />, destination: 0 },
    { id: 1, label: 'Opérations', icon: <Wallet size={28} />, destination: 1 },
    { id: 2, label: 'Vente', icon: <ShoppingBag size={28} />, destination: 2 },
    { id: 3, label: 'Stock Devise', icon: <ArrowLeftRight size={28} />, destination: 3 },
    { id: 4, label: 'Partenaires', icon: <Handshake size={28} />, destination: 4 },
    { id: 5, label: 'Banques', icon: <Landmark size={28} />, destination: 5 },
    { id: 10, label: 'Gestion Stock', icon: <Boxes size={28} />, destination: 10 },
    { id: 9, label: 'Rapports', icon: <FileBarChart size={28} />, destination: 9 },
    { id: 14, label: 'Charges (OPEX)', icon: <FileBarChart size={28} />, destination: 14 },
    { id: 7, label: 'RDV / SMS', icon: <CalendarCheck size={28} />, destination: 7 },
    { id: 6, label: 'Clients / Fournisseurs', icon: <Users size={28} />, destination: 6 },
    { id: 12, label: 'Utilisateurs & Droits', icon: <ShieldCheck size={28} />, destination: 12 },
  ];

  const handleTileClick = (mod: ModuleItem) => {
    if (!store.canAccessModule(mod.destination)) {
      alert(
        `Accès Restreint : Votre compte (${store.userName} - ${store.currentRole}) n’est pas autorisé par l’administrateur à accéder au module "${mod.label}".`
      );
      return;
    }
    if (mod.destination === 7) {
      setShowRdvSmsModal(true);
    } else {
      onNavigate(mod.destination);
    }
  };

  return (
    <div className="min-h-full bg-[#E7E8E9] p-6 sm:p-10 flex flex-col items-center">
      <div className="w-full max-w-4xl text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-[#17140D] tracking-tight">
          CAMS GOLD
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          Connecté en tant que <strong className="text-[#192A24]">{store.userName}</strong> ({store.currentRole}) · Les interfaces non autorisées par l'administrateur sont verrouillées.
        </p>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5 justify-center">
        {modules.map((m) => {
          const isAllowed = store.canAccessModule(m.destination);
          return (
            <button
              key={m.id}
              onClick={() => handleTileClick(m)}
              className={`relative group flex flex-col items-center justify-center p-5 min-h-[115px] sm:min-h-[125px] rounded-2xl border transition-all cursor-pointer text-center ${
                isAllowed
                  ? 'bg-gradient-to-br from-[#FFE1A3] to-[#FFD27A] border-[#E7AD35] shadow-[0_3px_10px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_20px_rgba(231,173,53,0.35)] hover:-translate-y-0.5 active:translate-y-0'
                  : 'bg-white/70 border-gray-300 opacity-60 hover:opacity-80 shadow-2xs'
              }`}
            >
              {!isAllowed && (
                <span className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded-md bg-gray-200/90 text-gray-600 text-[9px] font-black flex items-center gap-1 border border-gray-300">
                  <Lock size={10} />
                  <span>Verrouillé</span>
                </span>
              )}
              <div
                className={`mb-2 transition-transform ${
                  isAllowed ? 'text-[#17140D] group-hover:scale-110' : 'text-gray-400'
                }`}
              >
                {m.icon}
              </div>
              <span
                className={`text-xs sm:text-sm font-bold leading-tight px-1 ${
                  isAllowed ? 'text-[#17140D]' : 'text-gray-500'
                }`}
              >
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      <Modal
        isOpen={showRdvSmsModal}
        onClose={() => setShowRdvSmsModal(false)}
        title="Accès communication & agenda"
        maxWidth="max-w-md"
      >
        <div className="space-y-3">
          <button
            onClick={() => {
              setShowRdvSmsModal(false);
              onNavigate(7);
            }}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-[#E8D8BE] hover:bg-[#F6F0E5]/60 text-left transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#D39725]/15 text-[#D39725] flex items-center justify-center flex-shrink-0">
              <CalendarCheck size={22} />
            </div>
            <div>
              <div className="font-bold text-sm text-[#192A24]">Rendez-vous</div>
              <div className="text-xs text-[#7D8176]">Consulter ou planifier des rendez-vous clients</div>
            </div>
          </button>

          <button
            onClick={() => {
              setShowRdvSmsModal(false);
              onNavigate(8);
            }}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-[#E8D8BE] hover:bg-[#F6F0E5]/60 text-left transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#008B62]/15 text-[#008B62] flex items-center justify-center flex-shrink-0">
              <MessageSquare size={22} />
            </div>
            <div>
              <div className="font-bold text-sm text-[#192A24]">SMS & Devises</div>
              <div className="text-xs text-[#7D8176]">Envoyer un récapitulatif des cours et cotations</div>
            </div>
          </button>
        </div>
      </Modal>
    </div>
  );
};
