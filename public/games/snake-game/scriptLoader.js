/**
 * This class just calls different Scripts and easily attaches to an on tick callback so that everything else can fire off it too
 */
export default class ScriptLoader {
    scripts = []; // an array of script objects that are active. This ensures their onTick function is fired correctly


    /**
     * @param {Game} game The game to attach the on tick handler to
     */
    constructor(game) {
        if(!game)
            throw new Error("Didn't initialise script loader with a game object")
        game.AddEventListener("tick", this._TickCallback);
    }

    /**
     * Adds a script to manage and calls it's load function
     * @param {Script} scriptToAdd 
     */
    AddLoader(scriptToAdd) {
        if (this.scripts.indexOf(scriptToAdd) != -1) {
            console.warn("Tried to add a loader to scene that already has been added")
            return;
        }

        scriptToAdd.Load();
        this.scripts.push(scriptToAdd);
    }

    /**
     * Removes a script from AND calls it's unload function
     * @param {Script} scriptToRemove 
     */
    RemoveLoader(scriptToRemove) {

        let scriptIndex = this.scripts.indexOf(scriptToRemove)
        if (scriptIndex != -1) {
            scriptToRemove.Unload(); // unload
            this.scripts.splice(scriptIndex, 1); // remove from array
        } else
            console.warn("Tried to remove a loader that hasn't been added to scene")
    }

    // callback to attach to just a games tick function
    _TickCallback = ()=> {
        for (const script of this.scripts) {
            script.OnTick(); // call on tick function
        }
    }
}


/**
 * This class just contains three different functions that should be loaded, run on tick and unloaded thats it. 
 */
export class Script {
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
        // should only be loaded once
        if (this.isLoaded) {
            console.warn("Try to load a script that is already loaded, skipping")
            return;
        }
        this.isLoaded = true;
        if (typeof (this._loadFunction) == "function")
            this._loadFunction(this.game);
        // this.FireListener("loaded");
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
        // this.FireListener("unloaded")
    }
}