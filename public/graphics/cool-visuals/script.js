// libraries/class/object setup
const game = new Game();
var Graphics = PIXI.Graphics; // graphics library
var Rectangle = PIXI.Rectangle;
var Point = PIXI.Point;

//#region Script code

let loaders = []; // an array of loader objects that are active in the current script. This ensures their onTick function is fired correctly

/**
 * This class loads different pieces of code. Useful just so I can easily load and unload different code that I want in a scene at certain times
 */
class ScriptLoader extends EventSystem {
    isLoaded = false;
    _loadFunction; // the custom setup function for the loader
    _onTickFunction; // the custom on tick function for the loader
    _unloadFunction; // the custom cleanup function for the loader
    game; // the associated game object for the current script

    /**
     * 
     * @param {Game} game The game associated with script. Is passed into the different functions 
     * @param {Function} loadFunction This function is called to load the script. Game is passed into first parameter
     * @param {Function} [onTickFunction] This function is called every game tick. Game is passed into first parameter
     * @param {Function} [unloadFunction] This function is called when the script should be unloaded. Game is passed into first parameter 
     */
    constructor(game, loadFunction, onTickFunction, unloadFunction) {
        super();

        if (typeof (loadFunction) != "function")
            throw new Error("Tried to create a Loader but passed load function isn't a function")

        // assign params to this vars
        this.game = game;
        this._loadFunction = loadFunction;
        this._onTickFunction = onTickFunction;
        this._unloadFunction = unloadFunction;

    }

    /**
     * Call when you want to load the script. Game is passed in as parameter.
     */
    Load() {
        this.isLoaded = true;
        if (typeof (this._loadFunction) == "function")
            this._loadFunction(this.game);
        this.FireListener("loaded");
    }

    /**
     * Called every frame tick. Game is passed in as parameter.
     */
    OnTick() {
        // check if function exists and is valid
        if (typeof (this._onTickFunction) == "function")
            this._onTickFunction(this.game);
    }

    /**
     * Call when you want to unload the script. Game is passed in as parameter.
     */
    Unload() {
        // disable OnTick
        this._onTickFunction == null;
        this.isLoaded = false;

        // check if function exists and is valid
        if (typeof (this._unloadFunction) == "function")
            this._unloadFunction(this.game);
        this.FireListener("unloaded")
    }
}


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


// #region universal functions

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
function getPointerPosFromCanvasPos(position) {
    // Don't ask me why it's like this but it is
    let canvasRealPos = getCanvasRealPosition();
    let canvasScreenPos = getCanvasScreenPosition();

    return {
        x: position.x - canvasRealPos.x,
        y: position.y - canvasScreenPos.y
    }
}



function mainTickerHandler() {
    for (const loader of loaders) {
        loader.OnTick(); // call on tick function
    }
}

/**
 * Adds a script loader to the scene AND loads it's load script
 * @param {ScriptLoader} loaderToAdd 
 */
function AddLoader(loaderToAdd) {
    if (loaders.indexOf(loaderToAdd) != -1) {
        console.warn("Tried to add a loader to scene that already has been added")
        return;
    }

    loaderToAdd.Load();
    loaders.push(loaderToAdd);
}

/**
 * Removes a loader from the scene AND calls it's unload funct ion
 * @param {ScriptLoader} loaderToRemove 
 */
function RemoveLoader(loaderToRemove) {

    let loaderIndex = loaders.indexOf(loaderToRemove)
    if (loaderIndex != -1) {
        loaderToRemove.Unload(); // unload
        loaders.splice(loaderIndex, 1); // remove from array
    } else
        console.warn("Tried to remove a loader that hasn't been added to scene")

}

let menuGoBackBtn

// #endregion

// create a main scene

// -- scripts to load --
let constellationVisualScript = new ScriptLoader(game, ConstellationVisualLoad, ConstellationVisualOnTick, ConstellationVisualUnload)
let screenBordersScript = new ScriptLoader(game, ScreenBordersLoad, ScreenBordersOnTick)
let nodeTestScript = new ScriptLoader(game, nodeTestLoad, null, nodeTestUnload)
let memoryLeakTestScript = new ScriptLoader(game, memoryLeakLoad, null, memoryLeakUnload)
let menuScript = new ScriptLoader(game, loadMenu, null, unloadMenu)

function main() {
    game.AddEventListener("tick", mainTickerHandler);


    // then actually load the ball visual

    AddLoader(menuScript);

    // First load the game borders
    // AddLoader(screenBordersScript)
    // AddLoader(constellationVisualScript)

    // setTimeout(()=>RemoveLoader(constellationVisualScript),3000); // test that it unloads properly

    // for testing if nodes work properly
    // AddLoader(nodeTestScript);
    // setTimeout(()=>RemoveLoader(nodeTestScript),8000);

    // AddLoader(memoryLeakTestScript)



    // console.log(game.pixiApplication.stage.getChildAt(null) == null)

    // game.AddTickerListener(()=>{
    //     console.log(this)
    // })

}

// #endregion

/**
 * 
 * @returns Canvas size in game units
 */
function GetCanvasSizeInUnits() {
    // convert to pixels per unit
    return {
        width: game.pixiApplication.canvas.width / game.pixelsPerUnit.x,
        x: game.pixiApplication.canvas.width / game.pixelsPerUnit.x,
        height: game.pixiApplication.canvas.height / game.pixelsPerUnit.y,
        y: game.pixiApplication.canvas.height / game.pixelsPerUnit.y,
    }
}

//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random

// Returns a random number between the specified values. The returned value is no lower than (and may possibly equal) min, and is less than (and not equal) max.
function GetRandomRange(min, max) {
    return Math.random() * (max - min) + min;
}

//#region constellation visual script


let objectsToDestroy = []; // other objects to recursively destory that aren't in other arrays (such as UI elements)
let leftPointerDown = false; // If left mouse or pointer is down on screen
let rightPointerDown = false; // If right mouse or pointer is down on screen
// events to destroy
let pixiEventsToDestroy = []; // Has an array of arrays each with [objectSubscribedTo, eventName, eventListener]
let gameObjEventsToDestroy = []; // Has an array of arrays each with [objectSubscribedTo, eventName, eventListener]
let ballsInScene = []; // array of game objects of balls

// UI
let ballCountTextLbl;
let ballCountDefaultText = "Balls in scene: "
let lineCountTextLbl;
let lineCountDefaultText = "Lines in scene: "
let gridVisibilityBtn;
let gridIsVisible = false;
let radiusVisibilityBtn
let radiusVisible = false;
let radiusObj; // gets initialised in load function to save redrawing each time it loads
let textInput;
// let uiLayout;
let radiusSlider;
let ballsPerSegmentDefaultText = "Balls per segment: ";
let ballsPerSegmentSlider;
let ballsPerSegment = 4;
let gridRows = 6;
let gridColumns = 6;
let gridRowsSlider;
let gridColumnsSlider;
let gridRowsDefaultText = "Grid rows: "
let gridColumnsDefaultText = "Grid columns: "

let reloadBtn;
let reloading = false; // If currently reloading visual

// array of grid line game oebjects
let gridLines = [];
// pull
let ballPullStrengthSlider;
let ballPullStrengthLabel;
let ballPullStrengthDefaultText = "Ball pull strength: ";
let ballsPullStrength = 5;
// push
let ballPushStrengthSlider
let ballPushStrengthLabel;
let ballPushStrengthDefaultText = "Ball push strength: ";
let ballsPushStrength = 5;

// pull/push
let pushPullRadius = 3; // distance to ball required to pull/push from the pointer
let constellationScene;


/**
 * - grid theory -
 * A 2D array of grid segments, indexed by [row][column] or [y][x]
 * Each index contains a point which represents the bottom-left of the segment. 
 * The grid is basically divided so a certain amount of balls will generate in each segment to keep things consistent and spread out.
 * The bounds of a segment can be gotten because the size of each segment is fixed among them all
*/


// grid segments to generate whenever there is a change
let gridSegments;

// grid is generated from bottom to top and left to right. Each segment is a 
// returns created grid segments array
// segmentQuantities is an object with {rows: number, columns: number}
function GenerateGridSegments(segmentQuantities) {
    // error check
    if (!segmentQuantities)
        throw new Error("segment quantities is null")
    if (segmentQuantities.columns <= 0)
        throw new Error("Need to have at least 1 grid segments on x axis")
    if (segmentQuantities.rows <= 0)
        throw new Error("Need to have at least 1 grid segments on y axis")

    newGridSegments = [];

    // get size in units
    let canvasSize = GetCanvasSizeInUnits();

    // Get the size of each segment
    let segmentSize = new Point(
        canvasSize.width / segmentQuantities.columns,
        canvasSize.height / segmentQuantities.rows)

    for (let rowIndex = 0; rowIndex < segmentQuantities.rows; rowIndex++) {
        let rowSegments = []; // the row segments to add to grid segments array

        // the y position of each segment on this row
        // remember it's generated top down and each segment is bottom-left
        // so bottom will be 0 y and top will be canvas height - segmentSize.y
        let yPosition = segmentSize.y * rowIndex;

        // then for this row, do columns
        for (let columnIndex = 0; columnIndex < segmentQuantities.columns; columnIndex++) {
            // now add 
            let segmentPos = new Point(segmentSize.x * columnIndex, yPosition)
            rowSegments.push(segmentPos)
        }

        newGridSegments.push(rowSegments)
    }

    return newGridSegments
}

function ConstellationVisualLoad(game) {
    if (!constellationScene)
        constellationScene = new Scene(game)
    game.activeScene = constellationScene
    game.backgroundColor = "#353535"; // set better color for contrast
    // Just push game objects inwards if out of screen bounds. Easier than dealing with static objects

    GenerateMainVisuals();

    // load all UI stuff
    GenerateUI();

    RestoreSettings();
}

// if you left the visual and came back it will make sure things are restored properly
function RestoreSettings() {
    // grid vis
    if (gridIsVisible)
        ShowGrid();
    else
        HideGrid();
    // radius vis
    if (radiusVisible)
        ShowRadius();
    else
        HideRadius();

}

// font size for different UI text
let defaultTextFontSize = 0.40

// will create and load all UI for script
function GenerateUI() {
    let canvasSize = GetCanvasSizeInUnits();

    // default font sizes in game units
    let headingFontSize = canvasSize.height * 0.075
    let bigFontSize = canvasSize.height * 0.035
    let mediumFontSize = canvasSize.height * 0.025

    // Define layout where all UI game objects will be underneath to make them look ordered
    let uiLayout = new GameObjectLayout(game);

    // handle pointer down and up

    // Pointer.button 0 is left mouse, 1 is middle mouse, 2 is right mouse 
    // Weird behaviour will happen if you touch the screen multiple times but what do you expect.
    // Also this will fire even if buttons are pressed
    function HandlePointerDown(pointerEvent) {
        // console.log(pointerEvent)

        // if didn't click down on ui layout (
        if (!uiLayout.ContainsPoint(game.pointerPos)) {
            if (pointerEvent.button == 0) // left
                leftPointerDown = true;
            else if (pointerEvent.button == 2) // right
                rightPointerDown = true;
        }

    }
    function HandlePointerUp(pointerEvent) {
        // console.log(pointerEvent)
        if (pointerEvent.button == 0) // left
            leftPointerDown = false;
        else if (pointerEvent.button == 2) // right
            rightPointerDown = false;
    }

    game.pixiApplication.canvas.addEventListener("pointerdown", HandlePointerDown);
    game.pixiApplication.canvas.addEventListener("pointerup", HandlePointerUp);

    // register pointer to be destroyed later
    pixiEventsToDestroy.push([game.pixiApplication.canvas, "pointerdown", HandlePointerDown])
    pixiEventsToDestroy.push([game.pixiApplication.canvas, "pointerup", HandlePointerUp])

    // disable context menu on canvas for ball push with right click
    game.preventContextMenu = true

    // Do all the UI stuff

    // create new game text game object
    lineCountTextLbl = new TextLabel(game, lineCountDefaultText, true, {
        fontFamily: 'Arial',
        fill: "#dbdbdb",
        stroke: {
            color: "black",
            width: 2,
        },
        align: 'left',
    });

    ballCountTextLbl = new TextLabel(game, lineCountDefaultText, false, {
        fontFamily: 'Arial',
        fill: "white",
        stroke: {
            color: "black",
            width: 2,
        },
        align: 'left',
    });

    lineCountTextLbl.fontSize = defaultTextFontSize;
    ballCountTextLbl.fontSize = defaultTextFontSize;

    // ballCountTextLbl = new TextLabel(game, lineCountDefaultText, false)
    // lineCountTextLbl.position = new Point(0.25, canvasSize.height - lineCountTextLbl.height - 0.25) // top left

    // // add to scene
    // game.AddGameObject(lineCountTextLbl);

    gridVisibilityBtn = new Button(game, "Show grid", false);

    gridVisibilityBtn.fontSize = defaultTextFontSize;
    gridVisibilityBtn.backgroundStroke = {
        color: "black",
        width: 2
    }
    // gridVisibilityBtn.position = new Point(0.25, canvasSize.height - lineCountTextLbl.height - 0.5 - gridVisibilityBtn.height)
    // document.btn = gridVisibilityBtn

    // game.AddGameObject(gridVisibilityBtn)

    gridVisibilityBtn.AddEventListener("pointerUp", HandleGridVisibilityBtnUp)

    gameObjEventsToDestroy.push([gridVisibilityBtn, "pointerup", HandleGridVisibilityBtnUp])


    // textInput = new TextInput(game, null, false)
    // textInput.backgroundStroke = {
    //     color: "black",
    //     width: 2
    // }
    // textInput.fontSize = 22;
    // textInput.position = new Point(0.25, canvasSize.height - lineCountTextLbl.height - 0.75 - gridVisibilityBtn.height - textInput.height)

    // game.AddGameObject(textInput)

    ballPullStrengthLabel = new TextLabel(game, ballPullStrengthDefaultText, false)
    ballPullStrengthLabel.fontSize = defaultTextFontSize;

    ballPullStrengthSlider = new Slider(game, 0.1, 100, 0.1, ballsPullStrength);


    function HandlePullStrengthChanged() {
        ballPullStrengthLabel.text = ballPullStrengthDefaultText + ballPullStrengthSlider.value.toFixed(2);
        ballsPullStrength = ballPullStrengthSlider.value;
    }
    HandlePullStrengthChanged();

    ballPullStrengthSlider.AddEventListener("valueChanged", HandlePullStrengthChanged, ballPullStrengthLabel)

    // --

    ballPushStrengthLabel = new TextLabel(game, ballPushStrengthDefaultText, false)
    ballPushStrengthLabel.fontSize = defaultTextFontSize;

    ballPushStrengthSlider = new Slider(game, 0.1, 100, 0.1, ballsPushStrength);


    function HandlePushStrengthChanged() {
        ballPushStrengthLabel.text = ballPushStrengthDefaultText + ballPushStrengthSlider.value.toFixed(2);
        ballsPushStrength = ballPushStrengthSlider.value;
    }
    HandlePushStrengthChanged();

    ballPushStrengthSlider.AddEventListener("valueChanged", HandlePushStrengthChanged, ballPushStrengthLabel)

    radiusVisibilityBtn = new Button(game, "Show push/pull radius", false);

    radiusVisibilityBtn.fontSize = defaultTextFontSize;
    radiusVisibilityBtn.backgroundStroke = {
        color: "black",
        width: 2
    }
    // gridVisibilityBtn.position = new Point(0.25, canvasSize.height - lineCountTextLbl.height - 0.5 - gridVisibilityBtn.height)
    // document.btn = gridVisibilityBtn

    // game.AddGameObject(gridVisibilityBtn)

    radiusVisibilityBtn.AddEventListener("pointerUp", HandleRadiusBtnUp)

    gameObjEventsToDestroy.push([radiusVisibilityBtn, "pointerup", HandleRadiusBtnUp])

    // intialise
    radiusObj = new Circle(game, 0, 0, pushPullRadius)
    radiusObj.fill = null
    radiusObj.stroke = {
        color: "white",
        width: 2
    }
    radiusObj.isVisible = false;
    radiusObj.static = true
    objectsToDestroy.push(radiusObj)
    constellationScene.AddChild(radiusObj);

    let radiusSliderTextDefault = "Push/pull radius: "
    let radiusSliderText = new TextLabel(game, radiusSliderTextDefault)
    radiusSliderText.fontSize = defaultTextFontSize

    radiusSlider = new Slider(game, 0.1, 10, 0.05, pushPullRadius);
    radiusSlider.label = "radiusSlider"

    function handleRadiusSliderChanged() {
        pushPullRadius = radiusSlider.value
        radiusSliderText.text = radiusSliderTextDefault + (pushPullRadius.toFixed(2))
        resizeRadius()
    }

    handleRadiusSliderChanged();

    radiusSlider.AddEventListener("valueChanged", handleRadiusSliderChanged)

    gameObjEventsToDestroy.push([radiusSlider, "valueChanged", handleRadiusSliderChanged])

    let ballsPerSegmentText = new TextLabel(game, ballsPerSegmentDefaultText + ballsPerSegment)
    ballsPerSegmentText.fontSize = defaultTextFontSize;

    ballsPerSegmentSlider = new Slider(game, 1, 5, 1, ballsPerSegment)
    // bps = balls per segment
    function handleBpsSliderChanged() {
        ballsPerSegment = ballsPerSegmentSlider.value
        ballsPerSegmentText.text = ballsPerSegmentDefaultText + ballsPerSegment
    }
    handleBpsSliderChanged();
    ballsPerSegmentSlider.AddEventListener("valueChanged", handleBpsSliderChanged)
    gameObjEventsToDestroy.push([ballsPerSegmentSlider, "valueChanged", handleBpsSliderChanged])

    reloadBtn = new Button(game, "Reload");
    reloadBtn.fontSize = defaultTextFontSize;
    reloadBtn.backgroundStroke = {
        color: "black",
        width: 2
    }
    reloadBtn.AddEventListener("pointerUp", ReloadVisual)
    gameObjEventsToDestroy.push([reloadBtn, "pointerUp", ReloadVisual])


    let gridColumnsText = new TextLabel(game, gridColumnsDefaultText + gridColumns)
    gridColumnsText.fontSize = defaultTextFontSize;

    gridColumnsSlider = new Slider(game, 1, 10, 1, gridColumns)
    // bps = balls per segment
    function handleGridColumnsSliderChanged() {
        gridColumns = gridColumnsSlider.value
        gridColumnsText.text = gridColumnsDefaultText + gridColumns
    }
    handleGridColumnsSliderChanged();
    gridColumnsSlider.AddEventListener("valueChanged", handleGridColumnsSliderChanged)
    gameObjEventsToDestroy.push([gridColumnsSlider, "valueChanged", handleGridColumnsSliderChanged])

    let gridRowsText = new TextLabel(game, gridRowsDefaultText + gridRows)
    gridRowsText.fontSize = defaultTextFontSize;

    gridRowsSlider = new Slider(game, 1, 10, 1, gridRows)
    // bps = balls per segment
    function handleGridRowsSliderChanged() {
        gridRows = gridRowsSlider.value
        gridRowsText.text = gridRowsDefaultText + gridRows
    }
    handleGridRowsSliderChanged();
    gridRowsSlider.AddEventListener("valueChanged", handleGridRowsSliderChanged)
    gameObjEventsToDestroy.push([gridRowsSlider, "valueChanged", handleGridRowsSliderChanged])


    // constellationScene.AddChild(ballPullStrengthSlider)
    // game.AddGameObject(ballPullStrengthLabel)




    // Setup layout (defined earlier)

    uiLayout.position = new Point(0.25, canvasSize.height - 0.25);
    // uiLayout.position = new Point(canvasSize.width/2, canvasSize.height/2);
    uiLayout.layoutOrientation = LayoutOrientation.VerticalDown
    // uiLayout.margin = new Padding(0.2,0.1,0.3,0.4)

    uiLayout.width = 5;
    uiLayout.height = 5
    uiLayout.alpha = 0.75;

    uiLayout.label = "uiLayout"

    // make a layout expander that expands the options layout
    let layoutExpander = new LayoutExpander(game, "Options")

    layoutExpander.fontSize = defaultTextFontSize;
    layoutExpander.backgroundStroke = {
        color: "black",
        width: 2
    }

    // let optionsLayout = new GameObjectLayout(game);
    let optionsLayout = layoutExpander.layoutToExpand;
    optionsLayout.margin = new Padding(0.25, 0, 0, 0.25)
    optionsLayout.alpha = 0

    // layoutExpander.isVisible = false
    // layoutExpander.layoutToExpand.isVisible = false;
    // layoutExpander.layoutToExpand.alpha = 0; // make background invisible

    globalThis.layoutExpander = layoutExpander
    globalThis.uiLayout = uiLayout
    globalThis.optionsLayout = optionsLayout
    globalThis.radiusSliderText = radiusSliderText;


    // constellationScene.AddChild(layout)


    // constellationScene.AddChild(ballPullStrengthLabel)
    // constellationScene.AddChild(ballPullStrengthSlider)

    // setup layout

    uiLayout.AddChild(layoutExpander)

    // optionsLayout.AddChild(ballCountTextLbl)
    // optionsLayout.AddChild(lineCountTextLbl)
    optionsLayout.AddChild(radiusVisibilityBtn);
    // optionsLayout.AddChild(radiusSliderText)
    // optionsLayout.AddChild(radiusSlider)
    optionsLayout.AddChild(ballPullStrengthLabel)
    // optionsLayout.AddChild(ballPullStrengthSlider)
    // optionsLayout.AddChild(ballPushStrengthLabel)
    // optionsLayout.AddChild(ballPushStrengthSlider)
    // optionsLayout.AddChild(gridVisibilityBtn)
    // optionsLayout.AddChild(ballsPerSegmentText);
    // optionsLayout.AddChild(ballsPerSegmentSlider);
    // optionsLayout.AddChild(gridRowsText)
    // optionsLayout.AddChild(gridRowsSlider)
    // optionsLayout.AddChild(gridColumnsText)
    // optionsLayout.AddChild(gridColumnsSlider)
    // optionsLayout.AddChild(reloadBtn)

    // optionsLayout.AddChildAt(gridVisibilityBtn, 2)
    // optionsLayout.AddChildAt(reloadBtn, 0)

    // uiLayout.AddChild(radiusVisibilityBtn);
    // uiLayout.AddChild(radiusSliderText)
    // uiLayout.AddChild(radiusSlider)
    // uiLayout.AddChild(ballPullStrengthLabel)
    // uiLayout.AddChild(ballPullStrengthSlider)
    // uiLayout.AddChild(ballPushStrengthLabel)
    // uiLayout.AddChild(ballPushStrengthSlider)
    // uiLayout.AddChild(gridVisibilityBtn)
    // uiLayout.AddChild(ballsPerSegmentText);
    // uiLayout.AddChild(ballsPerSegmentSlider);
    // uiLayout.AddChild(gridRowsText)
    // uiLayout.AddChild(gridRowsSlider)
    // uiLayout.AddChild(gridColumnsText)
    // uiLayout.AddChild(gridColumnsSlider)
    // uiLayout.AddChild(reloadBtn)

    // add layout to scene
    constellationScene.AddChild(uiLayout)



    // all unaccounted for/leftover objects to be recursively destroyed when unloading scene
    objectsToDestroy.push(uiLayout);
    // objectsToDestroy.push(menuGoBackBtn);

}

// generates balls and puts them on the canvas, gives them a velocity too
function GenerateBalls() {
    // remove any balls rendered in scene already
    RemoveAllBalls();

    // How many segments the grid will be divided to among each axis. Each number must be greater than 0
    // E.g. 1 rows means just the whole screen on y axis while 3 columns means 3 different sections with 2 dividing lines in total on x axis
    let segmentQuantities = {
        rows: gridRows,
        columns: gridColumns
    };

    // just generate for now
    gridSegments = GenerateGridSegments(segmentQuantities);

    let ballMagnitudeRange = [0.75, 1]; // range of a ball's magnitude. First unit vector is generated and then this magnitude is applied

    let ballRadiusRange = [0.075, 0.1]; // range of a ball's radius

    // get size in units
    let canvasSize = GetCanvasSizeInUnits();

    // Get the size of each grid segment
    let segmentSize = new Point(
        canvasSize.width / segmentQuantities.columns,
        canvasSize.height / segmentQuantities.rows)

    // loop through grid
    for (let rowIndex = 0; rowIndex < segmentQuantities.rows; rowIndex++) {
        // then for this row, do columns
        for (let columnIndex = 0; columnIndex < segmentQuantities.columns; columnIndex++) {
            // Get the bottom-left position of this segment
            let segmentPos = gridSegments[rowIndex][columnIndex];

            // Generate x amount of balls
            for (let ballIndex = 0; ballIndex < ballsPerSegment; ballIndex++) {
                let ballPos = new Point(
                    // generate a random x value for the new ball pos inside the segment between left and right side
                    GetRandomRange(segmentPos.x, segmentPos.x + segmentSize.x),
                    // generate a random y value for the new ball pos inside the segment between bottom and top side
                    GetRandomRange(segmentPos.y, segmentPos.y + segmentSize.y)
                )

                // Get unit vector (value from -1 to 1)
                let ballVelocity = new Point(
                    GetRandomRange(-1, 1),
                    GetRandomRange(-1, 1)
                )

                // if velocity came out to be 0
                if (ballVelocity == new Point(0, 0)) {
                    // either be (-1,0) or (1,0) or (0,-1) or (0,1)
                    let roll = Math.random();
                    if (roll >= 0 && roll < 0.25)
                        ballVelocity = new Point(-1, 0)
                    else if (roll >= 0.25 && roll < 0.5)
                        ballVelocity = new Point(1, 0)
                    else if (roll >= 0.5 && roll > 0.75)
                        ballVelocity = new Point(0, -1)
                    else
                        ballVelocity = new Point(0, 1)
                }

                // Times unit vector by randomly generated magnitude in a certain range
                ballVelocity = VecMath.ScalarMultiplyVec(ballVelocity, GetRandomRange(ballMagnitudeRange[0], ballMagnitudeRange[1]));

                // Now actually create the game object
                let ball = new Circle(game, ballPos.x, ballPos.y, GetRandomRange(ballRadiusRange[0], ballRadiusRange[1]))

                // add collider to ball
                ball.collider = new CircleCollider();

                // turn off gravity and drag
                ball.gravityEnabled = false;
                ball.dragEnabled = false;
                ball.positionMethod = PositionMethod.Absolute

                // set velocity
                ball.velocity = ballVelocity;

                // Now add to scene and list of balls array
                ballsInScene.push(ball);
                constellationScene.AddChild(ball);

            }
        }

    }
}

// will generate like the non UI stuff
function GenerateMainVisuals() {
    GenerateBalls();

    // draw lines for first time
    DrawAllLines();

    // redraw grid if suposed to be visible as it may changed
    if (gridIsVisible) {
        RemoveGridlines();
        GenerateGridLines();
    }
}



// #region UI event handling --

function HandleGridVisibilityBtnUp() {
    if (gridIsVisible) {
        HideGrid();
        gridIsVisible = false
    }
    else {
        ShowGrid();
        gridIsVisible = true
    }

}

function HandleRadiusBtnUp() {
    if (radiusVisible) {
        HideRadius();
        radiusVisible = false
    }
    else {
        ShowRadius();
        radiusVisible = true
    }
}

// #endregion

function ReloadVisual() {
    // don't do anything if currently still reloading
    if (reloading)
        return
    reloading = true;
    reloadBtn.text = "Reloading ..."
    // clear main stuff
    ClearMainVisuals();
    // redraw it all
    GenerateMainVisuals();


    reloading = false; // set up next reload
    reloadBtn.text = "Reload"
}

// generates grid and adds them to a gridLines array and scene 
function GenerateGridLines() {
    // generate grid lines for scene
    if (!gridSegments)
        throw new Error("grid segments is null, this shouldn't happen")

    // grid segments are 
    /**
     * A 2D array of grid segments, indexed by [row][column] or [y][x]
     * Each index contains a point which represents the bottom-left of the segment. 
     * The grid is basically divided so a certain amount of balls will generate in each segment to keep things consistent and spread out.
     * The bounds of a segment can be gotten because the size of each segment is fixed among them all
    */

    let canvasSize = GetCanvasSizeInUnits();

    // get segment quantities. Each row will have equal amounts of columns btw
    let segmentQuantities = {
        rows: gridSegments.length,
        columns: gridSegments[0].length
    }

    // alpha of grid lines
    let lineAlpha = 0.5;

    // generate a line for each row
    for (let rowIndex = 0; rowIndex < segmentQuantities.rows + 1; rowIndex++) {
        // row y pos cos its just a vertical line
        let rowYPos = canvasSize.height / segmentQuantities.rows * rowIndex;
        // from start to end of line
        let startPos = new Point(0, rowYPos);
        let endPos = new Point(canvasSize.width, rowYPos)

        // console.log(startPos,endPos)

        let newLine = new GameObject(game, CreateLineGraphics(startPos, endPos, 2), false, false);
        newLine.alpha = lineAlpha

        gridLines.push(newLine);

        constellationScene.AddChild(newLine)
    }

    // generate a line for each column
    for (let columnIndex = 0; columnIndex < segmentQuantities.columns + 1; columnIndex++) {
        // column y pos cos its just a vertical line
        let colXPos = canvasSize.width / segmentQuantities.columns * columnIndex;
        // from start to end of line
        let startPos = new Point(colXPos, 0);
        let endPos = new Point(colXPos, canvasSize.height)

        // console.log(startPos,endPos)

        let newLine = new GameObject(game, CreateLineGraphics(startPos, endPos, 2), false, false);
        newLine.alpha = lineAlpha
        gridLines.push(newLine);

        constellationScene.AddChild(newLine)
    }
}

// removes grid lines from scene and array
function RemoveGridlines() {
    // remove grid lines from scene
    constellationScene.RemoveChildren(gridLines, true, true)
    // by setting grid lines to empty array, each object is no longer referenced and the gc will clean it up
    gridLines = []
}

function ShowGrid() {
    gridVisibilityBtn.text = "Hide grid"

    GenerateGridLines();
}

function HideGrid() {
    gridVisibilityBtn.text = "Show grid"

    RemoveGridlines();
}

function ShowRadius() {
    radiusVisibilityBtn.text = "Hide push/pull radius"

    // move and make visible
    moveRadiusToPointer();
    radiusObj.isVisible = true;

}

function HideRadius() {
    radiusVisibilityBtn.text = "Show push/pull radius"

    radiusObj.isVisible = false
}

function resizeRadius() {
    // set width and height to diameter
    radiusObj.width = pushPullRadius * 2;
    radiusObj.height = pushPullRadius * 2;
}

function moveRadiusToPointer() {
    radiusObj.position = game.pointerPos;
}

let linesInScene = [];
let lineWidth = 1; // in pixels
function RemovePreviousLines() {

    constellationScene.RemoveChildren(linesInScene, true, true)
    linesInScene = []// fine to use cos no references

    // while (linesInScene.length > 0) {
    //     let line = linesInScene[0];
    //     // remove from scene and call destructor
    //     constellationScene.RemoveChild(line, true)
    //     linesInScene.shift() // clear out array
    // }
}

function RemoveAllBalls() {
    constellationScene.RemoveChildren(ballsInScene, true, true)
    ballsInScene = [] // fine to use cos no references
}

// creates line graphics from two points and returns it

/**
 * Create line graphics to add to scene. Keep in mind lines shouldn't share pos and size
 * @param {*} point1 point 1 of line in GAME UNITS
 * @param {*} point2 point 2 of line in GAME UNITS
 * @param {Number} strokeWidth stroke width in PIXELS 
 * @returns The created line graphics
 */
function CreateLineGraphics(point1, point2, strokeWidth) {
    // convert points into pixel points
    let pixelP1 = game.ConvertUnitsToRawPixels(point1);
    let pixelP2 = game.ConvertUnitsToRawPixels(point2);
    let newLineGraphics = new Graphics()
        .moveTo(pixelP1.x, pixelP1.y)
        .lineTo(pixelP2.x, pixelP2.y)
        .stroke({
            color: "white",
            width: strokeWidth
        })


    return newLineGraphics;
}

// draws all lines for a scene between all balls.
// Alpha depends on distance between each ball

// The range of squared distance that a ball can be in, the closer it is to minimum the brighter it is, the closer it is to maximum the less visible it is
let ballSqrDistanceRange = [0.2 ** 2, 2 ** 2];
let maxLinesPerBall = 6; // maximum number of lines that can be drawn per ball
function DrawAllLines() {
    // first remove any previously rendered ones
    RemovePreviousLines();

    // // have a list of pairs that have had a line calculated to them already, then skip if the pair has already been done
    // // the array will be full of arrays with two ball gameObjects (they are just stored as references so it won't be a burden on memory)
    // let calculatedPairs = [];


    for (let ball1Index = 0; ball1Index < ballsInScene.length; ball1Index++) {
        let ball1 = ballsInScene[ball1Index];
        let linesDrawn = 0;
        for (let ball2Index = 0; ball2Index < ballsInScene.length; ball2Index++) {
            if (linesDrawn > maxLinesPerBall)
                break; // go onto the next ball, skip this loop

            let ball2 = ballsInScene[ball2Index];
            if (ball1 == ball2)
                continue; // don't draw to self

            // // don't draw line if it has already been calculated
            // let pairExists = false;
            // for (const pair of calculatedPairs) {
            //     // If pair exists
            //     if (pair[0] == ball1 && pair[1] == ball2
            //         ||
            //         pair[0] == ball2 && pair[1] == ball1) {
            //         pairExists = true;
            //     }
            // }

            // if (pairExists)
            //     continue; // skip this iteration if pair has been calculated already



            // add pairs to list of drawn ones
            // calculatedPairs.push([ball1, ball2])

            // ok so get distance, if this ball is in range for distances with other balls, draw

            let distanceSquared = VecMath.SqrDistance(ball1.position, ball2.position)

            // if the distance is higher than or equal to max range, don't render it's too far away
            if (distanceSquared >= ballSqrDistanceRange[1])
                continue; // skip

            // This is the percentage of the distance squared that it is inside of the range. E.g. if range is 0 to 10 and distance is a 2. Then it's percentage would be 80%
            // That's why I do 1- because it's like the inversepercentage from 1 and the percentage of the range is basically how you get brightness
            // also do max-min for range because I want it to clamp properly to bounds of range
            let distancePercentage = (distanceSquared / (ballSqrDistanceRange[1] - ballSqrDistanceRange[0]))

            // not you inner wolf, this is the brightness of line n that yo
            let alpha = 1 - Clamp(distancePercentage, ballSqrDistanceRange[0], ballSqrDistanceRange[1])
            // console.log(distancePercentage, ballSqrDistanceRange, alpha)



            // Create the line
            let lineGraphics = CreateLineGraphics(ball1.position, ball2.position, lineWidth)

            lineGraphics.alpha = alpha;

            // Make sure that the line is behind the ball
            lineGraphics.zIndex = -1

            // game object
            let line = new GameObject(game, lineGraphics, false, false); // don't share size and pos
            line.gravityEnabled = false;

            // add to scene
            constellationScene.AddChild(line);
            // add to list of created lines
            linesInScene.push(line);

            linesDrawn++;
        }


    }
}

// For ball to mouse view my graph
// https://www.desmos.com/calculator/dl8hdrfrmx 

function PullAllBallsToMouse(game) {
    // get pointer pos from the game
    let pointerPos = game.pointerPos;

    // iterate through all balls
    for (const ball of ballsInScene) {
        // lowkey the distance value (uses square root) isn't too laggy huh
        let distanceToMouse = VecMath.Distance(ball.position, pointerPos); // distance of ball to mouse
        // must be close enough to ball
        if (distanceToMouse >= pushPullRadius)
            continue;
        // ball to mouse pos vector
        let ballToPointerVector = VecMath.SubtractVecs(pointerPos, ball.position)
        // The father away the ball is, the stronger the pull. You then times this by pull strength to make it more or less powerful
        let newVelocity = VecMath.ScalarMultiplyVec(VecMath.ScalarMultiplyVec(ballToPointerVector, distanceToMouse), ballsPullStrength);
        // Get the difference from this velocity to the new velocity, 
        let deltaSec = game.ticker.deltaMS / 1000;
        let differenceVec = VecMath.SubtractVecs(newVelocity, ball.velocity);
        //then times that distance by time since last frame to make the push effect happen over time
        differenceVec = VecMath.ScalarMultiplyVec(differenceVec, deltaSec)

        ball.velocity = VecMath.AddVecs(ball.velocity, differenceVec)
    }
}

// let ballsPushStrength = 10;
function PushAllBallsAwayFromMouse(game) {
    // get pointer pos from the game
    let pointerPos = game.pointerPos;

    // iterate through all balls
    for (const ball of ballsInScene) {
        // lowkey the distance value (uses square root) isn't too laggy huh

        // But just use square distance because it will push more
        let distanceToMouse = VecMath.Distance(ball.position, pointerPos); // distance of ball to mouse
        // must be close enough to ball
        if (distanceToMouse >= pushPullRadius)
            continue;
        // ball to mouse pos vector. You then inverse this (* -1) to get the push away effect
        let ballToPointerVector = VecMath.ScalarMultiplyVec(VecMath.SubtractVecs(pointerPos, ball.position), -1)
        // The closer the ball is, the stronger the push. You then times this by push strength to make it more or less powerful
        let newVelocity = VecMath.ScalarMultiplyVec(VecMath.ScalarDivideVec(ballToPointerVector, distanceToMouse), ballsPushStrength);
        // Get the difference from this velocity to the new velocity, 
        let deltaSec = game.ticker.deltaMS / 1000;
        let differenceVec = VecMath.SubtractVecs(newVelocity, ball.velocity);
        //then times that distance by time since last frame to make the push effect happen over time
        differenceVec = VecMath.ScalarMultiplyVec(differenceVec, deltaSec)

        ball.velocity = VecMath.AddVecs(ball.velocity, differenceVec)
    }
}

function ProcessUserInputs(game) {
    // Check pointers
    if (leftPointerDown) {
        PullAllBallsToMouse(game);
    } else if (rightPointerDown) {
        PushAllBallsAwayFromMouse(game);
    }

}

function UpdateText(game) {
    if (lineCountTextLbl)
        lineCountTextLbl.text = lineCountDefaultText + linesInScene.length

    if (ballCountTextLbl)
        ballCountTextLbl.text = ballCountDefaultText + ballsInScene.length
}

function ConstellationVisualOnTick(game) {
    // deal with user inputs (like pointer or keyboard and stuff)
    ProcessUserInputs(game);

    // draw new lines (removes old)
    DrawAllLines();
    UpdateText(game);
    if (radiusVisible)
        moveRadiusToPointer();
}

// clears the main visuals for scene(not stuff like UI)
function ClearMainVisuals() {
    RemovePreviousLines();
    RemoveAllBalls();
}

function ConstellationVisualUnload(game) {
    // remove all events
    for (const eventDataToDestroy of pixiEventsToDestroy) {
        eventDataToDestroy[0].removeEventListener(eventDataToDestroy[1], eventDataToDestroy[2])
    }

    for (const eventDataToDestroy of gameObjEventsToDestroy) {
        eventDataToDestroy[0].RemoveEventListener(eventDataToDestroy[1], eventDataToDestroy[2])
    }

    // destroy all objects

    // start with ones in arrays by calling their predone remove functions
    ClearMainVisuals();
    HideGrid();

    // now remove the rest
    constellationScene.RemoveChildren(objectsToDestroy, true, true)

    game.activeScene = null



}

// #endregion

// #region screen borders scrtipt

function ScreenBordersLoad(game) {
    // console.log(GetCanvasSize());
}

function ScreenBordersOnTick(game) {
    if (!game.activeScene)
        return
    // loop through all game objects if they're not static then make sure they're inside the screen bounds 
    // let gameObjectsInScene = game.activeScene.children;

    let canvasSize = GetCanvasSizeInUnits();

    // iterate through all descendant game objects in scene. Function runs per descendant
    game.activeScene.IterateDescendants((gameObject) => {
        // do nothing when static (not moving)
        if (gameObject.static)
            return; // skip

        if(gameObject.positionMethod != PositionMethod.Absolute)
            return; // skip

        // else check if position is out of bounds and then move accordingly and change velocity

        let objectX = gameObject.x;
        let objectY = gameObject.y;

        // the x and y are the centres so offset them by width and height because this function is made for rects
        if (gameObject.isACircle) {
            objectX -= gameObject.width / 2;
            objectY -= gameObject.height / 2;
        }

        // check x-axis is out of left
        if (objectX < 0) {
            objectX = 0
            // force right
            gameObject.velocity.x = Math.abs(gameObject.velocity.x);
        } else if (objectX > canvasSize.width - gameObject.width) { // out right
            objectX = canvasSize.width - gameObject.width
            // force left
            gameObject.velocity.x = -Math.abs(gameObject.velocity.x);
        }

        // check y-axis is out bottom
        if (objectY < 0) {
            objectY = 0
            // force up
            gameObject.velocity.y = Math.abs(gameObject.velocity.y);
        } else if (objectY > canvasSize.height - gameObject.height) { // out top
            objectY = canvasSize.height - gameObject.height
            gameObject.velocity.y = -Math.abs(gameObject.velocity.y);
        }

        // set new x and y

        // remove offset
        if (gameObject.isACircle) {
            objectX += gameObject.width / 2;
            objectY += gameObject.height / 2;
        }

        gameObject.x = objectX;
        gameObject.y = objectY
    })

}

// # endregion

// #region node testing



let rect0
let rect0_0
let rect0_1
let rect0_1_1

let nodeScene;
let nodeLoadTick = 0;// each time the script is loaded add 1 to tick

// tests that nodes are ordered and operate properly
function nodeTestLoad(game) {
    if (!nodeScene)
        nodeScene = new Scene(game)

    let currentTick = ++nodeLoadTick;


    game.activeScene = nodeScene
    // Game node and scene testing 

    // Add objects to scene

    // For each rect the layer is represented by index and then its value is position in laywr
    // E.g. rect0_0 is layer 0->layer 1, index 0 
    // E.g. rect1 is layer0, index 1


    // layer 0

    rect0 = new GameObject(game,
        new PIXI.Graphics()
            .rect(0, 0, 1, 1)
            .fill("white"))

    rect0.label = "rect0"

    rect0.position = new Point(7, 16)

    // layer 1

    rect0_0 = new GameObject(game,
        new PIXI.Graphics()
            .rect(0, 0, 1, 1)
            .fill("grey"))

    rect0_0.label = "rect0_0"

    rect0_0.position = new Point(3, 15)

    rect0_1 = new GameObject(game,
        new PIXI.Graphics()
            .rect(0, 0, 1, 1)
            .fill("grey"))

    rect0_1.label = "rect0_1"

    rect0_1.position = new Point(11, 15)

    // layer 2

    let rect0_0_0 = new GameObject(game,
        new PIXI.Graphics()
            .rect(0, 0, 1, 1)
            .fill("black"))

    rect0_0_0.label = "rect0_0_0"

    rect0_0_0.position = new Point(1, 14)

    let rect0_0_1 = new GameObject(game,
        new PIXI.Graphics()
            .rect(0, 0, 1, 1)
            .fill("black"))

    rect0_0_1.label = "rect0_0_1"

    rect0_0_1.position = new Point(5, 14)

    let rect0_1_0 = new GameObject(game,
        new PIXI.Graphics()
            .rect(0, 0, 1, 1)
            .fill("black"))

    rect0_1_0.label = "rect0_1_0"

    rect0_1_0.position = new Point(9, 14)

    rect0_1_1 = new GameObject(game,
        new PIXI.Graphics()
            .rect(0, 0, 1, 1)
            .fill("black"))

    rect0_1_1.label = "rect0_1_1"

    // rect0_1_1.static = true 

    rect0_1_1.position = new Point(13, 14)

    let firstDelay = 1000; // ms
    let delayInterval = 500;

    // add children after scene is created
    let afterScene = true

    // add delays so children are added after scene is created
    if (afterScene) {
        setTimeout(() => {
            if (currentTick == nodeLoadTick) { rect0.AddChild(rect0_0) }
        }, firstDelay + delayInterval * 6)
        setTimeout(() => { if (currentTick == nodeLoadTick) { rect0.AddChild(rect0_1) } }
            , firstDelay + delayInterval)
        setTimeout(() => { if (currentTick == nodeLoadTick) { rect0_0.AddChild(rect0_0_0) } }, firstDelay + delayInterval * 3)
        setTimeout(() => { if (currentTick == nodeLoadTick) { rect0_0.AddChild(rect0_0_1) } }, firstDelay + delayInterval * 2)
        setTimeout(() => { if (currentTick == nodeLoadTick) { rect0_1.AddChild(rect0_1_0) } }, firstDelay + delayInterval * 4)
        setTimeout(() => { if (currentTick == nodeLoadTick) { rect0_1.AddChild(rect0_1_1) } }, firstDelay + delayInterval * 3.7)
        // after x seconds, change a child's stage object. This should update correctly
        setTimeout(() => {
            if (currentTick == nodeLoadTick) {
                // Same as https://www.w3schools.com/graphics/canvas_gradients.asp
                let gradientFill = new PIXI.FillGradient(0, 0, 0, 1) // only do gradient along y-axis 
                gradientFill.addColorStop(0, "blue")
                gradientFill.addColorStop(1, "red")
                rect0_1_1.SetStageObject(new PIXI.Graphics()
                    //  .rect(0,0,1,1)
                    .roundRect(0, 0, 1, 1, 0.1)
                    //  .fill("red")
                    .fill(gradientFill)
                    ,
                    true, true)
            }
            // console.log(rect0_1_1)
        }, firstDelay + delayInterval * 5.5);

        // !! STAGE OBJECT BUG, why does it just freeze?
        setTimeout(() => {
            if (currentTick == nodeLoadTick) {
                rect0_0.SetStageObject(new PIXI.Graphics()
                    .rect(0, 0, 1, 1)
                    .fill("green"), true, true)
            }
        }, firstDelay + delayInterval * 9);

    } else {
        rect0.AddChild(rect0_0)
        rect0.AddChild(rect0_1)
        rect0_0.AddChild(rect0_0_0)
        rect0_0.AddChild(rect0_0_1)
        rect0_1.AddChild(rect0_1_0)
        rect0_1.AddChild(rect0_1_1)


    }

    // remove children


    // for debugging
    // globalThis.rect0 = rect0
    // globalThis.rect0_0 = rect0_0
    // globalThis.rect0_1 = rect0_1
    // globalThis.rect0_0_0 = rect0_0_0
    // globalThis.rect0_0_1 = rect0_0_1
    // globalThis.rect0_1_0 = rect0_1_0
    // globalThis.rect0_1_1 = rect0_1_1



    // add to scene
    nodeScene.AddChild(rect0)

    // -- LAYOUT TESTING --
    let canvasSize = GetCanvasSizeInUnits();

    // default font sizes in game units
    let headingFontSize = canvasSize.height * 0.075
    let bigFontSize = canvasSize.height * 0.035
    let mediumFontSize = canvasSize.height * 0.025

    // Define layout where all UI game objects will be underneath to make them look ordered
    let layout1 = new GameObjectLayout(game);
    layout1.backgroundFill="#1c1c1c"

    let layout1Btn = new Button(game, "Layout 1 btn", false);

    layout1Btn.fontSize = defaultTextFontSize;
    layout1Btn.backgroundStroke = {
        color: "black",
        width: 2
    }

    let layout2 = new GameObjectLayout(game);
    layout2.label = "layout2"
    layout2.backgroundFill = "#434343"

    let layout2Label = new TextLabel(game, "Layout 2 text", false)
    layout2Label.fontSize = defaultTextFontSize;

    let layout3Slider = new Slider(game, 0.1, 100, 0.1, 5);
    let layout3Label = new TextLabel(game, "Layout 3 text", false)
    layout3Label.fontSize = defaultTextFontSize

    let layout3 = new GameObjectLayout(game);
    layout3.label = "layout3"
    layout3.backgroundFill = "#7d7d7d"

    // layout1.position = new Point(canvasSize.width/2, canvasSize.height/2);
    layout1.position = new Point(0.25, canvasSize.height - 0.25);
    // layout1.layoutOrientation = LayoutOrientation.VerticalUp
    // layout2.layoutOrientation = LayoutOrientation.HorizontalLeft
    // layout3.layoutOrientation = LayoutOrientation.HorizontalRight
    // uiLayout.margin = new Padding(0.2,0.1,0.3,0.4)

    layout1.alpha = 0.75;

    layout1.label = "layout1"

    // make a layout expander that expands the options layout
    let layoutExpander = new LayoutExpander(game, "Options")

    layoutExpander.fontSize = defaultTextFontSize;
    layoutExpander.backgroundStroke = {
        color: "black",
        width: 2
    }

    // layout1.AddChild(layout1Btn)

    layout1.AddChild(layout2)
    // layout2.AddChild(layout3)
    // layout2.AddChild(layout2Label)
    // layout3.AddChild(layout3Label)
    // layout3.AddChild(layout3Slider)

    nodeScene.AddChild(layout1)

    globalThis.layout1 = layout1;
    globalThis.layout2 = layout2;
    globalThis.layout3 = layout3;

    // expanders
    let layout0 = new GameObjectLayout(game);
    layout0.AddChild(new TextLabel(game, "Layout 0"))
    layout0.backgroundFill = "hsl(0,0%,0%)"
    let expander2_1 = new LayoutExpander(game, "expander 1")
    expander2_1.backgroundFill = "hsl(0,0%,10%)"
    expander2_1.layoutToExpand.backgroundFill = "hsl(0,0%,10%)"
    let expander2_2 = new LayoutExpander(game, "expander 2")
    expander2_2.backgroundFill = "hsl(0,0%,20%)"
    expander2_2.layoutToExpand.backgroundFill = "hsl(0,0%,20%)"
    let expander2_3 = new LayoutExpander(game, "expander 3")
    expander2_3.backgroundFill = "hsl(0,0%,30%)"
    expander2_3.layoutToExpand.backgroundFill = "hsl(0,0%,30%)"
    let layout2_3_1 = new GameObjectLayout(game)
    layout2_3_1.backgroundFill = "hsl(0,0%,40%)"

    layout0.position = new Point(0.25,14)
    // layout0.position = new Point(canvasSize.width/2,14)
    layout0.layoutOrientation = LayoutOrientation.VerticalDown
    // expander2_1.layoutToExpand.layoutOrientation = LayoutOrientation.VerticalUp

    layout0.AddChild(expander2_1)
    expander2_1.layoutToExpand.AddChild(expander2_2)
    expander2_2.layoutToExpand.AddChild(expander2_3)
    expander2_3.layoutToExpand.AddChild(layout2_3_1)
    layout2_3_1.AddChild(new TextLabel(game, "layout 3.1 Text"))
    nodeScene.AddChild(layout0)

    globalThis.layout0 = layout0;
    globalThis.expander2_1 = expander2_1;
    globalThis.expander2_2 = expander2_2;
    globalThis.expander2_3 = expander2_3;
    globalThis.layout2_3_1 = layout2_3_1;

}

function nodeTestUnload(game) {
    let delayInterval = 500;
    // setTimeout(() => rect0.RemoveChild(rect0_0), delayInterval * 2)
    // setTimeout(() => rect0_1.RemoveChild(rect0_1_1), delayInterval * 3)
    // setTimeout(() => nodeScene.RemoveChild(rect0), delayInterval * 5)
    // setTimeout(() => game.activeScene = null, delayInterval * 7)

    // cleans out the scene
    nodeScene.Clear(true)
    game.activeScene = null



}

// #endregion

// #region memory leak testing


let testBtn;
let testingText;
let testAmntSlider;
let testAmntSliderText;
let testingLayout;
let memoryLeakScene

function memoryLeakLoad(game) {
    if (!memoryLeakScene)
        memoryLeakScene = new Scene(game)
    game.activeScene = memoryLeakScene
    testingLayout = new GameObjectLayout(game);
    testBtn = new Button(game, "Begin test")
    testBtn.backgroundStroke = {
        color: "black",
        width: 2
    }

    testingText = new TextLabel(game, "Not started")

    testAmntSlider = new Slider(game, 10000, 1000000, 10000, 100000)

    let textDefault = "Amount of objects to use for test: "
    testAmntSliderText = new TextLabel(game, textDefault + testAmntSlider.value)

    testAmntSlider.AddEventListener("valueChanged", () => {
        testAmntSliderText.text = textDefault + testAmntSlider.value
    })

    testingLayout.AddChild(testBtn)
    testingLayout.AddChild(testingText)
    testingLayout.AddChild(testAmntSliderText)
    testingLayout.AddChild(testAmntSlider)

    testingLayout.position = new Point(2, 10)


    memoryLeakScene.AddChild(testingLayout)
    testBtn.AddEventListener("pointerUp", () => {
        testingText.text = "testing ..."
        setTimeout(() => {
            for (let i = 0; i < testAmntSlider.value; i++) {
                let testGraphics = new Graphics().rect(0, 0, 1, 1);
                game.pixiApplication.stage.addChild(testGraphics)
                // PIXI.updateTransformAndChildren(testGraphics, game.pixiApplication.stage.renderGroup.updateTick++, 0)
                // game.pixiApplication.stage.renderGroup.updateRenderable(testGraphics)
                // game.pixiApplication.stage.renderGroup.runOnRender()
                game.pixiApplication.stage.removeChild(testGraphics)
                // game.pixiApplication.stage.renderGroup.addRenderGroupChild(testGraphics)

                testGraphics.destroy()
                // testGraphics.parentRenderGroup = game.pixiApplication.stage.renderGroup

                // let testObj = new GameObject(game, null, false, false)
                // // let testObj = new GameObject(game, null, false, false)
                // memoryLeakScene.AddChild(testObj)
                // memoryLeakScene.RemoveChild(testObj, true, true)
            }
            testingText.text = "testing done!"

            console.log()

        }, 50)
        // let testGraphics = new Graphics().rect(0, 0, 1, 1);
        // game.pixiApplication.stage.addChild(testGraphics)
        // game.pixiApplication.stage.removeChild(testGraphics)
        // testGraphics.destroy();
        // globalThis.temp1 = testGraphics
        // console.log(game.pixiApplication.stage.renderGroup)
        // console.log(game.pixiApplication.stage.renderGroup.childrenToUpdate[1].list)

    })


}

function memoryLeakUnload(game) {
    game.activeScene = null
}

// #endregion

// #region menu screen script

// I'm just going to keep the menu scene cached because it's not got much stuff

let menuScene;

// displays the menu btnoon active scene
function DisplayGoBackBtn() {
    if (game.activeScene)
        game.activeScene.AddChild(menuGoBackBtn);
}

function generateMenuUI() {
    let canvasSize = GetCanvasSizeInUnits();
    // default font sizes in game units
    let headingFontSize = canvasSize.height * 0.075
    let bigFontSize = canvasSize.height * 0.035
    let mediumFontSize = canvasSize.height * 0.025

    let titleText = new TextLabel(game, "Menu")
    titleText.fontSize = headingFontSize;


    let menuButtonLayout = new GameObjectLayout(game);

    // add buttons
    let constellationBtn = new Button(game, "Load constellation visual");
    constellationBtn.fontSize = bigFontSize
    constellationBtn.padding = new Padding(0.15, 0.15, 0.15, 0.15)
    constellationBtn.backgroundStroke = {
        color: "rgb(29 30 30)",
        width: 2
    }

    constellationBtn.AddEventListener("pointerUp", () => {
        RemoveLoader(menuScript)
        AddLoader(constellationVisualScript)
        AddLoader(screenBordersScript)

        DisplayGoBackBtn();
    }, constellationBtn)

    // add buttons
    let nodeVisualBtn = new Button(game, "Load node testing");
    nodeVisualBtn.fontSize = bigFontSize
    nodeVisualBtn.padding = new Padding(0.15, 0.15, 0.15, 0.15)
    nodeVisualBtn.backgroundStroke = {
        color: "rgb(29 30 30)",
        width: 2
    }

    nodeVisualBtn.AddEventListener("pointerUp", () => {
        RemoveLoader(menuScript)
        AddLoader(nodeTestScript)
        AddLoader(screenBordersScript)
        DisplayGoBackBtn();
    }, nodeVisualBtn)

    menuButtonLayout.AddChild(constellationBtn)
    menuButtonLayout.AddChild(nodeVisualBtn)

    menuButtonLayout.position = new Point(canvasSize.width / 2 - menuButtonLayout.width / 2, canvasSize.height / 2 + menuButtonLayout.height / 2)
    menuButtonLayout.margin = new Padding(0, 0, 0, 0)
    menuButtonLayout.alpha = 0;


    // set y as a factor between top of layout and screen height
    titleText.position = new Point(canvasSize.width / 2 - titleText.width / 2, menuButtonLayout.y + (canvasSize.height - menuButtonLayout.y) / 4)

    menuScene.AddChild(titleText);
    menuScene.AddChild(menuButtonLayout);

    if (!menuGoBackBtn)
        menuGoBackBtn = new Button(game, "<-- Go back to menu");
    menuGoBackBtn.fontSize = mediumFontSize

    // menu go back btn
    menuGoBackBtn.position = new Point(0.25, 0.25)
    menuGoBackBtn.AddEventListener("pointerUp", () => {
        if (game.activeScene)
            game.activeScene.RemoveChild(menuGoBackBtn, false)

        // unload
        if (screenBordersScript.isLoaded)
            RemoveLoader(screenBordersScript)
        if (constellationVisualScript.isLoaded)
            RemoveLoader(constellationVisualScript)
        if (nodeTestScript.isLoaded)
            RemoveLoader(nodeTestScript)


        // load 
        AddLoader(menuScript)
    }, menuGoBackBtn)

    menuGoBackBtn.backgroundStroke = {
        color: "rgb(29 30 30)",
        width: 2
    }

    menuGoBackBtn.zIndex = 99

    globalThis.titleText = titleText;
}

// just generates the menu scene and sets it to the local var. 
function generateMenuScene() {
    menuScene = new Scene(game)
    generateMenuUI();

}

function loadMenu() {
    if (!menuScene)
        generateMenuScene();

    game.activeScene = menuScene;
}

function unloadMenu() {
    // just remove menu as active scene for now
    game.activeScene = null;
}

// #endregion

// END OF DOCUMENT