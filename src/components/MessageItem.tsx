import React from 'react';
import { ExtendedSessionChatMessage } from '../types';

interface MessageItemProps {
  message: ExtendedSessionChatMessage;
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  return (
    <div className={message.isSystemMessage ? "user-name" : "user-msg"}>
      {message.userSettings?.userIcon && (
        <img
          src={message.userSettings.userIcon}
          alt="User Icon"
          style={{ width: '30px', height: '30px', borderRadius: '50%', marginRight: '8px' }}
        />
      )}
      {!message.userSettings?.userIcon && message.userIcon && (
        <img
          src={message.userIcon}
          alt="User Icon"
          style={{ width: '30px', height: '30px', borderRadius: '50%', marginRight: '8px' }}
        />
      )}
      {message.userNickname && <strong>{message.userNickname}: </strong>}
      {message.body}
    </div>
  );
};

export default MessageItem; 