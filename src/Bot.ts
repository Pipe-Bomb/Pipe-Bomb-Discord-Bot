import { Client, Events, GatewayIntentBits, REST, Routes } from "discord.js";
import Command from "./commands/Command.js";
import Config from "./Config.js"
import InteractionWrapper from "./InteractionWrapper.js";
import Voice from "./Voice.js";
import PipeBomb from "pipebomb.js";
import Exception from "./Exception.js";

export default class Bot {
    private config = Config();
    public readonly client: Client;
    private rest: REST;
    private commands: Command[] = [];
    private timeStarted = Date.now();
    private voiceIndex: Map<string, Voice> = new Map();

    public readonly pipeBomb: PipeBomb;

    public constructor() {
        if (!this.config.client_id || !this.config.client_token) {
            console.log("Discord bot credentials have not been set in 'Config.json' file! Obtain these credentials from the Discord application developer portal https://discord.com/developers/applications");
            process.exit();
        }

        if (!this.config.default_pipe_bomb_server) {
            console.log("Default Pipe Bomb server has not been set in 'Config.json' file!");
            process.exit();
        }

        if (!this.config.pipe_bomb_private_key) {
            console.log("Pipe Bomb token has not been set in 'Config.json' file!");
            process.exit();
        }

        this.pipeBomb = new PipeBomb(this.config.default_pipe_bomb_server, {
            privateKey: this.config.pipe_bomb_private_key
        });
        

        this.client = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]});
        this.rest = new REST({version: "10"}).setToken(this.config.client_token);

        this.client.once(Events.ClientReady, c => {
            console.log(`Logged into Discord as '${c.user.tag}'!`);
        });

        
        this.client.on("interactionCreate", async rawInteraction => {
            const interaction = new InteractionWrapper(rawInteraction);

            if (rawInteraction.isCommand()) {
                for (let command of this.commands) {
                    if (command.getCommandNames().includes(rawInteraction.commandName.toLowerCase())) {
                        await rawInteraction.deferReply();
                        try {
                            await command.run(interaction);
                        } catch (e) {
                            if (e instanceof Exception) {
                                interaction.reply({
                                    title: "Error",
                                    description: e.message,
                                    color: "Red"
                                });
                            } else {
                                console.error("Unhandled error", e);
                                interaction.reply({
                                    title: "Something went wrong",
                                    description: "Please report this!",
                                    color: "Red"
                                })
                            }
                        }
                        
                        return;
                    }
                }
                interaction.reply({
                    title: "Error",
                    description: `No command by name '${rawInteraction.commandName}'`,
                    color: "Red"
                });
                return;
            }
        });



        this.pipeBomb.authenticate("Pipe Bomb Discord Bot", {
            privateKey: this.config.pipe_bomb_private_key
        }).then(() => {
            console.log("Connected to Pipe Bomb!");
            this.client.login(this.config.client_token);
        });
    }

    registerCommand(command: Command) {
        this.commands.push(command);
    }

    public async updateCommands() {
        const commands = this.commands.map(command => command.getCommand());
        console.log(`Updating commands list (${commands.length})...`);
        await this.rest.put(Routes.applicationCommands(this.config.client_id), {
            body: commands
        });
        console.log(`Updated commands list!`);
    }

    public getUptime() {
        return Math.max(Date.now() - this.timeStarted, 0);
    }

    public getVoice(serverID: string) {
        const existingVoice = this.voiceIndex.get(serverID);
        if (existingVoice) return existingVoice;

        const guild = this.client.guilds.cache.get(serverID);
        if (!guild) throw new Exception(`Guild '${serverID}' was not in cache`);

        const voice = new Voice(this, guild);
        this.voiceIndex.set(guild.id, voice);
        return voice;
    }

    public removeVoice(voice: Voice) {
        this.voiceIndex.delete(voice.guild.id);
    }
}