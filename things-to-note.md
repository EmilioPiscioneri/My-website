
### game.js V 0.3

- As I've gone on, I have changed some names to ones that are more fitting. Things like
  - graphicsObject changed to stageObject

- I named GameNodes "GameNode" and not just Node because Node is a native js class.

- For scenes, child added event gets fired first then the stage object added events are fired. Same for removed events

- Whenever you change a GameObject's .stageObject or call GameObject.Destruct() method, it will destroy its old stageObject (can cause problems) to prevent memory leaks unlesss you specify otherwise in parameter

- As of 14/07/24. Currently PIXI.js 8.1.5 (maybe lower) to 8.2.2 (not much more released) is experiencing a memory leak bug. To replicate you add a stage object, remove it, then delete it straight after. If you wait for a tick to pass it won't be an issue. See https://github.com/pixijs/pixijs/issues/10719

- visibilityChanged event fires after descendants have also had visibilityChanged

- To change a game objects stage object you do .SetStageObject()

- For game objects, when they are added the "added" events will fire first before the child is positioned correctly under the object

- The gravity calculations are done for absolute objects (or parent is scene or parent has physics not enabled ) so children don't have physics applied to them. Just keep note of that

- For game objects the .position property represents the bottom-left position of object in cartesian game unit coordinates with all relative axes translated and added to .x and .y values. However, the ._position value represents the position to render the object at, and it also contains the relative axes that haven't been translated. This also means that the .x and .y values represent bottom-left positions with their getters and setters.