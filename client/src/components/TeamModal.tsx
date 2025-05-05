import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Team, TeamMember } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface TeamModalProps {
  team: Team | null;
  onClose: () => void;
}

export default function TeamModal({ team, onClose }: TeamModalProps) {
  const isEditMode = !!team;
  const { toast } = useToast();

  const [formData, setFormData] = useState<{
    name: string;
    captainDiscordId: string;
    captainUsername: string;
    captainInGameId: string;
    members: {
      id?: number;
      discordId: string;
      username: string;
      inGameId: string;
      isCaptain?: boolean;
    }[];
  }>({
    name: "",
    captainDiscordId: "",
    captainUsername: "",
    captainInGameId: "",
    members: [],
  });

  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name,
        captainDiscordId: team.captainDiscordId || "",
        captainUsername: team.captainUsername,
        captainInGameId: team.captainInGameId,
        members: team.members.map(member => ({
          id: member.id,
          discordId: member.discordId,
          username: member.username,
          inGameId: member.inGameId,
          isCaptain: member.isCaptain
        }))
      });
    }
  }, [team]);

  const handleCaptainSelect = (index: number) => {
    const updatedMembers = formData.members.map((member, i) => ({
      ...member,
      isCaptain: i === index
    }));

    // console.log(updatedMembers);
    setFormData({
      ...formData,
      members: updatedMembers,
      captainDiscordId: updatedMembers[index].discordId,
      captainUsername: updatedMembers[index].username,
      captainInGameId: updatedMembers[index].inGameId,
    });

    // console.log(`${updatedMembers[index].username} is the new captain`);
  };

  const createTeamMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/teams', {
        name: data.name,
        captainDiscordId: data.captainDiscordId,
        captainUsername: data.captainUsername,
        captainInGameId: data.captainInGameId
      });
      return response.json();
    },
    onSuccess: async (newTeam) => {
      // Create team members
      for (const member of formData.members) {
        if (!member.isCaptain) {
          await apiRequest('POST', '/api/team-members', {
            teamId: newTeam.id,
            discordId: member.discordId,
            username: member.username,
            inGameId: member.inGameId,
            isCaptain: false
          });
        } else {
          await apiRequest('POST', '/api/team-members', {
            teamId: newTeam.id,
            discordId: member.discordId,
            username: member.username,
            inGameId: member.inGameId,
            isCaptain: true
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      toast({
        title: "Team created",
        description: "The team has been successfully created.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error creating team",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  });

  const updateTeamMutation = useMutation({
    mutationFn: async (data: any) => {
      // Update team
      await apiRequest('PUT', `/api/teams/${team?.id}`, {
        name: data.name,
        captainDiscordId: data.captainDiscordId,
        captainUsername: data.captainUsername,
        captainInGameId: data.captainInGameId
      });

      // Handle members (update, create, delete)
      //const currentMembers = team?.members || [];

      // console.log(`Update Mutation Array: `);
      // console.log(data.members);

      for (const member of data.members) {
        let response;
        if (member.id) {
          response = await apiRequest("PUT", `/api/team-members/${member.id}`, {
            discordId: member.discordId,
            username: member.username,
            inGameId: member.inGameId,
            isCaptain: member.isCaptain,
          });
        } else {
          response = await apiRequest("POST", "/api/team-members", {
            teamId: team?.id,
            discordId: member.discordId,
            username: member.username,
            inGameId: member.inGameId,
            isCaptain: member.isCaptain,
          });
        }
        // console.log("Member update / creation response: ", response);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["/api/teams"]});
      toast({
        title: "Team updated",
        description: "The team has been successfully updated.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error updating team",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  const handleMemberChange = (index: number, field: string, value: string) => {
    const updatedMembers = [...formData.members];
    updatedMembers[index] = {
      ...updatedMembers[index],
      [field]: value
    };
    // If editing the captain fields directly in member row then update the team's captain info accordingly
    if (updatedMembers[index].isCaptain) {
      setFormData({
        ...formData,
        captainUsername: updatedMembers[index].username,
        captainInGameId: updatedMembers[index].inGameId,
        captainDiscordId: updatedMembers[index].discordId,
        members: updatedMembers
      });
    } else {
      setFormData({
        ...formData,
        members: updatedMembers
      });
    }
  };

  const addMember = () => {
    setFormData({
      ...formData,
      members: [
        ...formData.members,
        { discordId: "", username: "", inGameId: "" }
      ]
    });
  };

  const removeMember = (index: number) => {
    const updatedMembers = [...formData.members];
    updatedMembers.splice(index, 1);
    setFormData({
      ...formData,
      members: updatedMembers
    });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.captainDiscordId || !formData.captainUsername || !formData.captainInGameId) {
      toast({
        title: "Validation error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate or empty member fields
    for (const member of formData.members) {
      if (!member.discordId || !member.username || !member.inGameId) {
        toast({
          title: "Validation error",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }
    }

    if (isEditMode) {
      updateTeamMutation.mutate(formData);
    } else {
      createTeamMutation.mutate(formData);
    }
  };

  const isLoading = createTeamMutation.isPending || updateTeamMutation.isPending;

  return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="bg-discord-darker border-discord-dark text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Team" : "Create New Team"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label htmlFor="team_name" className="block text-sm font-medium text-gray-300 mb-1">Team Name</label>
              <Input
                  type="text"
                  id="team_name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="bg-discord-dark text-gray-100"
                  placeholder="Enter team name"
              />
            </div>

            <div>
              <label htmlFor="captain_discord" className="block text-sm font-medium text-gray-300 mb-1">Captain Discord ID</label>
              <Input
                  type="text"
                  id="captain_discord"
                  value={formData.captainDiscordId}
                  onChange={(e) => handleInputChange("captainDiscordId", e.target.value)}
                  className="bg-discord-dark text-gray-100"
                  placeholder="Discord ID"
              />
            </div>

            <div>
              <label htmlFor="team_captain" className="block text-sm font-medium text-gray-300 mb-1">Team Captain</label>
              <Input
                  type="text"
                  id="team_captain"
                  value={formData.captainUsername}
                  onChange={(e) => handleInputChange("captainUsername", e.target.value)}
                  className="bg-discord-dark text-gray-100"
                  placeholder="Discord username with tag"
              />
            </div>

            <div>
              <label htmlFor="captain_id" className="block text-sm font-medium text-gray-300 mb-1">Captain In-Game ID</label>
              <Input
                  type="text"
                  id="captain_id"
                  value={formData.captainInGameId}
                  onChange={(e) => handleInputChange("captainInGameId", e.target.value)}
                  className="bg-discord-dark text-gray-100"
                  placeholder="In-game identifier"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-300">Team Members</label>
                <Button
                    onClick={addMember}
                    size="sm"
                    className="bg-discord-blue hover:bg-opacity-80 text-white text-xs"
                >
                  <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-1"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add Member
                </Button>
              </div>

              <div className="space-y-2">
                {formData.members.map((member, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                          type="text"
                          value={member.discordId}
                          onChange={(e) => handleMemberChange(index, "discordId", e.target.value)}
                          className="bg-discord-dark text-gray-100 w-1/3"
                          placeholder="Discord ID"
                      />
                      <Input
                          type="text"
                          value={member.username}
                          onChange={(e) => handleMemberChange(index, "username", e.target.value)}
                          className="bg-discord-dark text-gray-100 flex-1"
                          placeholder="Discord username"
                          //disabled={member.isCaptain}
                      />
                      <Input
                          type="text"
                          value={member.inGameId}
                          onChange={(e) => handleMemberChange(index, "inGameId", e.target.value)}
                          className="bg-discord-dark text-gray-100 w-1/3"
                          placeholder="In-game ID"
                          //disabled={member.isCaptain}
                      />
                      <Button
                          variant="outline"
                          onClick={() => handleCaptainSelect(index)}
                          className="bg-discord-dark text-white border-none"
                      >
                        <input
                            type="radio"
                            name="captainRadio"
                            checked={member.isCaptain || false}
                            readOnly
                            className="mr-1"
                        />
                      </Button>
                      <button
                          onClick={() => removeMember(index)}
                          className="text-discord-red hover:text-discord-red hover:bg-discord-dark p-2 rounded"
                          disabled={member.isCaptain}
                      >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                ))}
                {formData.members.length === 0 && (
                    <p className="text-sm text-gray-400 italic">No members added yet.</p>
                )}
              </div>
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