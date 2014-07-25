/**
  @author Justin Ormont

  Demonstrates the usage of the Oct Tree Force Directed Graph. and normal Force Directed Graph.
  
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
function createGraph(model) {
	"use strict";
	
	var numNodes=250, nodes, i, nodeA, nodeB;
	
	for (i=0; i<numNodes; i++) {
		model.addNodes(new model.Node());
	}
	
	nodes = model.getNodes();
	
	nodes[0].weight = 10;
	
	// Connect first nodes to root, then rest to existing nodes
	for (i=1; i<numNodes; i++) { // i=0 is the root node
		if (i < numNodes*0.05) { model.addVerticies(nodes[i], nodes[0]); }
		else { model.addVerticies(nodes[i], nodes[Math.floor(i * Math.random() * Math.random() * Math.random() * Math.random())]); }
	}
	
	setInterval(addNode, 100);
	
	return model;
};

function addNode() {
	"use strict";
	
	var node, parentNode, nodes;
	
	node = new model.Node();
	nodes = model.getNodes();
	
	parentNode = nodes[Math.floor(nodes.length * Math.random() * Math.random() * Math.random() * Math.random())];
	node.x = parentNode.x + (Math.random()-0.5);
	node.y = parentNode.y + (Math.random()-0.5);
	node.z = parentNode.z + (Math.random()-0.5);
	
	node.velocity[0] = (parentNode.x - node.x)*10000;
	node.velocity[1] = (parentNode.y - node.y)*10000;
	node.velocity[2] = (parentNode.z - node.z)*10000;
			
	model.addNodes(node);
	model.addVerticies(node, parentNode);
}

function init() {
	"use strict";
	
	var demo = "OctTree";
	
	switch(demo) {
		case "OctTree":
			model = new Models.NodeList();									// Stores the nodes (a graph)
			view = new Views.ThreeJS(model);								// Displays the nodes using Three.js
			controller = new Controllers.ForceDirectedOctTree(model, view);	// Moves the nodes utilizng an Oct Tree backed Force Directed Graph
			break;
			
		case "No OctTree": 
			model = new Models.NodeList();									// Stores the nodes (a graph)
			view = new Views.ThreeJS(model);								// Displays the nodes using Three.js
			controller = new Controllers.ForceDirected(model, view);		// Moves the nodes using a Force Directed Graph
			break;
		
		case "OctTree, No Rendering": // For testing the layout engine speed
			model = new Models.NodeList();									// Stores the nodes (a graph)
			view = new Views.Null(model);									// Null viewer (displays nothing)
			controller = new Controllers.ForceDirectedOctTree(model, view);	// Moves the nodes
			break;
		
		case "No OctTree, No Rendering": // For testing the layout engine speed 
			model = new Models.NodeList();									// Stores the nodes (a graph)
			view = new Views.Null(model);									// Null viewer (displays nothing)
			controller = new Controllers.ForceDirected(model, view);		// Moves the nodes
			break;
		
		default:
			throw "Unknown demo";
	}
	
	// Create nodes & verticies.
	createGraph(model);
	
};
