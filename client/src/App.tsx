import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import { connectToWebSocket, disconnectWebSocket } from "@/lib/websocket";
import { queryClient } from "@/lib/queryClient";

function App() {
  useEffect(() => {
    // Connect to WebSocket when the app loads
    connectToWebSocket();
    
    // Setup event listeners for real-time updates
    const handleTeamsUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
    };
    
    const handleScrimsUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scrims'] });
    };
    
    // Register event listeners
    document.addEventListener('ws:teams-updated', handleTeamsUpdate);
    document.addEventListener('ws:scrims-updated', handleScrimsUpdate);
    
    // Cleanup on unmount
    return () => {
      disconnectWebSocket();
      document.removeEventListener('ws:teams-updated', handleTeamsUpdate);
      document.removeEventListener('ws:scrims-updated', handleScrimsUpdate);
    };
  }, []);
  
  return (
    <TooltipProvider>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route component={NotFound} />
      </Switch>
    </TooltipProvider>
  );
}

export default App;
