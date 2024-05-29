const Point = PIXI.Point;


// main class, I included the subclasses in the same file because it is easier 
class Game {
    pixiApplication = new PIXI.Application();
    graphicsContainer = null; // a div where graphics go 
    defaultBackgroundColour = "#4f4f4f"
    // gameObjects = []; // an array of game objects 
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
        if (this.globalPhysicsEnabled)
            this.PhysicsTickUpdate();
    }

    // adds an object to the render canvas (makes it visible)
    AddGraphicsObject(objectToAdd) {
        // this.gameObjects.push(objectToAdd);


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


        this.pixiApplication.stage.addChild(objectToAdd)
    }

    // removes an object from the render canvas (makes it invisible)

    RemoveGraphicsObject(objectToRemove) {
        if (this.DoesGraphicsObjectExist(objectToRemove))
            this.pixiApplication.stage.removeChild(objectToAdd)

    }

    DoesGraphicsObjectExist(objectToFind) {
        return (this.pixiApplication.stage.getChildAt(objectToFind) != null)

    }

    // Updates game physics on tick
    PhysicsTickUpdate() {
        let gameStage = this.pixiApplication.stage; // contains all the rendered children
        // loop through all the children and see if they're physics enabled
        for (const graphicsObj of gameStage.children) {
            console.log(graphicsObj.y )

            // check valid
            if (!graphicsObj["gameData"]) {
                console.log("Added graphics object doesn't have game data:", graphicsObj)
                continue;
            }

            let physicsData = graphicsObj.gameData.physics;

            // check should interact with physics
            if (!physicsData.enabled)
                continue;

            // the position is relative to parent so I'll just make it so only parent can move for now
            if (graphicsObj.parent != gameStage)
                continue;


            // --- apply physics ---

            // seconds since last frame, ik division is slower but it's insignificant
            let deltaSec = this.ticker.deltaMS / 1000;            

            // -- applying velocity --

            // in units/sec
            let velocity = physicsData.velocity;


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
            // Basically oppose velocity by drag factor (-k*v) and then lower it more by the gravity constant (- g)

            // Due to negative being up in renderer, you just invert the y value 

            let yGravity = this.gravity * this.gravityScale
            let yAcceleration = (-this.drag * -velocity.y) - yGravity


            // apply acceleration changes to velocity (times by deltaSec to get change since last frame)
            velocity.x += xAcceleration * deltaSec
            velocity.y -= yAcceleration * deltaSec // minus the acceleration because negative is up
            // pixelVelocity.y *= -1

            // console.log(velocity.y)
            // unflip the y value

            // times velocity by deltaSex (time) to get change since last frame and also convert units to pixels as object position is in pixels
            graphicsObj.x += deltaSec * (velocity.x * this.pixelsPerUnit.x)
            graphicsObj.y += deltaSec * (velocity.y * this.pixelsPerUnit.y)

            // -- Applying border collision --

            // console.log(gameStage)
            let screenWidth = this.pixiApplication.canvas.width 
            let screenHeight = this.pixiApplication.canvas.height;


            // if on left-side of border
            if(graphicsObj.x < 0)
                {
                graphicsObj.x = 0; // push-out
                velocity.x *= -1 // bounce
            }
            else if(graphicsObj.x+ graphicsObj.width > screenWidth) // if on right-side of border
            {
                
                graphicsObj.x = screenWidth-graphicsObj.width// push-out
                velocity.x *= -1 // bounce
            }

            // if above border
            if(graphicsObj.y < 0)
                {
                graphicsObj.y = 0; // push-out
                velocity.y *= -1 // bounce
            }
            else if(graphicsObj.y + graphicsObj.height > screenHeight) // if below border
            {
                
                graphicsObj.y = screenHeight-graphicsObj.height// push-out
                velocity.y *= -1 // bounce
            }


        }

    }

}



// subclasses
/**
 * Abstract game object class
 * @abstract
 */
/*class GameObject {
    graphicsObject; // the actual graphics object of the game object

    constructor() {

    }
}

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