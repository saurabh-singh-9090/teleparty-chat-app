import { ExtendedSessionChatMessage } from "../types";

// Helper function to deduplicate messages
export const deduplicateMessages = (messageList: ExtendedSessionChatMessage[]): ExtendedSessionChatMessage[] => {
  // Keep track of system messages we've seen by content
  const seenSystemMessages = new Map<string, ExtendedSessionChatMessage>();
  // Special handling for leave/join sequences
  const userLeaveJoinPairs = new Map<string, boolean>();
  
  // First pass - identify leave/join patterns
  messageList.forEach(msg => {
    if (msg.isSystemMessage) {
      const userName = msg.body.split(':')[0]?.trim();
      
      if (userName) {
        if (msg.body.includes('left')) {
          userLeaveJoinPairs.set(userName, true); // Mark this user as having a "left" message
        } else if (msg.body.includes('joined the party') && userLeaveJoinPairs.has(userName)) {
          // Found a joined message for a user who also has a left message
          userLeaveJoinPairs.set(userName, false); // Reset so we don't filter both messages
        }
      }
    }
  });
  
  return messageList.filter(msg => {
    // Always keep non-system messages
    if (!msg.isSystemMessage) return true;
    
    const userName = msg.body.split(':')[0]?.trim();
    
    // Keep both leave and join messages for the same user during reload
    if (userName && 
        ((msg.body.includes('left') && userLeaveJoinPairs.get(userName) === false) || 
         (msg.body.includes('joined the party')))) {
      return true;
    }
    
    // For system messages about joining, deduplicate only duplicate joins
    if (msg.body.includes('joined the party')) {
      const key = msg.body;
      
      // If we haven't seen this exact system message before, keep it
      if (!seenSystemMessages.has(key)) {
        seenSystemMessages.set(key, msg);
        return true;
      }
      
      // Otherwise, it's a duplicate join, so filter it out
      return false;
    }
    
    // Keep all other system messages
    return true;
  });
};

// Function to check duplicate messages by ID and content
export const isDuplicateMessage = (
  messageKey: string, 
  messageSet: Set<string>
): boolean => {
  if (messageSet.has(messageKey)) {
    console.log("Skipping duplicate message");
    return true;
  }
  return false;
};

// Function to adjust textarea height
export const adjustTextAreaHeight = (textAreaRef: React.RefObject<HTMLTextAreaElement>) => {
  if (textAreaRef.current) {
    textAreaRef.current.style.height = "auto";
    textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
  }
};

// Function to scroll to bottom of the chat
export const scrollToBottom = (messagesEndRef: React.RefObject<HTMLDivElement>) => {
  if (messagesEndRef.current) {
    messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }
}; 