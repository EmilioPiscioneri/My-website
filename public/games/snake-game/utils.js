// Common functions that differnt scripts need

// Gets canvas position on HTML page (includes scrolling) 
export function GetCanvasRealPosition() {
    const rect = globals.game.pixiApplication.canvas.getBoundingClientRect();
    return {
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY
    };
}

// Gets canvas position on current screen (excludes scrolling)
export function GetCanvasScreenPosition() {
    const rect = globals.game.pixiApplication.canvas.getBoundingClientRect();
    return {
        x: rect.x,
        y: rect.y
    };
}

// converts a pointer event position to one relative to canvas pixels
export function GetPointerPosFromCanvasPos(position) {
    // Don't ask me why it's like this but it is
    let canvasRealPos = GetCanvasRealPosition();
    let canvasScreenPos = GetCanvasScreenPosition();

    return {
        x: position.x - canvasRealPos.x,
        y: position.y - canvasScreenPos.y
    }
}

//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random

// Returns a random number between the specified values. The returned value is no lower than (and may possibly equal) min, and is less than (and not equal) max.
export function GetRandomRange(min, max) {
    return Math.random() * (max - min) + min;
}