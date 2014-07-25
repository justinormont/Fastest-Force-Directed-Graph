var Views = Views||{};

Views.ThreeJS = function(graph) {
	"use strict";
	
	this.showStats = true;
	
	this.camera = null,
	this.controls = null, 
	this.scene = null, 
	this.renderer = null, 
	this.interaction = null, 
	this.nodeGeometry = null, 
	this.object_selection = null;
	this.stats = null;
	this.info_text = {};
	this.graph = graph;

	this.geometries = [];
	this.renderingObjectsForNodes = [];
	
	// Run
	this.init();
	this.animate();
}

Views.ThreeJS.prototype.checkNodes = function() {
	"use strict";
	
	var nodes, nodesToDelete, that=this;
	
	nodes = this.graph.getNodes();
	
	// Check for new nodes
	nodes.forEach(function(node) {
		if (!node.renderingObj) {
			that.addNode(node);
		}
	});
	
	// Check for deleted nodes
	this.renderingObjectsForNodes.forEach(function(renderingObj) {
		if (renderingObj.node.isDeleted) {
			that.scene.remove(renderingObj);
			
			// ToDo: remove any verticies which include the node
			
			nodesToDelete = (nodesToDelete||[]).push(renderingObj);
		}
	});
	
	// Remove the deleted nodes
	if (nodesToDelete) {
		that.removeFromList(renderingObjectsForNodes, nodesToDelete);
	}
	
	// Check for Verticies
	nodes.forEach(function(node) {
		node.verticies.forEach(function(vertex) {
			if (!vertex.renderingObj) {
				vertex.renderingObj = that.drawEdge(vertex.to.renderingObj, vertex.from.renderingObj);
			}
		});
	});
	
	this.renderingObjectsForNodes.forEach(function(renderingObj) {
		renderingObj.position.x = renderingObj.node.x; 
		renderingObj.position.y = renderingObj.node.y;
		renderingObj.position.z = renderingObj.node.z;
	});
	
};

Views.ThreeJS.prototype.removeFromList = function(list, elementOrElements, indexOfFunction /* optional */) {
	"use strict";
	
	var index;
	
	this.runOnObjOrListOfObj(elementOrElements,function(item) {
		if (indexOfFunction) { index = indexOfFunction(list, item); }
		else { index = list.indexOf(item); }
		
		if (index !== -1) { list.splice(index,1); }
	});
	
	return list;
};

Views.ThreeJS.prototype.runOnObjOrListOfObj = function(objOrListOfObj, funct, scope) {
	"use strict";
	
	if (Array.isArray(objOrListOfObj)) {
		objOrListOfObj.forEach(funct, scope);
	}
	else {
		funct(objOrListOfObj);
	}
};

Views.ThreeJS.prototype.render = function() {
	"use strict";
	
	this.checkNodes();
	
	// Update position of lines (edges)
	for (var i=0; i < this.geometries.length; i++) {
		this.geometries[i].verticesNeedUpdate = true;
	}

	// render selection
	if (this.selection) {
		object_selection.render(scene, camera);
	}
	
	// update stats
	if (this.showStats) {
		this.stats.update();
	}
	
	// render scene
	this.renderer.render(this.scene, this.camera);
};

Views.ThreeJS.prototype.testWebGL = function() {
	"use strict";
	
	var canvas, hasWebGL;
	
	canvas = document.createElement('canvas');
	hasWebGL = !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
	
	return hasWebGL;
};



// Adapted from: https://github.com/davidpiegza/Graph-Visualization
Views.ThreeJS.prototype.init = function() {
	"use strict";
	
	// Three.js initialization
	if (this.testWebGL()) { this.renderer = new THREE.WebGLRenderer({alpha: true, antialias:true}); }
	else { this.renderer = new THREE.CanvasRenderer({alpha: true, antialias:true}); }
	
	this.renderer.setSize( window.innerWidth, window.innerHeight );
	
	this.camera = new THREE.PerspectiveCamera(40, window.innerWidth/window.innerHeight, 1, 1000000);
	this.camera.position.z = 6000;
	
	this.controls = new THREE.TrackballControls(this.camera);
	
	this.controls.rotateSpeed = 0.5;
	this.controls.zoomSpeed = 5.2;
	this.controls.panSpeed = 1;
	
	this.controls.noZoom = false;
	this.controls.noPan = false;
	
	this.controls.staticMoving = false;
	this.controls.dynamicDampingFactor = 0.1;
	
	this.controls.keys = [ 65, 83, 68 ];
	
	//this.controls.addEventListener('change', this.render); // ToDo: is this needed?
	
	this.scene = new THREE.Scene();
	
	var that = this;
	
	// Node geometry
	this.nodeGeometry = new THREE.CubeGeometry( 25*2, 25*2, 25*2 );
	
	// Create node selection, if set
	if (this.selection) {
		object_selection = new THREE.ObjectSelection({
			domElement: renderer.domElement,
			selected: function(obj) {
				// display info
				if(obj != null) {
					info_text.select = "Object " + obj.id;
				} 
				else {
					delete info_text.select;
				}
			},
			clicked: function(obj) {}
		});
	}
	
	document.body.appendChild(this.renderer.domElement);
	
	// Stats.js
	if (this.showStats) {
		this.stats = new Stats();
		this.stats.domElement.style.position = 'absolute';
		this.stats.domElement.style.top = '0px';
		document.body.appendChild( this.stats.domElement );
	}
	
	// Create info box
	if(this.show_info) {
		var info = document.createElement("div");
		var id_attr = document.createAttribute("id");
		id_attr.nodeValue = "graph-info";
		info.setAttributeNode(id_attr);
		document.body.appendChild( info );
	}
};


// Adapted from: https://github.com/davidpiegza/Graph-Visualization
Views.ThreeJS.prototype.addNode = function(node) {
	"use strict";
	
	console.log("Added node in Views.ThreeJS.prototype.addNode");
	
	var renderingObj, sprite;

	sprite = false; // Use a sprite or a cube to represent the node on screen
	
	if (sprite) {
		
		if (!this.spriteMaterial) {
			this.spriteMaterial = new THREE.SpriteMaterial( {
				map: new THREE.Texture( generateSprite() ),
				blending: THREE.AdditiveBlending
			} );
		}
		
		renderingObj = new THREE.Sprite(this.spriteMaterial);
		renderingObj.scale.x = renderingObj.scale.y = 64;
	}
	else {
		renderingObj = new THREE.Mesh( this.nodeGeometry, new THREE.MeshBasicMaterial( {  color: /*Math.random() * 0xffffff*/ (new THREE.Color()).setHSL(Math.random(), 1, Math.random()) /*, opacity: 1.0*/ } ) );
	}

	if(false && that.show_labels) {
		if(node.data.title != undefined) {
			var label_object = new THREE.Label(node.data.title);
		} else {
			var label_object = new THREE.Label(node.id);
		}
		node.data.label_object = label_object;
		scene.add( node.data.label_object );
	}
	
	renderingObj.position.x = node.x;
	renderingObj.position.y = node.y;
	renderingObj.position.z = node.z;
	
	renderingObj.node = node; // Link to the node in the graph's nodelist
	node.renderingObj = renderingObj;
	
	this.renderingObjectsForNodes.push(renderingObj);
	
	this.scene.add(renderingObj);
};

// Adapted from https://threejsdoc.appspot.com/doc/three.js/examples.source/canvas_particles_waves.html.html
function generateSprite() {
	"use strict";
	
	var canvas, context, gradient;
	
	canvas = document.createElement( 'canvas' );
	canvas.width = 16;
	canvas.height = 16;

	context = canvas.getContext( '2d' );
	gradient = context.createRadialGradient( canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width / 2 );
	gradient.addColorStop( 0, 'rgba(' + Math.floor(Math.random()*255) + ',' + Math.floor(Math.random()*255) + ',' + Math.floor(Math.random()*255) + ',1)' );
	gradient.addColorStop( 0.2, 'rgba(0,255,255,1)' );
	gradient.addColorStop( 0.4, 'rgba(0,0,64,1)' );
	gradient.addColorStop( 1, 'rgba(0,0,0,0)' );

	context.fillStyle = gradient;
	context.fillRect( 0, 0, canvas.width, canvas.height );

	return canvas;
}


// Adapted from: https://github.com/davidpiegza/Graph-Visualization
Views.ThreeJS.prototype.drawEdge = function(source, target) {
	"use strict";
	
	if (!this.material) { console.log("Created material"); this.material = new THREE.LineBasicMaterial({ color: 0x333333, /*opacity: 0.1,*/ linewidth: 3 }); }
	
	console.log("Created Edge");
	
	var tmp_geo = new THREE.Geometry();
	tmp_geo.vertices.push(source.position);
	tmp_geo.vertices.push(target.position);
	
	var line = new THREE.Line( tmp_geo, this.material, THREE.LinePieces );
	line.scale.x = line.scale.y = line.scale.z = 1;
	line.originalScale = 1;
	
	this.geometries.push(tmp_geo);
	
	this.scene.add(line);
	
	return line;
};

// Adapted from: https://github.com/davidpiegza/Graph-Visualization
Views.ThreeJS.prototype.animate = function() {
	"use strict";
	
	var that=this;
	
	var innerAnimate = function() {
		requestAnimationFrame( innerAnimate );
		that.controls.update();
		that.render();
	}
	
	innerAnimate();
};

