import { APIEmbedField, EmbedBuilder, Interaction } from "discord.js";
import Exception from "./Exception.js";
import { ColorResolvable } from "discord.js";

export interface ReplyOptions {
    title: string
    description?: string
    image?: string
    url?: string
    fields?: APIEmbedField | APIEmbedField[],
    color?: ColorResolvable
}

export default class InteractionWrapper {
    constructor(public readonly interaction: Interaction) {}

    public reply(options: ReplyOptions): Promise<void> {
        return new Promise(async resolve => {
            try {
                const embed = new EmbedBuilder().setTitle(options.title);

                embed.setColor(options.color || "#430895");

                embed.setDescription(options.description || null);
                embed.setThumbnail(options.image || null);
                embed.setURL(options.url || null);
    
                embed.setFooter({
                    iconURL: this.interaction.user.avatarURL() || undefined,
                    text: this.interaction.user.username
                })
        
                if (options.fields) {
                    if (Array.isArray(options.fields)) {
                        embed.addFields(...options.fields);
                    } else {
                        embed.addFields(options.fields);
                    }
                }
        
                if (this.interaction.isRepliable()) {
                    if (this.interaction.deferred) {
                        await this.interaction.followUp({embeds: [embed]});
                    } else {
                        await this.interaction.reply({embeds: [embed]});
                    }
                }
            } catch (e) {
                console.log(e);
            } finally {
                resolve();
            }
        });
    }

    public getGuild() {
        const guild = this.interaction.guild;
        if (!guild) throw new Exception(`Interaction had no guild`);
        return guild;
    }

    public getSender() {
        const sender = this.getGuild().members.cache.get(this.interaction.user.id);
        if (!sender) throw new Exception(`Interaction had no sender`);
        return sender;
    }

    public getSenderVoiceChannel() {
        const sender = this.getSender();
        const channel = sender.voice.channel;
        if (!channel) throw new Exception(`Sender '${sender.displayName}' is not in a voice channel`);
        return channel;
    }

    public getInteractionChannel() {
        return this.interaction.channel;
    }
}