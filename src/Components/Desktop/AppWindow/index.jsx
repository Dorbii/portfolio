import React, { memo, useState, useRef } from "react";
import "./css/window.css";
import Header from "./Header";
import useComponentResize from "../../../hooks/useComponentResize.js";

function AppWindow({
    apps,
    onClose,
}) {
    const [isDragging, setIsDragging] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    const handleMouseDown = (e, ref) => {
        setIsDragging(true);
        const rect = ref.current.getBoundingClientRect();
        setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleMouseMove = (e, ref) => {
        if (isDragging) {
            ref.current.style.left = `${e.clientX - offset.x}px`;
            ref.current.style.top = `${e.clientY - offset.y}px`;
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    return (
        <div>
            {apps.map(app => {
                const ref = useRef(null);
                const dragRef = useRef(null);

                const options = {
                    default_offset: { x: 0, y: 0 },
                    default_size: { width: app.viewer.width, height: app.viewer.height },
                    boundary: { top: 1, right: window.innerWidth, bottom: window.innerHeight, left: 1 },
                    resizable: true,
                    constraintSize: 200,
                    dragRef: dragRef,
                };

                const { offset, size } = useComponentResize(ref, options);

                return (
                    <div
                        ref={ref}
                        style={{
                            position: 'absolute',
                            left: `${offset.x}px`,
                            top: `${offset.y}px`,
                            width: `${size.width}px`,
                            height: `${size.height}px`,
                        }}
                        className={`styled-window ${app.status.isRunning ? '' : 'hidden'}`}
                        key={app.data.id}
                    >
                        <Window
                            data={app.data}
                            component={app.component}
                            onClose={() => onClose(app.component)}
                            headerRef={dragRef}
                            onMouseDown={(e) => handleMouseDown(e, ref)}
                            onMouseMove={(e) => handleMouseMove(e, ref)}
                            onMouseUp={handleMouseUp}
                        />
                    </div>
                );
            })}
        </div>
    );
}

const Window = memo(function ({
    data,
    onClose,
    component,
    className,
    headerRef,
    onMouseDown,
    onMouseMove,
    onMouseUp
}) {
    return (
        <div className={className}>
            <Header
                onClose={onClose}
                ref={headerRef}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
            />
            <div className="app-window-content">
                {component({ ...data })}
            </div>
        </div>
    );
});

export default AppWindow;