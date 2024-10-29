import './App.css'
import React, { useState } from 'react'
import SnakeGame from './Components/SnakeGame/SnakeGame'
import snakeGameIcon from './assets/snake-game-appIcon.png'

function App() {
  const [currentApp, setCurrentApp] = useState('');
  const [appVisible, setAppVisible] = useState(false);
  return (
    <>
      <h1>Select App</h1>
      <div className='app-container' hidden={appVisible}>
        <button className="snake-game" key="snake-game" id="snake-game" onClick={() => {
          currentApp === 'snake-game' ? setCurrentApp('') : setCurrentApp('snake-game')
          setAppVisible(!appVisible)
        }}><img key="snake-game-icon" className="snake-game-icon" src={snakeGameIcon} /></button>

      </div>
      {currentApp === 'snake-game' && <SnakeGame />}
    </>
  )

}

export default App
