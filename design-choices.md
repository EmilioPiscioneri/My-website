### Design choices
- The style is responsive with viewport size.  
This means that when you do view desktop on mobile in safari, it will not change the page.  
I chose to do this because there is no need for two seperate css stylesheets as it will cause more difficulty when changing things in the future.

- The style of the website is a dark theme.  
I like dark theme.  
Maybe I'll make it an optional later.

- The /public/main/ directory contains files that are universal for all webpages. Each page will then have its own page specific css or js if needed

- The /templates/ directory has templates for different things that start as a base and then can be added to.  
E.g. I plan to add dynamic sites so I need a template one

- Nav data is an array of objects.

- The .env file doesn't add security once my system is compromised but it does stop you all from seeing things I need hidden

- I never have admin cookies expire because I create so little of them it wouldn't even make a difference if I created 10,000 of them

- ~~graphics/primitive-playgound: I decided to use the existing graphics objects and the pixi stage container because there isn't a need in js to add a seperate class when I can just add to the existing classes. This also isn't supposed to be a robust system, may need to rework this part~~

- graphics/primitive-playgound: The graphics renderer is designed for modern browsers. I use different js functions and syntax like classes.

- graphics/primitive-playgound: You can only collide objects with border of screen. This is due to the fact that object collisions between hitboxes and other polygons would require a lot more time and math than I can currently dedicate to this project. 

- graphics/primitive-playgound: I made custom game objects. Each point that references positions is done so from bottom-left with cartesian like behaviour (positive y is up)

- graphics/primitive-playgound: Due to me making the position coordinates cartesian like, you cannot do object.position.x += 5. Instead you just do object.x += 10 and so on. Also you need to set position to 0,0 when creating graphics and then set them in the game object 

- graphics/primitive-playgound:I am keeping all the different classes for the game in one file because it means it is easier to import into other projects which will likely use it too

- graphics/primitive-playgound: You have to manually call destructor for event listener inherited classes e.g. game object, because I needed a way to clear event listeners when the object is no longer needed. This is just a precaution because I am not sure if it will be garbage collected properly

- graphics/primitive-playgound: I use static classes as enums because it is easier for intellisense reasons and doesn't create much overhead
a
- graphics/primitive-playgound: I use a specific downloaded version of pixi.js (not the latest release) to ensure compatability later 

- graphics/primitive-playgound: I have decided to use the library pixi.js and its UI plugin for graphics rendering. It uses WebGL at times which means it's faster and is much more practical to use than making everything on my own. I mean the more I try to make on my own, the closer I get to the straight WIN32 API and assembly and machine code and so on

- graphics/primitive-playgound: For different values that use points (game.pixelsPerUnits or gameobject.position or collider.position) they will only update their values if you change the point itself and don't just reassign their x and y values. This is because the setter and getter is on the point itself and I didn't want to add another point class just with events that's the exact same as pixi
- 
- graphics/game.js: made the event system have registered listeners as a band aid fix to prevent memory leaks from event listeners not being cleared. Although, this could just be solved by removing the event listeners eh

- graphics/game.js: I made it so different classess like buttons employ two game objects such as the background rect and text. However, these objects are seperate and aren't parented, this is because the width and position of each can't be changed independently if they are in a parent-child situation so I opted for doing multiple game objects. The main object keeps track of its other objects and then under the game remove/add game object loop it will check for those objects it keeps track of and then add or remove all of them too

- graphics/game.js: I decided to go for a method of updating properties of game objects only if you change the property on the classes I created, not PIXI objects. I did this because I am unaware of a way to listen for PIXI objects changing properties without having to check every frame for a difference compared to last frame. It is simply easier this way as well and it makes the game library a lot easier to work with. This means if you wanted to change a certain property on the PIXI object you may need to update the Game object accordingly or just call the setter to update. 

### V 0.3 below

- game.js: I decided to add GameNodes even though PIXI js already has a parent-child structure with stage objects. I did this because as with most of the things I am adding where PIXI already implements them, it gives me more control and better compatability with my own code. For example, I reversed the y axis and want origins which is much easier to implement if I just make my own classes. Back to nodes, I wanted to make them their own class because I wanted to add functionality to child/descendant added/removed events and also for the positioning of lower level nodes. As GameObjects (Inherits Node) go down in their child structure I wanted to add relative and absolute positions which I can't currently do with PIXI. This also enables me to easily add and remove children which is something I was finding different classes were sharing the same necessity for
