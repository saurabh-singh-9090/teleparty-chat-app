import React from "react";
import { ChatProvider, useChatContext } from "./context/ChatContext";
import HomeScreen from "./components/HomeScreen";
import ChatRoom from "./components/ChatRoom";
import LoadingScreen from "./components/LoadingScreen";

const AppContent: React.FC = () => {
  const { joined, autoJoining } = useChatContext();

  if (autoJoining) {
    return <LoadingScreen />;
  }

  if (!joined) {
    return <HomeScreen />;
  }

  return <ChatRoom />;
};

// Wrapper component with Context Provider
const App: React.FC = () => {
  return (
    <ChatProvider>
      <AppContent />
    </ChatProvider>
  );
};

export default App;