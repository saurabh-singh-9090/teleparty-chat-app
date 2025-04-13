import React, { useState, useRef, useEffect } from 'react';
import { useChatContext } from '../context/ChatContext';
import { adjustTextAreaHeight } from '../utils/chatUtils';

const ChatInput: React.FC = () => {
  const [message, setMessage] = useState("");
  const { 
    handleSendMessage, 
    sendTyping,
    reconnecting 
  } = useChatContext();
  
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Effect to adjust textarea height on component mount
  useEffect(() => {
    if (textAreaRef.current) {
      adjustTextAreaHeight({ current: textAreaRef.current });
    }
  }, []);

  const handleSubmit = () => {
    if (!message.trim() || reconnecting) return;
    
    handleSendMessage(message);
    setMessage("");
    
    // Reset textarea height after sending
    setTimeout(() => {
      if (textAreaRef.current) {
        adjustTextAreaHeight({ current: textAreaRef.current });
      }
    }, 10);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (textAreaRef.current) {
      adjustTextAreaHeight({ current: textAreaRef.current });
    }
    setMessage(e.target.value);
    
    // Send typing status
    sendTyping(true);

    // Reset typing timer
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
    }, 1000);
  };

  return (
    <div className="input-con">
      <textarea
        ref={textAreaRef}
        placeholder="Type your message"
        value={message}
        onChange={handleTyping}
        onKeyDown={handleKeyPress}
        style={{
          height: "56px"
        }}
        disabled={reconnecting}
      />
      <button 
        onClick={handleSubmit} 
        disabled={!message.trim() || reconnecting}
      >
        Send
      </button>
    </div>
  );
};

export default ChatInput; 