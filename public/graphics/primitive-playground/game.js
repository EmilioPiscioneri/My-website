const Point = PIXI.Point;


// main class, I included the subclasses in the same file because it is easier 
class Game {
    pixiApplication = new PIXI.Application();
    graphicsContainer = null; // a div where graphics go 
    defaultBackgroundColour = "#4f4f4f"
    // gameObjects = []; // an array of game objects 
    ticker; // a PIXI ticker object that is for this game obvject
    globalPhysicsEnabled = true; // Maybe you don't want physics idk
    gravity = 9.8; // gravitational acceleration in pixels/second (only on y)

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
                velocity: new PIXI.Point(0,0), // each one represents movement over axis in pixels over a second 
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
            if(graphicsObj.parent != gameStage)
                continue;


            // apply physics

            // seconds since last frame
            let deltaSec = this.ticker.deltaMS/1000;
            graphicsObj.x += deltaSec * physicsData.velocity.x
            graphicsObj.y += deltaSec * physicsData.velocity.y
            console.log()

            

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