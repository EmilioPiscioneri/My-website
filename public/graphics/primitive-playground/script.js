// primitive playground code

// libraries/class/object setup
const game = new Game();
var Graphics = PIXI.Graphics; // graphics library
var Rectangle = PIXI.Rectangle;
var Point = PIXI.Point;


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


let rect1;

function handleKeyDown(event) {
    // console.log(event)

    let keyDown = event.key;
    let movementAmnt = 10; // movement amount in pixels

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

let gameObjectToMoveToPointer = null;
let speed = 0.25; // rect to mouse speed

function mainTickerHandler() {
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
        let mousePos = game.ConvertToCartesian(game.mousePos);

        // (m-r)
        let differenceVec = new Point(mousePos.x - rectPos.x, mousePos.y - rectPos.y)

        // A coefficient that affects how long it takes for the rect to reach the mouse
        // speed = speed

        let newVelocity = new Point(differenceVec.x*speed, differenceVec.y*speed)

        gameObjectToMoveToPointer.velocity = newVelocity;
    }

}


function main() {
    game.AddTickerListener(mainTickerHandler);
    // create a rectangle and display
    let rect1Graphics = new Graphics()
        .rect(0, 0, 100, 150)
        .fill("#FFFFFF")

    // console.log(rect1Graphics)
    // console.log(rect1Graphics.position)
    // console.log(rect1Graphics.x,rect1Graphics.y)


    rect1 = new GameObject(rect1Graphics, game);

    rect1.position = new Point(50, 400)


    

    // make it interactive
    rect1.graphicsObject.interactive = true;
    // let isRect1Down = false; // if pointer is on rect1
    // define hitbox
    // rect1.hitArea = new Rectangle(rect1.x,rect1.y,rect1.width, rect1.height);

    // pointer is for touch and mouse
    rect1.graphicsObject.addEventListener("pointerdown", (event) => {
        // let clickPos = getCanvasPosFromPointerPos(event.client);
        // console.log(clickPos)

        gameObjectToMoveToPointer = rect1;
        // isRect1Down = true;
    })

    document.addEventListener("pointerup", (event) => {
        // isRect1Down = false;
        gameObjectToMoveToPointer = null
    })

    

    game.AddGameObject(rect1);
    // rect1.position = new Point(50,0)


    // console.log(rect1.gameData.physics)
    // rect1.gameData.physics.enabled = false
    // game.gravityScale = 0.5;
    // game.drag = 0.1
    function launch() {
        // .x and .y aren't the same as .position?
        rect1.x = 50
        rect1.y = 150
        // rect1.position = new PIXI.Point(10, 150)
        rect1.gameData.physics.velocity = new PIXI.Point(20, -20)
        // rect1.gameData.physics.velocity = new PIXI.Point(1, -10)
        // rect1.gameData.physics.velocity = new PIXI.Point(1, -10)

        // console.log(game.ConvertPixelsToUnits(game.ConvertUnitsToPixels(new PIXI.Point(1,-2))))

    }


    // every x seconds just re position the rect and launch it
    // setInterval(launch, 10000);

    // launch()


    // // create a rectangle and display
    // rectGraphics = new Graphics();
    // rectGraphics
    //     .rect(10, 10, 200, 200)
    //     .fill({
    //         color: "#FFFFFF"
    //     });

    // game.pixiApplication.stage.addChild(rectGraphics)

    graphicsContainer.onkeydown = handleKeyDown;

    // console.log(game.pixiApplication.stage.getChildAt(null) == null)

    // game.AddTickerListener(()=>{
    //     console.log(this)
    // })

}