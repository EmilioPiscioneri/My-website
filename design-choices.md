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

- graphics/primitive-playgound: The graphics renderer is designed for ES6 (ECMAScript 2015) aka modern browsers

- graphics/primitive-playgound: You can only collide objects with border of screen. This is due to the fact that object collisions between hitboxes and other polygons would require a lot more time and math than I can currently dedicate to this project. 

- graphics/primitive-playgound: I made custom game objects. Each point that references positions is done so from bottom-left with cartesian like behaviour (positive y is up)

- graphics/primitive-playgound: Due to me making the position coordinates cartesian like, you cannot do object.position.x += 5. Instead you just do object.x += 10 and so on. Also you need to set position to 0,0 when creating graphics and then set them in the game object 

- graphics/primitive-playgound:I am keeping all the different classes for the game in one file because it means it is easier to import into other projects which will likely use it too