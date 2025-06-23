import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import ScrimModal from "@/components/ScrimModal";
import { Scrim } from "@/lib/types";
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

export default function Scrims() {
  const [scrimFilter, setScrimFilter] = useState("");
  const [showScrimModal, setShowScrimModal] = useState(false);
  const [currentScrim, setCurrentScrim] = useState<Scrim | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [scrimToDeleteId, setScrimToDeleteId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: scrims = [], isLoading } = useQuery<Scrim[]>({
    queryKey: ['/api/scrims'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const deleteScrimMutation = useMutation({
    mutationFn: async (scrimId: number) => {
      await apiRequest('DELETE', `/api/scrims/${scrimId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scrims'] });
      toast({
        title: "Scrim deleted",
        description: "The scrim has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting scrim",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const openScrimModal = (scrim: Scrim | null = null) => {
    setCurrentScrim(scrim);
    setShowScrimModal(true);
  };

  const handleDeleteScrim = (scrimId: number) => {
    setScrimToDeleteId(scrimId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (scrimToDeleteId) {
      deleteScrimMutation.mutate(scrimToDeleteId);
    }
    setShowDeleteConfirm(false);
  };

  const getStatusClass = (status: string) => {
    switch(status) {
      case 'completed': return 'status-completed';
      case 'scheduled': return 'status-scheduled';
      case 'open': return 'status-open';
      case 'cancelled': return 'status-cancelled';
      default: return 'bg-gray-500';
    }
  };

  const filteredScrims = scrims.filter((scrim: Scrim) => {
    if (!scrimFilter) return true;
    
    const searchTerm = scrimFilter.toLowerCase();
    return (
      scrim.team1Name.toLowerCase().includes(searchTerm) ||
      (scrim.team2Name && scrim.team2Name.toLowerCase().includes(searchTerm)) ||
      scrim.date.includes(searchTerm) ||
      scrim.status.includes(searchTerm)
    );
  });

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative">
          <Input
            type="text"
            value={scrimFilter}
            onChange={(e) => setScrimFilter(e.target.value)}
            placeholder="Search scrims..."
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
          onClick={() => openScrimModal()} 
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
          Add New Scrim
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Teams</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Games</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-discord-darkest bg-discord-dark">
                {filteredScrims.length > 0 ? (
                  filteredScrims.map((scrim: Scrim) => (
                    <tr key={scrim.id} className="hover:bg-discord-darker">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        <div className="flex flex-col">
                          <span>{scrim.date}</span>
                          <span className="text-xs text-gray-400">{scrim.time}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                        <div className="flex flex-col">
                          <span>{scrim.team1Name}</span>
                          {scrim.team2Name ? (
                            <span>vs {scrim.team2Name}</span>
                          ) : (
                            <span className="text-gray-500 text-xs italic">Waiting for opponent</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                        <span>{scrim.games} games</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`status-badge ${getStatusClass(scrim.status)}`}>
                          {scrim.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 flex space-x-2">
                        <button 
                          onClick={() => openScrimModal(scrim)} 
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
                          onClick={() => handleDeleteScrim(scrim.id)} 
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
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-400">
                      No scrims found. Schedule a new scrim to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Scrim Modal */}
      {showScrimModal && (
        <ScrimModal
          scrim={currentScrim}
          onClose={() => setShowScrimModal(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-discord-darker border border-discord-dark">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              This will permanently delete the scrim.
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
