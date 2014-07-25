/**
  @author Justin Ormont

  Implements an Oct Tree (8-way spatial partitioning). Each Oct Tree Node can have eight children. 
  
  Runtime: 
  	Add element: log(N)
	Delete element: log(N)
	Checking element: N*log(N)
	Find element: log(N)

  Parameters:
    options: <Obj>, TBA
	
  Example:
    var octTree, nodes, i, numNodes=100;
	
	octTree = new Utils.OctTree({maxDepth:5, maxElementsPerNode:10});
	
	for (i=0; i<numNodes; i++) {
		octTree.addElement(octTree.head, new model.Node());
	}
	
	**/


var Utils = Utils||{};

Utils.OctTree = function(options) {
	"use strict";
	
	var options = options||{};
	
	this.maxElementsPerNode = options.maxElementsPerNode||10;
	this.maxDepth = options.maxDepth||5;
	
	this.head = new this.OctTreeNode([-10000, -10000, -10000], [10000, 10000, 10000]);

};

// Searches recursively for the right place to add an element
// Returns the Oct Tree Node which the elements ends up in
Utils.OctTree.prototype.addElement = function(octTreeNode, element) {
	"use strict";
	
	var subNode;
	
	// Recalculate the weighted average of the node positions within
	octTreeNode.avgX = (octTreeNode.avgX * octTreeNode.weight + element.x * (element.weight||1)) / (octTreeNode.weight + (element.weight||1));
	octTreeNode.avgY = (octTreeNode.avgY * octTreeNode.weight + element.y * (element.weight||1)) / (octTreeNode.weight + (element.weight||1));
	octTreeNode.avgZ = (octTreeNode.avgZ * octTreeNode.weight + element.z * (element.weight||1)) / (octTreeNode.weight + (element.weight||1));
	
	octTreeNode.weight += (element.weight||1);
	octTreeNode.elementsWithin += 1;
	
	if (octTreeNode.isLeafNode) {
		octTreeNode.elements.push(element);
		if (octTreeNode.elements.length > this.maxElementsPerNode && octTreeNode.depth < this.maxDepth) {
			this.splitOctTreeNode(octTreeNode);
		}
	}
	else {
		octTreeNode = this.addElement(this.findCorrectChildOctTreeNode(octTreeNode, element, true), element); // Recursively add the element to the corect child node
	}
	
	return octTreeNode;
};


Utils.OctTree.prototype.removeElement = function(octTreeNode, element) {
	"use strict";
	
	var indexAndNode, indexOfElement, success=false, parentNode;
	
	indexAndNode = this.findElement(octTreeNode, element);
	
	octTreeNode = indexAndNode[0]; // Replace octTreeNode w/ the node we found the element in 
	indexOfElement = indexAndNode[1];
	
	if (indexOfElement !== -1) { // Element was found
		success = true;
		
		// Remove element
		octTreeNode.elements.splice(indexOfElement,1);
		
		// Remove the weight, elementsWithin, & position averages from the entire branch the element is in (current node and above)
		while(octTreeNode) {
			// Recalculate the weighted average of the node positions within
			octTreeNode.avgX = (octTreeNode.avgX * octTreeNode.weight - element.x * (element.weight||1)) / (octTreeNode.weight - (element.weight||1));
			octTreeNode.avgY = (octTreeNode.avgY * octTreeNode.weight - element.y * (element.weight||1)) / (octTreeNode.weight - (element.weight||1));
			octTreeNode.avgZ = (octTreeNode.avgZ * octTreeNode.weight - element.z * (element.weight||1)) / (octTreeNode.weight - (element.weight||1));
			
			octTreeNode.elementsWithin -= 1;
			octTreeNode.weight -= (element.weight||1);
			
			if (octTreeNode.elementsWithin === 0) {
				parentNode = octTreeNode.parentNode;

				// Remove the empty Oct Tree Node from the parent (should place on a free list to save on allocations)
				if (parentNode) {
					if (octTreeNode === parentNode.subNodeMinXMinYMinZ) { parentNode.subNodeMinXMinYMinZ = null; }
					if (octTreeNode === parentNode.subNodeMinXMinYMaxZ) { parentNode.subNodeMinXMinYMaxZ = null; }
					if (octTreeNode === parentNode.subNodeMinXMaxYMinZ) { parentNode.subNodeMinXMaxYMinZ = null; }
					if (octTreeNode === parentNode.subNodeMinXMaxYMaxZ) { parentNode.subNodeMinXMaxYMaxZ = null; }

					if (octTreeNode === parentNode.subNodeMaxXMinYMinZ) { parentNode.subNodeMaxXMinYMinZ = null; }
					if (octTreeNode === parentNode.subNodeMaxXMinYMaxZ) { parentNode.subNodeMaxXMinYMaxZ = null; }
					if (octTreeNode === parentNode.subNodeMaxXMaxYMinZ) { parentNode.subNodeMaxXMaxYMinZ = null; }
					if (octTreeNode === parentNode.subNodeMaxXMaxYMaxZ) { parentNode.subNodeMaxXMaxYMaxZ = null; }
					parentNode.subNodeCount -= 1;
				}
				
				octTreeNode.isLeafNode = true;
				octTreeNode.weight = 0; // It should be roughtly zero besides addition errors
			}
			
			octTreeNode = octTreeNode.parentNode;
		}
	}

	return success;
};


Utils.OctTree.prototype.closestCornerOfBoundingBox = function(octTreeNode, element) {
	"use strict";
	
	var minXDist, minYDist, minZDist, minCornerDistance;
	
	if (   element.x < octTreeNode.minX 
		|| element.x > octTreeNode.maxX 
		|| element.y < octTreeNode.minY 
		|| element.y > octTreeNode.maxY 
		|| element.z < octTreeNode.minZ 
		|| element.z > octTreeNode.maxZ
	) {
		minXDist = Math.min(Math.abs(element.x - octTreeNode.minX), Math.abs(element.x - octTreeNode.maxX));
		minYDist = Math.min(Math.abs(element.y - octTreeNode.minY), Math.abs(element.y - octTreeNode.maxY));
		minZDist = Math.min(Math.abs(element.z - octTreeNode.minY), Math.abs(element.z - octTreeNode.maxZ));
		
		minCornerDistance = Math.sqrt(minXDist*minXDist + minYDist*minYDist + minZDist*minZDist);
	}
	else {
		minCornerDistance = 0; // We're inside of the box
	}
	
	return minCornerDistance;
};

// Returns the Oct Tree Node which the element is in, or null if not found
Utils.OctTree.prototype.checkPositionOfElements = function(octTreeNode, checkSubNodes) {
	"use strict";
	
	var i, element, elementsMoved=0, octTreeNodeChildren;
	
	checkSubNodes = !!checkSubNodes;
	
	// Check if we should split the Oct Tree Node (occurs when dynamically changing octTreeNode.depth)
	if (octTreeNode.elements.length > this.maxElementsPerNode && octTreeNode.depth < this.maxDepth) {
		this.splitOctTreeNode(octTreeNode);
	}
	
	// Reverse fori loop so any deleted elements won't affect the looping
	for (i = octTreeNode.elements.length - 1; i >= 0; i -= 1) {
		element = octTreeNode.elements[i];
		
		// Check if the element is outside the bounding box of octTreeNode
		if (element && (element.x < octTreeNode.minX || element.x > octTreeNode.maxX || element.y < octTreeNode.minY || element.x > octTreeNode.maxY || element.z < octTreeNode.minZ || element.z > octTreeNode.maxZ)) {
			elementsMoved += 1;
			this.removeElement(octTreeNode, element); // Remove the node from the current position
			this.addElement(this.head, element); // Insert the node back in the tree. ToDo: this could be more efficiently done by walking up the tree until it fits in the bounding box, then inserting.
		} 
	}
	
	if (checkSubNodes) {
		octTreeNodeChildren = this.octTreeNodeChildren(octTreeNode);
		
		for (i = octTreeNodeChildren.length - 1; i >= 0; i -= 1) {
			elementsMoved += this.checkPositionOfElements(octTreeNodeChildren[i], checkSubNodes)
		}
	}
	
	return elementsMoved;
};

// Returns the Oct Tree Node which the element is in, or null if not found
Utils.OctTree.prototype.findElement = function(octTreeNode, element) {
	"use strict";
	
	var indexOfElement=-1, correctOctTreeNode=null;
	
	indexOfElement = octTreeNode.elements.indexOf(element);
	
	while (indexOfElement===-1 && octTreeNode) {
		octTreeNode = this.findCorrectChildOctTreeNode(octTreeNode, element, false);
		indexOfElement = octTreeNode.elements.indexOf(element);
	}
	
	if (indexOfElement !== -1) { correctOctTreeNode = octTreeNode; }
	
	return [correctOctTreeNode, indexOfElement];
}

Utils.OctTree.prototype.octTreeNodeChildren = function(octTreeNode) {
	"use strict";

	var childrenNodes=[];

	if (octTreeNode.subNodeMinXMinYMinZ && octTreeNode.subNodeMinXMinYMinZ.elementsWithin) { childrenNodes.push(octTreeNode.subNodeMinXMinYMinZ); }
	if (octTreeNode.subNodeMinXMinYMaxZ && octTreeNode.subNodeMinXMinYMaxZ.elementsWithin) { childrenNodes.push(octTreeNode.subNodeMinXMinYMaxZ); }
	if (octTreeNode.subNodeMinXMaxYMinZ && octTreeNode.subNodeMinXMaxYMinZ.elementsWithin) { childrenNodes.push(octTreeNode.subNodeMinXMaxYMinZ); }
	if (octTreeNode.subNodeMinXMaxYMaxZ && octTreeNode.subNodeMinXMaxYMaxZ.elementsWithin) { childrenNodes.push(octTreeNode.subNodeMinXMaxYMaxZ); }
	if (octTreeNode.subNodeMaxXMinYMinZ && octTreeNode.subNodeMaxXMinYMinZ.elementsWithin) { childrenNodes.push(octTreeNode.subNodeMaxXMinYMinZ); }
	if (octTreeNode.subNodeMaxXMinYMaxZ && octTreeNode.subNodeMaxXMinYMaxZ.elementsWithin) { childrenNodes.push(octTreeNode.subNodeMaxXMinYMaxZ); }
	if (octTreeNode.subNodeMaxXMaxYMinZ && octTreeNode.subNodeMaxXMaxYMinZ.elementsWithin) { childrenNodes.push(octTreeNode.subNodeMaxXMaxYMinZ); }
	if (octTreeNode.subNodeMaxXMaxYMaxZ && octTreeNode.subNodeMaxXMaxYMaxZ.elementsWithin) { childrenNodes.push(octTreeNode.subNodeMaxXMaxYMaxZ); }

	return childrenNodes;
}


Utils.OctTree.prototype.findCorrectChildOctTreeNode = function(octTreeNode, element, createChildIfNeeded) {
	"use strict";
	
	var childNode=null;
	
	createChildIfNeeded = !!createChildIfNeeded; // default false
	
	if (element.x < octTreeNode.midX) {
		if (element.y < octTreeNode.midY) {
			if (element.z < octTreeNode.midZ) {
				childNode = octTreeNode.subNodeMinXMinYMinZ;
				if (!childNode && createChildIfNeeded) { 
					if (octTreeNode.isLeafNode) { throw "Error: Can't add a child node to a leaf node"; }
					childNode = octTreeNode.subNodeMinXMinYMinZ = new this.OctTreeNode([octTreeNode.minX, octTreeNode.minY, octTreeNode.minZ], octTreeNode); 
					octTreeNode.subNodeCount+=1; 
				}
			}
			else {
				childNode = octTreeNode.subNodeMinXMinYMaxZ;
				if (!childNode && createChildIfNeeded) { 
					if (octTreeNode.isLeafNode) { throw "Error: Can't add a child node to a leaf node"; }
					childNode = octTreeNode.subNodeMinXMinYMaxZ = new this.OctTreeNode([octTreeNode.minX, octTreeNode.minY, octTreeNode.maxZ], octTreeNode); 
					octTreeNode.subNodeCount+=1; 
				}
			}
		}
		else {
			if (element.z < octTreeNode.midZ) {
				childNode = octTreeNode.subNodeMinXMaxYMinZ;
				if (!childNode && createChildIfNeeded) { 
					if (octTreeNode.isLeafNode) { throw "Error: Can't add a child node to a leaf node"; }
					childNode = octTreeNode.subNodeMinXMaxYMinZ = new this.OctTreeNode([octTreeNode.minX, octTreeNode.maxY, octTreeNode.minZ], octTreeNode); 
					octTreeNode.subNodeCount+=1; 
				}
			}
			else {
				childNode = octTreeNode.subNodeMinXMaxYMaxZ;
				if (!childNode && createChildIfNeeded) { 
					if (octTreeNode.isLeafNode) { throw "Error: Can't add a child node to a leaf node"; }
					childNode = octTreeNode.subNodeMinXMaxYMaxZ = new this.OctTreeNode([octTreeNode.minX, octTreeNode.maxY, octTreeNode.maxZ], octTreeNode); 
					octTreeNode.subNodeCount+=1; 
				}
			}
		}
	
	}
	else {
		if (element.y < octTreeNode.midY) {
			if (element.z < octTreeNode.midZ) {
				childNode = octTreeNode.subNodeMaxXMinYMinZ;
				if (!childNode && createChildIfNeeded) { 
					if (octTreeNode.isLeafNode) { throw "Error: Can't add a child node to a leaf node"; }
					childNode = octTreeNode.subNodeMaxXMinYMinZ = new this.OctTreeNode([octTreeNode.maxX, octTreeNode.minY, octTreeNode.minZ], octTreeNode); 
					octTreeNode.subNodeCount+=1; 
				}
			}
			else {
				childNode = octTreeNode.subNodeMaxXMinYMaxZ;
				if (!childNode && createChildIfNeeded) { 
					if (octTreeNode.isLeafNode) { throw "Error: Can't add a child node to a leaf node"; }
					childNode = octTreeNode.subNodeMaxXMinYMaxZ = new this.OctTreeNode([octTreeNode.maxX, octTreeNode.minY, octTreeNode.maxZ], octTreeNode); 
					octTreeNode.subNodeCount+=1; 
				}
			}
		}
		else {
			if (element.z < octTreeNode.midZ) {
				childNode = octTreeNode.subNodeMaxXMaxYMinZ;
				if (!childNode && createChildIfNeeded) { 
					if (octTreeNode.isLeafNode) { throw "Error: Can't add a child node to a leaf node"; }
					childNode = octTreeNode.subNodeMaxXMaxYMinZ = new this.OctTreeNode([octTreeNode.maxX, octTreeNode.maxY, octTreeNode.minZ], octTreeNode); 
					octTreeNode.subNodeCount+=1; 
				}
			}
			else {
				childNode = octTreeNode.subNodeMaxXMaxYMaxZ;
				if (!childNode && createChildIfNeeded) { 
					if (octTreeNode.isLeafNode) { throw "Error: Can't add a child node to a leaf node"; }
					childNode = octTreeNode.subNodeMaxXMaxYMaxZ = new this.OctTreeNode([octTreeNode.maxX, octTreeNode.maxY, octTreeNode.maxZ], octTreeNode); 
					octTreeNode.subNodeCount+=1; 
				}
			}
		}
	}

	return childNode||null;
}


Utils.OctTree.prototype.splitOctTreeNode = function(octTreeNode) {
	"use strict";
	
	var elementsInNodes, i;
	
	if (!octTreeNode.isLeafNode) { throw "Non-leaf nodes are already split"; }
	if (octTreeNode.subNodeCount) { throw "Expected sub node count to be zero"; }
	
	
	elementsInNodes = octTreeNode.elements.slice(0); // Backup elements, so we can re-insert them below
	
	if (octTreeNode.depth > 3) {
		// Split the node at the median of the points within. (Huristic)
		octTreeNode.midX = Utils.arrayMedian(elementsInNodes.map(function(element) { return element.x; })) || octTreeNode.midX;
		octTreeNode.midY = Utils.arrayMedian(elementsInNodes.map(function(element) { return element.y; })) || octTreeNode.midY;
		octTreeNode.midZ = Utils.arrayMedian(elementsInNodes.map(function(element) { return element.z; })) || octTreeNode.midZ;
	}
	
	// Split node at the average of the points within. (Huristic)
	//octTreeNode.midX = octTreeNode.avgX;	
	//octTreeNode.midY = octTreeNode.avgY;
	//octTreeNode.midZ = octTreeNode.avgZ;
	
	this.removeContentsOfOctTreeNode(octTreeNode);
	
	octTreeNode.isLeafNode = false; // When set to false, any inserted elements will go into sub-nodes in the tree
	
	for (i = elementsInNodes.length - 1; i >= 0; i -= 1) {
		this.addElement(octTreeNode, elementsInNodes[i]); // Add the elements back to node, they will now be added to a sub-node since .isLeafNode=false
	}
};


Utils.OctTree.prototype.removeContentsOfOctTreeNode = function(octTreeNode) {
	"use strict";
	
	octTreeNode.elements = [];
	octTreeNode.subNodeCount = 0;
	octTreeNode.weight = 0;	
	octTreeNode.elementsWithin = 0;
	
	// Reset the average position (shouldn't make a difference, since the weight=0)
	octTreeNode.avgX = octTreeNode.midX;	
	octTreeNode.avgY = octTreeNode.midY;
	octTreeNode.avgZ = octTreeNode.midZ;
};


Utils.OctTree.prototype.OctTreeNode = function(cornerA /* [x, y, z] */, parentOrCornerB /* [x, y, z] OR another OctTreeNode */) {
	"use strict";

	var cornerB, minX, maxX, minY, maxY, minZ, maxZ;

	// Allow the second parameter to be an Oct Tree node, or a [x,y,z] array. 
	if (parentOrCornerB instanceof Utils.OctTree.prototype.OctTreeNode) {
		this.parentNode = parentOrCornerB;
		cornerB = [parentOrCornerB.midX, parentOrCornerB.midY, parentOrCornerB.midZ];
	}
	else { 
		this.parentNode = null; 
		cornerB = parentOrCornerB;
	}

	if (this.parentNode && this.parentNode.isLeafNode) { throw "Error: parent node can not be a leaf node"; }

	// Set node's bounding box & make sure the min and max elements are correct
	this.minX = Math.min(cornerA[0], cornerB[0]);
	this.maxX = Math.max(cornerA[0], cornerB[0]);
	this.minY = Math.min(cornerA[1], cornerB[1]);
	this.maxY = Math.max(cornerA[1], cornerB[1]);
	this.minZ = Math.min(cornerA[2], cornerB[2]);
	this.maxZ = Math.max(cornerA[2], cornerB[2]);
	
	// Pre-calculate the node's mid point
	this.midX = (this.minX + this.maxX)/2;
	this.midY = (this.minY + this.maxY)/2;
	this.midZ = (this.minZ + this.maxZ)/2;
	
	// The sub nodes in the Oct Tree
	this.subNodeMinXMinYMinZ = null;
	this.subNodeMinXMinYMaxZ = null;
	this.subNodeMinXMaxYMinZ = null;
	this.subNodeMinXMaxYMaxZ = null;
	this.subNodeMaxXMinYMinZ = null;
	this.subNodeMaxXMinYMaxZ = null;
	this.subNodeMaxXMaxYMinZ = null;
	this.subNodeMaxXMaxYMaxZ = null;
	
	this.isLeafNode = true;		// Leaf nodes store elements within, and structure nodes do not
	this.elements = [];			// The elements directly in this Oct Tree node
	this.subNodeCount = 0;		// The number of octTree nodes which are children of this node
	this.weight = 0;			// The total weight of the elements within this node, or below it
	this.elementsWithin = 0;	// The total count of the elements within this node, or below it
	this.depth = (this.parentNode?this.parentNode.depth+1:0); // The tree depth of the node

	// Weighted average of the node's elements
	this.avgX = this.midX;	
	this.avgY = this.midY;
	this.avgZ = this.midZ;
	
};

Utils.OctTree.prototype.allOctTreeNodes = function() {
	"use strict";
	
	var i=0, octTreeNodes=[this.head];
	
	// Breadth-first traversal
	while (i<octTreeNodes.length) {
		octTreeNodes = octTreeNodes.concat(this.octTreeNodeChildren(octTreeNodes[i]));
		i+=1;
	}
	
	return octTreeNodes;
};

Utils.OctTree.prototype.avergeNodeDepth = function() {
	"use strict";
	
	var octTreeNodes, averageDepth;
	
	octTreeNodes = this.allOctTreeNodes();
	
	averageDepth = octTreeNodes.map(function(octTreeNode) { return octTreeNode.depth; }).reduce(function(a, b) { return a + b; }) / octTreeNodes.length || 0;

	return averageDepth;
};


Utils.arrayMedian = function(arr) {
	var midIndex, median;
	
	midIndex = Math.floor(arr.length/2);
	
	arr = arr.sort();
	
	if (arr.length%2) {
        median = arr[midIndex];
	}
    else {
        median = (arr[midIndex-1] + arr[midIndex]) / 2;
	}
	
	return median;
};