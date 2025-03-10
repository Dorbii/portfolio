import { useEffect, useState } from 'react';
import { getComputedPagePosition } from '../utils/utils';

function useComponentResize(ref, options) {
    const {
        default_offset = { x: 0, y: 0 },
        default_size,
        boundary,
        resizable = true,
        constraint_size = 200,
    } = options;

    const [offset, setOffset] = useState(default_offset);
    const [size, setSize] = useState(default_size);

    useEffect(() => {
        const target = ref.current;
        if (!target) return;
        const dragTarget = options.dragRef?.current;
        const cover = document.createElement('div');
        Object.assign(cover.style, {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
        });
        const previousOffset = { ...offset };
        const previousSize = { ...size };
        let _boundary, originMouseX, originMouseY, shouldCover = false;
        let animationFrameId;



        function onDragging(e) {
            if (shouldCover && !document.body.contains(cover)) {
                document.body.appendChild(cover);
            }
            const { comX, comY } = getComputedPagePosition(e, _boundary);
            const x = comX - originMouseX + previousOffset.x;
            const y = comY - originMouseY + previousOffset.y;
            animationFrameId = requestAnimationFrame(() => {
                target.style.transform = `translate(${x}px, ${y}px)`;
                setOffset({ x, y });
            });
        }

        function onDragEnd(e) {
            cover.remove();
            shouldCover = false;
            const { comX, comY } = getComputedPagePosition(e, _boundary);
            previousOffset.x += comX - originMouseX;
            previousOffset.y += comY - originMouseY;
            window.removeEventListener('mousemove', onDragging);
            window.removeEventListener('mouseup', onDragEnd);
            cancelAnimationFrame(animationFrameId);
        }

        function onDragStart(e) {
            window.addEventListener('mousemove', onDragging);
            window.addEventListener('mouseup', onDragEnd);
        }

        function onMouseDown(e) {
            originMouseX = e.comX;
            originMouseY = e.comY;
            _boundary = { ...boundary };
            if (dragTarget && e.target === dragTarget) {
                shouldCover = true;
                return onDragStart(e);
            }
            if (e.target !== target || !resizable) return;
            _boundary.top = originMouseY - previousSize.height + constraint_size;
            _boundary.left = originMouseX - previousSize.width + constraint_size;
            onDragStart(e);
        }

        target.addEventListener('mousedown', onMouseDown);

        return () => {
            target.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onDragging);
            window.removeEventListener('mouseup', onDragEnd);
            cover.remove();
            cancelAnimationFrame(animationFrameId);
        };
    }, [boundary, offset, size, ref, resizable, constraint_size, options.dragRef]);

    return { offset, size };
}

export default useComponentResize;