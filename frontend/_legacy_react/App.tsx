import React, { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { MainContent } from './components/MainContent';
import { Login } from './components/Login';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [activeView, setActiveView] = useState('dashboard');

  const handleLogin = (user: string) => {
    setUsername(user);
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg-app">
      <Header username={username} />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar onNavigate={setActiveView} currentView={activeView} />
        <MainContent activeView={activeView} />
      </div>
      <Footer username={username} />
    </div>
  );
}