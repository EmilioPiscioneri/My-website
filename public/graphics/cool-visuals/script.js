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
function GetCanvasSize() {
    // convert to pixels per unit
    return {
        width: game.pixiApplication.canvas.width / game.pixelsPerUnit.x,
        height: game.pixiApplication.canvas.height / game.pixelsPerUnit.y,
    }
}

// balls connect to line script

let objectsToDestroy = [];
// events to destroy

function BallsConnectToLineLoad(game) {

    // line coords
    let startPoint = game.ConvertUnitsToRawPixels(new Point(1,1))
    let endPoint = game.ConvertUnitsToRawPixels(new Point(5,5))

    // create line graphics
    let lineGraphics = new Graphics()
    .moveTo(startPoint.x, startPoint.y)
    .lineTo(endPoint.x, endPoint.y)
    .stroke({width: 6,color: "grey"})

    // console.log(game.ConvertUnitsToRawPixels(new Point(1,1)))
    // console.log(game.ConvertUnitsToRawPixels(new Point(5,5)))

    // lineGraphics.alpha = 0.5

    // game.pixiApplication.stage.addChild(lineGraphics)
    
    // disable the share pos and size to avoid weird stuff
    let line = new GameObject(lineGraphics, game, false, false);
    line.gravityEnabled = false;

    

    document.lineGraphics = lineGraphics;
    document.line = line;

    game.AddGameObject(line)
}

function BallsConnectToLineOnTick(game) {
    // Just push game objects inwards if out of screen bounds. Easier than dealing with static objects
}

// screen borders scrtipt

function ScreenBordersLoad(game) {
    // console.log(GetCanvasSize());
}

function ScreenBordersOnTick(game) {
    // loop through all game objects if they're not static then make sure they're inside the screen bounds 
    let gameObjectsInScene = game.gameObjects;

    let canvasSize = GetCanvasSize();

    for (const gameObject of gameObjectsInScene) {
        // do nothing when static (not moving)
        if (gameObject.static)
            continue; // skip

        // else check if position is out of bounds and then move accordingly and change velocity

        let objectX = gameObject.x;
        let objectY = gameObject.y;

        // the x and y are the centres so offset them by width and height because this function is made for rects
        if(gameObject.isACircle){
            objectX -= gameObject.width/2;
            objectY -= gameObject.height/2;

        }

        // check x-axis is out of left
        if (objectX < 0) {
            objectX = 0
            gameObject.velocity.x *= -1;
        } else if (objectX > canvasSize.width - gameObject.width) { // out right
            objectX = canvasSize.width - gameObject.width
            gameObject.velocity.x *= -1;
        }

        // check y-axis is out bottom
        if (objectY < 0) {
            objectY = 0
            gameObject.velocity.y *= -1;
        } else if (objectY > canvasSize.height - gameObject.height) { // out top
            objectY = canvasSize.height - gameObject.height
            gameObject.velocity.y *= -1;
        }
    }

}
