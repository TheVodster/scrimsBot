import 'dotenv/config';
import fs, { write } from "fs";
import fetch from "node-fetch";
import {
  ChatInputCommandInteraction,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  CommandInteraction,
  SlashCommandBuilder,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ComponentType,
  PermissionsBitField,
  REST,
  Routes,
  ChannelType
} from "discord.js";
import { IStorage } from "../storage";
import { handleScrimAccepted } from './scrimThread.ts'

const applicationID: string = process.env.APPLICATION_ID!;
const API_BASE = process.env.API_BASE_URL!;

const CONFIG_URL = new URL("../config.json", import.meta.url);
type Config = {
    scrimThreadChannelId: string | null;
    adminRoleId: string | null;
    teamCategoryId: string | null;
    captainRoleId: string | null;
}

export function readConfig(): Config {
  return JSON.parse(
    fs.readFileSync(CONFIG_URL, "utf-8")) as Config;
}

export function writeConfig(cfg: Config): void {
  fs.writeFileSync(
    CONFIG_URL,
    JSON.stringify(cfg, null, 2),
    "utf-8"
  );
}

export function registerCommands(storage: IStorage) {
  const commandFunctions: Record<string, (interaction: ChatInputCommandInteraction) => Promise<void>> = {
    "create-team": async (interaction: CommandInteraction) => {
      if (!interaction.isChatInputCommand()) return;

      // Build the modal for team creation.
      const teamModal = new ModalBuilder()
          .setCustomId("createTeamModal")
          .setTitle("Create Team");
      teamModal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
          .setCustomId("team_name")
          .setLabel("Team Name")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Enter your team name")
          .setRequired(true)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
          .setCustomId("in_game_id")
          .setLabel("In-Game ID")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Enter your in-game ID without server ID (e.g. 1234567)")
          .setRequired(true)
        )
      );
      // show the modal to the user.
      await interaction.showModal(teamModal);

      // only catch modal timeout
      let modalSubmit: ModalSubmitInteraction;
      try {
        modalSubmit = await interaction.awaitModalSubmit({
          filter: i =>
            i.customId === "createTeamModal" && i.user.id === interaction.user.id,
          time: 60000
        });
      } catch {
        return void (
          await interaction.followUp({
            content: "No submission was made in time.",
            ephemeral: true
          })
        );
      }
      
      // extract and validate
      const teamName = modalSubmit.fields.getTextInputValue("team_name").trim();
      const inGameId = modalSubmit.fields.getTextInputValue("in_game_id").trim();
      if (!/^\d+$/.test(inGameId)) {
        return void (
          await modalSubmit.reply({
            content: "In-Game ID must contain only numbers.",
            ephemeral: true 
          })
        );
      }

      // logic checks
      if (await storage.getTeamByName(teamName)) {
        return void (
          await modalSubmit.reply({
            content: `A team named \`${teamName}\` already exists. Please choose a different name.`,
            ephemeral: true
          })
        );
      }
      const oldMember = await storage.getTeamMemberByDiscordId(interaction.user.id);
      if (oldMember) {
        const old = await storage.getTeam(oldMember.teamId);
        return void (
          await modalSubmit.reply({
            content: `You are already a member of the team \`${old?.name}\`. Please leave that team first.`,
            ephemeral: true
          })
        );
      }
      
      // create team and member in storage
      const team = await storage.createTeam({
        name: teamName,
        captainDiscordId: interaction.user.id,
        captainUsername: interaction.user.tag,
        captainInGameId: inGameId,
        channelId: '',
      });
      await storage.createTeamMember({
        teamId: team.id,
        discordId: interaction.user.id,
        username: interaction.user.tag,
        inGameId,
        isCaptain: true,
      });

      const guild = interaction.guild!;
      const cfg = readConfig();

      // create the team scoped role
      const teamRole = await guild.roles.create({
        name: teamName,
        color: "Random",
        permissions: [],
        hoist: true,    // make members appear seperately in member list
        mentionable: true,
      });
      const coachRole = guild.roles.cache.find(r => r.name.toLowerCase() === "coach");
      if (coachRole) {
        await teamRole.setPosition(coachRole.position - 1);
      }
      const captainMember = await guild.members.fetch(interaction.user.id);
      await captainMember.roles.add(teamRole);

      // assign the configured captain role
      if (cfg.captainRoleId) {
        await captainMember.roles.add(cfg.captainRoleId);
      }

      // verify that the category is set
      if (!cfg.teamCategoryId) {
        return void (
          await modalSubmit.reply({
            content: "Please ask an admin to set the team channels category via /dashboard first.",
            ephemeral: true
          })
        );
      }

      // create private text channel under that category
      const channel = await guild.channels.create({
        name: teamName.toLowerCase().replace(/\s+/g, '-'),
        type: ChannelType.GuildText,
        parent: cfg.teamCategoryId,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          {
            id: teamRole.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
            ],
          },
          {
            id: cfg.adminRoleId!,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
            ],
          },
        ],
      });

      // persist channelId and send welcome embed
      await storage.updateTeam(team.id, { channelId: channel.id });
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('Welcome, Captain!')
            .setDescription(
              `Hello <@${interaction.user.id}> — this is your private team channel for **${teamName}**.\n` +
                'Invite your teammates with `/join-team` and start chatting here!'
            )
            .setColor(0x00ae86),
        ],
      });

      // confirm to user
      await modalSubmit.reply({
        content: `Team \`${teamName}\` created! Check out ${channel}.`,
        ephemeral: false,
      });
    },

    "join-team": async (interaction: CommandInteraction) => {
      if (!interaction.isChatInputCommand()) return;

      // show join modal
      const joinTeamModal = new ModalBuilder()
          .setCustomId("joinTeamModal")
          .setTitle("Join Team");
      joinTeamModal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('team_name')
            .setLabel('Team Name')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Enter the team name")
            .setRequired(true)
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('in_game_id')
            .setLabel('In-Game ID')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Enter your in-game ID without server ID (e.g. 1234567)")
            .setRequired(true)
        )
      );
      await interaction.showModal(joinTeamModal);

      // await submission
      let modalSubmit: ModalSubmitInteraction;
      try {
        modalSubmit = await interaction.awaitModalSubmit({
          filter: i =>
              i.customId === "joinTeamModal" && i.user.id === interaction.user.id,
          time: 60000
        });
      } catch {
        return void (
          await interaction.followUp({
            content: 'No submission was made in time.',
            ephemeral: true,
          })
        );
      }

      // extract and validate
      const teamName = modalSubmit.fields.getTextInputValue("team_name").trim();
      const inGameId = modalSubmit.fields.getTextInputValue("in_game_id").trim();
      if (!/^\d+$/.test(inGameId)) {
        return void (
          await modalSubmit.reply({
            content: "In-Game ID must contain only numbers.",
            ephemeral: true
         })
        );
      }

      // lookup team
      const team = await storage.getTeamByName(teamName);
      if (!team) {
        return void (
          await modalSubmit.reply({
            content: `Team \`${teamName}\` does not exist. Please check the team name.`,
            ephemeral: true
          })
        );
      }
      const oldMember = await storage.getTeamMemberByDiscordId(interaction.user.id);
      if (oldMember) {
        const oldTeam = await storage.getTeam(oldMember.teamId);
        return void (
          await modalSubmit.reply({
            content: `You are already a member of team \`${oldTeam?.name}\`. Please leave that team first.`,
            ephemeral: true,
          })
        );
      }

      // persist member
      await storage.createTeamMember({
        teamId: team.id,
        discordId: interaction.user.id,
        username: interaction.user.tag,
        inGameId,
        isCaptain: false
      });

      // assign the team role
      const guild = interaction.guild!;
      const member = await guild.members.fetch(interaction.user.id);
      const role = guild.roles.cache.find(r => r.name === teamName);
      if (role) {
        await member.roles.add(role);
        // welcome the new members
        const channel = await guild.channels.fetch(team.channelId);
        if (channel?.isTextBased()) {
          await channel.send({
            content: `Welcome <@${interaction.user.id}> to **${teamName}**!`,
            allowedMentions: { users: [interaction.user.id] }
          });
        }
      } else {
        console.warn(`Role for team "${team.name}" not found.`);
      }
      
      await modalSubmit.reply({
        content: `You have successfully joined team \`${teamName}\`. Check out ${guild.channels.cache.get(team.channelId) ?? "the team channel"}.`,
        ephemeral: true,
      });
    },

    "schedule-scrim": async (interaction: ChatInputCommandInteraction) => {
      if (!interaction.isChatInputCommand()) return;
      const member = await storage.getTeamMemberByDiscordId(interaction.user.id);
      if (!member || !member.isCaptain) {
        await interaction.reply({
          content: "Only team captains can schedule scrims.",
          ephemeral: true,
        });
        return;
      }

      // Create a modal with three text inputs: Date, Time, and Number of Games.
      const scrimModal = new ModalBuilder()
          .setCustomId("scrimModal")
          .setTitle("Schedule Scrim");

      const dateInput = new TextInputBuilder()
          .setCustomId("custom_date")
          .setLabel("Enter Date (DD. MM.)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("e.g. 23. 6.")
          .setRequired(true);

      const timeInput = new TextInputBuilder()
          .setCustomId("custom_time")
          .setLabel("Enter Time (HH:MM)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("e.g. 21:30")
          .setRequired(true);

      const gamesInput = new TextInputBuilder()
          .setCustomId("games_input")
          .setLabel("Enter Number of Games")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("e.g. 3")
          .setRequired(true);

      scrimModal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(dateInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(timeInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(gamesInput)
      );

      // Show modal and await submission.
      await interaction.showModal(scrimModal);

      try {
        const modalSubmit = await interaction.awaitModalSubmit({
          filter: (i: any) =>
              i.customId === "scrimModal" && i.user.id === interaction.user.id,
          time: 60000
        });
        const selectedDate = modalSubmit.fields.getTextInputValue("custom_date");
        const selectedTime = modalSubmit.fields.getTextInputValue("custom_time");
        const gamesInputValue = modalSubmit.fields.getTextInputValue("games_input");

        // Validate date format (d. m. or dd. mm.)
        if (!/^\d{1,2}\. \d{1,2}\.$/.test(selectedDate)) {
          await modalSubmit.reply({
            content: "Date must be in d. m. or dd. mm. format (e.g. 5. 5. or 25. 12.).",
            ephemeral: true
          });
          return;
        }
        const [dayStr, monthStr] = selectedDate.split(".");
        const day = parseInt(dayStr, 10);
        const month = parseInt(monthStr, 10);
        if (month < 1 || month > 12) {
          await modalSubmit.reply({
            content: "Month must be between 1 and 12.",
            ephemeral: true
          });
          return;
        }
        if (day < 1 ||day > 31) {
          await modalSubmit.reply({
            content: "Day must be between 1 and 31.",
            ephemeral: true
          });
          return;
        }
        // Handle month-specific limits
        if ((month === 4 || month === 6 || month === 9 || month === 11) && day > 30) {
          await modalSubmit.reply({
            content: "The selected month only has 30 days.",
            ephemeral: true
          });
          return;
        }
        if (month === 2) {
          // For February, determine allowed days based on leap year.
          const currentYear = new Date().getFullYear();
          const isLeap = (currentYear % 4 === 0 && currentYear % 100 !== 0) || (currentYear % 400 === 0);
          const maxFebruaryDay = isLeap ? 29 : 28;
          if (day > maxFebruaryDay) {
            await modalSubmit.reply({
              content: `February in ${currentYear} only has ${maxFebruaryDay} days.`,
              ephemeral: true
            });
            return;
          }
        }

        // Validate time format (HH:MM)
        if (!/^\d{2}:\d{2}$/.test(selectedTime)) {
          await modalSubmit.reply({
            content: "Time must be in HH:MM format (e.g. 21:30).",
            ephemeral: true
          });
          return;
        }
        const [hourStr, minuteStr] = selectedTime.split(":");
        const hour = parseInt(hourStr, 10);
        const minute = parseInt(minuteStr, 10);
        if (hour < 0 ||hour > 23) {
          await modalSubmit.reply({
            content : "Hour must be between 0 and 23.",
            ephemeral: true
          });
          return;
        }
        if (minute < 0 ||minute > 59) {
          await modalSubmit.reply({
            content: "Minute must be between 0 and 59.",
            ephemeral: true
          });
          return;
        }

        // Validate number of games is numeric.
        if (!/^\d+$/.test(gamesInputValue)) {
          await modalSubmit.reply({
            content: "Number of games must be a valid number.",
            ephemeral: true
          });
          return;
        }
        const numberOfGames = parseInt(gamesInputValue, 10);

        const currentYear = new Date().getFullYear();
        const formattedDate = `${currentYear}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;

        // Create the scrim with the provided values.
        const scrim = await storage.createScrim({
          team1Id: member.teamId,
          date: formattedDate,
          time: selectedTime,
          status: "open",
          games: numberOfGames,
        });
        await modalSubmit.reply({
          content: `Scrim scheduled for ${formattedDate} at ${selectedTime} with ${numberOfGames} games.`,
          ephemeral: true,
        });
      } catch (err) {
        await interaction.followUp({
          content: "No submission was made in time.",
          ephemeral: true,
        });
        return;
      }
    },

    "scrims": async (interaction: ChatInputCommandInteraction) => {
      if (!interaction.isChatInputCommand()) return;

      const member = await storage.getTeamMemberByDiscordId(interaction.user.id);
      if (!member || !member.isCaptain) {
        await interaction.reply({
          content: "Only team captains can join scrims.",
          ephemeral: true
        });
        return;
      }

      const scrims = await storage.getOpenScrims();
      if (!scrims || scrims.length === 0) {
        await interaction.reply({
          content: "No available scrims to join.",
          ephemeral: true
        });
        return;
      }

      function formatScrimDate(dateStr: string): string {
        const [year, month, day] = dateStr.split("-");
        return `${day}.${month}.${year}`;
      }

      const options = await Promise.all(scrims.map(async scrim => {
        const team = await storage.getTeam(scrim.team1Id);
        const teamName = team?.name || "Unknown team";
        return {
          label: `Scrim vs ${teamName}`,
          description: `${formatScrimDate(scrim.date)} at ${scrim.time}`,
          value: scrim.id.toString()
        };
      }));

      const scrimSelect = new StringSelectMenuBuilder()
          .setCustomId("select_scrim")
          .setPlaceholder("Select a scrim to join")
          .addOptions(options);

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(scrimSelect);

      const replyMsg = await interaction.reply({
        content: "Select the scrim you want to join:",
        components: [row],
        ephemeral: true,
        fetchReply: true
      });

      const filter = (i: any) => i.customId === "select_scrim" && i.user.id === interaction.user.id;
      try {
        const selection = await (replyMsg as any).awaitMessageComponent({ filter, time: 60000 });
        const selectedScrimId = parseInt(selection.values[0], 10);
        const scrim = await storage.getScrim(selectedScrimId);
        if (!scrim) {
          await selection.update({
            content: "Selected scrim no longer exists.",
            components: []
          });
          return;
        }
        if (scrim.status !== "open") {
          await selection.update({
            content: "This scrim is no longer open for joining.",
            components: []
          });
          return;
        }
        if (scrim.team1Id === member.teamId) {
          await selection.update({
            content: "Your team is already participating in this scrim.",
            components: []
          });
          return;
        }
        await storage.updateScrim(selectedScrimId, {
          team2Id: member.teamId,
          status: "scheduled"
        });
        const team1 = await storage.getTeam(scrim.team1Id);
        const team2 = await storage.getTeam(member.teamId);
        await selection.update({
          content: `Team "${team2?.name ?? "Unknown"}" has joined the scrim against "${team1?.name ?? "Unknown"}" scheduled for ${scrim.date} at ${scrim.time}!`,
          components: []
        });

        await handleScrimAccepted(interaction, {
          id: scrim.id,
          date: scrim.date,
          time: scrim.time,
          team1CaptainId: team1?.captainDiscordId ?? "",
          team2CaptainId: team2?.captainDiscordId ?? "",
          team1Name: team1?.name ?? "",
          team2Name: team2?.name ?? "",
          numberOfGames: scrim.games,
        })

      } catch (err) {
        await interaction.editReply({
          content: "No selection was made in time.",
          components: []
        });
      }
    },

    "dashboard": async (interaction: ChatInputCommandInteraction) => {
      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
        await interaction.reply({
          content: "You do not have permission to use this command.",
          ephemeral: true
        });
      }

      // initial dashboard embed + buttons
      const dashEmbed = new EmbedBuilder()
        .setTitle("🔧 Admin Dashboard")
        .setDescription("Choose an action:")
        .setColor(0x5865f2);

      const dashRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("dashboard_settings")
          .setLabel("🛠️ Settings")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("dashboard_announce")
          .setLabel("📢 Global Announcement")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("dashboard_archive")
          .setLabel("🏁 Archive Tournament")
          .setStyle(ButtonStyle.Danger)
      );

      // send emphemeral dashboard
      await interaction.reply({
        embeds: [dashEmbed],
        components: [dashRow],
        ephemeral: true,
      });
      const msg = await interaction.fetchReply();

      // collector for the buttons
      const collector = msg.createMessageComponentCollector({
        time: 30_000,
        filter: i => i.user.id === interaction.user.id,
      });

      collector.on("collect", async i => {
        // ─── BUTTONS ───────────────────────────────────────────────────────────
        if (i.isButton()) {
          if (i.customId === "dashboard_settings") {
            const cfg = readConfig();
            const settingsEmbed = new EmbedBuilder()
              .setTitle("🔧 Dashboard Settings")
              .setDescription(
              `**Current settings:**\n
              • Scrim-thread channel: ${cfg.scrimThreadChannelId ? `<#${cfg.scrimThreadChannelId}>` : "_not set_"}\n
              • Team channels category: ${cfg.teamCategoryId ? `<#${cfg.teamCategoryId}>` : "_not set_"}\n
              • Admin role: ${cfg.adminRoleId ? `<@&${cfg.adminRoleId}>` : "_not set_"}\n
              • Captains role:        ${cfg.captainRoleId  ? `<@&${cfg.captainRoleId}>`  : "_not set_"}\n\n
              Select a channel or role below to update.`.trim())
              .setColor(0x5865f2);

            // build select-menu rows
            const rows = [
              new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
                new ChannelSelectMenuBuilder()
                  .setCustomId("dashboard_channel")
                  .setPlaceholder("Select scrim-thread channel")
                  .addChannelTypes(ChannelType.GuildText)
                  .setMinValues(1)
                  .setMaxValues(1)
              ),
              new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
                new ChannelSelectMenuBuilder()
                  .setCustomId("dashboard_category")
                  .setPlaceholder("Select team channels category")
                  .addChannelTypes(ChannelType.GuildCategory)
                  .setMinValues(1)
                  .setMaxValues(1)
              ),
              new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
                new RoleSelectMenuBuilder()
                  .setCustomId("dashboard_role")
                  .setPlaceholder("Select admin role")
                  .setMinValues(1)
                  .setMaxValues(1)
              ),
              new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
                new RoleSelectMenuBuilder()
                  .setCustomId("dashboard_captain_role")
                  .setPlaceholder("Select captains role")
                  .setMinValues(1)
                  .setMaxValues(1)
              )
            ];

            await i.update({ embeds: [settingsEmbed], components: rows});
            return;
          }

          // ─── ANNOUNCEMENT ────────────────────────────────────────────────────
          if (i.customId === "dashboard_announce") {
            const modal = new ModalBuilder()
              .setCustomId("announceModal")
              .setTitle("📢 Global Announcement")
              .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder()
                    .setCustomId("announcement_text")
                    .setLabel("Your announcement")
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder("Enter your announcement here")
                    .setRequired(true)
                )
              );
            await i.showModal(modal);

            try {
              const submitted = await i.awaitModalSubmit({
                filter: (m) => 
                  m.customId === "announceModal" && m.user.id === interaction.user.id,
                time: 120_000,
              });
            
              const announcement = submitted.fields.getTextInputValue("announcement_text");
              const teams = await storage.getTeamsWithMembers();
              let sentCount = 0;
            
              for (const team of teams) {
                if (!team.channelId) continue;
                const channel = await interaction.guild!
                  .channels.fetch(team.channelId)
                  .catch(() => null);
                if (!channel?.isTextBased()) continue;
              
                // find the team role by name
                const role = interaction.guild!.roles.cache.find(
                  (r) => r.name === team.name
                );
                const ping = role ? ` <@&${role.id}>` : "";
              
                const annEmbed = new EmbedBuilder()
                  .setTitle("📢 Announcement")
                  .setDescription(announcement)
                  .setColor(0x00ae86)
                  .setFooter({ text: `To: ${team.name}` });

                await channel.send({ content: ping, embeds: [annEmbed] });
                sentCount++;
              }
            
              await submitted.reply({
                content: `✅ Sent announcement to **${sentCount}** team channels.`,
                ephemeral: true,
              });
            } catch (err) {
              console.error(err);
            }
            return;
          }

          // ─── ARCHIVE TOURNAMENT ──────────────────────────────────────────────
          if (i.customId === "dashboard_archive") {
            await i.deferReply({ ephemeral: true });
            const cfg = readConfig();
            const guild = interaction.guild!;
            const cat = guild.channels.cache.get(cfg.teamCategoryId!);
            if (!cat || cat.type !== ChannelType.GuildCategory) {
              return i.editReply({ content: "⚠️ Team-channels category is not set or invalid." });
            }
          
            // collect all channels in the category
            const children = guild.channels.cache.filter(c => c.parentId === cat.id);
            let count = 0;
          
            for (const ch of children.values()) {
              if (!ch.isTextBased()) continue;
              // find team by channelId
              const team = (await storage.getTeamsWithMembers()).find(t => t.channelId === ch.id);
              if (!team) continue;
            
              // reset permission overwrites so only admins / owner see it
              if (ch.type === ChannelType.GuildText) {
                await ch.permissionOverwrites.set([
                  // 1) block @everyone
                  { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                
                  // 2) allow only the server owner
                  {
                    id: guild.ownerId,
                    allow: [
                      PermissionsBitField.Flags.ViewChannel,
                      PermissionsBitField.Flags.SendMessages
                    ]
                  }
                ], "Archive tournament");
              }
            
              // post roster
              const roster = team.members.map(m => `<@${m.discordId}>`).join("\n");
              await ch.send({
                embeds: [
                  new EmbedBuilder()
                    .setTitle("🏁 Tournament Archived")
                    .setDescription(`**${team.name}** final roster:\n` + roster || "*No members found*")
                    .setColor(0xff0000)
                ]
              });
            
              // delete team-scoped role
              const teamRole = guild.roles.cache.find(r => r.name === team.name);
              if (teamRole) {
                // strip from members
                for (const mem of guild.members.cache.values()) {
                  if (mem.roles.cache.has(teamRole.id)) {
                    await mem.roles.remove(teamRole);
                  }
                }
                await teamRole.delete("Archive tournament");
              }
            
              // remove static captain role from this captain
              if (cfg.captainRoleId) {
                const cap = await guild.members.fetch(team.captainDiscordId).catch(() => null);
                if (cap &&  cap.roles.cache.has(cfg.captainRoleId)) {
                  await cap.roles.remove(cfg.captainRoleId);
                }
              }
            
              await fetch(`http://${API_BASE}/api/teams/${team.id}/archive`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
              });
            
              count++;
            }
          
            const all = await storage.getTeamsWithMembers();
          
            await i.editReply({ content: `✅ Archived **${count}** team channels and deleted associated roles.`});
            return;
          }
        }

        // ─── CHANNEL SELECT MENUS ───────────────────────────────────────────────
        if (i.isChannelSelectMenu()) {
          const cfg = readConfig();
          if (i.customId === "dashboard_channel") {
            cfg.scrimThreadChannelId = i.values[0];
            writeConfig(cfg);
            await i.update({
              content: `✅ Scrim-thread channel set to <#${i.values[0]}>`,
              embeds: [],
              components: []
            });
          } else if (i.customId === "dashboard_category") {
            cfg.teamCategoryId = i.values[0];
            writeConfig(cfg);
            await i.update({
              content: `✅ Team-channels category set to <#${i.values[0]}>`,
              embeds: [],
              components: []
            });
          }
          return;
        }

        // ─── ROLE SELECT MENUS ─────────────────────────────────────────────────
        if (i.isRoleSelectMenu()) {
          const cfg = readConfig();
          if (i.customId === "dashboard_role") {
            cfg.adminRoleId = i.values[0];
            writeConfig(cfg);
            await i.update({
              content: `✅ Admin role set to <@&${i.values[0]}>`,
              embeds: [],
              components: []
            });
          } else if (i.customId === "dashboard_captain_role") {
            cfg.captainRoleId = i.values[0];
            writeConfig(cfg);
            await i.update({
              content: `✅ Captains role set to <@&${i.values[0]}>`,
              embeds: [],
              components: []
            });
          }
          return;
        }
      });
  },
};

  if (process.env.REGISTER_COMMANDS === "true" && process.env.DISCORD_BOT_TOKEN && process.env.APPLICATION_ID) {
    const commands = [
      new SlashCommandBuilder()
        .setName("create-team")
        .setDescription("Create a new team (Team Captain)"),

      new SlashCommandBuilder()
        .setName("join-team")
        .setDescription("Join an existing team (Team Player)"),

      new SlashCommandBuilder()
        .setName("schedule-scrim")
        .setDescription("Schedule a new scrim (Team Captain)"),

      new SlashCommandBuilder()
        .setName("scrims")
        .setDescription("Display currently available scrims to join."),

      new SlashCommandBuilder()
          .setName("dashboard")
          .setDescription("Admin dashboard"),
    ];

    const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);

    (async () => {
      try {
        console.log("Started refreshing application (/) commands.");
        await rest.put(
          Routes.applicationCommands(applicationID),
          { body: commands }
        );
        console.log("Successfully reloaded application (/) commands.");
      } catch (error) {
        console.error(error);
      }
    })();
  }

  return commandFunctions;
}