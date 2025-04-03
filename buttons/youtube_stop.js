const { EmbedBuilder } = require('discord.js');
const { Translate } = require('../process_tools');

module.exports = async ({ client, inter }) => {
    try {
        // Get the active connections from the YouTube command
        const activeConnections = require('../commands/music/youtube').activeConnections;
        
        // Only allow the requester or admins to stop the YouTube player
        if (inter.member.permissions.has('ADMINISTRATOR') || inter.message.interaction.user.id === inter.user.id) {
            let result = false;
            
            // Check if there's an active connection for this guild
            if (activeConnections && activeConnections.has(inter.guild.id)) {
                const connection = activeConnections.get(inter.guild.id);
                connection.destroy();
                activeConnections.delete(inter.guild.id);
                result = true;
            }
            
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setAuthor({ name: await Translate(result ? 
                    `YouTube playback has been stopped. <✅>` : 
                    `No active YouTube player to stop. <❌>`) 
                });
            
            // Use try-catch to handle potential "already replied" errors
            try {
                // Try to update the message first
                await inter.update({ embeds: [embed], components: [] });
            } catch (updateError) {
                console.log('Could not update interaction, trying to reply instead:', updateError.message);
                
                // If update fails, try to reply
                try {
                    await inter.reply({ embeds: [embed], ephemeral: true });
                } catch (replyError) {
                    console.error('Failed to reply to interaction:', replyError.message);
                }
            }
        } else {
            // For unauthorized users, use deferReply + editReply pattern which is more reliable
            try {
                await inter.deferReply({ ephemeral: true });
                await inter.editReply({ 
                    content: await Translate(`Only the person who started the YouTube player or an administrator can stop it.`)
                });
            } catch (error) {
                console.error('Failed to respond to unauthorized user:', error.message);
            }
        }
    } catch (error) {
        console.error('Error in youtube_stop button handler:', error);
        
        // Try to provide some feedback even if there's an error
        try {
            // Use deferReply + editReply pattern which is more reliable
            await inter.deferReply({ ephemeral: true }).catch(console.error);
            await inter.editReply({ 
                content: await Translate(`There was an error stopping the YouTube player. Please try again.`)
            }).catch(console.error);
        } catch (replyError) {
            console.error('Failed to send error message:', replyError);
        }
    }
};
