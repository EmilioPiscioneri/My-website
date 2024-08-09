// ---------
// The actual code for the snake game. This exports a Script class object that the main js can use
// ----------

import { Script } from "./scriptLoader.js";
import globals from "./globals.js";
import { GetRandomIntInclusive } from "./Utils.js";
var Point = PIXI.Point

// scene to put the snake game on, is initialised later
let snakeScene;
// UI text element
let snakeLengthText;
let snakeLengthTextPrefix = "Snake length: ";
// pre load my crappy apple texture
let useFruitTexture = false // it loosk kinda ugly
let appleTexture = await PIXI.Assets.load("./apple.svg")
globalThis.appleTexture = appleTexture
// -- CONFIG --
// this is for when the map is a square (you may get weird visuals otherwise)
// it defines how many tiles there are on the horizontal and vertical axes
let tilePerAxis = 25;
let invincibilityInterval = 50; // how many ms extra to wait before move when the snake is abt to die
let tilesPerFruit = 1; // how many tiles/length the snake gains when it eats a fruit

// config options for debugging
// invincibilityInterval = 10**999; 
// tilePerAxis = 5; 


// I'm just gonna keep the snake classes in this file just cos its easier 
class Snake {
    // array of snake tiles that represent the visual. The newer tiles have the smallest index
    tiles = [];
    gameMap;
    lastMoveTimestamp = Date.now(); //unix timestap, last time the snake was moved, start as current time because it shouldn't immediately move
    moveInterval = 125; // how many ms to wait between moving the snake
    canMove = false; // whether the snake is legally allowed to move. (So you can like stop the snake on game over e.g.)
    tilesReadyToAdd = 0; // how many tiles are ready to be added to the back of snake. One tiles is added per each snake move

    // direction that the snake is travelling in
    get direction() {
        // just return the direction of the most recent tile
        return this.tiles[0].direction
    }
    set direction(newDirection) {
        let oldDirection = this.direction;
        // just set the direction of the most recent tile, then force an update
        this.tiles[0].direction = newDirection
        // if there has been a change in direction
        if (oldDirection != newDirection)
            this.Move(); // force move snake, it makes the game run a lot better
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
        startPos = startPos || new Point(Math.floor((gameMap.tileQuantities.x - 1) / 2), Math.floor((gameMap.tileQuantities.y - 1) / 2)) // use start pos or default to middle of map

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

    // redundant, I just don't remove back tile when I add the new one which still has the same functionality.
    // This is cos the tiles are added whenevr there is a move, so instead of adding it back just don't remove it and add more to get functionality like its growing from one point

    // // adds a new tile to the back of the snake. Param is optional direction to set the new tile to
    // AddTileToBack(direction) {
    //     let backTile = this.tiles[this.tiles.length - 1]
    //             // go one back from back tile
    //     let newTilePos = VecMath.AddVecs(backTile.position, Direction.ToVector(Direction.GetOppositeDirection(backTile.direction)))

    //     // create tile, use direction param or inherit the same direction as current back tile
    //     let tile = new SnakeTile(this.gameMap, newTilePos, direction || backTile.direction)

    //     this.PushTile(tile)
    // }

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


        // let lastTileDirection = this.tiles[this.tiles.length-1].direction;

        // 
        // first add new front tile
        this.UnshiftTile(tile)

        // then remove last tile (unless you need to add a tile, as you would just replace it anyway. Basically you'd be doing -1 back tile +1 back tile which is redundant)

        // if there is more than one tile to be added, don't remove
        if (this.tilesReadyToAdd != 0) {
            // decrement
            this.tilesReadyToAdd--;
            // added tile, update length
            this.UpdateLengthText()
        } else { // else, no tiles to add so
            this.PopTile()
        }



        // setup next time
        this.lastMoveTimestamp = Date.now();

        // new FruitController(this.gameMap).GenerateFruit(1)
    }

    // Returns boolean whether front tile is out of game map bounda
    IsOutOfBounds() {
        // Check if out of bounds
        let frontTile = this.tiles[0]
        return (// x-axis
            frontTile.position.x < 0 || frontTile.position.x >= this.gameMap.tileQuantities.x ||
            // y-axis
            frontTile.position.y < 0 || frontTile.position.y >= this.gameMap.tileQuantities.y)


    }

    //returns boolean whether front tile is at the edge of the map and the current direction will lead snake to game over
    IsAboutToDie() {
        let frontTile = this.tiles[0]
        return (
            // left edge and heading left
            (frontTile.position.x == 0 && frontTile.direction == Direction.LEFT) ||
            // or right edge and hesding right
            (frontTile.position.x == this.gameMap.tileQuantities.x - 1 && frontTile.direction == Direction.RIGHT) ||
            // or bottom edge and heading down
            (frontTile.position.y == 0 && frontTile.direction == Direction.DOWN) ||
            // or top edge and heading up
            (frontTile.position.y == this.gameMap.tileQuantities.y - 1 && frontTile.direction == Direction.UP))
    }

    // moves the snake and processes anything else
    Update() {
        if (this.gameMap.gameEnded)
            return

        // -- Determine if snake can move, if so then move it --
        let isAboutToDie = this.IsAboutToDie()

        // if snake abt to die and enough time has passed (inclusive of invincibility interval)
        if ((isAboutToDie && Date.now() - this.lastMoveTimestamp >= this.moveInterval + invincibilityInterval) ||
            // else if (or) snake isn't about to die and enought time has passed (exclusive of invincibility interval)
            (!isAboutToDie && Date.now() - this.lastMoveTimestamp >= this.moveInterval))

            // Snake can move, now move the snake
            this.Move();


        // if out of bounds 
        if (this.IsOutOfBounds()) {
            this.gameMap.EndGame("Out of bounds")
            return
            // console.warn("snake out of bounds")
            // new front tile is touching itself, scnd param is exclude front
        }
        if (this.ContainsTile(this.tiles[0].position, true)) {
            this.gameMap.EndGame("Snake hit itself")
            return
        }

        // fruit has been eated
        for (const fruit of this.gameMap.fruitController.fruits) {
            let frontTile = this.tiles[0]
            // if front tile is in pos of fruit (colliding)
            if (frontTile.position.x == fruit.position.x && frontTile.position.y == fruit.position.y) {
                // add x amnt of tiles per fruit to ready integer, the tiles will be added on subsequent moves. 
                // This makes sure that tiles aren't added all at once which will lead to some clipping and other issues
                this.tilesReadyToAdd += tilesPerFruit;
                // remove fruit and gen new one
                this.gameMap.fruitController.RemoveFruit(fruit)
                this.gameMap.fruitController.GenerateFruit()
            }
        }





    }

    // Whether the snake has a tile with given position
    ContainsTile(tilePosition, excludeFront = false) {
        // exclude front is used when like you want to check if snake is touching itself but it shouldn't register as its head touching its head
        // it works by checking if the tile position exists in snake but doesn't include checking the front tile
        let frontTile = this.tiles[0]

        for (let snakeTile of this.tiles) {
            // console.log(snakeTile.position,tilePosition,frontTile.position)
            if (
                // if tile to test exists in snake
                (snakeTile.position.equals(tilePosition)) &&
                // and ((if excluding the front tile, and the iterated tile is not the front tile) else if not excluding front tile just go thru )
                ((excludeFront == true && snakeTile != frontTile) || excludeFront == false)
            )
                return true
            // else if (snakeTile.position.equals(tilePosition)) {
            //     console.log(snakeTile.position, tilePosition, frontTile.position)
            // }
        }
        return false
    }

    Destruct() {
        for (const tile of this.tiles) {
            tile.Destruct()
        }
        this.tiles = [];
    }

    UpdateLengthText() {
        snakeLengthText.text = snakeLengthTextPrefix + this.tiles.length
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

    Destruct() {
        if (this.snake)
            this.snake.Destruct()
        if (this.fruitController)
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

        // Scale of how much padding is between inner and outer tile. This number is a scale of outer tile width/height.
        // The higher this value, the more pronounced the difference between inner and outer tile will be
        let innerTilePadding = 0.075;

        // in order for the tile to have an inner stroke just do a workaround where it has outer stroke as first game obj and the inner fill as child obj
        let outerTileGraphics = new PIXI.Graphics()
            .rect(0, 0, gameMap.tileSize.x, gameMap.tileSize.y)
            .fill("#cbcbcb")

        let innerTileGraphics = new PIXI.Graphics()
            .rect(0, 0, gameMap.tileSize.x * (1 - innerTilePadding), gameMap.tileSize.y * (1 - innerTilePadding))
            .fill("white")

        // create inner tile and outer tile gameObjects and add to scene
        let outerGameObj = new GameObject(gameMap.game,
            outerTileGraphics)

        // position the tile 
        outerGameObj.position = gameMap.GetScenePosition(position)
        outerGameObj.physicsEnabled = false

        let innerGameObj = new GameObject(gameMap.game,
            innerTileGraphics)

        // position the tile by centering the x and y. Do so by moving to centre of parent and then back by half of width/height 
        innerGameObj.position = new RelPoint(-innerGameObj.width / 2, 0.5, -innerGameObj.height / 2, 0.5)
        innerGameObj.physicsEnabled = false


        outerGameObj.AddChild(innerGameObj)

        // add to scene
        snakeScene.AddChild(outerGameObj)

        // intialise this vars

        this.gameObject = outerGameObj
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

        // first loop rows
        for (let rowIndex = 0; rowIndex < this.gameMap.tileQuantities.y; rowIndex++) {
            let lastColumnIntersect; // Represents the last column for the current row which an intersection has occurred between snake tile and column position
            let hasFreeColumn = false; // if the row has a free column
            let finalArray = []; // final array of ranges which don't include any intersections with snake tiles

            // then loop columns
            for (let columnIndex = 0; columnIndex < this.gameMap.tileQuantities.x; columnIndex++) {
                let tile = new Point(columnIndex, rowIndex)
                let oldlastColumnIntersect = lastColumnIntersect

                // if intersect was found 
                if (snake.ContainsTile(tile)) {
                    // Now that an intersection was found, check if it is appropriate and record the space between last intersection and the new intersection
                    // as that will now be free space. Unless ofc there has been no difference from last intersection to this one 

                    // Check if:
                    // intersecting column isn't at start of row (no difference in space has occured, we just started)
                    // and
                    // difference between the current intersecting column and last found intersection is greater than 1 (1 means there was no gap)
                    // then there has been a gap of non-intersecting tiles so record it. 
                    // However the lastColumnIntersect may be undefined, in that case still record it as there has been a gap.

                    // Reasoning: This is because all intersects lead to lastColumnIntersect being defined, and if nothing has been defined up until this point 
                    // (and the current tile isn't at start) then there has guaranteed been at least 1 free space
                    if (columnIndex != 0 && (columnIndex - lastColumnIntersect > 1 || lastColumnIntersect == undefined)) {
                        // go from last available spot (last intersect + 1 or 0 if undefined) to the current one - 1 because this iterated one 
                        // is intersecting so go back 1 to when it wasn't intersecting
                        finalArray.push([(lastColumnIntersect + 1 || 0), columnIndex - 1])
                        hasFreeColumn = true
                    }

                    // just recorded an intersection
                    lastColumnIntersect = columnIndex
                    // console.log("----------")
                    // console.log("tile",tile,"exists")
                } else if (columnIndex == this.gameMap.tileQuantities.x - 1) { // else if column is last one for tile
                    if (lastColumnIntersect == undefined)
                        finalArray.push([0, columnIndex])
                    else
                        finalArray.push([lastColumnIntersect + 1, columnIndex])
                    hasFreeColumn = true
                    // console.log("found free tile")
                }
                // let addedRange = finalArray[finalArray.length-1]
                // if(addedRange && addedRange[0] > addedRange[1]){
                //     console.error("??")
                // }
            }

            if (hasFreeColumn) {
                rowRanges[rowIndex] = finalArray;
            }

            // console.log("rowIndex", rowIndex)
            // console.log("hasFreeColumn", hasFreeColumn)
            // console.log("finalArray", finalArray)
        }

        // if has no available spots

        // use row ranges keys because the row ranges is an object where the indexes are the keys and values are the ranges.
        // I did this because I don't plan to include every range as some may have no spots available
        let rowRangesKeys = Object.keys(rowRanges)
        if (rowRangesKeys.length == 0) {
            this.gameMap.EndGame("FINISHED THE GAME")
            // debugging
            // console.log("rowRanges", rowRanges)
            return
        }

        // choose a random row (from ranges obj which isn't ordered and may not have some arrays), then range, the column in range
        let rowIndex = rowRangesKeys[GetRandomIntInclusive(0, rowRangesKeys.length - 1)] // this will be a 
        let rangeArrays = rowRanges[rowIndex] //rowRanges[rowIndex]
        let rangeIndex = GetRandomIntInclusive(0, rangeArrays.length - 1)
        let range = rangeArrays[rangeIndex]
        let columnIndex = GetRandomIntInclusive(range[0], range[1])

        let newPosition = new Point(columnIndex, rowIndex)

        // create fruit
        let fruit = new Fruit(this.gameMap, newPosition)
        this.AddFruit(fruit)

        // -- debugging
        // console.log("------------------")
        // console.log("rowRanges",rowRanges)
        // console.log("newPosition",newPosition)
        // console.log("fruit",fruit)
        // snake.canMove = false
        // setTimeout(() => {
        //     snake.canMove = true
        // }, 100);

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


        // create stage object for fruit
        let stageObj;
        if (!useFruitTexture)
            stageObj = new PIXI.Graphics()
                .rect(0, 0, gameMap.tileSize.x, gameMap.tileSize.y)
                .fill("red")

        // use crappy apple texture I made
        else
            stageObj = new PIXI.Sprite({
                texture: appleTexture,
                roundPixels: false
            })
        stageObj.width = gameMap.tileSize.x
        stageObj.height = gameMap.tileSize.y

        globalThis.apple = stageObj

        // create a gameObject and add to scene
        let gameObj = new GameObject(gameMap.game,
            stageObj)

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
// put in folders so it's easier to load or unload, its jsut grouping them

// whenever ui is generated it is put under a folder, first check if this is null or not
let gameOverUIFolder
// UI for all stuff in game
let gameUIFolder;

// setup for a new scene to be done
function SetupSnakeScene(game) {
    // first cleanup the old stuff
    CleanupSnakeScene(game);
    // let canvasSize = game.GetCanvasSizeInUnits()

    // create a map
    // map = new GameMap(game, Math.floor(canvasSize.x*1.5), Math.floor(canvasSize.y*1.5))
    map = new GameMap(game, tilePerAxis, tilePerAxis)
    let fruitController = new FruitController(map)
    // create a snake
    snake = new Snake(map)
    // create first fruit
    fruitController.GenerateFruit()
    // let fruit = new Fruit(map, new Point(4, 4))

    // game ui
    ShowGameUI(game)
    // update text
    snake.UpdateLengthText()

}

// Removes the old snake scene stuff
function CleanupSnakeScene(game) {
    if (map)
        map.Destruct()
    firstKeyPressed = false
    snake = null
    if (gameOverUIFolder) {
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
    heading.bottomLeftOffset = new RelPoint(0, 0.5, 0, 0.5) // make the positionr represent the centre point of text
    heading.positionMethod = PositionMethod.Absolute
    let subHeading = new TextLabel(game, reason)
    // subHeading.stageObject.style.fill = "yellow";
    // heading.stageObject.style.stroke = "black";
    subHeading.fontSize = 0.75;
    subHeading.bottomLeftOffset = new RelPoint(0, 0.5, 0, 0.5) // make the positionr represent the centre point of text
    subHeading.positionMethod = PositionMethod.Absolute
    // position properly
    let padding = 0.2;
    // globalThis.heading = heading

    heading.style.stroke = {
        color: "#575757",
        width: 4,
        join: "round"
    }
    subHeading.style.stroke = {
        color: "#575757",
        width: 4,
        join: "round"
    }

    let restartButton = new Button(game, "Restart")
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
    heading.position = new RelPoint(0, 0.5, heading.height / 2 + padding / 2, 0.5)
    // below heading
    subHeading.position = new RelPoint(0, 0.5, (-subHeading.height / 2) - padding / 2, 0.5)

    restartButton.position = new RelPoint(-restartButton.width / 2, 0.5, -subHeading.height - padding * 1.5 - restartButton.height, 0.5)

    restartButton.AddEventListener("pointerDown", () => { RestartBtnCallback(game) }, restartButton)

    // debugging
    globalThis.heading = heading
    globalThis.restartButton = restartButton

    gameOverUIFolder.AddChild(heading);
    gameOverUIFolder.AddChild(subHeading);
    gameOverUIFolder.AddChild(restartButton);
    // add folder to scene
    snakeScene.AddChild(gameOverUIFolder)
}

function GenerateGameUI(game) {
    gameUIFolder = new Folder(game);

    // snake should be intialised by this point
    snakeLengthText = new TextLabel(game, snakeLengthTextPrefix + snake.tiles.length)
    // snakeLengthText.fontSize = 0.4;
    snakeLengthText.fontSize = 1;
    snakeLengthText.fontSize = 0.4;
    // position with some padding from left wall and then the y should be height of scene (1 relY) - height of text - padding
    let padding = 0.1
    snakeLengthText.position = new RelPoint(padding, 0, -snakeLengthText.height - padding, 1)
    snakeLengthText.positionMethod = PositionMethod.Absolute
    snakeLengthText.zIndex = 9

    // globalThis.snakeLengthText = snakeLengthText

    snakeLengthText.style.stroke = {
        color: "black",
        width: 2,
        join: "round"
    }

    // add text to folder
    gameUIFolder.AddChild(snakeLengthText)
    snakeScene.AddChild(gameUIFolder);
}

function RestartBtnCallback(game) {
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
    gameUIFolder.isVisible = false;
}

function ShowGameUI(game) {
    if (gameUIFolder) {
        gameUIFolder.isVisible = true
    } else {
        GenerateGameUI(game)
    }
}

function HideGameUI() {
    gameUIFolder.isVisible = false;
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
    if (snake) snake.Update()



}

function UnloadSnakeGame(game) {
    game.RemoveEventListener("keyDown", HandleKeyDown)

}


// export as script class
export function GetSnakeGameScript() {
    snakeScene = new Scene(globals.game)
    return new Script(globals.game, LoadSnakeGame, OnTick, UnloadSnakeGame)
}
