// File: client/src/pages/Commands.tsx
import { Card, CardContent } from "@/components/ui/card";

const commands = [
  {
    title: "/create-team",
    description: "Create a new team (Team Captain)",
    usage: "/create-team",
    details: "Creates a new team with and assigns the creator [DiscordId, Discord username] as captain. Requires a unique [Team Name] and [In-Game ID].",
    icon: (
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
    ),
  },
  {
    title: "/join-team",
    description: "Join an existing team (Team Player)",
    usage: "/join-team team_name:[Team Name] in_game_id:[Your ID]",
    details: "Joins an existing team by providing the team name and your in-game ID.",
    icon: (
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
    ),
  },
  {
    title: "/schedule-scrim",
    description: "Schedule a new scrim (Team Captain)",
    usage: "/schedule-scrim date:[YYYY-MM-DD] time:[HH:MM] games:[Number]",
    details: "Schedules a scrim session. Only team captains can schedule scrims by providing date, time and number of games.",
    icon: (
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
    ),
  },
  {
    title: "/scrims",
    description: "Display available scrims (Team Captain)",
    usage: "/scrims",
    details: "Lists currently open scrims that a team captain can join. Only shows scrims that are open for joining.",
    icon: (
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
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    ),
  },
];

export default function Commands() {
  return (
    <div className="bg-discord-dark rounded-lg p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Bot Commands Reference</h2>
      <p className="text-gray-300 mb-6">
        These are the commands available to users of the Discord bot.
      </p>
      <div className="space-y-6">
        {commands.map((command, index) => (
          <Card key={index} className="border border-discord-dark bg-discord-darker">
            <CardContent className="pt-6">
              <div className="flex items-start mb-3">
                <div className="bg-discord-blue p-2 rounded text-white">
                  {command.icon}
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-white">{command.title}</h3>
                  <p className="text-gray-300 text-sm">{command.description}</p>
                </div>
              </div>
              <div className="bg-discord-darkest p-3 rounded-md font-mono text-sm text-gray-200">
                <p>{command.usage}</p>
              </div>
              <div className="mt-3 text-sm text-gray-300">
                <p>{command.details}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}