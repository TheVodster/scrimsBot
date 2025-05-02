import { useState } from "react";

type TabType = "teams" | "scrims" | "commands" | "settings";

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isOpen: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, isOpen, toggleSidebar }: SidebarProps) {
  return (
    <aside 
      className={`fixed lg:sticky top-0 left-0 z-40 w-64 h-screen lg:h-auto transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 bg-discord-darkest border-r border-discord-dark flex flex-col`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-discord-dark">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-discord-blue flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <line x1="22" y1="11.08" x2="2" y2="11.08"></line>
              <polygon points="22 16.08 22 11.08 17 16.08"></polygon>
              <polygon points="2 6.08 2 11.08 7 6.08"></polygon>
            </svg>
          </div>
          <h1 className="text-lg font-bold text-white">Scrim Bot Admin</h1>
        </div>
        <button onClick={toggleSidebar} className="lg:hidden text-gray-300 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        <button 
          onClick={() => setActiveTab("teams")} 
          className={`flex items-center w-full px-4 py-2 text-sm rounded-md ${activeTab === "teams" ? 'bg-discord-dark text-white' : 'text-gray-300 hover:bg-discord-dark hover:text-white'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          Teams
        </button>
        
        <button
          onClick={() => setActiveTab("scrims")}
          className={`flex items-center w-full px-4 py-2 text-sm rounded-md ${activeTab === "scrims" ? 'bg-discord-dark text-white' : 'text-gray-300 hover:bg-discord-dark hover:text-white'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          Scrims
        </button>
        
        <button
          onClick={() => setActiveTab("commands")}
          className={`flex items-center w-full px-4 py-2 text-sm rounded-md ${activeTab === "commands" ? 'bg-discord-dark text-white' : 'text-gray-300 hover:bg-discord-dark hover:text-white'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3">
            <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"></path>
          </svg>
          Bot Commands
        </button>
        
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center w-full px-4 py-2 text-sm rounded-md ${activeTab === "settings" ? 'bg-discord-dark text-white' : 'text-gray-300 hover:bg-discord-dark hover:text-white'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          Settings
        </button>
      </nav>
      
      {/* User */}
      <div className="p-4 border-t border-discord-dark">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-discord-green flex items-center justify-center text-white">
            <span className="font-medium">A</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-white">Admin User</p>
            <p className="text-xs text-gray-300">admin@example.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
