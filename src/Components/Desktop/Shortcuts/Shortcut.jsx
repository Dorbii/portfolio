import React, { useState, useRef, useReducer } from "react";
import eventReducer from '../../../hooks/eventReducer';
import { defaultAppState } from '../../index';

import "./Shortcut.css";
const initState = {
    apps: defaultAppState
}
export default function Shortcut({ icon, name, open }) {
    const [isDragging, setIsDragging] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const shortcutRef = useRef(null);
    const [state, dispatch] = useReducer(eventReducer, initState)
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
        dispatch({ type: 'LAUNCH_APP', payload: { data: { name } } })
        console.log(state)
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