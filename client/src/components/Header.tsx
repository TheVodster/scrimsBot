type TabType = "teams" | "scrims" | "commands" | "settings";

interface HeaderProps {
  activeTab: TabType;
  toggleSidebar: () => void;
}

export default function Header({ activeTab, toggleSidebar }: HeaderProps) {
  const getHeaderTitle = () => {
    switch (activeTab) {
      case "teams": return "Team Management";
      case "scrims": return "Scrim Scheduling";
      case "commands": return "Bot Commands";
      case "settings": return "Settings";
    }
  };
  
  const refreshData = () => {
    window.location.reload();
  };
  
  return (
    <header className="bg-discord-dark border-b border-discord-darkest px-4 py-3 flex items-center justify-between">
      <div className="flex items-center">
        <button 
          onClick={toggleSidebar} 
          className="mr-2 lg:hidden text-gray-300 hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-white">{getHeaderTitle()}</h1>
      </div>
      <div className="flex items-center space-x-3">
        <button 
          onClick={refreshData}
          className="bg-discord-blue hover:bg-opacity-80 text-white px-3 py-1.5 rounded-md text-sm flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>
          </svg>
          Refresh Data
        </button>
      </div>
    </header>
  );
}
