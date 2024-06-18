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
let ballsConnectToLineScript = new ScriptLoader(game, BallsConnectToLineLoad, BallsConnectToLineOnTick)
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
        height: game.pixiApplication.canvas.height / game.pixelsPerUnit.y,
    }
}

//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random

// Returns a random number between the specified values. The returned value is no lower than (and may possibly equal) min, and is less than (and not equal) max.
function GetRandomRange(min, max) {
    return Math.random() * (max - min) + min;
}

//#region balls to line script

let objectsToDestroy = [];
// events to destroy

function BallsConnectToLineLoad(game) {
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
        rows: 3,
        columns: 2
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

    let ballsPerSegment = 106; // arbitrary number for now

    let ballsInScene = []; // array of game objects of balls

    let ballMagnitudeRange = [2, 5]; // range of a ball's magnitude. First unit vector is generated and then this magnitude is applied

    let ballRadiusRange = [0.01,0.1]; // range of a ball's radius

    // removes all previous balls, for when you want to change ball count and redraw all of them
    function RemovePreviousBalls() {

    }

    // generates balls and puts them on the canvas, gives them a velocity too
    // This isn't done inside the generate segments loop because you may want to keep the same grid but just generate new balls u feel me
    function GenerateBalls(gridSegments) {
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
                        GetRandomRange(-1,1),
                        GetRandomRange(-1,1)
                    )

                    // if velocity came out to be 0
                    if(ballVelocity == new Point(0,0))
                        {
                            // either be (-1,0) or (1,0) or (0,-1) or (0,1)
                            let roll = Math.random();
                            if(roll >= 0 && roll < 0.25)
                                ballVelocity = new Point(-1,0)
                            else if(roll >= 0.25 && roll < 0.5)
                                ballVelocity = new Point(1,0)
                            else if(roll >= 0.5 && roll > 0.75)
                                ballVelocity = new Point(0,-1)
                            else
                                ballVelocity = new Point(0,1)
                        }

                    // Times unit vector by randomly generated magnitude in a certain range
                    ballVelocity = VecMath.ScalarMultiplyVec(ballVelocity, GetRandomRange(ballMagnitudeRange[0], ballMagnitudeRange[1]));

                    // Now actually create the game object
                    let ball = new Circle(ballPos.x, ballPos.y, GetRandomRange(ballRadiusRange[0], ballRadiusRange[1]), game)

                    // add collider to ball
                    // ball.collider = new CircleCollider();

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



    // #endregion
}

function BallsConnectToLineOnTick(game) {
    let linesInScene = [];
    // maybe take defining functions out of on tick and cache em
    function RemovePreviousLines(){

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
