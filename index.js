/**
  @author Justin Ormont

  Demonstrates the usage of the Octree Force Directed Graph. and normal Force Directed Graph.
  
  Runtime: 
  	O(N^3) as N nodes, always compated to N-1 other nodes, taking N iterations to converge => O(N^3).

  Parameters:
    graph: <Models.NodeList>, class instance which maintains the list of nodes & verticies. 
    options: <Obj>, TBA
	
  Example:
    var model, view, controller;
	model = new Models.NodeList();								// Stores the nodes (a graph)
	view = new Views.ThreeJS(model);							// Displays the nodes
	controller = new Controllers.ForceDirected(model, view);	// Moves the nodes	
**/


var model, view, controller;

// Builds the graph: Creates nodes, then connects nodes together.
function createRandomTree(model) {
	"use strict";
	
	var numNodes=250, nodes, i, parentNode;
	
	for (i=0; i<numNodes; i++) {
		model.addNodes(new model.Node());
	}
	
	nodes = model.getNodes();
	
	nodes[0].weight = 10;
	
	// Connect first nodes to root, then rest to existing nodes
	for (i=1; i<numNodes; i++) { // i=0 is the root node, and is excluded from this loop
		if (i < numNodes*0.05) { model.addVerticies(nodes[i], nodes[0]); }
		else { 
			parentNode = nodes[Math.floor((i-0.3) * Math.random() * Math.random() * Math.random() * Math.random() + 0.3)];
			nodes[i].x = parentNode.x + (Math.random()-0.5)*1000;
			nodes[i].y = parentNode.y + (Math.random()-0.5)*1000;
			nodes[i].z = parentNode.z + (Math.random()-0.5)*1000;
			
			nodes[i].velocity[0] = -(parentNode.x - nodes[i].x)*10;
			nodes[i].velocity[1] = -(parentNode.y - nodes[i].y)*10;
			nodes[i].velocity[2] = -(parentNode.z - nodes[i].z)*10;
			
			model.addVerticies(nodes[i], parentNode); 
		}
	}
	
	// Connect random nodes
	//for (i=Math.floor(numNodes/6); i>0; i--) { 
	//	model.addVerticies(nodes[Math.floor(i * Math.random())], nodes[Math.floor(i * Math.random())]);
	//}
	
	setInterval(addNode, 1000);
};

// Reads an Adjacency List and adds the corresponding edges and required nodes to the model
// `adjacencyList` format: [[1,2], [1,3], [2,4], ...] indicating an edge between nodes 1&2, 1&3, 2&4, ...
// NodeIDs can be numerical or string based
function readAdjacencyList(model, adjacencyList) {
	"use strict";
	
	var numNodes=0, nodes, i, nodeNameMap={};

	if (!adjacencyList || !adjacencyList.length) { throw new Error("adjacencyList was null or empty."); }	
	if (model.getNodeCount() !== 0) { throw new Error("readAdjacencyList function expects an empty model."); }	
	
	// Map the node names (or numbers) to node number
	adjacencyList.forEach(function(edge) {
		if (!nodeNameMap.hasOwnProperty(edge[0])) { nodeNameMap[edge[0]]=numNodes; numNodes+=1; }
		if (!nodeNameMap.hasOwnProperty(edge[1])) { nodeNameMap[edge[1]]=numNodes; numNodes+=1; }
	});	
	
	// Create the nodes
	for (i=0; i<numNodes; i++) {
		model.addNodes(new model.Node());
	}	
	
	nodes = model.getNodes();
		
	// Connect nodes from the adjacency list
	adjacencyList.forEach(function(edge) {
		model.addVerticies(nodes[nodeNameMap[edge[0]]], nodes[nodeNameMap[edge[1]]]);
	});
}

function downloadAdjacencyList(model, url) {
		"use strict";		
		
		var xmlhttp = new XMLHttpRequest();
		
		xmlhttp.onreadystatechange = function() {
			if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
				var json = JSON.parse(xmlhttp.responseText);
				readAdjacencyList(model, json.adjacencyList);
				
				// Apply controller settings				
				if (json.temporalSmoothing) { controller.temporalSmoothing = json.temporalSmoothing; }				
				if (json.springMultiplier) { controller.springMultiplier = json.springMultiplier; }
				if (json.dampening) { controller.dampening = json.dampening; }
			}
		}
		xmlhttp.open("GET", url, true);
		xmlhttp.send();
	}

function addNode() {
	"use strict";
	
	var node, parentNode, nodes;
	
	node = new model.Node();
	nodes = model.getNodes();
	
	parentNode = nodes[Math.floor(nodes.length * Math.random() * Math.random() * Math.random() * Math.random())];
	node.x = parentNode.x + (Math.random()-0.5)*5;
	node.y = parentNode.y + (Math.random()-0.5)*5;
	node.z = parentNode.z + (Math.random()-0.5)*5;
	
	node.velocity[0] = (parentNode.x - node.x)*300;
	node.velocity[1] = (parentNode.y - node.y)*300;
	node.velocity[2] = (parentNode.z - node.z)*300;
			
	model.addNodes(node);
	model.addVerticies(node, parentNode);
}

function init() {
	"use strict";
	
	var demo, meshName;
	
	demo = "Octree";
	
	switch(demo) {
		case "Octree":
			model = new Models.NodeList();												// Stores the nodes (a graph)
			view = new Views.ThreeJS(model);											// Displays the nodes using Three.js
			controller = new Controllers.ForceDirectedOctree(model, view);	// Moves the nodes utilizng an Oct Tree backed Force Directed Graph
			controller.includeGravity=false			
			break;
			
		case "No Octree": 
			model = new Models.NodeList();										// Stores the nodes (a graph)
			view = new Views.ThreeJS(model);									// Displays the nodes using Three.js
			controller = new Controllers.ForceDirected(model, view);	// Moves the nodes using a Force Directed Graph
			controller.includeGravity=false			
			break;
		
		case "Octree, No Rendering": 	// For testing the layout engine speed
			model = new Models.NodeList();												// Stores the nodes (a graph)
			view = new Views.Null(model);												// Null viewer (displays nothing)
			controller = new Controllers.ForceDirectedOctree(model, view);	// Moves the nodes
			controller.includeGravity=false			
			break;
		
		case "No Octree, No Rendering": // For testing the layout engine speed 
			model = new Models.NodeList();										// Stores the nodes (a graph)
			view = new Views.Null(model);										// Null viewer (displays nothing)
			controller = new Controllers.ForceDirected(model, view);	// Moves the nodes
			controller.includeGravity=false			
			break;
		
		default:
			throw "Unknown demo";
	}
	
	window.location.search.substr(1).split('&').forEach(function(param){
		var paramSplit=param.split('=');	
		if (paramSplit[0] === 'mesh' && paramSplit[1].length >= 1) {
			meshName = paramSplit[1];
		}	
	});
	
	if (meshName) {
		//	Render existing mesh	
		downloadAdjacencyList(model,"MeshExamples/" + meshName);
	}
	else {
		// Create random nodes & verticies.
		createRandomTree(model);
		controller.temporalSmoothing = 0.001;
		controller.springMultiplier = 4000;
		controller.dampening=0.92
		controller.centeringMethod = "centerOnFirstNode";
	}
	
};
