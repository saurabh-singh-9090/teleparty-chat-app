import React from 'react';
import { useChatContext } from '../context/ChatContext';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

const ChatRoom: React.FC = () => {
  const {
    roomId,
    reconnecting,
    reconnectAttemptsRef,
    maxReconnectAttempts,
    signOutHandler
  } = useChatContext();

  return (
    <div className="chat-con">
      <h2>Chat Room: {roomId}</h2>
      {reconnecting && (
        <div className="reconnecting-banner">
          Reconnecting... (Attempt {reconnectAttemptsRef?.current}/{maxReconnectAttempts})
        </div>
      )}
      <MessageList />
      <ChatInput />
      <button onClick={signOutHandler} style={{backgroundColor: "red", width: "100%"}}>Sign Out from this chat room</button>
    </div>
  );
};

export default ChatRoom; 