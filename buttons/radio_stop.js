const { EmbedBuilder } = require('discord.js');
const { Translate } = require('../process_tools');
const { stopRadio } = require('../utils/radioPlayer');

module.exports = async ({ client, inter }) => {
    try {
        // Only allow the requester or admins to stop the radio
        if (inter.member.permissions.has('ADMINISTRATOR') || inter.message.interaction.user.id === inter.user.id) {
            const result = stopRadio(inter.guild.id);
            
            const embed = new EmbedBuilder()
                .setColor('#2f3136')
                .setAuthor({ name: await Translate(result ? 
                    `Radio playback has been stopped. <✅>` : 
                    `No active radio to stop. <❌>`) 
                });
            
            return inter.update({ embeds: [embed], components: [] });
        } else {
            return inter.reply({ 
                content: await Translate(`Only the person who started the radio or an administrator can stop it.`), 
                ephemeral: true 
            });
        }
    } catch (error) {
        console.error('Error in radio_stop button handler:', error);
        
        // Try to provide some feedback even if there's an error
        try {
            return inter.reply({ 
                content: await Translate(`There was an error stopping the radio. Please try again.`), 
                ephemeral: true 
            }).catch(console.error);
        } catch (replyError) {
            console.error('Failed to send error message:', replyError);
        }
    }
};
