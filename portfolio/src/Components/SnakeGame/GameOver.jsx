import { useEffect, useRef } from "react";

export default function GameOver({ gameOver, score, children }) {
    const ref = useRef();
    useEffect(() => {
        if (!gameOver) {
            return;
        }
        const dialog = ref.current;
        dialog.showModal();
        return () => dialog.close();
    }, [gameOver]);
    return (
        <dialog ref={ref}>
            <h1>Game Over</h1>
            <p>Your score is {score}</p>
            {children}
        </dialog>
    )
}