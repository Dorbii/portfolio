import React, { useState, useEffect, useRef } from "react";

export function draw(ctx, location) {
    ctx.fillStyle = 'red';
    ctx.save();
    ctx.translate(location.x - 10, location.y - 10);
    ctx.fillRect(0, 0, 20, 20);
    ctx.restore();
}


export function useCanvas() {
    const canvasRef = useRef(null);
    const [coordinates, setCoordinates] = useState([]);

    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;

    useEffect(() => {
        const canvasObj = canvasRef.current;
        const ctx = canvasObj.getContext('2d');
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        coordinates.forEach((c) => { draw(ctx, c) });
    });
    return [coordinates, setCoordinates, canvasRef, canvasWidth, canvasHeight];
}
