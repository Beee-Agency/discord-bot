import { Client, GatewayIntentBits, Message } from "discord.js";
import axios, { AxiosResponse } from "axios";
import { config } from "./config/environment";
import { MessageData } from "./types";

class DiscordBot {
  private client: Client;
  private readonly channelId: string;
  private readonly webhookUrl: string;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
      ],
    });

    this.channelId = config.CHANNEL_ID;
    this.webhookUrl = config.N8N_WEBHOOK_URL;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.client.once("ready", () => {
      console.log(`✅ Bot connecté en tant que ${this.client.user?.tag}`);
      console.log(`📡 Surveillance du salon: ${this.channelId}`);
      console.log(`🔗 Webhook n8n: ${this.webhookUrl}`);
    });

    this.client.on("messageCreate", this.handleMessage.bind(this));
    this.client.on("error", this.handleError.bind(this));
    this.client.on("guildMemberAdd", this.handleNewMember.bind(this));
  }

  // Récupère le dernier message dans le salon de vérification
  private async handleMessage(message: Message): Promise<void> {
    try {
      // Ignorer les messages du bot
      if (message.author.bot) return;

      // Vérifier si c'est le bon salon
      if (message.channel.id !== this.channelId) return;

      console.log(
        `📨 Nouveau message de ${message.author.username}: ${message.content}`
      );

      const messageData = this.formatMessageData(message);
      await this.sendToN8n(messageData);
    } catch (error) {
      console.error("❌ Erreur lors du traitement du message:", error);
    }
  }

  // Formatage des données renvoyées
  private formatMessageData(message: Message): MessageData {
    if (!message.guild) {
      throw new Error("Message non envoyé dans un serveur");
    }

    return {
      id: message.id,
      content: message.content,
      author: {
        id: message.author.id,
        username: message.author.username,
        displayName: message.author.displayName || message.author.username,
        avatar: message.author.displayAvatarURL(),
      },
      channel: {
        id: message.channel.id,
        name: message.channel.isDMBased()
          ? "DM"
          : (message.channel as any).name || "Unknown",
      },
      guild: {
        id: message.guild.id,
        name: message.guild.name,
      },
      timestamp: message.createdAt.toISOString(),
      url: message.url,
      attachments: message.attachments.map((attachment) => ({
        id: attachment.id,
        name: attachment.name,
        url: attachment.url,
        size: attachment.size,
      })),
      mentions: {
        users: message.mentions.users.map((user) => ({
          id: user.id,
          username: user.username,
        })),
        everyone: message.mentions.everyone,
        // Correction: on vérifie si le message contient @here manuellement
        here: message.content.includes("@here"),
      },
    };
  }

  // Envoie des données
  private async sendToN8n(messageData: MessageData): Promise<void> {
    try {
      const response: AxiosResponse = await axios.post(
        this.webhookUrl,
        messageData,
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      console.log(`✅ Message envoyé vers n8n (Status: ${response.status})`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("❌ Erreur Axios:", error.message);
        if (error.response) {
          console.error("Response status:", error.response.status);
          console.error("Response data:", error.response.data);
        }
      } else {
        console.error("❌ Erreur inconnue:", error);
      }
      throw error;
    }
  }

  private async handleNewMember(member: GuildMember): Promise<void> {
    try {
      const roleId = config.DEFAULT_ROLE_ID; // Mets l’ID du rôle dans ta config

      await member.roles.add(roleId);
      console.log(`✅ Rôle ajouté à ${member.user.tag}`);
    } catch (error) {
      console.error(
        `❌ Impossible d’ajouter le rôle à ${member.user.tag}:`,
        error
      );
    }
  }

  private handleError(error: Error): void {
    console.error("❌ Erreur Discord:", error);
  }

  public async start(): Promise<void> {
    try {
      console.log("🚀 Démarrage du bot...");
      await this.client.login(config.DISCORD_TOKEN);
    } catch (error) {
      console.error("❌ Erreur de connexion:", error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    console.log("\n👋 Arrêt du bot...");
    this.client.destroy();
  }
}

// Initialisation et démarrage
const bot = new DiscordBot();

// Gestion des signaux d'arrêt
const gracefulShutdown = async (signal: string): Promise<void> => {
  console.log(`\n📡 Signal reçu: ${signal}`);
  await bot.stop();
  process.exit(0);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Gestion des erreurs non capturées
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Promesse rejetée non gérée:", reason);
  console.error("À:", promise);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Exception non capturée:", error);
  process.exit(1);
});

// Démarrage du bot
bot.start().catch((error) => {
  console.error("❌ Impossible de démarrer le bot:", error);
  process.exit(1);
});
