/**
  @author Justin Ormont

  Stores a set of nodes & verticies. 
  
  Runtime: 
  	Add node: O(N)
	Remove node: O(N)
	Add vertex: O(M), where M=Num existing verticies in the node
	Remove vertex: O(M), where M=Num existing verticies in the node
	
  Parameters:
    None	
	
  Example:
    var model, i, nodes, numNodesToCreate=100;
	model = new Models.NodeList();			// Stores the nodes (a graph)
	
	// Create and store new nodes
	for (i=0; i<numNodesToCreate; i++) {
		model.addNodes(new model.Node());	
	}
	
	// Create new verticies by randomly connecting pairs of entities
	for (i=0; i<numNodes; i++) { 
		model.addVerticies(nodes[Math.floor(numNodesToCreate * Math.random())], nodes[Math.floor(numNodesToCreate * Math.random())]); 
	}
**/


var Models = Models||{};

Models.NodeList = function() {
	"use strict";
	
	this.nodeList = [];
	this.nodeCount = 0;
	
	return this;
}

Models.NodeList.prototype.addNodes = function(nodes) {
	"use strict";
	
	this.pushDistinct(this.nodeList, nodes);
	this.nodeCount = this.nodeList.length;
	
	return this;
};

Models.NodeList.prototype.deleteNodes = function(nodes) {
	"use strict";
	
	this.runOnObjOrListOfObj(nodes, function(node) { node.isDeleted = true; });
	this.removeFromList(this.nodeList, nodes);
	this.nodeCount = this.nodeList.length;
	
	return this;
};

Models.NodeList.prototype.getNodes = function() {
	"use strict";
	
	return this.nodeList;
}

Models.NodeList.prototype.getNodeCount = function() {
	"use strict";
	
	return this.nodeCount;
}

Models.NodeList.prototype.addVerticies = function(fromNode, toNodes) {
	"use strict";
	
	var that=this;
	
	this.addNodes(toNodes); // Make sure we have the nodes in the graph before connecting them to other nodes
	
	this.runOnObjOrListOfObj(toNodes, function(toNode) {
		that.pushDistinct(fromNode.verticies, new that.Vertex(fromNode, toNode), that.Vertex.prototype.indexOfVertex);
		that.pushDistinct(toNode.verticies, new that.Vertex(toNode, fromNode), that.Vertex.prototype.indexOfVertex);
	});
	
	return this;
};

Models.NodeList.prototype.deleteVerticies = function(fromNode, toNodes) {
	"use strict";
	
	this.runOnObjOrListOfObj(toNodes, function(toNode) {
		this.removeFromList(fromNode.verticies, new that.Vertex(fromNode, toNode), that.Vertex.prototype.indexOfVertex);
	});
	
	return this;
};


Models.NodeList.prototype.pushDistinct = function(list, elementOrElements, indexOfFunction /* optional */) {
	"use strict";
	
	var index;
	
	this.runOnObjOrListOfObj(elementOrElements, function(item) {
		if (indexOfFunction) { index = indexOfFunction(list, item); }
		else { index = list.indexOf(item); }
		if (index === -1) { list.push(item); }
	});
	
	return list;
};

Models.NodeList.prototype.removeFromList = function(list, elementOrElements, indexOfFunction /* optional */) {
	"use strict";
	
	var index;
	
	this.runOnObjOrListOfObj(elementOrElements,function(item) {
		if (indexOfFunction) { index = indexOfFunction(list, item); }
		else { index = list.indexOf(item); }
		
		if (index !== -1) { list.splice(index,1); }
	});
	
	return list;
};

Models.NodeList.prototype.runOnObjOrListOfObj = function(objOrListOfObj, funct) {
	"use strict";
	
	if (Array.isArray(objOrListOfObj)) {
		objOrListOfObj.forEach(funct);
	}
	else {
		funct(objOrListOfObj);
	}
};

Models.NodeList.prototype.Vertex = function(from, to) {
	"use strict";
	
	this.init();
	
	this.from = from;
	this.to = to;
	this.renderingObj = null;
	this.isDeleted = null;
	
	return this;
};

Models.NodeList.prototype.Vertex.prototype.init = function() {
	"use strict";
		
	this.isDeleted = false;
	
	return this;
}

Models.NodeList.prototype.Vertex.prototype.indexOfVertex = function(list, vertex) {
	"use strict";
	
	var index = -1;
	list.forEach(function(v, i) {
		if (v.to === vertex.to && v.from === vertex.from) { index = i; }
	});
	
	return index;
};

Models.NodeList.prototype.Node = function() {
	"use strict";
	
	this.init();
	
	return this;
};

Models.NodeList.prototype.Node.prototype.init = function() {
	"use strict";
	
	this.verticies = [];
	
	this.id;
	this.weight = 1;
	
	this.renderingObj = null; // Link to the object in the rendering system
	
	this.isDeleted = false;
	
	this.resetPositionAndVelocity();
	
	return this;
}

Models.NodeList.prototype.Node.prototype.resetPositionAndVelocity = function() {
	"use strict";
	
	//this.x = 0;
	//this.y = 0;
	//this.z = 0;
	this.x = (Math.random()-0.5)*5000;
	this.y = (Math.random()-0.5)*5000;
	this.z = (Math.random()-0.5)*5000;
	
	//this.velocity = [0, 0, 0];
	this.velocity = [Math.random()-0.5, Math.random()-0.5, Math.random()-0.5];
	
	return this;
}

Models.NodeList.prototype.Node.prototype.getPosition = function() {
	"use strict";
	
	return {x:this.x, y:this.y, z:this.z};
}
