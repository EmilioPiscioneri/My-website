// --------------------
// SETUP SCRIPT
// --------------------

// libraries/class/object setup
import globals from "./globals.js";
import ScriptLoader, { Script } from "./scriptLoader.js";
import { GetSnakeGameScript } from "./snakeGameScript.js";

// shared game class for everything
const game = new Game();
globals.game = game;

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
    let loader = new ScriptLoader(game)
    // load snake game
    loader.AddLoader(GetSnakeGameScript())
}