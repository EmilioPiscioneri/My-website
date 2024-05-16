const Point = PIXI.Point;

// main class, I included the subclasses in the same file because it is easier 
class Game {
    pixiApplication = new PIXI.Application();
    graphicsContainer = null; // a div where graphics go 
    defaultBackgroundColour = "#4f4f4f"
    // gameObjects = []; // an array of game objects 
    ticker; // a PIXI ticker object that is for this game obvject

    // I don't need to listen for multiple events so I'll just use the on... functions
    onTick; //a function that fires whenever the game ticks (new frame)

    mousePos = new Point(0,0); // mouse position, updates every move of mouse or pointer

    // game constructor, pass in a div container for game graphics
    constructor() {
        this.ticker = new PIXI.Ticker();
        this.ticker.autoStart = true;

    }

    // handles mouse movement anywhere on canvas
    HandleMouseMove = (event)=>{
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

    }

    // adds an object to the render canvas (makes it visible)
    AddGraphicsObject(objectToAdd) {
        // this.gameObjects.push(objectToAdd);
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