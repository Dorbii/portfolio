import React from "react";
import './css/Menu.css';
const Menu = ({ onGameStateChange }) => {
    return (
        <div className="wrapper">
            <div>
                <input
                    className="start"
                    type="button"
                    value="Start"
                    onClick={onGameStateChange} />
            </div>
        </div>
    )
}

export default Menu;