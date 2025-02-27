import React, { useState, useRef } from "react";


import "./Shortcut.css";

export default function Shortcut({ icon, name, handleDoubleClick }) {
    const [isDragging, setIsDragging] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const shortcutRef = useRef(null);

    const handleMouseDown = (e) => {
        setIsDragging(true);
        const rect = shortcutRef.current.getBoundingClientRect();
        setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }

    const handleMouseMove = (e) => {
        if (isDragging) {
            shortcutRef.current.style.left = `${e.clientX - offset.x}px`;
            shortcutRef.current.style.top = `${e.clientY - offset.y}px`;
        }
    }

    const handleMouseUp = () => {
        setIsDragging(false);
    }

    return (
        <>
            <div className="shortcut"
                ref={shortcutRef}
                style={{
                    cursor: isDragging ? "grabbing" : "context-menu"
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onDoubleClick={handleDoubleClick}
            >
                <div className="shortcut">
                    <img src={icon} />
                    <p>{name}</p>
                </div>
            </div>
        </>
    )
}