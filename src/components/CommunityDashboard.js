import React from 'react';

const CommunityPage = ({ setView }) => {
  return (
    <div className="dashboard-screen">
      <div className="admin-back-button-container">
        <button className="admin-button" onClick={() => setView('dashboard')}>
          ← Back to Dashboard
        </button>
      </div>

      <h1 className="dashboard-title">COMMUNITY</h1>
      {/* Global progress curve and user table will go here */}
    </div>
  );
};

export default CommunityPage;
