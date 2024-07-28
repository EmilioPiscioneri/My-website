// ---------
// The actual code for the snake game. This exports a Script class object that the main js can use
// ----------

import { Script } from "./scriptLoader.js";
import globals from "./globals.js";
var Point = PIXI.Point

// scene to put the snake game on, is initialised later
let snakeScene;


// I'm just gonna keep the snake classes in this file just cos its easier 
class Snake {
    // array of snake tiles that represent the visual. The newer tiles have the smallest index
    tiles = [];
    gameMap;
    lastMoveTimestamp = Date.now(); //unix timestap, last time the snake was moved, start as current time because it shouldn't immediately move
    moveInterval = 100; // how many ms to wait between moving the snake
    // direction that the snake is travelling in
    get direction() {
        // just return the direction of the most recent tile
        return this.tiles[0].direction
    }
    set direction(newDirection) {
        // just set the direction of the most recent tile, then force an update
        this.tiles[0].direction = newDirection
        this.Move();
    }

    /**
     * 
     * @param {GameMap} gameMap 
     * @param {Point} startPos Optional start pos of snake in map coords, If null then defaults to middle of map
     * @param {Direction} startDirection Direction that the snake will start facing 
     */
    constructor(gameMap, startPos, startDirection = Direction.UP) {
        this.gameMap = gameMap

        // now let's start by creating our first tile at the start pos
        startPos = startPos || new Point(Math.floor(gameMap.tileQuantities.x / 2), Math.floor(gameMap.tileQuantities.y / 2)) // use start pos or default to middle of map

        let tile = new SnakeTile(gameMap, startPos, startDirection)

        this.AddTileToFront(tile)
    }

    // Adds tile to the start of the _tiles array 
    AddTileToFront(tileToAdd) {
        this.tiles.unshift(tileToAdd)
    }

    // add to back of _tiles
    AddTileToBack(tileToAdd) {
        this.tiles.push(tileToAdd)
    }

    // Removes the last tile in the tiles array
    PopTile() {
        let removedTile = this.tiles.pop()
        // prepare for GC
        removedTile.Destruct()
    }

    // moves the snake once in the current direciotn it is facing
    Move() {
        // get the new position that the tile will be when added to front

        // do the current pos of front tile + direction as unit vector
        let newTilePos = VecMath.AddVecs(this.tiles[0].position, Direction.ToVector(this.direction))

        // create tile, inherit the same direction as current
        let tile = new SnakeTile(this.gameMap, newTilePos, this.direction)

        // remove last tile and add the new front one
        this.PopTile()
        this.AddTileToFront(tile)

        // setup next time
        this.lastMoveTimestamp = Date.now()
    }

    // moves the snake and processes anything else
    Update() {
        // if enough time has passed for the next move
        if(Date.now() - this.lastMoveTimestamp >= this.moveInterval)
            this.Move(); // do it


    }
}

class GameMap {

    // how many tiles are there per each axis. Has .x and .y properties
    _tileQuantities;
    get tileQuantities() {
        return this._tileQuantities;
    }
    set tileQuantities(newQtys) {
        this._tileQuantities = newQtys;
        let canvasSize = this.game.GetCanvasSizeInUnits()
        // update tile size
        this._tileSize = new Point(
            canvasSize.width / newQtys.x,
            canvasSize.height / newQtys.y)
    }

    // the game obj for everything
    game;

    // gets updated whenever the quantiies changes
    _tileSize;
    // Read-only, it is the size of each tile in game units
    get tileSize() {
        return this._tileSize

    }


    /**
     * 
     * @param {Game} game 
     * @param {Number} horizontalTiles INTEGER representing how many horizontal tiles should be in the map
     * @param {Number} verticalTiles INTEGER representing how many vertical tiles should be in the map
     */
    constructor(game, horizontalTiles, verticalTiles) {
        if (!game)
            throw new Error("GAME IS NULL")

        this.game = game;
        this.tileQuantities = new Point(
            horizontalTiles,
            verticalTiles)
    }

    // converts a map tile pos to scene pos that is in game units
    GetScenePosition(tilePosition) {
        return new Point(tilePosition.x * this._tileSize.x, tilePosition.y * this._tileSize.y)
    }
}

// a tile for the snake
class SnakeTile {
    position //= new Point(0, 0)
    // the direction the tile is headed to next move
    direction //= Direction.UP
    gameMap;
    // game obj of the tile in scene
    gameObject;
    /**
     * 
     * @param {GameMap} gameMap 
     * @param {Point} position the position of the tile in map units  
     * @param {Direction} direction the position of the tile in map units  
     */
    constructor(gameMap, position = new Point(0, 0), direction = Direction.UP) {
        this.gameMap = gameMap


        // create a gameObject and add to scene
        let tileGameObj = new GameObject(gameMap.game,
            new PIXI.Graphics()
                .rect(0, 0, gameMap.tileSize.x, gameMap.tileSize.y)
                .fill("white"))

        // position the tile 
        tileGameObj.position = gameMap.GetScenePosition(position)



        // add to scene
        snakeScene.AddChild(tileGameObj)
        
        // intialise this vars

        this.gameObject = tileGameObj
        this.direction = direction
        this.position = position
    }

    // prepare for GC
    Destruct() {
        snakeScene.RemoveChild(this.gameObject)
        this.gameObject.Destruct()
    }


}

class FruitController{
    
}

// the snake for the game
let snake; 

// setup for a new scene to be done
function SetupSnakeScene(game) {
    // first cleanup the old stuff
    CleanupSnakeScene(game);
    let canvasSize = game.GetCanvasSizeInUnits()

    // create a map
    let map = new GameMap(game, Math.floor(canvasSize.x * 2), Math.floor(canvasSize.y * 2))
    // create a snake
    snake = new Snake(map)

}

// Removes the old snake scene stuff
function CleanupSnakeScene(game) {

}



function LoadSnakeGame(game) {
    // sets up scene 
    SetupSnakeScene(game)
    // listen for key down n that
    game.AddEventListener("keyDown", HandleKeyDown)

    // DEBUGGING GLOBALS
    globalThis.snake = snake

    // display snake scene
    game.activeScene = snakeScene;

}

function HandleKeyDown(keyEvent){
    console.log(keyEvent)
    let code = keyEvent.code

    // just change direction and the snake will update itself 

    // there r situations where u cant move so account for that
    let directionToMove;

    // up
    if(code == "KeyW" || code == "ArrowUp"){
        directionToMove = Direction.UP
    }
    // down
    else if(code == "KeyS" || code == "ArrowDown"){
        directionToMove = Direction.DOWN
        
    }
    // left
    else if(code == "KeyA" || code == "ArrowLeft"){
        directionToMove = Direction.LEFT
        
    }
    // right
    else if(code == "KeyD" || code == "ArrowRight"){
        directionToMove = Direction.RIGHT   
    }

    // if mvmnt key was pressed and it wasn't the inverse of the current direction of snake
    if(directionToMove && directionToMove != Direction.GetOppositeDirection(snake.direction)){
        // set it
        snake.direction = directionToMove
    }
}


function OnTick(game) {
    // then update current snake
    snake.Update()



}

function UnloadSnakeGame(game) {
    game.RemoveEventListener("keyDown", HandleKeyDown)

}


// export as script class
export function GetSnakeGameScript() {
    snakeScene = new Scene(globals.game)
    return new Script(globals.game, LoadSnakeGame, OnTick, UnloadSnakeGame)
}
