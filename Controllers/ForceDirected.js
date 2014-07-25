/**
  @author Justin Ormont

  Implements a Force Directed Graph Layout Engine. 
  
  Runtime: 
  	O(N^3) as N nodes, always compated to N-1 other nodes, taking N iterations to converge => O(N^3).
col
  Parameters:
    graph: <Models.NodeList>, class instance which maintains the list of nodes & verticies. 
    options: <Obj>, TBA
	
  Example:
    var model, view, controller;
	model = new Models.NodeList();								// Stores the nodes (a graph)
	view = new Views.ThreeJS(model);							// Displays the nodes
	controller = new Controllers.ForceDirected(model, view);	// Moves the nodes	
**/

var Controllers = Controllers||{};

Controllers.ForceDirected = function(graph, options) {
	"use strict";
	
	var options = options || {};
	
	this.epsilon = 1E-1;
	this.epsilonSquared = this.epsilon*this.epsilon;
	this.graph = graph;
	
	this.startTime = +new Date();
	this.lastTime = null;
	this.frameNumber = 0;
	this.smallDistanceCalculations = 0;
	this.coulombCalculationsThisFrame = 0;
	this.coulombCalculationsPerFrame = 0;
	this.speedingNodes = 0;
	
	this.maxSpeed = options.maxSpeed || 5000;
	this.temporalSmoothing =  0.001; // 0..1
	
	this.springMultiplier = 1500.0;
	this.coulombMultiplier = 100.0;
	
	this.averageForce = 0;
	
	this.calculateStep();
	
	return this;
};


Controllers.ForceDirected.prototype.getGraph = function() {
	"use strict";
	
	return this.graph;
};

Controllers.ForceDirected.prototype.getNodes = function() {
	"use strict";
	
	return this.graph.getNodes();
};

// Run before each new frame
Controllers.ForceDirected.prototype.setupNextFrame = function() {
	"use strict";
	
	// First time init
	if (this.coulombCalculationsPerFrame === 0) { this.coulombCalculationsPerFrame = Math.pow(this.getNodes().length,2); } // There should generally be N^2 calculation, so let's set the starting point there
	
	this.coulombMultiplier = 100000000/Math.log(this.graph.getNodeCount());
	
};

// The master requestAnimationFrame based loop - O(N^3)
Controllers.ForceDirected.prototype.calculateStep = function() {
	"use strict";
	
	var that=this;
	
	var innerCalculateStep = function() { // Needed to preserve the 'this' pointer
		
		var avgFPS=60, fps, node1, node2, i, j, len1, len, vertex, nodes, springForce, coulombForce, totalForceOnNode, currentTime, timeDiff, runTime, newVelocity, weightTime, springForceFunction, coulombForceFunction, dampening, totalSpeed;
		
		requestAnimationFrame(innerCalculateStep);
		
		that.setupNextFrame();
		
		nodes = that.getNodes();
		
		currentTime = (+new Date());
		
		timeDiff = (currentTime - that.lastTime)/1000;
		runTime = (currentTime - that.startTime)/1000;
		
		that.frameNumber += 1;
		fps = 1/timeDiff;
		avgFPS = that.frameNumber / runTime;
		
		that.maxSpeed = Math.max(100000/runTime/runTime, 1000); // Slow movement over time
		
		that.coulombCalculationsPerFrame = that.coulombCalculationsPerFrame*0.6 + that.coulombCalculationsThisFrame*0.4;
		that.coulombCalculationsThisFrame = 0;
		
		
		if (that.frameNumber%4==0 || that.frameNumber<4) { console.log("fps = " + Math.round((1/timeDiff)*10)/10 + ", avg fps=" + Math.round(avgFPS*10)/10 + ", avg force=" + Math.round(that.averageForce*10)/10 + ", avg coulomb calcs per frame per node=" + Math.round(that.coulombCalculationsPerFrame/nodes.length*100)/100); }
		
		timeDiff = Math.min(timeDiff, 5); // Incase the browser was paused for a long time
		
		dampening = Math.pow(0.10,timeDiff);
		
		if (that.lastTime === null) { that.lastTime = currentTime; }
		else if (timeDiff > 0) {
			that.lastTime = currentTime;
			
	
			for (len1 = nodes.length, j = 0; j < len1; j++) {
				node1 = nodes[j];
												
				totalForceOnNode = [0,0,0];
				
				// Springs -- Hooke's Law -- Pulls connected nodes together
				for (len = node1.verticies.length, i = 0; i < len; i++) {
					vertex = node1.verticies[i];
					if (vertex.to !== vertex.from) {
						springForce = that.springForce(vertex.to, vertex.from, that.springMultiplier);
						
						totalForceOnNode[0] += springForce[0];
						totalForceOnNode[1] += springForce[1];
						totalForceOnNode[2] += springForce[2];
					}
				}
								
				// Charged particles -- Coulomb Repulsion -- Pushes ALL nodes apart 
				coulombForce = that.totalCoulombForceOnNode(node1, nodes, that.coulombMultiplier);
				totalForceOnNode[0] += coulombForce[0];
				totalForceOnNode[1] += coulombForce[1];
				totalForceOnNode[2] += coulombForce[2];
				
				// Track the average force on each node. 
				that.averageForce = that.averageForce*0.99 + (Math.abs(totalForceOnNode[0]) + Math.abs(totalForceOnNode[1]) + Math.abs(totalForceOnNode[2]))*0.9;
				
				// Add new velocity:  Δv = Δt*F/m (plus  smoothing factor)
				weightTime = timeDiff * that.temporalSmoothing / node1.weight;
				node1.velocity[0] = node1.velocity[0] + totalForceOnNode[0] * weightTime;
				node1.velocity[1] = node1.velocity[1] + totalForceOnNode[1] * weightTime;
				node1.velocity[2] = node1.velocity[2] + totalForceOnNode[2] * weightTime;
			
				// Calculate speed
				totalSpeed = Math.sqrt(Math.pow(node1.velocity[0],2) + Math.pow(node1.velocity[1],2) + Math.pow(node1.velocity[2],2));
				
				if (totalSpeed > that.maxSpeed) {
					that.speedingNodes += 1;
					node1.velocity[0] *= (that.maxSpeed/totalSpeed);
					node1.velocity[1] *= (that.maxSpeed/totalSpeed);
					node1.velocity[2] *= (that.maxSpeed/totalSpeed);
				}
			
				// Friction to slow downn the node
				node1.velocity[0] *= dampening;
				node1.velocity[1] *= dampening;
				node1.velocity[2] *= dampening;
				
				// Move the node
				node1.x += node1.velocity[0] * timeDiff;
				node1.y += node1.velocity[1] * timeDiff;
				node1.z += node1.velocity[2] * timeDiff;
			
			}
			
		
		}
		
		that.recenterGraph();
	}
	
	innerCalculateStep();
	
	return this;
};

// Average position of all nodes. Subtracts the average from each node.
Controllers.ForceDirected.prototype.recenterGraph = function() {
	"use strict";
	
	var nodes=this.getNodes(), averagePosition=[0,0,0], smoothing=0.1;
	
	if (nodes.length) {
		nodes.forEach(function(node) {
			averagePosition[0] += node.x;
			averagePosition[1] += node.y;
			averagePosition[2] += node.z;
		});
		
		averagePosition[0] /= (nodes.length);
		averagePosition[1] /= (nodes.length);
		averagePosition[2] /= (nodes.length);
		
		
		averagePosition[0] *= smoothing;
		averagePosition[1] *= smoothing;
		averagePosition[2] *= smoothing;
		
		nodes.forEach(function(node) {
			node.x -= averagePosition[0];
			node.y -= averagePosition[1];
			node.z -= averagePosition[2];
		});
	}
	
	return this;
};

Controllers.ForceDirected.prototype.resetPositions = function() {
		"use strict";
	
	var nodes=this.getNodes(), averagePosition=[0,0,0];
	
	nodes.forEach(function(node) {
		node.resetPositionAndVelocity();
	});
	
	return this;
};

// Compute the total colomb force on the node. Iterates over all nodes. O(N) for each execution.
Controllers.ForceDirected.prototype.totalCoulombForceOnNode = function(node, nodes, coulombMultiplier) {
	var node, coulombForceOnNode=[0, 0, 0];
	
	for (len = nodes.length, i = 0; i < len; i++) {
		node2 = nodes[i];
		if (node !== node2) {
			coulombForce = this.coulombForce(node, node2, coulombMultiplier);
			coulombForceOnNode[0] += coulombForce[0];
			coulombForceOnNode[1] += coulombForce[1];
			coulombForceOnNode[2] += coulombForce[2];
		}
	}
	
	return coulombForceOnNode;
};
				

// Coulomb's Law -- Pushes all nodes apart -- O(1)
Controllers.ForceDirected.prototype.coulombForce = function(node1, node2, coulombMultiplier) {
	"use strict";
	
	var returnValue, distanceSquared, coulombForce, smallDistance=false;
	
	coulombMultiplier = coulombMultiplier||1;
	
	//distance = this.distance(node1.x, node1.y, node1.z, node2.x, node2.y, node2.z);
	distanceSquared = this.distanceSquared(node1.x, node1.y, node1.z, node2.x, node2.y, node2.z);
	//distanceSquared = this.distanceToTheFourth(node1.x, node1.y, node1.z, node2.x, node2.y, node2.z);
	//distanceSquared = this.distance(node1.x, node1.y, node1.z, node2.x, node2.y, node2.z);
	
	//smallDistance = (distance < this.epsilon);	
	smallDistance = (distanceSquared < this.epsilonSquared);	
	
	if (smallDistance) { // The case where the two nodes are touching, or almost touching
		distanceSquared = this.epsilonSquared;
		coulombForce = (coulombMultiplier||1)/(distanceSquared);
		
		this.smallDistanceCalculations += 1;
		
		// Jitter the two points in a random direction
		//returnValue = [coulombForce*(node1.x - node2.x + (Math.random()-0.5)*this.epsilon*10), coulombForce*(node1.y - node2.y + (Math.random()-0.5)*this.epsilon*10), coulombForce*(node1.z - node2.z + (Math.random()-0.5)*this.epsilon*10)]; 
		returnValue = [coulombForce*((Math.random()-0.5)*this.epsilon*1000), coulombForce*((Math.random()-0.5)*this.epsilon*1000), coulombForce*((Math.random()-0.5)*this.epsilon*1000)]; 
	}
	else {
		coulombForce = coulombMultiplier/(distanceSquared);
		returnValue = [coulombForce*(node1.x - node2.x), coulombForce*(node1.y - node2.y), coulombForce*(node1.z - node2.z)]; 
	}
	
	this.coulombCalculationsThisFrame += 1;
	
	return returnValue;
	
}

// Hooke's Law -- Pulls connected nodes together -- O(1)
Controllers.ForceDirected.prototype.springForce = function(node1, node2, springMultiplier) {
	"use strict";
	
	var returnValue;
	
	if (!springMultiplier) { returnValue = [(node1.x - node2.x), (node1.y - node2.y), (node1.z - node2.z)]; }
	else { returnValue =  [springMultiplier*(node1.x - node2.x), springMultiplier*(node1.y - node2.y), springMultiplier*(node1.z - node2.z)]; }
	
	return returnValue;
}

// Not used
Controllers.ForceDirected.prototype.distance = function(x1, y1, z1, x2, y2, z2) {
	return Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2) + (z1-z2)*(z1-z2)); 
};


Controllers.ForceDirected.prototype.distanceSquared = function(x1, y1, z1, x2, y2, z2) {
	return (x1-x2)*(x1-x2) + (y1-y2)*(y1-y2) + (z1-z2)*(z1-z2); 
};

// Not used
Controllers.ForceDirected.prototype.distanceToTheFourth = function(x1, y1, z1, x2, y2, z2) {
	return (x1-x2)*(x1-x2)*(x1-x2)*(x1-x2) + (y1-y2)*(y1-y2)*(y1-y2)*(y1-y2) + (z1-z2)*(z1-z2)*(z1-z2)*(z1-z2); 
};
