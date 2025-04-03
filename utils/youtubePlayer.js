const { EmbedBuilder } = require('discord.js');
const { useMainPlayer, QueryType } = require('discord-player');

// Store active YouTube connections to manage them
const activeYoutubeConnections = new Map();

/**
 * Validate and normalize YouTube URL
 * @param {string} url - URL to validate
 * @returns {string|null} - Normalized URL or null if invalid
 */
function validateAndNormalizeYoutubeUrl(url) {
    // Check if it's a valid YouTube URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(url)) {
        return null;
    }
    
    // Extract video ID
    let videoId = null;
    
    // Handle youtu.be format
    if (url.includes('youtu.be')) {
        const urlParts = url.split('/');
        videoId = urlParts[urlParts.length - 1].split('?')[0];
    } 
    // Handle youtube.com format
    else if (url.includes('youtube.com')) {
        const urlParams = new URL(url).searchParams;
        videoId = urlParams.get('v');
        
        // If no 'v' parameter, check if it's a shortened URL
        if (!videoId && url.includes('/shorts/')) {
            const shortsPath = url.split('/shorts/')[1];
            videoId = shortsPath.split('?')[0];
        }
    }
    
    // If we couldn't extract a video ID, return null
    if (!videoId) {
        return null;
    }
    
    // Return a normalized URL
    return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Play a YouTube video in a voice channel
 * @param {Object} options - Options for playing a YouTube video
 * @param {Object} options.voiceChannel - The voice channel to play in
 * @param {Object} options.interaction - The interaction that triggered this
 * @param {String} options.url - The YouTube URL to play
 * @param {Number} options.volume - The volume to play at (0-100)
 * @param {Object} options.client - The Discord client
 */
async function playYoutubeVideo({ voiceChannel, interaction, url, volume = 80, client }) {
    try {
        // Validate and normalize YouTube URL
        const normalizedUrl = validateAndNormalizeYoutubeUrl(url);
        if (!normalizedUrl) {
            return {
                success: false,
                error: new Error('Invalid YouTube URL. Please provide a valid YouTube link.')
            };
        }
        
        console.log(`Playing YouTube video: ${normalizedUrl}`);

        // Get the player instance
        const player = useMainPlayer();
        
        // Search for the video using the normalized URL
        const result = await player.search(normalizedUrl, {
            requestedBy: interaction.member,
            searchEngine: QueryType.YOUTUBE_VIDEO // Force YouTube video search
        });
        
        if (!result?.tracks.length) {
            return {
                success: false,
                error: new Error('No results found for this URL. The video might be unavailable or restricted.')
            };
        }
        
        // Get the track
        const track = result.tracks[0];
        
        // Play the track with optimized settings for YouTube
        await player.play(voiceChannel, track, {
            nodeOptions: {
                metadata: {
                    channel: interaction.channel,
                    client: client,
                    requestedBy: interaction.user
                },
                volume: volume,
                leaveOnEmpty: client.config.opt.leaveOnEmpty,
                leaveOnEmptyCooldown: client.config.opt.leaveOnEmptyCooldown,
                leaveOnEnd: client.config.opt.leaveOnEnd,
                leaveOnEndCooldown: client.config.opt.leaveOnEndCooldown,
                // Optimize for streaming
                bufferingTimeout: 0,
                connectionOptions: {
                    enableLiveBuffer: false
                },
                // Don't pre-download
                fetchBeforeQueued: false
            }
        });
        
        // Store the connection for reference
        const connection = player.voiceUtils.getConnection(interaction.guild.id);
        if (connection) {
            activeYoutubeConnections.set(interaction.guild.id, connection);
        }

        // Create a rich embed with video info
        const youtubeEmbed = new EmbedBuilder()
            .setColor('#FF0000') // YouTube red
            .setTitle(`🎵 ${track.title}`)
            .setDescription(`**Channel:** ${track.author}`)
            .addFields([
                { name: 'Duration', value: track.duration, inline: true },
                { name: 'Volume', value: `${volume}%`, inline: true },
            ])
            .setFooter({ text: `Requested by ${interaction.member.displayName}` })
            .setTimestamp();
        
        // Add the video thumbnail if available
        if (track.thumbnail) {
            youtubeEmbed.setThumbnail(track.thumbnail);
        }
        
        return {
            success: true,
            embed: youtubeEmbed
        };
    } catch (error) {
        console.error(`Failed to play YouTube video: ${error}`);
        return {
            success: false,
            error: error
        };
    }
}

/**
 * Stop the YouTube player on a specific guild
 * @param {string} guildId - The guild ID to stop YouTube on
 */
function stopYoutube(guildId) {
    try {
        const player = useMainPlayer();
        const queue = player.nodes.get(guildId);
        
        if (queue) {
            queue.delete();
            return true;
        } else if (activeYoutubeConnections.has(guildId)) {
            const connection = activeYoutubeConnections.get(guildId);
            connection.destroy();
            activeYoutubeConnections.delete(guildId);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error(`Error stopping YouTube: ${error}`);
        return false;
    }
}

module.exports = { playYoutubeVideo, stopYoutube, activeYoutubeConnections };
