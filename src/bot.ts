import {
  Client,
  GatewayIntentBits,
  Guild,
  GuildMember,
  Invite,
} from "discord.js";
import axios from "axios";
import { config } from "./config/environment";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const invitesCache: Map<string, Map<string, number>> = new Map();

// ⚙️ Met à jour le cache des invitations pour une guilde
async function cacheGuildInvites(guild: Guild): Promise<void> {
  try {
    const invites = await guild.invites.fetch();
    const codeUsesMap = new Map<string, number>();
    invites.forEach((inv) => codeUsesMap.set(inv.code, inv.uses ?? 0));
    invitesCache.set(guild.id, codeUsesMap);
    console.log(`📥 Invites mises en cache pour ${guild.name}`);
  } catch (err) {
    console.warn(
      `⚠️ Erreur lors du fetch des invites pour ${guild.name}:`,
      err
    );
  }
}

// 🔄 Au démarrage du bot
client.once("ready", async () => {
  console.log(`✅ Bot connecté en tant que ${client.user?.tag}`);
  for (const [, guild] of client.guilds.cache) {
    await cacheGuildInvites(guild);
  }
});

// 👤 Détection des nouveaux membres
client.on("guildMemberAdd", async (member: GuildMember) => {
  try {
    const guild = member.guild;
    const oldInvites = invitesCache.get(guild.id) || new Map();
    const newInvites = await guild.invites.fetch();

    let usedInvite: Invite | null = null;

    for (const [code, invite] of newInvites) {
      const oldUses = oldInvites.get(code) ?? 0;
      const newUses = invite.uses ?? 0;
      console.log(`🔍 Vérif invite ${code}: old=${oldUses} new=${newUses}`);

      if (newUses > oldUses) {
        usedInvite = invite;
        break;
      }
    }

    await cacheGuildInvites(guild); // met à jour le cache après comparaison

    const payload = {
      userId: member.user.id,
      username: member.user.username,
      discriminator: member.user.discriminator,
      inviteCode: usedInvite?.code ?? null,
      inviter: usedInvite?.inviter?.username ?? null,
      joinedAt: new Date().toISOString(),
      guildId: guild.id,
      guildName: guild.name,
    };

    console.log("📡 Envoi à n8n :", payload);
    await axios.post(config.N8N_WEBHOOK_URL, payload, {
      headers: { "Content-Type": "application/json" },
    });

    console.log("✅ Données envoyées à n8n");

    await member.roles.add(config.DEFAULT_ROLE_ID);
    console.log(`✅ Rôle ajouté à ${member.user.tag}`);
  } catch (err) {
    console.error("❌ Erreur dans guildMemberAdd:", err);
  }
});

// 🧠 Mise à jour du cache si une invitation est créée ou supprimée
client.on("inviteCreate", async (invite) => {
  if (invite.guild instanceof Guild) {
    await cacheGuildInvites(invite.guild);
  }
});

client.on("inviteDelete", async (invite) => {
  if (invite.guild instanceof Guild) {
    await cacheGuildInvites(invite.guild);
  }
});

// ▶️ Lancement
client.login(config.DISCORD_TOKEN).catch((err) => {
  console.error("❌ Erreur lors de la connexion:", err);
  process.exit(1);
});
