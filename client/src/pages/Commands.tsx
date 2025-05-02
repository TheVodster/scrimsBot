import { Card, CardContent } from "@/components/ui/card";

export default function Commands() {
  return (
    <div className="bg-discord-dark rounded-lg p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Bot Commands Reference</h2>
      <p className="text-gray-300 mb-6">These are the commands available to users of the Discord bot.</p>
      
      <div className="space-y-6">
        {/* Team Captain Command */}
        <Card className="border border-discord-dark bg-discord-darker">
          <CardContent className="pt-6">
            <div className="flex items-start mb-3">
              <div className="bg-discord-blue p-2 rounded text-white">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <polyline points="16 11 18 13 22 9"></polyline>
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-white">/create-team</h3>
                <p className="text-gray-300 text-sm">Create a new team (Team Captain)</p>
              </div>
            </div>
            <div className="bg-discord-darkest p-3 rounded-md font-mono text-sm text-gray-200">
              <p>/create-team team_name:[Team Name] in_game_id:[Your ID]</p>
            </div>
            <div className="mt-3 text-sm text-gray-300">
              <p>Creates a new team with you as the captain. You must provide your in-game ID and a unique team name.</p>
            </div>
          </CardContent>
        </Card>
        
        {/* Join Team Command */}
        <Card className="border border-discord-dark bg-discord-darker">
          <CardContent className="pt-6">
            <div className="flex items-start mb-3">
              <div className="bg-discord-green p-2 rounded text-white">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M19 8v6"></path>
                  <path d="M16 11h6"></path>
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-white">/join-team</h3>
                <p className="text-gray-300 text-sm">Join an existing team (Team Player)</p>
              </div>
            </div>
            <div className="bg-discord-darkest p-3 rounded-md font-mono text-sm text-gray-200">
              <p>/join-team team_name:[Team Name] in_game_id:[Your ID]</p>
            </div>
            <div className="mt-3 text-sm text-gray-300">
              <p>Join an existing team by specifying the team name and your in-game ID.</p>
            </div>
          </CardContent>
        </Card>
        
        {/* Schedule Scrim Command */}
        <Card className="border border-discord-dark bg-discord-darker">
          <CardContent className="pt-6">
            <div className="flex items-start mb-3">
              <div className="bg-discord-blue p-2 rounded text-white">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                  <path d="M8 14h.01"></path>
                  <path d="M12 14h.01"></path>
                  <path d="M16 14h.01"></path>
                  <path d="M8 18h.01"></path>
                  <path d="M12 18h.01"></path>
                  <path d="M16 18h.01"></path>
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-white">/schedule-scrim</h3>
                <p className="text-gray-300 text-sm">Schedule a new scrim (Team Captain)</p>
              </div>
            </div>
            <div className="bg-discord-darkest p-3 rounded-md font-mono text-sm text-gray-200">
              <p>/schedule-scrim date:[YYYY-MM-DD] time:[HH:MM] games:[Number]</p>
            </div>
            <div className="mt-3 text-sm text-gray-300">
              <p>Schedule a new scrim session. You must be a team captain to use this command.</p>
            </div>
          </CardContent>
        </Card>
        
        {/* Join Scrim Command */}
        <Card className="border border-discord-dark bg-discord-darker">
          <CardContent className="pt-6">
            <div className="flex items-start mb-3">
              <div className="bg-discord-green p-2 rounded text-white">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M15 5v2"></path>
                  <path d="M15 11v2"></path>
                  <path d="M15 17v2"></path>
                  <path d="M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7a2 2 0 0 1 2-2z"></path>
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-white">/join-scrim</h3>
                <p className="text-gray-300 text-sm">Join an open scrim (Team Captain)</p>
              </div>
            </div>
            <div className="bg-discord-darkest p-3 rounded-md font-mono text-sm text-gray-200">
              <p>/join-scrim scrim_id:[ID]</p>
            </div>
            <div className="mt-3 text-sm text-gray-300">
              <p>Join an open scrim by specifying its ID. Only team captains can use this command.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
