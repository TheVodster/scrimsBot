import 'dotenv/config';
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
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
import { ApplyNotNullMapToJoins } from 'drizzle-orm/query-builders/select.types';

const applicationID: string = process.env.APPLICATION_ID!;

const CONFIG_URL = new URL("../config.json", import.meta.url);

type Config = {
    scrimThreadChannelId: string | null;
    adminRoleId: string | null;
    teamCategoryId: string | null;
}

export function readConfig(): Config {
  return JSON.parse(
    fs.readFileSync(CONFIG_URL, "utf-8")
    ) as Config;
}

export function writeConfig(cfg: Config): void {
  fs.writeFileSync(
    CONFIG_URL,
    JSON.stringify(cfg, null, 2),
    "utf-8"
  );
}

function formatDate(dt: Date): string {
  const day = dt.getDate().toString().padStart(2, "0");
  const month = (dt.getMonth() + 1).toString().padStart(2, "0");
  return `${day}-${month}`;
}

// Helper to wait for a modal submission with a filter.
function waitForModalSubmit(
  client: any,
  customId: string,
  userId: string,
  time: number = 60000
): Promise<ModalSubmitInteraction> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.removeListener("interactionCreate", handler);
      reject(new Error("Modal submission timed out."));
    }, time);
    const handler = (i: any) => {
      if (i.isModalSubmit() && i.customId === customId && i.user.id === userId) {
        clearTimeout(timer);
        client.removeListener("interactionCreate", handler);
        resolve(i);
      }
    };
    client.on("interactionCreate", handler);
  });
}

export function registerCommands(storage: IStorage) {
  const commandFunctions: Record<string, (interaction: ChatInputCommandInteraction) => Promise<void>> = {
    "create-team": async (interaction: CommandInteraction) => {
      if (!interaction.isChatInputCommand()) return;

      // Build the modal for team creation.
      const teamModal = new ModalBuilder()
          .setCustomId("createTeamModal")
          .setTitle("Create Team");

      const teamNameInput = new TextInputBuilder()
          .setCustomId("team_name")
          .setLabel("Team Name")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Enter your team name")
          .setRequired(true);

      const inGameIdInput = new TextInputBuilder()
          .setCustomId("in_game_id")
          .setLabel("In-Game ID")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Enter your in-game ID without server ID (e.g. 1234567)")
          .setRequired(true);

      teamModal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(teamNameInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(inGameIdInput)
      );

      // Show the modal to the user.
      await interaction.showModal(teamModal);

      try {
        // Wait for the modal submission.
        const modalSubmit = await interaction.awaitModalSubmit({
          filter: (i: any) =>
              i.customId === "createTeamModal" && i.user.id === interaction.user.id,
          time: 60000
        });
        const teamName = modalSubmit.fields.getTextInputValue("team_name");
        const inGameId = modalSubmit.fields.getTextInputValue("in_game_id");

        // Validate the in game id
        if (!/^\d+$/.test(inGameId)) {
          await modalSubmit.reply({
            content: "In-Game ID must contain only numbers.",
            ephemeral: true
          });
          return;
        }

        // Check if a team with this name already exists.
        const existingTeam = await storage.getTeamByName(teamName);
        if (existingTeam) {
          await modalSubmit.reply({
            content: `A team named \`${teamName}\` already exists. Please choose a different name.`,
            ephemeral: true
          });
          return;
        }

        // Ensure the user is not already in a team.
        const existingMember = await storage.getTeamMemberByDiscordId(interaction.user.id);
        if (existingMember) {
          const team = await storage.getTeam(existingMember.teamId);
          await modalSubmit.reply({
            content: `You are already a member of the team \`${team?.name}\`. Please leave that team first.`,
            ephemeral: true
          });
          return;
        }

        // Create the team and add the user as captain.
        const team = await storage.createTeam({
          name: teamName,
          captainDiscordId: interaction.user.id,
          captainUsername: interaction.user.tag,
          captainInGameId: inGameId,
          channelId: ""
        });

        await storage.createTeamMember({
          teamId: team.id,
          discordId: interaction.user.id,
          username: interaction.user.tag,
          inGameId: inGameId,
          isCaptain: true
        });

        const guild = interaction.guild;
        const cfg = readConfig();

        // make sure the admin has set the category for team channels
        if (!cfg.teamCategoryId) {
          await modalSubmit.reply({
            content: "The team channels category is not set in the admin dashboard.",
            ephemeral: true
          });
          return;
        }

        // create the team channel
        const channel = await guild!.channels.create({
          name: teamName.toLowerCase().replace(/\s+/g, "-"),
          type: ChannelType.GuildText,
          parent: cfg.teamCategoryId,
          permissionOverwrites: [
            // deny @everyone
            { id: guild!.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            // allow team captain
            { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
            // allow admins
            { id: cfg.adminRoleId!,    allow: [PermissionsBitField.Flags.ViewChannel] },
          ]
        });

        // store channel id in DB so we can fetch it in join-team
        await storage.updateTeam(team.id, { channelId: channel.id });

        // send a welcome message in the team channel
        await channel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("Welcome, Captain!")
              .setDescription(
                `Hello <@${interaction.user.id}> — this is your private team channel for **${teamName}**.\n\n` +
                `Feel free to invite your teammates with /join-team, and start chatting here!`
              )
              .setColor(0x00AE86)
          ]
        })

        await modalSubmit.reply({
          content: `Team \`${teamName}\` has been created with <@${interaction.user.id}> as the captain!`,
          ephemeral: false
        });
      } catch (err) {
        await interaction.followUp({
          content: "No submission was made in time.",
          ephemeral: true
        });
      }
    },

    "join-team": async (interaction: CommandInteraction) => {
      if (!interaction.isChatInputCommand()) return;

      // Build the modal for joining a team.
      const joinTeamModal = new ModalBuilder()
          .setCustomId("joinTeamModal")
          .setTitle("Join Team");

      const teamNameInput = new TextInputBuilder()
          .setCustomId("team_name")
          .setLabel("Team Name")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Enter the team name")
          .setRequired(true);

      const inGameIdInput = new TextInputBuilder()
          .setCustomId("in_game_id")
          .setLabel("In-Game ID")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Enter your in-game ID without server ID (e.g. 1234567)")
          .setRequired(true);

      joinTeamModal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(teamNameInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(inGameIdInput)
      );

      // Show the modal to the user.
      await interaction.showModal(joinTeamModal);

      try {
        // Await modal submission.
        const modalSubmit = await interaction.awaitModalSubmit({
          filter: (i: any) =>
              i.customId === "joinTeamModal" && i.user.id === interaction.user.id,
          time: 60000
        });
        const teamName = modalSubmit.fields.getTextInputValue("team_name");
        const inGameId = modalSubmit.fields.getTextInputValue("in_game_id");

        // Validate the in game id
        if (!/^\d+$/.test(inGameId)) {
          await modalSubmit.reply({
            content: "In-Game ID must contain only numbers.",
            ephemeral: true
          });
          return;
        }

        // Check if the team exists.
        const team = await storage.getTeamByName(teamName);
        if (!team) {
          await modalSubmit.reply({
            content: `Team \`${teamName}\` does not exist. Please check the team name.`,
            ephemeral: true
          });
          return;
        }

        // Ensure the user is not already in a team.
        const existingMember = await storage.getTeamMemberByDiscordId(interaction.user.id);
        if (existingMember) {
          const existingTeam = await storage.getTeam(existingMember.teamId);
          await modalSubmit.reply({
            content: `You are already a member of team \`${existingTeam?.name}\`. Please leave that team first.`,
            ephemeral: true
          });
          return;
        }

        // Add the user to the team.
        await storage.createTeamMember({
          teamId: team.id,
          discordId: interaction.user.id,
          username: interaction.user.tag,
          inGameId: inGameId,
          isCaptain: false
        });

        if (team?.channelId) {
          const channel = await interaction.guild!.channels.fetch(team.channelId);
          if (channel?.isTextBased() && channel.type === ChannelType.GuildText) {
            await channel.permissionOverwrites.edit(interaction.user.id, {
              ViewChannel: true,
              SendMessages: true
            });

            // welcome the new members
            await channel.send({
              content: `Welcome <@${interaction.user.id}> to **${teamName}**!`,
              allowedMentions: { users: [interaction.user.id] }
            });
          }
        }

        await modalSubmit.reply({
          content: `You have joined team \`${teamName}\`!`,
          ephemeral: true
        });
      } catch (err) {
        await interaction.followUp({
          content: "No submission was made in time.",
          ephemeral: true
        });
        return;
      }
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
        return;
      }

      const cfg = readConfig();
      const embed = new EmbedBuilder()
          .setTitle("Scrim Bot Dashboard")
          .setDescription(`**Current settings:**\n
            • Scrim-thread channel: ${cfg.scrimThreadChannelId ? `<#${cfg.scrimThreadChannelId}>` : "_not set_"}\n
            • Admin role: ${cfg.adminRoleId ? `<@&${cfg.adminRoleId}>` : "_not set_"}\n
            • Team channels category: ${cfg.teamCategoryId ? `<#${cfg.teamCategoryId}>` : "_not set_"}\n\n
            Select a channel or role below to update.`);

      const channelMenu = new ChannelSelectMenuBuilder()
          .setCustomId("dashboard_channel")
          .setPlaceholder("Selct a text channel")
          .addChannelTypes(ChannelType.GuildText) // only text channels
          .setMinValues(1)
          .setMaxValues(1);

      const roleMenu = new RoleSelectMenuBuilder()
          .setCustomId("dashboard_role")
          .setPlaceholder("Select the admin role")
          .setMinValues(1)
          .setMaxValues(1);

      const categoryMenu = new ChannelSelectMenuBuilder()
          .setCustomId("dashboard_category")
          .setPlaceholder("Select the category for team channels")
          .addChannelTypes(ChannelType.GuildCategory) // only categories
          .setMinValues(1)
          .setMaxValues(1);

      const row1 = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(channelMenu);
      const row2 = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(roleMenu);
      const row3 = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(categoryMenu);

      // send ephemeral dashboard and fetch the message
      await interaction.reply({
        embeds: [embed],
        components: [row1, row2, row3],
        ephemeral: true,
        fetchReply: true,
      });
      const msg = await interaction.fetchReply(); // Message instance
      

      // collector for either select menu, 2 minutes
      const collector = msg.createMessageComponentCollector({
        time: 30_000,
        filter: i => i.user.id === interaction.user.id
      });

      collector.on("collect", async i => {
        // only the command-invoker can pick
        if (i.user.id !== interaction.user.id)
          return i.reply({ content:"You aren't allowed to use this command", ephemeral: true });
      
        // update the config
        if (i.isChannelSelectMenu() && i.customId === "dashboard_channel") {
          cfg.scrimThreadChannelId = i.values[0];
          writeConfig(cfg);
        } else if (i.isRoleSelectMenu() && i.customId === "dashboard_role") {
          cfg.adminRoleId = i.values[0];
          writeConfig(cfg);
        } else if (i.isChannelSelectMenu() && i.customId === "dashboard_category") {
          cfg.teamCategoryId = i.values[0];
          writeConfig(cfg);
        } else {
          return;
        }
      
        // rebuild the embed with new settings
        const updatedEmbed = EmbedBuilder.from(embed).setDescription(`
      **Settings updated!**
      • Scrim-thread channel: ${cfg.scrimThreadChannelId ? `<#${cfg.scrimThreadChannelId}>` : "_not set_"}
      • Admin role: ${cfg.adminRoleId ? `<@&${cfg.adminRoleId}>` : "_not set_"}
      • Scrim-thread channel: ${cfg.teamCategoryId ? `<#${cfg.teamCategoryId}>` : "_not set_"}
        `.trim());
        
        await i.update({ embeds: [updatedEmbed], components: [row1, row2, row3] });
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
          .setDescription("Open the admin dashboard to set the scrim thread channel and admin role."),
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