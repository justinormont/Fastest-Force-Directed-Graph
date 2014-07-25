/**
  @author Justin Ormont

  Implements a Force Directed Graph Layout Engine backed by an Oct Tree (8-way spatial partitioning). 
  
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

Controllers.ForceDirectedOctTree = function(graph, options) {
	"use strict";
	
	var options = options || {};
	
	this.octTree = new Utils.OctTree();
	
	// Setup local vars for the base class we inherited from
	Controllers.ForceDirected.apply(this, arguments);
	
	
	return this;
};

// Inherit from Controllers.ForceDirected
Controllers.ForceDirectedOctTree.prototype = Object.create(Controllers.ForceDirected.prototype);
Controllers.ForceDirectedOctTree.prototype.constructor = Controllers.ForceDirectedOctTree;


/*Controllers.ForceDirectedOctTree.prototype.recenterGraph = function() {
	"use strict";
	
	var nodes=this.getNodes(), averagePosition, avgX, avgY, avgZ;
	
	avgX = this.octTree.head.avgX;
	avgY = this.octTree.head.avgY; 
	avgZ = this.octTree.head.avgZ;
	
	nodes.forEach(function(node) {
		node.x -= avgX;
		node.y -= avgY;
		node.z -= avgZ;
	});
	
	return this;
};*/

// Calculate the total coulomb force on the node from other nodes.
// Approximates the force from a set of nodes if they are far away
Controllers.ForceDirectedOctTree.prototype.totalCoulombForceOnNode = function(node, nodes /* unused, kept for compatability */, coulombMultiplier, octTreeNode) {
	"use strict";
	
	var node, node2, coulombForceOnNode=[0, 0, 0], nodes, coulombForce, distanceToClosestCorner, octTreeNodeSize, childOctTreeNodes, len, i;
	
	if (!octTreeNode) { octTreeNode = this.octTree.head; }
	
	distanceToClosestCorner = this.octTree.closestCornerOfBoundingBox(octTreeNode, node)
	
	octTreeNodeSize = (octTreeNode.maxX - octTreeNode.minX)*2.0; // Corner to corner in a box. (1^2 + 1^2 + 1^2)^0.5 = ~2.  ToDo: change 0.5 back to 2.0
	
	if (distanceToClosestCorner > octTreeNodeSize) { // Check that the box is at least one box length away
		// Approximate using the average of the items within/below the Oct Tree Node
		coulombForce = this.coulombForce(node, {x:octTreeNode.avgX, y:octTreeNode.avgY, z:octTreeNode.avgZ}, coulombForce*octTreeNode.weight);
	}
	else {
		if (octTreeNode.isLeafNode) {
			// Compare all nodes in the Oct Tree Node
			nodes = octTreeNode.elements;
			for (len = nodes.length, i = 0; i < len; i++) {
				node2 = nodes[i];
				if (node !== node2) {
					coulombForce = this.coulombForce(node, node2, coulombMultiplier);
					coulombForceOnNode[0] += coulombForce[0];
					coulombForceOnNode[1] += coulombForce[1];
					coulombForceOnNode[2] += coulombForce[2];
				}
			}
		}
		else {
			// Calculate the force to each of the sub-nodes in the Oct Tree Graph
			childOctTreeNodes = this.octTree.octTreeNodeChildren(octTreeNode);
			
			for (len = childOctTreeNodes.length, i = 0; i < len; i++) {
				coulombForce = this.totalCoulombForceOnNode(node, null, coulombMultiplier, childOctTreeNodes[i]);
				coulombForceOnNode[0] += coulombForce[0];
				coulombForceOnNode[1] += coulombForce[1];
				coulombForceOnNode[2] += coulombForce[2];
			}
		}
	}
	
	return coulombForceOnNode;
};


Controllers.ForceDirectedOctTree.prototype.setupNextFrame = function() {
	"use strict";
	
	var nodes=this.getNodes();
	
	// Check that all nodes are in the Oct Tree
	nodes.forEach(function(node) {
		if (!node.octTreeNode) {
			node.octTreeNode = this.octTree.addElement(this.octTree.head, node);
		}
	}, this);
	
	// Check that all of the nodes are in the right place in the Oct Tree
	this.octTree.checkPositionOfElements(this.octTree.head, true);
	
	if (this.coulombCalculationsPerFrame === 0) {
		this.coulombCalculationsPerFrame = Math.pow(this.getNodes().length,2); // There should generally be N^2 calculation, so let's set the starting point there
	}
	
	this.coulombMultiplier = 100000000/Math.log(this.graph.getNodeCount());
	
	return this;
	
};

