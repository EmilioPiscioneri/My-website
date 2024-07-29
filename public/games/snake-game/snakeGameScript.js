// ---------
// The actual code for the snake game. This exports a Script class object that the main js can use
// ----------

import { Script } from "./scriptLoader.js";
import globals from "./globals.js";
import { GetRandomIntInclusive } from "./Utils.js";
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
    canMove = false; // whetehr the snake is legally allowed to move
    tilesPerFruit = 5; // how many tiles/length the snake gains when it eats a fruit
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
        gameMap.snake = this

        // now let's start by creating our first tile at the start pos
        startPos = startPos || new Point(Math.floor(gameMap.tileQuantities.x / 2), Math.floor(gameMap.tileQuantities.y / 2)) // use start pos or default to middle of map

        let tile = new SnakeTile(gameMap, startPos, startDirection)

        this.UnshiftTile(tile)
    }

    // Adds tile to the start of the _tiles array 
    UnshiftTile(tileToAdd) {
        this.tiles.unshift(tileToAdd)
    }

    // add a tile to end of _tiles array
    PushTile(tileToAdd) {
        this.tiles.push(tileToAdd)
    }

    // adds a new tile to the back of the snake
    AddTileToBack() {
        let backTile = this.tiles[this.tiles.length - 1]
        // go one back from back tile
        let newTilePos = VecMath.AddVecs(backTile.position, Direction.ToVector(Direction.GetOppositeDirection(backTile.direction)))

        // create tile, inherit the same direction as current
        let tile = new SnakeTile(this.gameMap, newTilePos, backTile.direction)

        this.PushTile(tile)


    }

    // Removes the last tile in the tiles array
    PopTile() {
        let removedTile = this.tiles.pop()
        // prepare for GC
        removedTile.Destruct()
    }

    // moves the snake once in the current direciotn it is facing
    Move() {
        if (!this.canMove)
            return
        // get the new position that the tile will be when added to front

        // do the current pos of front tile + direction as unit vector
        let newTilePos = VecMath.AddVecs(this.tiles[0].position, Direction.ToVector(this.direction))

        // create tile, inherit the same direction as current
        let tile = new SnakeTile(this.gameMap, newTilePos, this.direction)

        // remove last tile and add the new front one
        this.PopTile()
        this.UnshiftTile(tile)

        // setup next time
        this.lastMoveTimestamp = Date.now();

        // new FruitController(this.gameMap).GenerateFruit(1)
    }

    // Returns boolean
    IsOutOfBounds() {
        // Check if out of bounds
        let frontTile = this.tiles[0]
        return (// x-axis
            frontTile.position.x < 0 || frontTile.position.x > this.gameMap.tileQuantities.x ||
            // y-axis
            frontTile.position.y < 0 || frontTile.position.y > this.gameMap.tileQuantities.y)


    }

    // moves the snake and processes anything else
    Update() {
        if (this.gameMap.gameEnded)
            return




        // if enough time has passed for the next move
        if (Date.now() - this.lastMoveTimestamp >= this.moveInterval)
            this.Move(); // do it

        // if out of bounds 
        if (this.IsOutOfBounds()) {
            this.gameMap.EndGame("out of bounds")
            return
            // console.warn("snake out of bounds")
            // new front tile is touching itself, scnd param is exclude front
        } else if (this.ContainsTile(this.tiles[0].position, true)) {
            this.gameMap.EndGame("touching itself")
            return
        }

        // fruit has been eated
        for (const fruit of this.gameMap.fruitController.fruits) {
            let frontTile = this.tiles[0]
            // if front tile is in pos of fruit (colliding)
            if (frontTile.position.x == fruit.position.x && frontTile.position.y == fruit.position.y) {
                // loop tiles per fruit times and add that many tiles for this eaten fruit 
                for (let _ = 0; _ < this.tilesPerFruit; _++) {
                    this.AddTileToBack();

                }
                // remove fruit and gen new one
                this.gameMap.fruitController.RemoveFruit(fruit)
                this.gameMap.fruitController.GenerateFruit()
            }
        }





    }

    // Whether the snake has a tile with given position
    ContainsTile(tilePosition, excludeFront = false) {
        for (let snakeTile of this.tiles) {
            if ((snakeTile.position.x == tilePosition.x && snakeTile.position.y == tilePosition.y) && !(excludeFront == true && snakeTile == this.tiles[0]))
                return true
        }
        return false
    }

    Destruct(){
        for (const tile of this.tiles) {
            tile.Destruct()
        }
        this.tiles = [];
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

    // these add to this when created
    fruitController;
    snake;

    // gets updated whenever the quantiies changes
    _tileSize;
    // Read-only, it is the size of each tile in game units
    get tileSize() {
        return this._tileSize
    }

    gameEnded = false


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
        // controller adds itself one creation
        // this.fruitController = fruitController
    }

    // converts a map tile pos to scene pos that is in game units
    GetScenePosition(tilePosition) {
        return new Point(tilePosition.x * this._tileSize.x, tilePosition.y * this._tileSize.y)
    }

    // ends the game
    EndGame(reason) {
        this.gameEnded = true
        this.snake.canMove = false
        ShowGameOver(this.game, reason)
        // console.warn("GAME ENDED", reason)
    }

    Destruct(){
        if(this.snake)
            this.snake.Destruct()
        if(this.fruitController)
            this.fruitController.Destruct()
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
        let gameObj = new GameObject(gameMap.game,
            new PIXI.Graphics()
                .rect(0, 0, gameMap.tileSize.x, gameMap.tileSize.y)
                .fill("white"))

        // position the tile 
        gameObj.position = gameMap.GetScenePosition(position)
        gameObj.physicsEnabled = false



        // add to scene
        snakeScene.AddChild(gameObj)

        // intialise this vars

        this.gameObject = gameObj
        this.direction = direction
        this.position = position
    }

    // prepare for GC
    Destruct() {
        snakeScene.RemoveChild(this.gameObject)
        this.gameObject.Destruct()
    }


}

class FruitController {
    fruits = []; // all fruits in scene
    gameMap;
    constructor(gameMap) {
        if (!gameMap)
            throw new Error("smh my head no param")
        this.gameMap = gameMap
        // add controller to map
        gameMap.fruitController = this;
    }

    // generates a fruit and puts in scene
    GenerateFruit() {
        // okay so how this is gonna work is iterate each row and then iterate each tile in that row, see if the snake is taking up that space.
        // Basically you record an array of ranges (array with [min,max]) which are inclusive and are the areas that the fruit can generate in

        let rowRanges = {};

        // populate the ranges. Note it is done from bottom row to top row (0 to max y)

        for (let rowIndex = 0; rowIndex < this.gameMap.tileQuantities.y; rowIndex++) {
            let lastColumnIntersect; // don't initialise
            let hasFreeColumn = false; // if the row has a free column
            let finalArray = [];

            for (let columnIndex = 0; columnIndex < this.gameMap.tileQuantities.x; columnIndex++) {
                let tile = new Point(columnIndex, rowIndex)

                // if intersect was found 
                if (snake.ContainsTile(tile)) {
                    // previous tile wasn't intersecting (using last column intersect) 

                    // skip if intersection at start
                    // If the last found intersection + 1 (1 to the right) is the iterated column then there has been no gap since the last recorded intersection, no range found
                    // so, only go through if it isn't the case
                    // if intersect doesn't exist (intersect+1 == NaN) make it 0 so range is correct
                    if (columnIndex != 0 && (lastColumnIntersect + 1 || 0) != columnIndex) {
                        // go from last available spot to the current one - 1 because this iterated one is intersecting so go back 1 to when it wasn't intersecting
                        finalArray.push([(lastColumnIntersect + 1 || 0), columnIndex - 1])
                        hasFreeColumn = true
                    }

                    // just recorded an intersection
                    lastColumnIntersect = columnIndex
                } else if (columnIndex == this.gameMap.tileQuantities.x - 1) {
                    if (lastColumnIntersect == undefined)
                        finalArray.push([0, columnIndex])
                    else
                        finalArray.push([lastColumnIntersect + 1, columnIndex])
                    hasFreeColumn = true
                }
            }

            if (hasFreeColumn) {
                rowRanges[rowIndex] = finalArray;
            }

        }

        // if has no available spots
        let rowRangesKeys = Object.keys(rowRanges)
        if (rowRangesKeys.length == 0) {
            this.gameMap.EndGame("FINISHED THE GAME")
            return
        }

        // choose a random row (from ranges obj which isn't ordered and may not have some arrays), then range, the column in range
        let rowIndex = GetRandomIntInclusive(0, this.gameMap.tileQuantities.y - 1)
        let rangeArrays = Object.values(rowRanges)[rowIndex] //rowRanges[rowIndex]
        let rangeIndex = GetRandomIntInclusive(0, rangeArrays.length - 1)
        let range = rangeArrays[rangeIndex]
        let columnIndex = GetRandomIntInclusive(range[0], rowRangesKeys[rowIndex])

        let newPosition = new Point(columnIndex, rowIndex)

        // create fruit
        let fruit = new Fruit(this.gameMap, newPosition)
        this.AddFruit(fruit)

        // console.log(rowRanges)

    }

    // Adds fruit to the array 
    AddFruit(fruitToAdd) {
        this.fruits.push(fruitToAdd)
    }

    // Removes a fruit
    RemoveFruit(fruitToRemove) {
        // remove 
        this.fruits.splice(this.fruits.indexOf(fruitToRemove), 1)
        // prepare for GC
        fruitToRemove.Destruct()
    }

    Destruct() {
        for (const fruit of this.fruits) {
            fruit.Destruct()
        }
        this.fruits = []
    }

}

// fruit that the snake will consume
class Fruit {
    position //= new Point(0, 0)
    gameMap;
    // game obj of the fruit in scene
    gameObject;
    /**
     * 
     * @param {GameMap} gameMap 
     * @param {Point} position the position of the fruit in map units  
     */
    constructor(gameMap, position = new Point(0, 0)) {
        this.gameMap = gameMap


        // create a gameObject and add to scene
        let gameObj = new GameObject(gameMap.game,
            new PIXI.Graphics()
                .rect(0, 0, gameMap.tileSize.x, gameMap.tileSize.y)
                .fill("red"))

        gameObj.physicsEnabled = false
        // position the tile 
        gameObj.position = gameMap.GetScenePosition(position)



        // add to scene
        snakeScene.AddChild(gameObj)

        // intialise this vars

        this.gameObject = gameObj
        this.position = position
    }

    // prepare for GC
    Destruct() {
        snakeScene.RemoveChild(this.gameObject)
        this.gameObject.Destruct()
    }
}

// the snake for the game
let snake;
let map;
let firstKeyPressed = false; // whether a movement key has been pressed, this starts the game
// whenever ui is generated it is put under a folder, first check if this is null or not
let gameOverUIFolder

// setup for a new scene to be done
function SetupSnakeScene(game) {
    // first cleanup the old stuff
    CleanupSnakeScene(game);
    let canvasSize = game.GetCanvasSizeInUnits()

    // create a map
    map = new GameMap(game, Math.floor(canvasSize.x * 2), Math.floor(canvasSize.y * 2))
    let fruitController = new FruitController(map)
    // create a snake
    snake = new Snake(map)
    // create first fruit
    fruitController.GenerateFruit()
    // let fruit = new Fruit(map, new Point(4, 4))

}

// Removes the old snake scene stuff
function CleanupSnakeScene(game) {
    if(map)
        map.Destruct()
    firstKeyPressed = false
    snake = null
    if(gameOverUIFolder){
        snakeScene.RemoveChild(gameOverUIFolder)
        gameOverUIFolder.Destruct()
    }
    gameOverUIFolder = null
    
}



// reason is string for why the game ended
function GenerateGameOverUI(game, reason) {
    gameOverUIFolder = new Folder(game)

    let heading = new TextLabel(game, "GAME OVER")
    // heading.stageObject.style.fill = "yellow";
    heading.stageObject.style.fontWeight = "bold";
    // heading.stageObject.style.stroke = "black";
    heading.fontSize = 1;
    heading.bottomLeftOffset = new RelPoint(0,0.5,0,0.5) // make the positionr represent the centre point of text
    heading.positionMethod = PositionMethod.Absolute
    let subHeading = new TextLabel(game,reason)
    // subHeading.stageObject.style.fill = "yellow";
    // heading.stageObject.style.stroke = "black";
    subHeading.fontSize = 0.75;
    subHeading.bottomLeftOffset = new RelPoint(0,0.5,0,0.5) // make the positionr represent the centre point of text
    subHeading.positionMethod = PositionMethod.Absolute
    // position properly
    let padding = 0.2;

    let restartButton = new Button(game,"Restart")
    // restartButton.bottomLeftOffset = new RelPoint(0,0.5,0,0.5) // make the positionr represent the centre point of text
    // restartButton.textLabelObject.stageObject.tint = "#854b00"
    // restartButton.backgroundFill = "yellow"
    // restartButton.backgroundStroke = {
    //     "color":"#ffd24d",
    //     width:2
    // }
    restartButton.backgroundStroke = {
        color: "rgb(29 30 30)",
        width: 2
    }
    restartButton.fontSize = 0.5
    restartButton.positionMethod = PositionMethod.Absolute
    
    

    // position heading at screen centre + height/2 + padding/2
    heading.position = new RelPoint(0,0.5, heading.height/2+padding/2,0.5) 
    // below heading
    subHeading.position = new RelPoint(0,0.5, (-subHeading.height/2)-padding/2,0.5) 

    restartButton.position = new RelPoint(-restartButton.width/2,0.5,-subHeading.height-padding*1.5-restartButton.height,0.5)

    restartButton.AddEventListener("pointerDown", ()=>{RestartBtnCallback(game)}, restartButton)

    // debugging
    globalThis.heading = heading
    globalThis.restartButton = restartButton

    gameOverUIFolder.AddChild(heading);
    gameOverUIFolder.AddChild(subHeading);
    gameOverUIFolder.AddChild(restartButton);
    // add folder to scene
    snakeScene.AddChild(gameOverUIFolder)
}

function RestartBtnCallback(game){
    // CleanupSnakeScene()
    SetupSnakeScene(game)
}

function ShowGameOver(game, reason) {
    if (gameOverUIFolder) {
        gameOverUIFolder.isVisible = true
    } else {
        GenerateGameOverUI(game, reason)
    }
}

function HideGameOver() {
    gameOverUIFolder.isVisible = false;
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



function HandleKeyDown(keyEvent) {
    // console.log(keyEvent)
    let code = keyEvent.code

    // just change direction and the snake will update itself 

    // there r situations where u cant move so account for that
    let directionToMove;

    // up
    if (code == "KeyW" || code == "ArrowUp") {
        directionToMove = Direction.UP
    }
    // down
    else if (code == "KeyS" || code == "ArrowDown") {
        directionToMove = Direction.DOWN

    }
    // left
    else if (code == "KeyA" || code == "ArrowLeft") {
        directionToMove = Direction.LEFT

    }
    // right
    else if (code == "KeyD" || code == "ArrowRight") {
        directionToMove = Direction.RIGHT
    }

    // if mvmnt key was pressed 
    if (directionToMove) {
        

        // if key direction isn't the inverse of the current direction of snake unless first direction hasnt been chosen
        if (directionToMove != Direction.GetOppositeDirection(snake.direction) || !firstKeyPressed)
            // set it
            snake.direction = directionToMove

        if (!firstKeyPressed) {
            firstKeyPressed = true
            snake.canMove = true
        }
    }
}


function OnTick(game) {
    // then update current snake
    if(snake)snake.Update()



}

function UnloadSnakeGame(game) {
    game.RemoveEventListener("keyDown", HandleKeyDown)

}


// export as script class
export function GetSnakeGameScript() {
    snakeScene = new Scene(globals.game)
    return new Script(globals.game, LoadSnakeGame, OnTick, UnloadSnakeGame)
}
