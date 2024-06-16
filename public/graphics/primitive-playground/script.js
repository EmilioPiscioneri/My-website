// primitive playground code

// const { pointInTriangle } = require("./pixi");

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
function RemoveLoader(loaderToRemove) {

    let loaderIndex = loaders.indexOf(loaderToRemove)
    if (loaderIndex != -1) {
        loaderToRemove.Unload(); // unload
        loaders.splice(loaderIndex, 1); // remove from array
    } else
        console.warn("Tried to remove a loader that hasn't been added to scene")

}

// -- scripts to load --
let collisionBordersScript = new ScriptLoader(game, collisionBordersLoad);
let collisionTestScript = new ScriptLoader(game, collisionTestLoad, collisionTestOnTick, collisionTestUnload);
let velTstScript = new ScriptLoader(game, velTstLoad, velTstOnTick, velTstUnload); // velocity test script

function main() {
    game.AddEventListener("tick", mainTickerHandler);

    AddLoader(collisionBordersScript)
    AddLoader(collisionTestScript); // add to scene and load



    // console.log(game.pixiApplication.stage.getChildAt(null) == null)

    // game.AddTickerListener(()=>{
    //     console.log(this)
    // })

}


// --- The different script functions ---

// #region -- Collision borders script --

function collisionBordersLoad(game) {
    console.log("loading")
    // Create 4 walls to keep gameobjects inside
    let floorGraphics = new Graphics()
        .rect(0, 0, 0.1, 0.1)
        .fill("white")
    let floor = new GameObject(floorGraphics, game);
    let roof = new GameObject(new Graphics().rect(0, 0, 0.1, 0.1).fill("white"), game);
    let leftWall = new GameObject(new Graphics().rect(0, 0, 0.1, 0.1).fill("white"), game);
    let rightWall = new GameObject(new Graphics().rect(0, 0, 0.1, 0.1).fill("white"), game);

    floor.name = "floor"; // add custom name
    leftWall.name = "leftWall"; // add custom name
    roof.name = "roof"; // add custom name
    rightWall.name = "rightWall"; // add custom name
    // set up positions and size

    // The size will be static and won't follow resize cos idc abt that rn

    let wallsWidth = 500; // in game units. The length of each side will be the game canvas in game units
    let innerOffset = 0//3; // How much to the wall will be visible by. Just offset it slightly out to avoid weird physics happening at (0,0)
    // game.pixiApplication.stage.position = new Point(300,-300)
    floor.width = game.pixiApplication.canvas.width / game.pixelsPerUnit.x + wallsWidth;
    floor.height = wallsWidth;
    floor.y -= wallsWidth - innerOffset

    roof.width = game.pixiApplication.canvas.width / game.pixelsPerUnit.x + wallsWidth;
    roof.height = wallsWidth;
    roof.y = game.pixiApplication.canvas.height / game.pixelsPerUnit.y - innerOffset;

    leftWall.width = wallsWidth;
    leftWall.x = -wallsWidth + innerOffset;
    leftWall.y -= wallsWidth
    leftWall.height = game.pixiApplication.canvas.height / game.pixelsPerUnit.y + wallsWidth + wallsWidth;

    rightWall.width = wallsWidth;
    rightWall.x = game.pixiApplication.canvas.width / game.pixelsPerUnit.x - innerOffset;
    rightWall.height = game.pixiApplication.canvas.height / game.pixelsPerUnit.y + wallsWidth;

    // oh and add colliders. The position and size will auto adjust
    floor.collider = new AABB();
    roof.collider = new AABB();
    leftWall.collider = new AABB();
    rightWall.collider = new AABB();

    // also make the game objects static so they don't move
    floor.static = true;
    roof.static = true;
    leftWall.static = true;
    rightWall.static = true;


    // add to scene
    game.AddGameObject(floor);
    game.AddGameObject(roof)
    game.AddGameObject(leftWall)
    game.AddGameObject(rightWall)
    // console.log(floor)
}

//#endregion

// #region -- Collision test script --

let gameObjectToMoveToPointer = null;
let speed = 10; // rect to mouse speed
let rect1;
let rect2;
let obj3


// callbacks to remove on unload
let collisionTestRect1PointerDownCbck;
let collisionTestRect2PointerDownCbck;
let collisionTestPointerUpCbck;
let collisionTestKeyDwn;

// objects to remove on unload
let collisionTestObjsToRmv = [];

function collisionTestLoad(game) {
    // create rectangle graphics
    let rect1Graphics = new Graphics()
        .rect(0, 0, 3, 2)
        .fill("white")

    // make it interactive
    rect1Graphics.interactive = true;
    rect1Graphics.tint = "red"

    // create rectangle game object
    rect1 = new GameObject(rect1Graphics, game);

    // give it a collider
    rect1Collider = new AABB();
    rect1.collider = rect1Collider;

    // create rect 2

    let rect2Graphics = new Graphics()
        .rect(0, 0, 1, 4)
        .fill("white")

    // rect2Graphics.tint = "rgb(255,50,50)"
    rect2Graphics.interactive = true;
    rect2Graphics.tint = "green"

    rect2 = new GameObject(rect2Graphics, game)

    // rect2.physicsEnabled = false;
    // rect2.x = 2;
    // rect2.position = new Point(10, 6)
    // rect2.gravityEnabled = false;

    // give it a collider
    rect2Collider = new AABB();
    rect2.collider = rect2Collider;
    rect2.position = new Point(3.5, 2)
    rect2.name = "rect2"
    // rect2.velocity = new Point(-20, -10)
    // rect2.velocity = new Point(20,5)
    // rect2.velocity = new Point(-20,15)
    // rect2.velocity = new Point(5,20)

    //     let obj3Graphics = new Graphics()
    //     .circle(0,0,50)
    //     .fill("white")
    // game.pixiApplication.stage.addChild(obj3Graphics)
    // obj3 = obj3Graphics
    obj3 = new Circle(0, 0, 2, game)
    obj3.static = true
    // obj3 = new GameObject(obj3Graphics, game);
    // obj3.static = true; 




    let staticRectGraphics = new Graphics()
        .rect(0, 0, 5, 4)
        .fill("white")

    let staticRect = new GameObject(staticRectGraphics, game);
    staticRect.static = true;
    staticRect.position = new Point(10, 6)

    staticRect.collider = new AABB();

    game.AddGameObject(staticRect)






    // rect2Collider.mass = 5010000;
    // rect1Collider.mass = 10000;


    collisionTestRect1PointerDownCbck = (event) => {
        gameObjectToMoveToPointer = rect1;
    }

    collisionTestRect2PointerDownCbck = (event) => {
        gameObjectToMoveToPointer = rect2;
    }


    collisionTestPointerUpCbck = (event) => {
        gameObjectToMoveToPointer = null
    }

    // pointer is for touch and mouse
    rect1.graphicsObject.addEventListener("pointerdown", collisionTestRect1PointerDownCbck)
    rect2.graphicsObject.addEventListener("pointerdown", collisionTestRect2PointerDownCbck)

    document.addEventListener("pointerup", collisionTestPointerUpCbck)

    // Add objects to the game
    game.AddGameObject(rect1);
    game.AddGameObject(rect2);
    game.AddGameObject(obj3)

    // game.pixiApplication.stage.y = -200;
    // game.pixiApplication.stage.x = 200;


    // add objects to remove onm unload
    collisionTestObjsToRmv.push(rect1);

    collisionTestKeyDwn = (event) => {
        // console.log(event)

        let keyDown = event.key;
        let movementAmnt = 0.1; // movement amount in game units
        let pixelMovementAmnt = 25; // movement amount in pixels

        switch (keyDown) {
            // movement
            case "w":
                {
                    game.pixiApplication.stage.y += pixelMovementAmnt;

                    // rect1.y += movementAmnt;
                    break;
                }
            case "s":
                {
                    game.pixiApplication.stage.y -= pixelMovementAmnt;
                    // rect1.y -= movementAmnt;
                    break;
                }
            case "a":
                {
                    game.pixiApplication.stage.x += pixelMovementAmnt;
                    // rect1.x -= movementAmnt;
                    break;
                }
            case "d":
                {
                    game.pixiApplication.stage.x -= pixelMovementAmnt;
                    // rect1.x += movementAmnt;
                    break;
                }

            default:
                break;
        }
    }

    game.AddEventListener("keyDown", collisionTestKeyDwn)
}

function collisionTestOnTick(game) {
    // console.log(rect1.velocity)
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

    // do collision check
    // if (rect1.collider.CollidesWith(rect2.collider)) {
    //     // console.log("Rect1 collides with rect 2")
    //     rect1.graphicsObject.tint = "green"
    // }else{
    //     rect1.graphicsObject.tint = "white"
    // }
}

function collisionTestUnload() {
    console.log("Unloading collision test")
    game.RemoveGameObjects(collisionTestObjsToRmv)
    rect2.graphicsObject.removeEventListener("pointerdown", collisionTestRect2PointerDownCbck)
    rect1.graphicsObject.removeEventListener("pointerdown", collisionTestRect1PointerDownCbck)
    document.removeEventListener("pointerup", collisionTestPointerUpCbck)
    game.RemoveEventListener("keyDown", collisionTestKeyDwn)
}

// #endregion

// #region Veocity test script

// called once
function velTstLoad(game) {
    /**
     * The whole ieda of this script is to test if the velocity of the game is accruate
     * The velocity is meant to represent game units/second
     * This means with no drag or gravity, an object should roughly reach it's destination.
     * Due to time between frames the path and end pos isn't mathematically perfect 
     */

    // create its visuals (graphics)
    let launchObjGraphics = new Graphics()
        .rect(0, 0, 2, 2)
        .fill("rgb(244, 45, 47)");

    // console.log(launchObjGraphics)
    launchObjGraphics.zIndex = 2; // render on top of other object

    let launchObj = new GameObject(launchObjGraphics, game);

    // Want perfect path
    launchObj.gravityEnabled = false;
    launchObj.dragEnabled = false;

    // add object to scene
    game.AddGameObject(launchObj);

    // This is where the launch object should end up after 1 second
    let endPosition = new Point(6, 10);

    // Set up a second opaque object at the end goal
    let endObjGraphics = new Graphics()
        .rect(0, 0, 2, 2)
        .fill("rgb(0,70,115)")

    let endObj = new GameObject(endObjGraphics, game);
    endObj.position = endPosition;

    // Keep static
    endObj.physicsEnabled = false;

    // Add to game
    game.AddGameObject(endObj);

    setTimeout(() => {
        //launch after 2 sec
        launchObj.velocity = endPosition
        // After 1 sec, stop
        setTimeout(() => {
            launchObj.velocity = new Point(0, 0)
            // record results
            console.log("Stopped launch object, end position is:", launchObj.position)

        }, 1000);
    }, 2000);




}

// called once per tick (frame)
function velTstOnTick(game) {

}

// unloads the script at end
function velTstUnload(game) {

}

// #endregion