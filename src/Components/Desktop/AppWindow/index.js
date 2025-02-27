import React from "react";
import { styled } from "styled-components";

function AppWindow({
    apps,
    onMouseDown,
    onClose,
}) {
    return (
        <div>
            {apps.map(app => (
                <StyledWindow
                    show={app.status.isRunning}
                    key={app.data.id}
                    {...app} />
            ))}
        </div>
    )
}

const Window = memo(function ({
    data,
    onMouseDown,
    component,
    className
}) {
    return (
        <div
            className={className}
            onMouseDown={onMouseDown}>
            <div className="app_window_content">
                {component({ ...data, })}
            </div>
        </div >
    )
});

const StyledWindow = styled(Window)`
    display: ${({ show }) => (show ? 'flex' : 'none')};
    position: absolute;
    .app_window_content {
    flex: 1;
    position: relative;
    margin-top: 25px;
    height: calc(100% - 25px);
  }
`;

export default AppWindow;