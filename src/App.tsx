import React, { useState } from 'react';
import { useAppStore } from './context/AppContext';
import { AccountStatusScreen, LoginScreen, RegisterScreen } from './components/auth/AuthScreens';
import { AppShell } from './components/shell/AppShell';

export const App: React.FC = () => {
  const { authStatus } = useAppStore();
  const [showRegister, setShowRegister] = useState(false);

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center">
        <p className="text-sm font-medium text-[#747982]">Vérification de votre accès...</p>
      </div>
    );
  }

  if (authStatus === 'pending' || authStatus === 'unverified' || authStatus === 'error') {
    return <AccountStatusScreen />;
  }

  if (authStatus === 'signedOut') {
    if (showRegister) {
      return <RegisterScreen onShowLogin={() => setShowRegister(false)} />;
    }
    return <LoginScreen onShowRegister={() => setShowRegister(true)} />;
  }

  return <AppShell />;
};

export default App;
