import React, { useState, useRef, useEffect } from "react";
import { FaHome } from 'react-icons/fa';

import "./Shortcut.css";

export default function Shortcut({ icon, name, onClick }) {
    const [isDragging, setIsDragging] = useState(false);
    //const [currPos, setPos] = useState({ x: 0, y: 0 });
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const shortcutRef = useRef(null);
    const handleMouseDown = (e) => {
        setIsDragging(true);
        const rect = shortcutRef.current.getBoundingClientRect();
        setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }

    const handleMouseMove = (e) => {
        if (isDragging) {
            //setPos({ x: e.clientX - offset.x, y: e.clientY - offset.y });
            shortcutRef.current.style.left = `${e.clientX - offset.x}px`;
            shortcutRef.current.style.top = `${e.clientY - offset.y}px`;
        }
    }

    const handleMouseUp = () => {
        setIsDragging(false);
    }

    const handleDoubleClick = () => {
        console.log("Double Clicked");
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