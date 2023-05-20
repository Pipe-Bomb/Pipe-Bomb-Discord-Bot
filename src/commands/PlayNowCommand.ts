import { SlashCommandBuilder } from "discord.js";
import Command from "./Command.js";
import InteractionWrapper from "../InteractionWrapper.js";

export default class PlayNowCommand extends Command {
    getCommand() {
        return new SlashCommandBuilder()
        .setName("playnow")
        .setDescription("Play a track immediately")
        .addStringOption(option =>
            option.setName("query")
            .setDescription("Name or URL of a track/playlist")
            .setRequired(true)
        );
    }

    matchesButton(buttonID: string) {
        return false;
    }

    getCommandNames() {
        return "playnow";
    }

    async run(i: InteractionWrapper) {
        const channel = i.getSenderVoiceChannel();
        const voice = this.bot.getVoice(channel.guildId);

        if (i.interaction.isCommand()) {
            const query: any = i.interaction.options.get("query");
            await voice.searchQuery(query?.value, i);
        }
    }
}