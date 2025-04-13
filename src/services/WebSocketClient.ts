import {
  TelepartyClient,
  SocketEventHandler,
  SocketMessageTypes
} from "teleparty-websocket-lib";
import { ExtendedTelepartyClient, ExtendedSessionChatMessage } from "../types";

export class WebSocketService {
  private messageSet: Set<string> = new Set();
  
  initializeClient(
    onConnectionReady: () => void,
    onClose: () => void,
    onMessage: (message: any) => void
  ): ExtendedTelepartyClient {
    const eventHandler: SocketEventHandler = {
      onConnectionReady,
      onClose,
      onMessage
    };

    return new TelepartyClient(eventHandler) as ExtendedTelepartyClient;
  }

  async createChatRoom(
    client: ExtendedTelepartyClient,
    nickname: string,
    userIcon?: string
  ): Promise<string> {
    return await client.createChatRoom(nickname, userIcon);
  }

  async joinChatRoom(
    client: ExtendedTelepartyClient,
    nickname: string,
    roomId: string,
    userIcon?: string
  ): Promise<{ messages: ExtendedSessionChatMessage[] }> {
    return await client.joinChatRoom(nickname, roomId, userIcon);
  }

  sendMessage(
    client: ExtendedTelepartyClient,
    body: string,
    userIcon?: string
  ): void {
    client.sendMessage(SocketMessageTypes.SEND_MESSAGE, {
      body,
      userIcon
    });
  }

  sendTypingStatus(
    client: ExtendedTelepartyClient,
    typing: boolean,
    nickname: string,
    userId?: string
  ): void {
    
    const typingData: any = { 
      typing, 
      userNickname: nickname,
      timestamp: Date.now()
    };
    
    if (userId) {
      typingData.userId = userId;
    }
    
    client.sendMessage(SocketMessageTypes.SET_TYPING_PRESENCE, typingData);
  }

  // Check if a message is a duplicate
  isDuplicateMessage(msg: ExtendedSessionChatMessage): boolean {
    const messageKey = `${msg.userId}:${msg.body}`;
    if (this.messageSet.has(messageKey)) {
      return true;
    }
    
    this.messageSet.add(messageKey);
    return false;
  }
}

export default new WebSocketService(); 