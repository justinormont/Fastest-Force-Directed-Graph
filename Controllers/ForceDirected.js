/**
  @author Justin Ormont

  Implements a Force Directed Graph Layout Engine. 
  
  Runtime: 
  	O(N^3) since for each iteration, N nodes must be compared to N-1 other nodes, and taking N iterations to converge => O(N^3).
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

Controllers.ForceDirected = function(graph, view, options) {
	"use strict";
	
	var options = options || {};
	
	this.view = view;
	this.graph = graph;
	
	this.epsilon = 1E-1;
	this.epsilonSquared = this.epsilon*this.epsilon;
	
	this.startTime = +new Date();
	this.lastTime = null;
	this.frameNumber = 0;
	this.smallDistanceCalculations = 0;
	this.coulombCalculationsThisFrame = 0;
	this.coulombCalculationsPerFrame = 0;
	this.speedingNodes = 0;
	
	this.maxSpeed = options.maxSpeed || 5000;
	this.temporalSmoothing =  0.0004; // 0..1
	this.dampening = 0.97; // 0..1	
	
	this.springMultiplier = 8000.0;
	this.coulombMultiplier = 2000.0;
	
	this.averageForce = 0;
	
	this.includeGravity = true;
	this.gravityMultiplier = -981000;
	this.gravity = [0, this.gravityMultiplier, 0]; // Changes w/ camera rotation
	
	this.currentNodeIndex=0;
	
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
	
	this.coulombMultiplier = 300000000/Math.log(this.graph.getNodeCount());
	
	if (this.includeGravity && this.view && this.view.camera && this.view.camera.up) {
		this.gravity[0] = 0; this.view.camera.up.y * -98000000000000000; 
		this.gravity[1] = 0; this.view.camera.up.z * -98000000000000000;
		this.gravity[2] = 0; this.view.camera.up.x * -98000000000000000;
	}
	
};


// The master requestAnimationFrame based loop - O(N^3)
Controllers.ForceDirected.prototype.calculateStep = function() {
	"use strict";
	
	var that=this;
	
	var innerCalculateStep = function() { // Needed to preserve the 'this' pointer
		
		var nodes, springForce, coulombForce, totalForceOnNode=[0,0,0], numNodes, nodeIndex, node, vertexIndex, vertex, timeDiff=0.06, totalSpeed, weightTime;
		
		that.frameNumber += 1;
		
		requestAnimationFrame(innerCalculateStep);
		
		that.setupNextFrame();
		
		nodes = that.getNodes();
		numNodes = nodes.length;
		
		if (that.frameNumber % 1 === 0) {
		
			for (nodeIndex=nodes.length-1; nodeIndex >= 0; nodeIndex-=1) {
				
				node = nodes[nodeIndex];
				
				// Reset totalForceOnNode for the next node
				totalForceOnNode[0] = 0;
				totalForceOnNode[1] = 0;
				totalForceOnNode[2] = 0;
				
				// Gravity
				if (that.includeGravity) {
					totalForceOnNode[0] += that.gravity[0];
					totalForceOnNode[1] += that.gravity[1];
					totalForceOnNode[2] += that.gravity[2];
				}
						
				// Springs -- Hooke's Law -- Pulls connected nodes together
				for (vertexIndex = node.verticies.length-1; vertexIndex >= 0; vertexIndex-=1) {
					vertex = node.verticies[vertexIndex];
					if (vertex.to !== vertex.from) {
						springForce = that.springForce(vertex.to, vertex.from, that.springMultiplier);
						
						totalForceOnNode[0] += springForce[0];
						totalForceOnNode[1] += springForce[1];
						totalForceOnNode[2] += springForce[2];
					}
				}
								
				// Charged particles -- Coulomb Repulsion -- Pushes ALL nodes apart 
				coulombForce = that.totalCoulombForceOnNode(node, nodes, that.coulombMultiplier);
				totalForceOnNode[0] += coulombForce[0];
				totalForceOnNode[1] += coulombForce[1];
				totalForceOnNode[2] += coulombForce[2];
				
				// Track the average force on each node. 
				that.averageForce = that.averageForce*0.99 + Math.sqrt((totalForceOnNode[0]*totalForceOnNode[0]) + (totalForceOnNode[1]*totalForceOnNode[1]) + Math.abs(totalForceOnNode[2]*totalForceOnNode[2]))*0.01;
				
				// Add new velocity:  Δv = Δt*F/m (plus  smoothing factor)
				weightTime = timeDiff * that.temporalSmoothing / node.weight;
				node.velocity[0] = node.velocity[0] + totalForceOnNode[0] * weightTime;
				node.velocity[1] = node.velocity[1] + totalForceOnNode[1] * weightTime;
				node.velocity[2] = node.velocity[2] + totalForceOnNode[2] * weightTime;
			
				// Calculate speed
				totalSpeed = Math.sqrt(Math.pow(node.velocity[0],2) + Math.pow(node.velocity[1],2) + Math.pow(node.velocity[2],2));
				
				if (totalSpeed > that.maxSpeed) {
					that.speedingNodes += 1;
					node.velocity[0] *= (that.maxSpeed/totalSpeed);
					node.velocity[1] *= (that.maxSpeed/totalSpeed);
					node.velocity[2] *= (that.maxSpeed/totalSpeed);
					
					totalSpeed = that.maxSpeed;
				}
	
				// Friction to slow down the node
				node.velocity[0] *= that.dampening * Math.pow((1 - totalSpeed/that.maxSpeed),1/1000);
				node.velocity[1] *= that.dampening * Math.pow((1 - totalSpeed/that.maxSpeed),1/10000);
				node.velocity[2] *= that.dampening * Math.pow((1 - totalSpeed/that.maxSpeed),1/10000);
				
				// Move the node
				node.x += node.velocity[0] * timeDiff;
				node.y += node.velocity[1] * timeDiff;
				node.z += node.velocity[2] * timeDiff;
			}
		}
		else {
			for (nodeIndex=nodes.length-1; nodeIndex >= 0; nodeIndex-=1) {
				node = nodes[nodeIndex];
				
				
				node.x += node.velocity[0] * timeDiff;
				node.y += node.velocity[1] * timeDiff;
				node.z += node.velocity[2] * timeDiff;
			}
		}
		that.removeDrift();
		that.recenterGraph();
	
	}
	
	innerCalculateStep();
	

	return this;
}


// Average the velocity of all nodes. Subtracts the average from each node.
Controllers.ForceDirected.prototype.removeDrift = function() {
	"use strict";
	
	var nodes=this.getNodes(), averageVelocity=[0,0,0], smoothing=0.1;
	
	if (nodes.length) {
		nodes.forEach(function(node) {
			averageVelocity[0] += node.velocity[0];
			averageVelocity[1] += node.velocity[1];
			averageVelocity[2] += node.velocity[2];
		});
		
		averageVelocity[0] /= (nodes.length);
		averageVelocity[1] /= (nodes.length);
		averageVelocity[2] /= (nodes.length);
		
		
		averageVelocity[0] *= smoothing;
		averageVelocity[1] *= smoothing;
		averageVelocity[2] *= smoothing;
		
		nodes.forEach(function(node) {
			node.velocity[0] -= averageVelocity[0];
			node.velocity[1] -= averageVelocity[1];
			node.velocity[2] -= averageVelocity[2];
		});
	}
	
	return this;
};


// Average position of all nodes. Subtracts the average from each node.
Controllers.ForceDirected.prototype.recenterGraph = function() {
	"use strict";
	
	var nodes=this.getNodes(), averagePosition=[0,0,0], smoothing=0.1;
	
	if (nodes.length) {
		
		if (this.centeringMethod === "centerOnFirstNode") {
			averagePosition[0] = this.getNodes()[0].x;
			averagePosition[1] = this.getNodes()[0].y;
			averagePosition[2] = this.getNodes()[0].z;
		}
		else {
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
		}
		
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
	"use strict";
	
	var node, coulombForceOnNode=[0, 0, 0], i, node2, len, coulombForce;
	
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
	coulombMultiplier *= (node1.weight * node2.weight);
	
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
		
		// Make further nodes push less strongly
		//var distanceMultiplier = 1/Math.pow(distanceSquared,1.000000000000000025)*5E5;
		//returnValue = [returnValue[0]*distanceMultiplier, returnValue[1]*distanceMultiplier, returnValue[2]*distanceMultiplier];
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
	
	// Make further nodes pull together
	//var distanceSquared = this.distanceSquared(node1.x, node1.y, node1.z, node2.x, node2.y, node2.z);
	//var distanceMultiplier = distanceSquared*Math.pow(distanceSquared,1E-2)/1E6;
	//returnValue = [returnValue[0]*distanceMultiplier, returnValue[1]*distanceMultiplier, returnValue[2]*distanceMultiplier];
	
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
