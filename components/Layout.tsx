import React from 'react';
import { Users, ClipboardList, Trophy, Settings, PlayCircle } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDark: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, isDark }) => {
  const tabs = [
    { id: 'players', label: 'Jogadores', icon: Users },
    { id: 'attendance', label: 'Presença', icon: ClipboardList },
    { id: 'match', label: 'Partida', icon: PlayCircle },
    { id: 'ranking', label: 'Ranking', icon: Trophy },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'dark' : ''}`}>
      <div className="flex-1 bg-gradient-to-br from-gray-50 via-pitch-50/30 to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-pitch-900/20 flex flex-col h-full transition-colors duration-300">
        {/* Header - Enhanced with Gradient & Glassmorphism */}
        <header className="sticky top-0 z-20 safe-top">
          <div className="bg-gradient-to-r from-pitch-600 via-pitch-500 to-pitch-600 dark:from-pitch-800 dark:via-pitch-700 dark:to-pitch-800 shadow-lg">
            <div className="max-w-5xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <span className="text-2xl sm:text-3xl animate-bounce">⚽</span>
                  <span className="bg-gradient-to-r from-white to-pitch-100 bg-clip-text text-transparent">
                    FutManager Pro
                  </span>
                </h1>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span className="text-xs font-medium text-white">Online</span>
                </div>
              </div>
            </div>
          </div>
          {/* Decorative gradient line */}
          <div className="h-1 bg-gradient-to-r from-transparent via-pitch-400 to-transparent"></div>
        </header>

        {/* Content - Enhanced Spacing */}
        <main className="flex-1 w-full max-w-5xl mx-auto p-3 sm:p-6 pb-[calc(5rem+env(safe-area-inset-bottom))] animate-fade-in">
          {children}
        </main>

        {/* Bottom Navigation - Enhanced with Glassmorphism */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)] no-print">
          {/* Glassmorphism background */}
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-gray-200/50 dark:border-gray-700/50"></div>

          {/* Active tab indicator */}
          <div
            className="absolute top-0 h-1 bg-gradient-to-r from-pitch-500 to-pitch-600 transition-all duration-300 ease-out"
            style={{
              width: `${100 / tabs.length}%`,
              left: `${tabs.findIndex(t => t.id === activeTab) * (100 / tabs.length)}%`
            }}
          ></div>

          <div className="relative max-w-5xl mx-auto flex justify-around">
            {tabs.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex flex-col items-center justify-center py-3 px-2 w-full
                    transition-all duration-200 ease-out touch-target
                    active:scale-95 relative group
                    ${isActive
                      ? 'text-pitch-600 dark:text-pitch-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }
                  `}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Icon with enhanced styling */}
                  <div className={`
                    relative transition-all duration-200
                    ${isActive ? 'scale-110' : 'scale-100 group-hover:scale-105'}
                  `}>
                    <Icon
                      size={24}
                      strokeWidth={isActive ? 2.5 : 2}
                      className={isActive ? 'drop-shadow-md' : ''}
                    />
                    {/* Glow effect for active tab */}
                    {isActive && (
                      <div className="absolute inset-0 bg-pitch-500/20 dark:bg-pitch-400/20 blur-xl rounded-full -z-10"></div>
                    )}
                  </div>

                  {/* Label */}
                  <span className={`
                    text-[10px] sm:text-xs mt-1 truncate max-w-full font-medium
                    transition-all duration-200
                    ${isActive ? 'font-semibold' : 'font-normal'}
                  `}>
                    {tab.label}
                  </span>

                  {/* Ripple effect on tap */}
                  <span className="absolute inset-0 rounded-lg overflow-hidden">
                    <span className="absolute inset-0 bg-pitch-500/10 dark:bg-pitch-400/10 scale-0 group-active:scale-100 transition-transform duration-300 rounded-full"></span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};