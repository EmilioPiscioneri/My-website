
### game.js V 0.3

- As I've gone on, I have changed some names to ones that are more fitting. Things like
  - graphicsObject changed to stageObject

- I named GameNodes "GameNode" and not just Node because Node is a native js class.

- For scenes, child added event gets fired first then the stage object added events are fired. Same for removed events

- Whenever you change a GameObject's .stageObject or call its .Destruct() method, it will destroy its old stageObject to prevent memory leaks 
