import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import TeamModal from "@/components/TeamModal";
import { Team } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function Teams() {
  const [teamFilter, setTeamFilter] = useState("");
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [teamToDeleteId, setTeamToDeleteId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: teams = [], isLoading } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId: number) => {
      await apiRequest('DELETE', `/api/teams/${teamId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      toast({
        title: "Team deleted",
        description: "The team has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting team",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const openTeamModal = (team: Team | null = null) => {
    setCurrentTeam(team);
    setShowTeamModal(true);
  };

  const handleDeleteTeam = (teamId: number) => {
    setTeamToDeleteId(teamId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (teamToDeleteId) {
      deleteTeamMutation.mutate(teamToDeleteId);
    }
    setShowDeleteConfirm(false);
  };

  const filteredTeams = teams.filter((team: Team) => {
    if (!teamFilter) return true;
    
    const searchTerm = teamFilter.toLowerCase();
    return (
      team.name.toLowerCase().includes(searchTerm) ||
      team.captainUsername.toLowerCase().includes(searchTerm)
    );
  });

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative">
          <Input
            type="text"
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            placeholder="Search teams..."
            className="bg-discord-dark text-gray-100 pl-9 w-full sm:w-64"
          />
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="absolute left-3 top-2.5 text-gray-400" 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <Button 
          onClick={() => openTeamModal()} 
          className="bg-discord-green hover:bg-opacity-80 text-white"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="mr-1.5" 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add New Team
        </Button>
      </div>

      <div className="bg-discord-dark rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <svg 
              className="animate-spin h-8 w-8 text-discord-blue" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              ></circle>
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-discord-darkest">
              <thead className="bg-discord-darker">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Team Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Captain</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Members</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-discord-darkest bg-discord-dark">
                {filteredTeams.length > 0 ? (
                  filteredTeams.map((team: Team) => (
                    <tr key={team.id} className="hover:bg-discord-darker">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{team.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                        <div className="flex flex-col">
                          <span>{team.captainUsername}</span>
                          <span className="text-xs text-gray-400 font-mono">ID: {team.captainInGameId}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                        <span className="px-2 py-1 rounded-full bg-discord-darker text-xs">{team.members.length} members</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 flex space-x-2">
                        <button 
                          onClick={() => openTeamModal(team)} 
                          className="text-discord-blue hover:text-discord-blue hover:bg-discord-darker p-1 rounded"
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
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleDeleteTeam(team.id)} 
                          className="text-discord-red hover:text-discord-red hover:bg-discord-darker p-1 rounded"
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
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-400">
                      No teams found. Create a new team to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Team Modal */}
      {showTeamModal && (
        <TeamModal
          team={currentTeam}
          onClose={() => setShowTeamModal(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-discord-darker border border-discord-dark">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              This will permanently delete the team and remove all members.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-discord-dark text-white hover:bg-discord-dark hover:text-gray-200 border-none">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-discord-red hover:bg-opacity-90 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
