import './App.css'
import { useState, useReducer } from 'react'
import SnakeGame from './Components/SnakeGame/SnakeGame'
import AlgoVisualizer from './Components/AlgoVisualizer/AlgoVisualizer'
import snakeGameIcon from './assets/Applications/SnakeGame/snake_game_icon.png'
import algoIcon from './assets/Applications/AlgoVisualizer/dsa_icon.png'
import Taskbar from './Components/Desktop/Taskbar/Taskbar'
import Shortcut from './Components/Desktop/Shortcuts/Shortcut'


function App() {

  return (
    <>
      <div className="app-container">
        <div className="shortcut-container">
          <div className="shortcuts">
            <div className='shortcut-item'>
              <Shortcut icon={snakeGameIcon} name="Snake Game" />
            </div>
            <div className='shortcut-item'>
              <Shortcut icon={algoIcon} name="Algo Visualizer" />
            </div>
          </div>
        </div>
        <Taskbar />
      </div>
    </>
  )

}

export default App
