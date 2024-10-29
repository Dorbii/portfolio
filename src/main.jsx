import React from 'react';
import { createRoot } from 'react-dom/client'
import { Container } from 'react-dom'
import './index.css'
import App from './App.jsx'
import SnakeGame from './Components/SnakeGame/SnakeGame.jsx'
function main() {
  const container = document.getElementById('root');
  const root = createRoot(container);
  root.render(<App />);
}
main();


