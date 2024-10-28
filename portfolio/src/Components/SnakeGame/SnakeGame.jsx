import React, { Component, useState } from "react";
import Food from "./Food";
import Button from "./Button";
import Menu from "./Menu";
import Snake from "./Snake";
import './css/SnakeGame.css';

const spawnFood = () => {
    return Array.from({ length: 2 }, () => Math.floor(Math.random() * 100 / 2) * 2);
}

const initialState = {
    food: spawnFood(), //make random
    speed: 200,
    direction: "RIGHT",
    snakeDots: [[0, 0], [0, 2]],
    gameState: 'menu'
};


class SnakeGame extends Component {
    constructor() {
        super(); //allows for parent class to be called
        this.state = initialState; //sets the state to the initial state
        this.handleKeyDown = this.handleKeyDown.bind(this)
    };
    componentDidMount() {
        setInterval(this.moveSnake, this.state.speed); //executes a function at specified intervals(speed)
        //document.onkeydown = this.onKeyDown;
        window.addEventListener('keydown', this.handleKeyDown)
    };
    componentDidUpdate() {
        this.checkIfOutOfBonds();
        this.checkIfCollapsed();
        this.onEat();
    };
    handleKeyDown = (e) => {
        switch (e.key) {
            case "a":
            case "ArrowLeft":
                this.onLeft();
                break;
            case "w":
            case "ArrowUp":
                this.onUp();
                break;
            case "d":
            case "ArrowRight":
                this.onRight();
                break;
            case "s":
            case "ArrowDown":
                this.onDown();
                break;
        }
    };

    moveSnake = () => {
        let dots = [...this.state.snakeDots];
        let head = dots[dots.length - 1];
        if (this.state.gameState === 'game') {
            switch (this.state.direction) {
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
            dots.push(head);
            dots.shift();
            this.setState({
                snakeDots: dots
            });
        }
    };

    checkIfOutOfBonds() {
        let head = this.state.snakeDots[this.state.snakeDots.length - 1];
        if (this.state.gameState === 'game' && (
            head[0] >= 100 || head[1] >= 100 || head[0] < 0 || head[1] < 0
        )) {
            this.gameOver();
        }
    };

    checkIfCollapsed() {
        let snake = [...this.state.snakeDots];
        let head = snake[snake.length - 1];
        snake.pop();
        snake.forEach(dot => {
            if (head[0] === dot[0] && head[1] === dot[1]) {
                this.gameOver();
            }
        });
    };

    gameOver() {
        alert(`Game Over. you ate ${this.state.snakeDots.length - 2}`);
        this.setState(initialState);
    };

    onEat() {
        let head = this.state.snakeDots[this.state.snakeDots.length - 1];
        let food = this.state.food;
        if (head[0] === food[0] && head[1] === food[1]) { //if the head is at the same location as the food
            this.setState({
                food: spawnFood() //create another food at random location
            });
            this.increaseSnake();
            this.increaseSpeed();
        }
    };

    increaseSnake() {
        let newSnake = [...this.state.snakeDots];
        newSnake.unshift([]);
        this.setState({
            snakeDots: newSnake
        });
    };

    increaseSpeed() {
        if (this.state.speed > 10) {
            this.setState({
                speed: this.state.speed - 20 //we decrease to increase rate of interval
            });
        }
    };

    onDown = () => {
        let dots = [...this.state.snakeDots];
        let head = dots[dots.length - 1];

        head = [head[0], head[1] + 2];
        dots.push(head);
        dots.shift();
        this.setState({
            direction: "DOWN",
            snakeDots: dots
        });
    };

    onUp = () => {
        let dots = [...this.state.snakeDots];
        let head = dots[dots.length - 1];

        head = [head[0], head[1] - 2];
        dots.push(head);
        dots.shift();
        this.setState({
            direction: "UP",
            snakeDots: dots
        });
    };

    onRight = () => {
        let dots = [...this.state.snakeDots];
        let head = dots[dots.length - 1];

        head = [head[0] + 2, head[1]];
        dots.push(head);
        dots.shift();
        this.setState({
            direction: "RIGHT",
            snakeDots: dots
        });
    };

    onLeft = () => {
        let dots = [...this.state.snakeDots];
        let head = dots[dots.length - 1];

        head = [head[0] - 2, head[1]];
        dots.push(head);
        dots.shift();
        this.setState({
            direction: "LEFT",
            snakeDots: dots
        });
    };
    onGameStateChange = () => {
        this.setState({
            gameState: 'game'
        });
    };

    render() {
        const { gameState, snakeDots, food } = this.state;
        return (
            <div>
                {gameState === 'menu' ? (
                    <div>
                        <Menu onGameStateChange={this.onGameStateChange} />
                    </div>
                ) : (
                    <div>
                        <div className='snake-container'>
                            <Snake snakeDots={snakeDots} />
                            <Food dot={food} />
                        </div>
                        <Button
                            onDown={this.onDown}
                            onLeft={this.onLeft}
                            onRight={this.onRight}
                            onUp={this.onUp}
                        />
                    </div>
                )}
            </div>
        );
    }
}



export default SnakeGame;