import { discordClient } from "./bot";
import { readConfig } from "./commands";
import { Team } from "@shared/schema";
import { storage } from "../storage";
import { createGunzip } from "zlib";

export async function syncTeamRoles(updated: Team, previous?: Team) {
    const cfg = readConfig();
    if (!discordClient.guilds.cache.size) return;
    const guild = discordClient.guilds.cache.first()!;

    // static captain role
    if (cfg.captainRoleId && previous?.captainDiscordId !== updated.captainDiscordId) {
        // remove old
        if (previous) {
            const oldMember = await guild.members.fetch(previous.captainDiscordId).catch(() => null);
            if (oldMember) await oldMember.roles.remove(cfg.captainRoleId);
        }

        // add new
        const newMember = await guild.members.fetch(updated.captainDiscordId).catch(() => null);
        if (newMember) await newMember.roles.add(cfg.captainRoleId);
    }

    // team scoped role
    // find it by name 
    let teamRole = guild.roles.cache.find(r => r.name === updated.name);
    if(!teamRole) {
        // if it doesnt exist create one
        teamRole = await guild.roles.create({
            name: updated.name,
            color: "Random",
            permissions: [],
            mentionable: true,
        });
        const coachRole = guild.roles.cache.find(r => r.name.toLowerCase() === "coach");
        if (coachRole) {
            await teamRole.setPosition(coachRole.position - 1);
        }
    } else if (previous && previous.name !== updated.name) {
        // rename if the team got renamed
        await teamRole.setName(updated.name);
    }

    // sync members
    const members = await storage.getTeamMembers(updated.id);
    const memberIds = new Set(members.map(m => m.discordId));

    // grant to everyone whos in the DB
    for (const m of members) {
        const mem = await guild.members.fetch(m.discordId).catch(() => null);
        if (mem && !mem.roles.cache.has(teamRole.id)) {
            await mem.roles.add(teamRole);
        }
    }

    // revoke from anyone who was removed
    for (const [memberId] of teamRole.members) {
        if (!memberIds.has(memberId)) {
            const m = await guild.members.fetch(memberId).catch(() => null);
            if (m) await m.roles.remove(teamRole);
        }
    }
}

export async function deleteTeamResources(team: Team) {
    if (!discordClient?.guilds.cache.size) return;
    const guild = discordClient.guilds.cache.first()!;
    const cfg = readConfig();

    // remove the catpain role from the captain
    if (cfg.captainRoleId) {
        const captain = await guild.members.fetch(team.captainDiscordId).catch(() => null);
        if(captain && captain.roles.cache.has(cfg.captainRoleId)) {
            try {
                await captain.roles.remove(cfg.captainRoleId, "Team was deleted");
            } catch (error) {
                console.error(`Failed to remove captain role from ${captain.user.tag}:`, error);
            }
        }
    }
    
    // delete the team role
    const role = guild.roles.cache.find(r => r.name === team.name);
    if (role) {
        try {
            await role.delete("Team role was deleted");
        } catch (error) {
            console.error(`Failed to delete role ${role.name}:`, error);
        }
    }

    // delete the team channel
    if (team.channelId) {
        // prefer cache first, fallback to fetch
        const channel =
            guild.channels.cache.get(team.channelId) ||
            await guild.channels.fetch(team.channelId).catch(() => null);
        if (channel) {
            try {
                await channel.delete("Team channel was deleted");
            } catch (error) {
                console.error(`Failed to delete channel ${channel.name}:`, error);
            }
        }
    }
}