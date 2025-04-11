import React, { useState, useEffect, useRef } from "react";
import {
  TelepartyClient,
  SocketEventHandler,
  SocketMessageTypes,
  SessionChatMessage,
} from "teleparty-websocket-lib";

const App: React.FC = () => {
  const [roomId, setRoomId] = useState("");
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<SessionChatMessage[]>([]);
  const [joined, setJoined] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [client, setClient] = useState<TelepartyClient | null>(null);

  useEffect(() => {
    //Initialising the client
    const eventHandler: SocketEventHandler = {
      onConnectionReady: () => console.log("Connection established"),
      onClose: () => alert("Connection lost. Please reload the page."),
      onMessage: (message) => {
        if (message.type === SocketMessageTypes.SEND_MESSAGE) {
          const msg = message.data as SessionChatMessage;
          setMessages((prev) => [...prev, msg]);
        }
        if (message.type === SocketMessageTypes.SET_TYPING_PRESENCE) {
          setIsTyping(message.data.anyoneTyping);
        }
      },
    };

    const tpClient = new TelepartyClient(eventHandler);
    setClient(tpClient);
  }, []);

  // Creating a chat room
  const handleCreateRoom = async () => {
    if (!client) return;
    const id = await client.createChatRoom(nickname);
    console.log("RoomID for joining", id);
    setRoomId(id);
    setJoined(true);
  };

  const handleJoinRoom = async (roomId: string) => {
    if (!client) return;

    if (!nickname || !roomId.trim()) {
      alert("Please enter both nickname and Room ID to join the chat room.");
      return;
    }

    try {
      // Joining a chat room
      await client.joinChatRoom(nickname, roomId);
      setJoined(true);
    } catch (err) {
      console.error("Join failed:", err);
      alert("Could not join the room. Make sure the Room ID is correct.");
    }
  };

  const handleSendMessage = () => {
    if (!client) return;
    // Sending a chat message
    client.sendMessage(SocketMessageTypes.SEND_MESSAGE, { body: message });
    setMessage("");
    sendTyping(false);
  };

  const sendTyping = (typing: boolean) => {
    if (!client) return;
    // Updating typing presence
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
      <div className="chat-con">
        <h1>Join or Create Chat Room</h1>
        <div className="join-room">
          <span>For creating a chat room, enter your Nickname</span>
          <br />
          <br />
          <span>
            For Joining a chat room, enter the Room ID and your Nickname. Check
            browser console for getting room ID
          </span>
        </div>
        <div className="btn-con">
          <div>
            <input
              placeholder="Enter your nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
            <button onClick={handleCreateRoom}>Create Room</button>
          </div>
          <div>
            <input
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <button onClick={() => handleJoinRoom(roomId)}>
              Join Chat Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-con">
      <h2>Chat Room</h2>
      <div className="msg-con">
        {messages.map((msg, idx) => (
          <div key={idx} className={msg.isSystemMessage ? "user-name" : "user-msg"}>
            {msg.userNickname && <strong>{msg.userNickname}: </strong>}
            {msg.body}
          </div>
        ))}
        {isTyping && <div className="typing-msg">Typing...</div>}
      </div>
      <div className="input-con">
        <input
          placeholder="Type your message"
          value={message}
          onChange={handleTyping}
        />
        <button onClick={handleSendMessage} disabled={!message.trim()}>
          Send
        </button>
      </div>
    </div>
  );
};

export default App;
