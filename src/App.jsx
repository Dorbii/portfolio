import './App.css'
import { useState } from 'react'
import SnakeGame from './Components/SnakeGame/SnakeGame'
import AlgoVisualizer from './Components/AlgoVisualizer/AlgoVisualizer'
import snakeGameIcon from './assets/snake-game-appIcon.png'
import algoIcon from './assets/algo-icon.png'
function App() {
  const [currentApp, setCurrentApp] = useState('');
  const [appVisible, setAppVisible] = useState(false);
  return (
    <>
      <header className='header'><button onClick={() => { setAppVisible(false); setCurrentApp('') }} > Home </button> </header>
      <div className="body">
        <div className="app-title" hidden={appVisible}>Select App</div>
        <div className='app-container' hidden={appVisible}>
          <div className='snake-app' hidden={appVisible}>
            <button className="snake-btn" key="snake-btn" id="snake-btn" onClick={() => {
              setCurrentApp('snake-game')
              setAppVisible(true)
            }}><img key="snake-game-icon" className="snake-game-icon" src={snakeGameIcon} /></button>
          </div>
          <div className='algo-app' hidden={appVisible}>
            <button className="algo-btn" key="algo-btn" id="algo-btn" onClick={() => {
              setCurrentApp('algo-visualizer')
              setAppVisible(true)
            }}><img key="algo-icon" className="algo-icon" src={algoIcon} /></button>
          </div>
        </div>
        {(() => {
          switch (currentApp) {
            case 'algo-visualizer':
              return <AlgoVisualizer />;
            case 'snake-game':
              return <SnakeGame />;
            default:
              return null;
          }
        })()}
      </div>


    </>
  )

}

export default App
