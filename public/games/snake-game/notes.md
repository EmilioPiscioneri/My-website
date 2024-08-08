For this time round I'm going to try and experiment with using modules but the issue I have is that they aren't fully supported so I'll need other things ot make it work like babel or other compiling tools with NODE js but at a later date.  
I would use modules for game.js but I'm going to do that at a later date

There is a way for you to actually gain speed when you shouldn't. So normally the snake will move every x ms but if you hit a key that will change the snake's direction it will bypass that wait time and just move. This means you can change moves where you going in different directions to bypass the wait time and then gain speed. I'm leaving this behaviour in there because the bypass timer when you click an arrow key is a key game mechanic

I didn't finish the unload/remove scene code cos it won't be unloaded in its current state (dedicated webpage only showing the game) but that's a quick thing anyway