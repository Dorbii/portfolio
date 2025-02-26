import React from 'react';
import SnakeGame from './SnakeGame/SnakeGame';
import SnakeGameIcon from '../assets/Applications/SnakeGame/snake_game_icon.png';
import AlgoVisualizer from './AlgoVisualizer/AlgoVisualizer';
import AlgoVisualizerIcon from '../assets/Applications/AlgoVisualizer/dsa_icon.png';
const genId = () => {
    let id = -1;
    return () => {
        id += 1;
        return id;
    };
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

export { SnakeGame, AlgoVisualizer };