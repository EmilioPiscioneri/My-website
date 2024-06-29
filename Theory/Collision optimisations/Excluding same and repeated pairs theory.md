
### Excluding same and repeated pairs theory

So this is when you have two iterations (a for loop in a for loop). In my code I need to not repeat or do the same pairs twice because it will lead to unwanted behaviour with collisions. Both of the objects in a collision are updated when one is checked and a collision is found.

**Rules**

- Can’t have same pairs e.g. can’t have 1,1 or 5,5
- Can’t have repeated pairs e.g. 1,5 or 5,1 or 7,2 or 2,7
Where each comma represents a different index for a different loop so index1,index2

  
Crossed out elements are excluded and others are the ones that are allowed
  
*Note: In the below pairs I use a 1 based index by accident just imagine it as a 0 based index in real code implementation. I didn’t catch that until after I was done.*

### 4 elements

(4^2=16 combinations or a for loop to 4 inside a for loop to 4)

  

So

~~1,1 Same~~
**1,2**
**1,3**
**1,4**

~~2,1 Pair~~
~~2,2 Same~~
**2,3**
**2,4**

~~3,1 Pair~~
~~3,2 Pair~~
~~3,3 Same~~
**3,4**

~~4,1 Pair~~
~~4,2 Pair~~
~~4,3 Pair~~
~~4,4 Same~~

Which leaves

1,2
1,3
1,4

2,3
2,4

3,4

Which is 6 total combinations 

(4-1+4-2+4-3)
(3+2+1)
= 6
  

### 6 elements

This is to hammer the point home

~~1,1 Same~~
1,2
1,3
1,4
1,5
1,6

~~2,1 Pair~~
~~2,2 Same~~
2,3
2,4
2,5
2,6

~~3,1 Pair~~
~~3,2 Pair~~
~~3,3 Same~~
3,4
3,5
3,6

~~4,1 Pair~~
~~4,2 Pair~~
~~4,3 Pair~~
~~4,4 Same~~
4,5
4,6

~~5,1 Pair~~
~~5,2 Pair~~
~~5,3 Pair~~
~~5,4 Pair~~
~~5,5 Same~~
5,6

~~6,1 Pair~~
~~6,2 Pair~~
~~6,3 Pair~~
~~6,4 Pair~~
~~6,5 Pair~~
~~6,6 Same~~

  

Which leaves

1,2
1,3
1,4
1,5
1,6

2,3
2,4
2,5
2,6

3,4
3,5
3,6

4,5
4,6

5,6

  

Which is 15 total combinations

(6-1+6-2+6-3+6-4+6-5)
(5+4+3+2+1)
= 15

  

Conclusion

The pattern is

$\sum\limits_{i=1}^T(T-i)$

Where T is total of elements (e.g. for the previous examples T would be 4 and then 6)

This notation means the sum of integers from i to T (a for loop) where each iteration the function next to sigma character is applied

My initial method was to store every pair that occurred and save it to an array and check for a match in that array which led to elements^2 different combinations.

*Note This equation is for 1 based indexes. For 0 based do i=0 and T=total-1*
  
This new method is much faster.

Plugging it into a calculator for 30 elements my new method takes

435 combinations

Compared to original 30^2=900 combinations

  

The other pattern: 

This means that under the second for loop 

1. you never do the last index (all combinations will be excluded on last index)
2. You don’t need to check for if a combination has occurred using slow array storage and accessing each iteration, instead you can either do 
3. On each iteration check if(index2 <= index1) then skip this iteration (continue statement)
4. Or you can simply just do each secondary loop from index1+1 to total elements. 
		E.g. 
``` Javascript
// T = total elements = 6

// T-1 cos all combinations are accounted for on last index, so exclude it
// this also means there are no combinations when there is only one element. Think about it Ofc there’s no pairs on one value
if(T>1){
	for(var index1=0; index1< T-1;index1++){
		for(var index2=index1+1; index2< T;index2++){
		
			// Now there’s no pairs
			
			// do as u will with the two indexes 
		
		}
	
	}
}
```







