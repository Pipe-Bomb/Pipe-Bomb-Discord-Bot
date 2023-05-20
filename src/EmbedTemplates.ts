import Track from "pipebomb.js/dist/music/Track";
import { ReplyOptions } from "./InteractionWrapper";
import Bot from "./Bot";
import { generateLink } from "./Utils.js";

export async function PlayingTrackEmbed(bot: Bot, track: Track): Promise<ReplyOptions> {
    const meta = await track.loadMetadata();
    return {
        title: `Playing ${meta.title}`,
        description: `By ${meta.artists}`,
        image: meta.image,
        url: generateLink(bot, "track", track.trackID)
    }
}

export async function QueuedTrackEmbed(bot: Bot, track: Track, position: number): Promise<ReplyOptions> {
    if (!position) return PlayingTrackEmbed(bot, track);

    const meta = await track.loadMetadata();
    return {
        title: `Queued ${meta.title}`,
        description: `By ${meta.artists}\n\nPosition: ${position + 1}`,
        image: meta.image,
        url: generateLink(bot, "track", track.trackID)
    }
}