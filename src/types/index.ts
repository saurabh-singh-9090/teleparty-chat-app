import {
  TelepartyClient,
  SessionChatMessage,
} from "teleparty-websocket-lib";
import { MutableRefObject } from "react";

// Extend the SessionChatMessage interface to include userId
export interface ExtendedSessionChatMessage extends SessionChatMessage {
  userId?: string;
  userIcon?: string;
}

// Extend the TelepartyClient interface to include socketUserId
export interface ExtendedTelepartyClient extends TelepartyClient {
  socketUserId?: string;
}

// ChatContext interface
export interface ChatContextType {
  roomId: string;
  nickname: string;
  messages: ExtendedSessionChatMessage[];
  joined: boolean;
  reconnecting: boolean;
  autoJoining: boolean;
  client: ExtendedTelepartyClient | null;
  userIcon: string | null;
  typingUsers: string[];
  currentUserId: string | null;
  isCurrentUserTyping: boolean;
  reconnectAttemptsRef: MutableRefObject<number>;
  maxReconnectAttempts: number;
  setRoomId: (roomId: string) => void;
  setNickname: (nickname: string) => void;
  setMessages: React.Dispatch<React.SetStateAction<ExtendedSessionChatMessage[]>>;
  setJoined: (joined: boolean) => void;
  setClient: React.Dispatch<React.SetStateAction<ExtendedTelepartyClient | null>>;
  setUserIcon: (userIcon: string | null) => void;
  setTypingUsers: React.Dispatch<React.SetStateAction<string[]>>;
  setCurrentUserId: (userId: string | null) => void;
  setIsCurrentUserTyping: (isTyping: boolean) => void;
  addUserToMapping: (userId: string, nickname: string) => void;
  userIdToNickname: Record<string, string>;
  handleCreateRoom: () => Promise<void>;
  handleJoinRoom: (roomId: string) => Promise<void>;
  handleSendMessage: (message: string) => void;
  sendTyping: (typing: boolean) => void;
  signOutHandler: () => void;
} 