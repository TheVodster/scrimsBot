export type StatusType = "open" | "scheduled" | "completed" | "cancelled";

export interface TeamMember {
  id: number;
  teamId: number;
  discordId: string;
  username: string;
  inGameId: string;
  isCaptain: boolean;
}

export interface Team {
  id: number;
  name: string;
  captain: TeamMember;
  members: TeamMember[];
}

export interface Scrim {
  id: number;
  date: string;
  time: string;
  games: number;
  team1Id: number;
  team2Id?: number;
  status: StatusType;
  createdAt: string;
  team1Name: string;
  team2Name?: string;
}
