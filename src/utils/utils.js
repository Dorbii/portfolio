export function getComputedPagePosition(e, boundary) {
    let { X, Y } = e;
    const { top, right, bottom, left } = boundary;

    if (!boundary) {
        return { X, Y };
    }
    if (X <= left) {
        X = left;
    } else if (X >= right) {
        X = right;
    }
    if (Y <= top) {
        Y = top;
    } else if (Y >= bottom) {
        Y = bottom;
    }
    return { X, Y };
}