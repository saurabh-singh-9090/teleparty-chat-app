import React, { createContext, useState, useEffect, useRef, useContext } from 'react';
import { SocketMessageTypes } from 'teleparty-websocket-lib';
import { ExtendedSessionChatMessage, ExtendedTelepartyClient, ChatContextType } from '../types';
import { deduplicateMessages } from '../utils/chatUtils';
import WebSocketService from '../services/WebSocketClient';

// Create the context with a default value
const ChatContext = createContext<ChatContextType | null>(null);

// Custom hook to use the chat context
export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: React.ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  // Check localStorage first and initialize joined state accordingly
  const savedRoomId = localStorage.getItem("roomId");
  const savedNickname = localStorage.getItem("nickname");
  const hasExplicitlyJoined = localStorage.getItem("hasJoinedRoom") === "true";
  
  const [roomId, setRoomId] = useState(() => savedRoomId || "");
  const [nickname, setNickname] = useState(() => savedNickname || "");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ExtendedSessionChatMessage[]>([]);
  const [joined, setJoined] = useState(Boolean(savedRoomId && savedNickname && hasExplicitlyJoined));
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [client, setClient] = useState<ExtendedTelepartyClient | null>(null);
  const [userIcon, setUserIcon] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [reconnecting, setReconnecting] = useState(false);
  const [autoJoining, setAutoJoining] = useState(Boolean(savedRoomId && savedNickname && hasExplicitlyJoined));
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoJoinAttemptRef = useRef(0);
  const maxAutoJoinAttempts = 3;
  // Map to store user IDs to nicknames
  const [userIdToNickname, setUserIdToNickname] = useState<Record<string, string>>({});
  // Current user ID (set when joining or creating a room)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // Track if current user is typing
  const [isCurrentUserTyping, setIsCurrentUserTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Function to add a user to the mapping
  const addUserToMapping = (userId: string, nickname: string) => {
    setUserIdToNickname(prev => {
      if (prev[userId] === nickname) return prev;
      console.log(`Adding user mapping: ${userId} -> ${nickname}`);
      return { ...prev, [userId]: nickname };
    });
  };

  const handleSocketMessage = (message: any) => {
    if (message.type === SocketMessageTypes.SEND_MESSAGE) {
      const msg = message.data as ExtendedSessionChatMessage;
      
      // When we receive a message, update our mapping of user IDs to nicknames
      if (msg.userNickname && msg.userId) {
        addUserToMapping(msg.userId, msg.userNickname);
      }
      
      // Skip adding duplicate join messages for the current user during reconnection
      if (reconnecting && msg.isSystemMessage && msg.body.includes(`${nickname}: joined the party`)) {
        console.log("Skipping duplicate join message during reconnection");
        return;
      }

      // Check if the message is a duplicate
      if (WebSocketService.isDuplicateMessage(msg)) {
        return;
      }
      
      // Ensure userIcon is properly set in the message object
      if (!msg.userIcon && msg.userSettings?.userIcon) {
        msg.userIcon = msg.userSettings.userIcon;
      }
      
      setMessages((prev) => {
        // Check if this is a duplicate join message that we already have
        if (msg.isSystemMessage && msg.body.includes(`${nickname}: joined the party`)) {
          const isDuplicate = prev.some(
            existingMsg => 
              existingMsg.isSystemMessage && 
              existingMsg.body.includes(`${nickname}: joined the party`)
          );
          
          if (isDuplicate) {
            console.log("Skipping duplicate join message");
            return prev;
          }
        }
        
        const updatedMessages = [...prev, msg];
        return updatedMessages;
      });
    }
    else if (message.type === SocketMessageTypes.SET_TYPING_PRESENCE) {
      console.log("Typing presence received:", message.data);
      
      // Handle both formats of typing messages
      const { typing, userNickname, usersTyping, userId } = message.data;
      
      // First format: direct userNickname and typing status
      if (userNickname !== undefined) {
        console.log(`Received typing status: ${typing} for user: ${userNickname}`);
        
        // Check if this is about the current user - use strict equality checking
        const isAboutCurrentUser = 
          userNickname === nickname || 
          (userId && userId === currentUserId);
        
        if (isAboutCurrentUser) {
          console.log(`This typing status is about the current user (${nickname}), not updating UI`);
          // Update our own typing state
          setIsCurrentUserTyping(typing);
          return;
        }
        
        // Update typing users for other users
        setTypingUsers(prev => {
          let updatedTypingUsers;
          
          if (typing) {
            // Add user to typing list
            console.log(`${userNickname} started typing`);
            updatedTypingUsers = [...new Set([...prev, userNickname])];
          } else {
            // Remove user from typing list
            console.log(`${userNickname} stopped typing`);
            updatedTypingUsers = prev.filter(user => user !== userNickname);
          }
          
          console.log("Updated typing users:", updatedTypingUsers);
          return updatedTypingUsers;
        });
      } 
      // Second format: usersTyping array with IDs
      else if (usersTyping && Array.isArray(usersTyping)) {
        console.log("Received usersTyping array:", usersTyping);
        console.log("Current user ID:", currentUserId);
        
        // We need to know if current user is typing from this message
        const isCurrentUserInList = usersTyping.some((id: string) => id === currentUserId);
        console.log(`Is current user (${currentUserId}) in typing list:`, isCurrentUserInList);
        
        // Check if our own ID is in the list and update our state accordingly
        if (isCurrentUserInList) {
          setIsCurrentUserTyping(true);
        } else if (isCurrentUserTyping && !message.trim) {
          // If the message is empty and we're not in the typing list, make sure we're marked as not typing
          setIsCurrentUserTyping(false);
        }
        
        // Filter out our own ID before updating state
        const filteredTypingUsers = usersTyping.filter((userId: string) => {
          // Check if this is the current user by ID or any other known identifier
          const isCurrentUser = 
            userId === currentUserId || 
            userIdToNickname[userId] === nickname;
            
          if (isCurrentUser) {
            console.log(`Filtering out own user ID: ${userId} (or nickname match)`);
          }
          return !isCurrentUser;
        });
        
        // Convert user IDs to nicknames where possible
        const typingNicknames = filteredTypingUsers.map((userId: string) => {
          // Try to find nickname in our mapping
          const matchedNickname = userIdToNickname[userId];
          if (matchedNickname) {
            return matchedNickname;
          }
          // Fall back to user ID if no mapping exists
          return userId;
        });
        
        // Final safety check to filter out the current user's nickname if it somehow got through
        const safeTypingNicknames = typingNicknames.filter(
          name => name !== nickname
        );
        
        console.log("Final typing users list:", safeTypingNicknames);
        setTypingUsers(safeTypingNicknames);
      }
      // Fallback warning if neither format is detected
      else {
        console.warn("Received typing status without userNickname or usersTyping");
      }
    }
    // Handle user join/leave events for mapping
    else if (message.type === "userJoined" && message.data) {
      const { userId, userNickname } = message.data;
      if (userId && userNickname) {
        addUserToMapping(userId, userNickname);
      }
    }
  };

  const handleConnectionReady = () => {
    console.log("Connection established");
    reconnectAttemptsRef.current = 0;
    setReconnecting(false);
  };

  const handleClose = () => {
    if (!joined) return; // Don't attempt reconnection if user hasn't joined a room
    
    console.log("Connection lost. Attempting to reconnect...");
    setReconnecting(true);
    
    if (reconnectAttemptsRef.current < maxReconnectAttempts) {
      // Exponential backoff for reconnect attempts (1s, 2s, 4s, 8s, 16s)
      const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectAttemptsRef.current += 1;
        reconnect();
      }, delay);
    } else {
      setReconnecting(false);
      alert("Connection lost. Please reload the page to reconnect.");
    }
  };

  const initializeClient = () => {
    const newClient = WebSocketService.initializeClient(
      handleConnectionReady,
      handleClose,
      handleSocketMessage
    );
    
    setClient(newClient);
    return newClient;
  };

  const reconnect = async () => {
    console.log(`Reconnect attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
    
    const newClient = initializeClient();
    
    if (roomId && nickname && joined) {
      try {
        // Rejoin the same room with the same credentials
        const previousMessages = await WebSocketService.joinChatRoom(
          newClient, 
          nickname, 
          roomId, 
          userIcon || undefined
        );
        
        console.log("Reconnected and rejoined room");
        
        // Update user ID to nickname mapping from received messages
        const newMapping: Record<string, string> = {};
        (previousMessages.messages as ExtendedSessionChatMessage[]).forEach(msg => {
          if (msg.userNickname && msg.userId) {
            newMapping[msg.userId] = msg.userNickname;
          }
        });
        setUserIdToNickname(prev => ({ ...prev, ...newMapping }));
        
        // Store our user ID
        if (newClient.socketUserId) {
          setCurrentUserId(newClient.socketUserId);
          addUserToMapping(newClient.socketUserId, nickname);
        }
        
        // Deduplicate the messages we get back
        const uniqueMessages = deduplicateMessages(previousMessages.messages as ExtendedSessionChatMessage[]);
        setMessages(uniqueMessages);
      } catch (err) {
        console.error("Reconnection failed:", err);
        // Will retry automatically based on the onClose handler
      }
    }
  };

  // Creating a chat room
  const handleCreateRoom = async () => {
    if (!nickname.trim().length) {
      alert("Please enter a nickname");
      return;
    }
    if (!client) return;
    try {
      const id = await WebSocketService.createChatRoom(client, nickname, userIcon || undefined);
      console.log("RoomID for joining", id);
      setRoomId(id);
      setJoined(true);
      
      // Store the current user's ID and nickname in our mapping
      if (client.socketUserId) {
        setCurrentUserId(client.socketUserId);
        addUserToMapping(client.socketUserId, nickname);
      }
      
      // Store values for potential reconnection
      localStorage.setItem("roomId", id);
      localStorage.setItem("nickname", nickname);
      localStorage.setItem("hasJoinedRoom", "true");
    } catch (err) {
      console.error("Create room failed:", err);
      alert("Failed to create room. Please try again.");
    }
  };

  const handleJoinRoom = async (roomIdToJoin: string) => {
    if (!client) return;

    if (!nickname || !roomIdToJoin.trim()) {
      alert("Please enter both nickname and Room ID to join the chat room.");
      return;
    }

    try {
      // Joining a chat room
      const previousMessages = await WebSocketService.joinChatRoom(
        client, 
        nickname, 
        roomIdToJoin, 
        userIcon || undefined
      );
      
      // Build user ID to nickname mapping from previous messages
      const newMapping: Record<string, string> = {};
      (previousMessages.messages as ExtendedSessionChatMessage[]).forEach(msg => {
        if (msg.userNickname && msg.userId) {
          newMapping[msg.userId] = msg.userNickname;
        }
      });
      setUserIdToNickname(prev => ({ ...prev, ...newMapping }));
      
      // Store the current user's ID and nickname in our mapping
      if (client.socketUserId) {
        setCurrentUserId(client.socketUserId);
        addUserToMapping(client.socketUserId, nickname);
      }
      
      setMessages(previousMessages.messages as ExtendedSessionChatMessage[]);
      setJoined(true);
      
      // Store values for potential reconnection
      localStorage.setItem("roomId", roomIdToJoin);
      localStorage.setItem("nickname", nickname);
      localStorage.setItem("hasJoinedRoom", "true");
    } catch (err) {
      console.error("Join failed:", err);
      alert("Could not join the room. Make sure the Room ID is correct.");
    }
  };

  const handleSendMessage = (newMessage: string) => {
    if (!client || !newMessage.trim()) return;
    
    // Sending a chat message
    WebSocketService.sendMessage(client, newMessage, userIcon || undefined);
    sendTyping(false);
    // Make sure to update typing state when sending a message
    setIsCurrentUserTyping(false);
  };

  const sendTyping = (typing: boolean) => {
    if (!client) return;
    
    // Update our own typing state immediately
    setIsCurrentUserTyping(typing);
    
    // Send typing status
    WebSocketService.sendTypingStatus(client, typing, nickname, currentUserId || undefined);
  };

  // Reset typing state
  const resetTypingState = () => {
    console.log("Resetting typing state");
    setIsCurrentUserTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  // Sign out handler
  const signOutHandler = () => {
    // Clear typing state
    resetTypingState();
    
    // Remove localStorage items
    localStorage.removeItem("nickname");
    localStorage.removeItem("roomId");
    localStorage.removeItem("hasJoinedRoom");
    
    // Reset state variables
    setJoined(false);
    setRoomId("");
    setNickname("");
    setMessages([]);
    setTypingUsers([]);
    setUserIdToNickname({});
    setCurrentUserId(null);
  };

  // Initialize client on component mount
  useEffect(() => {
    const newClient = initializeClient();
    
    // Auto-rejoin room if credentials exist in localStorage AND user has explicitly joined before
    if (savedRoomId && savedNickname && hasExplicitlyJoined) {
      console.log("Attempting to auto-rejoin with saved credentials");
      
      const attemptAutoJoin = async () => {
        if (autoJoinAttemptRef.current >= maxAutoJoinAttempts) {
          console.error("Max auto-join attempts reached");
          setAutoJoining(false);
          localStorage.removeItem("roomId");
          localStorage.removeItem("nickname");
          localStorage.removeItem("hasJoinedRoom");
          setJoined(false);
          return;
        }
        
        try {
          console.log(`Auto-join attempt ${autoJoinAttemptRef.current + 1}`);
          const previousMessages = await WebSocketService.joinChatRoom(
            newClient, 
            savedNickname, 
            savedRoomId, 
            userIcon || undefined
          );
          
          console.log("Auto-rejoined room after page load");
          
          // Build user ID to nickname mapping from previous messages
          const newMapping: Record<string, string> = {};
          (previousMessages.messages as ExtendedSessionChatMessage[]).forEach(msg => {
            if (msg.userNickname && msg.userId) {
              newMapping[msg.userId] = msg.userNickname;
            }
          });
          setUserIdToNickname(prev => ({ ...prev, ...newMapping }));
          
          // Store the current user's ID and nickname in our mapping
          if (newClient.socketUserId) {
            setCurrentUserId(newClient.socketUserId);
            addUserToMapping(newClient.socketUserId, savedNickname);
            console.log(`Set current user ID during auto-join: ${newClient.socketUserId}`);
          }
          
          // Use our deduplication function instead of the filter
          const uniqueMessages = deduplicateMessages(previousMessages.messages as ExtendedSessionChatMessage[]);
          setMessages(uniqueMessages);
          
          setJoined(true);
          setAutoJoining(false);
        } catch (err) {
          console.error("Auto-rejoin failed:", err);
          autoJoinAttemptRef.current += 1;
          
          // Retry with increasing delay
          setTimeout(attemptAutoJoin, 1000 * autoJoinAttemptRef.current);
          
          if (autoJoinAttemptRef.current >= maxAutoJoinAttempts) {
            // Clear localStorage after multiple failed attempts
            localStorage.removeItem("roomId");
            localStorage.removeItem("nickname");
            localStorage.removeItem("hasJoinedRoom");
            setJoined(false);
            setAutoJoining(false);
          }
        }
      };
      
      // First attempt with a delay to ensure client is ready
      setTimeout(attemptAutoJoin, 1500);
    } else {
      setAutoJoining(false);
    }
    
    // Cleanup function
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Synchronize typing state
  useEffect(() => {
    // If the current user's nickname is in the typingUsers array, make sure isCurrentUserTyping is true
    if (typingUsers.includes(nickname)) {
      console.log("Current user found in typingUsers array, ensuring isCurrentUserTyping is true");
      if (!isCurrentUserTyping) {
        setIsCurrentUserTyping(true);
      }
    }
  }, [typingUsers, nickname, isCurrentUserTyping]);

  // Reset typing state when page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Page is hidden (user tabbed away, minimized window, etc.)
        console.log("Page hidden, clearing typing state");
        resetTypingState();
        if (client) {
          // Explicitly send "not typing" to the server when page is hidden
          WebSocketService.sendTypingStatus(
            client, 
            false, 
            nickname, 
            currentUserId || undefined
          );
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [nickname, currentUserId, client]);

  const value: ChatContextType = {
    roomId,
    nickname,
    messages,
    joined,
    reconnecting,
    autoJoining,
    client,
    userIcon,
    typingUsers,
    currentUserId,
    isCurrentUserTyping,
    reconnectAttemptsRef,
    maxReconnectAttempts,
    setRoomId,
    setNickname,
    setMessages,
    setJoined,
    setClient,
    setUserIcon,
    setTypingUsers,
    setCurrentUserId,
    setIsCurrentUserTyping,
    addUserToMapping,
    userIdToNickname,
    handleCreateRoom,
    handleJoinRoom,
    handleSendMessage,
    sendTyping,
    signOutHandler
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatContext; 