import React from 'react';
import SnakeGame from './SnakeGame/SnakeGame';
import SnakeGameIcon from '../assets/Applications/SnakeGame/snake_game_icon.png';
import AlgoVisualizer from './AlgoVisualizer/AlgoVisualizer';
import AlgoVisualizerIcon from '../assets/Applications/AlgoVisualizer/dsa_icon.png';
import DocViewer from './DocumentViewer';
import DocViewerIcon from '../assets/Applications/DocViewer/word_icon.png';
import FallingSand from './FallingSand/FallingSand';
import FallingSandIcon from '../assets/Applications/FallingSand/falling_sand_icon.png';
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
            width: 900,
            height: 1000,
            resizable: false,
        },
        status: {
            isRunning: false,
            isMinimized: false,
            isMaximized: false,
        }

    },
    {
        component: DocViewer,
        data: {
            icon: DocViewerIcon,
            name: "Doc Viewer",
            id: genId(),
        },
        viewer: {
            width: 800,
            height: 1000,
            resizable: false,
        },
        status: {
            isRunning: false,
            isMinimized: false,
            isMaximized: false,
        }

    },
    {
        component: FallingSand,
        data: {
            icon: FallingSandIcon,
            name: "Falling Sand",
            id: genId(),
        },
        viewer: {
            width: 400,
            height: 400,
            resizable: false,
        },
        status: {
            isRunning: false,
            isMinimized: false,
            isMaximized: false,
        }
    },
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
    'Doc Viewer': {
        component: DocViewer,
        data: {
            icon: DocViewerIcon,
            name: "Doc Viewer",
        },
        default_size: {
            width: 800,
            height: 600,
        },
    },
    'Falling Sand': {
        component: FallingSand,
        data: {
            icon: FallingSandIcon,
            name: "Falling Sand",
        },
        default_size: {
            width: 400,
            height: 400,
        },
    },
}
export { SnakeGame, AlgoVisualizer, DocViewer, FallingSand };