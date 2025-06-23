import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Teams from "@/pages/Teams";
import Scrims from "@/pages/Scrims";
import Commands from "@/pages/Commands";
import Settings from "@/pages/Settings";

type TabType = "teams" | "scrims" | "commands" | "settings";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("teams");
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-discord-darker text-foreground">
      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={sidebarOpen} 
        toggleSidebar={toggleSidebar} 
      />
      
      {/* Main Content */}
      <main className="flex-1">
        <Header 
          activeTab={activeTab} 
          toggleSidebar={toggleSidebar} 
        />
        
        {/* Content Area */}
        <div className="p-4 md:p-6 min-h-[calc(100vh-57px)] bg-discord-darkest">
          {activeTab === "teams" && <Teams />}
          {activeTab === "scrims" && <Scrims />}
          {activeTab === "commands" && <Commands />}
          {activeTab === "settings" && <Settings />}
        </div>
      </main>
      
      {/* Mobile Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-discord-darker border-t border-discord-dark flex z-30">
        <button 
          onClick={() => setActiveTab("teams")} 
          className={`flex flex-1 flex-col items-center py-2 ${activeTab === "teams" ? "text-discord-blue" : "text-gray-300"}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <span className="text-xs mt-1">Teams</span>
        </button>
        
        <button 
          onClick={() => setActiveTab("scrims")} 
          className={`flex flex-1 flex-col items-center py-2 ${activeTab === "scrims" ? "text-discord-blue" : "text-gray-300"}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span className="text-xs mt-1">Scrims</span>
        </button>
        
        <button 
          onClick={() => setActiveTab("commands")} 
          className={`flex flex-1 flex-col items-center py-2 ${activeTab === "commands" ? "text-discord-blue" : "text-gray-300"}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"></path>
          </svg>
          <span className="text-xs mt-1">Commands</span>
        </button>
        
        <button 
          onClick={() => setActiveTab("settings")} 
          className={`flex flex-1 flex-col items-center py-2 ${activeTab === "settings" ? "text-discord-blue" : "text-gray-300"}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          <span className="text-xs mt-1">Settings</span>
        </button>
      </div>
    </div>
  );
}
