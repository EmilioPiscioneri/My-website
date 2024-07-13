var Point = PIXI.Point;
let near0 = 0.00048828125; // a value that is near 0, it's a power of 2 which computers like

/*
    GAME.JS
    VERSION 0.3 
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
 * This class represents a Node that has child nodes, parent nodes and so on.
 * All higher level parents are referred to as ancestors
 * All lower level children are referred to as descendants
 */
class GameNode extends EventSystem {
    children = [];


    _parent = null;
    // Readon-only value of node above this one
    get parent() {
        return this._parent;
    }

    constructor() {
        super();
    }

    /**
     * See snippet about overriding two functions that access each other
        class a{
            constructor(){
                
            }

            removeChild(i){
                console.log(i)
            }

            removeChildren(){
                for(let i =0; i<4; i++){
                    this.removeChild(i)
                }
            }
        }

        class b extends a {
            constructor(){
                super()
            }

            removeChild(i){
                console.log(i+2)
            }
        }

        var x = new b();
        x.removeChildren();

        // Output: 2 3 5 7
     */


    /**
     * @param {GameNode} childToAdd 
     */
    AddChild(childToAdd) {
        if (childToAdd.parent)
            throw new Error("Tried to add a child to node that already has a parent, perhaps its parent has already been added?")
        this.children.push(childToAdd);
        childToAdd._parent = this; // set new parent
        this.FireListener("childAdded", { child: childToAdd })
        childToAdd.FireListener("parentChanged")

        // Recursively fire the descendant added to all parents (ancestors) above the current node
        let ancestor = this.parent; // ancestor will change as each one gets iterated to it's own parent
        // keep going until ancestor is null
        while (ancestor) {
            ancestor.FireListener("descendantAdded", { descendant: childToAdd })
            ancestor = ancestor.parent; // go 1 layer higher
        }

    }

    AddChildren(childrenToAdd) {
        if (!Array.isArray(childrenToAdd))
            throw new Error("Passed children aren't an array")
        for (const gameObj of childrenToAdd) {
            this.AddChild(gameObj);
        }
    }

    /**
     * Removes a specified child from node
     * @param {GameNode} childToRemove 
     * @param {Boolean} callDestructor After node is removed, whether to call its destruct function
     * @param {Boolean} destructDescendants Whether to call child's descendants's Destruct methods after remove
     * @returns Whether the remove waas successfull or not
     */
    RemoveChild(childToRemove, callDestructor = true, destructDescendants = true) {
        // If child doesn't exist return false
        if (!this.ContainsChild(childToRemove)) {
            return false
        }
        // else return true after remove

        // remove from array
        this.children.splice(this.children.indexOf(childToRemove), 1)

        let oldParent = childToRemove.parent

        // Want the parent to be null before the child/descendant removed events are fired
        childToRemove._parent = null;
        this.FireListener("childRemoved", { child: childToRemove })
        childToRemove.FireListener("parentChanged")

        // clean it up
        if (callDestructor)
            childToRemove.Destruct(destructDescendants);


        // Recursively fire the descendant added to all parents (ancestors) above the current node
        let ancestor = oldParent; // ancestor will change as each one gets iterated to it's own parent
        // keep going until ancestor is null
        while (ancestor) {
            ancestor.FireListener("descendantRemoved", { descendant: childToRemove })
            ancestor = ancestor.parent; // go 1 layer higher
        }


        return true
    }

    /**
     * Removes an array of nodes from children 
     * @param {Array.<Node>} childrenToRemove 
     * @param {Boolean} callDestructor After node is removed, whether to call its destruct function
     * @param {Boolean} destructDescendants Whether to call child's descendants's Destruct methods after remove
     */
    RemoveChildren(childrenToRemove, callDestructor = true, destructDescendants = true) {
        if (!Array.isArray(childrenToRemove))
            throw new Error("Passed children aren't an array")
        for (const node of childrenToRemove) {
            this.RemoveChild(node, callDestructor, destructDescendants);
        }
    }

    /**
     * If node contains child node
     * @param {Node} nodeToFind 
     * @returns true if found, else false
     */
    ContainsChild(nodeToFind) {
        return (this.children.indexOf(nodeToFind) != -1)
    }

    /**
     * This is a function that is called for every iterated descendant. Passes in descendant as param
     * @callback DescendantFunction
     * @param {GameNode} descendant The currently iterated descendant
     */

    // count = 0
    /**
     * Iterates through a node's descendants 
     * @param {DescendantFunction} callbackPerDescendant function to call per each descendant. Passes in descendant as first param
     * @param {Boolean} includeSelf Whether to also run a function for the node itself
     */
    IterateDescendants(callbackPerDescendant, includeSelf = false) {
        // let cCount = this.count++
        // If node doesn't have children (rest of code has to do with descendants)
        if (this.children.length == 0) {
            // will get added later if it has children
            return;
        }

        // from now on child obj has children

        // -------

        // Recursively iterate through descendants and add stage objects if it finds one



        let childrenToIterate;
        let iterationIndexes;
        // If we want to include this node
        if (includeSelf) {
            childrenToIterate = [this]; // start from this node
            iterationIndexes = [0]; // you have to start at layer 0, index 0 
        } else {
            childrenToIterate = this.children; // start from children
            iterationIndexes = [0, 0]; // you have to start at layer 1, index 0 because you skip layer 0 (this node)
        }



        // this is an array where each index represents a layer of children. The value represents the index that was last check on that layer.
        // E.g. If my array is [0,1,3] then I know that my most recently checked item was at layer 2 and its index was 3,
        //      while the oldest item is at layer 0 and its index is 0.
        // This comes in handy for below because I am going to be going down a layer of children, check if there's children then keep adding to indexes array
        //  when there's no children, deal with the current value then if next index is it at end of array, go up a layer 

        // NGL, a stack data structure might've been ideal for this algorithm because I need to get the last index first (Last-in-First-out)
        // It's not needed tho plus this is javascript

        // console.log("iterating", childrenToIterate)
        let finishedIterating = false;

        while (!finishedIterating) {
            let descendantIndex = iterationIndexes[iterationIndexes.length - 1]; // get the top layer
            let iteratedDescendant = childrenToIterate[descendantIndex]
            // console.log("--------")
            // console.log("iterationIndexes", iterationIndexes, "iterating length", childrenToIterate.length, "descendantIndex", descendantIndex, "count", cCount,)
            // console.log("iteratedDescendant", iteratedDescendant)

            // console.log("iterationIndexes", iterationIndexes)
            // console.log("iteratedDescendant", iteratedDescendant.name)

            // call the callback with iterated one
            callbackPerDescendant(iteratedDescendant);

            // does it have children?
            if (iteratedDescendant.children.length != 0) {
                // then keep going down layers
                iterationIndexes.push(0); // add zero to end of array which adds a new layer and it starts the new layer at index 0
                childrenToIterate = iteratedDescendant.children; // set children to iterate to new children

            } else { // doesn't have children

                // The new index that the top layer's value was set to 
                // Move up index for this layer by 1, the ++x increments and returns the new value btw (for my sake)
                let newIndex = ++iterationIndexes[iterationIndexes.length - 1];
                // this will keep going up each layer inside while loop. Needs to be initialised first
                // we need this variable because in order to go up the layers, we need to a node which is constantly moving up
                let parentOfChildrenToIterate;

                // while the new value is outside of children array bounds. (Reached end of the current children to iterate array)
                while (newIndex == childrenToIterate.length) {
                    // go up one layer 
                    // However, we stop when the only layer to go up is the first starting child (only 1 value in array), this means we've come full circle
                    if (iterationIndexes.length - 1 != 1) {
                        // go up by one layer

                        // if not initialised
                        if (!parentOfChildrenToIterate)
                            parentOfChildrenToIterate = iteratedDescendant.parent.parent
                        else // else initialised, go up a layer continuously
                            parentOfChildrenToIterate = parentOfChildrenToIterate.parent

                        childrenToIterate = parentOfChildrenToIterate.children
                        // remove top layer from indexes
                        iterationIndexes.splice(iterationIndexes.length - 1, 1)
                        // increment the new top layer index
                        newIndex = ++iterationIndexes[iterationIndexes.length - 1]
                        // if (iteratedDescendant) {
                        //     console.log("parentOfChildrenToIterate", parentOfChildrenToIterate)
                        //     console.log("parentOfChildrenToIterate.children", parentOfChildrenToIterate.children)
                        // }

                    } else { // else, have iterated through all objects (reached end of first layer of children down from )
                        finishedIterating = true;
                        break; // escape 
                    }
                }
            }
        }
    }

    /** Deal with descendants and other items for garbage collector
    * @param {Boolean} [destructChildren] whether to recursively destruct a Node's children as well
    */
    Destruct(destructChildren = true) {
        super.Destruct()

        // recursively destruct this nodes children (if any)
        if (destructChildren) {
            for (let child of this.children) {
                child.Destruct(destructChildren)
            }

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

// Returns how many times a characters appears in a string
function qtyCharInString(stringToCheck, charToMatch) {
    let qty = 0;
    for (const character of stringToCheck) {
        if (character == charToMatch)
            qty++;
    }
    return qty; // return result gang 
}

// main class, I included the subclasses in the same file because it is easier 
class Game extends EventSystem {
    pixiApplication = new PIXI.Application();
    graphicsContainer = null; // a div where graphics go 
    // defaultBackgroundColor = "#4f4f4f"
    ticker; // a PIXI ticker object that is for this game obvject
    globalPhysicsEnabled = true; // Maybe you don't want physics idk
    // gravitational acceleration constant in game units/second (only on y)
    // Earth has roughly 9.8 m/s^2. I try to set the default to a value that kind of emulates real behaviour
    gravity = 98; // 
    gravityScale = 1; // how much force gravity will apply to objects (lower is less pull and higher is more pull)
    drag = 0.125; // opposing force on velocity of object in game units/sec 
    _pixelsPerUnit = new PIXI.Point(50, 50); // each game unit is a certain amount of pixels in x and y 
    initialised = false; // whether the pixi application has been initialised

    preventContextMenu = false; // whether or not to prevent the context menu from showing up on right click of canvas

    // each game unit is a certain amount of pixels in x and y 
    get pixelsPerUnit() { return this._pixelsPerUnit };
    set pixelsPerUnit(newValue) {
        this._pixelsPerUnit = newValue;
        this.FireListener("pixelsPerUnitChanged")
    }

    _backgroundColor = "#353535"
    get backgroundColor() { return this._backgroundColor }
    set backgroundColor(newColor) {
        this._backgroundColor = newColor;
        if (this.initialised)
            this.pixiApplication.renderer.background.color = newColor
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

    _activeScene = null;
    get activeScene() {
        return this._activeScene;
    }
    set activeScene(newScene) {
        // let oldScene = this._activeScene;
        this._activeScene = newScene;

        // Handle change of scene

        // remove all old stage objects
        // https://pixijs.download/v8.1.5/docs/scene.Container.html#removeChildren
        // this.pixiApplication.stage.removeChildren(0)

        // if new active scene is not null
        if (!newScene)
            return;

        // add new stage objects
        for (let stageObject of newScene.stageObjects) {
            this.pixiApplication.stage.addChild(stageObject)
        }

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
    HandlePointerMove = (pointerEvent) => {
        // console.log(event)
        let canvasBounds = this.pixiApplication.canvas.getBoundingClientRect();

        let pointerPos = this.ConvertRawPixelsToUnits(new Point(pointerEvent.clientX - canvasBounds.x, pointerEvent.clientY - canvasBounds.y)); // convert to vectior that is cartesian and uses game units  
        this.pointerPos = pointerPos

        this.FireListener("pointerMove", pointerEvent); // fire event
    }

    // pointer events
    HandlePointerUp = (pointerEvent) => {
        this.FireListener("pointerUp", pointerEvent)
    }
    HandlePointerDown = (pointerEvent) => {
        this.FireListener("pointerDown", pointerEvent)
    }

    HandleContextMenu = (event) => {
        if (this.preventContextMenu)
            event.preventDefault()
    }

    Initialise(graphicsContainer) {
        this.graphicsContainer = graphicsContainer;

        // return a promise because this function needs to be asynchronous due to PIXI needing to be async
        return new Promise((resolve, reject) => {
            // initialise the graphics object (is done asynchronously)
            this.pixiApplication.init({
                background: this._backgroundColor,
                resizeTo: graphicsContainer,
                antialias: true, // make graphics not look so bad
            }).then(() => {
                // now add the canvas to html
                graphicsContainer.appendChild(this.pixiApplication.canvas)
                // graphicsContainer.onkeydown = this.OnKeyDown;
                this.ticker.add(this.OnTick); // attach to ticker event system
                this.pixiApplication.canvas.addEventListener("pointermove", this.HandlePointerMove)
                this.pixiApplication.canvas.addEventListener("pointerdown", this.HandlePointerDown)
                this.pixiApplication.canvas.addEventListener("pointerup", this.HandlePointerUp)
                this.pixiApplication.canvas.addEventListener("contextmenu", this.HandleContextMenu)
                graphicsContainer.addEventListener("keydown", this.HandleKeyDown)
                graphicsContainer.addEventListener("keyup", this.HandleKeyUp)
                this.initialised = true;


                resolve(); // resolve the game promise
            }).catch((reason) => {
                reject(reason)
            })


        })
    }


    // handle key events on canvas
    HandleKeyDown = (eventData) => {
        eventData.preventDefault();
        this.FireListener("keyDown", eventData)
    }

    HandleKeyUp = (eventData) => {
        eventData.preventDefault();
        this.FireListener("keyUp", eventData)
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

    // Updates game physics on tick
    PhysicsTickUpdate() {
        // don't continue when paused
        if (this.paused)
            return;

        // Then, calculate all collision updates

        // See Excluding same and repeated pairs theory as to how I avoid repeating the same game objects twice
        // in collision loops 
        // Aso see Exclude same & pairs for nodes theory for how I dealt with the optimisation once node were added

        // scene with game objects to loop thru
        let activeScene = this.activeScene;

        // make sure we have an actual scene rn
        if (!activeScene) {
            console.warn("Physics tick couldn't run, no active scene set")
            return;
        }

        // loop through stageObjects (stage objects have .parentGameObject value) once
        let stageObjectsTotal = activeScene.stageObjects.length;



        for (let firstGameObjIndex = 0; firstGameObjIndex < stageObjectsTotal - 1; firstGameObjIndex++) {
            let stageObj1 = activeScene.stageObjects[firstGameObjIndex]
            let firstGameObj = activeScene.stageObjects[firstGameObjIndex].parentGameObject; // get game obj from stage obj
            // Don't do anything if this object is static. There is nothing to change on this object
            if (firstGameObj.static)
                continue;

            if (!firstGameObj)
                throw new Error("first game obj null")


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
                for (let secondGameObjIndex = firstGameObjIndex + 1; secondGameObjIndex < stageObjectsTotal; secondGameObjIndex++) {
                    let stageObj2 = activeScene.stageObjects[secondGameObjIndex]
                    let secondGameObj = activeScene.stageObjects[secondGameObjIndex].parentGameObject; // get game obj from stage obj
                    if (!secondGameObj)
                        throw new Error("second game obj null")

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

        // check should interact with physics
        if (!gameObj.physicsEnabled)
            return;

        // Don't need to move if static, can't have velocity
        if (gameObj.static)
            return;

        if (gameObj.name) {
            // console.log("looping", gameObj.name)
        }



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

// #region Scene class

class Scene extends GameNode {
    // Array of stage objects that should be added to a PIXI stage whenever this stage is set as activeStage
    // this is seperate to the .children member of scene which contains GameObject's only and not its descendants.
    // Think of it like a queue for PIXI stageObjects to render when ready (Game.activeStage == this)
    // DON'T ADD OR REMOVE FROM ARRAY. Use the add and remove stage child functions instead :>
    stageObjects = [];
    isScene = true;
    game;

    constructor(game) {
        super();
        this.game = game;
    }

    /**
     * Adds stage object to scene, displays if scene is active
     * @param {*} stageObject 
     */
    AddStageObject(stageObject) {
        if (!stageObject) {
            console.warn("Tried to add a null stage object to scene")
            return
        }

        if (this.StageObjectExists(stageObject)) {
            console.warn("Tried to add stage object that already exists")
            return
        }

        this.stageObjects.push(stageObject)

        // If this scene is the active scene
        if (this.game.activeScene == this) {
            // add to PIXI stage
            this.game.pixiApplication.stage.addChild(stageObject)
        } // else, it gets added whenever the active scene is set


        this.FireListener("stageObjectAdded", { stageObject: stageObject })
        // console.log("added stage object", stageObject.name)
    }

    RemoveStageObject(stageObject) {
        if (this.StageObjectExists(stageObject)) {
            // remove from array
            this.stageObjects.splice(this.stageObjects.indexOf(stageObject), 1)

            // If this scene is the active scene
            if (this.game.activeScene == this) {
                // remove from PIXI stage
                this.game.pixiApplication.stage.removeChild(stageObject)
            }

            this.FireListener("stageObjectRemoved", { stageObject: stageObject })
        }
    }

    // Whether stage object exists under Scene.stageObjects
    StageObjectExists(stageObject) {
        return (this.stageObjects.indexOf(stageObject) != -1)
    }

    /**
     * Adds GameObject child to scene and renders the child's and its descendant's stageObjects
     * @param {GameObject} child 
     */
    AddChild(child) {
        // overwriting GameNode func

        // don't do anything if not adding a game object to scene, maaybe this'll change idk
        if (!child.isGameObject) {
            console.warn("Tried to add a non GameObject child to scene")
            return;
        }
        // calls GameNode function first, note that this will fire child and descendant added events
        super.AddChild(child)

        // If child doesn't have children (rest of code has to do with descendants)
        if (child.children.length == 0) {
            child._SetCurrentScene(this) // adds stage obj to scene
            // will get added later if it has children
            return;
        }

        // from now on child obj has children

        // -------

        // Recursively iterate through descendants and add stage objects if it finds one

        // define as anonymous to preserve "this"
        let callbackPerDescendant = (iteratedDescendant) => {
            // set to this scene 
            iteratedDescendant._SetCurrentScene(this) // also adds stage obj to scene
        }

        child.IterateDescendants(callbackPerDescendant, true) // include node in loop

    }

    /**
     * Removes GameObject child from scene and unrenders the child's and its descendant's stageObjects
     * @param {GameObject} child 
     * @param {Boolean} callDestructor Whether to call child's Destruct method after remove
     * @param {Boolean} destructDescendants Whether to call child's descendants's Destruct methods after remove
     */
    RemoveChild(child, callDestructor = true, destructDescendants = true) {
        // overwriting GameNode func

        // calls GameNode function first, note that this will fire child and descendant removed events
        super.RemoveChild(child, false) // don't destruct now, do it later

        // If child doesn't have children (rest of code has to do with descendants)
        if (child.children.length == 0) {
            // remove stage obj for this child
            this.RemoveStageObject(child.stageObject)
            // set new scene
            child._SetCurrentScene(null)

            // will get removed later if it has children
        } else {

            // Else the child obj has children

            // -------

            // Recursively iterate through descendants and add remove objects if it finds one

            // define as anonymous to preserve "this"
            let callbackPerDescendant = (iteratedDescendant) => {
                // set to this scene 
                iteratedDescendant._SetCurrentScene(null) // also adds stage obj to scene
            }

            child.IterateDescendants(callbackPerDescendant, true) // include node in loop
        }

        // deal with removed child's destructor
        if (callDestructor) {
            child.Destruct(destructDescendants)
        }

    }


}

// #endregion

// #region GameObject Class

/**
 * Currently, it is something that is renderable
 */
class GameObject extends GameNode {
    _currentScene;
    // READ-ONLY value of the current scene that the GameObject is under (if any)
    get currentScene() {
        return this._currentScene;
    }


    // Only to be called by internal classes, do not touch
    _SetCurrentScene(newScene) {
        // set's the current scene and removes stage object from old scene
        let oldScene = this._currentScene;
        // TODO Move setter code here
        this._currentScene = newScene; // set to new scene

        // if has stage obj
        if (this.stageObject) {
            // Now remove current stage object from old scene and add to new one if the scenes aren't null
            if (oldScene)
                oldScene.RemoveStageObject(this.stageObject)
            if (newScene)
                newScene.AddStageObject(this.stageObject);
        }

    }


    _stageObject; // the actual graphics object of the game object
    get stageObject() {
        return this._stageObject;
    }
    set stageObject(newStageObject) {
        let oldStageObject = this._stageObject;


        // do nothing if current scene is null
        if (!this._currentScene) {
            // set new stage object
            this._stageObject = newStageObject;
            // set its parent
            newStageObject.parentGameObject = this
            return;
        }

        // check if current scene of game object is active scene

        // if is the active scene, add new stage object and remove old 
        if (this._currentScene && this._currentScene == this.game.activeScene) {
            // only remove if oldStageObject isn't null
            if (oldStageObject) {
                // remove from scene first because it will cause conflicts when iterating destructed stage objects
                this._currentScene.RemoveStageObject(oldStageObject)
                // destruct the old stage object 
                this.DestructStageObject();
            }
            // else
            //     console.warn("2")

            if (newStageObject) {
                // set new stage object's parent game obj value
                newStageObject.parentGameObject = this

                this._currentScene.AddStageObject(newStageObject);
            }
            else
                console.warn("2")
        }

        // set new stage object
        this._stageObject = newStageObject;
        if (newStageObject) {
            // after you add the stage object, update its pos and size if meant to so it renders correctly
            if (this.sharePosition)
                this.updateStageObjectPosition();
            if (this.shareSize) {
                this.width = newStageObject.width;
                this.height = newStageObject.height;
            }
        }

        this.FireListener("stageObjectChanged");
    }


    game; // the current game object
    isGameObject = true;
    _isVisible = true;
    get isVisible() {
        return this._isVisible;
    }
    set isVisible(newVisibility) {
        this._isVisible = newVisibility // set class variable
        this.stageObject.visible = newVisibility; // also set graphics visibility
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
            this.updateStageObjectPosition();

        this.FireListener("positionChanged") // fire changed event


        // newPosition.y = newPosition.y * -1 + game.pixiApplication.canvas.height; // inverse the y and make it bottom left (currently top left)
        // this.stageObject.position = newPosition; // set the new pos
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
        if (this.shareSize && this.stageObject) {
            this.stageObject.width = newWidth * this.game.pixelsPerUnit.x;// convert units to pixels
        }
        this.FireListener("widthChanged") // fire changed event
        // this.updateStageObjPosition();
    }
    _height = 0;
    get height() {
        return this._height
    }
    set height(newHeight) {
        this._height = newHeight;
        if (this.shareSize && this.stageObject) {
            this.stageObject.height = newHeight * this.game.pixelsPerUnit.y;// convert units to pixels
        }
        if (this.sharePosition)
            this.updateStageObjectPosition();
        this.FireListener("heightChanged") // fire changed event
    }

    // the alpha value of the object graphics
    get alpha() {
        if (this.stageObject)
            return this.stageObject.alpha
        else
            return null
    }
    set alpha(newAlpha) {
        if (this.stageObject)
            this.stageObject.alpha = newAlpha
    }

    /**
     * Creates a game object, make sure to add it to the game after creation
     * @param {Graphics} stageObject A PIXI JS graphics object which holds all the render data. Is automatically added to game stage
     * @param {Game} game The current game the object is under
     * @param {Boolean} sharePosition whether or not setting position of game object will affect graphics object
     * @param {Boolean} shareSize whether or not setting size (width and height) of game object will affect graphics object
     * 
     */
    constructor(game, stageObject, sharePosition = true, shareSize = true) {
        super(); // calls constructor for inherited object

        if (stageObject == null)
            throw new Error("Created a new game object with null stage object")
        if (game == null)
            throw new Error("Created a new game object with null game input")
        this.game = game;
        this.stageObject = stageObject;

        this.sharePosition = sharePosition;
        this.shareSize = shareSize;

        // -- initialise values --
        if (shareSize) {
            this.width = this.stageObject.width;
            this.height = this.stageObject.height;
        }


        // -- setup listeners --

        game.AddEventListener("pixelsPerUnitChanged", () => {
            // Fire all the setters of variables to just update them so they adhere to the new change visually
            this.width = this.width;
            this.height = this.height;
            this.position = this.position;

        }, this)

        // console.log("current pos is "+this.stageObject.position.x, +" " + this.stageObject.position.y)

        // intialising position doesn't work?
        // this.position = this.stageObject.position; // run through the set function

    }

    updateStageObjectPosition() {
        // only continue if shared pos true and stage object is not null
        if (!this.sharePosition || !this.stageObject)
            return;

        // clone to avoid conflicts
        let newPosition = new Point(this._position.x, this._position.y);
        let canvasHeight = game.pixiApplication.canvas.height / this.game.pixelsPerUnit.y; // convert from pixels to units

        newPosition.y = newPosition.y * -1 // inverse y
            + canvasHeight - this.height // convert to bottom-left (currently top left)

        // set the new pos, convert to pixel units first
        this.stageObject.position = this.game.ConvertUnitsToPixels(newPosition);

    }

    /**
     * Adds child to GameObject and if there is a scene, renders the child's and its descendant's stageObjects
     * @param {GameObject} child 
     */
    AddChild(child) {
        // overwriting GameNode func

        // don't do anything if not adding a game object to game object, maaybe this'll change idk
        if (!child.isGameObject) {
            console.warn("Tried to add a non GameObject child to a GameObject")
            return;
        }


        // calls GameNode function first, note that this will fire child and descendant added events

        // NOTE: calling the baseclass will change the parent which ends up adding the child to the scene, so skip it first
        super.AddChild(child)


        child._SetCurrentScene(this._currentScene) // set its scene as this one (might be null)

        // from now on there is a scene, this means we can add to its stage

        // If child doesn't have children do nothing (rest of code has to do with descendants)
        if (child.children.length == 0) {
            return;
        }

        // from now on child obj has children

        // -------

        // Recursively iterate through descendants and add stage objects if it finds one

        // define as anonymous to preserve "this"
        let callbackPerDescendant = (iteratedDescendant) => {
            // set to this scene 
            // console.log(iteratedDescendant)
            iteratedDescendant._SetCurrentScene(this._currentScene) // also adds stage obj to scene
        }

        child.IterateDescendants(callbackPerDescendant, false) // don't include node in loop

    }

    /**
     * Removes GameObject child from GameObject and unrenders the child's and its descendant's stageObjects
     * @param {GameObject} child 
     * @param {Boolean} callDestructor Whether to call child's Destruct method after remove
     * @param {Boolean} destructDescendants Whether to call child's descendants's Destruct methods after remove
     */
    RemoveChild(child, callDestructor = true, destructDescendants = true) {
        // overwriting GameNode func

        // calls GameNode function first, note that this will fire child and descendant removed events
        super.RemoveChild(child, false) // don't destruct now, do it later

        // from now on there is a scene, this means we can remove from its stage

        // If child doesn't have children (rest of code has to do with descendants)
        if (child.children.length == 0) {
            // add stage obj for this child
            this._currentScene.RemoveStageObject(child.stageObject)
            // will get removed later if it has children
        } else {
            // else the child obj has children



            // -------

            // Recursively iterate through descendants and add remove objects if it finds one

            // define as anonymous to preserve "this"
            let callbackPerDescendant = (iteratedDescendant) => {
                // set to this scene 
                iteratedDescendant._SetCurrentScene(null) // also adds stage obj to scene
            }

            child.IterateDescendants(callbackPerDescendant, true) // include node in loop
        }

        // deal with removed child's destructor
        if (callDestructor) {
            child.Destruct(destructDescendants)
        }


    }

    // sets ._stageObject to null, destructs the current .stageObject value if it isn't null 
    DestructStageObject() {
        // onytl do stuff if stage object isn't null
        if (!this.stageObject)
            return;

        //DEBUGGING
        if (this._currentScene && this._currentScene.StageObjectExists(this.stageObject))
            throw new Error("DESTRUCTING STAGE OBJECT THAT EXISTS IN SCENE")

        //  avoids circular references
        this.stageObject.parentGameObject = null;

        // if it has a destroy function, call it
        if (this.stageObject.destroy) {
            this.stageObject.destroy()
        }

        // set this stage object to null (avoids code trying to interface with the object which shouldn't be accessed anymore)
        this._stageObject = null
    }

    Destruct(destructDescendants = true) {
        // Called the inherited class's destruct class
        super.Destruct(destructDescendants);

        // Destroy the stage object
        this.DestructStageObject()
    }
}

// #endregion

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
    updateStageObjectPosition() {
        // clone to avoid conflicts
        let newPosition = new Point(this._position.x, this._position.y);
        let canvasHeight = game.pixiApplication.canvas.height / this.game.pixelsPerUnit.y; // convert from pixels to units

        newPosition.y = newPosition.y * -1 // inverse y
            + canvasHeight // Move to bottom. Because its a circle its x and y is middle of circle

        // set the new pos, convert to pixel units first
        this.stageObject.position = this.game.ConvertUnitsToPixels(newPosition);
    }

    isACircle = true;



    /**
     * 
     * @param {Number} x In game units
     * @param {Number} y In game units
     * @param {Number} radius 
     * @param {Game} game 
     */
    constructor(game, x, y, radius) {
        // Create the circle graphics object
        // let circleStageObject = new PIXI.Graphics()
        //     .circle(0, 0, radius)
        //     .fill("white"); // can just change color with tint

        let circleStageObject = new PIXI.Graphics(circleGraphicsContext)

        circleStageObject.width = radius * 2;
        circleStageObject.height = radius * 2;

        circleStageObject.interactive = true

        super(game, circleStageObject)

        // Initialise position
        this.x = x;
        this.y = y;


    }

}

/**
 * A UI element game object
 */
class UIElement extends GameObject {
    isUIElement = true;
    _position = new Point(0, 0);
    get position() {
        return this._position
    }
    set position(newPosition) {
        // if(this.name == "grid visibility"){
        //     console.log(";;;---///")
        //     console.log("name", this.name)
        //     console.log("Changing to units pos",newPosition.x,newPosition.y)
        //     console.log("Pre-pos (.x,.y)", this.backgroundGraphics.x, this.backgroundGraphics.y)
        //     console.log("Pre-pos (.position)", this.backgroundGraphics.position.x, this.backgroundGraphics.position.y)
        // }



        // console.log("Position changed on UI to", newPosition)
        if (!this.stageObject)
            return;
        this._position = new Point(newPosition.x, newPosition.y);
        let pixelPos = this.game.ConvertUnitsToRawPixels(newPosition)
        pixelPos.y -= this.stageObject.height;
        this.stageObject.position = pixelPos;
        this.FireListener("positionChanged") // fire changed event

        // if(this.name == "grid visibility"){
        //     console.log("Post-pos (.x,.y)", this.backgroundGraphics.x, this.backgroundGraphics.y)
        //     console.log("Post-pos (.position)", this.backgroundGraphics.position.x, this.backgroundGraphics.position.y)
        // }
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
     * @param {PIXI.Graphics} stageObject PIXI graphics object
     * @param {Game} game 
     */
    constructor(game, stageObject) {
        super(game, stageObject, false, false); // turn off share pos and size for now
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
    get textObject() { return this.stageObject }
    set textObject(newTextObject) {
        this.stageObject = newTextObject
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

        super(game, pixiTextObject, false, false); // turn off share pos and size

        // -- initialise values --
        this.position = this.stageObject.position;
        // the text object automatically jets width and height in pixels when created so adjustr
        this.width = this.stageObject.width / game.pixelsPerUnit.x;
        this.height = this.stageObject.height / game.pixelsPerUnit.y;
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
class TextContainer extends GameObject {
    // defaults
    textHorizontalAlignment = HorizontalAlignment.MIDDLE;
    textVerticalAlignment = VerticalAlignment.MIDDLE;

    // Fits the text container to the text size as it updates
    fitToText = true;

    // corresponding Game TEXT LABEL which holds PIXI text object
    textLabelObject;

    get text() { return this.textLabelObject.text }
    set text(newText) {
        this.textLabelObject.text = newText
        this.FitBackgroundToText();
        this.FireListener("textChanged")
    }

    get backgroundGraphics() { return this.stageObject }
    set backgroundGraphics(newVal) {
        this.stageObject = newVal
    }

    // keep old getter and setter but add new stuff
    get position() {
        return super.position;
    }
    set position(newPosition) {
        // if(this.name == "grid visibility"){
        //     console.log("~!~")
        //     console.log("name", this.name)
        //     console.log("Changing to units pos",newPosition.x,newPosition.y)
        //     console.log("Pre-pos (.x,.y)", this.backgroundGraphics.x, this.backgroundGraphics.y)
        //     console.log("Pre-pos (.position)", this.backgroundGraphics.position.x, this.backgroundGraphics.position.y)
        // }

        super.position = newPosition; // keep the set function for UI element
        // if(this.name == "grid visibility")
        //     console.log("Position changed on ",this.name," to", newPosition)
        // inject extra code

        // Update text pos
        this.UpdateTextPosition();

        // if(this.name == "grid visibility"){
        //     console.log("Post-pos (.x,.y)", this.backgroundGraphics.x, this.backgroundGraphics.y)
        //     console.log("Post-pos (.position)", this.backgroundGraphics.position.x, this.backgroundGraphics.position.y)
        // }

    }

    get zIndex() { return this.backgroundGraphics.zIndex }
    set zIndex(newVal) {
        // text should be 1 zindex above background
        this.backgroundGraphics.zIndex = newVal;
        this.textLabelObject.stageObject.zIndex = newVal + 1;
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
        this.UpdateTextPosition();
        this.RedrawBackground();
    };

    // whether background graphics is visible
    get isVisible() { if (this.stageObject) { return this.stageObject.visible } else return false }
    set isVisible(newVisibility) {
        if (this.stageObject)
            this.stageObject.visible = newVisibility;
    }



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
        let backgroundGraphics = new Graphics().rect(0, 0, 100, 100).fill("white")

        // start as share off because it tries to access functions that haven't been defined yet
        super(game, backgroundGraphics, false, false);



        // debugging
        // if(text == "Show grid")
        //     this["name"] = "grid visibility"

        // The background is static so set all those vars up
        this.static = true;
        this.interactive = true; // Just make all UI elements interactive
        this.shareSize = true // now turn it back on
        this.sharePosition = true;

        // Set object
        this.textLabelObject = textLabelObject;
        this.AddChild(this.textLabelObject);

        // Update width to based off text size + padding to start 

        this.width = textLabelObject.width + this.padding.left + this.padding.right;
        this.height = textLabelObject.height + this.padding.bottom + this.padding.top;

        // this.stageObject.height = (textLabelObject.height + this.padding.bottom + this.padding.top)*game.pixelsPerUnit.y

        // background is already redrawn when width and height r set
        // this.RedrawBackground(); // 


        // -- initialise values --
        // this.width = backgroundGraphics.width;
        // this.height = backgroundGraphics.height;
        this.position = backgroundGraphics.position;
        // this.position = new Point(0,0)
        // this.position = this.position;
        this.zIndex = backgroundGraphics.zIndex

        // console.log(this)

        // update text pos whenever it changes width or height, third value ensures every listener is destroyed properly

        // TURN THESE BACK ON

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
        // let showDebug = (this.name == "grid visibility");
        // if (showDebug) {
        //     console.log("_---")
        //     console.log("name", this.name)
        //     console.log("Pre-size", this.backgroundGraphics.width, this.backgroundGraphics.height)
        //     console.log("Pre-pos (.x,.y)", this.backgroundGraphics.x, this.backgroundGraphics.y)
        //     console.log("Pre-pos (.position)", this.backgroundGraphics.position.x, this.backgroundGraphics.position.y)
        // }

        // let oldX = this.backgroundGraphics.x;
        // let oldY = this.backgroundGraphics.y;
        // first clear the current visual
        this.backgroundGraphics.clear();
        // redraw rect and fill with size

        // console.log("Redrawing", this._width, this._height)
        let pixelWidth = this._width * this.game.pixelsPerUnit.x;
        let pixelHeight = this._height * this.game.pixelsPerUnit.y
        // if (showDebug) {
        //     console.log("Pixel size", pixelWidth, pixelHeight)
        // }


        this.backgroundGraphics
            .rect(0, 0, pixelWidth, pixelHeight)
            // .rect(0, -pixelHeight, pixelWidth, pixelHeight) // no need
            .fill(this._backgroundFill)

        // if has stroke, then process it
        if (this._backgroundStroke) {
            this.backgroundGraphics
                .stroke(this._backgroundStroke)
        }

        this.backgroundGraphics.scale = new PIXI.Point(1, 1); // For some reaosn the scale gets changed?? PIXI.JS must have a bug idk had me scratching my head

        this.backgroundGraphics.interactive = true; // set back to true
        // if (showDebug) {
        //     console.log("Post-size", this.backgroundGraphics.width, this.backgroundGraphics.height)
        //     console.log("Post-pos (.x,.y)", this.backgroundGraphics.x, this.backgroundGraphics.y)
        //     console.log("Post-pos (.position)", this.backgroundGraphics.position.x, this.backgroundGraphics.position.y)
        //     console.log(this.backgroundGraphics)
        // }

        // hacky fix 
        // this.backgroundGraphics.x = oldX;
        // this.backgroundGraphics.y = oldY;

        // After redrawn, update position of background
        // super.position = super.position


    }

    // fits background size to text size
    FitBackgroundToText = () => {
        // console.log("fitting to text")
        if (this.fitToText) {
            // console.log("here")
            this.width = this.textLabelObject.width + this.padding.left + this.padding.right;
            this.height = this.textLabelObject.height + this.padding.bottom + this.padding.top;
        }
    }



    Destruct() {
        super.Destruct();
        // destroy both objects is done in game remove object

        // remove all events
        for (const eventDataToDestroy of this.eventsToDestroy) {
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
        super(game, text, useBitmapText, textStyleOptions);

        // Just add interactivity
        this.backgroundGraphics.addEventListener("pointerdown", this.HandlePointerDown);
        this.backgroundGraphics.addEventListener("pointerup", this.HandlePointerUp);
        // the others are automatically destroyed through the third poarameter
        this.eventsToDestroy.push([this.backgroundGraphics, "pointerdown", this.HandlePointerDown])
        this.eventsToDestroy.push([this.backgroundGraphics, "pointerup", this.HandlePointerUp])
    }

    HandlePointerDown = (pointerEvent) => {
        this.FireListener("pointerDown", pointerEvent);
    }

    HandlePointerUp = (pointerEvent) => {
        this.FireListener("pointerUp", pointerEvent);
    }


}

/**
 * A TextInput game object with graphics already done for you. Doesn't support multiline for now
 */
class TextInput extends TextContainer {
    isInputFocused = false;
    caretObject; // the caret (the | which is used to navigate selected text)
    _caretPosition = -1;
    // the index of the caret. It starts at -1 (no character) and is representative of the selected character index
    get caretPosition() { return this._caretPosition }
    set caretPosition(newPos) {
        this._caretPosition = newPos
        this.UpdateCaret();
    }
    placeholderText;
    _displayingPlaceholderText = true;
    get displayingPlaceholderText() { return this._displayingPlaceholderText }
    set displayingPlaceholderText(newValue) {
        // let oldValue = this._displayingPlaceholderText
        this._displayingPlaceholderText = newValue;
        // set to display placeholder text 
        if (newValue) {
            this.text = this.placeholderText; // display on the text object only
            this.textLabelObject.textObject.style.fill = "grey"; // display grey for placeholder text
        }
        // no longer displaying placeholder text
        else {
            this.text = ""; // default to nothing
            this.textLabelObject.textObject.style.fill = "white"; // display normal color for normal text
        }
    }

    // make sure there are no new lines in the text when it changes.
    // You can admittedly get around this by changing the text on the text label object itself but it depends if u want ur code to work tbh
    get text() { return super.text }
    set text(newText) {
        // idc abt \\ escape characters because this may change in the future
        super.text = newText.replaceAll("\n", "")
        this.UpdateCaret();
    }

    /**
         * Create a new text input, the graphics are created for you (not added to game), you just need to set the different appearance options manually.
         * @param {Game} game 
         * @param {string} placeholderText Optional placeholder text for the text input
         * @param {boolean} [useBitmapText] Optional bool whether the text input text label should be a bitmap text object, choose if text changes a lot
         * @param {*} [textStyleOptions] Optional PIXI text style options object. See https://pixijs.download/v8.1.5/docs/text.TextOptions.html
         */
    constructor(game, placeholderText, useBitmapText = false, textStyleOptions = null) {

        placeholderText = placeholderText || "Enter text"
        // call constrcutor of base class
        super(game, "", useBitmapText, textStyleOptions);



        // Create the caret
        let caretGraphics = new Graphics()
            .rect(0, 0, 0.05, 1)
            .fill("white"); // white fill so u can use tint to change caret color for different contrast. Maybe match with text color idk

        let caretObject = new GameObject(game, caretGraphics, true, true);
        caretObject.physicsEnabled = false;

        caretObject.height = this.textLabelObject.fontSize / game.pixelsPerUnit.y;
        caretObject.position = this.position

        this.caretObject = caretObject;

        this.AddChild(this.caretObject);

        this.placeholderText = placeholderText;
        this.displayingPlaceholderText = true; // start as displaying
        // When it comes to focusing on the text input, you have to listen for clicks anywhere, check if it is in the input and then it is selected

        game.AddEventListener("keyDown", this.HandleKeyDown, this);
        this.textLabelObject.AddEventListener("positionChanged", this.UpdateCaret, this)
        this.AddEventListener("widthChanged", this.UpdateCaret, this)
        this.AddEventListener("heightChanged", this.UpdateCaret, this)
        this.textLabelObject.AddEventListener("fontSizeChanged", this.UpdateCaret, this)
        this.textLabelObject.AddEventListener("textChanged", this.UpdateCaret, this)
        this.backgroundGraphics.addEventListener("pointerdown", this.HandlePointerDownOnInput);
        this.backgroundGraphics.addEventListener("pointerup", this.HandlePointerUpOnInput);
        game.AddEventListener("tick", this.UpdateCaretVisibility, this) // run caret control every tick
        game.pixiApplication.canvas.addEventListener("pointerdown", this.HandlePointerDownOnCanvas);
        // the others are automatically destroyed through the third poarameter

        this.eventsToDestroy.push([this.backgroundGraphics, "pointerdown", this.HandlePointerDownOnInput])
        this.eventsToDestroy.push([this.backgroundGraphics, "pointerup", this.HandlePointerUpOnInput])
        this.eventsToDestroy.push([game.pixiApplication.canvas, "pointerdown", this.HandlePointerDownOnCanvas])
    }

    HandleKeyDown = (keyEvent) => {
        // If focused on input
        if (this.isInputFocused) {
            // process if the input is a valid key or like shift or control
            let keyBlacklist = ["Control", "Shift", "Alt", "Meta", "CapsLock", "ContextMenu", "Backspace",
                "Enter", "Escape", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Delete", "End", "PageDown", "PageUp", "Home", "Insert"]
            let key = keyEvent.key; // the key event
            if (keyBlacklist.includes(key)) {
                if (key == "Escape") {
                    this.UnfocusOnInput()
                } else if (key == "Backspace") {
                    this.HandleBackspace();
                }
                else if (key == "Delete") {
                    this.HandleDelete();
                }
                else if (key == "Enter") {
                    this.UnfocusOnInput();
                } else if (key == "ArrowLeft" || key == "ArrowRight" || key == "ArrowUp" || key == "ArrowDown") {
                    this.HandleArrowKey(key);
                }

            } else {
                // not on blacklist
                this.AddTextToInput(key)
            }



            // console.log(keyEvent)
        }
    }

    AddTextToInput(textToAdd) {
        // console.log(textToAdd, textToAdd.length)
        this.caretPosition += textToAdd.length;
        let newText = this.text.substring(0, this.caretPosition) + textToAdd + this.text.substring(this.caretPosition)
        this.text = newText
    }

    HandleArrowKey(key) {
        // I find case statements easier to look atsometimes

        // Idc if other arrow keys r pressed, basically make it so whena  key is pressed, the the caret pulse is always visible while moving
        this.timeSinceLastCaretUpdate = Date.now();
        this.caretObject.isVisible = true;

        switch (key) {
            case "ArrowLeft": {
                // if not at start
                if (this.caretPosition != -1)
                    this.caretPosition -= 1; // move left 1
                break;
            }
            case "ArrowRight": {
                // if not at end
                if (this.caretPosition != this.text.length - 1)
                    this.caretPosition += 1; // move right 1
                break
            }
            default:
                break;
        }

    }

    // Need to remove character
    HandleBackspace() {
        // TO DO handle backslash on "\\" removing the whole two lines

        // If the caret is at start of text, do nothing
        if (this.caretPosition == -1)
            return;

        // else, caret is not at start

        // substring is (startIndex to endIndex) but end is exclusive
        // caret position is equal to character index
        let newText = this.text.substring(0, this.caretPosition) + this.text.substring(this.caretPosition + 1) // start to character index - 1 combined with the char index + 1 to end
        this.text = newText
        // caret pos is now -= 1
        this.caretPosition -= 1
    }

    // Need to remove character but inverse
    HandleDelete() {
        // TO DO handle backslash on "\\" removing the whole two lines

        // If the caret is at end of text, do nothing
        if (this.caretPosition == this.text.length - 1)
            return;

        // else, caret is not at end

        // substring is (startIndex to endIndex) but end is exclusive. We still want the char that the caret is on
        // so we go from pos + 2 to end to get rid of the char
        // caret position is equal to character index
        let newText = this.text.substring(0, this.caretPosition + 1) + this.text.substring(this.caretPosition + 2)
        this.text = newText

        // caret pos is unchanged
    }

    HandlePointerDownOnCanvas = (pointerEvent) => {
        let pointerPos = game.pointerPos; // easier to just access this property

        // check if the input was hit 
        let testPos = pointerPos



        // PIXI.js contains point won't work so I'm just using other

        // If the input was clicked
        if (testPos.x >= this.x && testPos.x <= this.x + this.width
            &&
            testPos.y >= this.y && testPos.y <= this.y + this.height) {
            this.FocusOnInput(pointerPos);
        } else {
            this.UnfocusOnInput(pointerPos)
        }


        // this.FireListener("pointerDown", pointerEvent);
    }

    // Updates the caret to be at whatever position it's supposed to be
    UpdateCaret = () => {
        // console.log("Updating caret")
        // console.log(this)
        let textLabel = this.textLabelObject
        let textStartPos = this.textLabelObject.position; // bottom left of text
        this.caretObject.height = this.textLabelObject.fontSize / this.game.pixelsPerUnit.y;
        let newCaretPos = new Point(textStartPos.x, textStartPos.y); // avoid reference conflicts by cloning

        newCaretPos.y += (textLabel.height - this.caretObject.height) / 2; // centre it




        // if not at start of text (can leave how it is)
        if (this.caretPosition != -1) {
            // PIXI api to measure text size

            // do +1 because the second param  of substring is exclusive
            let textUpToCaret = this.text.substring(0, this.caretPosition + 1); // text from start to caret pos

            // width of all spaces combined in a text
            let spacesWidthInPixels = 0;
            let qtySpaces = 0;//qtyCharInString(textUpToCaret, " ") // how many spaces occur in text

            // The measure text function will only include spaces if there is a character in front of it. E.g. "   2" will result in a width but "    " will be 0

            // Go from the end of array until you find no spaces
            for (let charIndex = textUpToCaret.length - 1; charIndex > -1; charIndex--) {
                const iteratedChar = textUpToCaret[charIndex];
                if (iteratedChar != " ")
                    break; // end loop
                else
                    qtySpaces++; // increment
            }


            // if there is a space, have to work out how many there are because the measure text function doesn't include spaces
            if (qtySpaces != 0) {
                // from just a tiny test it looks like spaces are the width of a character like "a" in lowercase /2

                // So first we get width of a space in pixels
                let spaceSize = PIXI.BitmapFontManager.measureText("a", textLabel.textObject.style)
                let spaceWidth = (spaceSize.width * spaceSize.scale) / 2;

                spacesWidthInPixels = spaceWidth * qtySpaces
            }
            let textSize = PIXI.BitmapFontManager.measureText(textUpToCaret, textLabel.textObject.style)


            // console.log(textSize)
            // I have no idea why but you do with * scale, who put the scale in there why would they do that
            newCaretPos.x += (textSize.width * textSize.scale + spacesWidthInPixels) / this.game.pixelsPerUnit.x
        }

        this.caretObject.position = newCaretPos;
    }

    // updates caret visibility
    timeSinceLastCaretUpdate = Date.now();
    caretPulseInterval = 500; // After this many ms, the caret will either go invisible or visible
    UpdateCaretVisibility = () => {
        // if not focused just set to invisible
        if (!this.isInputFocused) {
            this.caretObject.isVisible = false;
        }
        else {
            // else the text input is focused

            // if enough time has passed
            if (Date.now() - this.timeSinceLastCaretUpdate >= this.caretPulseInterval) {
                // inverse the visibility
                this.caretObject.isVisible = !this.caretObject.isVisible

                // set up next update
                this.timeSinceLastCaretUpdate = Date.now();
            }




        }

    }

    HandlePointerDownOnInput = (pointerEvent) => {
        this.FireListener("pointerDown", pointerEvent);
    }

    HandlePointerUpOnInput = (pointerEvent) => {
        this.FireListener("pointerUp", pointerEvent);
    }

    FocusOnInput(pointerPos) {
        // console.log("focusing on input")
        // dont do anything if already focused
        if (this.isInputFocused)
            return;
        this.isInputFocused = true

        // setter handles it
        if (this.displayingPlaceholderText) {
            this.displayingPlaceholderText = false
        }

        this.FireListener("focused")
    }

    UnfocusOnInput(pointerPos) {
        // console.log("unfocusing on input")
        // dont do anything if already unfocused
        if (!this.isInputFocused)
            return;
        if (this.text == "")
            this.displayingPlaceholderText = true;
        this.isInputFocused = false;
        this.FireListener("unfocused")
        // this.text = this.placeholderText
    }

}

/**
 * A slider yeah
 */
class Slider extends UIElement {
    _step;
    // how many steps between min and max of slider 
    get step() { return this._step; }
    set step(newStep) {
        if (newStep > this.max) {
            // I'm going to throw error to teach lesson cos ill probably do dumb stuff and struggle to debug idk
            throw new Error("Tried to set step property of slider to more than max")
        } else if (newStep <= 0)
            throw new Error("Step must be greater than 0 smh my head")
        this._step = newStep;
        this.UpdateOtherObjects();
    }

    _min;
    // minimum value
    get min() { return this._min; }
    set min(newMin) {
        this._min = newMin;
        this.UpdateOtherObjects();
    }

    _max;
    // maximum value for slider
    get max() { return this._max; }
    set max(newMax) {
        this._max = newMax;
        this.UpdateOtherObjects();
    }

    _value;
    // the actual value of the slider
    get value() { return this._value; }
    set value(newValue) {
        // clamp the value to the min and max
        newValue = Clamp(newValue, this.min, this.max)
        this._value = newValue;
        this.UpdateOtherObjects();
        // console.log("Value updated to ", newValue)
        this.FireListener("valueChanged")
    }

    isSliderFocused

    slidingBall; // just a circle game object which is used to slide. Maybe I'll add support for sprites later idk.

    get backgroundGraphics() { return this.stageObject }
    set backgroundGraphics(newVal) {
        this.stageObject = newVal
    }

    // keep old getter and setter but add new stuff
    get position() {
        return super.position;
    }
    set position(newPosition) {
        super.position = newPosition; // keep the set function for UI element
        this.UpdateOtherObjects();
    }

    get zIndex() { return this.backgroundGraphics.zIndex }
    set zIndex(newVal) {
        // text should be 1 zindex above background
        this.backgroundGraphics.zIndex = newVal;
        this.slidingBall.stageObject.zIndex = newVal + 1;
    }

    // In order to do colors (including stroke) you're going to need to redraw the rect each time there's a change

    // when you set the stroke it'll update
    _backgroundStroke = {
        color: "#b2b2b2",
        width: 2
    };
    get backgroundStroke() { return this._backgroundStroke }
    set backgroundStroke(newStroke) {
        this._backgroundStroke = newStroke;
        this.RedrawBackground();
    }

    // when you set the fill it'll update
    _backgroundFill = "#efefef"
    get backgroundFill() { return this._backgroundFill }
    set backgroundFill(newFill) {
        this._backgroundFill = newFill;
        this.RedrawBackground();
    }


    _backgroundRadius = 0.25;
    // Radius in game units (x pixels per unit) that is how round the slider is 
    get backgroundRadius() { return this._backgroundRadius }
    set backgroundRadius(newRadius) {
        this._backgroundRadius = newRadius
        this.RedrawBackground();
    }

    // when you set the fill it'll update
    _slidingBallFill = "#0059b7"
    get slidingBallFill() { return this._slidingBallFill }
    set slidingBallFill(newFill) {
        this._slidingBallFill = newFill;
        this.slidingBall.stageObject.tint = newFill; // set the tint because the graphics object is se to white color and no stroke
    }


    // When width and height of btn changes, the background needs to be redrawn and the text needs to be repositioned
    get height() { return super.height };
    set height(newVal) {
        super.height = newVal;
        this.RedrawBackground();
        this.UpdateOtherObjects();
    };

    get width() { return super.width };
    set width(newVal) {
        super.width = newVal
        this.RedrawBackground();
        this.UpdateOtherObjects();
    };

    eventsToDestroy = []; // Has an array of arrays each with [objectSubscribedTo, eventName, eventListener]


    /**
     * Create a new slider, the graphics are created for you (not added to game), you just need to set the different appearance options manually.
     * @param {Game} game 
     * @param {Number} min Smallest number of slider 
     * @param {Number} max Largest number of slider
     * @param {Number} step How much to increment by from movement between min and max
     * @param {Number} value Starting value
     */
    constructor(game, min, max, step, value) {


        // create graphics, need to access the "this" variable which is after the super function and then I'll redraw the background graphics before render which won't be too costly
        let backgroundGraphics = new Graphics()

        super(game, backgroundGraphics);



        // create the circle that'll follow slider
        this.slidingBall = new Circle(game, 0, 0, 0.1);
        this.slidingBall.physicsEnabled = false;
        this.AddChild(this.slidingBall);



        // Just do a default
        this.width = 3;
        this.height = 0.25;

        this.RedrawBackground();
        this.UpdateOtherObjects(); // update sliding ball


        // -- initialise values --
        this.position = backgroundGraphics.position;
        this.zIndex = backgroundGraphics.zIndex
        this.slidingBallFill = this.slidingBallFill

        // events
        this.backgroundGraphics.addEventListener("pointerdown", this.HandlePointerDown);
        this.slidingBall.stageObject.addEventListener("pointerdown", this.HandlePointerDown);
        this.game.AddEventListener("pointerUp", this.HandlePointerUpOnCanvas, this)
        this.game.AddEventListener("pointerMove", this.HandlePointerMoveOnCanvas, this)
        // the others are automatically destroyed through the third poarameter
        this.eventsToDestroy.push([this.backgroundGraphics, "pointerdown", this.HandlePointerDown])
        this.eventsToDestroy.push([this.slidingBall.stageObject, "pointerdown", this.HandlePointerDown])

        this.min = min || 0
        this.max = max || 10;
        this.step = step || 0.5;
        this.value = value || min;
    }

    HandlePointerMoveOnCanvas = (pointerEvent) => {
        // skip if not focused
        if (!this.isSliderFocused)
            return;
        // else, focused
        // console.log("Pointer focused move")

        // if minimum is smaller than max
        if (this.min > this.max) {
            let oldMin = this.min;
            let oldMax = this.max;
            // Just flip em
            this.min = oldMax;
            this.max = oldMin;
        }
        // if min and max are equal
        else if (this.min == this.max) {
            this.value = this.max; // Just set it to the only value it can be
            this.UpdateOtherObjects(); // update circle
            return; // skip
        }

        // get mouse pos
        let pointerPos = this.game.pointerPos;

        // now depending on the x of the pointer (clamped to left and right side of slider) we can use this to get the value compared to min and max

        let sliderWidth = this.width; // used to determine the percentage of the slider that is selected

        let sliderLeft = this.x;
        let sliderRight = this.x + sliderWidth;

        // clamp the pointer x to left and right side (if you are far right of slider you will be max and vice versa for min)
        let pointerX = Clamp(pointerPos.x, sliderLeft, sliderRight);

        // Now calculate the pointerX along sliderWidth
        // first you have to move it to origin (- pos.x)
        pointerX -= sliderLeft;

        // a decimal representing how far along the slider (0 to 1) the x pos is
        let sliderProgress = pointerX / sliderWidth;

        // using this decimal we have to make it relative to min and max range
        let newValue = (this.max - this.min) * sliderProgress
        // console.log("newValue1",newValue)
        // ok we have a raw value but remember there's steps so if you have 0 to 1 with 0.25 steps then you can only progress the slider 0.25 forwards or backwards


        // round modulo up or down

        let valueModStep = newValue % this.step;
        if (valueModStep >= this.step / 2) {
            // console.log("+")
            newValue += this.step - valueModStep;
        } else {
            // console.log("-")
            newValue -= valueModStep;
        }
        // console.log("valueModStep", valueModStep)
        // console.log("newValue2",newValue)

        // you also bring the min back into the equation
        this.value = newValue + this.min;

    }

    HandlePointerDown = (pointerEvent) => {
        this.isSliderFocused = true;
        // just run the move func
        this.HandlePointerMoveOnCanvas(pointerEvent)
        // console.log("slider focused")
    }

    HandlePointerUpOnCanvas = () => {
        this.isSliderFocused = false;
        // console.log("slider unfocused")
    }

    /**
     * Updates the position of other game objects tied to slider
     * Need to define function as anonymous ()=>{} this to preserve the "this" variable
     */
    UpdateOtherObjects = () => {
        let sliderDiameter = this.height * 1.5; // everywhere the sliders are usually bigger than the actual slider itself 
        // share height
        this.slidingBall.height = sliderDiameter;
        // circle maintains a width:height ratio of 1:1
        this.slidingBall.width = sliderDiameter;

        // centre ball
        this.slidingBall.y = this.y + this.height / 2;
        // Make x set to the value with respect to min, max etc.

        // set value to origin (value-min) and then get it as a decimal (divide) out of range (max-min)
        let factor = ((this.value - this.min) / (this.max - this.min))

        // console.log("this.value",this.value)
        // console.log("this.min",this.min)
        // console.log("this.max",this.max)

        // Then you times that deimcal by width to get the distance in pixels and then introduce the x back into it so it's not just relative to origin of x
        this.slidingBall.x = this.x + factor * this.width

        // console.log(factor)

    }

    RedrawBackground() {
        // first clear the current visual
        this.backgroundGraphics.clear();
        // redraw rect and fill with size

        let pixelWidth = this._width * this.game.pixelsPerUnit.x;
        let pixelHeight = this._height * this.game.pixelsPerUnit.y


        this.backgroundGraphics
            .roundRect(0, -pixelHeight, pixelWidth, pixelHeight, this.backgroundRadius * this.game.pixelsPerUnit.x)
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



    Destruct() {
        super.Destruct();
        // destroy both objects is done in game remove object

        // remove all events
        for (const eventDataToDestroy of this.eventsToDestroy) {
            eventDataToDestroy[0].removeEventListener(eventDataToDestroy[1], eventDataToDestroy[2])
        }
    }
}

/**
 * ENUM class, represents the direction of positioned items for object layouts.
 */
class LayoutOrientation {
    static VerticalDown = 1;
    static VerticalUp = 2;
    static HorizontalLeft = 3;
    static HorizontalRight = 4;

}

/**
 * Object Layout contains a background rect which will contain different game objects and order them in a horizontal or vertical way 
 * It wil keep all content relative to the layout's position and then will fit to the combined size of the object's uinder it 
 * The background rect is changable through the stroke and fill properties
 * Change objecys under the layout through the add and remove GameObject functions. If you don't the layout won't updaye accordingly
 */
class GameObjectLayout extends GameObject {

    // the orientation of layout relative to it's position point
    _layoutOrientation;
    get layoutOrientation() {
        return this._layoutOrientation;
    }
    set layoutOrientation(newOrientation) {
        if (newOrientation < 1 || newOrientation > 4) {
            console.warn("Tried to set layout orientation to an invalid value, defaulted to vertical down")
            newOrientation = LayoutOrientation.VerticalDown
        }
        this._layoutOrientation = newOrientation;
        // redraw and re position elements on orientation change
        this.RedrawBackground();
        this.CalculateObjectPositions() // update

    }

    // In Game units, dependant on vertical or horizontal layout
    spaceBetweenObjects = 0.25;

    get backgroundGraphics() { return this.stageObject }
    set backgroundGraphics(newObject) { this.stageObject = newObject }

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




    // When width and height of layout changes, the background needs to be redrawn and the text needs to be repositioned
    get height() { return super.height };
    set height(newVal) {
        super.height = newVal;
        this.RedrawBackground();
    };

    get width() { return super.width };
    set width(newVal) {
        super.width = newVal
        this.RedrawBackground();
    };

    _margin = new Padding(0.25, 0.25, 0.25, 0.25)
    // _margin = new Padding(0.5, 0.5, 0.5, 0.5)

    // The margin is the space in game units between inner content and outer background graphics
    get margin() { return this._margin }
    set margin(newMargin) {
        this._margin = newMargin
        this.CalculateObjectPositions() // update the new positions of managed objects wihc then calls other funcs
    }

    get position() { return super.position }
    set position(newPos) {
        super.position = newPos
        this.CalculateObjectPositions() // update
    }

    get zIndex() { return this.backgroundGraphics.zIndex }
    set zIndex(newVal) {
        // text should be 1 zindex above background
        this.backgroundGraphics.zIndex = newVal;

    }


    /**
     * Creates a game object, make sure to add it to the game after creation
     * @param {Game} game The current game the object is under
     * @param {number} [orientation] Optional, the initial orientation of the layout's content
     * 
     */
    constructor(game, orientation = LayoutOrientation.VerticalDown) {
        // create graphics, need to access the "this" variable which is after the super function and then I'll redraw the background graphics before render which won't be too costly
        let backgroundGraphics = new Graphics()
            .rect(0, 0, 100, 100)
            .fill("white") // need to fill to update size?

        // console.log(backgroundGraphics.width,backgroundGraphics.height)
        super(game, backgroundGraphics)

        // The background is static so set all those vars up
        this.static = true;
        this.interactive = true; // Just make all UI elements interactive
        // this.shareSize = true // now turn it back on
        // this.sharePosition = true;


        this.layoutOrientation = orientation; // set

        // redraw the background now you have access to "this"
        this.RedrawBackground();


    }

    // updates the z index of all objects
    UpdateObjectsZIndex() {
        let layoutzIndex = this.zIndex;

        for (let objIndex = 0; objIndex < this.children.length; objIndex++) {
            let gameObj = this.children[objIndex]
            // gameObj.stageObject.zIndex = newVal + objIndex + 1; // + 1 to make it 1 based indexing
            gameObj.stageObject.zIndex = layoutzIndex + 1; // jsut make it 1 higher than layout background
        }

    }


    // Call this whenever you need to recalcaulate the positions of the objects underneath the layout
    // calls fit layout after
    CalculateObjectPositions = () => {
        let totalObjects = this.children.length;

        // Vertical down positioning

        // going to have a start pos. One axis will be static while the other one will change with each iterated object
        // This will change as objects are iterated
        let startPos = new Point(this.position.x, this.position.y);

        // modify start pos depending on orientation
        if (this.layoutOrientation == LayoutOrientation.VerticalDown) {
            startPos.x += this.margin.left;
            startPos.y -= this.margin.top
        } else if (this.layoutOrientation == LayoutOrientation.VerticalUp || this.layoutOrientation == LayoutOrientation.HorizontalRight) {
            startPos.x += this.margin.left;
            startPos.y += this.margin.bottom
        } else if (this.layoutOrientation == LayoutOrientation.HorizontalLeft) {
            startPos.x -= this.margin.right;
            startPos.y += this.margin.bottom
        }



        // loop thru managed objects and change position according to previous ones
        for (let objIndex = 0; objIndex < totalObjects; objIndex++) {
            let iteratedObj = this.children[objIndex]



            if (!iteratedObj) {
                // an iterated obj is invalid, just ignore
                console.warn("Found invalid object under layout childrens:", this.children)
                continue;
            }

            // set position of current object and change the startPos 

            if (this.layoutOrientation == LayoutOrientation.VerticalDown) {
                // Move down on vertical and set the object to new pos. Do this because the .position of the iterated opbject starts at bottom-left and
                // the start pos is currently at the top-left of the object
                startPos.y -= iteratedObj.height

                iteratedObj.position = startPos;

                // setup next iteration
                startPos.y -= this.spaceBetweenObjects;
            } else if (this.layoutOrientation == LayoutOrientation.VerticalUp) {
                // start pos is currently at bottom-left of object
                iteratedObj.position = startPos;

                // setup next iteration by moving by vertical space the object takes up (height) added with padding
                startPos.y += iteratedObj.height + this.spaceBetweenObjects;
            } else if (this.layoutOrientation == LayoutOrientation.HorizontalLeft) {
                // start pos is at bottom-right, correct
                startPos.x -= iteratedObj.width

                iteratedObj.position = startPos;

                // move left by spacing
                startPos.x -= this.spaceBetweenObjects;


            } else if (this.layoutOrientation == LayoutOrientation.HorizontalRight) {
                // start pos is at bottom-left
                iteratedObj.position = startPos;

                // move right by width + spacing
                startPos.x += iteratedObj.width + this.spaceBetweenObjects;
            }


        }

        this.FitLayoutToObjects();
    }

    // gets the size of inner content
    GetManagedSize = () => {
        // if no objects under layout just return nothing
        if (this.children.length == 0)
            return new Point()


        let xSize = 0;
        let ySize = 0;
        // for vertical orientations
        if (this.layoutOrientation == LayoutOrientation.VerticalDown || this.layoutOrientation == LayoutOrientation.VerticalUp) {
            // for x just get largest width
            xSize = this.children[0].width
            for (const obj of this.children) {
                if (obj.width > xSize)
                    xSize = obj.width
            }

            // for y it is the sum of all heights + space between objects *objects length-1
            let totalHeight = 0;
            for (const obj of this.children) {
                totalHeight += obj.height
            }

            ySize = totalHeight + this.spaceBetweenObjects * (this.children.length - 1)

        } else { // horizontal orientations
            // for x it is the sum of all widths + space between objects *objects length-1
            let totalWidth = 0;
            for (const obj of this.children) {
                totalWidth += obj.width
            }
            xSize = totalWidth + this.spaceBetweenObjects * (this.children.length - 1)

            // for y just get largest height
            ySize = this.children[0].height
            for (const obj of this.children) {
                if (obj.height > ySize)
                    ySize = obj.height
            }


        }




        // console.log(this.ManagedObjects.length)
        // console.log(this.spaceBetweenObjects * (this.ManagedObjects.length - 1))

        // return size as point
        return new Point(xSize, ySize)


    }

    // calls redraw background after
    FitLayoutToObjects = () => {

        // Calculate bounds of objects, I decided to do it in this function because it is just easier
        let innerSize = this.GetManagedSize()
        // console.log("innerSize", innerSize)

        // let newWidth = this.margin.left + innerSize.width + this.margin.right;
        // let newHeight = this.margin.bottom + innerSize.height + this.margin.top;

        this.width = this.margin.left + innerSize.x + this.margin.right;
        this.height = this.margin.bottom + innerSize.y + this.margin.top;
    }


    /**
     * Gets whether or not the layout contains the point inclusive of all objects underneath and layout edges
     * @param {PIXI.Point} pointToCheck The point to check in the bounds of 
     * @returns {Boolean} Whether or not the layout contains the point
     */
    ContainsPoint(pointToCheck) {
        // console.log("pointToCheck",pointToCheck)

        // let layoutBounds = {
        //     left: this.x,
        //     right: this.x + this.width,
        //     bottom: this.y,
        //     top: this.y+this.height
        // }

        let layoutBounds;

        if (this.layoutOrientation == LayoutOrientation.VerticalDown) {
            layoutBounds = {
                left: this.x,
                right: this.x + this.width,
                // bottom and top is shifted down by height
                bottom: this.y - this.height,
                top: this.y
            }
        } else if (this.layoutOrientation == LayoutOrientation.VerticalUp || this.layoutOrientation == LayoutOrientation.HorizontalRight) {
            layoutBounds = {
                left: this.x,
                right: this.x + this.width,
                // bottom and top is shifted down by height
                bottom: this.y,
                top: this.y + this.height
            }
        } else if (this.layoutOrientation == LayoutOrientation.HorizontalLeft) {
            layoutBounds = {
                left: this.x - this.width,
                right: this.x,
                // bottom and top is shifted down by height
                bottom: this.y,
                top: this.y + this.height
            }
        }




        return (
            // in between x bounds
            // this.left <= point.x <= this.right
            layoutBounds.left <= pointToCheck.x && pointToCheck.x <= layoutBounds.right
            // and in between y bounds
            // this.bottom <= point.y <= this.top
            && layoutBounds.bottom <= pointToCheck.y && pointToCheck.y <= layoutBounds.top)

    }

    // Redraw the background graphic
    RedrawBackground() {
        // console.log("redrawing background")
        this.backgroundGraphics.clear();
        // redraw rect and fill with size

        let pixelWidth = this._width * this.game.pixelsPerUnit.x;
        let pixelHeight = this._height * this.game.pixelsPerUnit.y

        // vertical up
        // this.backgroundGraphics
        //     .rect(0, -pixelHeight, pixelWidth, pixelHeight)
        //     .fill(this._backgroundFill)

        // this is the position of the graphics object in pixels for the redrawn object
        let graphicsXPos = 0;
        let graphicsYPos = 0;

        if (this.layoutOrientation == LayoutOrientation.VerticalDown) {
            // the y moves down (pixi draws it upwards so we go down to counteract this).
            // To move down with pixi you go positive in y direction
            graphicsYPos += pixelHeight
        }
        // else if(this.layoutOrientation == LayoutOrientation.VerticalUp){
        //     // 0,0 is start pos no change
        // } 
        else if (this.layoutOrientation == LayoutOrientation.HorizontalLeft) {
            graphicsXPos -= pixelWidth

        }
        // else if (this.layoutOrientation == LayoutOrientation.HorizontalRight) {
        // 0,0 no change
        // }

        // vertical down
        this.backgroundGraphics
            .rect(graphicsXPos, graphicsYPos, pixelWidth, pixelHeight)
            .fill(this._backgroundFill)

        // if has stroke, then process it
        if (this._backgroundStroke) {
            this.backgroundGraphics
                .stroke(this._backgroundStroke)
        }

        this.backgroundGraphics.scale = new PIXI.Point(1, 1); // For some reason the scale gets changed?? PIXI.JS must have a bug idk had me scratching my head

        this.backgroundGraphics.interactive = true; // set back to true
    }

    /**
     * add object to layout
     * @param {GameObject} objectToAdd self explanatory
     */
    AddChild(objectToAdd, addToGame = true) {
        super.AddChild(objectToAdd)

        //on change make sure content fits accordingly
        objectToAdd.AddEventListener("widthChanged", this.CalculateObjectPositions, this) // make sure content fits
        objectToAdd.AddEventListener("heightChanged", this.CalculateObjectPositions, this) // when height changes, so does the positions of each object

        //update 
        this.CalculateObjectPositions()
        this.UpdateObjectsZIndex();
    }

    // remove object from layout
    RemoveChild(objectToRemove) {
        super.RemoveChild(objectToRemove)
        // For vertical down
        objectToAdd.RemoveEventListener("widthChanged", this.CalculateObjectPositions)
        objectToAdd.RemoveEventListener("heightChanged", this.CalculateObjectPositions)
    }

    Destruct() {
        // call the parent obj destruct func
        super.Destruct()

        // 
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