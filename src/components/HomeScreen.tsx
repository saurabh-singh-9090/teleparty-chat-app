import React from 'react';
import { useChatContext } from '../context/ChatContext';

const LoginPage: React.FC = () => {
  const {
    nickname,
    roomId,
    setNickname,
    setRoomId,
    setUserIcon,
    handleCreateRoom,
    handleJoinRoom
  } = useChatContext();

  return (
    <div className="chat-con">
      <h1>Join or Create Chat Room</h1>
      <div className="join-room">
        <span>For creating a chat room, enter your Nickname and Choose your avatar</span>
        <br />
        <br />
        <span>
          For Joining a chat room, enter the Room ID and your Nickname.
        </span>
      </div>
      <div className="btn-con">
        <div className="create-room">
          <input
            placeholder="Enter your nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
          />
          <button onClick={handleCreateRoom}>Create Room</button>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files) {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onloadend = () => {
                  setUserIcon(reader.result as string);
                };
                reader.readAsDataURL(file);
              }
            }}
          />
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
};

export default LoginPage; 