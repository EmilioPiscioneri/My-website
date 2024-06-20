### Limitations
- For blacklists in dynamic loading. I didn't make it so you could blacklist directories.  
I don't have a need for it right now and it won't be hard to add later

- graphics/game.js: You may run into a memory leak issue if you do something like create a tonne of game objects because each created one is subscribed to the game pixelsperunit event but that is now fixed by registered listeners

- graphics/visuals.js: Due to how the javascript pointer events work, if you click your left mouse and then your right and let go of the left mouse. Because the right mouse is still held down no pointer up event is fired