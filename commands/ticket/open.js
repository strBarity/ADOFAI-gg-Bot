const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');

const main = require('../../main');
const lang = require('../../lang');

const Ticket = require('../../schemas/ticket');

const openProcessing = {};

module.exports = async interaction => {
    await interaction.deferReply();
    
    const ticket = await Ticket.findOne({
        channel: interaction.channel.id,
        open: false
    });
    if(!ticket) return interaction.editReply(lang.langByLangName(interaction.dbUser.lang, 'TICKET_NOT_FOUND'));

    const checkOpenOther = await Ticket.findOne({
        user: ticket.user,
        open: true
    });
    if(checkOpenOther != null) return interaction.editReply(
        lang.langByLangName(interaction.dbUser.lang, 'TICKET_OTHER_OPENED')
            .replace('{channel}', `<#${checkOpenOther.channel}>`)
    );

    if(openProcessing[interaction.channel.id]) return interaction.editReply(
        lang.langByLangName(interaction.dbUser.lang, 'TICKET_ALREADY_OPENING')
    );

    const msg = await interaction.editReply({
        content: lang.langByLangName(interaction.dbUser.lang, 'TICKET_OPEN_CONFIRM'),
        components: [
            new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('ticketOpenConfirm')
                        .setLabel(lang.langByLangName(interaction.dbUser.lang, 'OPEN'))
                        .setStyle('SUCCESS')
                )
        ]
    });

    try {
        openProcessing[interaction.channel.id] = true;

        const confirmInteraction = await msg.awaitMessageComponent({
            filter: i => i.customId == 'ticketOpenConfirm',
            time: 10000
        });

        await confirmInteraction.deferUpdate();

        delete openProcessing[interaction.channel.id];
    } catch(e) {
        delete openProcessing[interaction.channel.id];

        msg.components[0].components[0].setDisabled();
        return msg.edit({
            components: msg.components
        });
    }

    await interaction.channel.setParent(main.Server.channel.openTicketCategory);

    await Ticket.updateOne({
        channel: interaction.channel.id
    }, {
        open: true
    });

    const ticketUser = await interaction.client.users.fetch(ticket.user);

    if(ticketUser) try {
        await ticketUser.send({
            embeds: [
                new MessageEmbed()
                    .setColor('#00ff00')
                    .setTitle('?????? ?????? / Ticket Opened')
                    .setDescription(`${interaction.channel.name} ????????? ?????? ???????????????. ????????? ???????????? ?????? ??????????????? ???????????? ????????? ??? ????????????.\nTickets ${interaction.channel.name} have been reopened. You can send a message to the bot and deliver the message to the administrator.`)
            ]
        });
    } catch(e) {}

    return interaction.editReply(
        lang.langByLangName(interaction.dbUser.lang, 'TICKET_OPENED')
    );
}