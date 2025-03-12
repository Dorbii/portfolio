import React from "react";
import { useCanvas } from "../../hooks/useCanvas";

const Canvas = () => {
    const [coordinates, setCoordinates, ref, canvasWidth, canvasHeight] = useCanvas();

    const handleCanvasClick = (e) => {
        const rect = ref.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setCoordinates([...coordinates, { x, y }]);
    };

    return (
        <canvas
            ref={ref}
            width={canvasWidth}
            height={canvasHeight}
            onClick={handleCanvasClick}
            style={{ border: "1px solid black" }
            }
        />
    );
};

export default Canvas;