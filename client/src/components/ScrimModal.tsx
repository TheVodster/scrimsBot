import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Scrim, StatusType, Team } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ScrimModalProps {
  scrim: Scrim | null;
  onClose: () => void;
}

export default function ScrimModal({ scrim, onClose }: ScrimModalProps) {
  const isEditMode = !!scrim;
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<{
    date: string;
    time: string;
    games: number;
    team1Id: number;
    team2Id?: number;
    status: StatusType;
  }>({
    date: "",
    time: "",
    games: 3,
    team1Id: 0,
    team2Id: undefined,
    status: "open"
  });
  
  // Fetch teams for dropdowns
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
  });
  
  useEffect(() => {
    if (scrim) {
      setFormData({
        date: scrim.date,
        time: scrim.time,
        games: scrim.games,
        team1Id: scrim.team1Id,
        team2Id: scrim.team2Id,
        status: scrim.status as StatusType
      });
    }
  }, [scrim]);
  
  const createScrimMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/scrims', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scrims'] });
      toast({
        title: "Scrim created",
        description: "The scrim has been successfully created.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error creating scrim",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  });
  
  const updateScrimMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest('PUT', `/api/scrims/${scrim?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scrims'] });
      toast({
        title: "Scrim updated",
        description: "The scrim has been successfully updated.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error updating scrim",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  });
  
  const handleInputChange = (field: string, value: any) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };
  
  const validateForm = () => {
    if (!formData.date) {
      toast({
        title: "Validation error",
        description: "Please enter a date for the scrim.",
        variant: "destructive",
      });
      return false;
    }
    
    if (!formData.time) {
      toast({
        title: "Validation error",
        description: "Please enter a time for the scrim.",
        variant: "destructive",
      });
      return false;
    }
    
    if (!formData.team1Id) {
      toast({
        title: "Validation error",
        description: "Please select a team for the scrim.",
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = () => {
    if (!validateForm()) return;
    
    if (isEditMode) {
      updateScrimMutation.mutate(formData);
    } else {
      createScrimMutation.mutate(formData);
    }
  };
  
  const isLoading = createScrimMutation.isPending || updateScrimMutation.isPending;
  
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-discord-darker border-discord-dark text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Scrim" : "Create New Scrim"}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="scrim_date" className="text-gray-300 mb-1">Date</Label>
              <Input 
                type="date"
                id="scrim_date"
                value={formData.date}
                onChange={(e) => handleInputChange("date", e.target.value)}
                className="bg-discord-dark text-gray-100"
              />
            </div>
            
            <div>
              <Label htmlFor="scrim_time" className="text-gray-300 mb-1">Time</Label>
              <Input 
                type="time" 
                id="scrim_time" 
                value={formData.time}
                onChange={(e) => handleInputChange("time", e.target.value)}
                className="bg-discord-dark text-gray-100"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="scrim_games" className="text-gray-300 mb-1">Number of Games</Label>
            <Input 
              type="number" 
              id="scrim_games" 
              value={formData.games}
              onChange={(e) => handleInputChange("games", parseInt(e.target.value))}
              min="1" 
              max="10"
              className="bg-discord-dark text-gray-100"
            />
          </div>
          
          <div>
            <Label htmlFor="scrim_team1" className="text-gray-300 mb-1">Team 1</Label>
            <Select 
              value={formData.team1Id ? formData.team1Id.toString() : ""}
              onValueChange={(value) => handleInputChange("team1Id", parseInt(value))}
            >
              <SelectTrigger className="bg-discord-dark text-gray-100 border-discord-dark">
                <SelectValue placeholder="Select Team" />
              </SelectTrigger>
              <SelectContent className="bg-discord-darker border-discord-dark">
                <SelectItem value="placeholder" disabled>Select Team</SelectItem>
                {teams.map((team: any) => (
                  <SelectItem key={team.id} value={team.id.toString()} className="text-gray-100">
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="scrim_team2" className="text-gray-300 mb-1">Team 2 (Optional)</Label>
            <Select 
              value={formData.team2Id ? formData.team2Id.toString() : ""}
              onValueChange={(value) => handleInputChange("team2Id", value ? parseInt(value) : undefined)}
            >
              <SelectTrigger className="bg-discord-dark text-gray-100 border-discord-dark">
                <SelectValue placeholder="Open for any team" />
              </SelectTrigger>
              <SelectContent className="bg-discord-darker border-discord-dark">
                <SelectItem value="placeholder" className="text-gray-100">Open for any team</SelectItem>
                {teams.map((team: any) => (
                  <SelectItem 
                    key={team.id} 
                    value={team.id.toString()} 
                    disabled={team.id === formData.team1Id}
                    className="text-gray-100"
                  >
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="scrim_status" className="text-gray-300 mb-1">Status</Label>
            <Select 
              value={formData.status}
              onValueChange={(value) => handleInputChange("status", value as StatusType)}
            >
              <SelectTrigger className="bg-discord-dark text-gray-100 border-discord-dark">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-discord-darker border-discord-dark">
                <SelectItem value="open" className="text-gray-100">Open</SelectItem>
                <SelectItem value="scheduled" className="text-gray-100">Scheduled</SelectItem>
                <SelectItem value="completed" className="text-gray-100">Completed</SelectItem>
                <SelectItem value="cancelled" className="text-gray-100">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-discord-dark text-white hover:bg-discord-dark hover:text-gray-300 border-none"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="bg-discord-green hover:bg-opacity-80 text-white"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
