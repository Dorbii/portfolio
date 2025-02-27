import './App.css'
import { useState, useReducer } from 'react'
import SnakeGame from './Components/SnakeGame/SnakeGame'
import AlgoVisualizer from './Components/AlgoVisualizer/AlgoVisualizer'
import snakeGameIcon from './assets/Applications/SnakeGame/snake_game_icon.png'
import algoIcon from './assets/Applications/AlgoVisualizer/dsa_icon.png'
import Taskbar from './Components/Desktop/Taskbar/Taskbar'
import Shortcut from './Components/Desktop/Shortcuts/Shortcut'
import eventReducer from './hooks/eventReducer';
import { defaultAppState, appConfigs } from './Components/index';
const initState = {
  apps: defaultAppState
}
function App() {
  const [state, dispatch] = useReducer(eventReducer, initState)

  const _handleShortcutDoubleClick = (component) => {
    const appConfig = Object.values(appConfigs).find(config => config.component === component)
    dispatch({ type: 'LAUNCH_APP', payload: appConfig })
  }
  const _getAppStatus = (component) => {
    const app = state.apps.find(app => app.component === component)
    console.log(app)
    return app?.status?.isRunning
  }
  return (
    <>
      <div className="app-container">
        <Shortcut
          icon={snakeGameIcon}
          name="Snake Game"
          handleDoubleClick={() => _handleShortcutDoubleClick(SnakeGame)}
        />
        <Shortcut
          icon={algoIcon}
          name="Algo Visualizer"
          handleDoubleClick={() => _handleShortcutDoubleClick(AlgoVisualizer)}
        />
        {_getAppStatus(SnakeGame) && <SnakeGame />}
        {_getAppStatus(AlgoVisualizer) && <AlgoVisualizer />}
        <Taskbar />
      </div>
    </>
  )
}

export default App
