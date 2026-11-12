import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, UserPlus, RefreshCw, LogOut } from 'lucide-react';
import { useAppStore } from '../../context/AppContext';
import { APP_ROLES, AppRole } from '../../types';

const getAuthErrorMessage = (error: unknown): string => {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Adresse e-mail ou mot de passe incorrect.';
    case 'auth/email-already-in-use':
      return 'Cette adresse e-mail possède déjà un compte. Connectez-vous.';
    case 'auth/weak-password':
      return 'Le mot de passe doit comporter au moins 6 caractères.';
    case 'auth/invalid-email':
      return 'Veuillez saisir une adresse e-mail valide.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Réessayez plus tard.';
    case 'auth/network-request-failed':
      return 'Connexion impossible. Vérifiez votre accès à Internet.';
    case 'permission-denied':
      return 'La demande d’accès n’a pas pu être enregistrée. Contactez un administrateur.';
    default:
      return error instanceof Error ? error.message : 'Une erreur est survenue. Réessayez.';
  }
};

export const LoginScreen: React.FC<{ onShowRegister: () => void }> = ({ onShowRegister }) => {
  const { signIn } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await signIn(email, password);
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center p-4">
      <div className="w-full max-w-[440px] bg-white rounded-3xl border border-[#E9ECEF] shadow-[0_10px_35px_rgba(0,0,0,0.06)] p-8 sm:p-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 p-1 rounded-3xl bg-[#FFD452]/25 border border-[#00BFB5]/50 flex items-center justify-center shadow-inner overflow-hidden mb-5">
            <img
              src="/cams_gold.jpeg"
              alt="Cams Gold Logo"
              className="w-full h-full object-cover rounded-2xl"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-2xl font-black text-[#202124] tracking-tight">CAMS GOLD</h1>
          <p className="text-xs text-[#747982] mt-1.5 text-center">
            Connectez-vous pour accéder à votre espace CAMS GOLD.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-[#202124] mb-2">
              Adresse e-mail
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#00BFB5]">
                <Mail size={18} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@entreprise.com"
                className="w-full pl-10 pr-4 py-3 bg-[#F8F9FB] rounded-xl border border-[#E5E8EC] text-sm text-[#202124] placeholder-[#9CA1AA] focus:outline-hidden focus:border-[#00BFB5] focus:ring-1 focus:ring-[#00BFB5] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202124] mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#00BFB5]">
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-11 py-3 bg-[#F8F9FB] rounded-xl border border-[#E5E8EC] text-sm text-[#202124] placeholder-[#9CA1AA] focus:outline-hidden focus:border-[#00BFB5] focus:ring-1 focus:ring-[#00BFB5] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-[#D39725] hover:bg-[#c2871b] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all transform active:scale-[0.99] cursor-pointer mt-6"
          >
            <span>{isSubmitting ? 'Connexion...' : 'Se connecter'}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-2 text-xs">
          <span className="text-[#747982]">Vous n’avez pas de compte ?</span>
          <button
            type="button"
            onClick={onShowRegister}
            className="font-bold text-[#00BFB5] hover:underline cursor-pointer"
          >
            Créer un compte
          </button>
        </div>
      </div>
    </div>
  );
};

export const RegisterScreen: React.FC<{ onShowLogin: () => void }> = ({ onShowLogin }) => {
  const { register } = useAppStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<AppRole>('CASHIER');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Veuillez saisir votre nom complet.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Veuillez saisir une adresse e-mail valide.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await register({ name, email, phone, requestedRole: role, password });
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center p-4">
      <div className="w-full max-w-[460px] bg-white rounded-3xl border border-[#E9ECEF] shadow-[0_10px_35px_rgba(0,0,0,0.06)] p-8 sm:p-10">
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 p-1 rounded-3xl bg-[#FFD452]/25 border border-[#00BFB5]/50 flex items-center justify-center shadow-inner overflow-hidden mb-4">
            <img
              src="/cams_gold.jpeg"
              alt="Cams Gold Logo"
              className="w-full h-full object-cover rounded-2xl"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-2xl font-black text-[#202124]">Créer un compte</h1>
          <p className="text-xs text-[#747982] mt-1 text-center">
            Rejoignez l'espace de gestion CAMS GOLD
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#202124] mb-1.5">
              Nom complet ou Raison sociale
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom complet"
              className="w-full px-4 py-2.5 bg-[#F8F9FB] rounded-xl border border-[#E5E8EC] text-sm text-[#202124] focus:outline-hidden focus:border-[#00BFB5]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202124] mb-1.5">
              Adresse e-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nom@entreprise.com"
              className="w-full px-4 py-2.5 bg-[#F8F9FB] rounded-xl border border-[#E5E8EC] text-sm text-[#202124] focus:outline-hidden focus:border-[#00BFB5]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202124] mb-1.5">
              Téléphone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+223 70 00 00 00"
              className="w-full px-4 py-2.5 bg-[#F8F9FB] rounded-xl border border-[#E5E8EC] text-sm text-[#202124] focus:outline-hidden focus:border-[#00BFB5]"
            />
          </div>

          <div>
            <label htmlFor="registration-role" className="block text-xs font-bold text-[#202124] mb-1.5">
              Rôle
            </label>
            <select
              id="registration-role"
              required
              value={role}
              onChange={(e) => setRole(e.target.value as AppRole)}
              className="w-full px-4 py-2.5 bg-[#F8F9FB] rounded-xl border border-[#E5E8EC] text-sm text-[#202124] focus:outline-hidden focus:border-[#00BFB5]"
            >
              {APP_ROLES.map((appRole) => (
                <option key={appRole.id} value={appRole.id}>{appRole.label}</option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-[#747982]">
              Ce rôle est une demande. L’accès et le rôle final sont attribués par un administrateur après vérification.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202124] mb-1.5">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6 caractères minimum"
                className="w-full pl-4 pr-11 py-2.5 bg-[#F8F9FB] rounded-xl border border-[#E5E8EC] text-sm text-[#202124] focus:outline-hidden focus:border-[#00BFB5]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 bg-[#D39725] hover:bg-[#c2871b] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all transform active:scale-[0.99] cursor-pointer mt-6"
          >
            <UserPlus size={18} />
            <span>{isSubmitting ? 'Création...' : 'Créer mon accès'}</span>
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-center gap-2 text-xs">
          <span className="text-[#747982]">Déjà un compte ?</span>
          <button
            type="button"
            onClick={onShowLogin}
            className="font-bold text-[#00BFB5] hover:underline cursor-pointer"
          >
            Se connecter
          </button>
        </div>
      </div>
    </div>
  );
};

export const AccountStatusScreen: React.FC = () => {
  const {
    authStatus,
    authEmail,
    authMessage,
    refreshAuthorization,
    resendVerificationEmail,
    signOut,
  } = useAppStore();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const runAction = async (action: () => Promise<void>, successMessage: string) => {
    setMessage('');
    setIsSubmitting(true);
    try {
      await action();
      setMessage(successMessage);
    } catch (error) {
      setMessage(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isUnverified = authStatus === 'unverified';
  const isError = authStatus === 'error';

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center p-4">
      <div className="w-full max-w-[440px] bg-white rounded-3xl border border-[#E9ECEF] shadow-[0_10px_35px_rgba(0,0,0,0.06)] p-8 sm:p-10 text-center">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-[#FFD452]/25 border border-[#00BFB5]/50 flex items-center justify-center text-[#D39725]">
          {isUnverified ? <Mail size={28} /> : <RefreshCw size={28} />}
        </div>
        <h1 className="text-xl font-black text-[#202124]">
          {isUnverified
            ? 'Confirmez votre adresse e-mail'
            : isError
              ? 'Vérification impossible'
              : 'Activation du compte en attente'}
        </h1>
        <p className="mt-3 text-sm text-[#747982]">
          {isUnverified
            ? `Un lien de vérification a été envoyé à ${authEmail}. Confirmez votre adresse avant de demander l’accès.`
            : isError
              ? authMessage
              : `Le compte ${authEmail} doit être activé par un administrateur CAMS GOLD avant d’accéder aux données.`}
        </p>
        {message && (
          <div className="mt-4 p-3 rounded-xl bg-[#F8F9FB] border border-[#E5E8EC] text-xs text-[#202124]">
            {message}
          </div>
        )}
        <div className="mt-7 space-y-3">
          {isUnverified && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void runAction(resendVerificationEmail, 'Un nouveau lien de vérification a été envoyé.')}
              className="w-full h-11 bg-[#D39725] hover:bg-[#c2871b] disabled:opacity-60 text-white font-bold rounded-xl flex items-center justify-center gap-2"
            >
              <Mail size={16} />
              Renvoyer le lien
            </button>
          )}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void runAction(refreshAuthorization, 'Vérification terminée.')}
            className="w-full h-11 bg-[#F8F9FB] hover:bg-[#EEF0F3] disabled:opacity-60 text-[#202124] font-bold rounded-xl flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} />
            Actualiser le statut
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void runAction(signOut, 'Déconnexion effectuée.')}
            className="w-full h-10 text-xs font-bold text-[#747982] hover:text-[#202124] flex items-center justify-center gap-2"
          >
            <LogOut size={15} />
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
};
