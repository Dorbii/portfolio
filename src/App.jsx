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
import AppWindow from './Components/Desktop/AppWindow'
const initState = {
  apps: defaultAppState
}
function App() {
  const [state, dispatch] = useReducer(eventReducer, initState)

  const _handleShortcutDoubleClick = (component) => {
    const appConfig = Object.values(appConfigs).find(config => config.component === component)
    dispatch({ type: 'LAUNCH_APP', payload: appConfig })
  }

  const _handleCloseApp = (component) => {
    dispatch({ type: 'CLOSE_APP', payload: { component } });
  };
  return (
    <div className="app-container">
      <div className="shortcut-container">
        {state.apps.map(app => (
          <div className="shortcut-item" key={app.data.id}>
            <Shortcut
              icon={app.data.icon}
              name={app.data.name}
              handleDoubleClick={() => _handleShortcutDoubleClick(app.component)}
            />
          </div>
        ))}
      </div>
      <AppWindow
        apps={state.apps}
        onMouseDown={() => { }}
        onClose={_handleCloseApp}
      />
      <Taskbar />
    </div>
  );
}

export default App
