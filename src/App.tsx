// src/App.tsx
import React from 'react';
import EventNetworkPerf from './components/EventNetworkPerf.tsx'; // Remove .tsx (optional in TS)
import './App.css';

const App: React.FC = () => {
  return (
    <div className="App">
      <EventNetworkPerf />
    </div>
  );
};

export default App;
