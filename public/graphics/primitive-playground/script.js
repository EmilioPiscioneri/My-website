// primitive playground code

// libraries/class/object setup
const game = new Game();
var Graphics = PIXI.Graphics; // graphics library
var Rectangle = PIXI.Rectangle;
var Point = PIXI.Point;
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
        if (typeof (this._onTickFunction) == "function")
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
function getCanvasPosFromPointerPos(position) {
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
function RemoveLoader(loaderToRemove){
    
    let loaderIndex = loaders.indexOf(loaderToRemove)
    if(loaderIndex != -1){
        loaderToRemove.Unload(); // unload
        loaders.splice(loaderIndex, 1); // remove from array
    }else
    console.warn("Tried to remove a loader that hasn't been added to scene")
        
}

// -- scripts to load --
let collisionTestScript = new ScriptLoader(game, collisionTestLoad, collisionTestOnTick, collisionTestUnload);
let velTstScript = new ScriptLoader(game, velTstLoad, velTstOnTick, velTstUnload); // velocity test script

function main() {
    game.AddEventListener("tick", mainTickerHandler);

    AddLoader(collisionTestScript); // add to scene and load

    // unload after x seconds

    setTimeout(() => {
        RemoveLoader(collisionTestScript) // remove from scene and unload
    }, 3000);

    // After script is unloaded, load the next script
    collisionTestScript.AddEventListener("unloaded", ()=>{

    })






    // console.log(game.pixiApplication.stage.getChildAt(null) == null)

    // game.AddTickerListener(()=>{
    //     console.log(this)
    // })

}


// --- The different script functions ---

// #region -- Collision test script --

let gameObjectToMoveToPointer = null;
let speed = 10; // rect to mouse speed


// callbacks to remove on unload
let collisionTestPointerDownCbck;
let collisionTestPointerUpCbck;
let collisionTestKeyDwn;

// objects to remove on unload
let collisionTestObjsToRmv = [];

function collisionTestLoad(game) {
    // create rectangle graphics
    let rect1Graphics = new Graphics()
        .rect(0, 0, 3, 2)
        .fill("#FFFFFF")

    // create rectangle game object
    rect1 = new GameObject(rect1Graphics, game);
    // console.log(rect1.graphicsObject)

    // give it a collider
    rect1Collider = new AABB();
    rect1.collider = rect1Collider;

    // make it interactive
    rect1.graphicsObject.interactive = true;
    // rect1.gravityEnabled = false;
    // rect1.dragEnabled = false;

    collisionTestPointerDownCbck = (event) => {
        gameObjectToMoveToPointer = rect1;
    }

    collisionTestPointerUpCbck = (event) => {
        gameObjectToMoveToPointer = null
    }

    // pointer is for touch and mouse
    rect1.graphicsObject.addEventListener("pointerdown", collisionTestPointerDownCbck)

    document.addEventListener("pointerup", collisionTestPointerUpCbck)

    // Add object to the game
    game.AddGameObject(rect1);

    // add objects to remove onm unload
    collisionTestObjsToRmv.push(rect1);

    collisionTestKeyDwn = (event) => {
        // console.log(event)

        let keyDown = event.key;
        let movementAmnt = 0.1; // movement amount in game units

        switch (keyDown) {
            // movement
            case "w":
                {
                    rect1.y += movementAmnt;
                    break;
                }
            case "s":
                {
                    rect1.y -= movementAmnt;
                    break;
                }
            case "a":
                {
                    rect1.x -= movementAmnt;
                    break;
                }
            case "d":
                {
                    rect1.x += movementAmnt;
                    break;
                }

            default:
                break;
        }
    }

    game.AddEventListener("keyDown", collisionTestKeyDwn)
}

function collisionTestOnTick(game) {
    if (gameObjectToMoveToPointer) {

        // console.log(clickPos)

        // move the graphic to pointer
        // gameObjectToMoveToPointer.x = clickPos.x;
        // gameObjectToMoveToPointer.y = clickPos.y;

        // I am doing a cool thing, see desmos
        // This will basically make the rect move to the mouse using a force instead of directly teleporting to it
        // This way you can fling it around and let go and stuff

        // See my desmos graph for some explanation to visualise the problem
        // I love desmos
        // https://www.desmos.com/calculator/dl8hdrfrmx

        //
        // let rectVelocity = gameObjectToMoveToPointer.velocity;
        let rectPos = gameObjectToMoveToPointer.position;
        let mousePos = game.ConvertToCartesian(game.ConvertPixelsToUnits(game.mousePos));

        // (m-r)
        let differenceVec = new Point(mousePos.x - rectPos.x, mousePos.y - rectPos.y)

        // A coefficient that affects how long it takes for the rect to reach the mouse
        // speed = speed

        let newVelocity = new Point(differenceVec.x * speed, differenceVec.y * speed)

        gameObjectToMoveToPointer.velocity = newVelocity;
    }
}

function collisionTestUnload() {
    console.log("Unloading collision test")
    game.RemoveGameObjects(collisionTestObjsToRmv)
    rect1.graphicsObject.removeEventListener("pointerdown", collisionTestPointerDownCbck)
    document.removeEventListener("pointerup", collisionTestPointerUpCbck)
    game.RemoveEventListener("keyDown", collisionTestKeyDwn)
}

// #endregion

// #region Veocity test script

// called once
function velTstLoad(game){

}

// called once per tick (frame)
function velTstOnTick(game){

}

// unloads the script at end
function velTstUnload(game){

}

// #endregion