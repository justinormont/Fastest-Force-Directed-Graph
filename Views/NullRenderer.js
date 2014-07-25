/**
  @author Justin Ormont

  Implements a mock rendering engine. This is used for testing the speed of the layout engine.
  
  Runtime: 
  	O(0).

  Parameters:
    none
	
  Example:
    var model, view, controller;
	model = new Models.NodeList();								// Stores the nodes (a graph)
	view = new Views.Null(model);								// Mock rendering to not display nodes
	controller = new Controllers.ForceDirected(model, view);	// Moves the nodes	
**/


var Views = Views||{};

Views.Null = function(graph) {
	"use strict";
	
}
