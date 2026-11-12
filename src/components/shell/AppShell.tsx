import React, { useState } from 'react';
import {
  ArrowLeft,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Wallet,
  Plane,
  ArrowLeftRight,
  Handshake,
  Landmark,
  Users,
  CalendarCheck,
  MessageSquare,
  FileBarChart,
  Boxes,
  Grid,
  ShieldCheck,
  UserCheck,
  Lock,
} from 'lucide-react';
import { useAppStore } from '../../context/AppContext';
import { BrandMark } from '../common/BrandMark';
import { HomeScreen } from '../dashboard/HomeScreen';
import { ModuleHomeScreen } from '../dashboard/ModuleHomeScreen';
import { CashScreen } from '../cash/CashScreen';
import { SalesScreen } from '../sales/SalesScreen';
import { ExchangesScreen } from '../exchanges/ExchangesScreen';
import { PartnershipsScreen } from '../partnerships/PartnershipsScreen';
import { BanksScreen } from '../banks/BanksScreen';
import { ContactsScreen } from '../contacts/ContactsScreen';
import { AppointmentsScreen } from '../appointments/AppointmentsScreen';
import { SmsScreen } from '../sms/SmsScreen';
import { ReportsScreen } from '../reports/ReportsScreen';
import { ChargesScreen } from '../expenses/ChargesScreen';
import { StockScreen } from '../stock/StockScreen';
import { UsersScreen } from '../users/UsersScreen';

export const AppShell: React.FC = () => {
  const store = useAppStore();
  const [selectedModule, setSelectedModule] = useState<number>(11);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const destinations = [
    { id: 0, label: 'Accueil', icon: <LayoutDashboard size={18} /> },
    { id: 1, label: 'Caisse', icon: <Wallet size={18} /> },
    { id: 2, label: 'Ventes Dubaï', icon: <Plane size={18} /> },
    { id: 13, label: 'Échanges', icon: <ArrowLeftRight size={18} /> },
    { id: 4, label: 'Partenariats', icon: <Handshake size={18} /> },
    { id: 5, label: 'Banques & versements', icon: <Landmark size={18} /> },
    { id: 6, label: 'Clients & fournisseurs', icon: <Users size={18} /> },
    { id: 7, label: 'Rendez-vous', icon: <CalendarCheck size={18} /> },
    { id: 8, label: 'SMS', icon: <MessageSquare size={18} /> },
    { id: 9, label: 'Rapports', icon: <FileBarChart size={18} /> },
    { id: 14, label: 'Charges (OPEX)', icon: <FileBarChart size={18} /> },
    { id: 10, label: 'Gestion du stock', icon: <Boxes size={18} /> },
    { id: 12, label: 'Utilisateurs & Tâches', icon: <ShieldCheck size={18} /> },
  ];

  const getPermissionModuleId = (dest: number) => (dest === 13 ? 3 : dest);

  const handleSelectModule = (dest: number) => {
    if (dest !== 0 && dest !== 11 && !store.canAccessModule(getPermissionModuleId(dest))) {
      alert(
        `Accès Restreint : Votre compte (${store.userName} - ${store.currentRole}) n’est pas autorisé par l’administrateur à accéder à cette interface.`
      );
      return;
    }
    setSelectedModule(dest);
    setMobileMenuOpen(false);
  };

  const renderCurrentPage = () => {
    if (
      selectedModule !== 0 &&
      selectedModule !== 11 &&
      !store.canAccessModule(getPermissionModuleId(selectedModule))
    ) {
      return (
        <div className="p-8 max-w-lg mx-auto my-12 text-center bg-white rounded-2xl border border-red-200 shadow-sm space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
            <Lock size={28} />
          </div>
          <h2 className="text-lg font-black text-gray-900">Accès Non Autorisé</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            Votre compte actuel (<strong>{store.userName}</strong> · rôle <strong>{store.currentRole}</strong>) n'a pas reçu l'autorisation de l'administrateur pour accéder à cette interface.
          </p>
          <button
            onClick={() => handleSelectModule(11)}
            className="px-5 py-2.5 rounded-xl bg-[#192A24] text-white text-xs font-bold hover:bg-[#253D34] transition-colors cursor-pointer"
          >
            Retourner aux modules autorisés
          </button>
        </div>
      );
    }

    switch (selectedModule) {
      case 0:
        return <HomeScreen onNavigate={handleSelectModule} />;
      case 1:
        return <CashScreen />;
      case 2:
        return <SalesScreen onExit={() => handleSelectModule(0)} />;
      case 3:
        return <StockScreen mode="currency" />;
      case 4:
        return <PartnershipsScreen />;
      case 5:
        return <BanksScreen />;
      case 6:
        return <ContactsScreen />;
      case 7:
        return <AppointmentsScreen />;
      case 8:
        return <SmsScreen />;
      case 9:
        return <ReportsScreen />;
      case 10:
        return <StockScreen mode="gold" />;
      case 12:
        return <UsersScreen />;
      case 13:
        return <ExchangesScreen />;
      case 14:
        return <ChargesScreen />;
      case 11:
      default:
        return <ModuleHomeScreen onNavigate={handleSelectModule} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F3] flex flex-col text-[#192A24]">
      {/* Desktop & Mobile Header (Forest green: #192A24) */}
      <header className="h-16 bg-[#192A24] text-white px-4 sm:px-6 flex items-center justify-between shadow-md relative z-30">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Logo & Brand title */}
          <button
            onClick={() => handleSelectModule(0)}
            className="flex items-center gap-3 cursor-pointer text-left focus:outline-hidden"
          >
            <div className="w-10 h-10 rounded-xl bg-white p-0.5 overflow-hidden flex-shrink-0">
              <img src="/cams_gold.jpeg" alt="Logo" className="w-full h-full object-cover rounded-lg" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-extrabold text-base tracking-tight leading-tight">CAMS GOLD</span>
              <span className="text-[9px] font-bold tracking-[0.16em] text-[#F2BD45] uppercase">
                OR · DEVISES · PARTENAIRES
              </span>
            </div>
          </button>
        </div>

        {/* Global Search Bar (middle) */}
        <div className="hidden md:flex flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Rechercher une opération, un client, un numéro..."
              className="w-full pl-9 pr-4 py-1.5 bg-white/10 rounded-full border border-white/15 text-xs text-white placeholder-white/40 focus:outline-hidden focus:bg-white/15 focus:border-[#F2BD45]/50 transition-all"
            />
          </div>
        </div>

        {/* User profile & actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => handleSelectModule(0)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer border border-white/10 transition-colors"
          >
            <Grid size={15} className="text-[#F2BD45]" />
            <span>Accueil & Modules</span>
          </button>

          <button
            title="Notifications"
            className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white cursor-pointer"
          >
            <Bell size={18} />
          </button>

          <div className="h-6 w-px bg-white/20 hidden sm:block"></div>

          {/* User badge */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#F1C756] text-[#192A24] font-black text-xs flex items-center justify-center">
                {store.userName ? store.userName[0].toUpperCase() : 'A'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-[10px] text-white/60 leading-none">Connecté</span>
                <span className="text-xs font-bold leading-tight mt-0.5">{store.userName}</span>
              </div>
              <ChevronDown size={14} className="text-white/60 hidden sm:block" />
            </button>

            {/* Dropdown */}
            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl border border-gray-200 shadow-xl py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2 border-b border-gray-100">
                  <div className="font-bold text-[#192A24]">{store.userName}</div>
                  <div className="text-[11px] text-gray-500">Administrateur Comptoir</div>
                </div>

                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    handleSelectModule(12);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-amber-50/60 text-[#192A24] font-bold flex items-center gap-2 cursor-pointer"
                >
                  <ShieldCheck size={14} className="text-[#D39725]" />
                  <span>Gérer Rôles & Tâches</span>
                </button>

                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    if (window.confirm('Cette action efface toutes les données locales de l’application. Continuer ?')) {
                      store.resetToDefaults();
                    }
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 text-gray-700 flex items-center gap-2 cursor-pointer"
                >
                  <span>Effacer les données locales</span>
                </button>

                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    store.signOut();
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 font-bold flex items-center gap-2 cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Se déconnecter</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Mobile slide-over drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            ></div>
            <div className="relative w-72 max-w-[85%] bg-[#FFFDFA] border-r border-[#E8D8BE] shadow-2xl p-5 flex flex-col justify-between z-50 overflow-y-auto">
              <div>
                <div className="mb-6">
                  <BrandMark />
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => handleSelectModule(11)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      selectedModule === 11
                        ? 'bg-[#D39725]/20 text-[#9E731B]'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Grid size={18} className="text-[#D39725]" />
                    <span>Tous les modules</span>
                  </button>

                  <div className="my-2 border-t border-gray-200"></div>

                  {destinations.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => handleSelectModule(d.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        selectedModule === d.id
                          ? 'bg-[#D39725]/20 text-[#9E731B]'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className={selectedModule === d.id ? 'text-[#D39725]' : 'text-gray-400'}>
                        {d.icon}
                      </span>
                      <span>{d.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => store.signOut()}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 cursor-pointer"
                >
                  <LogOut size={16} />
                  <span>Se déconnecter</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content View */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          {selectedModule !== 11 && (
            <div className="px-4 sm:px-7 pt-4 pb-0 no-print">
              <button
                onClick={() => handleSelectModule(selectedModule === 0 ? 11 : 0)}
                className="flex items-center gap-1.5 text-xs font-bold text-[#D39725] hover:text-[#9E731B] hover:underline cursor-pointer group"
              >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                <span>
                  {selectedModule === 0 ? 'Retour à Tous les modules' : 'Retour à l’Accueil & Modules'}
                </span>
              </button>
            </div>
          )}

          <div className="flex-1">{renderCurrentPage()}</div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden bg-white border-t border-[#E8D8BE] px-2 py-1.5 flex items-center justify-around z-20 shadow-xs no-print">
        <button
          onClick={() => handleSelectModule(0)}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold cursor-pointer ${
            selectedModule === 0 ? 'text-[#D39725]' : 'text-[#7D8176]'
          }`}
        >
          <LayoutDashboard size={19} />
          <span className="mt-0.5">Accueil</span>
        </button>

        <button
          onClick={() => handleSelectModule(1)}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold cursor-pointer ${
            selectedModule === 1 ? 'text-[#D39725]' : 'text-[#7D8176]'
          }`}
        >
          <Wallet size={19} />
          <span className="mt-0.5">Caisse</span>
        </button>

        <button
          onClick={() => handleSelectModule(2)}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold cursor-pointer ${
            selectedModule === 2 ? 'text-[#D39725]' : 'text-[#7D8176]'
          }`}
        >
          <Plane size={19} />
          <span className="mt-0.5">Dubaï</span>
        </button>

        <button
          onClick={() => handleSelectModule(6)}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold cursor-pointer ${
            selectedModule === 6 ? 'text-[#D39725]' : 'text-[#7D8176]'
          }`}
        >
          <Users size={19} />
          <span className="mt-0.5">Contacts</span>
        </button>

        <button
          onClick={() => handleSelectModule(7)}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold cursor-pointer ${
            selectedModule === 7 ? 'text-[#D39725]' : 'text-[#7D8176]'
          }`}
        >
          <CalendarCheck size={19} />
          <span className="mt-0.5">RDV</span>
        </button>
      </nav>
    </div>
  );
};
