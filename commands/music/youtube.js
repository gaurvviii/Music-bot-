const { ApplicationCommandOptionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { QueryType, useMainPlayer } = require('discord-player');
const { Translate } = require('../../process_tools');

// Store active YouTube connections
const activeConnections = new Map();

// Cache for converted URLs to avoid redundant conversions
const convertedUrlCache = new Map();

module.exports = {
    name: 'youtube',
    description: ("Play a YouTube video by URL"),
    voiceChannel: true,
    options: [
        {
            name: 'url',
            description: ('The YouTube URL you want to play'),
            type: ApplicationCommandOptionType.String,
            required: true,
        },
        {
            name: 'quality',
            description: ('Audio quality (higher uses more bandwidth)'),
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
        const url = inter.options.getString('url');
        const qualityOption = inter.options.getString('quality') || 'high';
        
        const defaultEmbed = new EmbedBuilder().setColor('#FF0000');
        
        // Validate URL input
        if (!url || typeof url !== "string") {
            defaultEmbed.setAuthor({ name: await Translate(`Please provide a valid YouTube URL. <❌>`) });
            return inter.editReply({ embeds: [defaultEmbed], ephemeral: false });
        }
        
        console.log("YouTube URL:", url);
        
        // More specific YouTube URL validation
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})(\S*)?$/;
        if (!youtubeRegex.test(url)) {
            defaultEmbed.setAuthor({ name: await Translate(`Please provide a valid YouTube URL (e.g., https://www.youtube.com/watch?v=5EpyN_6dqyk). <❌>`) });
            return inter.editReply({ embeds: [defaultEmbed], ephemeral: false });
        }
        
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
            // Tell user we're connecting to YouTube
            defaultEmbed.setAuthor({ name: await Translate(`Processing YouTube video... <🎵>`) });
            await inter.editReply({ embeds: [defaultEmbed], ephemeral: false });
            
            // Normalize the URL to ensure it's in the correct format
            let normalizedUrl = url;
            
            // Extract video ID for better handling
            let videoId = null;
            
            // Handle youtu.be format
            if (url.includes('youtu.be')) {
                const urlParts = url.split('/');
                videoId = urlParts[urlParts.length - 1].split('?')[0];
                normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`;
            } 
            // Handle youtube.com format
            else if (url.includes('youtube.com')) {
                // Handle watch URLs
                if (url.includes('/watch?v=')) {
                    try {
                        const urlObj = new URL(url);
                        videoId = urlObj.searchParams.get('v');
                        normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`;
                    } catch (e) {
                        console.error('Error parsing YouTube URL:', e);
                    }
                }
                // Handle shorts
                else if (url.includes('/shorts/')) {
                    const shortsPath = url.split('/shorts/')[1];
                    videoId = shortsPath.split('?')[0];
                    normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`;
                }
            }
            
            console.log(`Processing YouTube video with normalized URL: ${normalizedUrl}`);
            
            // Get the player instance
            const player = useMainPlayer();
            
            // Use the built-in search functionality of discord-player
            const searchResult = await player.search(normalizedUrl, {
                requestedBy: inter.user,
                searchEngine: QueryType.YOUTUBE_VIDEO
            });
            
            if (!searchResult || !searchResult.tracks.length) {
                defaultEmbed.setAuthor({ name: await Translate(`No results found for this YouTube URL... <❌>`) });
                return inter.editReply({ embeds: [defaultEmbed], ephemeral: false });
            }
            
            // Create a queue if it doesn't exist
            const queue = player.nodes.create(inter.guild, {
                metadata: {
                    channel: inter.channel,
                    client: client,
                    requestedBy: inter.user
                },
                volume: volumeLevel,
                leaveOnEmpty: client.config.opt.leaveOnEmpty,
                leaveOnEmptyCooldown: client.config.opt.leaveOnEmptyCooldown,
                leaveOnEnd: client.config.opt.leaveOnEnd,
                leaveOnEndCooldown: client.config.opt.leaveOnEndCooldown,
                bufferingTimeout: 0,
                connectionOptions: {
                    selfDeaf: true
                }
            });
            
            try {
                // Connect to the voice channel
                if (!queue.connection) {
                    await queue.connect(inter.member.voice.channel);
                }
            } catch (error) {
                console.error('Connection error:', error);
                player.nodes.delete(inter.guild.id);
                defaultEmbed.setAuthor({ name: await Translate(`I can't join the voice channel... <❌>`) });
                return inter.editReply({ embeds: [defaultEmbed], ephemeral: false });
            }
            
            // Store the connection for reference
            if (queue.connection) {
                activeConnections.set(inter.guild.id, queue.connection);
            }
            
            try {
                // Play the first track from the search results
                const track = searchResult.tracks[0];
                await queue.node.play(track);
                
                // Create a rich embed with video info
                const youtubeEmbed = new EmbedBuilder()
                    .setColor('#FF0000') // YouTube red
                    .setTitle(`🎵 ${track.title || 'YouTube Audio'}`)
                    .setDescription(`**Channel:** ${track.author || 'YouTube Channel'}`)
                    .addFields([
                        { name: 'Duration', value: track.duration || 'Unknown', inline: true },
                        { name: 'Volume', value: `${volumeLevel}%`, inline: true },
                    ])
                    .setFooter({ text: `Requested by ${inter.member.displayName}` })
                    .setTimestamp();
                
                // Add the video thumbnail if available
                if (track.thumbnail) {
                    youtubeEmbed.setThumbnail(track.thumbnail);
                }
                
                // Send a non-ephemeral message without the button
                await inter.editReply({ 
                    embeds: [youtubeEmbed], 
                    components: [],
                    ephemeral: false 
                });
                
            } catch (error) {
                console.error('Play error:', error);
                player.nodes.delete(inter.guild.id);
                defaultEmbed.setAuthor({ name: await Translate(`I can't play this YouTube URL... try again? <❌>`) });
                return inter.editReply({ embeds: [defaultEmbed], ephemeral: false });
            }
        } catch (error) {
            console.log(`YouTube play error: ${error}`);
            defaultEmbed.setAuthor({ name: await Translate(`I can't play this YouTube URL... try again? <❌>`) });
            return inter.editReply({ embeds: [defaultEmbed], ephemeral: false });
        }
    },
    
    // Export the activeConnections map for the button handler
    activeConnections
};
