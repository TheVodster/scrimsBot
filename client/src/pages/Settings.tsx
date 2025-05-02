import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const [botToken, setBotToken] = useState("••••••••••••••••••••••••••");
  const [commandPrefix, setCommandPrefix] = useState("/");
  const [dbType, setDbType] = useState("MongoDB");
  const [dbConnection, setDbConnection] = useState("••••••••••••••••••••••••••");
  const [autoBackup, setAutoBackup] = useState(false);
  const [permissions, setPermissions] = useState({
    admin: true,
    manageChannels: true,
    manageRoles: true
  });
  
  const { toast } = useToast();
  
  const handleSaveSettings = () => {
    toast({
      title: "Settings saved",
      description: "Your bot settings have been saved successfully.",
    });
  };
  
  const handleResetSettings = () => {
    setBotToken("••••••••••••••••••••••••••");
    setCommandPrefix("/");
    setDbType("MongoDB");
    setDbConnection("••••••••••••••••••••••••••");
    setAutoBackup(false);
    setPermissions({
      admin: true,
      manageChannels: true,
      manageRoles: true
    });
    
    toast({
      title: "Settings reset",
      description: "Your bot settings have been reset to default values.",
    });
  };
  
  const handleTestConnection = () => {
    toast({
      title: "Connection successful",
      description: "Database connection test completed successfully.",
    });
  };
  
  return (
    <div className="bg-discord-dark rounded-lg p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Bot Settings</h2>
      <p className="text-gray-300 mb-6">Configure your Discord bot and database settings.</p>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Discord Bot Settings */}
        <div className="border border-discord-darkest rounded-lg p-4">
          <h3 className="text-lg font-medium text-white mb-4">Discord Bot Configuration</h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="bot_token" className="text-gray-300 mb-1">Bot Token</Label>
              <Input 
                type="password" 
                id="bot_token" 
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                className="bg-discord-darker text-gray-100 focus:ring-discord-blue"
                placeholder="Enter bot token"
              />
            </div>
            
            <div>
              <Label htmlFor="command_prefix" className="text-gray-300 mb-1">Command Prefix</Label>
              <Input 
                type="text" 
                id="command_prefix" 
                value={commandPrefix}
                onChange={(e) => setCommandPrefix(e.target.value)}
                className="bg-discord-darker text-gray-100 focus:ring-discord-blue"
                placeholder="Enter command prefix"
              />
            </div>
            
            <div>
              <Label className="text-gray-300 mb-2 block">Permissions</Label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <Checkbox 
                    id="perm_admin" 
                    checked={permissions.admin}
                    onCheckedChange={(checked) => 
                      setPermissions({...permissions, admin: checked === true})
                    }
                    className="bg-discord-darker border-discord-dark data-[state=checked]:bg-discord-blue data-[state=checked]:border-discord-blue"
                  />
                  <Label htmlFor="perm_admin" className="text-gray-200 ml-2">Administrator</Label>
                </div>
                <div className="flex items-center">
                  <Checkbox 
                    id="perm_manage_channels" 
                    checked={permissions.manageChannels}
                    onCheckedChange={(checked) => 
                      setPermissions({...permissions, manageChannels: checked === true})
                    }
                    className="bg-discord-darker border-discord-dark data-[state=checked]:bg-discord-blue data-[state=checked]:border-discord-blue"
                  />
                  <Label htmlFor="perm_manage_channels" className="text-gray-200 ml-2">Manage Channels</Label>
                </div>
                <div className="flex items-center">
                  <Checkbox 
                    id="perm_manage_roles" 
                    checked={permissions.manageRoles}
                    onCheckedChange={(checked) => 
                      setPermissions({...permissions, manageRoles: checked === true})
                    }
                    className="bg-discord-darker border-discord-dark data-[state=checked]:bg-discord-blue data-[state=checked]:border-discord-blue"
                  />
                  <Label htmlFor="perm_manage_roles" className="text-gray-200 ml-2">Manage Roles</Label>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Database Settings */}
        <div className="border border-discord-darkest rounded-lg p-4">
          <h3 className="text-lg font-medium text-white mb-4">Database Configuration</h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="db_type" className="text-gray-300 mb-1">Database Type</Label>
              <Select value={dbType} onValueChange={setDbType}>
                <SelectTrigger className="bg-discord-darker text-gray-100 border-discord-dark focus:ring-discord-blue">
                  <SelectValue placeholder="Select database type" />
                </SelectTrigger>
                <SelectContent className="bg-discord-darker border-discord-dark">
                  <SelectItem value="MongoDB" className="text-gray-100 focus:bg-discord-dark focus:text-white">MongoDB</SelectItem>
                  <SelectItem value="MySQL" className="text-gray-100 focus:bg-discord-dark focus:text-white">MySQL</SelectItem>
                  <SelectItem value="PostgreSQL" className="text-gray-100 focus:bg-discord-dark focus:text-white">PostgreSQL</SelectItem>
                  <SelectItem value="SQLite" className="text-gray-100 focus:bg-discord-dark focus:text-white">SQLite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="db_connection" className="text-gray-300 mb-1">Connection String</Label>
              <Input 
                type="password" 
                id="db_connection" 
                value={dbConnection}
                onChange={(e) => setDbConnection(e.target.value)}
                className="bg-discord-darker text-gray-100 focus:ring-discord-blue"
                placeholder="Enter connection string"
              />
            </div>
            
            <div>
              <Label className="text-gray-300 mb-1 block">Data Backup</Label>
              <div className="flex items-center justify-between bg-discord-darker rounded-md px-3 py-2">
                <span className="text-gray-200">Auto Backup</span>
                <Switch
                  checked={autoBackup}
                  onCheckedChange={setAutoBackup}
                  className="data-[state=checked]:bg-discord-blue"
                />
              </div>
            </div>
            
            <div>
              <Button 
                onClick={handleTestConnection}
                className="bg-discord-blue hover:bg-opacity-80 text-white mt-2"
              >
                Test Connection
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 flex justify-end space-x-3">
        <Button 
          onClick={handleResetSettings}
          className="bg-discord-dark hover:bg-discord-darker text-white"
        >
          Reset to Default
        </Button>
        <Button 
          onClick={handleSaveSettings}
          className="bg-discord-green hover:bg-opacity-80 text-white"
        >
          Save Settings
        </Button>
      </div>
    </div>
  );
}
