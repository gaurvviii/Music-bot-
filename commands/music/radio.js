const { ApplicationCommandOptionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Translate } = require('../../process_tools');
const radioStations = require('../../radioStations');
const { playRadioStation, stopRadio } = require('../../utils/radioPlayer');

module.exports = {
    name: 'radio',
    description: ('Play a live radio station'),
    voiceChannel: true,
    options: [
        {
            name: 'station',
            description: ('The radio station you want to listen to'),
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: radioStations.map(station => ({
                name: station.name,
                value: station.name
            }))
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
        const stationName = inter.options.getString('station');
        const qualityOption = inter.options.getString('quality') || 'high';
        
        const defaultEmbed = new EmbedBuilder().setColor('#2f3136');
        
        // Set quality based on user selection
        let volumeLevel = client.config.opt.volume;
        
        switch(qualityOption) {
            case 'low':
                volumeLevel = Math.min(client.config.opt.volume, 70);
                break;
            case 'medium':
                volumeLevel = Math.min(client.config.opt.volume, 80);
                break;
            case 'high':
                volumeLevel = client.config.opt.volume;
                break;
        }
        
        try {
            // Find the selected radio station
            const station = radioStations.find(s => s.name === stationName);
            
            if (!station) {
                defaultEmbed.setAuthor({ name: await Translate(`Radio station not found. Try again? <❌>`) });
                return inter.editReply({ embeds: [defaultEmbed], ephemeral: false });
            }
            
            // Tell user we're connecting to the radio station
            defaultEmbed.setAuthor({ name: await Translate(`Connecting to ${station.name} radio... <📻>`) });
            await inter.editReply({ embeds: [defaultEmbed], ephemeral: false });
            
            // Use our custom radio player instead of discord-player
            try {
                const result = await playRadioStation({
                    voiceChannel: inter.member.voice.channel,
                    interaction: inter,
                    station: station,
                    volume: volumeLevel,
                    client: client
                });
                
                if (result.success) {
                    // Create a stop button that uses the button handler system
                    const stopButton = new ButtonBuilder()
                        .setCustomId('radio_stop')
                        .setLabel('Stop Radio')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('⏹️');

                    const row = new ActionRowBuilder().addComponents(stopButton);
                    
                    // Send a non-ephemeral message with the button
                    await inter.editReply({ 
                        embeds: [result.embed], 
                        components: [row],
                        ephemeral: false 
                    });
                    
                    return;
                } else {
                    defaultEmbed.setAuthor({ name: await Translate(`Error playing radio station. Try another station? <❌>`) });
                    return inter.editReply({ embeds: [defaultEmbed], ephemeral: false });
                }
            } catch (error) {
                console.log(`Radio play error: ${error}`);
                defaultEmbed.setAuthor({ name: await Translate(`Error playing radio station. Try another station? <❌>`) });
                return inter.editReply({ embeds: [defaultEmbed], ephemeral: false });
            }
        } catch (error) {
            console.log(`Radio command error: ${error}`);
            defaultEmbed.setAuthor({ name: await Translate(`I can't join the voice channel... try again? <❌>`) });
            return inter.editReply({ embeds: [defaultEmbed], ephemeral: false });
        }
    }
};
