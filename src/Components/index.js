import React from 'react';
import SnakeGame from './SnakeGame/SnakeGame';
import SnakeGameIcon from '../assets/Applications/SnakeGame/snake_game_icon.png';
import AlgoVisualizer from './AlgoVisualizer/AlgoVisualizer';
import AlgoVisualizerIcon from '../assets/Applications/AlgoVisualizer/dsa_icon.png';
let id = -1;
const genId = () => {
    return id++;
};

export const defaultAppState = [
    {
        component: SnakeGame,
        data: {
            icon: SnakeGameIcon,
            name: "Snake Game",
            id: genId(),
        },
        viewer: {
            width: 800,
            height: 600,
            resizable: false,
        },
        status: {
            isRunning: false,
            isMinimized: false,
            isMaximized: false,
        }

    },
    {
        component: AlgoVisualizer,
        data: {
            icon: AlgoVisualizerIcon,
            name: "Algo Visualizer",
            id: genId(),
        },
        viewer: {
            width: 800,
            height: 600,
            resizable: false,
        },
        status: {
            isRunning: false,
            isMinimized: false,
            isMaximized: false,
        }

    }
];
export const appConfigs = {
    'Snake Game': {
        component: SnakeGame,
        data: {
            icon: SnakeGameIcon,
            name: "Snake Game",
        },
        default_size: {
            width: 800,
            height: 600,
        },
    },
    'Algo Visualizer': {
        component: AlgoVisualizer,
        data: {
            icon: AlgoVisualizerIcon,
            name: "Algo Visualizer",
        },
        default_size: {
            width: 800,
            height: 600,
        },
    },
}
export { SnakeGame, AlgoVisualizer };