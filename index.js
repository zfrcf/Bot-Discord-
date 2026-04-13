const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildInvites]
});

// Stockage temporaire des invitations (en production, utilise une base de données)
const invitesCache = new Map();

client.once('ready', async () => {
    console.log(`Connecté en tant que ${client.user.tag}`);
    
    // Enregistrement de la commande /invite
    const commands = [
        new SlashCommandBuilder()
            .setName('invite')
            .setDescription('Génère un lien d\'invitation unique qui te crédite.')
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

// Commande /invite
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'invite') {
        const invite = await interaction.channel.createInvite({
            maxAge: 0, // Illimité
            unique: true,
            reason: `Lien généré pour ${interaction.user.tag}`
        });

        await interaction.reply({ 
            content: `Voici ton lien unique : ${invite.url}\nChaque personne qui rejoint via ce lien te donnera un point d'invitation !`,
            ephemeral: true 
        });
    }
});

// Détection d'un nouveau membre
client.on('guildMemberAdd', async member => {
    const newInvites = await member.guild.invites.fetch();
    const oldInvites = invitesCache.get(member.guild.id);
    
    const inviteUsed = newInvites.find(inv => inv.uses > (oldInvites.get(inv.code) || 0));
    
    if (inviteUsed) {
        console.log(`${member.user.tag} a rejoint grâce à ${inviteUsed.inviter.tag}`);
        // Ici tu peux ajouter un système de points en base de données
    }

    // Mise à jour du cache
    const counts = new Map();
    newInvites.forEach(inv => counts.set(inv.code, inv.uses));
    invitesCache.set(member.guild.id, counts);
});

client.login(process.env.TOKEN);
