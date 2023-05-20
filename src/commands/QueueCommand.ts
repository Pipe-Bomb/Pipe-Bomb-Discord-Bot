import { SlashCommandBuilder } from "discord.js";
import Command from "./Command.js";
import InteractionWrapper from "../InteractionWrapper";
import Exception from "../Exception.js";

export default class QueueCommand extends Command {
    getCommand() {
        return new SlashCommandBuilder()
        .setName("queue")
        .setDescription("List upcoming tracks")
        .addStringOption(option =>
            option.setName("page")
            .setDescription("Name or URL of a track/playlist")
            .setRequired(false)
        );
    }

    matchesButton(buttonID: string) {
        return false;
    }

    getCommandNames() {
        return "queue";
    }

    async run(i: InteractionWrapper) {
        const channel = i.getSenderVoiceChannel();
        const voice = this.bot.getVoice(channel.guildId);
        voice.activeCheck();

        if (i.interaction.isCommand()) {
            const query: any = i.interaction.options.get("page");
            let page = 0;
            if (query?.value) {
                try {
                    page = Math.max(parseInt(query.value) - 1, 0);
                } catch {}
            }
            
            const queue = voice.getQueue();
            const lastPage = Math.ceil(queue.length / 10);
            if (page >= lastPage) {
                throw new Exception(`The queue is only ${lastPage} page${lastPage == 1 ? "" : "s"} long`);
            }
            
            const section = queue.splice(page * 10, 10);

            for (let track of section) {
                await track.loadMetadata();
            }

            i.reply({
                title: `Queue (${page + 1}/${lastPage})`,
                image: section[0].getThumbnailUrl(),
                fields: section.map((track, index) => {
                    return {
                        name: `${page * 10 + index + 1}. ${track.getMetadata().title}`,
                        value: track.getMetadata().artists.join(", "),
                    }
                })
            });
        }
    }
}