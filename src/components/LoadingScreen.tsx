import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="chat-con">
      <h1>Rejoining Chat Room...</h1>
      <div className="loading-spinner"></div>
    </div>
  );
};

export default LoadingScreen; 