// primitive playground code
const graphicsApp = new PIXI.Application();
const Graphics = PIXI.Graphics; // graphics library


const graphicsContainer = document.getElementById("graphics-container"); // a div where the canvas will be stored

// initialise the graphics object (is done asynchronously)
graphicsApp.init({
    background: "#4f4f4f",
    resizeTo: graphicsContainer
}).then(() => {
    // now add the canvas to my html
    graphicsContainer.appendChild(graphicsApp.canvas)

    main();
})

let rectGraphics

function handleKeyDown(event) {
    // console.log(event)

    let keyDown = event.key;
    let movementAmnt = 10; // movement amount in pixels

    switch (keyDown) {
        // movement
        case "w":
            {
                rectGraphics.y -= movementAmnt;
                break;
            }
        case "s":
            {
                rectGraphics.y += movementAmnt;
                break;
            }
        case "a":
            {
                rectGraphics.x -= movementAmnt;
                break;
            }
        case "d":
            {
                rectGraphics.x += movementAmnt;
                break;
            }

        default:
            break;
    }
}

function main() {
    // create a rectangle and display
    rectGraphics = new Graphics();
    rectGraphics
        .rect(10, 10, 200, 200)
        .fill({
            color: "#FFFFFF"
        });

    graphicsApp.stage.addChild(rectGraphics)

    graphicsContainer.onkeydown = handleKeyDown;
}