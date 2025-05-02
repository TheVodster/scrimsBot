import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Team schema
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  captainDiscordId: text("captain_discord_id").notNull(),
  captainUsername: text("captain_username").notNull(),
  captainInGameId: text("captain_in_game_id").notNull(),
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true
});

// Team Member schema
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  discordId: text("discord_id").notNull(),
  username: text("username").notNull(),
  inGameId: text("in_game_id").notNull(),
  isCaptain: boolean("is_captain").notNull().default(false),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true
});

// Scrim schema
export const scrims = pgTable("scrims", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // Format YYYY-MM-DD
  time: text("time").notNull(), // Format HH:MM
  games: integer("games").notNull().default(3),
  team1Id: integer("team1_id").notNull(),
  team2Id: integer("team2_id"),
  status: text("status").notNull().default("open"), // "open", "scheduled", "completed", "cancelled"
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertScrimSchema = createInsertSchema(scrims).omit({
  id: true,
  createdAt: true
});

// Types
export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;

export type Scrim = typeof scrims.$inferSelect;
export type InsertScrim = z.infer<typeof insertScrimSchema>;

// Extended types for the UI
export type TeamWithMembers = Team & {
  members: TeamMember[];
};

export type ScrimWithTeams = Scrim & {
  team1Name: string;
  team2Name?: string;
};
