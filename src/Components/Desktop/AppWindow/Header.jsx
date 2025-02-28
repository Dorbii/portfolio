import React from 'react';
import './css/header.css';

function Header({ onClose, onMaximize, onMinimize }) {
    return (
        <div className="header-container">
            <div className="btn-tile">
                <div className='btn-container'>
                    <button className="min-btn" onClick={onMinimize}></button>
                </div>
            </div>
            <div className="btn-tile">
                <div className='btn-container'>
                    <button className="max-btn" onClick={onMaximize}></button>
                </div>
            </div>
            <div className="close-btn-tile">
                <div className='btn-container'>
                    <button className="close-btn" onClick={onClose}></button>
                </div>

            </div>
        </div >
    );
}

export default Header;