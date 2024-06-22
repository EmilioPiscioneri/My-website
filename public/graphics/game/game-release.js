var Point = PIXI.Point;
let near0 = 0.00048828125; // a value that is near 0, it's a power of 2 which computers like

/*
    GAME.JS
    VERSION 0.2 - Added UI Elements
*/

/**
 * The event system is an abstract class that adds support to a class for listening and firing its own events
 * @abstract
 */
class EventSystem {
    listeners = {}; // object where key is event name and value is an array of listeners
    hasEventSystem = true; // whether or not a class has inherited form event system
    // object where key is event name and value is an array of 2 element arrays of [listener, gameObjectTheListenerIsRegisteredTo]
    // The registered listeners are those which this event system has subscribed to on other event systems. This will be cleared out on destruct to prevent memory leaks
    // they work backwards so when you add an event if u give it an object it will see if that object can register event listener and do so
    _registeredListeners = {};

    constructor() {
    }

    /**
     * Adds a listener to the object
     * @param {string} eventName 
     * @param {Function} listener a function that will be called when event is fired. It may pass in data
     */
    AddEventListener(eventName, listener, objectOfListener) {
        // console.log("Added listener for "+eventName)
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
        // console.log(listenerArray.length)
        if (listenerArray.indexOf(listener) != -1)
            throw new Error("Tried to add a listener which has already been registered for the " + eventName + " event")

        listenerArray.push(listener);

        if (objectOfListener && objectOfListener.hasEventSystem)
            objectOfListener.AddRegisteredListener(this, eventName, listener)
    }

    /**
     * Removes an existing listener from object
     * @param {string} eventName 
     * @param {Function} listener a function that will be called when event is fired. It may pass in data
     */
    RemoveEventListener(eventName, listener) {
        // console.log("removing event "+eventName)
        let listenerArray = this.listeners[eventName];
        // There is no array for listener with associated name
        if (!listenerArray)
            return;

        let listenerIndex = listenerArray.indexOf(listener);
        // remove if exists
        if (listenerIndex != -1)
            listenerArray.splice(listenerIndex, 1); // remove the listener
    }

    /**
     * Adds to registered listeners
     * @param {*} object The object that the listener was subscribed to
     * @param {*} eventName the name of event
     * @param {*} listener the listener
     */
    AddRegisteredListener(object, eventName, listener) {
        // The associated array with the current event name and all its listeners
        let listenerArray = this._registeredListeners[eventName];
        // if hasn't been intialised, do so
        if (!listenerArray) {
            listenerArray = [];
            this._registeredListeners[eventName] = listenerArray;
        }
        listenerArray.push([listener, object]); // add registered listener
    }

    // Not needed really, unless you don't want registered listeners to stack

    // RemoveRegisteredListener(object, eventName, listener){
    //     let listenerArray = this._registeredListeners[eventName];
    //     if(!listenerArray)
    //         return;

    //     // checl for listener in array
    //     let regIndex = listenerArray.indexOf([listener, object])

    //     // if found
    //     if(regIndex != -1){
    //         listenerArray.splice(regIndex, 1) // delete
    //     }
    // }

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
        // console.log("Destructing event system")
        // loop thru all listener arrays
        // console.log(this.listeners)
        // console.log(this)
        for (const listenerArray of Object.values(this.listeners)) {
            // console.log("---------")
            // console.log(listenerArray)
            // keep removing until empty
            while (listenerArray.length != 0) {
                listenerArray.pop(); // remove last element
            }
            // console.log(listenerArray)
        }

        // Remove all for registered
        for (const [eventName, regListenerArray] of Object.entries(this._registeredListeners)) {
            while (regListenerArray.length != 0) {
                let listenerArr = regListenerArray[0];
                // remove from object
                listenerArr[1].RemoveEventListener(eventName, listenerArr[0])
                regListenerArray.shift(); // remove first element
            }
            // console.log(regListenerArray)
        }

    }
}

/**
 * Static direction ENUM
 */
class Direction {

    static LEFT = 1;
    static RIGHT = 2;
    static DOWN = 3;
    static UP = 4;
}

/**
 * Vector math static class
 */
class VecMath {
    /**
     * Multiplies a vector using scalar multiplication
     * @param {Number} scalarValue 
     * @param {PIXI.Point} vector 
     * @returns vector * scalarValue
     */
    static ScalarMultiplyVec(vector, scalarValue) {
        return new Point(scalarValue * vector.x, scalarValue * vector.y)
    }

    /**
     * Divides a vector using scalar division
     * @param {Number} scalarValue 
     * @param {PIXI.Point} vector 
     * @returns The vector divided by scalar value
     */
    static ScalarDivideVec(vector, scalarValue) {
        return new Point(vector.x / scalarValue, vector.y / scalarValue)
    }

    /**
     * Adds to vectors by adding together each axis independently
     * @param {PIXI.Point} vector1 
     * @param {PIXI.Point} vector2 
     * @returns The addition of both vectors
     */
    static AddVecs(vector1, vector2) {
        return new Point(vector1.x + vector2.x, vector1.y + vector2.y)
    }

    // v1 -v2
    static SubtractVecs(vector1, vector2) {
        return new Point(vector1.x - vector2.x, vector1.y - vector2.y)
    }


    /**
     * Returns new vec where both axes of a vector are absolute 
     * @param {PIXI.Point} vector Vector to do math on 
     * @returns 
     */
    static AbsVec(vector) {
        return new Point(Math.abs(vector.x), Math.abs(vector.y))
    }

    /**
     * Returns dot product of two vectors. The addition of each axis of the vector's mulitplied by the same axis
     * @param {*} vector1 
     * @param {*} vector2 
     * @returns 
     */
    static DotProduct(vector1, vector2) {
        return vector1.x * vector2.x + vector1.y * vector2.y
    }

    // returns magnitude of vector
    static Magnitude(vector) {
        return Math.sqrt(vector.x ** 2 + vector.y ** 2)
    }

    // returns squared magnitude of vector (just don't do final sqrt part)
    static SqrMagnitude(vector) {
        return vector.x ** 2 + vector.y ** 2
    }

    // returns squared distance of two points (just don't do final sqrt part)
    static SqrDistance(vector1, vector2) {
        return (vector1.x - vector2.x) ** 2 + (vector1.y - vector2.y) ** 2
    }

    // returns distance of two points 
    static Distance(vector1, vector2) {
        return Math.sqrt((vector1.x - vector2.x) ** 2 + (vector1.y - vector2.y) ** 2)
    }

    static NormaliseVec(vector) {
        return this.ScalarDivideVec(vector, this.Magnitude(vector))
    }
}

/**
 * Clamps a value to the min or max if it is out of the range
 * @param {Number} value 
 * @param {Number} min 
 * @param {Number} max 
 * @returns {Number} The clamped value
 */
function Clamp(value, min, max) {
    return Math.max(min, Math.min(max, value))
}

// main class, I included the subclasses in the same file because it is easier 
class Game extends EventSystem {
    pixiApplication = new PIXI.Application();
    graphicsContainer = null; // a div where graphics go 
    // defaultBackgroundColour = "#4f4f4f"
    gameObjects = []; // an array of all game objects in scene 
    ticker; // a PIXI ticker object that is for this game obvject
    globalPhysicsEnabled = true; // Maybe you don't want physics idk
    // gravitational acceleration constant in game units/second (only on y)
    // Earth has roughly 9.8 m/s^2. I try to set the default to a value that kind of emulates real behaviour
    gravity = 98; // 
    gravityScale = 1; // how much force gravity will apply to objects (lower is less pull and higher is more pull)
    drag = 0.125; // opposing force on velocity of object in game units/sec 
    _pixelsPerUnit = new PIXI.Point(50, 50); // each game unit is a certain amount of pixels in x and y 
    initialised = false; // whether the pixi application has been initialised

    // each game unit is a certain amount of pixels in x and y 
    get pixelsPerUnit() { return this._pixelsPerUnit };
    set pixelsPerUnit(newValue) {
        this._pixelsPerUnit = newValue;
        this.FireListener("pixelsPerUnitChanged")
    }

    _backgroundColour = "#353535"
    get backgroundColour() { return this._backgroundColour }
    set backgroundColour(newColour) {
        this._backgroundColour = newColour;
        if (this.initialised)
            this.pixiApplication.renderer.background.color = newColour
    }

    _paused = false;
    // whether the game is paused, not fully accurate just physics and stuff
    get paused() {
        return this._paused
    }
    set paused(newValue) {
        this._paused = newValue
        if (this.ticker)
            if (newValue) // if paused
                this.ticker.speed = 0;
            else // else resume
                this.ticker.speed = 1;

    }

    // I don't need to listen for multiple events so I'll just use the on... functions
    //onTick; //a function that fires whenever the game ticks (new frame)

    pointerPos = new Point(0, 0); // pointer position, updates every move of pointer

    // game constructor, pass in a div container for game graphics
    constructor() {
        super();
        this.ticker = new PIXI.Ticker();
        this.ticker.autoStart = true;

    }

    // handles pointer movement anywhere on canvas
    HandlePointerMove = (event) => {
        // console.log(event)
        let canvasBounds = this.pixiApplication.canvas.getBoundingClientRect();

        let pointerPos = this.ConvertRawPixelsToUnits(new Point(event.clientX - canvasBounds.x, event.clientY - canvasBounds.y)); // convert to vectior that is cartesian and uses game units  
        this.pointerPos = pointerPos
    }

    Initialise(graphicsContainer) {
        this.graphicsContainer = graphicsContainer;

        // return a promise because this function needs to be asynchronous due to PIXI needing to be async
        return new Promise((resolve, reject) => {
            // initialise the graphics object (is done asynchronously)
            this.pixiApplication.init({
                background: this._backgroundColour,
                resizeTo: graphicsContainer,
                antialias: true, // make graphics not look so bad
            }).then(() => {
                // now add the canvas to html
                graphicsContainer.appendChild(this.pixiApplication.canvas)
                graphicsContainer.onkeydown = this.OnKeyDown;
                this.ticker.add(this.OnTick); // attach to ticker event system
                this.pixiApplication.canvas.addEventListener("pointermove", this.HandlePointerMove)
                this.initialised = true;


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

    // Converts screen pixels to units and also cartesian 
    ConvertRawPixelsToUnits(pixelPoint) {
        // convert to unit then cartesian
        return this.ConvertToCartesian(this.ConvertPixelsToUnits(pixelPoint))
    }

    // Converts cartesian units to screen pixels 
    ConvertUnitsToRawPixels(unitPoint) {
        // convert to unit then cartesian
        return this.ConvertPixelsToNonCartesian(this.ConvertUnitsToPixels(unitPoint))
    }

    ConvertArrayOfUnitsToPixels(arrayOfUnits) {
        let finalArray = [];

        // clone but convert
        for (const unit of arrayOfUnits) {
            finalArray.push(this.ConvertUnitsToPixels(unit))
        }
        return finalArray;
    }
    ConvertArrayOfPixelsToUnits(arrayOfPixels) {
        let finalArray = [];

        // clone but convert
        for (const pixel of arrayOfPixels) {
            finalArray.push(this.ConvertPixelsToUnits(pixel))
        }
        return finalArray;
    }

    /**
     * Converts the weird coordinates to ones that behave like cartesian coords
     * @param {PIXI.Point} oldPos In GAME UNITS, the old position that you want to convert to 
     */
    ConvertToCartesian(oldPos) {
        let canvasHeight = game.pixiApplication.canvas.height / this.pixelsPerUnit.y; // convert from pixels to units

        return new Point(oldPos.x, oldPos.y * -1 + canvasHeight)
    }

    /**
     * Converts the cartesion coords to weird coordinates 
     * @param {PIXI.Point} oldPos In PIXELS, the old position that you want to convert to 
     */
    ConvertPixelsToNonCartesian(oldPos) {
        let canvasHeight = game.pixiApplication.canvas.height;

        return new Point(oldPos.x, -oldPos.y + canvasHeight)
    }



    // need to be defined like this to keep "this" to the Game object under ticker listener
    OnTick = () => {
        if (this.paused)
            return
        if (this.globalPhysicsEnabled) {
            this.PhysicsTickUpdate();

        }
        // fire on tick event
        this.FireListener("tick");
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
        // if others, add them too
        if (objectToAdd.otherGameObjects)
            this.AddGameObjects(objectToAdd.otherGameObjects);
    }

    /**
     * Adds array of game objects to scene
     * @param {Array.<GameObject>} gameObjects The game object to add to scene
     */
    AddGameObjects(gameObjects) {
        if (!Array.isArray(gameObjects))
            throw new Error("Passed game objects isn't an array")
        for (const gameObj of gameObjects) {
            this.AddGameObject(gameObj);
        }
    }

    /**
     * Removes an object from the game  
     * @param {GameObject} objectToRemove Game object to remove
     * @param {Boolean} callDestructor After gameobject is removed, whether to call its destruct function (deletes graphics object too)
     * 
     */
    RemoveGameObject(objectToRemove, callDestructor) {
        if (this.DoesGameObjectExist(objectToRemove)) {
            // remove from array
            this.gameObjects.splice(this.gameObjects.indexOf(objectToRemove), 1)

            // remove from stage
            this.pixiApplication.stage.removeChild(objectToRemove.graphicsObject)
            // clean it up
            if (callDestructor)
                objectToRemove.Destruct();
            // if the object has others to remove
            if (objectToRemove.otherGameObjects)
                this.RemoveGameObjects(objectToRemove.otherGameObjects); // remove the others
        }
    }

    /**
     * Removes an array of object from the game
     * @param {Array.<GameObject>} gameObjects Array of game objects to remove
     * @param {Boolean} callDestructor After gameobject is removed, whether to call its destruct function (deletes graphics object too)
     */
    RemoveGameObjects(gameObjects, callDestructor) {
        if (!Array.isArray(gameObjects))
            throw new Error("Passed game objects isn't an array")
        for (const gameObj of gameObjects) {
            this.RemoveGameObject(gameObj, callDestructor);
        }
    }

    /**
     * Remove all objects from the game
     * @param {Boolean} callDestructor After gameobject is removed, whether to call its destruct function (deletes graphics object too)
     */
    RemoveAllGameObjects(callDestructor) {
        this.RemoveGameObjects(this.gameObjects, callDestructor)
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
        // don't continue when paused
        if (this.paused)
            return;
        let calculatedCollisionPairs = [];





        // Then, calculate all collision updates

        // See Excluding same and repeated pairs theory as to how I avoid repeating the same game objects twice
        // in collision loops 

        // loop through game objects once
        let gameObjectsTotal = this.gameObjects.length;
        for (let firstGameObjIndex = 0; firstGameObjIndex < gameObjectsTotal - 1; firstGameObjIndex++) {
            let firstGameObj = this.gameObjects[firstGameObjIndex];
            // Don't do anything if this object is static. There is nothing to change on this object
            if (firstGameObj.static)
                continue;


            // Record the current position
            let firstInitialPos = new Point(firstGameObj.x, firstGameObj.y);
            // Update the position and set new velocity for the first object
            // This will do nothing if the object is static
            this.CalculateNewVelocityAndPos(firstGameObj); // do tha velocity

            // NOTE: This will update the position and velocity for each game object because the collision pair check is only done in the second loop down below


            //#region Calculate collisions

            // first check if this object has a collider
            if (firstGameObj.collider)
                // then for each game object compare it's collision with another
                for (let secondGameObjIndex = firstGameObjIndex + 1; secondGameObjIndex < gameObjectsTotal; secondGameObjIndex++) {
                    let secondGameObj = this.gameObjects[secondGameObjIndex];


                    // don't do any updates when game is paused
                    if (this.paused)
                        return;

                    // If iterating the same game objects or the other one doesn't have a collider
                    if (firstGameObjIndex == secondGameObjIndex || !secondGameObj.collider)
                        continue; // skip

                    if (this.paused)
                        continue;

                    // From now on this loop won't have first and second object that have already been calculated or them as the same values

                    this.ResolveCollision(firstGameObj, secondGameObj, firstInitialPos)

                    // calculatedCollisionPairs.push([firstGameObj, secondGameObj])


                }
            // # endregion


        }
        // console.log(calculatedCollisionPairs.length)
    }

    // Resolves a collision between two bodies. It may update velocities or positions
    // It does a collision check between the two objects 
    ResolveCollision(firstGameObj, secondGameObj, firstInitialPos) {
        // do nothing if they're both static, neither should move or change velocity
        // Just don't bother calculating anything between them
        if (firstGameObj.static && secondGameObj.static)
            return;

        let firstCollider = firstGameObj.collider;
        let secondCollider = secondGameObj.collider;


        // check for a collision
        if (!firstCollider.CollidesWith(secondCollider)) {
            // no collision
            return; // skip if no collision
        }

        // From now on, there is a collision
        // if (firstGameObj.name == "circle")
        //     firstGameObj.tint = "green"
        // else if (secondGameObj.name == "circle")
        //     secondGameObj.tint = "green"



        // Setup initial variables we'll need for the calculations
        let firstMass = firstCollider.mass;
        let firstVelocity = new Point(firstGameObj.velocity.x, firstGameObj.velocity.y); // clone velocity as we don't want to change it right now 
        let secondMass = secondCollider.mass;
        let secondVelocity = new Point(secondGameObj.velocity.x, secondGameObj.velocity.y); // clone velocity as we don't want to change it right now 



        // If it was static then it's pos won't change

        // Put the object back to its pos hopefully before collision
        firstGameObj.position = firstInitialPos;
        // If it's still colliding afterwards, bad luck

        // if both are non static
        if (!firstGameObj.static && !secondGameObj.static) {
            // --- New elastic collision velocity handling ---


            // Calculate new velocity for first Game Object
            //https://en.wikipedia.org/wiki/Elastic_collision#Examples
            let firstNewVelocity =
                VecMath.AddVecs(
                    VecMath.ScalarMultiplyVec(firstVelocity, ((firstMass - secondMass) / (firstMass + secondMass))),
                    VecMath.ScalarMultiplyVec(secondVelocity, (2 * secondMass) / (firstMass + secondMass))
                )
            let secondNewVelocity =
                VecMath.AddVecs(
                    VecMath.ScalarMultiplyVec(firstVelocity, (2 * firstMass) / (firstMass + secondMass)),
                    VecMath.ScalarMultiplyVec(secondVelocity, ((secondMass - firstMass) / (firstMass + secondMass)))
                )

            firstGameObj.velocity = firstNewVelocity;
            secondGameObj.velocity = secondNewVelocity
        } else {
            // else only one is static, call apropriate function
            this.CalcNewNonStaticVelocity(firstGameObj, secondGameObj, firstVelocity, secondVelocity);
        }
    }

    // For resolve, collision
    // This calculates new non static velocity when one game object is static
    CalcNewNonStaticVelocity(firstGameObj, secondGameObj, firstVelocity, secondVelocity) {
        let staticGameObj;
        let nonStaticGameObj;
        let nonStaticVelocity;

        if (firstGameObj.static) {
            staticGameObj = firstGameObj
            nonStaticGameObj = secondGameObj;
            nonStaticVelocity = secondVelocity;
        } else {
            staticGameObj = secondGameObj
            nonStaticVelocity = firstVelocity;
            nonStaticGameObj = firstGameObj;
        }


        let nonStaticCentre = new Point(nonStaticGameObj.x + nonStaticGameObj.width / 2,
            nonStaticGameObj.y + nonStaticGameObj.height / 2);
        let staticCentre = new Point(staticGameObj.x + staticGameObj.width / 2,
            staticGameObj.y + staticGameObj.height / 2);

        let xDistance = nonStaticCentre.x - staticCentre.x;
        let yDistance = nonStaticCentre.y - staticCentre.y;
        let totalWidth = (nonStaticGameObj.width + staticGameObj.width) / 2;
        let totalHeight = (nonStaticGameObj.height + staticGameObj.height) / 2;
        let overlapX = totalWidth - Math.abs(xDistance);
        let overlapY = totalHeight - Math.abs(yDistance);


        let collisionNormal;

        // Overlap on x and y should never be 0 because it means they are touching and not colliding
        // x or y distance may be 0 if the cntres align

        if (overlapX < overlapY) {
            if (xDistance > 0)
                collisionNormal = new Point(1, 0)
            else if (xDistance < 0)
                collisionNormal = new Point(-1, 0)
        }
        else if (overlapY < overlapX) {
            if (yDistance > 0)
                collisionNormal = new Point(0, 1)
            else if (yDistance < 0)
                collisionNormal = new Point(0, -1)
        }

        //in the case that no collision normal is set, just skip this function
        if (collisionNormal == null) {
            console.warn("collision normal == NULL, skipping")
        }



        // Now do new velocity calculation based off normal that the non-static collided with on static object

        // The theory isn't mine but I just converted it to code

        let normalComponent = VecMath.DotProduct(nonStaticVelocity, collisionNormal); // this is just a real number
        let invertedComponent = VecMath.ScalarMultiplyVec(collisionNormal, -(normalComponent)); // no idea what this is
        let tangentialComponent = VecMath.AddVecs(nonStaticVelocity, invertedComponent) // collisionNormal * -invertedComponent
        let finalNonStaticVelocity = VecMath.AddVecs(tangentialComponent, invertedComponent); // ??

        finalNonStaticVelocity.y *= 0.97; // reduces bouncing problem of up and down from gravity on constant collisions. Kind of a hack fix but eh.
        // The fancy name for this fix is coefficient of restitution
        // Basically objects don't tend to stop bouncing up and down when above a static object without the dampening

        nonStaticGameObj.velocity = finalNonStaticVelocity; // update
    }

    // Calculates velocity for game object based on current velocity, drag and gravity.
    // Then sets the new calculated values to the aproppriate ones under game object
    CalculateNewVelocityAndPos(gameObj) {
        // First calculate all velocity updates for objects
        let gameStage = this.pixiApplication.stage; // contains all the rendered children

        // check should interact with physics
        if (!gameObj.physicsEnabled)
            return;

        // the position is relative to parent so I'll just make it so only parent can move for now
        if (gameObj.graphicsObject.parent != gameStage)
            return;

        // Don't need to move if static, can't have velocity
        if (gameObj.static)
            return;


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

    sharePosition = true; // whether or not setting position of game object will affect graphics object
    shareSize = true; // whether or not setting size (width and height) of game object will affect graphics object


    // -- Physics stuff --
    velocity = new Point(0, 0); // in game units/second 
    physicsEnabled = true; // Whether the 
    static = false; // whether or not the object should move at all
    gravityEnabled = true; // If gravity will affect the current object, excludes drag
    dragEnabled = true; // if drag will affect the current object
    _collider; // associated collider for the current game object
    get collider() { return this._collider }
    set collider(newCollider) {
        newCollider.gameObject = this; // set to this game object
        this._collider = newCollider

    }


    updateGraphicsObjPosition() {
        // only if shared pos
        if (!this.sharePosition)
            return;

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
        this._position = new Point(newPosition.x, newPosition.y); // avoid conflicts with referenced pos
        // make changes
        if (this.sharePosition)
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
        if (this.shareSize)
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
        if (this.shareSize)
            this.graphicsObject.height = newHeight * this.game.pixelsPerUnit.y;// convert units to pixels
        if (this.sharePosition)
            this.updateGraphicsObjPosition();
        this.FireListener("heightChanged") // fire changed event
    }

    /**
     * Creates a game object, make sure to add it to the game after creation
     * @param {Graphics} graphicsObject A PIXI JS graphics object which holds all the render data. Is automatically added to game stage
     * @param {Game} game The current game the object is under
     * @param {Boolean} sharePosition whether or not setting position of game object will affect graphics object
     * @param {Boolean} shareSize whether or not setting size (width and height) of game object will affect graphics object
     * 
     */
    constructor(graphicsObject, game, sharePosition = true, shareSize = true) {
        super(); // calls constructor for inherited object

        if (graphicsObject == null)
            throw new Error("Created a new game object with null graphics object")
        if (game == null)
            throw new Error("Created a new game object with null game input")
        this.graphicsObject = graphicsObject;
        this.game = game;

        this.sharePosition = sharePosition;
        this.shareSize = shareSize;

        // -- initialise values --
        if (shareSize) {
            this.width = this.graphicsObject.width;
            this.height = this.graphicsObject.height;
        }


        // -- setup listeners --

        game.AddEventListener("pixelsPerUnitChanged", () => {
            // Fire all the setters of variables to just update them so they adhere to the new change visually
            this.width = this.width;
            this.height = this.height;
            this.position = this.position;

        }, this)

        // console.log("current pos is "+this.graphicsObject.position.x, +" " + this.graphicsObject.position.y)

        // intialising position doesn't work?
        // this.position = this.graphicsObject.position; // run through the set function

    }

    Destruct() {
        // Called the inherited class's destruct class
        super.Destruct();

        // Destroy the graphics object if it exists and has destory function
        if (this.graphicsObject && this.graphicsObject.destroy) {
            this.graphicsObject.destroy();
        }
    }
}

// The circle graphics context is shared for all circles. This presents recalcualting the vertices each time, maybe redunadant but eh
let circleGraphicsContext = new PIXI.GraphicsContext()
    .circle(0, 0, 100)
    .fill("white");

/**
 * A circle game object with graphics already done for you.
 * A seperate class is needed because different behaviour of position is needed
 */
class Circle extends GameObject {
    // let 
    // get x() {
    //     return this._position.x
    // }
    // set x(newValue){

    // }

    // overwrite
    updateGraphicsObjPosition() {
        // clone to avoid conflicts
        let newPosition = new Point(this._position.x, this._position.y);
        let canvasHeight = game.pixiApplication.canvas.height / this.game.pixelsPerUnit.y; // convert from pixels to units

        newPosition.y = newPosition.y * -1 // inverse y
            + canvasHeight // Move to bottom. Because its a circle its x and y is middle of circle

        // set the new pos, convert to pixel units first
        this.graphicsObject.position = this.game.ConvertUnitsToPixels(newPosition);
    }

    isACircle = true;



    /**
     * 
     * @param {Number} x In game units
     * @param {Number} y In game units
     * @param {Number} radius 
     * @param {Game} game 
     */
    constructor(x, y, radius, game) {
        // Create the circle graphics object
        // let circleGraphicsObject = new PIXI.Graphics()
        //     .circle(0, 0, radius)
        //     .fill("white"); // can just change colour with tint

        let circleGraphicsObject = new PIXI.Graphics(circleGraphicsContext)

        circleGraphicsObject.width = radius * 2;
        circleGraphicsObject.height = radius * 2;

        circleGraphicsObject.interactive = true

        super(circleGraphicsObject, game)

        // Initialise position
        this.x = x;
        this.y = y;


    }

}

/**
 * A UI element game object
 */
class UIElement extends GameObject {
    _position = new Point(0, 0);
    get position() {
        return this._position
    }
    set position(newPosition) {
        // console.log("Position changed on UI to", newPosition)
        this._position = new Point(newPosition.x, newPosition.y);
        let pixelPos = this.game.ConvertUnitsToRawPixels(newPosition)
        pixelPos.y -= this.graphicsObject.height;
        this.graphicsObject.position = pixelPos;
        this.FireListener("positionChanged") // fire changed event
    }
    // overwrite pos functions
    get x() {
        return this.position.x;
    }
    set x(newX) {
        this.position = new Point(newX, this.position.y)
    }
    get y() {
        return this.position.y;
    }
    set y(newY) {
        this.position = new Point(this.position.x, newY)
    }




    /**
     * 
     * @param {PIXI.Graphics} graphicsObject PIXI graphics object
     * @param {Game} game 
     */
    constructor(graphicsObject, game) {
        super(graphicsObject, game, false, false); // turn off share pos and size for now
        this.physicsEnabled = false;
        this.interactive = true; // Just make all UI elements interactive
        this.shareSize = true // now turn it back on
    }
}

/**
 * A text game object with graphics already done for you.
 * A seperate class is needed because different behaviour of properties is needed
 * .textObject is the same as graphics object btw 
 */
class TextLabel extends UIElement {
    // PIXI text object
    get textObject() { return this.graphicsObject }
    set textObject(newTextObject) {
        this.graphicsObject = newTextObject
    }

    get text() {
        return this.textObject.text
    }
    set text(newText) {
        this.textObject.text = newText
        // Update width and height
        this.width = this.textObject.width / this.game.pixelsPerUnit.x
        this.height = this.textObject.height / this.game.pixelsPerUnit.y
        this.FireListener("textChanged")
    }

    get fontSize() { return this.textObject.style.fontSize }
    set fontSize(newFontSize) {
        this.textObject.style.fontSize = newFontSize;
        // Update width and height
        this.width = this.textObject.width / this.game.pixelsPerUnit.x
        this.height = this.textObject.height / this.game.pixelsPerUnit.y
        this.FireListener("fontSizeChanged")
    }

    /**
     * Creates a PIXI js text object for you. You just need to change the style to suit yourself.
     * @param {string} [text] Optional text to display on label
     * @param {boolean} [useBitmapText] Optional bool whether the button text label should be a bitmap text object, use this if you need to change text a lot
     * @param {*} [textStyleOptions] Optional PIXI text style options object. See https://pixijs.download/v8.1.5/docs/text.TextOptions.html
     * @param {Game} game 
     */
    constructor(game, text = "TextLabel", useBitmapText = false, textStyleOptions = null) {
        // create the PIXI text object

        // Set default text style options or use input
        textStyleOptions = textStyleOptions || {
            fontFamily: 'Arial',
            fontSize: 16,
            fill: "white",
            // stroke:{
            //     color:"black",
            //     width: 4,
            // },
            align: 'left',
        }

        // just use a default style for now
        let pixiTextObject;
        // use bitmap or not
        if (useBitmapText)
            pixiTextObject = new PIXI.BitmapText({
                text: text,
                style: textStyleOptions
            })
        else
            pixiTextObject = new PIXI.Text({
                text: text,
                style: textStyleOptions
            })

        super(pixiTextObject, game, false, false); // turn off share pos and size

        // -- initialise values --
        this.position = this.graphicsObject.position;
        // the text object automatically jets width and height in pixels when created so adjustr
        this.width = this.graphicsObject.width / game.pixelsPerUnit.x;
        this.height = this.graphicsObject.height / game.pixelsPerUnit.y;
    }
}

/**
 * Static class
 */
class HorizontalAlignment {
    static LEFT = 1;
    static MIDDLE = 2;
    static RIGHT = 3;
}

class VerticalAlignment {
    static BOTTOM = 1;
    static MIDDLE = 2;
    static TOP = 3;
}

// padding class
class Padding {
    left = 0
    right = 0
    bottom = 0
    top = 0

    /**
     * Create a new padding object. Each value represents a certain amount of game units that the outer content should be from the innner content with respect to size
     * @param {Number} left 
     * @param {Number} right 
     * @param {Number} bottom 
     * @param {Number} top 
     */
    constructor(left = 0, right = 0, bottom = 0, top = 0) {
        this.left = left;
        this.right = right;
        this.bottom = bottom;
        this.top = top;
    }
}


/**
 * A base class UI element which has a text label with a background rect as well
 */
class TextContainer extends UIElement {
    // defaults
    textHorizontalAlignment = HorizontalAlignment.MIDDLE;
    textVerticalAlignment = VerticalAlignment.MIDDLE;

    // Fits the text container to the text size as it updates
    fitToText = true;




    // corresponding Game TEXT LABEL which holds PIXI text object
    textLabelObject;

    // array of other game objects that correspond to this text container. These will need to be destroyed by game when this text container is destroyed
    otherGameObjects = [];

    get text() { return this.textLabelObject.text }
    set text(newText) {
        this.textLabelObject.text = newText
        this.FitBackgroundToText();
        this.FireListener("textChanged")
    }

    get backgroundGraphics() { return this.graphicsObject }
    set backgroundGraphics(newVal) {
        this.graphicsObject = newVal
    }

    // keep old getter and setter but add new stuff
    get position() {
        return super.position;
    }
    set position(newPosition) {
        super.position = newPosition; // keep the set function for UI element
        // console.log("Position changed on btn to", newPosition)
        // inject extra code

        // Update text pos
        this.UpdateTextPosition();

    }

    get zIndex() { return this.backgroundGraphics.zIndex }
    set zIndex(newVal) {
        // text should be 1 zindex above background
        this.backgroundGraphics.zIndex = newVal;
        this.textLabelObject.graphicsObject.zIndex = newVal + 1;
    }



    _padding = new Padding(0.1, 0.1, 0.1, 0.1);
    get padding() { return this._padding }
    set padding(newPadding) {
        let oldPadding = this._padding;
        this._padding = newPadding;

        // When padding changes you just update the width and height

        // get the raw values lmao. By thise I just mean the values without padding (do this advanced technique called subtraction)
        let rawWidth = this.width - oldPadding.left - oldPadding - right;
        let rawHeight = this.height - oldPadding.bottom - oldPadding - top;

        // Set the new width to the raw width + padding on x and y respectively
        this.width = rawWidth + newPadding.left + newPadding.right;
        this.height = rawHeight + newPadding.bottom + newPadding.top;
    }

    get fontSize() { return this.textObject.fontSize }
    set fontSize(newFontSize) {
        this.textLabelObject.fontSize = newFontSize;
        this.FitBackgroundToText()
        this.FireListener("fontSizeChanged")

    }



    // In order to do colors (including stroke) you're going to need to redraw the rect each time there's a change

    // when you set the stroke it'll update
    _backgroundStroke;
    get backgroundStroke() { return this._backgroundStroke }
    set backgroundStroke(newStroke) {
        this._backgroundStroke = newStroke;
        this.RedrawBackground();
    }

    // when you set the fill it'll update
    _backgroundFill = "#4f4f4f"
    get backgroundFill() { return this._backgroundFill }
    set backgroundFill(newFill) {
        this._backgroundFill = newFill;
        this.RedrawBackground();
    }




    // When width and height of btn changes, the background needs to be redrawn and the text needs to be repositioned
    get height() { return super.height };
    set height(newVal) {
        super.height = newVal;
        this.RedrawBackground();
        this.UpdateTextPosition();
    };

    get width() { return super.width };
    set width(newVal) {
        super.width = newVal
        this.RedrawBackground();
        this.UpdateTextPosition();
    };

    eventsToDestroy = []; // Has an array of arrays each with [objectSubscribedTo, eventName, eventListener]


    /**
     * Create a new text container, the graphics are created for you (not added to game), you just need to set the different appearance options manually.
     * @param {Game} game 
     * @param {string} text Optional text for the text container 
     * @param {boolean} [useBitmapText] Optional bool whether the text container text label should be a bitmap text object, use this if you need to change text a lot
     * @param {*} [textStyleOptions] Optional PIXI text style options object. See https://pixijs.download/v8.1.5/docs/text.TextOptions.html
     */
    constructor(game, text = "Lorem Ipsum", useBitmapText = false, textStyleOptions = null) {

        // Going to have two game objects, one for background and one for text

        // Create text
        let textLabelObject = new TextLabel(game, text, useBitmapText, textStyleOptions)


        // create graphics, need to access the "this" variable which is after the super function and then I'll redraw the background graphics before render which won't be too costly
        let backgroundGraphics = new Graphics()

        super(backgroundGraphics, game);

        // Set object
        this.textLabelObject = textLabelObject;
        this.otherGameObjects.push(this.textLabelObject);

        // Update width to based off text size + padding to start 
        this.width = textLabelObject.width + this.padding.left + this.padding.right;
        this.height = textLabelObject.height + this.padding.bottom + this.padding.top;

        this.RedrawBackground();


        // -- initialise values --
        // this.width = backgroundGraphics.width;
        // this.height = backgroundGraphics.height;
        this.position = backgroundGraphics.position;
        this.zIndex = backgroundGraphics.zIndex

        // console.log(this)

        // update text pos whenever it changes width or height, third value ensures every listener is destroyed properly
        this.textLabelObject.AddEventListener("widthChanged", this.UpdateTextPosition, this);
        this.textLabelObject.AddEventListener("heightChanged", this.UpdateTextPosition, this);
        // when text changes update pos
        this.textLabelObject.AddEventListener("textChanged", this.UpdateTextPosition, this);
        this.AddEventListener("textChanged", this.UpdateTextPosition, this);
        // fit to btn
        this.textLabelObject.AddEventListener("textChanged", this.FitBackgroundToText, this);
        this.textLabelObject.AddEventListener("fontSizeChanged", this.FitBackgroundToText, this);
    }

    /**
     * Updates the position of the text object under the text container with respect to the alignment and text container position
     * Need to define function as anonymous ()=>{} this to preserve the "this" variable
     */
    UpdateTextPosition = () => {
        // console.log(this)

        // get the raw values lmao. By thise I just mean the values without padding (do this advanced technique called subtraction)
        let rawWidth = this.width - this.padding.left - this.padding.right;
        let rawHeight = this.height - this.padding.bottom - this.padding.top;
        // start as btn pos (bottom-left)
        // Need to clone point to avoid object reference conflicts
        let textPos = new Point(this.position.x + this.padding.left, this.position.y + this.padding.bottom);
        // calc horizontal x
        switch (this.textHorizontalAlignment) {
            case HorizontalAlignment.LEFT:
                // do nothing
                break;
            case HorizontalAlignment.MIDDLE:
                // pos = middle of text container rect (rect.x + rectWidth/2) -  textWidth/2 
                textPos.x += rawWidth / 2 - this.textLabelObject.width / 2
                break;

            case HorizontalAlignment.RIGHT:
                textPos.x += rawWidth;
                break;
            default:
                console.warn("Horizontal aligment is an invalid value")
                break;
        }
        // calc vertical y
        switch (this.textVerticalAlignment) {
            case VerticalAlignment.BOTTOM:
                // do nothing
                break;
            case VerticalAlignment.MIDDLE:
                // pos = middle of text container rect (rect.y + rectHeight/2) -  textHeight/2 
                textPos.y += rawHeight / 2 - this.textLabelObject.height / 2
                break;

            case VerticalAlignment.TOP:
                textPos.y += rawHeight;
                break;
            default:
                console.warn("Vertical aligment is an invalid value")
                break;
        }

        this.textLabelObject.position = textPos;
    }

    RedrawBackground() {
        // console.log("_---")
        // console.log("Pre-size", this.backgroundGraphics.width,this.backgroundGraphics.height)
        // first clear the current visual
        this.backgroundGraphics.clear();
        // redraw rect and fill with size

        // console.log("Redrawing", this._width, this._height)
        let pixelWidth = this._width * this.game.pixelsPerUnit.x;
        let pixelHeight = this._height * this.game.pixelsPerUnit.y
        // console.log("Pixel", pixelWidth, pixelHeight)


        this.backgroundGraphics
            .rect(0, -pixelHeight, pixelWidth, pixelHeight)
            .fill(this._backgroundFill)

        // if has stroke, then process it
        if (this._backgroundStroke) {
            this.backgroundGraphics
                .stroke(this._backgroundStroke)
        }

        this.backgroundGraphics.scale = new PIXI.Point(1, 1); // For some reaosn the scale gets changed?? PIXI.JS must have a bug idk had me scratching my head

        this.backgroundGraphics.interactive = true; // set back to true

        // console.log("Post-size", this.backgroundGraphics.width,this.backgroundGraphics.height)

        // After redrawn, update position of background
        // super.position = super.position


    }

    // fits background size to text size
    FitBackgroundToText = () => {
        console.log("fitting to text")
        if (this.fitToText) {
            console.log("here")
            this.width = this.textLabelObject.width + this.padding.left + this.padding.right;
            this.height = this.textLabelObject.height + this.padding.bottom + this.padding.top;
        }
    }

    HandlePointerDown = (pointerEvent) => {
        this.FireListener("pointerDown", pointerEvent);
    }

    HandlePointerUp = (pointerEvent) => {
        this.FireListener("pointerUp", pointerEvent);
    }

    Destruct() {
        super.Destruct();
        // destroy both objects is done in game remove object

        // remove all events
        for (const eventDataToDestroy of eventDataToDestroy) {
            eventDataToDestroy[0].removeEventListener(eventDataToDestroy[1], eventDataToDestroy[2])
        }
    }
}


/**
 * A button game object with graphics already done for you.
 */
class Button extends TextContainer {
    /**
         * Create a new button, the graphics are created for you (not added to game), you just need to set the different appearance options manually.
         * @param {Game} game 
         * @param {string} text Optional text for the button
         * @param {boolean} [useBitmapText] Optional bool whether the button text label should be a bitmap text object, use this if you need to change text a lot
         * @param {*} [textStyleOptions] Optional PIXI text style options object. See https://pixijs.download/v8.1.5/docs/text.TextOptions.html
         */
    constructor(game, text = "Lorem Ipsum", useBitmapText = false, textStyleOptions = null) {

        // call constrcutor of base class
        super(game,text,useBitmapText,textStyleOptions);

        // Just add interactivity
        this.backgroundGraphics.addEventListener("pointerdown", this.HandlePointerDown);
        this.backgroundGraphics.addEventListener("pointerup", this.HandlePointerUp);
        // the others are automatically destroyed through the third poarameter
        this.eventsToDestroy.push([this.backgroundGraphics, "pointerdown", this.HandlePointerDown])
        this.eventsToDestroy.push([this.backgroundGraphics, "pointerup", this.HandlePointerUp])



    }


}

/**
 * An ENUM for collider type
 * @static
 */
class ColliderType {
    static ERROR = 1;
    static AABB = 2;
    static CIRCLE = 3;
}

/**
 * Base class for collider
 * @abstract
 */
class Collider extends EventSystem {
    type = ColliderType.ERROR;
    _gameObject; // a gameObject that the current collider is associated with
    isEnabled = true;
    mass = 1;

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
    position = new Point(0, 0); // in game units

    // changes on collider shouldn't reflect changes on game object position
    get x() { return this.position.x }
    set x(newX) { this.position.x = newX }

    get y() { return this.position.y }
    set y(newY) { this.position.y = newY }

    constructor() {
        super(); // call inherited class constructor
    }

    /**
     * Checks if the current collider collides with another one
     * @param {Collider} otherCollider Check if this collider, collides with the other one
     * @returns {boolean} Whether or not the collider does collide
     */
    CollidesWith(otherCollider) {
        // if either collider isn't active then there's no collision
        if (!this.isEnabled || !otherCollider.isEnabled)
            return false

        // AABB and AABB
        if (this.type == ColliderType.AABB && otherCollider.type == ColliderType.AABB) {
            // I already explained it for AABB collision detection, see the theory folder of the website github

            // translated code from leanrOpenGL

            // collision x-axis?
            let collisionX =
                (this.position.x + this.width > otherCollider.position.x
                    && otherCollider.position.x + otherCollider.width > this.position.x);

            // collision y-axis?
            let collisionY =
                (this.position.y + this.height > otherCollider.position.y
                    && otherCollider.position.y + otherCollider.height > this.position.y);

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
        }
        // AABB and Circle 
        else if ((this.type == ColliderType.CIRCLE && otherCollider.type == ColliderType.AABB)
            ||
            (this.type == ColliderType.AABB && otherCollider.type == ColliderType.CIRCLE)) {
            // console.log("Doing circle-AABB collision check")


            // See article https://learnopengl.com/In-Practice/2D-Game/Collisions/Collision-detection
            // determine which is aabb and which is circle colliders
            let circle;
            let aabb;
            if (this.type == ColliderType.CIRCLE) {
                circle = this;
                aabb = otherCollider
            } else {
                circle = otherCollider;
                aabb = this;
            }

            // get the half extents of aabb(weird ass name)
            let aabbHalfWidth = aabb.width / 2;
            let aabbHalfHeight = aabb.height / 2;

            // get centre of each obj
            let circleCentre = circle.position
            // let circleCentre = VecMath.AddVecs(circle.position, new Point(circle.radius, circle.radius))
            let aabbCentre = new Point(
                aabb.x + aabbHalfWidth,
                aabb.y + aabbHalfHeight
            )


            // difference between two centres
            let difference = VecMath.SubtractVecs(circleCentre, aabbCentre)
            // clamp the difference
            let clampedDifferenceX = Clamp(difference.x, -aabbHalfWidth, aabbHalfWidth)
            let clampedDifferenceY = Clamp(difference.y, -aabbHalfHeight, aabbHalfHeight)
            let clampedDifference = new Point(clampedDifferenceX, clampedDifferenceY)
            // add clamped value to AABB_center and we get the value of box closest to circle
            let closestPoint = VecMath.AddVecs(aabbCentre, clampedDifference)

            // retrieve vector between center circle and closest point AABB and check if length <= radius
            // Then finally do the collision check
            // use squared results cos faster
            let result = VecMath.SqrDistance(closestPoint, circleCentre) < circle.radius ** 2;

            // console.log("--------")
            // console.log("circleCentre", circleCentre)
            // console.log("aabbCentre", aabbCentre)
            // console.log("clampedDifference", clampedDifference)
            // console.log("difference2", difference)
            // console.log("closestPoint", closestPoint)
            // console.log("circle.radius", circle.radius)
            // console.log("result", result)
            // console.log(result)

            return result;


        }
        // CIRCLE and CIRCLE
        else if (this.type == ColliderType.CIRCLE && otherCollider.type == ColliderType.CIRCLE) {
            // See https://www.youtube.com/watch?v=87Bj4PtgzSc

            let radii = this.radius + otherCollider.radius;
            // use squared results cos faster
            let sqrDistance = VecMath.SqrDistance(this.position, otherCollider.position)
            if (sqrDistance < radii ** 2) {
                // lmao collision
                return true;
            }


        }

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


}

/**
 * Circle collider
 */
class CircleCollider extends Collider {
    type = ColliderType.CIRCLE
    radius = 0; // in game units
    shareRaius = true; // whether to share radius (using width/2) with parent game object
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
                oldGameObject.RemoveEventListener("positionChanged", thisObject.PositionChangeCallback)
            }

            if (newGameObject) {
                // Fire the callbacks once to update changes
                thisObject.WidthChangeCallback();
                thisObject.PositionChangeCallback();

                // add new listeners, changing game object
                newGameObject.AddEventListener("widthChanged", thisObject.WidthChangeCallback)
                newGameObject.AddEventListener("positionChanged", thisObject.PositionChangeCallback)
            }
        })
    }


    // define like this to preserve the this var
    WidthChangeCallback = () => {
        if (this.shareRaius) {
            let newWidth = this.gameObject.width;
            this.radius = newWidth / 2;
            // console.log("Updated collider radius to " + this.radius);
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

}