import React from "react";
import './css/Menu.css';
const Menu = ({ gameState, setGameState }) => {
    if (gameState !== 'menu') return;
    return (
        <div className="wrapper">
            <div>
                <input
                    className="start"
                    type="button"
                    value="Start"
                    onClick={setGameState('game')} />
            </div>
        </div>
    )
}

export default Menu;