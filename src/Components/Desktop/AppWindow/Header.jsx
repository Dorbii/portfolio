import React from "react";
import "./css/header.css";
function Header({ onClose }) {
    return (
        <div className="header-container">
            <button className="close-btn" onClick={onClose}></button>
        </div>
    );
}
export default Header;