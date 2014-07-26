Fastest-Force-Directed-Graph
============================

Implements a Force Directed Graph Layout Engine backed by an Oct Tree (8-way spatial partitioning)

Project Purpose
============================
I'm looking to reimplement in JavaScript a former mixed C++/JavaScript project of mine which was visualizing slices of social networks. None of the JavaScript implementations I located were performant enough. 

Former Project of Mine
============================
Info: http://blog.launch.co/blog/take-that-google-interactive-google-stream-visualizer-launch.html
![Former Project](https://i.ytimg.com/vi/_B-ij4Hl6Fg/maxresdefault.jpg "Former C++/JavaScript Project of Mine - StreamVisualizer")

Current Project
============================
The purpose of the current project is to create the fastest force directed graph in JavaScript. The layout engine is backed by an Octree for performance. The rendering is Three.js. 
![Screen Shot](https://github.com/justinormont/Fastest-Force-Directed-Graph/blob/master/ScreenShots/300%20Nodes%202014-07-25.png "Force Directed Graph Backed by an Octree")

Why an Octree?
============================
Octrees are a way of spatially dividing the 3D space. They allow us to aggregate multiple points in to a single Octree Node, reducing the run time from O(N) to O(log N) for each node on the graph. This reduces each iteration's run time from O(N^2) to O(N log N). 

Next Steps
============================
* Speed Improvments
  * Moving much of Layout Engine to GPU Shader code
  * Rewriting the view controller
  * Perf test Octree splitting huristics (Octree node midpoint [current], average position, median position, etc)
* UI improvements to render similar as former project (write GPU Shaders)
* Moving Octree to its own project repository
