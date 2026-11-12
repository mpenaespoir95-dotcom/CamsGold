import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  Check,
  ChevronRight,
  Calendar,
  Layers,
  Sparkles,
  Phone,
  Mail,
  UserCheck,
  Briefcase,
  FileText,
  Lock,
  Unlock,
  Key,
  SlidersHorizontal,
  Wallet,
  Plane,
  Boxes,
  ArrowLeftRight,
  Landmark,
  FileBarChart,
  CalendarCheck,
  MessageSquare,
  Handshake,
  LayoutDashboard,
  ShoppingBag,
  RotateCcw,
  Save,
  CheckSquare,
  Square,
  UserPlus,
} from 'lucide-react';
import { useAppStore } from '../../context/AppContext';
import { AppPanel, Modal, PageHeading } from '../common/UIComponents';
import {
  AppRole,
  AppUser,
  AppTask,
  TaskPriority,
  TaskStatus,
  TaskCategory,
  APP_ROLES,
  APP_MODULES_LIST,
  DEFAULT_ROLE_PERMISSIONS,
  AppModuleInfo,
} from '../../types';

export const UsersScreen: React.FC = () => {
  const store = useAppStore();

  const [activeTab, setActiveTab] = useState<'interface_access' | 'tasks' | 'users' | 'roles_matrix'>(
    'interface_access'
  );

  // Active selected user for the visual permissions modules grid
  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    return store.users[0]?.id || '';
  });

  // Track draft permissions for the currently selected user (module IDs)
  const selectedUser = store.users.find((u) => u.id === selectedUserId) || store.users[0];
  const [userDraftPermissions, setUserDraftPermissions] = useState<Record<string, number[]>>({});

  // Get current permissions of selected user
  const currentAllowedModules =
    userDraftPermissions[selectedUser?.id] !== undefined
      ? userDraftPermissions[selectedUser.id]
      : Array.isArray(selectedUser?.allowedModules)
      ? selectedUser.allowedModules
      : DEFAULT_ROLE_PERMISSIONS[selectedUser?.role || 'ADMIN'] || [0];

  const [permissionFeedback, setPermissionFeedback] = useState<string | null>(null);

  // Toggle a module directly on its visual tile
  const handleToggleModuleForUser = (moduleId: number) => {
    if (!selectedUser) return;
    const current = [...currentAllowedModules];
    let updated: number[];
    if (current.includes(moduleId)) {
      updated = current.filter((id) => id !== moduleId);
    } else {
      updated = [...current, moduleId];
    }

    setUserDraftPermissions((prev) => ({
      ...prev,
      [selectedUser.id]: updated,
    }));
  };

  // Authorize All Modules for selected user
  const handleAuthorizeAll = () => {
    if (!selectedUser) return;
    const allIds = APP_MODULES_LIST.map((m) => m.id);
    setUserDraftPermissions((prev) => ({
      ...prev,
      [selectedUser.id]: allIds,
    }));
  };

  // Block All Modules for selected user
  const handleBlockAll = () => {
    if (!selectedUser) return;
    setUserDraftPermissions((prev) => ({
      ...prev,
      [selectedUser.id]: [],
    }));
  };

  // Reset to role default permissions
  const handleResetToRoleDefault = () => {
    if (!selectedUser) return;
    const defaults = DEFAULT_ROLE_PERMISSIONS[selectedUser.role] || [0];
    setUserDraftPermissions((prev) => ({
      ...prev,
      [selectedUser.id]: defaults,
    }));
  };

  // Save Permissions to Store
  const handleSaveUserPermissions = () => {
    if (!selectedUser) return;
    store.updateUserPermissions(selectedUser.id, currentAllowedModules);
    setPermissionFeedback(
      `Droits d'accès enregistrés avec succès pour ${selectedUser.name} (${currentAllowedModules.length} interfaces autorisées sur 12).`
    );
    setTimeout(() => {
      setPermissionFeedback(null);
    }, 4500);
  };

  // Task Filters
  const [roleFilter, setRoleFilter] = useState<AppRole | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [taskToCompleteModal, setTaskToCompleteModal] = useState<AppTask | null>(null);
  const [completionNote, setCompletionNote] = useState('');
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<AppTask | null>(null);

  // Form states: New Task
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskRole, setTaskRole] = useState<AppRole | 'ALL'>('CASHIER');
  const [taskUserId, setTaskUserId] = useState('');
  const [taskCategory, setTaskCategory] = useState<TaskCategory>('Caisse & Trésorerie');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('normal');
  const [taskDueDate, setTaskDueDate] = useState('Aujourd’hui');

  // Form states: New User
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<AppRole>('CASHIER');
  const [newUserStatus, setNewUserStatus] = useState<'active' | 'suspended' | 'vacation'>('active');

  // Handle Create Task
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    let assignedUserName: string | undefined = undefined;
    if (taskUserId) {
      const u = store.users.find((user) => user.id === taskUserId);
      if (u) assignedUserName = u.name;
    }

    store.addTask({
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      assignedRole: taskRole,
      assignedUserId: taskUserId || undefined,
      assignedUserName,
      category: taskCategory,
      priority: taskPriority,
      dueDate: taskDueDate.trim() || 'Aujourd’hui',
      createdBy: `${store.userName} (Admin)`,
    });

    setShowAddTaskModal(false);
    setTaskTitle('');
    setTaskDesc('');
    setTaskRole('CASHIER');
    setTaskUserId('');
    setTaskCategory('Caisse & Trésorerie');
    setTaskPriority('normal');
    setTaskDueDate('Aujourd’hui');
  };

  // Handle Create User
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const roleObj = APP_ROLES.find((r) => r.id === newUserRole);
    const defaults = DEFAULT_ROLE_PERMISSIONS[newUserRole] || [0];

    store.addUser({
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      phone: newUserPhone.trim(),
      role: newUserRole,
      roleLabel: roleObj ? roleObj.label : newUserRole,
      status: newUserStatus,
      avatarBg: roleObj?.color || '#D39725',
      allowedModules: defaults,
    });

    setShowAddUserModal(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPhone('');
    setNewUserRole('CASHIER');
    setNewUserStatus('active');
  };

  // Handle Complete Task
  const handleConfirmCompleteTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskToCompleteModal) return;
    store.updateTaskStatus(
      taskToCompleteModal.id,
      'completed',
      completionNote.trim() || 'Tâche effectuée avec succès.'
    );
    setTaskToCompleteModal(null);
    setCompletionNote('');
  };

  // Filtering tasks
  const filteredTasks = store.tasks.filter((t) => {
    if (roleFilter !== 'ALL' && t.assignedRole !== 'ALL' && t.assignedRole !== roleFilter) {
      return false;
    }
    if (statusFilter !== 'ALL' && t.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.reference.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.assignedUserName && t.assignedUserName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getRoleInfo = (roleId: AppRole | 'ALL') => {
    if (roleId === 'ALL') {
      return {
        label: 'Tous les Rôles',
        badge: '🌐 Équipe Générale',
        color: '#192A24',
      };
    }
    const r = APP_ROLES.find((x) => x.id === roleId);
    return r || { label: roleId, badge: roleId, color: '#666' };
  };

  // Get module icon for tiles
  const getModuleTileIcon = (id: number) => {
    switch (id) {
      case 0:
        return <LayoutDashboard size={30} />;
      case 1:
        return <Wallet size={30} />;
      case 2:
        return <ShoppingBag size={30} />;
      case 3:
        return <ArrowLeftRight size={30} />;
      case 4:
        return <Handshake size={30} />;
      case 5:
        return <Landmark size={30} />;
      case 6:
        return <Users size={30} />;
      case 7:
        return <CalendarCheck size={30} />;
      case 8:
        return <MessageSquare size={30} />;
      case 9:
        return <FileBarChart size={30} />;
      case 10:
        return <Boxes size={30} />;
      case 12:
        return <ShieldCheck size={30} />;
      default:
        return <Layers size={30} />;
    }
  };

  return (
    <div className="p-4 sm:p-7 max-w-7xl mx-auto space-y-6">
      <PageHeading
        eyebrow="Gouvernance & Droits d'Accès aux Interfaces"
        title="Gestion des Utilisateurs & Droits aux Écrans"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E8D8BE] hover:bg-gray-50 text-xs font-bold text-[#192A24] cursor-pointer shadow-2xs"
            >
              <UserPlus size={15} className="text-[#D39725]" />
              <span>+ Nouvel Utilisateur</span>
            </button>
            <button
              onClick={() => setShowAddTaskModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#D39725] hover:bg-[#c2871b] text-white text-xs font-bold cursor-pointer shadow-xs transition-colors"
            >
              <Plus size={16} />
              <span>+ Assigner une Tâche</span>
            </button>
          </div>
        }
      />

      {permissionFeedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-xs flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{permissionFeedback}</span>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E8D8BE] pb-2">
        <button
          onClick={() => setActiveTab('interface_access')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'interface_access'
              ? 'bg-[#192A24] text-white shadow-xs'
              : 'bg-[#FAF8F3] text-gray-700 hover:bg-gray-100'
          }`}
        >
          <SlidersHorizontal size={15} />
          <span>Attribution des Interfaces (Grille Visuelle)</span>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'tasks'
              ? 'bg-[#D39725] text-white shadow-xs'
              : 'bg-[#FAF8F3] text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Briefcase size={15} />
          <span>Tâches Assignées aux Rôles ({store.tasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'users'
              ? 'bg-[#204B57] text-white shadow-xs'
              : 'bg-[#FAF8F3] text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Users size={15} />
          <span>Équipe & Utilisateurs ({store.users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('roles_matrix')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'roles_matrix'
              ? 'bg-gray-800 text-white shadow-xs'
              : 'bg-[#FAF8F3] text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Layers size={15} />
          <span>Matrice Complète des Rôles</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ATTRIBUTION DES INTERFACES (GRILLE VISUELLE COMME SUR L'ACCUEIL) */}
      {/* ========================================================================= */}
      {activeTab === 'interface_access' && selectedUser && (
        <div className="space-y-6">
          {/* USER SELECTOR STRIP */}
          <div className="p-4 bg-white rounded-2xl border border-[#E8D8BE] shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2">
              <span className="text-xs font-black text-[#192A24] uppercase tracking-wider flex items-center gap-2">
                <Users size={16} className="text-[#D39725]" />
                <span>1. Choisissez l'utilisateur dont vous configurez les accès :</span>
              </span>
              <span className="text-[11px] text-gray-500 font-medium">
                {store.users.length} comptes dans l'entreprise
              </span>
            </div>

            {/* Horizontal User Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {store.users.map((u) => {
                const isSelected = selectedUser.id === u.id;
                const isCurrentSession = store.userName.toLowerCase() === u.name.toLowerCase();
                const roleMeta = getRoleInfo(u.role);
                const allowedCount =
                  userDraftPermissions[u.id] !== undefined
                    ? userDraftPermissions[u.id].length
                    : Array.isArray(u.allowedModules)
                    ? u.allowedModules.length
                    : DEFAULT_ROLE_PERMISSIONS[u.role]?.length || 0;

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUserId(u.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-gradient-to-br from-amber-50 to-[#FAF8F3] border-2 border-[#D39725] shadow-xs ring-2 ring-[#D39725]/20'
                        : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-8 h-8 rounded-lg text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs"
                        style={{ backgroundColor: roleMeta.color }}
                      >
                        {u.name[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-[#192A24] truncate">
                          {u.name.split(' ')[0]}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">{u.role}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-gray-200/60 font-mono font-bold">
                      <span className={allowedCount > 0 ? 'text-[#008B62]' : 'text-gray-400'}>
                        {allowedCount} / 12 écrans
                      </span>
                      {isCurrentSession && (
                        <span className="w-2 h-2 rounded-full bg-[#D39725]" title="Session active"></span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ACTIVE USER PERMISSION CONFIGURATION PANEL */}
          <div className="p-5 bg-white rounded-2xl border-2 border-[#D39725]/40 shadow-sm space-y-5">
            {/* Header info & action buttons */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#E8D8BE] pb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl text-white font-black text-lg flex items-center justify-center shadow-xs"
                  style={{ backgroundColor: getRoleInfo(selectedUser.role).color }}
                >
                  {selectedUser.name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-[#192A24]">{selectedUser.name}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                      Rôle : {getRoleInfo(selectedUser.role).label}
                    </span>
                    {store.userName.toLowerCase() === selectedUser.name.toLowerCase() && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#D39725] text-white">
                        VOTRE SESSION
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Cliquez directement sur une tuile ci-dessous pour{' '}
                    <strong className="text-emerald-700">Autoriser</strong> ou{' '}
                    <strong className="text-red-700">Bloquer</strong> l’accès à cette interface.
                  </p>
                </div>
              </div>

              {/* Quick Batch Tools */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleAuthorizeAll}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <CheckSquare size={14} />
                  <span>Tout autoriser</span>
                </button>

                <button
                  type="button"
                  onClick={handleBlockAll}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-red-50 hover:bg-red-100 text-red-800 border border-red-300 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Square size={14} />
                  <span>Tout bloquer</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetToRoleDefault}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Rétablir les autorisations standard selon le rôle"
                >
                  <RotateCcw size={13} />
                  <span>Par défaut ({selectedUser.role})</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveUserPermissions}
                  className="px-4 py-2 bg-[#D39725] hover:bg-[#c2871b] text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Save size={15} />
                  <span>Enregistrer les accès</span>
                </button>
              </div>
            </div>

            {/* THE VISUAL MODULES GRID (EXACTLY PRESENTED LIKE THE ACCUEIL TILES) */}
            <div>
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-black text-[#192A24] uppercase tracking-wider">
                  Grille des 12 Interfaces Applicatives :
                </span>
                <span className="font-mono font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                  {currentAllowedModules.length} autorisée(s) / 12 au total
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {APP_MODULES_LIST.map((mod) => {
                  const isAllowed = currentAllowedModules.includes(mod.id);

                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => handleToggleModuleForUser(mod.id)}
                      className={`relative group flex flex-col items-center justify-between p-5 min-h-[140px] rounded-2xl border-2 transition-all cursor-pointer text-center ${
                        isAllowed
                          ? 'bg-gradient-to-br from-[#FFE1A3] to-[#FFD27A] border-[#E7AD35] shadow-md hover:shadow-lg hover:-translate-y-1'
                          : 'bg-white border-dashed border-gray-300 text-gray-400 opacity-60 hover:opacity-90 hover:border-red-300'
                      }`}
                    >
                      {/* Top Status Badge */}
                      <div className="w-full flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">
                          {mod.category}
                        </span>

                        {isAllowed ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-700 text-white text-[10px] font-black flex items-center gap-1 shadow-xs">
                            <Check size={11} />
                            <span>AUTORISÉ</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black flex items-center gap-1 border border-red-300">
                            <Lock size={10} />
                            <span>BLOQUÉ</span>
                          </span>
                        )}
                      </div>

                      {/* Large Center Icon */}
                      <div
                        className={`my-2 transition-transform ${
                          isAllowed
                            ? 'text-[#17140D] group-hover:scale-110'
                            : 'text-gray-400 group-hover:scale-105'
                        }`}
                      >
                        {getModuleTileIcon(mod.id)}
                      </div>

                      {/* Title & Description */}
                      <div className="w-full">
                        <div
                          className={`text-xs sm:text-sm font-extrabold leading-tight ${
                            isAllowed ? 'text-[#17140D]' : 'text-gray-600 line-through'
                          }`}
                        >
                          {mod.label.split(' (')[0]}
                        </div>
                        <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">
                          {mod.description}
                        </p>
                      </div>

                      {/* Interactive hint */}
                      <span className="text-[9px] font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-600">
                        {isAllowed ? 'Cliquez pour bloquer 🔒' : 'Cliquez pour autoriser ✓'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-4 border-t border-[#E8D8BE] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-gray-600">
                Les rôles effectifs sont attribués dans le profil Firebase autorisé ; cette page ne permet pas de changer de compte.
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveUserPermissions}
                  className="px-6 py-2.5 rounded-xl bg-[#192A24] hover:bg-[#253D34] text-white text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  <Save size={16} />
                  <span>Enregistrer les préférences locales</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TÂCHES OPÉRATIONNELLES & ATTRIBUTION AUX RÔLES                    */}
      {/* ========================================================================= */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 max-w-md relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une tâche, un rôle ou un collaborateur..."
                className="w-full px-3.5 py-2 bg-white rounded-xl border border-gray-200 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="px-3 py-2 bg-white rounded-xl border border-gray-200 text-xs font-bold text-[#192A24]"
              >
                <option value="ALL">Tous les rôles</option>
                {APP_ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-white rounded-xl border border-gray-200 text-xs font-bold text-[#192A24]"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="todo">À faire</option>
                <option value="in_progress">En cours</option>
                <option value="completed">Terminé</option>
              </select>
            </div>
          </div>

          {/* Tasks List */}
          <AppPanel>
            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center text-gray-400 space-y-2">
                <Briefcase size={32} className="mx-auto text-gray-300" />
                <p className="text-xs font-bold">Aucune tâche trouvée</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredTasks.map((t) => (
                  <div
                    key={t.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-[#D39725]">
                          {t.reference}
                        </span>
                        <span className="font-black text-[#192A24] text-sm">{t.title}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                          {t.assignedRole}
                        </span>
                      </div>
                      <p className="text-gray-600 text-[11px]">{t.description}</p>
                      <div className="text-[10px] text-gray-400 flex items-center gap-3">
                        <span>Échéance : <strong>{t.dueDate}</strong></span>
                        {t.assignedUserName && <span>Assigné à : <strong>{t.assignedUserName}</strong></span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {t.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => setTaskToCompleteModal(t)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Check size={13} />
                          <span>Valider</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => store.deleteTask(t.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 cursor-pointer"
                        title="Supprimer la tâche"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AppPanel>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ÉQUIPE & UTILISATEURS (LISTE DES COMPTES)                          */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <AppPanel>
            <div className="divide-y divide-gray-100">
              {store.users.map((u) => {
                const roleMeta = getRoleInfo(u.role);
                const allowedCount = Array.isArray(u.allowedModules) ? u.allowedModules.length : 0;
                return (
                  <div key={u.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl text-white font-black text-sm flex items-center justify-center"
                        style={{ backgroundColor: roleMeta.color }}
                      >
                        {u.name[0]}
                      </div>
                      <div>
                        <div className="font-extrabold text-[#192A24] text-sm">{u.name}</div>
                        <div className="text-gray-500 font-mono text-[11px]">{u.email}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          Rôle : <strong>{roleMeta.label}</strong> · {allowedCount} interfaces autorisées
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUserId(u.id);
                          setActiveTab('interface_access');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-[#966308] border border-amber-300 font-bold text-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <SlidersHorizontal size={13} />
                        <span>Configurer les interfaces</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </AppPanel>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MATRICE COMPLÈTE DES RÔLES (TABLEAU CROISÉ)                       */}
      {/* ========================================================================= */}
      {activeTab === 'roles_matrix' && (
        <div className="space-y-4">
          <AppPanel>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-[#192A24] bg-gray-50/50">
                    <th className="p-3 font-black">Interface Applicative</th>
                    {APP_ROLES.map((r) => (
                      <th key={r.id} className="p-3 text-center font-black">
                        {r.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {APP_MODULES_LIST.map((mod) => (
                    <tr key={mod.id} className="hover:bg-amber-50/30">
                      <td className="p-3 font-bold text-[#192A24]">
                        {mod.label}
                      </td>
                      {APP_ROLES.map((r) => {
                        const hasDefault = DEFAULT_ROLE_PERMISSIONS[r.id]?.includes(mod.id);
                        return (
                          <td key={r.id} className="p-3 text-center">
                            {hasDefault ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                                <Check size={12} />
                                <span>Oui</span>
                              </span>
                            ) : (
                              <span className="text-gray-300">--</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AppPanel>
        </div>
      )}

      {/* MODAL: NOUVEL UTILISATEUR */}
      <Modal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        title="Créer un Nouvel Utilisateur"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Nom complet *</label>
            <input
              type="text"
              required
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Nom complet"
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Adresse E-mail *</label>
            <input
              type="email"
              required
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="nom@entreprise.com"
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Téléphone</label>
            <input
              type="text"
              value={newUserPhone}
              onChange={(e) => setNewUserPhone(e.target.value)}
              placeholder="ex: +242 06 000 00 00"
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Rôle initial *</label>
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as AppRole)}
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
            >
              {APP_ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label} - {r.badge}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddUserModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-black bg-[#D39725] hover:bg-[#c2871b] text-white shadow-md cursor-pointer"
            >
              Créer l'utilisateur
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ASSIGNER UNE TÂCHE */}
      <Modal
        isOpen={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
        title="Assigner une Tâche Opérationnelle"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Titre de la tâche *</label>
            <input
              type="text"
              required
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="ex: Clôture caisse et versement banque"
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Description / Instructions</label>
            <textarea
              rows={3}
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              placeholder="Instructions détaillées..."
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs"
            ></textarea>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#192A24] mb-1">Rôle cible</label>
              <select
                value={taskRole}
                onChange={(e) => setTaskRole(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
              >
                <option value="ALL">Tous les rôles</option>
                {APP_ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#192A24] mb-1">Échéance</label>
              <input
                type="text"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                placeholder="Aujourd’hui"
                className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddTaskModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-black bg-[#D39725] hover:bg-[#c2871b] text-white shadow-md cursor-pointer"
            >
              Assigner la tâche
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: VALIDER UNE TÂCHE */}
      <Modal
        isOpen={Boolean(taskToCompleteModal)}
        onClose={() => setTaskToCompleteModal(null)}
        title="Valider la Tâche"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleConfirmCompleteTask} className="space-y-4">
          <p className="text-xs text-gray-600">
            Confirmez-vous que la tâche <strong>{taskToCompleteModal?.title}</strong> a été réalisée ?
          </p>
          <div>
            <label className="block text-xs font-bold text-[#192A24] mb-1">Note de validation (optionnel)</label>
            <input
              type="text"
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              placeholder="ex: Vérifié et conforme"
              className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs"
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setTaskToCompleteModal(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer"
            >
              Confirmer la validation
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
