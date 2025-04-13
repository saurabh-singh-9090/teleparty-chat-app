import React from 'react';

interface TypingIndicatorProps {
  users: string[];
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ users }) => {
  return (
    <div className="typing-indicator">
      {/* Uncomment this to show specific user names
      {users.map((user, idx, arr) => (
        <React.Fragment key={idx}>
          <span className="typing-user">{user}</span>
          {idx < arr.length - 1 && idx === arr.length - 2 
            ? <span> and </span> 
            : idx < arr.length - 1 
              ? <span>, </span> 
              : null
          }
        </React.Fragment>
      ))}
      <span> {users.length > 1 ? 'are' : 'is'} typing...</span>
      */}
      <span>Someone is typing...</span>
    </div>
  );
};

export default TypingIndicator; 