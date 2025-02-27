import React, { memo, useState, useRef, forwardRef } from "react";
import { styled } from "styled-components";
import { appConfigs } from "../..";
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
                    <StyledWindow
                        ref={ref}
                        onMouseDown={(e) => handleMouseDown(e, ref)}
                        onMouseMove={(e) => handleMouseMove(e, ref)}
                        onClose={() => onClose(app.component)}
                        onMouseUp={handleMouseUp}
                        show={app.status.isRunning}
                        key={app.data.id}
                        {...app} />
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
                <div className="app_window_content">
                    {component({ ...data })}
                </div>
            </div>
        </>

    );
}));

const StyledWindow = styled(Window)`
    display: ${({ show }) => (show ? 'flex' : 'none')};
    flex-direction: column;
    width: 900px;
    height: 900px;
    background-color: grey;
    position: absolute;
    
    .app_window_content {
        flex: 1;
        position: relative;
        width: 100%;
        height: 100%;
    }
`;


function Header({ onClose }) {
    return (
        <div className={"header_btn_close"} key={"close_btn"}>
            <button onClick={onClose}>Close</button>
        </div>
    );
}
export default AppWindow;