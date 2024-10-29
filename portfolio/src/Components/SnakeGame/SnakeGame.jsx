import React, { Component, useEffect, useRef, useState } from "react";
import Food from "./Food";
import Button from "./Button";
import Menu from "./Menu";
import Snake from "./Snake";
import './css/SnakeGame.css';
import GameOver from "./GameOver";

const spawnFood = () => {
    return Array.from({ length: 2 }, () => Math.floor(Math.random() * 100 / 2) * 2);
}

export default function SnakeGame() {
    const [gameOver, setGameOver] = useState(false);
    const [snakeDots, setSnakeDots] = useState([[0, 0], [0, 2]]);
    const [food, setFood] = useState(spawnFood());
    const [speed, setSpeed] = useState(200);
    const [direction, setDirection] = useState("RIGHT");
    const [gameState, setGameState] = useState('menu');

    const initSnakeGame = () => {
        setGameOver(false);
        setSnakeDots([[0, 0], [0, 2]]);
        setFood(spawnFood());
        setSpeed(200);
        setDirection("RIGHT");
        setGameState('menu');
    }
    //check out of bounds
    useEffect(() => {
        let head = snakeDots[snakeDots.length - 1];
        if (gameState === 'game' && (
            head[0] >= 100 || head[1] >= 100 || head[0] < 0 || head[1] < 0)) {
            return () => setGameOver(true);
        };
    }, [snakeDots, gameState]);

    // check if collapsed
    useEffect(() => {
        let snake = [...snakeDots];
        let head = snake[snake.length - 1];
        // Remove the head from the snake body to avoid detecting collision with itself
        snake.pop();
        const hasCollided = snake.some(dot => head[0] === dot[0] && head[1] === dot[1]);
        if (hasCollided && gameState === 'game' && snakeDots.length > 2) {
            setGameOver(true);
        }
    }, [snakeDots, direction]);

    useEffect(() => {
        if (gameState === 'menu') {
            initSnakeGame();
        }
    }, [gameState]);

    useEffect(() => {
        const interval = setInterval(() => { moveSnake(); }, speed);
        return () => clearInterval(interval);;
    }, [snakeDots, speed, gameState]);

    useEffect(() => {
        function handleKeyDown(e) {
            switch (e.key) {
                case "a":
                case "ArrowLeft":
                    onLeft();
                    break;
                case "w":
                case "ArrowUp":
                    onUp();
                    break;
                case "d":
                case "ArrowRight":
                    onRight();
                    break;
                case "s":
                case "ArrowDown":
                    onDown();
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [snakeDots]);

    useEffect(() => {
        let head = snakeDots[snakeDots.length - 1];
        if (head[0] === food[0] && head[1] === food[1]) {
            setFood(spawnFood());
            increaseSnake();
            increaseSpeed();
        }
    }, [food, snakeDots]);

    const increaseSnake = () => {
        let newSnake = [...snakeDots];
        newSnake.unshift([]);
        setSnakeDots(newSnake);
    };

    const increaseSpeed = () => {
        if (speed > 10) {
            setSpeed(speed - 20);
        }
    };

    const moveSnake = () => {
        let dots = [...snakeDots];
        let head = dots[dots.length - 1];
        if (gameState === 'game' && !gameOver) {
            switch (direction) {
                case 'RIGHT':
                    head = [head[0] + 2, head[1]];
                    break;
                case 'LEFT':
                    head = [head[0] - 2, head[1]];
                    break;
                case 'DOWN':
                    head = [head[0], head[1] + 2];
                    break;
                case 'UP':
                    head = [head[0], head[1] - 2];
                    break;
            }
        }
        dots.push(head);
        dots.shift();
        setSnakeDots(dots);
    }

    const onDown = () => {
        let dots = [...snakeDots];
        let head = dots[dots.length - 1];
        head = [head[0], head[1] + 2];
        dots.push(head);
        dots.shift();
        setDirection("DOWN");
        setSnakeDots(dots);
    };

    const onUp = () => {
        let dots = [...snakeDots];
        let head = dots[dots.length - 1];
        head = [head[0], head[1] - 2];
        dots.push(head);
        dots.shift();
        setDirection("UP");
        setSnakeDots(dots);
    };

    const onRight = () => {
        let dots = [...snakeDots];
        let head = dots[dots.length - 1];
        head = [head[0] + 2, head[1]];
        dots.push(head);
        dots.shift();
        setDirection("RIGHT");
        setSnakeDots(dots);
    };

    const onLeft = () => {
        let dots = [...snakeDots];
        let head = dots[dots.length - 1];
        head = [head[0] - 2, head[1]];
        dots.push(head);
        dots.shift();
        setDirection("LEFT");
        setSnakeDots(dots);
    };
    return (
        <>
            <div>
                <GameOver gameOver={gameOver} score={snakeDots.length - 2}><button onClick={() => { setGameState('menu') }}>Play Again</button> </GameOver>
                {
                    gameState === 'menu' ? (
                        <div className="wrapper">
                            <div>
                                <input
                                    className="start"
                                    type="button"
                                    value="Start"
                                    onClick={() => setGameState('game')} />
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className='snake-container'>
                                <Snake snakeDots={snakeDots} />
                                <Food dot={food} />
                            </div>
                            <Button
                                onDown={onDown}
                                onLeft={onLeft}
                                onRight={onRight}
                                onUp={onUp}
                            />
                        </div>
                    )}
            </div>
        </>

    );
}