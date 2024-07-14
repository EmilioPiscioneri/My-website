
### game.js V 0.3

- As I've gone on, I have changed some names to ones that are more fitting. Things like
  - graphicsObject changed to stageObject

- I named GameNodes "GameNode" and not just Node because Node is a native js class.

- For scenes, child added event gets fired first then the stage object added events are fired. Same for removed events

- Whenever you change a GameObject's .stageObject or call its .Destruct() method, it will destroy its old stageObject (can cause problems) to prevent memory leaks

- As of 14/07/24. Currently PIXI.js 8.1.5 (maybe lower) to 8.2.2 (not much more released) is experiencing a memory leak bug. To replicate you add a stage object, remove it, then delete it straight after. If you wait for a tick to pass it won't be an issue. See https://github.com/pixijs/pixijs/issues/10719

- visibilityChanged event fires after descendants have also had visibilityChanged