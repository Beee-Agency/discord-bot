export interface MessageData {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
  channel: {
    id: string;
    name: string;
  };
  guild: {
    id: string;
    name: string;
  };
  timestamp: string;
  url: string;
  attachments: AttachmentData[];
  mentions: {
    users: UserMention[];
    everyone: boolean;
    here: boolean;
  };
}

export interface AttachmentData {
  id: string;
  name: string;
  url: string;
  size: number;
}

export interface UserMention {
  id: string;
  username: string;
}

export interface EnvironmentConfig {
  DISCORD_TOKEN: string;
  N8N_WEBHOOK_URL: string;
  DEFAULT_ROLE_ID: string;
}
