Date format is australian DD/MM/YY
## Website versioms

### V 0.0 - 7/5/24 - The initial commit
I got bored in class and decided to make a website, we'll see where this goes

### V 0.1 - ?/5/24 - Dynamic website
Made website pages dynamically load based on filesystem structure and .json. 
Added an admin system to easily add or delete pages.
Made a dynamic main js, css, html, footer that all pages share to ensure consistency and designed to allow for scalability and changes.

## Game.js versioms

#### About Game.js
This is talking about the code for a library I afdded to make interfacing with the Graphics rendering library, PIXI.js a lot easier.
It allows me to control more things like displaying things differently to how PIXI does. 
Adding objects to make quick and efficient building, adding physics and so on

### Game V 0.1 - ?/5/24 - Created Game library 
Added game objects and physics loop with basic collisions

### Game V 0.2 - ?/6/24 - Added UI 
Created text labels, text inputs, slider and buttons. 
Text input currently doesnt support multi line text

### Game V 0.3 - 8/7/24 - Nodes and Scenes
This version involves the addition of a node structure and scenes. I also added more functionality to existing classes, changed how some classes are structured, added optimisations and fixed bugs.

### Game V 0.3.1 - 21/7/24 - More node and position functionality
Added game.origin. Added node.AddChildAt(). Added hidden children. Added position methods (relative and absolute positions). 

### Game V 0.3.2 - 23/7/24 - Added support for pivots and relative positions
Pivots are a PIXI function that I interface with. I added bottom-left offsets which specify from the true position or rendered position how to get to the bottom-left position which makes calculations accurate as they will always be using the bottom-left. Added relative positions which positions things relative to parent sizing. Basically all of this was for easier positioning and anchoring objects and also to make my library be able to work with PIXI rotations in a way that makes them actually useful and as much of a pain to deal with.