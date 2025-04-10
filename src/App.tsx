import React, { useState, useEffect, useRef } from 'react';
import {
  TelepartyClient,
  SocketEventHandler,
  SocketMessageTypes,
  SessionChatMessage
} from 'teleparty-websocket-lib';

const App: React.FC = () => {
  const [roomId, setRoomId] = useState('');
  const [nickname, setNickname] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<SessionChatMessage[]>([]);
  const [joined, setJoined] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [client, setClient] = useState<TelepartyClient | null>(null);

  useEffect(() => {
    const eventHandler: SocketEventHandler = {
      onConnectionReady: () => console.log('Connection established'),
      onClose: () => alert('Connection lost. Please reload the page.'),
      onMessage: (message) => {
        if (message.type === SocketMessageTypes.SEND_MESSAGE) {
          const msg = message.data as SessionChatMessage;
          setMessages((prev) => [...prev, msg]);
        }
        if (message.type === SocketMessageTypes.SET_TYPING_PRESENCE) {
          setIsTyping(message.data.anyoneTyping);
        }
      }
    };

    const tpClient = new TelepartyClient(eventHandler);
    setClient(tpClient);
  }, []);

  const handleCreateRoom = async () => {
    if (!client) return;
    const id = await client.createChatRoom(nickname);
    console.log("RoomID for joining",id)
    setRoomId(id);
    setJoined(true);
  };

  const handleJoinRoom = async ( roomId : string ) => {
    if (!client) return;
  
    if (!nickname || !roomId.trim()) {
      alert("Please enter both nickname and Room ID.");
      return;
    }
  
    try {
      console.log("Trying to join room:", roomId);
      await client.joinChatRoom(nickname, roomId);
      console.log("Joined room successfully");
      setJoined(true);
    } catch (err) {
      console.error("Join failed:", err);
      alert("Could not join the room. Make sure the Room ID is correct.");
    }
  };  
  

  const handleSendMessage = () => {
    if (!client) return;
    client.sendMessage(SocketMessageTypes.SEND_MESSAGE, { body: message });
    setMessage('');
    sendTyping(false);
  };

  const sendTyping = (typing: boolean) => {
    if (!client) return;
    client.sendMessage(SocketMessageTypes.SET_TYPING_PRESENCE, { typing });
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    sendTyping(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTyping(false), 1000);
  };

  if (!joined) {
    return (
      <div className='chat-con'>
        <h1>Join or Create Chat Room</h1>
        <input
          placeholder="Enter your nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        <button
          onClick={handleCreateRoom}
        >
          Create Room
        </button>
        <input
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <button
          onClick={() => handleJoinRoom(roomId)}
        >
          Join Room
        </button>
      </div>
    );
  }

  return (
    <div className="chat-con">
      <h2>Room Chat</h2>
      <div className="msg-con">
        {messages.map((msg, idx) => (
          <div key={idx} className={msg.isSystemMessage ? 'user-name' : ''}>
            {msg.userNickname && <strong>{msg.userNickname}: </strong>}{msg.body}
          </div>
        ))}
        {isTyping && <div className="typing-msg">Someone is typing...</div>}
      </div>
      <input
        placeholder="Type your message"
        value={message}
        onChange={handleTyping}
      />
      <button
        onClick={handleSendMessage}
        disabled={!message.trim()}
      >
        Send
      </button>
    </div>
  );
};

export default App;