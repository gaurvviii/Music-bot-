const { createAudioResource, createAudioPlayer, AudioPlayerStatus, joinVoiceChannel, StreamType, NoSubscriberBehavior } = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');
const { Translate } = require('../process_tools');
const { useMainPlayer } = require('discord-player');
const https = require('https');
const http = require('http');

// Store active radio connections to manage them
const activeRadioConnections = new Map();

/**
 * Play a radio station in a voice channel
 * @param {Object} options - Options for playing a radio station
 * @param {Object} options.voiceChannel - The voice channel to play in
 * @param {Object} options.interaction - The interaction that triggered this
 * @param {Object} options.station - The radio station to play
 * @param {Number} options.volume - The volume to play at (0-100)
 * @param {Object} options.client - The Discord client
 */
async function playRadioStation({ voiceChannel, interaction, station, volume = 80, client }) {
    try {
        // Clear any existing player in this guild
        if (activeRadioConnections.has(interaction.guild.id)) {
            const oldConnection = activeRadioConnections.get(interaction.guild.id);
            oldConnection.destroy();
            activeRadioConnections.delete(interaction.guild.id);
        }

        // Create the voice connection
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: true,
        });

        // Create the audio player
        const player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play,
            },
        });

        // Direct stream creation using node's http/https modules
        const protocol = station.url.startsWith('https') ? https : http;
        
        // Initial connection to create the stream
        const requestStream = new Promise((resolve, reject) => {
            const req = protocol.get(station.url, (res) => {
                if (res.statusCode === 302 || res.statusCode === 301) {
                    // Handle redirects
                    const redirectUrl = res.headers.location;
                    console.log(`Redirecting to: ${redirectUrl}`);
                    const redirectProtocol = redirectUrl.startsWith('https') ? https : http;
                    
                    const redirectReq = redirectProtocol.get(redirectUrl, (redirectRes) => {
                        resolve(redirectRes);
                    }).on('error', (err) => {
                        console.error('Error during redirect:', err);
                        reject(err);
                    });
                    
                    redirectReq.end();
                } else {
                    resolve(res);
                }
            }).on('error', (err) => {
                console.error('Error connecting to radio stream:', err);
                reject(err);
            });
            
            req.end();
        });

        const streamResponse = await requestStream;
        
        // Create an audio resource from the stream
        const resource = createAudioResource(streamResponse, {
            inputType: StreamType.Arbitrary,
            inlineVolume: true,
        });
        
        // Set the volume
        resource.volume.setVolume(volume / 100);
        
        // Play the stream
        player.play(resource);
        connection.subscribe(player);
        
        // Store the connection for later reference
        activeRadioConnections.set(interaction.guild.id, connection);
        
        // Handle player state changes
        player.on(AudioPlayerStatus.Idle, () => {
            console.log('Radio stream ended or errored, attempting to reconnect...');
            // Try to restart the stream after a brief delay
            setTimeout(() => {
                playRadioStation({ voiceChannel, interaction, station, volume, client });
            }, 5000);
        });
        
        // Handle player errors
        player.on('error', (error) => {
            console.error(`Radio player error: ${error}`);
            
            // Check if the error is potentially recoverable
            if (error.message.includes('ETIMEDOUT') || error.message.includes('ECONNRESET')) {
                console.log('Network error, attempting to reconnect...');
                setTimeout(() => {
                    playRadioStation({ voiceChannel, interaction, station, volume, client });
                }, 5000);
            }
        });

        // Create a rich embed with radio station info
        const radioEmbed = new EmbedBuilder()
            .setColor('#2f3136')
            .setTitle(`📻 ${station.name}`)
            .setDescription(`**Now Playing:** Live Stream`)
            .addFields([
                { name: 'Volume', value: `${volume}%`, inline: true },
            ])
            .setFooter({ text: `Requested by ${interaction.member.displayName}` })
            .setTimestamp();
        
        // Add a thumbnail for visual appeal
        radioEmbed.setThumbnail('https://cdn-icons-png.flaticon.com/512/2995/2995099.png');
        
        return {
            success: true,
            embed: radioEmbed
        };
    } catch (error) {
        console.error(`Failed to play radio: ${error}`);
        return {
            success: false,
            error: error
        };
    }
}

/**
 * Stop the radio on a specific guild
 * @param {string} guildId - The guild ID to stop radio on
 */
function stopRadio(guildId) {
    if (activeRadioConnections.has(guildId)) {
        const connection = activeRadioConnections.get(guildId);
        connection.destroy();
        activeRadioConnections.delete(guildId);
        return true;
    }
    return false;
}

module.exports = { playRadioStation, stopRadio, activeRadioConnections };
