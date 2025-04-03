const { ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
const { AudioFilters, useQueue } = require('discord-player');
const { Translate } = require('../../process_tools');

// Adding custom anti-static filters
AudioFilters.define('antistatic', 'highpass=f=200,lowpass=f=15000,silenceremove=start_periods=1:detection=peak');
AudioFilters.define('clearvoice', 'pan=stereo|c0=c0|c1=c1,highpass=f=75,lowpass=f=12000,dynaudnorm=f=150:g=15:p=0.7');
AudioFilters.define('crystalclear', 'volume=1.5,highpass=f=60,lowpass=f=17000,afftdn=nr=10:nf=-25:tn=1,loudnorm=I=-16:TP=-1.5:LRA=11');
AudioFilters.define('crisp', 'treble=g=5,bass=g=2:f=110:w=0.6,volume=1.25,loudnorm');

module.exports = {
    name: 'filter',
    description:('Add a filter to your track'),
    voiceChannel: true,
    options: [
        {
            name: 'filter',
            description:('The filter you want to add'),
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                // Add custom filters at the top for better visibility
                { name: 'antistatic', value: 'antistatic' },
                { name: 'clearvoice', value: 'clearvoice' },
                { name: 'crystalclear', value: 'crystalclear' },
                { name: 'crisp', value: 'crisp' },
                // Include all standard filters
                ...Object.keys(AudioFilters.filters)
                    .filter(f => !['antistatic', 'clearvoice', 'crystalclear', 'crisp'].includes(f))
                    .map(m => ({ name: m, value: m }))
                    .splice(0, 21) // Limit to 21 to stay under 25 choices with our 4 custom ones
            ],
        }
    ],

    async execute({ inter }) {
        const queue = useQueue(inter.guild);
        if (!queue?.isPlaying()) return inter.editReply({ content: await Translate(`No music currently playing <${inter.member}>... try again ? <❌>`) });

        const actualFilter = queue.filters.ffmpeg.getFiltersEnabled()[0];
        const selectedFilter = inter.options.getString('filter');

        const filters = [];
        queue.filters.ffmpeg.getFiltersDisabled().forEach(f => filters.push(f));
        queue.filters.ffmpeg.getFiltersEnabled().forEach(f => filters.push(f));

        const filter = filters.find((x) => x.toLowerCase() === selectedFilter.toLowerCase().toString());

        let msg = await Translate (`This filter doesn't exist <${inter.member}>... try again ? <❌ \n>`) +
            (actualFilter ? await Translate(`Filter currently active: <**${actualFilter}**. \n>`) : "") +
            await Translate(`List of available filters:`);
        filters.forEach(f => msg += `- **${f}**`);

        if (!filter) return inter.editReply({ content: msg });

        await queue.filters.ffmpeg.toggle(filter);

        const filterEmbed = new EmbedBuilder()
            .setAuthor({ name: await Translate(`The filter <${filter}> is now <${queue.filters.ffmpeg.isEnabled(filter) ? 'enabled' : 'disabled'}> <✅\n> *Reminder: the longer the music is, the longer this will take.*`) })
            .setColor('#2f3136');

        return inter.editReply({ embeds: [filterEmbed] });
    }
}