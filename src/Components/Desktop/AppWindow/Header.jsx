import React, { forwardRef } from 'react';
import './css/header.css';

const Header = forwardRef(({ onClose, onMaximize, onMinimize, onMouseDown, onMouseMove, onMouseUp }, ref) => {
    return (
        <div className="header-container"
            ref={ref}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}>
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
        </div>
    );
});

export default Header;