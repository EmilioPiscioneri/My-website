// libraries/class/object setup
const game = new Game();
var Graphics = PIXI.Graphics; // graphics library
var Rectangle = PIXI.Rectangle;
var Point = PIXI.Point;

//#region Script code

let loaders = []; // an array of loader objects that are active in the current script. This ensures their onTick function is fired correctly

/**
 * This class loads different pieces of code. Useful just so I can easily load and unload different code that I want in a scene at certain times
 */
class ScriptLoader extends EventSystem {

    _loadFunction; // the custom setup function for the loader
    _onTickFunction; // the custom on tick function for the loader
    _unloadFunction; // the custom cleanup function for the loader
    game; // the associated game object for the current script

    /**
     * 
     * @param {Game} game The game associated with script. Is passed into the different functions 
     * @param {Function} loadFunction This function is called to load the script. Game is passed into first parameter
     * @param {Function} [onTickFunction] This function is called every game tick. Game is passed into first parameter
     * @param {Function} [unloadFunction] This function is called when the script should be unloaded. Game is passed into first parameter 
     */
    constructor(game, loadFunction, onTickFunction, unloadFunction) {
        super();

        if (typeof (loadFunction) != "function")
            throw new Error("Tried to create a Loader but passed load function isn't a function")

        // assign params to this vars
        this.game = game;
        this._loadFunction = loadFunction;
        this._onTickFunction = onTickFunction;
        this._unloadFunction = unloadFunction;

    }

    /**
     * Call when you want to load the script. Game is passed in as parameter.
     */
    Load() {
        if (typeof (this._loadFunction) == "function")
            this._loadFunction(this.game);
        this.FireListener("loaded");
    }

    /**
     * Called every frame tick. Game is passed in as parameter.
     */
    OnTick() {
        // check if function exists and is valid
        if (typeof (this._onTickFunction) == "function")
            this._onTickFunction(this.game);
    }

    /**
     * Call when you want to unload the script. Game is passed in as parameter.
     */
    Unload() {
        // check if function exists and is valid
        if (typeof (this._unloadFunction) == "function")
            this._unloadFunction(this.game);
        this.FireListener("unloaded")
    }
}


// end of setup

const graphicsContainer = document.getElementById("graphics-container"); // a div where the canvas will be stored

// initialise the game object (it is done asynchronously)
game.Initialise(graphicsContainer)
    .then(() => {
        main();
    })
/*.catch((err) => {
    console.warn("The game failed to initialise?", err)
})*/




// gets the canvas true screen position
function getCanvasRealPosition() {
    const rect = game.pixiApplication.canvas.getBoundingClientRect();
    return {
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY
    };
}

function getCanvasScreenPosition() {
    const rect = game.pixiApplication.canvas.getBoundingClientRect();
    return {
        x: rect.x,
        y: rect.y
    };
}

// converts a pointer event position to one relative to canvas pixels
function getPointerPosFromCanvasPos(position) {
    // Don't ask me why it's like this but it is
    let canvasRealPos = getCanvasRealPosition();
    let canvasScreenPos = getCanvasScreenPosition();

    return {
        x: position.x - canvasRealPos.x,
        y: position.y - canvasScreenPos.y
    }
}



function mainTickerHandler() {
    for (const loader of loaders) {
        loader.OnTick(); // call on tick function
    }
}

/**
 * Adds a script loader to the scene AND loads it's load script
 * @param {ScriptLoader} loaderToAdd 
 */
function AddLoader(loaderToAdd) {
    if (loaders.indexOf(loaderToAdd) != -1) {
        console.warn("Tried to add a loader to scene that already has been added")
        return;
    }

    loaderToAdd.Load();
    loaders.push(loaderToAdd);
}

/**
 * Removes a loader from the scene AND calls it's unload funct ion
 * @param {ScriptLoader} loaderToRemove 
 */
function RemoveLoader(loaderToRemove) {

    let loaderIndex = loaders.indexOf(loaderToRemove)
    if (loaderIndex != -1) {
        loaderToRemove.Unload(); // unload
        loaders.splice(loaderIndex, 1); // remove from array
    } else
        console.warn("Tried to remove a loader that hasn't been added to scene")

}



// -- scripts to load --
let ballsConnectToLineScript = new ScriptLoader(game, BallsConnectToLineLoad, BallsConnectToLineOnTick, BallsConnectToLineUnload)
let screenBordersScript = new ScriptLoader(game, ScreenBordersLoad, ScreenBordersOnTick)

function main() {
    game.AddEventListener("tick", mainTickerHandler);

    // First load the game borders
    AddLoader(screenBordersScript)
    // then actually load the ball visual
    AddLoader(ballsConnectToLineScript)



    // console.log(game.pixiApplication.stage.getChildAt(null) == null)

    // game.AddTickerListener(()=>{
    //     console.log(this)
    // })

}

// #endregion

/**
 * 
 * @returns Canvas size in game units
 */
function GetCanvasSizeInUnits() {
    // convert to pixels per unit
    return {
        width: game.pixiApplication.canvas.width / game.pixelsPerUnit.x,
        x: game.pixiApplication.canvas.width / game.pixelsPerUnit.x,
        height: game.pixiApplication.canvas.height / game.pixelsPerUnit.y,
        y: game.pixiApplication.canvas.height / game.pixelsPerUnit.y,
    }
}

//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random

// Returns a random number between the specified values. The returned value is no lower than (and may possibly equal) min, and is less than (and not equal) max.
function GetRandomRange(min, max) {
    return Math.random() * (max - min) + min;
}

//#region balls to line script

let objectsToDestroy = [];
let leftPointerDown = false; // If left mouse or pointer is down on screen
let rightPointerDown = false; // If right mouse or pointer is down on screen
// events to destroy
let pixiEventsToDestroy = []; // Has an array of arrays each with [objectSubscribedTo, eventName, eventListener]
let gameObjEventsToDestroy = []; // Has an array of arrays each with [objectSubscribedTo, eventName, eventListener]
let ballsInScene = []; // array of game objects of balls

// UI
let lineCountTextLbl;
let lineCountTextDefault = "Line count: "
let gridVisibilityBtn;
let gridIsVisible = false;
var textInput;
let ballPullStrengthSlider;
let ballPullStrengthLabel;
let ballPullStrengthDefaultText = "Ball pull strength: ";
let ballsPullStrength = 5;


function BallsConnectToLineLoad(game) {
    game.backgroundColour = "#353535"; // set better colour for contrast
    // Just push game objects inwards if out of screen bounds. Easier than dealing with static objects

    // #region Create a grid

    /**
     * - grid theory -
     * A 2D array of grid segments, indexed by [row][column] or [y][x]
     * Each index contains a point which represents the bottom-left of the segment. 
     * The grid is basically divided so a certain amount of balls will generate in each segment to keep things consistent and spread out.
     * The bounds of a segment can be gotten because the size of each segment is fixed among them all
     */

    // get size in units
    let canvasSize = GetCanvasSizeInUnits();

    // How many segments the grid will be divided to among each axis. Each number must be greater than 0
    // E.g. 1 rows means just the whole screen on y axis while 3 columns means 3 different sections with 2 dividing lines in total on x axis
    let segmentQuantities = {
        rows: 6,
        columns: 6
    };

    // error check
    if (segmentQuantities.x <= 0)
        throw new Error("Need to have at least 1 grid segments on x axis")
    if (segmentQuantities.y <= 0)
        throw new Error("Need to have at least 1 grid segments on y axis")

    // Get the size of each segment
    let segmentSize = new Point(
        canvasSize.width / segmentQuantities.columns,
        canvasSize.height / segmentQuantities.rows)

    // populate grid segments

    // grid is generated from bottom to top nad left to right

    // returns created grid segments array
    function GenerateGridSegments() {
        let gridSegments = [];

        for (let rowIndex = 0; rowIndex < segmentQuantities.rows; rowIndex++) {
            let rowSegments = []; // the row segments to add to grid segments array

            // the y position of each segment on this row
            // remember it's generated top down and each segment is bottom-left
            // so bottom will be 0 y and top will be canvas height - segmentSize.y
            let yPosition = segmentSize.y * rowIndex;

            // then for this row, do columns
            for (let columnIndex = 0; columnIndex < segmentQuantities.columns; columnIndex++) {
                // now add 
                let segmentPos = new Point(segmentSize.x * columnIndex, yPosition)
                rowSegments.push(segmentPos)
            }

            gridSegments.push(rowSegments)
        }

        return gridSegments
    }

    // just generate for now
    let gridSegments = GenerateGridSegments();

    let ballsPerSegment = 4; // arbitrary number for now


    let ballMagnitudeRange = [0.75, 1]; // range of a ball's magnitude. First unit vector is generated and then this magnitude is applied

    let ballRadiusRange = [0.075, 0.1]; // range of a ball's radius

    // removes all previous balls, for when you want to change ball count and redraw all of them
    function RemovePreviousBalls() {
        while (ballsInScene.length > 0) {
            let line = linesInScene[0];
            // remove from scene and call destructor
            game.RemoveGameObject(line, true)
            linesInScene.shift() // clear out array
        }
    }

    // generates balls and puts them on the canvas, gives them a velocity too
    // This isn't done inside the generate segments loop because you may want to keep the same grid but just generate new balls u feel me
    function GenerateBalls(gridSegments) {
        RemovePreviousBalls();

        // mm balls

        // loop through grid
        for (let rowIndex = 0; rowIndex < segmentQuantities.rows; rowIndex++) {
            // then for this row, do columns
            for (let columnIndex = 0; columnIndex < segmentQuantities.columns; columnIndex++) {
                // Get the bottom-left position of this segment
                let segmentPos = gridSegments[rowIndex][columnIndex];

                // Generate x amount of balls
                for (let ballIndex = 0; ballIndex < ballsPerSegment; ballIndex++) {
                    let ballPos = new Point(
                        // generate a random x value for the new ball pos inside the segment between left and right side
                        GetRandomRange(segmentPos.x, segmentPos.x + segmentSize.x),
                        // generate a random y value for the new ball pos inside the segment between bottom and top side
                        GetRandomRange(segmentPos.y, segmentPos.y + segmentSize.y)
                    )

                    // Get unit vector (value from -1 to 1)
                    let ballVelocity = new Point(
                        GetRandomRange(-1, 1),
                        GetRandomRange(-1, 1)
                    )

                    // if velocity came out to be 0
                    if (ballVelocity == new Point(0, 0)) {
                        // either be (-1,0) or (1,0) or (0,-1) or (0,1)
                        let roll = Math.random();
                        if (roll >= 0 && roll < 0.25)
                            ballVelocity = new Point(-1, 0)
                        else if (roll >= 0.25 && roll < 0.5)
                            ballVelocity = new Point(1, 0)
                        else if (roll >= 0.5 && roll > 0.75)
                            ballVelocity = new Point(0, -1)
                        else
                            ballVelocity = new Point(0, 1)
                    }

                    // Times unit vector by randomly generated magnitude in a certain range
                    ballVelocity = VecMath.ScalarMultiplyVec(ballVelocity, GetRandomRange(ballMagnitudeRange[0], ballMagnitudeRange[1]));

                    // Now actually create the game object
                    let ball = new Circle(ballPos.x, ballPos.y, GetRandomRange(ballRadiusRange[0], ballRadiusRange[1]), game)

                    // add collider to ball
                    ball.collider = new CircleCollider();

                    // turn off gravity and drag
                    ball.gravityEnabled = false;
                    ball.dragEnabled = false;

                    // set velocity
                    ball.velocity = ballVelocity;

                    // Now add to scene and list of balls array
                    ballsInScene.push(ball);
                    game.AddGameObject(ball);

                }
            }

        }
    }

    // mm balls
    GenerateBalls(gridSegments);

    // handle pointer down and up

    // Pointer.button 0 is left mouse, 1 is middle mouse, 2 is right mouse 
    // Weird behaviour will happen if you touch the screen multiple times but what do you expect.
    // Also this will fire even if buttons are pressed
    function HandlePointerDown(pointerEvent) {
        // console.log(pointerEvent)
        if (pointerEvent.button == 0) // left
            leftPointerDown = true;
        else if (pointerEvent.button == 2) // right
            rightPointerDown = true;

    }
    function HandlePointerUp(pointerEvent) {
        // console.log(pointerEvent)
        if (pointerEvent.button == 0) // left
            leftPointerDown = false;
        else if (pointerEvent.button == 2) // right
            rightPointerDown = false;
    }

    game.pixiApplication.canvas.addEventListener("pointerdown", HandlePointerDown);
    game.pixiApplication.canvas.addEventListener("pointerup", HandlePointerUp);

    // register pointer to be destroyed later
    pixiEventsToDestroy.push([game.pixiApplication.canvas, "pointerdown", HandlePointerDown])
    pixiEventsToDestroy.push([game.pixiApplication.canvas, "pointerup", HandlePointerUp])

    // Do all the UI stuff

    // create new game text game object
    lineCountTextLbl = new TextLabel(game, lineCountTextDefault, true, {
        fontFamily: 'Arial',
        fontSize: 22,
        fill: "white",
        stroke: {
            color: "black",
            width: 2,
        },
        align: 'left',
    });
    lineCountTextLbl.position = new Point(0.25, canvasSize.height - lineCountTextLbl.height - 0.25) // top left

    // // add to scene
    game.AddGameObject(lineCountTextLbl);

    gridVisibilityBtn = new Button(game, "Show grid", false);
    gridVisibilityBtn.fontSize = 22;
    gridVisibilityBtn.backgroundStroke = {
        color: "black",
        width: 2
    }
    gridVisibilityBtn.position = new Point(0.25, canvasSize.height - lineCountTextLbl.height - 0.5 - gridVisibilityBtn.height)
    // document.btn = gridVisibilityBtn

    game.AddGameObject(gridVisibilityBtn)

    gridVisibilityBtn.AddEventListener("pointerUp", HandleGridVisibilityBtnUp)

    gameObjEventsToDestroy.push([gridVisibilityBtn, "pointerup", HandleGridVisibilityBtnUp])


    textInput = new TextInput(game, null, false)
    textInput.backgroundStroke = {
        color: "black",
        width: 2
    }
    textInput.fontSize = 22;
    textInput.position = new Point(0.25, canvasSize.height - lineCountTextLbl.height - 0.75 - gridVisibilityBtn.height - textInput.height)

    game.AddGameObject(textInput)

    ballPullStrengthLabel = new TextLabel(game, ballPullStrengthDefaultText, false)
    ballPullStrengthLabel.fontSize = 22;
    ballPullStrengthLabel.position = new Point(0.25, canvasSize.height - lineCountTextLbl.height - 1 - gridVisibilityBtn.height - textInput.height - ballPullStrengthLabel.height)

    ballPullStrengthSlider = new Slider(game, 0,100, 0.1, ballsPullStrength);
    ballPullStrengthSlider.position = new Point(0.25, canvasSize.height - lineCountTextLbl.height - 1.25 - gridVisibilityBtn.height - textInput.height - ballPullStrengthLabel.height - ballPullStrengthSlider.height)


    function HandlePullStrengthChanged() {
        ballPullStrengthLabel.text = ballPullStrengthDefaultText + ballPullStrengthSlider.value.toFixed(2);
        ballsPullStrength = ballPullStrengthSlider.value;
    }
    HandlePullStrengthChanged();

    ballPullStrengthSlider.AddEventListener("valueChanged", HandlePullStrengthChanged, ballPullStrengthLabel)

    game.AddGameObject(ballPullStrengthSlider)
    game.AddGameObject(ballPullStrengthLabel)


    // #endregion
}

// #region UI event handling --

function HandleGridVisibilityBtnUp() {
    if (gridIsVisible) {
        gridIsVisible = false
        HideGrid();
    }
    else {
        gridIsVisible = true
        ShowGrid();
    }

}

// #endregion

function ShowGrid() {
    gridVisibilityBtn.text = "Hide grid"

}

function HideGrid() {
    gridVisibilityBtn.text = "Show grid"

}

let linesInScene = [];
let lineWidth = 1; // in pixels
function RemovePreviousLines() {

    while (linesInScene.length > 0) {
        let line = linesInScene[0];
        // remove from scene and call destructor
        game.RemoveGameObject(line, true)
        linesInScene.shift() // clear out array
    }
}

// creates line graphics from two points and returns it

/**
 * Create line graphics to add to scene
 * @param {*} point1 point 1 of line in GAME UNITS
 * @param {*} point2 point 2 of line in GAME UNITS
 * @param {Number} strokeWidth stroke width in PIXELS 
 * @returns The created line graphics
 */
function CreateLineGraphics(point1, point2, strokeWidth) {
    // convert points into pixel points
    let pixelP1 = game.ConvertUnitsToRawPixels(point1);
    let pixelP2 = game.ConvertUnitsToRawPixels(point2);
    let newLineGraphics = new Graphics()
        .moveTo(pixelP1.x, pixelP1.y)
        .lineTo(pixelP2.x, pixelP2.y)
        .stroke({
            color: "white",
            width: strokeWidth
        })


    return newLineGraphics;
}

// draws all lines for a scene between all balls.
// Alpha depends on distance between each ball

// The range of squared distance that a ball can be in, the closer it is to minimum the brighter it is, the closer it is to maximum the less visible it is
let ballSqrDistanceRange = [0.2 ** 2, 2 ** 2];
let maxLinesPerBall = 6; // maximum number of lines that can be drawn per ball
function DrawAllLines() {
    // first remove any previously rendered ones
    RemovePreviousLines();

    // // have a list of pairs that have had a line calculated to them already, then skip if the pair has already been done
    // // the array will be full of arrays with two ball gameObjects (they are just stored as references so it won't be a burden on memory)
    // let calculatedPairs = [];


    for (let ball1Index = 0; ball1Index < ballsInScene.length; ball1Index++) {
        let ball1 = ballsInScene[ball1Index];
        let linesDrawn = 0;
        for (let ball2Index = 0; ball2Index < ballsInScene.length; ball2Index++) {
            if (linesDrawn > maxLinesPerBall)
                break; // go onto the next ball, skip this loop

            let ball2 = ballsInScene[ball2Index];
            if (ball1 == ball2)
                continue; // don't draw to self

            // // don't draw line if it has already been calculated
            // let pairExists = false;
            // for (const pair of calculatedPairs) {
            //     // If pair exists
            //     if (pair[0] == ball1 && pair[1] == ball2
            //         ||
            //         pair[0] == ball2 && pair[1] == ball1) {
            //         pairExists = true;
            //     }
            // }

            // if (pairExists)
            //     continue; // skip this iteration if pair has been calculated already



            // add pairs to list of drawn ones
            // calculatedPairs.push([ball1, ball2])

            // ok so get distance, if this ball is in range for distances with other balls, draw

            let distanceSquared = VecMath.SqrDistance(ball1.position, ball2.position)

            // if the distance is higher than or equal to max range, don't render it's too far away
            if (distanceSquared >= ballSqrDistanceRange[1])
                continue; // skip

            // This is the percentage of the distance squared that it is inside of the range. E.g. if range is 0 to 10 and distance is a 2. Then it's percentage would be 80%
            // That's why I do 1- because it's like the inversepercentage from 1 and the percentage of the range is basically how you get brightness
            // also do max-min for range because I want it to clamp properly to bounds of range
            let distancePercentage = (distanceSquared / (ballSqrDistanceRange[1] - ballSqrDistanceRange[0]))

            // not you inner wolf, this is the brightness of line n that yo
            let alpha = 1 - Clamp(distancePercentage, ballSqrDistanceRange[0], ballSqrDistanceRange[1])
            // console.log(distancePercentage, ballSqrDistanceRange, alpha)



            // Create the line
            let lineGraphics = CreateLineGraphics(ball1.position, ball2.position, lineWidth)

            lineGraphics.alpha = alpha;

            // Make sure that the line is behind the ball
            lineGraphics.zIndex = -1

            // game object
            let line = new GameObject(lineGraphics, game, false, false); // don't share size and pos
            line.gravityEnabled = false;

            // add to scene
            game.AddGameObject(line);
            // add to list of created lines
            linesInScene.push(line);

            linesDrawn++;
        }


    }
}

// For ball to mouse view my graph
// https://www.desmos.com/calculator/dl8hdrfrmx 

let ballPullArea = 3; // distance to ball required to puul from the pointer
function PullAllBallsToMouse(game) {
    // get pointer pos from the game
    let pointerPos = game.pointerPos;

    // iterate through all balls
    for (const ball of ballsInScene) {
        // lowkey the distance value (uses square root) isn't too laggy huh
        let distanceToMouse = VecMath.Distance(ball.position, pointerPos); // distance of ball to mouse
        // must be close enough to ball
        if (distanceToMouse >= ballPullArea)
            continue;
        // ball to mouse pos vector
        let ballToPointerVector = VecMath.SubtractVecs(pointerPos, ball.position)
        // The father away the ball is, the stronger the pull. You then times this by pull strength to make it more or less powerful
        let newVelocity = VecMath.ScalarMultiplyVec(VecMath.ScalarMultiplyVec(ballToPointerVector, distanceToMouse), ballsPullStrength);
        // Get the difference from this velocity to the new velocity, 
        let deltaSec = game.ticker.deltaMS / 1000;
        let differenceVec = VecMath.SubtractVecs(newVelocity, ball.velocity);
        //then times that distance by time since last frame to make the push effect happen over time
        differenceVec = VecMath.ScalarMultiplyVec(differenceVec, deltaSec)

        ball.velocity = VecMath.AddVecs(ball.velocity, differenceVec)
    }
}

let ballsPushStrength = 10;
let ballPushArea = 3; // distance to ball required to push from the pointer
function PushAllBallsAwayFromMouse(game) {
    // get pointer pos from the game
    let pointerPos = game.pointerPos;

    // iterate through all balls
    for (const ball of ballsInScene) {
        // lowkey the distance value (uses square root) isn't too laggy huh

        // But just use square distance because it will push more
        let distanceToMouse = VecMath.Distance(ball.position, pointerPos); // distance of ball to mouse
        // must be close enough to ball
        if (distanceToMouse >= ballPushArea)
            continue;
        // ball to mouse pos vector. You then inverse this (* -1) to get the push away effect
        let ballToPointerVector = VecMath.ScalarMultiplyVec(VecMath.SubtractVecs(pointerPos, ball.position), -1)
        // The closer the ball is, the stronger the push. You then times this by push strength to make it more or less powerful
        let newVelocity = VecMath.ScalarMultiplyVec(VecMath.ScalarDivideVec(ballToPointerVector, distanceToMouse), ballsPushStrength);
        // Get the difference from this velocity to the new velocity, 
        let deltaSec = game.ticker.deltaMS / 1000;
        let differenceVec = VecMath.SubtractVecs(newVelocity, ball.velocity);
        //then times that distance by time since last frame to make the push effect happen over time
        differenceVec = VecMath.ScalarMultiplyVec(differenceVec, deltaSec)

        ball.velocity = VecMath.AddVecs(ball.velocity, differenceVec)
    }
}

function ProcessUserInputs(game) {
    // Check pointers
    if (leftPointerDown) {
        PullAllBallsToMouse(game);
    } else if (rightPointerDown) {
        PushAllBallsAwayFromMouse(game);
    }
}

function UpdateText(game) {
    if (lineCountTextLbl)
        lineCountTextLbl.text = lineCountTextDefault + linesInScene.length
}

function BallsConnectToLineOnTick(game) {
    // deal with user inputs (like pointer or keyboard and stuff)
    ProcessUserInputs(game);

    // draw new lines (removes old)
    DrawAllLines();
    UpdateText(game);



}

function BallsConnectToLineUnload(game) {
    // remove all events
    for (const eventDataToDestroy of pixiEventsToDestroy) {
        eventDataToDestroy[0].removeEventListener(eventDataToDestroy[1], eventDataToDestroy[2])
    }

    for (const eventDataToDestroy of gameObjEventsToDestroy) {
        eventDataToDestroy[0].RemoveEventListener(eventDataToDestroy[1], eventDataToDestroy[2])
    }

}

// #endregion

// screen borders scrtipt

function ScreenBordersLoad(game) {
    // console.log(GetCanvasSize());
}

function ScreenBordersOnTick(game) {
    // loop through all game objects if they're not static then make sure they're inside the screen bounds 
    let gameObjectsInScene = game.gameObjects;

    let canvasSize = GetCanvasSizeInUnits();

    for (const gameObject of gameObjectsInScene) {
        // do nothing when static (not moving)
        if (gameObject.static)
            continue; // skip

        // else check if position is out of bounds and then move accordingly and change velocity

        let objectX = gameObject.x;
        let objectY = gameObject.y;

        // the x and y are the centres so offset them by width and height because this function is made for rects
        if (gameObject.isACircle) {
            objectX -= gameObject.width / 2;
            objectY -= gameObject.height / 2;

        }

        // check x-axis is out of left
        if (objectX < 0) {
            objectX = 0
            // force right
            gameObject.velocity.x = Math.abs(gameObject.velocity.x);
        } else if (objectX > canvasSize.width - gameObject.width) { // out right
            objectX = canvasSize.width - gameObject.width
            // force left
            gameObject.velocity.x = -Math.abs(gameObject.velocity.x);
        }

        // check y-axis is out bottom
        if (objectY < 0) {
            objectY = 0
            // force up
            gameObject.velocity.y = Math.abs(gameObject.velocity.y);
        } else if (objectY > canvasSize.height - gameObject.height) { // out top
            objectY = canvasSize.height - gameObject.height
            gameObject.velocity.y = -Math.abs(gameObject.velocity.y);
        }
    }

}
