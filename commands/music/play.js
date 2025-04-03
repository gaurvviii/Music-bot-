const { QueryType, useMainPlayer } = require('discord-player');
const { ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
const { Translate } = require('../../process_tools');

module.exports = {
    name: 'play',
    description:("Play a song from YouTube, Spotify, or other sources"),
    voiceChannel: true,
    options: [
        {
            name: 'song',
            description:('The song you want to play (title, artist, or partial URL)'),
            type: ApplicationCommandOptionType.String,
            required: true,
        },
        {
            name: 'quality',
            description:('Audio quality (higher uses more bandwidth)'),
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
                { name: 'Low', value: 'low' },
                { name: 'Medium', value: 'medium' },
                { name: 'High', value: 'high' }
            ]
        }
    ],

    async execute({ inter, client }) {
        const player = useMainPlayer();
        const song = inter.options.getString('song');
        const qualityOption = inter.options.getString('quality') || 'high';
        
        const defaultEmbed = new EmbedBuilder().setColor('#2f3136');
        
        // Set quality based on user selection
        let volumeLevel = client.config.opt.volume;
        
        switch(qualityOption) {
            case 'low':
                volumeLevel = Math.min(volumeLevel, 70);
                break;
            case 'medium':
                volumeLevel = Math.min(volumeLevel, 80);
                break;
            case 'high':
                volumeLevel = client.config.opt.volume;
                break;
        }
        
        try {
            // Tell user we're searching
            defaultEmbed.setAuthor({ name: await Translate(`Searching for "${song}"... <🔍>`) });
            await inter.editReply({ embeds: [defaultEmbed], ephemeral: false });
            
            // Handle normal song playback (YouTube, Spotify, etc.)
            const res = await player.search(song, {
                requestedBy: inter.member,
                searchEngine: QueryType.AUTO
            });

            if (!res?.tracks.length) {
                defaultEmbed.setAuthor({ name: await Translate(`No results found... try again? <❌>`) });
                return inter.editReply({ embeds: [defaultEmbed], ephemeral: false });
            }

            const { track } = await player.play(inter.member.voice.channel, song, {
                nodeOptions: {
                    metadata: {
                        channel: inter.channel
                    },
                    volume: volumeLevel,
                    leaveOnEmpty: client.config.opt.leaveOnEmpty,
                    leaveOnEmptyCooldown: client.config.opt.leaveOnEmptyCooldown,
                    leaveOnEnd: client.config.opt.leaveOnEnd,
                    leaveOnEndCooldown: client.config.opt.leaveOnEndCooldown,
                    connectionOptions: {
                        enableLiveBuffer: true
                    },
                    // Don't pre-download the track
                    fetchBeforeQueued: false,
                    // Stream directly
                    streamOptions: {
                        seek: 0,
                        opusEncoding: true
                    }
                }
            });

            defaultEmbed.setAuthor({ name: await Translate(`Now playing: <${track.title}> <✅>`) });
            await inter.editReply({ embeds: [defaultEmbed], ephemeral: false });
        } catch (error) {
            console.log(`Play error: ${error}`);
            defaultEmbed.setAuthor({ name: await Translate(`I can't join the voice channel... try again? <❌>`) });
            return inter.editReply({ embeds: [defaultEmbed], ephemeral: false });
        }
    }
}
