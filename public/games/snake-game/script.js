// --------------------
// SETUP SCRIPT
// --------------------

// libraries/class/object setup
import ScriptLoader, { Script } from "./scriptLoader.js";

// shared game class for everything
const game = new Game();

// end of setup

const graphicsContainer = document.getElementById("graphics-container"); // a div where the canvas will be stored

// initialise the game object (it is done asynchronously)
game.Initialise(graphicsContainer)
    .then(() => {
        main();
    })
    .catch((err) => {
        // is this redundant?
        throw err
    })

function main() {

}