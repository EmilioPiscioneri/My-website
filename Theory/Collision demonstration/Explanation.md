# AABB collision detection theory

This is theory behind AABB (Axis-aligned bounding box) collisions. An AABB is basically a rectangle that has a fixed rotation, think of a hitbox that doesn't rotate.

### Collision check 
This part will only explain how to check for a collision between two AABBs.  
Figure 1: An image I made to illustrate collisions
![alt text](/Theory/Collision%20demonstration/Collision%20demonstration%20illustration.png)

The above image displays a simple pattern in AABB.  
In a collision between two AABBs, there is an overlap on the left, right, top or bottom axes/sides. Think of each of the 4 sides of the AABB as their own axis that is limited by the width or height of the AABB.  
You treat each axis seperately when doing the checks

The image demonstrates that if you get any side of an AABB and check if it is between the smallest and largest value for its respective axis, there will be a collision.

E.G.  
We are going to do a collision check with the red AABB in figure 1 and the green one.  

The **left side** of the **red** AABB in figure 1 is on the **x axis**.  

As stated before, we need to check that the red AABB's left side is **between the smallest and highest value** of the **green** AABB on the **respective axis**.  

In this case the **respective axis is the x axis** and the smallest and largest value is the **leftmost and rightmost** values.  

Now check that the **left side** of the **red** AABB is **between** the **left and right** side of the **green** AABB.  

The condition:  
(red.left > green.left AND red.left < green.right)  
  
Great there's a collision because the left overlaps. All you need to check for is one overlap because there cannot be a collision without an overlap.
**Final code**  
That's just one overlap, to do all of them you just check every side
``` 

((rect1.left > rect2.left AND rect1.left < rect2.right)
OR
(rect1.right > rect2.left AND rect1.right < rect2.right)
OR
(rect1.bottom > rect2.bottom AND rect1.bottom < rect2.top)
OR
(rect1.top > rect2.bottom AND rect1.top < rect2.top)
)
```

You could change the operators to use <= if you wanted a collision to happen if it is on the line