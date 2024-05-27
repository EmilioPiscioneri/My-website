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

- graphics/primitive-playgound: I decided to use the existing graphics objects and the pixi stage container because there isn't a need in js to add a seperate class when I can just add to the existing classes. This also isn't supposed to be a robust system, may need to rework this part

