# AABB collision detection theory

This is theory behind AABB (Axis-aligned bounding box) collisions. An AABB is basically a rectangle that has a fixed rotation, think of a hitbox that doesn't rotate.

*Side note: I spent far too long on this theory document and I will not be doing this again as I often don't have much time. I have a full time job and today is a weekend.  
Also excuse the poor visual image, I am not a visual designer and was never good at art*

### Collision check 
This part will only explain how to check for a collision between two AABBs.  

Figure 1: An image I made to illustrate collisions  
Situation 1 & 2 show 2 overlaps of axes must be present for collision  
Situation 3 shows that the two comparisons for each AABB must be combined to always get collisions in certain cases.  
![alt text](/Theory/Collision%20demonstration/Collision%20demonstration%201%20illustration.png)

The above image displays a simple pattern in AABB.  
In a collision between two AABBs, there is an overlap on the left, right, top or bottom axes/sides. Think of each of the 4 sides of the AABB as their own axis that is limited by the width or height of the AABB.  
You treat each axis seperately when doing the checks

The image demonstrates that if you get any side of an AABB and check if it is between the smallest and largest value for its respective axis, there will be a collision.  

There must be an overlap on two axes/sides for there to be a collision. Therefore, you check for a single collision on horizontal and vertical axes

Also note that you need to check if either of the sides on each AABB collide. This is to prevent certain cases.  
See Figure 1, situation 3 for visual explanation

E.G.  
We are going to do a collision check with the red AABB in figure 1 and the green one.  

The **left side** of the **red** AABB in figure 1 is on the **x axis**.  

As stated before, we need to check that the red AABB's left side is **between the smallest and highest value** of the **green** AABB on the **respective axis**.  

In this case the **respective axis is the x axis** and the smallest and largest value is the **leftmost and rightmost** values.  

Now check that the **left side** of the **red** AABB is **between** the **left and right** side of the **green** AABB.  

The condition:  
```
(red.left > green.left AND red.left < green.right)
 ```

Also, remember that the collision needs to be done with both AABBs, so you do  
```
(red.left > green.left AND red.left < green.right)  
OR  
(green.left > red.left AND green.left < red.right) 
```  
  
Great, the left overlaps. However, you need one overlap on each axis for a collision.  

This means you will need to do a condition like
```
((at least 1 horizontal axis overlap) AND (at least 1 vertical axis overlap))
== Collision
```

**Final code**  
Now let's combine all of this into one big condition statement
``` 
(
    // At least 1 collision on Horizontal axis
    (
        // Left side on both AABBs
        (rect1.left > rect2.left AND rect1.left < rect2.right) 
        OR
        (rect2.left > rect1.left AND rect2.left < rect1.right)
        OR

        // Right side on both AABBs
        (rect1.right > rect2.left AND rect1.right < rect2.right)
        OR
        (rect2.right > rect1.left AND rect2.right < rect1.right)
    )
    AND
    // At least 1 collision on vertical axis
    (
        // Bottom side on both AABBs
        (rect1.bottom > rect2.bottom AND rect1.bottom < rect2.top)
        OR
        (rect1.bottom > rect2.bottom AND rect1.bottom < rect2.top)
        OR

        // Top side on both AABBs
        (rect1.top > rect2.bottom AND rect1.top < rect2.top)
        OR
        (rect2.top > rect1.bottom AND rect2.top < rect1.top)
    )
)
```

You could change the operators to use <= if you wanted a collision to happen if it is on the line  

Okay now we have a collision check but it had me wondering, was there a more simplified and quicker way to check this? It turns out there was.  

See this [learnOpenGL article](https://learnopengl.com/In-Practice/2D-Game/Collisions/Collision-detection) talking about it  

Now, I may have wasted my time doing all of that theory but it was still fun to do.  

If I translate the code into javascript it comes to
``` Javascript
function CheckCollision(thisCollider, otherCollider) // AABB - AABB collision
{
    // collision x-axis?
    let collisionX = 
    (thisCollider.position.x + thisCollider.width  >= otherCollider.position.x 
    && otherCollider.position.x + otherCollider.width >= thisCollider.position.x);
    
    // collision y-axis?
    let collisionY = 
    (thisCollider.position.y + thisCollider.height  >= otherCollider.position.y 
    && otherCollider.position.y + otherCollider.height >= thisCollider.position.y);

    // collision only if on both axes
    return collisionX && collisionY;
}  
```

What does this whole journey tell you?  
Basically, apart from how AABB collisions work it tells you that many people have likely tried to tackle a similar problem and you should see what others have done if you're unsure or want to know if there is a more efficient way.