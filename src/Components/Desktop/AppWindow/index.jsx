import React, { memo, useState, useRef, forwardRef } from "react";
import "./css/window.css";
import Header from "./Header";
function AppWindow({
    apps,
    onMouseDown,
    onClose,
}) {
    const [isDragging, setIsDragging] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    const handleMouseDown = (e, ref) => {
        setIsDragging(true);
        const rect = ref.current.getBoundingClientRect();
        setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }

    const handleMouseMove = (e, ref) => {
        if (isDragging) {
            ref.current.style.left = `${e.clientX - offset.x}px`;
            ref.current.style.top = `${e.clientY - offset.y}px`;
        }
    }

    const handleMouseUp = () => {
        setIsDragging(false);
    }

    return (
        <div>
            {apps.map(app => {
                const ref = useRef(null);
                return (
                    <div
                        ref={ref}
                        onMouseDown={(e) => handleMouseDown(e, ref)}
                        onMouseMove={(e) => handleMouseMove(e, ref)}
                        onMouseUp={handleMouseUp}
                        className={`styled-window ${app.status.isRunning ? '' : 'hidden'}`}
                        show={app.status.isRunning}
                        key={app.data.id}
                    >
                        <Window
                            data={app.data}
                            component={app.component}
                            onClose={() => onClose(app.component)}
                        />
                    </div>
                );
            })}
        </div>
    );
}

const Window = memo(forwardRef(function ({
    data,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onClose,
    component,
    className
}, ref) {
    return (
        <>

            <div
                className={className}
                onMouseDown={onMouseDown}
                ref={ref}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}>
                <div>
                    <Header onClose={onClose} />
                </div>
                <div className="app-window-content">
                    {component({ ...data })}
                </div>
            </div>
        </>

    );
}));




export default AppWindow;