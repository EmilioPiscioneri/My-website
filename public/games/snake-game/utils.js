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

/**  Returns a random number between range. Min inclusive, max exclusive
 */
export function GetRandomRange(min, max) {
    return Math.random() * (max - min) + min;
}

export function GetRandomIntInclusive(min, max) {
    // floor and ceil
    min = Math.floor(min)
    max = Math.ceil(max)
    // E.g. if min, max is 5,10 then 5 is range and .random() is 0 to 1 exclusive of 1 meaning max range can be 4.999 so you do + 1 so max is 5.9999 and then you floor it so
    // it becomes inclsuive. Then you add back minimum 
    return Math.floor(Math.random() * (max - min + 1) + min); // The maximum is inclusive and the minimum is inclusive
  }