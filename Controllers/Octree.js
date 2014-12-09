/**
  @author Justin Ormont

  Implements an Octree (8-way spatial partitioning). Each Octree Node can have eight children. 
  
  Runtime: 
  	Add element: log(N)
	Delete element: log(N)
	Checking element: N*log(N)
	Find element: log(N)

  Parameters:
    options: <Obj>, TBA
	
  Example:
    var octree, nodes, i, numNodes=100;
	
	octree = new Utils.Octree({maxDepth:5, maxElementsPerNode:10});
	
	for (i=0; i<numNodes; i++) {
		octree.addElement(octree.head, new model.Node());
	}
	
	**/


var Utils = Utils||{};

Utils.Octree = function(options) {
	"use strict";
	
	var options = options||{};
	
	this.maxElementsPerNode = (options.maxElementsPerNode!==undefined?options.maxElementsPerNode:10);
	this.maxDepth = (options.maxDepth!==undefined?options.maxDepth:15);
	
	//this.head = new this.OctreeNode([-10000, -10000, -10000], [10000, 10000, 10000]);
	this.head = this.OctreeNodeFactory([-10000, -10000, -10000], [10000, 10000, 10000]);
};

// Searches recursively for the right place to add an element
// Returns the Octree Node which the elements ends up in
Utils.Octree.prototype.addElement = function(octreeNode, element) {
	"use strict";
	
	var subNode, i, childrenNodes, octreeNodeErrors;

	//octreeNodeErrors = this.checkOctreeNode(octreeNode);
	if (octreeNodeErrors && octreeNodeErrors.length) { throw octreeNodeErrors[0]; }
	
	// Make sure Octree bounding box is large enough to hold this node
	if (octreeNode === this.head) {
		if (element && (element.x < octreeNode.minX || element.x > octreeNode.maxX || element.y < octreeNode.minY || element.x > octreeNode.maxY || element.z < octreeNode.minZ || element.z > octreeNode.maxZ)) {
			// ToDo: handle this condition without throwing an error. Perhaps: growing the Octree, moving the element back inside, rescale the element set, or investigate the effect of having nodes out of bounds
			//throw "Element is out of the boundary of the Octree. Element position=[" + element.x + "," + element.y + "," + element.z + "], boundingBox of Octree=[" + octreeNode.minX + "," +octreeNode.minY + "," +octreeNode.minZ + "] to [" + octreeNode.maxX + "," +octreeNode.maxY + "," +octreeNode.maxZ + "]";
			element.x=0;
			element.y=0;
			element.z=0;
		}
	}
	
	// Recalculate the weighted average of the node positions within
	//octreeNode.avgX = (octreeNode.avgX * octreeNode.weight + element.x * (element.weight||1)) / (octreeNode.weight + (element.weight||1));
	//octreeNode.avgY = (octreeNode.avgY * octreeNode.weight + element.y * (element.weight||1)) / (octreeNode.weight + (element.weight||1));
	//octreeNode.avgZ = (octreeNode.avgZ * octreeNode.weight + element.z * (element.weight||1)) / (octreeNode.weight + (element.weight||1));
	
	//octreeNode.weight += (element.weight||1);
	octreeNode.elementsWithin += 1;
	
	if (octreeNode.isLeafNode) {
		octreeNode.elements.push(element);
		if (octreeNode.elements.length > this.maxElementsPerNode && octreeNode.depth < this.maxDepth) {
			this.splitOctreeNode(octreeNode);
		}
	}
	else {
		//octreeNode = this.addElement(this.findCorrectChildOctreeNode(octreeNode, element, true), element); // Recursively add the element to the corect child node
		this.addElement(this.findCorrectChildOctreeNode(octreeNode, element, true), element); // Recursively add the element to the corect child node
	}
	
	// Sum positions & weights of elements
	octreeNode.weight = octreeNode.avgX = octreeNode.avgY = octreeNode.avgZ = 0;
	for (i=octreeNode.elements.length-1; i>=0; i-=1) {
		octreeNode.avgX += octreeNode.elements[i].x * (octreeNode.elements[i].weight||1);
		octreeNode.avgY += octreeNode.elements[i].y * (octreeNode.elements[i].weight||1);
		octreeNode.avgZ += octreeNode.elements[i].z * (octreeNode.elements[i].weight||1);
		octreeNode.weight += (octreeNode.elements[i].weight||1);
	}
	
	// Sum positions & weights of sub Octree nodes
	childrenNodes = this.octreeNodeChildren(octreeNode);
	for (i=childrenNodes.length-1; i>=0; i-=1) {
		octreeNode.avgX += childrenNodes[i].avgX * (childrenNodes[i].weight||1);
		octreeNode.avgY += childrenNodes[i].avgY * (childrenNodes[i].weight||1);
		octreeNode.avgZ += childrenNodes[i].avgZ * (childrenNodes[i].weight||1);
		octreeNode.weight += (childrenNodes[i].weight||1);
	}
	
	// Divide by weight to get the average
	octreeNode.avgX /= octreeNode.weight;
	octreeNode.avgY /= octreeNode.weight;
	octreeNode.avgZ /= octreeNode.weight;
	
	//octreeNodeErrors = this.checkOctreeNode(octreeNode);
	if (octreeNodeErrors && octreeNodeErrors.length) { throw octreeNodeErrors[0]; }
	
	return octreeNode;
};


Utils.Octree.prototype.removeElement = function(octreeNode, element) {
	"use strict";
	
	var indexAndNode, indexOfElement, success=false, parentNode, octreeNodeErrors;

	//octreeNodeErrors = this.checkOctreeNode(octreeNode);
	if (octreeNodeErrors && octreeNodeErrors.length) { throw octreeNodeErrors[0]; }
	
	indexAndNode = this.findElement(octreeNode, element);
	
	octreeNode = indexAndNode[0]; // Replace octreeNode w/ the node we found the element in 
	indexOfElement = indexAndNode[1];
	
	if (indexOfElement !== -1) { // Element was found
		success = true;
		
		// Remove element
		octreeNode.elements.splice(indexOfElement,1);
		
		var orgOctreeNode = octreeNode; // todo: remove debugging line
		
		// Remove the weight, elementsWithin, & position averages from the entire branch the element is in (current node and above)
		while(octreeNode) {
			// Recalculate the weighted average of the node positions within
			if 	(octreeNode.weight > (element.weight||1)) {			
				octreeNode.avgX = (octreeNode.avgX * octreeNode.weight - element.x * (element.weight||1)) / (octreeNode.weight - (element.weight||1));
				octreeNode.avgY = (octreeNode.avgY * octreeNode.weight - element.y * (element.weight||1)) / (octreeNode.weight - (element.weight||1));
				octreeNode.avgZ = (octreeNode.avgZ * octreeNode.weight - element.z * (element.weight||1)) / (octreeNode.weight - (element.weight||1));
			}
			else {
				octreeNode.avgX = octreeNode.midX;
				octreeNode.avgY = octreeNode.midY;
				octreeNode.avgZ = octreeNode.midZ;
			}
			
			octreeNode.elementsWithin -= 1;
			octreeNode.weight -= (element.weight||1);
	
			if (octreeNode.elementsWithin < 0) { console.error("Error: octreeNode.elementsWithin was negative: " + octreeNode.elementsWithin); }			
			//if (octreeNode.weight < 0) { console.error("Error: octreeNode.weight was negative: " + octreeNode.weight); }			
			
			if (octreeNode.elementsWithin === 0) {
				parentNode = octreeNode.parentNode;

				// Remove the empty Octree Node from the parent and place on a free list to save on memory allocations
				if (parentNode) { // Check that that octreeNode is not root
					this.FreeOctreeNode(octreeNode); // Note: inside of the parentNode check as we can't free the root  
				
					if (octreeNode === parentNode.subNodeMinXMinYMinZ) { parentNode.subNodeMinXMinYMinZ = null; }
					if (octreeNode === parentNode.subNodeMinXMinYMaxZ) { parentNode.subNodeMinXMinYMaxZ = null; }
					if (octreeNode === parentNode.subNodeMinXMaxYMinZ) { parentNode.subNodeMinXMaxYMinZ = null; }
					if (octreeNode === parentNode.subNodeMinXMaxYMaxZ) { parentNode.subNodeMinXMaxYMaxZ = null; }

					if (octreeNode === parentNode.subNodeMaxXMinYMinZ) { parentNode.subNodeMaxXMinYMinZ = null; }
					if (octreeNode === parentNode.subNodeMaxXMinYMaxZ) { parentNode.subNodeMaxXMinYMaxZ = null; }
					if (octreeNode === parentNode.subNodeMaxXMaxYMinZ) { parentNode.subNodeMaxXMaxYMinZ = null; }
					if (octreeNode === parentNode.subNodeMaxXMaxYMaxZ) { parentNode.subNodeMaxXMaxYMaxZ = null; }
					
					parentNode.subNodeCount -= 1;					
				}
				else { // Reset the root node
					octreeNode.isLeafNode = true;
					octreeNode.weight = 0; // It should be roughtly zero besides addition errors
				}
			}
			else {
				//octreeNodeErrors = this.checkOctreeNode(octreeNode);
				if (octreeNodeErrors && octreeNodeErrors.length) { throw octreeNodeErrors[0]; }			
			}
			
			octreeNode = octreeNode.parentNode;
		}
	}
	else { throw new Error("Tried to remove an element which didn't exist in octreeNode") }

	return success;
};

// Updates the avgX, avgY, avgZ. 
// The elements within the leaf octreeNodes are assumed to be in motion.
// The averages will get stale over time, and are only approximate until updated. 
Utils.Octree.prototype.updateAveragePosition = function(octreeNode, recursive) {
	"use strict";
	
	var i, childrenNodes;
	
	
	childrenNodes = (octreeNode.subNodeCount?this.octreeNodeChildren(octreeNode):null);
	
	// Update the child nodes first so the current node is correct
	if (recursive && childrenNodes) {
		for (i=childrenNodes.length-1; i>=0; i-=1) {
			this.updateAveragePosition(childrenNodes[i], recursive);
		}
	}	
	
	// Sum positions & weights of elements
	octreeNode.weight = octreeNode.avgX = octreeNode.avgY = octreeNode.avgZ = 0;
	for (i=octreeNode.elements.length-1; i>=0; i-=1) {
		octreeNode.avgX += octreeNode.elements[i].x * (octreeNode.elements[i].weight||1);
		octreeNode.avgY += octreeNode.elements[i].y * (octreeNode.elements[i].weight||1);
		octreeNode.avgZ += octreeNode.elements[i].z * (octreeNode.elements[i].weight||1);
		octreeNode.weight += (octreeNode.elements[i].weight||1);
	}
	
	// Sum positions & weights of sub Octree nodes
	if (childrenNodes) { 
		for (i=childrenNodes.length-1; i>=0; i-=1) {
			octreeNode.avgX += childrenNodes[i].avgX * (childrenNodes[i].weight||1);
			octreeNode.avgY += childrenNodes[i].avgY * (childrenNodes[i].weight||1);
			octreeNode.avgZ += childrenNodes[i].avgZ * (childrenNodes[i].weight||1);
			octreeNode.weight += (childrenNodes[i].weight||1);
		}
	}
}

Utils.Octree.prototype.closestCornerOfBoundingBoxSquared = function(octreeNode, element) {
	"use strict";
	
	var minXDist, minYDist, minZDist, minCornerDistance;
	
	if (  element.x < octreeNode.minX 
		|| element.x > octreeNode.maxX 
		|| element.y < octreeNode.minY 
		|| element.y > octreeNode.maxY 
		|| element.z < octreeNode.minZ 
		|| element.z > octreeNode.maxZ
	) {
		minXDist = Math.min(Math.abs(element.x - octreeNode.minX), Math.abs(element.x - octreeNode.maxX));
		minYDist = Math.min(Math.abs(element.y - octreeNode.minY), Math.abs(element.y - octreeNode.maxY));
		minZDist = Math.min(Math.abs(element.z - octreeNode.minY), Math.abs(element.z - octreeNode.maxZ));
		
		minCornerDistance = minXDist*minXDist + minYDist*minYDist + minZDist*minZDist;
	}
	else {
		minCornerDistance = 0; // We're inside of the box
	}
	
	return minCornerDistance;
};

// Returns the Octree Node which the element is in, or null if not found
Utils.Octree.prototype.checkPositionOfElements = function(octreeNode, checkSubNodes) {
	"use strict";
	
	var i, element, elementsMoved=0, octreeNodeChildren, octreeNodeErrors;

	checkSubNodes = !!checkSubNodes;
	
	// Check if we should split the Octree Node (occurs when dynamically changing octreeNode.depth)
	if (octreeNode.elements.length > this.maxElementsPerNode && octreeNode.depth < this.maxDepth) {
		this.splitOctreeNode(octreeNode);
	}
	
	// Reverse fori loop so any deleted elements won't affect the looping
	for (i = octreeNode.elements.length - 1; i >= 0; i -= 1) {
		element = octreeNode.elements[i];
		
		// Check if the element is outside the bounding box of octreeNode
		if (element && (element.x < octreeNode.minX || element.x > octreeNode.maxX || element.y < octreeNode.minY || element.x > octreeNode.maxY || element.z < octreeNode.minZ || element.z > octreeNode.maxZ)) {
			elementsMoved += 1;
			this.removeElement(octreeNode, element); // Remove the node from the current position
			if (this.findElement(this.head, element)[0]) { throw new Error("Element still existed after being removed."); }			
			this.addElement(this.head, element); // Insert the node back in the tree. ToDo: this could be more efficiently done by walking up the tree until it fits in the bounding box, then inserting.
			if (!this.findElement(this.head, element)[0]) { throw new Error("Element doesn't exist after being added."); }						
		} 
	}
	
	if (checkSubNodes) {
		octreeNodeChildren = this.octreeNodeChildren(octreeNode);
		
		for (i = octreeNodeChildren.length - 1; i >= 0; i -= 1) {
			elementsMoved += this.checkPositionOfElements(octreeNodeChildren[i], checkSubNodes)
		}
	}

	//octreeNodeErrors = this.checkOctreeNode(octreeNode);
	if (octreeNodeErrors && octreeNodeErrors.length) { throw octreeNodeErrors[0]; }
	
	return elementsMoved;
};



// Checks the consistancy of the octreeNode
// Returns an array of errors if errors are found, or null if no errors are found
Utils.Octree.prototype.checkOctreeNode = function(octreeNode) {
	"use strict";

	var errors=[], i, avgX, avgY, avgZ, weight;
	
	// Check that structure nodes don't have elements
	if (!octreeNode.isLeafNode && octreeNode.elements.length) { errors.push(new Error("Structure node can not contain elements, only leaf nodes can.")); }
	
	// Check the value of `depth`
	if ((!Number.isFinite(octreeNode.depth) || !(octreeNode.depth >= 0) || Math.round(octreeNode.depth) !== octreeNode.depth) && !octreeNode.inPool) { errors.push(new Error("The `depth` value is not a positive integer.")); }
	
	// Check that `depth` is one more than its parent
	if (octreeNode.parentNode && octreeNode.parentNode.depth+1 !== octreeNode.depth) { errors.push(new Error("The `depth` value must be one greater than its parent's depth.")); }
	
	// Partially check the value of `elementsWithin`
	if (octreeNode.elementsWithin < octreeNode.elements.length) { errors.push(new Error("Octree node contained more elements directly than `elementsWithin` specifies.")); }

	// Check the value of `subNodeCount`
	if (this.octreeNodeChildren(octreeNode).length !== octreeNode.subNodeCount) { errors.push(new Error("The `subNodeCount` does not match the number of sub-octreeNodes.")); }

	// Check that the octreeNode is its parent's child
	if (octreeNode.parentNode && this.octreeNodeChildren(octreeNode.parentNode).indexOf(octreeNode) === -1) { errors.push(new Error("OctreeNode isn't a child of its parent octreeNode.")); }

	// Check that a parent exists for all octreeNodes, except for the head
	if (!octreeNode.parentNode && octreeNode !== this.head && !octreeNode.inPool) { errors.push(new Error("OctreeNode doesn't have a parent. Only the Octree head node can have no parent.")); }

	// Check that the head octreeNode doesn't have a parent
	if (octreeNode === this.head && octreeNode.parentNode) { errors.push(new Error("Head octreeNode can't have a parent.")); }

	// Check the bounds of the octreeNode
	if (octreeNode.maxX <= octreeNode.minX || octreeNode.maxY <= octreeNode.minY || octreeNode.maxZ <= octreeNode.minZ) { errors.push(new Error("OctreeNode has incorrect boundaries.")); }

	// Check the midpoint of the octreeNode
	if (octreeNode.midX !== octreeNode.maxX/2 + octreeNode.minX/2 || octreeNode.midY !== octreeNode.maxY/2 + octreeNode.minY/2 || octreeNode.midZ !== octreeNode.maxZ/2 + octreeNode.minZ/2) { errors.push(new Error("OctreeNode has incorrect mid point.")); }

/*
	// Check the average position of the octreeNode's elements
	if (octreeNode.isLeafNode && octreeNode.elements.length) {
		avgX = avgY = avgZ = weight = 0;
		for (i=octreeNode.elements.length-1; i>=0; i-=1) {
			avgX += octreeNode.elements[i].x * (octreeNode.elements[i].weight||1);
			avgY += octreeNode.elements[i].y * (octreeNode.elements[i].weight||1);
			avgZ += octreeNode.elements[i].z * (octreeNode.elements[i].weight||1);
			weight += (octreeNode.elements[i].weight||1);
		}
		avgX /= weight;
		avgY /= weight;
		avgZ /= weight;
		
		if (octreeNode.avgX !== avgX || octreeNode.avgY !== avgY || octreeNode.avgZ !== avgZ) { errors.push(new Error("OctreeNode has incorrect averages.")); }
	}
*/

	return (errors.length?errors:null);
}

// Returns the Octree Node which the element is in, or null if not found
Utils.Octree.prototype.findElement = function(octreeNode, element) {
	"use strict";
	
	var indexOfElement=-1, correctOctreeNode=null;
	
	indexOfElement = octreeNode.elements.indexOf(element);
	
	while (indexOfElement===-1 && octreeNode) {
		octreeNode = this.findCorrectChildOctreeNode(octreeNode, element, false);
		indexOfElement = (octreeNode?octreeNode.elements.indexOf(element):-1);
	}
	
	if (indexOfElement !== -1) { correctOctreeNode = octreeNode; }
	
	return [correctOctreeNode, indexOfElement];
}

// Returns the octreeNode's child octreeNodes. `requireElements` if true, only returns child octreeNodes which have elements in them (or in its childen)
Utils.Octree.prototype.octreeNodeChildren = function(octreeNode, requireElements) {
	"use strict";

	var childrenNodes=[];

	if (requireElements) {
		if (octreeNode.subNodeMinXMinYMinZ && octreeNode.subNodeMinXMinYMinZ.elementsWithin) { childrenNodes.push(octreeNode.subNodeMinXMinYMinZ); }
		if (octreeNode.subNodeMinXMinYMaxZ && octreeNode.subNodeMinXMinYMaxZ.elementsWithin) { childrenNodes.push(octreeNode.subNodeMinXMinYMaxZ); }
		if (octreeNode.subNodeMinXMaxYMinZ && octreeNode.subNodeMinXMaxYMinZ.elementsWithin) { childrenNodes.push(octreeNode.subNodeMinXMaxYMinZ); }
		if (octreeNode.subNodeMinXMaxYMaxZ && octreeNode.subNodeMinXMaxYMaxZ.elementsWithin) { childrenNodes.push(octreeNode.subNodeMinXMaxYMaxZ); }
		if (octreeNode.subNodeMaxXMinYMinZ && octreeNode.subNodeMaxXMinYMinZ.elementsWithin) { childrenNodes.push(octreeNode.subNodeMaxXMinYMinZ); }
		if (octreeNode.subNodeMaxXMinYMaxZ && octreeNode.subNodeMaxXMinYMaxZ.elementsWithin) { childrenNodes.push(octreeNode.subNodeMaxXMinYMaxZ); }
		if (octreeNode.subNodeMaxXMaxYMinZ && octreeNode.subNodeMaxXMaxYMinZ.elementsWithin) { childrenNodes.push(octreeNode.subNodeMaxXMaxYMinZ); }
		if (octreeNode.subNodeMaxXMaxYMaxZ && octreeNode.subNodeMaxXMaxYMaxZ.elementsWithin) { childrenNodes.push(octreeNode.subNodeMaxXMaxYMaxZ); }
	} else {
		if (octreeNode.subNodeMinXMinYMinZ) { childrenNodes.push(octreeNode.subNodeMinXMinYMinZ); }
		if (octreeNode.subNodeMinXMinYMaxZ) { childrenNodes.push(octreeNode.subNodeMinXMinYMaxZ); }
		if (octreeNode.subNodeMinXMaxYMinZ) { childrenNodes.push(octreeNode.subNodeMinXMaxYMinZ); }
		if (octreeNode.subNodeMinXMaxYMaxZ) { childrenNodes.push(octreeNode.subNodeMinXMaxYMaxZ); }
		if (octreeNode.subNodeMaxXMinYMinZ) { childrenNodes.push(octreeNode.subNodeMaxXMinYMinZ); }
		if (octreeNode.subNodeMaxXMinYMaxZ) { childrenNodes.push(octreeNode.subNodeMaxXMinYMaxZ); }
		if (octreeNode.subNodeMaxXMaxYMinZ) { childrenNodes.push(octreeNode.subNodeMaxXMaxYMinZ); }
		if (octreeNode.subNodeMaxXMaxYMaxZ) { childrenNodes.push(octreeNode.subNodeMaxXMaxYMaxZ); }
	}
	
	return childrenNodes;
}


Utils.Octree.prototype.findCorrectChildOctreeNode = function(octreeNode, element, createChildIfNeeded) {
	"use strict";
	
	var childNode=null;
	
	createChildIfNeeded = !!createChildIfNeeded; // default false
	
	if (element.x < octreeNode.midX) {
		if (element.y < octreeNode.midY) {
			if (element.z < octreeNode.midZ) {
				childNode = octreeNode.subNodeMinXMinYMinZ;
				if (!childNode && createChildIfNeeded) { 
					if (octreeNode.isLeafNode) { throw "Error: Can't add a child node to a leaf node"; }
					childNode = octreeNode.subNodeMinXMinYMinZ = this.OctreeNodeFactory([octreeNode.minX, octreeNode.minY, octreeNode.minZ], octreeNode); 
					octreeNode.subNodeCount+=1; 
				}
			}
			else {
				childNode = octreeNode.subNodeMinXMinYMaxZ;
				if (!childNode && createChildIfNeeded) { 
					if (octreeNode.isLeafNode) { throw "Error: Can't add a child node to a leaf node"; }
					childNode = octreeNode.subNodeMinXMinYMaxZ = this.OctreeNodeFactory([octreeNode.minX, octreeNode.minY, octreeNode.maxZ], octreeNode); 
					octreeNode.subNodeCount+=1; 
				}
			}
		}
		else {
			if (element.z < octreeNode.midZ) {
				childNode = octreeNode.subNodeMinXMaxYMinZ;
				if (!childNode && createChildIfNeeded) { 
					if (octreeNode.isLeafNode) { throw "Error: Can't add a child node to a leaf node"; }
					childNode = octreeNode.subNodeMinXMaxYMinZ = this.OctreeNodeFactory([octreeNode.minX, octreeNode.maxY, octreeNode.minZ], octreeNode); 
					octreeNode.subNodeCount+=1; 
				}
			}
			else {
				childNode = octreeNode.subNodeMinXMaxYMaxZ;
				if (!childNode && createChildIfNeeded) { 
					if (octreeNode.isLeafNode) { throw "Error: Can't add a child node to a leaf node"; }
					childNode = octreeNode.subNodeMinXMaxYMaxZ = this.OctreeNodeFactory([octreeNode.minX, octreeNode.maxY, octreeNode.maxZ], octreeNode); 
					octreeNode.subNodeCount+=1; 
				}
			}
		}
	
	}
	else {
		if (element.y < octreeNode.midY) {
			if (element.z < octreeNode.midZ) {
				childNode = octreeNode.subNodeMaxXMinYMinZ;
				if (!childNode && createChildIfNeeded) { 
					if (octreeNode.isLeafNode) { throw "Error: Can't add a child node to a leaf node"; }
					childNode = octreeNode.subNodeMaxXMinYMinZ = this.OctreeNodeFactory([octreeNode.maxX, octreeNode.minY, octreeNode.minZ], octreeNode); 
					octreeNode.subNodeCount+=1; 
				}
			}
			else {
				childNode = octreeNode.subNodeMaxXMinYMaxZ;
				if (!childNode && createChildIfNeeded) { 
					if (octreeNode.isLeafNode) { throw "Error: Can't add a child node to a leaf node"; }
					childNode = octreeNode.subNodeMaxXMinYMaxZ = this.OctreeNodeFactory([octreeNode.maxX, octreeNode.minY, octreeNode.maxZ], octreeNode); 
					octreeNode.subNodeCount+=1; 
				}
			}
		}
		else {
			if (element.z < octreeNode.midZ) {
				childNode = octreeNode.subNodeMaxXMaxYMinZ;
				if (!childNode && createChildIfNeeded) { 
					if (octreeNode.isLeafNode) { throw "Error: Can't add a child node to a leaf node"; }
					childNode = octreeNode.subNodeMaxXMaxYMinZ = this.OctreeNodeFactory([octreeNode.maxX, octreeNode.maxY, octreeNode.minZ], octreeNode); 
					octreeNode.subNodeCount+=1; 
				}
			}
			else {
				childNode = octreeNode.subNodeMaxXMaxYMaxZ;
				if (!childNode && createChildIfNeeded) { 
					if (octreeNode.isLeafNode) { throw "Error: Can't add a child node to a leaf node"; }
					childNode = octreeNode.subNodeMaxXMaxYMaxZ = this.OctreeNodeFactory([octreeNode.maxX, octreeNode.maxY, octreeNode.maxZ], octreeNode); 
					octreeNode.subNodeCount+=1; 
				}
			}
		}
	}

	return childNode||null;
}


Utils.Octree.prototype.splitOctreeNode = function(octreeNode) {
	"use strict";
	
	var elementsInNodes, i, parentNode;
	
	if (!octreeNode.isLeafNode) { throw "Non-leaf nodes are already split"; }
	if (octreeNode.subNodeCount) { throw "Expected sub node count to be zero"; }
	
	parentNode = octreeNode.parentNode;
	elementsInNodes = octreeNode.elements.slice(0); // Backup elements, so we can re-insert them below
	
	// Split the node at the median of the points within. (Huristic)
	if (octreeNode.depth > 0) {
		octreeNode.midX = Utils.arrayMedian(elementsInNodes.map(function(element) { return element.x; })) || octreeNode.midX;
		octreeNode.midY = Utils.arrayMedian(elementsInNodes.map(function(element) { return element.y; })) || octreeNode.midY;
		octreeNode.midZ = Utils.arrayMedian(elementsInNodes.map(function(element) { return element.z; })) || octreeNode.midZ;
	}
	
	// Split the node at the midpoint betwen the median of the points within & the mid point of the node. (Huristic)
	//if (octreeNode.depth > 5) {
	//	octreeNode.midX = (Utils.arrayMedian(elementsInNodes.map(function(element) { return element.x; })) + octreeNode.midX)/2;
	//	octreeNode.midY = (Utils.arrayMedian(elementsInNodes.map(function(element) { return element.y; })) + octreeNode.midY)/2;
	//	octreeNode.midZ = (Utils.arrayMedian(elementsInNodes.map(function(element) { return element.z; })) + octreeNode.midZ)/2;
	//}
	
	// Split node at the average of the points within. (Huristic)
	//if (octreeNode.depth > 5) {
	//	octreeNode.midX = octreeNode.avgX;	
	//	octreeNode.midY = octreeNode.avgY;
	//	octreeNode.midZ = octreeNode.avgZ;
	//}
	
	// Split node at the midpoint between average of the points within & the middle of the Octree node. (Huristic)
	//if (octreeNode.depth > 5) {
	//	octreeNode.midX = (octreeNode.midX + octreeNode.avgX)*0.5;	
	//	octreeNode.midY = (octreeNode.midY + octreeNode.avgY)*0.5;
	//	octreeNode.midZ = (octreeNode.midZ + octreeNode.avgZ)*0.5;
	//}
	
	this.removeContentsOfOctreeNode(octreeNode);
	
	octreeNode.isLeafNode = false; // When set to false, any inserted elements will go into sub-nodes in the tree
	octreeNode.parentNode	 = parentNode;
	octreeNode.depth = (octreeNode.parentNode?octreeNode.parentNode.depth+1:0);
	
	for (i = elementsInNodes.length - 1; i >= 0; i -= 1) {
		this.addElement(octreeNode, elementsInNodes[i]); // Add the elements back to node, they will now be added to a sub-node since .isLeafNode=false
	}
};


// Cleans the octreeNode
// Used after splitting the octreeNode, or when returning it to the pool of octreeNode
Utils.Octree.prototype.removeContentsOfOctreeNode = function(octreeNode) {
	"use strict";

	if (this.hasChildOctreeNodes(octreeNode)) { throw new Error("Tried to remove contents of octreeNode which has sub-octreeNodes"); }	
	
	octreeNode.isLeafNode = true;	// Leaf nodes store elements within, and structure nodes do not
	//octreeNode.elements = [];	// The elements directly in this Octree node
	while (octreeNode.elements.length) { octreeNode.elements.pop(); } // The elements directly in this Octree node
	octreeNode.subNodeCount = 0;	// The number of octree nodes which are children of this node
	octreeNode.weight = 0;			// The total weight of the elements within this node, or below it
	octreeNode.elementsWithin = 0;	// The total count of the elements within this node, or below it
	octreeNode.depth = undefined; // The tree depth of the node
	octreeNode.parentNode = undefined;	
	
	// Reset the average position (shouldn't make a difference, since the weight=0)
	octreeNode.avgX = octreeNode.midX;	
	octreeNode.avgY = octreeNode.midY;
	octreeNode.avgZ = octreeNode.midZ;
};


Utils.Octree.prototype.OctreeNodeFactory = function(cornerA /* [x, y, z] */, parentOrCornerB /* [x, y, z] OR another OctreeNode */) {
	"use strict";
	
	var octreeNode;
	
	if (Utils.Octree.prototype.freeOctreeNodes.length) { octreeNode = Utils.Octree.prototype.freeOctreeNodes.pop(); octreeNode.init(cornerA, parentOrCornerB); }
	else { octreeNode = new this.OctreeNode(cornerA /* [x, y, z] */, parentOrCornerB /* [x, y, z] OR another OctreeNode */); }
	
	return octreeNode;
}

Utils.Octree.prototype.OctreeNode = function(cornerA /* [x, y, z] */, parentOrCornerB /* [x, y, z] OR another OctreeNode */) {
	"use strict";

	this.init(cornerA, parentOrCornerB);
};

Utils.Octree.prototype.OctreeNode.prototype.init = function(cornerA /* [x, y, z] */, parentOrCornerB /* [x, y, z] OR another OctreeNode */) {
	"use strict";

	var cornerB, minX, maxX, minY, maxY, minZ, maxZ;

	// Allow the second parameter to be an Octree node, or a [x,y,z] array. 
	if (parentOrCornerB instanceof Utils.Octree.prototype.OctreeNode) {
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
	
	// The sub nodes in the Octree
	this.subNodeMinXMinYMinZ = null;
	this.subNodeMinXMinYMaxZ = null;
	this.subNodeMinXMaxYMinZ = null;
	this.subNodeMinXMaxYMaxZ = null;
	this.subNodeMaxXMinYMinZ = null;
	this.subNodeMaxXMinYMaxZ = null;
	this.subNodeMaxXMaxYMinZ = null;
	this.subNodeMaxXMaxYMaxZ = null;
	
	this.isLeafNode = true;		// Leaf octree nodes store elements within, and structure nodes do not
	this.inPool = false;			// The node is in the pool of free octreeNodes
	this.elements = [];			// The elements directly in this Octree node
	this.subNodeCount = 0;		// The number of octree nodes which are children of this node
	this.weight = 0;				// The total weight of the elements within this node, or below it
	this.elementsWithin = 0;		// The total count of the elements within this node, or below it
	this.depth = (this.parentNode?this.parentNode.depth+1:0); // The tree depth of the node

	// Weighted average of the node's elements
	this.avgX = this.midX;	
	this.avgY = this.midY;
	this.avgZ = this.midZ;
	
};

Utils.Octree.prototype.FreeOctreeNode = function(octreeNode) {
	"use strict";

	var octreeNodeErrors;

	if (this.hasChildOctreeNodes(octreeNode)) { throw new Error("Tried to free an octreeNode which has sub-nodes"); }	

	octreeNodeErrors = this.checkOctreeNode(octreeNode);
	if (octreeNodeErrors && octreeNodeErrors.length) { throw octreeNodeErrors[0]; }

	this.removeContentsOfOctreeNode(octreeNode);	
	octreeNode.inPool = true;	
	
	//Utils.Octree.prototype.freeOctreeNodes.push(octreeNode);
};

Utils.Octree.prototype.freeOctreeNodes = [];

Utils.Octree.prototype.allOctreeNodes = function() {
	"use strict";
	
	var i=0, octreeNodes=[this.head];
	
	// Breadth-first traversal
	while (i<octreeNodes.length) {
		octreeNodes = octreeNodes.concat(this.octreeNodeChildren(octreeNodes[i]));
		i+=1;
	}
	
	return octreeNodes;
};

Utils.Octree.prototype.hasChildOctreeNodes = function(octreeNode) {
	"use strict";
	
	var hasChildren;
	
	hasChildren = octreeNode.subNodeMinXMinYMinZ || octreeNode.subNodeMinXMinYMaxZ || octreeNode.subNodeMinXMaxYMinZ || octreeNode.subNodeMinXMaxYMaxZ || octreeNode.subNodeMaxXMinYMinZ || octreeNode.subNodeMaxXMinYMaxZ || octreeNode.subNodeMaxXMaxYMinZ || octreeNode.subNodeMaxXMaxYMaxZ;
	
	return !!hasChildren;
};

Utils.Octree.prototype.avergeNodeDepth = function(onlyLeafNodes) {
	"use strict";
	
	var octreeNodes, averageDepth;
	
	octreeNodes = this.allOctreeNodes();
	
	if (onlyLeafNodes) {
		octreeNodes = octreeNodes.filter(function(octreeNode) { return octreeNode.isLeafNode; });	
	}
	
	averageDepth = octreeNodes.map(function(octreeNode) { return octreeNode.depth; }).reduce(function(a, b) { return a + b; }) / octreeNodes.length || 0;

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