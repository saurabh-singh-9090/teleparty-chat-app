import React, { useRef, useEffect } from 'react';
import { useChatContext } from '../context/ChatContext';
import MessageItem from './MessageItem';
import TypingIndicator from './TypingIndicator';
import { deduplicateMessages } from '../utils/chatUtils';
import { scrollToBottom } from '../utils/chatUtils';

const MessageList: React.FC = () => {
  const { 
    messages, 
    nickname, 
    typingUsers, 
    isCurrentUserTyping 
  } = useChatContext();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      scrollToBottom(messagesEndRef as React.RefObject<HTMLDivElement>);
    }
  }, [messages]);

  return (
    <div className="msg-con">
      {deduplicateMessages(messages).map((msg, idx) => (
        <MessageItem key={idx} message={msg} />
      ))}
  
      {/* Only show typing indicator if others are typing AND current user is NOT typing */}
      {typingUsers.length > 0 && 
        !isCurrentUserTyping && 
        typingUsers.every(user => user !== nickname) && (
          <TypingIndicator users={typingUsers} />
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList; 