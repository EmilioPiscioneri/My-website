var Point = PIXI.Point;

/**
 * The event system is an abstract class that adds support to a class for listening and firing its own events
 * @abstract
 */
class EventSystem {
    listeners = {}; // object where key is event name and value is an array of listeners

    constructor() {
    }

    /**
     * Adds a listener to the object
     * @param {string} eventName 
     * @param {Function} listener a function that will be called when event is fired. It may pass in data
     */
    AddEventListener(eventName, listener) {
        // The associated array with the current event name and all its listeners
        let listenerArray = this.listeners[eventName];
        // if hasn't been intialised, do so
        if (!listenerArray) {
            listenerArray = [];
            this.listeners[eventName] = listenerArray;
        }

        if (typeof (listener) != "function")
            throw new Error("You didn't pass in a function to the AddEventListener function");

        // Make sure the event hasn't already been added
        if (listenerArray.indexOf(listener) != -1)
            throw new Error("Tried to add a listener which has already been registered for the " + eventName + " event")

        listenerArray.push(listener);
    }

    /**
     * Removes an existing listener from object
     * @param {string} eventName 
     * @param {Function} listener a function that will be called when event is fired. It may pass in data
     */
    RemoveEventListener(eventName, listener) {
        let listenerArray = this.listeners[eventName];
        // There is no array for listener with associated name
        if (!listenerArray)
            return;

        let listenerIndex = listenerArray.indexOf(listener);
        listenerArray.splice(listenerIndex, 1); // remove the listener
    }

    /**
     * Removes an existing listener from object
     * @param {string} eventName 
     * @param {object} [eventData] Optional data to pass to listener
     */
    FireListener(eventName, eventData) {
        let listenerArray = this.listeners[eventName];
        // There is no array for listener with associated name
        if (!listenerArray)
            return;

        // loop thru array
        for (const listener of listenerArray)
            listener(eventData); // call the listener
    }

    /**
     * Prepares the object for getting destroyed later by the garbage collector
     */
    Destruct() {
        // loop thru all listener arrays
        for (const listenerArray of Object.values(this.listeners)) {
            // keep removing until empty
            while (listenerArray.length != 0) {
                listenerArray.pop(); // remove last element
            }
        }

    }
}

// main class, I included the subclasses in the same file because it is easier 
class Game extends EventSystem {
    pixiApplication = new PIXI.Application();
    graphicsContainer = null; // a div where graphics go 
    defaultBackgroundColour = "#4f4f4f"
    gameObjects = []; // an array of all game objects in scene 
    ticker; // a PIXI ticker object that is for this game obvject
    globalPhysicsEnabled = true; // Maybe you don't want physics idk
    // gravitational acceleration constant in game units/second (only on y)
    // Earth has roughly 9.8 m/s^2. I try to set the default to a value that kind of emulates real behaviour
    gravity = 98; // 
    gravityScale = 1; // how much force gravity will apply to objects (lower is less pull and higher is more pull)
    drag = 0.125; // opposing force on velocity of object in game units/sec 
    _pixelsPerUnit = new PIXI.Point(50, 50); // each game unit is a certain amount of pixels in x and y 

    // each game unit is a certain amount of pixels in x and y 
    get pixelsPerUnit() { return this._pixelsPerUnit };
    set pixelsPerUnit(newValue) {
        this._pixelsPerUnit = newValue;
        this.FireListener("pixelsPerUnitChanged")
    }

    // I don't need to listen for multiple events so I'll just use the on... functions
    //onTick; //a function that fires whenever the game ticks (new frame)

    mousePos = new Point(0, 0); // mouse position, updates every move of mouse or pointer

    // game constructor, pass in a div container for game graphics
    constructor() {
        super();
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
                graphicsContainer.onkeydown = this.OnKeyDown;
                this.ticker.add(this.OnTick); // attach to ticker event system
                this.pixiApplication.canvas.addEventListener("pointermove", this.HandleMouseMove)


                resolve(); // resolve the game promise
            }).catch((reason) => {
                reject(reason)
            })


        })
    }


    /**
     * Converts a point from unit coords to pixel
     * @param {PIXI.Point} unitPoint The point in units  
     * @returns  The point converted to pixels
     */
    ConvertUnitsToPixels(unitPoint) {
        return new PIXI.Point(unitPoint.x * this.pixelsPerUnit.x, unitPoint.y * this.pixelsPerUnit.y);
    }


    ConvertPixelsToUnits(pixelPoint) {
        return new PIXI.Point(pixelPoint.x / this.pixelsPerUnit.x, pixelPoint.y / this.pixelsPerUnit.y);
    }

    /**
     * Converts the weird coordinates to ones that behave like cartesian coords
     * @param {PIXI.Point} oldPos In GAME UNITS, the old position that you want to convert to 
     */
    ConvertToCartesian(oldPos) {
        let canvasHeight = game.pixiApplication.canvas.height / this.pixelsPerUnit.y; // convert from pixels to units

        return new Point(oldPos.x, oldPos.y * -1 + canvasHeight)
    }



    // need to be defined like this to keep "this" to the Game object under ticker listener
    OnTick = () => {
        if (this.globalPhysicsEnabled) {
            this.PhysicsTickUpdate();
            // fire on tick event
            this.FireListener("tick");
        }
    }

    // Handler for when key is pressed down
    OnKeyDown = (eventData) => {
        this.FireListener("keyDown", eventData)
    }



    /**
     * Adds a game object to scene, can only add one per scene
     * @param {GameObject} objectToAdd The game object to add to scene
     */
    AddGameObject(objectToAdd) {
        // make sure it doesn't exist otherwise when it is added, it just doesn't duplicate 
        if (this.DoesGameObjectExist(objectToAdd)) {
            console.warn("Tried to add an object that already exists")
            return;
        }

        this.gameObjects.push(objectToAdd)
        this.pixiApplication.stage.addChild(objectToAdd.graphicsObject)
    }

    /**
     * Removes an object from the game AND CALLS ITS DESTRUCTOR
     * @param {GameObject} objectToRemove Game object to remove
     */
    RemoveGameObject(objectToRemove) {
        if (this.DoesGameObjectExist(objectToRemove)) {
            // remove from array
            this.gameObjects.splice(this.gameObjects.indexOf(objectToRemove), 1)
            // remove from stage
            this.pixiApplication.stage.removeChild(objectToRemove.graphicsObject)
            // clean it up
            objectToRemove.Destruct();
        }
    }

    /**
     * Removes an array of object from the game
     * @param {Array.<GameObject>} gameObjects Array of game objects to remove
     */
    RemoveGameObjects(gameObjects) {
        if (!Array.isArray(gameObjects))
            throw new Error("Passed game objects isn't an array")
        for (const gameObj of gameObjects) {
            this.RemoveGameObject(gameObj);
        }
    }

    /**
     * Remove all objects from the game
     */
    RemoveAllGameObjects() {
        for (const gameObj of this.gameObjects) {
            this.RemoveGameObject(gameObj);
        }
    }

    /**
     * Checks if a game object's graphic object exists in game stage
     * @param {GameObject} objectToFind 
     * @returns true or false
     */
    DoesGameObjectExist(objectToFind) {
        return (this.gameObjects.indexOf(objectToFind) != -1)

        // game stage children doesn't mtter because it will handle errors
        // if found in both game stage and game objects array
        // return (this.gameObjects.indexOf(objectToFind) != -1 &&
        //     this.pixiApplication.stage.children.indexOf(objectToFind.graphicsObject) != -1)
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

            // If no drag, default to 0
            let drag = this.drag;
            if (!gameObj.dragEnabled)
                drag = 0;
            // Same with gravity
            let gravity = this.gravity * this.gravityScale;
            if (!gameObj.gravityEnabled)
                gravity = 0;

            let xAcceleration = -drag * velocity.x

            // a=acceleration, v=velocity, k=drag (factor of resistance against motion)
            // Normal formula (treating positive as up for y)
            // a.y = -k * v.y -g


            // let yGravity = this.gravity * this.gravityScale
            let yAcceleration = -drag * velocity.y - gravity

            // apply acceleration changes to velocity (times by deltaSec to get change since last frame)
            velocity.x += xAcceleration * deltaSec
            velocity.y += yAcceleration * deltaSec

            // times velocity by deltaSec (time) to get change since last frame 
            gameObj.x += deltaSec * velocity.x
            gameObj.y += deltaSec * velocity.y

            // -- Applying border collision --

            let screenWidth = this.pixiApplication.canvas.width
            let screenHeight = this.pixiApplication.canvas.height;


            // if on left-side of border
            if (gameObj.x < 0) {
                gameObj.x = 0; // push-out
                velocity.x *= -1 // bounce
            }
            else if (gameObj.x + gameObj.width > screenWidth / this.pixelsPerUnit.x) // if on right-side of border
            {

                gameObj.x = screenWidth / this.pixelsPerUnit.x - gameObj.width// push-out
                velocity.x *= -1 // bounce
            }

            // if above border
            if (gameObj.y < 0) {
                gameObj.y = 0; // push-out
                velocity.y *= -1 // bounce
            }
            else if (gameObj.y + gameObj.height > screenHeight / this.pixelsPerUnit.y) // if below border
            {

                gameObj.y = screenHeight / this.pixelsPerUnit.y - gameObj.height// push-out
                velocity.y *= -1 // bounce
            }


        }

    }

}



// subclasses/abstract classes



/**
 * Currently, it is something that is renderable
 */
class GameObject extends EventSystem {
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
    physicsEnabled = true; // Whether the 
    gravityEnabled = true; // If gravity will affect the current object, excludes drag
    dragEnabled = true; // if drag will affect the current object
    _collider; // associated collider for the current game object
    get collider() { return this._collider }
    set collider(newCollider) {
        newCollider.gameObject = this; // set to this game object
        this._collider = newCollider

    }


    updateGraphicsObjPosition() {
        // clone to avoid conflicts
        let newPosition = new Point(this._position.x, this._position.y);
        let canvasHeight = game.pixiApplication.canvas.height / this.game.pixelsPerUnit.y; // convert from pixels to units

        newPosition.y = newPosition.y * -1 // inverse y
            + canvasHeight - this.height // convert to bottom-left (currently top left)

        // set the new pos, convert to pixel units first
        this.graphicsObject.position = this.game.ConvertUnitsToPixels(newPosition);
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

        this.FireListener("positionChanged") // fire changed event


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
        this.graphicsObject.width = newWidth * this.game.pixelsPerUnit.x;// convert units to pixels
        this.FireListener("widthChanged") // fire changed event
        // this.updateGraphicsObjPosition();
    }
    _height = 0;
    get height() {
        return this._height
    }
    set height(newHeight) {
        this._height = newHeight;
        this.graphicsObject.height = newHeight * this.game.pixelsPerUnit.y;// convert units to pixels
        this.updateGraphicsObjPosition();
        this.FireListener("heightChanged") // fire changed event
    }

    /**
     * Creates a game object, make sure to add it to the game after creation
     * @param {Graphics} graphicsObject A PIXI JS graphics object which holds all the render data. Is automatically added to game stage
     * @param {Game} game The current game the object is under
     */
    constructor(graphicsObject, game) {
        super(); // calls constructor for inherited object

        if (graphicsObject == null)
            throw new Error("Created a new game object with null graphics object")
        if (game == null)
            throw new Error("Created a new game object with null game input")
        this.graphicsObject = graphicsObject;
        this.game = game;

        // -- initialise values --
        this.width = this.graphicsObject.width;
        this.height = this.graphicsObject.height;

        // -- setup listeners --

        game.AddEventListener("pixelsPerUnitChanged", () => {
            // Fire all the setters of variables to just update them so they adhere to the new change visually
            this.width = this.width;
            this.height = this.height;
            this.position = this.position;

        })

        // console.log("current pos is "+this.graphicsObject.position.x, +" " + this.graphicsObject.position.y)

        // intialising position doesn't work?
        // this.position = this.graphicsObject.position; // run through the set function

    }
}

/**
 * An ENUM for collider type
 * @static
 */
class ColliderType {
    static ERROR = 1;
    static AABB = 2;
}

/**
 * Base class for collider
 * @abstract
 */
class Collider extends EventSystem {
    type = ColliderType.ERROR;
    _gameObject; // a gameObject that the current collider is associated with
    isEnabled = true;

    get gameObject() { return this._gameObject }
    set gameObject(newGameObject) {
        let oldValue = this._gameObject
        this._gameObject = newGameObject;
        this.FireListener("gameObjectChanged", {
            oldValue: oldValue,
            newValue: newGameObject
        });
        // console.log("Game object changed to",newGameObject)

    }

    constructor() {
        super(); // call inherited class constructor
    }



}

/**
 * Axis-Aligned Bounding Box collider 
 * Basically a rectangle collider with no rotation
 * Search it up on the goog for more info
 */
class AABB extends Collider {
    type = ColliderType.AABB
    width = 0; // in game units 
    height = 0; // in game units
    position = new Point(0, 0); // in game units
    shareWidth = true; // whether to share width with parent game object
    shareHeight = true; // whether to share width with parent game object
    sharePosition = true; // whether to share position with parent game object

    constructor() {
        super();
        let thisObject = this; // to keep reference in deeper scoped functions

        // share width and height with parent game object if it exists
        this.AddEventListener("gameObjectChanged", function (eventData) {
            let oldGameObject = eventData.oldValue;
            let newGameObject = eventData.newValue;

            if (oldGameObject) {
                // remove old listeners, changing game object
                oldGameObject.RemoveEventListener("widthChanged", thisObject.WidthChangeCallback)
                oldGameObject.RemoveEventListener("heightChanged", thisObject.HeightChangeCallback)
                oldGameObject.RemoveEventListener("positionChanged", thisObject.PositionChangeCallback)
            }

            if (newGameObject) {
                // Fire the callbacks once to update changes
                thisObject.WidthChangeCallback();
                thisObject.HeightChangeCallback();
                thisObject.PositionChangeCallback();

                // add new listeners, changing game object
                newGameObject.AddEventListener("widthChanged", thisObject.WidthChangeCallback)
                newGameObject.AddEventListener("heightChanged", thisObject.HeightChangeCallback)
                newGameObject.AddEventListener("positionChanged", thisObject.PositionChangeCallback)
            }
        })
    }


    // define like this to preserve the this var
    WidthChangeCallback = () => {
        if (this.shareWidth) {
            let newWidth = this.gameObject.width;
            this.width = newWidth;
            // console.log("Updated collider width to " + this.width);
        }
    }

    // define like this to preserve the this var
    HeightChangeCallback = () => {
        if (this.shareHeight) {
            let newHeight = this.gameObject.height;
            this.height = newHeight
            // console.log("Updated collider height to " + this.height);
        }
    }

    // define like this to preserve the this var
    PositionChangeCallback = () => {
        if (this.sharePosition) {
            let newPosition = this.gameObject.position;
            this.position = newPosition
            // console.log("Updated position to", this.position);
        }
    }

    /**
     * Gets the bounds of the current collider
     * @returns {Object} The bounds of the collider
     */
    GetBounds() {
        return {
            left: this.position.x,
            right: this.position.x + this.width,
            bottom: this.position.y,
            top: this.position.y + this.height
        }

    }

    /**
     * Checks if the current collider collides with another one
     * @param {Collider} otherCollider Check if this collider, collides with the other one
     * @returns {boolean} Whether or not the collider does collide
     */
    DoesCollide(otherCollider) {
        // if either collider isn't active then there's no collision
        if(!this.isEnabled || !otherCollider.isEnabled)
            return false
        switch (otherCollider.type) {
            case ColliderType.AABB: // this AABB -> other AABB

                // I already explained it for AABB collision detection, see the theory folder of the website github

                // translated code from leanrOpenGL

                // collision x-axis?
                let collisionX =
                    (this.position.x + this.width >= otherCollider.position.x
                        && otherCollider.position.x + otherCollider.width >= this.position.x);

                // collision y-axis?
                let collisionY =
                    (this.position.y + this.height >= otherCollider.position.y
                        && otherCollider.position.y + otherCollider.height >= this.position.y);

                // collision only if on both axes
                return collisionX && collisionY;

                /* My first idea
                let thisBounds = this.GetBounds();
                let otherBounds = otherCollider.GetBounds()
                if (
                    (
                        // x-axis collision
                        (thisBounds.left > otherBounds.left && thisBounds.left < otherBounds.right)
                        ||
                        (otherBounds.left > thisBounds.left && otherBounds.left < thisBounds.right)
                        ||
                        (thisBounds.right > otherBounds.left && thisBounds.right < otherBounds.right)
                        ||
                        (otherBounds.right > thisBounds.left && otherBounds.right < thisBounds.right)
                    )
                    &&
                    (
                        // y-axis collision
                        (thisBounds.bottom > otherBounds.bottom && thisBounds.bottom < otherBounds.top)
                        ||
                        (otherBounds.bottom > thisBounds.bottom && otherBounds.bottom < thisBounds.top)
                        ||
                        (thisBounds.top > otherBounds.bottom && thisBounds.top < otherBounds.top)
                        ||
                        (otherBounds.top > thisBounds.bottom && otherBounds.top < thisBounds.top)
                    )
                )
                    return true
                else
                    return false*/
                break;

            default:
                break;
        }

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