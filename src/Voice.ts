import { Guild } from "discord.js";
import { AudioPlayer, AudioPlayerStatus, AudioResource, NoSubscriberBehavior, VoiceConnection, createAudioPlayer, createAudioResource, demuxProbe, joinVoiceChannel } from "@discordjs/voice";
import Track from "pipebomb.js/dist/music/Track.js";
import Bot from "./Bot.js";
import Axios from "axios";
import { Readable } from "stream";
import Exception from "./Exception.js";
import ExternalCollection from "pipebomb.js/dist/collection/ExternalCollection.js";
import { generateLink } from "./Utils.js";
import InteractionWrapper from "./InteractionWrapper.js";
import { PlayingTrackEmbed, QueuedTrackEmbed } from "./EmbedTemplates.js";
import Playlist from "pipebomb.js/dist/collection/Playlist.js";

interface CurrentTrack {
    track: Track
    resource: AudioResource
}

export default class Voice {
    private connection: VoiceConnection | null = null;
    private player: AudioPlayer;
    
    private currentlyPlaying: CurrentTrack | null = null;
    private queue: Track[] = [];

    public constructor(private bot: Bot, public guild: Guild) {

        this.player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause
            }
        });

        this.player.on("error", e => {
            console.error(e);
        });

        this.player.on(AudioPlayerStatus.Idle, async () => {
            try {
                await this.nextTrack();
            } catch (e) {
                console.error(e);
            }
        });
    }

    public joinVC(channelID: string) {
        if (this.connection) {
            const selfChannel = this.getSelf().voice.channelId;
            if (selfChannel == channelID) return;
            if (selfChannel) throw new Exception(`Bot is already active in guild '${this.guild.id}'`);
        }

        const channel = this.guild.channels.cache.get(channelID);
        if (!channel) throw new Exception(`Channel '${channelID}' is not in guild '${this.guild.id}'`);

        this.connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: this.guild.id,
            adapterCreator: this.guild.voiceAdapterCreator
        });

        this.connection.subscribe(this.player);
    }

    public activeCheck() {
        if (!this.connection) throw new Exception(`Bot is not active in guild '${this.guild.id}'`);
    }

    public isVoiceActive() {
        return !!this.connection;
    }

    public getState() {
        this.activeCheck();
        return this.connection!.state.status;
    }

    public destroy() {
        if (this.player) this.player.stop();
        if (!this.connection) return;
        this.connection.disconnect();
        this.connection.destroy();
        this.connection = null;
        this.bot.removeVoice(this);
    }

    public async nextTrack() {
        this.activeCheck();
        const nextTrack = this.queue.shift();
        if (nextTrack) {
            await this.playTrack(nextTrack);
            return nextTrack;
        } else {
            this.currentlyPlaying = null;
            this.destroy();
            return null;
        }
    }

    public async playTrack(track: Track) {
        this.activeCheck();
        try {
            const { data, status, headers } = await Axios.get(track.getAudioUrl(), {
                responseType: "stream"
            });
            if (status != 200 && status != 206) throw null;

            const contentType: string = headers["content-type"];
            if (!contentType.startsWith("audio/")) throw new Exception(`Audio '${track.getAudioUrl()}' was invalid content type '${contentType}'`);
    
            let resource = await this.probeAndCreateResource(data);
    
            if (!resource) throw new Exception(`Audio '${track.getAudioUrl()}' was unsupported type '${contentType}'`);
    
            this.stop();
            this.currentlyPlaying = {
                track,
                resource
            };
    
            this.player.play(resource);
        } catch (e) {
            if (e instanceof Exception) throw e;
            const meta = await track.loadMetadata();
            throw new Exception(`Failed to play ${meta.title}!`);
        }
    }

    private async probeAndCreateResource(inputStream: Readable) {
        const { stream, type } = await demuxProbe(inputStream);
        return createAudioResource(stream, { inputType: type });
    }

    public stop() {
        this.player.stop();
    }

    public getSelf() {
        const member = this.guild.members.cache.get(this.bot.client.user!.id);
        if (!member) throw new Exception(`Bot is not active in guild '${this.guild.id}'`);
        return member;
    }

    public addToQueue(position: number, ...tracks: Track[]) {
        position = Math.min(Math.max(0, position), this.queue.length);
        this.queue.splice(position, 0, ...tracks);
    }

    public getQueue() {
        return Array.from(this.queue);
    }

    public async playPlaylist(playlistId: string, interaction: InteractionWrapper) {
        const channelId = interaction.getInteractionChannel()!.id;

        const playlist: Playlist = await this.bot.pipeBomb.v1.getPlaylist(playlistId);
        this.joinVC(channelId);
        const tracklist = await playlist.getTrackList();
        if (!tracklist.length) throw new Exception(`There are no tracks in playlist \`${playlist.getName()}\``);
        interaction.reply({
            title: `Loading ${playlist.getName()}`,
            description: `Loading ${tracklist.length} tracks...`,
            url: generateLink(this.bot, "externalplaylist", playlist.collectionID),
            image: playlist.getThumbnailUrl()
        });

        this.addToQueue(0, ...tracklist);
        const nextTrack = await this.nextTrack();

        interaction.reply(await PlayingTrackEmbed(this.bot, nextTrack!));
    }

    public async playExternalPlaylist(playlistId: string, interaction: InteractionWrapper) {
        const channelId = interaction.getInteractionChannel()!.id;

        const playlist: ExternalCollection = await this.bot.pipeBomb.v1.getExternalPlaylist(playlistId);
        if (!playlist.getTrackListLength()) throw new Exception(`There are no tracks in playlist \`${playlist.getName()}\``);
        this.joinVC(channelId);
        interaction.reply({
            title: `Loading ${playlist.getName()}`,
            description: `Loading ${playlist.getTrackListLength()} tracks...`,
            url: generateLink(this.bot, "externalplaylist", playlist.collectionID),
            image: playlist.getThumbnailUrl()
        });

        while (!playlist.hasFullTracklist()) {
            await playlist.loadNextPage();
        }
        const tracklist = playlist.getTrackList();
        if (!tracklist.length) throw new Exception(`There are no tracks in playlist \`${playlist.getName()}\``);
        this.addToQueue(0, ...tracklist);
        const nextTrack = await this.nextTrack();

        interaction.reply(await PlayingTrackEmbed(this.bot, nextTrack!));
    }

    public async playChart(chartId: string, interaction: InteractionWrapper) {
        const channelId = interaction.getInteractionChannel()!.id;

        const chart = await this.bot.pipeBomb.v1.getChart(chartId);
        const tracklist = chart.getTrackList();

        if (!tracklist.length) throw new Exception(`There are no tracks in playlist \`${chart.getName()}\``);
        this.joinVC(channelId);
        await interaction.reply({
            title: `Loading ${chart.getName()}`,
            description: `Loading ${tracklist.length} tracks...`,
            url: generateLink(this.bot, "chart", chart.collectionID),
            image: chart.thumbnail || undefined
        });
        this.addToQueue(0, ...tracklist);
        const nextTrack = await this.nextTrack();

        interaction.reply(await PlayingTrackEmbed(this.bot, nextTrack!));
    }

    public async searchQuery(query: string, interaction: InteractionWrapper) {
        if (!query) throw new Exception("Please enter a valid query!");

        const channelId = interaction.getInteractionChannel()!.id;

        if (query.startsWith("https://") || query.startsWith("http://")) {
            let urlParts: string[] = (query.startsWith("https://") ? query.substring(8) : query.substring(7)).split("/");
            if (urlParts.length == 3) {
                try {
                    if (urlParts[1] == "externalplaylist") {
                        await this.playExternalPlaylist(urlParts[2], interaction);
                        return;
                    } else if (urlParts[1] == "track") {
                        const track = await this.bot.pipeBomb.trackCache.getTrack(urlParts[2]);
                        this.joinVC(channelId);
                        if (this.queue.length) {
                            this.queue.push(track);
                            interaction.reply(await QueuedTrackEmbed(this.bot, track, this.queue.length - 1));
                        } else {
                            interaction.reply(await PlayingTrackEmbed(this.bot, track));
                            await this.playTrack(track);
                        }
                        return;
                    } else if (urlParts[1] == "playlist") {
                        await this.playPlaylist(urlParts[2], interaction);
                        return;
                    } else if (urlParts[1] == "chart") {
                        await this.playChart(urlParts[2], interaction);
                        return;
                    }
                } catch (e) {
                    console.error(e);
                }
            }
        }

        const result = await this.bot.pipeBomb.v1.search("Youtube Music", query);
        if (result.responseType == "found object") {
            switch (result.objectType) {
                case "track":
                    const track = await this.bot.pipeBomb.trackCache.getTrack(result.id);
                    this.joinVC(channelId);
                    await this.playTrack(track);
                    break;
                case "playlist":
                    await this.playExternalPlaylist(result.id, interaction);
            }
        } else {
            let track: Track | undefined;
            for (let item of result.results) {
                if (item instanceof Track) {
                    track = item;
                    break;
                }
            }
            if (!track) throw new Exception("No results for query");
            this.joinVC(channelId);
            interaction.reply(await PlayingTrackEmbed(this.bot, track));
            await this.playTrack(track);
        }
    }
}