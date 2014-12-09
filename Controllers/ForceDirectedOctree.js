/**
  @author Justin Ormont

  Implements a Force Directed Graph Layout Engine backed by an Octree (8-way spatial partitioning). 
  
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

Controllers.ForceDirectedOctree = function(graph, view, options) {
	"use strict";
	
	var options = options || {};
	
	this.octree = new Utils.Octree({maxDepth:2, maxElementsPerNode:20});
	
	// Setup local vars for the base class we inherited from
	Controllers.ForceDirected.apply(this, arguments);
	
	this.coulombCalculationsOnOctreeNodes = 0;
	this.coulombCalculationsOnElements = 0;
	this.coulombCalculationsDirectedToSubNodes = 0;
	
	return this;
};

// Inherit from Controllers.ForceDirected
Controllers.ForceDirectedOctree.prototype = Object.create(Controllers.ForceDirected.prototype);
Controllers.ForceDirectedOctree.prototype.constructor = Controllers.ForceDirectedOctree;


/*Controllers.ForceDirectedOctree.prototype.recenterGraph = function() {
	"use strict";
	
	var nodes=this.getNodes(), averagePosition, avgX, avgY, avgZ;
	
	avgX = this.octree.head.avgX;
	avgY = this.octree.head.avgY; 
	avgZ = this.octree.head.avgZ;
	
	nodes.forEach(function(node) {
		node.x -= avgX;
		node.y -= avgY;
		node.z -= avgZ;
	});
	
	return this;
};*/

// Calculate the total coulomb force on the node from other nodes.
// Approximates the force from a set of nodes if they are far away
Controllers.ForceDirectedOctree.prototype.totalCoulombForceOnNode = function(node, nodes /* unused, kept for compatability */, coulombMultiplier, octreeNode) {
	"use strict";
	
	var node, node2, coulombForceOnNode=[0, 0, 0], nodes, coulombForce, distanceToClosestCornerSquared, octreeNodeSizeSquared, childOctreeNodes, len, i;
	
	if (!octreeNode) { octreeNode = this.octree.head; }
	
	
	
	distanceToClosestCornerSquared = this.octree.closestCornerOfBoundingBoxSquared(octreeNode, node)
	
	octreeNodeSizeSquared = Math.pow(octreeNode.maxX - octreeNode.minX,2) + Math.pow(octreeNode.maxY - octreeNode.minY,2) + Math.pow(octreeNode.maxY - octreeNode.minY,2); // Corner to corner in a box. 
	
	if (distanceToClosestCornerSquared > octreeNodeSizeSquared * 30) { // Check that the box is at least one box length away.  ToDo: change 0.5 back to 3.0
		var coulombApproxNode = function() {
			// Approximate using the average of the items within/below the Octree Node
			this.coulombCalculationsOnOctreeNodes += 1;
			
			// Save on memory allocations by storing and reusing object.
			if (!this.fakeElement) { this.fakeElement = {x:0, y:0, z:0, weight:1}; }			
			this.fakeElement.x = octreeNode.avgX; 
			this.fakeElement.y = octreeNode.avgY; 
			this.fakeElement.z = octreeNode.avgZ; 
			this.fakeElement.weight = octreeNode.weight;
			
			coulombForce = this.coulombForce(node, this.fakeElement, coulombMultiplier);
		};
		coulombApproxNode.apply(this);
	}
	else {
		if (octreeNode.isLeafNode) {
			var coulombNormal = function() {
				// Compare all nodes in the Octree Node
				this.coulombCalculationsOnElements += 1;
						
				nodes = octreeNode.elements;
				for (len = nodes.length, i = 0; i < len; i++) {
					node2 = nodes[i];
					if (node !== node2) {
						coulombForce = this.coulombForce(node, node2, coulombMultiplier);
						coulombForceOnNode[0] += coulombForce[0];
						coulombForceOnNode[1] += coulombForce[1];
						coulombForceOnNode[2] += coulombForce[2];
					}
				}
			};
			coulombNormal.apply(this);
		}
		else {
			var coulombRecursive = function() {
				// Calculate the force to each of the sub-nodes in the Octree Graph
				childOctreeNodes = this.octree.octreeNodeChildren(octreeNode);
				
				this.coulombCalculationsDirectedToSubNodes += 1;
				
				for (len = childOctreeNodes.length, i = 0; i < len; i++) {
					coulombForce = this.totalCoulombForceOnNode(node, null, coulombMultiplier, childOctreeNodes[i]);
					coulombForceOnNode[0] += coulombForce[0];
					coulombForceOnNode[1] += coulombForce[1];
					coulombForceOnNode[2] += coulombForce[2];
				}
			};
			coulombRecursive.apply(this);
		}
	}
	
	return coulombForceOnNode;
};


Controllers.ForceDirectedOctree.prototype.setupNextFrame = function() {
	"use strict";
	
	var nodes=this.getNodes();
	
	// Check that all nodes are in the Octree
	nodes.forEach(function(node) {
		if (!node.octreeNode) {
			node.octreeNode = this.octree.addElement(this.octree.head, node);
		}
	}, this);
	
	// Update the average position of each OctreeNode
	this.octree.updateAveragePosition(this.octree.head, true);
	
	// Check that all of the nodes are in the right OctreeNode in the Octree
	this.octree.checkPositionOfElements(this.octree.head, true);
	
	if (this.coulombCalculationsPerFrame === 0) {
		this.coulombCalculationsPerFrame = Math.pow(this.getNodes().length,2); // There should generally be N^2 calculation, so let's set the starting point there
	}
	
	this.coulombMultiplier = 100000000/Math.log(this.graph.getNodeCount());
	
	if (this.view && this.view.camera && this.view.camera.up) {
		this.gravity[0] = this.view.camera.up.x * this.gravityMultiplier; 
		this.gravity[1] = this.view.camera.up.y * this.gravityMultiplier;
		this.gravity[2] = this.view.camera.up.z * this.gravityMultiplier;
	}
	
	return this;
	
};

