import Bot from "./Bot";

export function formatTime(time: number) {
    let seconds = Math.floor(time / 1000);
    let minutes = Math.floor(seconds / 60);
    seconds -= minutes * 60;
    let hours = Math.floor(minutes / 60);
    minutes -= hours * 60;
    let days = Math.floor(hours / 24);
    hours -= days * 24;

    function pl(number: number) {
        return number == 1 ? "" : "s";
    }
    
    let out = `${seconds} second${pl(seconds)}`;
    if (minutes) out = `${minutes} minute${pl(minutes)}, ${out}`;
    if (hours) out = `${hours} hour${pl(hours)}, ${out}`;
    if (days) out = `${days} day${pl(days)}, ${out}`;
    return out;
}

export function generateLink(bot: Bot, subject: string, id: string) {
    if (typeof id != "string") {
        const anyId: any = id;
        id = anyId.toString();
    }
    if (id.includes("@")) {
        const parts = id.split("@", 2);
        return `http://${parts[0]}/${subject}/${parts[1]}`;
    } else {
        return `${bot.pipeBomb.context.getHost()}/${subject}/${id}`;
    }
}