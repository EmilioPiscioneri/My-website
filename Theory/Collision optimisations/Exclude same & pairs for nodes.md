### The issue
Ok so the excluding same and repeating pairs theory uses a 1D array of elements.

I use it for avoiding repeating calculations between pairs of GameObjects that have already been iterated as well as avoiding iterating a GameObject with itself (collisions shouldn’t happen when between an object and itself)

### The solution 
The algorithm requires the 1D array because it will access each element using an index and we want to iterate over every single GameObject as physics are applied to each regardless of parent or child (maybe except in some cases, I’m yet to figure that out)

So to fix this solution every scene has a .stageObjects variable which basically holds all of the GameObject’s rendered objects on screen. 

So what we do is whenever a stageObject is added to a GameObject (eventually might end up in the scene) we just add a .parentGameObject variable so we can iterate through .stageObjects and the algorithm remains the same

**An issue**
However if we use this then we won’t be able to apply physics to an object without a stageObject. So to get around this you just add an empty stage object and set to not visible

