var Point = PIXI.Point;


// main class, I included the subclasses in the same file because it is easier 
class Game {
    pixiApplication = new PIXI.Application();
    graphicsContainer = null; // a div where graphics go 
    defaultBackgroundColour = "#4f4f4f"
    gameObjects = []; // an array of all game objects in scene 
    ticker; // a PIXI ticker object that is for this game obvject
    globalPhysicsEnabled = true; // Maybe you don't want physics idk
    gravity = 9.8; // gravitational acceleration in game units/second (only on y)
    gravityScale = 1; // how much force gravity will apply to objects (lower is less pull and higher is more pull)
    drag = 0.25; // opposing force on velocity of object in game units/sec 
    pixelsPerUnit = new PIXI.Point(50, 50); // each game unit is a certain amount of pixels in x and y 

    // I don't need to listen for multiple events so I'll just use the on... functions
    //onTick; //a function that fires whenever the game ticks (new frame)

    mousePos = new Point(0, 0); // mouse position, updates every move of mouse or pointer

    // game constructor, pass in a div container for game graphics
    constructor() {
        this.ticker = new PIXI.Ticker();
        this.ticker.autoStart = true;

    }

    // handles mouse movement anywhere on canvas
    HandleMouseMove = (event) => {
        // console.log(event)
        let canvasBounds = this.pixiApplication.canvas.getBoundingClientRect();

        let mousePos = new Point(event.clientX - canvasBounds.x, event.clientY - canvasBounds.y)
        this.mousePos = mousePos
    }

    Initialise(graphicsContainer) {
        this.graphicsContainer = graphicsContainer;

        // return a promise because this function needs to be asynchronous due to PIXI needing to be async
        return new Promise((resolve, reject) => {
            // initialise the graphics object (is done asynchronously)
            this.pixiApplication.init({
                background: this.defaultBackgroundColour,
                resizeTo: graphicsContainer
            }).then(() => {
                // now add the canvas to html
                graphicsContainer.appendChild(this.pixiApplication.canvas)
                this.AddTickerListener(this.onTick);
                this.pixiApplication.canvas.addEventListener("pointermove", this.HandleMouseMove)


                resolve(); // resolve the game promise
            }).catch((reason) => {
                reject(reason)
            })


        })
    }

    AddTickerListener(listeningFunction) {
        this.ticker.add(listeningFunction)
    }

    ConvertUnitsToPixels(unitPoint) {
        return new PIXI.Point(unitPoint.x * this.pixelsPerUnit.x, unitPoint.y * this.pixelsPerUnit.y);
    }

    ConvertPixelsToUnits(pixelPoint) {
        return new PIXI.Point(pixelPoint.x / this.pixelsPerUnit.x, pixelPoint.y / this.pixelsPerUnit.y);
    }


    // need to be defined like this to keep "this" to the Game object under ticker listener
    onTick = () => {
        if (this.globalPhysicsEnabled) {
            this.PhysicsTickUpdate();
        }
    }

    // adds an object to the render canvas (makes it visible)

    /**
     * 
     * @param {GameObject} objectToAdd The game object to add to scene
     */
    AddGameObject(objectToAdd) {
        // make sure it doesn't exist otherwise when it is added, it just doesn't duplicate 
        if (this.DoesGameObjectExist(objectToAdd)) {
            console.warn("Tried to add an object that already exists")
            return;
        }

        // this.gameObjects.push(objectToAdd);


        /*
        // create it here so it doesn't get reused as reference
        let defaultGameData = {
            physics: {
                enabled: true,
                velocity: new PIXI.Point(0, 0), // each one represents movement over axis in game units per second 
            }
        }

        // if the object doesn't have game data attributte, add it
        if (!objectToAdd["gameData"])
            objectToAdd["gameData"] = defaultGameData;

        */

        this.gameObjects.push(objectToAdd)
        this.pixiApplication.stage.addChild(objectToAdd.graphicsObject)
    }

    // removes an object from the render canvas (makes it invisible)

    RemoveGameObject(objectToRemove) {
        if (this.DoesGameObjectExist(objectToRemove)) {
            // remove from array
            this.gameObjects.splice(this.gameObjects.indexOf(objectToRemove), 1)
            // remove from stage
            this.pixiApplication.stage.removeChild(objectToRemove.graphicsObj)
        }

    }

    /**
     * Checks if a game object's graphic object exists in game stage
     * @param {GameObject} objectToFind 
     * @returns true or false
     */
    DoesGameObjectExist(objectToFind) {
        // if not found in either game stage or game objects array
        return (this.gameObjects.indexOf(objectToFind) != -1 ||
            this.pixiApplication.stage.children.indexOf(objectToFind.graphicsObject) != -1)
    }

    // Updates game physics on tick
    PhysicsTickUpdate() {
        let gameStage = this.pixiApplication.stage; // contains all the rendered children
        // loop through all the children and see if they're physics enabled
        for (const gameObj of this.gameObjects) {
            // console.log(graphicsObj.y )

            // check valid
            // if (!gameObj["gameData"]) {
            //     console.log("Added graphics object doesn't have game data:", gameObj)
            //     continue;
            // }

            // let physicsData = gameObj.gameData.physics;

            // check should interact with physics
            if (!gameObj.physicsEnabled)
                continue;

            // the position is relative to parent so I'll just make it so only parent can move for now
            if (gameObj.graphicsObject.parent != gameStage)
                continue;


            // --- apply physics ---

            // seconds since last frame, ik division is slower but it's insignificant
            let deltaSec = this.ticker.deltaMS / 1000;

            // -- applying velocity --

            // in units/sec
            let velocity = gameObj.velocity;


            // Linear drag https://www.youtube.com/watch?v=OBq07mCMXlc&t=292s
            // Use the acceleration (double dot product of each axis) which is the rate of change of velocity and apply that to the current velocity.
            // Basically acceleration is how much velocity changes over time (1 second in this case)
            // The time is since last frame

            // let pixelVelocity = this.ConvertUnitsToPixels(physicsData.velocity); // convert from units to pixels

            // calculate acceleration on each axis


            // a=acceleration, v=velocity, k=drag (factor of resistance against motion)
            // a.x = -k * v.x
            // basically oppose the current velocity by the drag factor (-k*v)
            // let xAcceleration = (-1*this.drag)*unitVelocity.x;

            // let xDrag = this.drag;
            let xAcceleration = -this.drag * velocity.x


            // a=acceleration, v=velocity, k=drag (factor of resistance against motion)
            // Normal formula (treating positive as up for y)
            // a.y = -k * v.y -g


            let yGravity = this.gravity * this.gravityScale
            let yAcceleration = -this.drag * velocity.y - yGravity
            // let yAcceleration = (-this.drag * -velocity.y) - yGravity


            // apply acceleration changes to velocity (times by deltaSec to get change since last frame)
            velocity.x += xAcceleration * deltaSec
            velocity.y += yAcceleration * deltaSec 
            // velocity.y -= yAcceleration * deltaSec // minus the acceleration because negative is up
            // pixelVelocity.y *= -1

            // console.log(velocity.y)
            // unflip the y value

            // times velocity by deltaSex (time) to get change since last frame and also convert units to pixels as object position is in pixels
            gameObj.x += deltaSec * (velocity.x * this.pixelsPerUnit.x)
            gameObj.y += deltaSec * (velocity.y * this.pixelsPerUnit.y)

            // -- Applying border collision --

            // console.log(gameStage)
            let screenWidth = this.pixiApplication.canvas.width
            let screenHeight = this.pixiApplication.canvas.height;


            // if on left-side of border
            if (gameObj.x < 0) {
                gameObj.x = 0; // push-out
                velocity.x *= -1 // bounce
            }
            else if (gameObj.x + gameObj.width > screenWidth) // if on right-side of border
            {

                gameObj.x = screenWidth - gameObj.width// push-out
                velocity.x *= -1 // bounce
            }

            // if above border
            if (gameObj.y < 0) {
                gameObj.y = 0; // push-out
                velocity.y *= -1 // bounce
            }
            else if (gameObj.y + gameObj.height > screenHeight) // if below border
            {

                gameObj.y = screenHeight - gameObj.height// push-out
                velocity.y *= -1 // bounce
            }


        }

    }

}



// subclasses
/**
 * Currently, it is something that is renderable
 */
class GameObject {
    graphicsObject; // the actual graphics object of the game object
    game; // the current game object
    _isVisible = true;
    get isVisible() {
        return this._isVisible;
    }
    set isVisible(newVisibility) {
        this._isVisible = newVisibility // set class variable
        this.graphicsObject.visible = newVisibility; // also set graphics visibility
    }

    // -- Physics stuff --
    velocity = new Point(0, 0); // in game units/second 
    physicsEnabled = true;
    gravityEnabled = true;


    updateGraphicsObjPosition() {
        // clone to avoid conflicts
        let newPosition = new Point(this._position.x, this._position.y);
        newPosition.y = newPosition.y * -1 + game.pixiApplication.canvas.height - this.height; // inverse the y and make it bottom left (currently top left)
        this.graphicsObject.position = newPosition; // set the new pos
    }

    _position = new Point(0, 0);

    // POSITION X AND Y ARE READONLY, see GameObject.x and .y
    get position() {
        return this._position
    }
    // make it act like cartesian coordinates
    set position(newPosition) {
        // console.log("Set pos to ",newPosition)
        // set to original pos 
        this._position = newPosition;
        // make changes
        this.updateGraphicsObjPosition();

        // newPosition.y = newPosition.y * -1 + game.pixiApplication.canvas.height; // inverse the y and make it bottom left (currently top left)
        // this.graphicsObject.position = newPosition; // set the new pos
    }

    // position values
    get x() {
        return this._position.x
    }
    set x(newX) {
        this.position = new Point(newX, this.y)
    }
    get y() {
        return this._position.y
    }
    set y(newY) {
        this.position = new Point(this.x, newY)
    }

    _width = 0;
    get width() {
        return this._width
    }
    set width(newWidth) {
        this._width = newWidth;
        this.graphicsObject.width = newWidth
        // this.updateGraphicsObjPosition();
    }
    _height = 0;
    get height() {
        return this._height
    }
    set height(newHeight) {
        this._height = newHeight;
        this.graphicsObject.height = newHeight
        this.updateGraphicsObjPosition();
    }


    /**
     * Creates a game object, make sure to add it to the game after creation
     * @param {Graphics} graphicsObject A PIXI JS graphics object which holds all the render data. Is automatically added to game stage
     * @param {Game} game The current game the object is under
     */
    constructor(graphicsObject, game) {
        if (graphicsObject == null)
            console.warn("Created a new game object with null graphics object")
        if (game == null)
            console.warn("Created a new game object with null game object")
        this.graphicsObject = graphicsObject;
        this.game = game;

        // -- initialise values --
        this._width = this.graphicsObject.width;
        this.height = this.graphicsObject.height;

        // console.log("current pos is "+this.graphicsObject.position.x, +" " + this.graphicsObject.position.y)

        // intialising position doesn't work?
        // this.position = this.graphicsObject.position; // run through the set function

    }
}




/*
class Rect extends GameObject {
    x; // position x
    y; // position y
    width;
    height;
    colour;

    constructor(positionX = 0, positionY = 0, width = 0, height = 0, colour = "#FFFFFF") {
        this.x = positionX;
        this.y = positionY;
        this.width = width;
        this.height = height;
        this.colour = colour;
    }


}*/