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
	
	this.lines;
	
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
		that.removeFromList(this.renderingObjectsForNodes, nodesToDelete);
	}
	
	// Check for Verticies
	nodes.forEach(function(node) {
		node.verticies.forEach(function(vertex) {
			if (!vertex.renderingObj) {
				// Reference the rendering object from the reverse vertex link
				if (vertex.reverseVertex && vertex.reverseVertex.renderingObj) { vertex.renderingObj = vertex.reverseVertex.renderingObj; }
				
				// Create new rendering object
				if (!vertex.renderingObj) { vertex.renderingObj = that.drawEdge(vertex.to.renderingObj, vertex.from.renderingObj); }
				//if (!vertex.renderingObj) { vertex.renderingObj = that.drawEdgeSingleGeo(vertex.to.renderingObj, vertex.from.renderingObj); }
				//if (!vertex.renderingObj) { vertex.renderingObj = that.drawEdgeSingleGeoBufferGeometry(vertex.to.renderingObj, vertex.from.renderingObj); }
				//if (!vertex.renderingObj) { vertex.renderingObj = 1; }
				
			}
		});
	});
	
	// Update each rendering object from the position of the nodes
	this.renderingObjectsForNodes.forEach(function(renderingObj) {
		renderingObj.position.x = renderingObj.node.x; 
		renderingObj.position.y = renderingObj.node.y;
		renderingObj.position.z = renderingObj.node.z;
	});
	
	// Update each rendering object from the position of the nodes
	if (this.graphVertices) { 
		this.renderingObjectsForNodes.forEach(function(renderingObj) {
			this.graphVertices[renderingObj.node.positionIndex] = renderingObj.node.x;
			this.graphVertices[renderingObj.node.positionIndex+1] = renderingObj.node.y;
			this.graphVertices[renderingObj.node.positionIndex+2] = renderingObj.node.z;
		}, this); 
		
		this.verticesGeometry.needsUpdate = true;
	}
	
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
	
	var i;
	
	this.checkNodes();
	
	// Update position of lines (edges)
	if (this.testWebGL()) {
		for (i=0; i < this.geometries.length; i++) {
			this.geometries[i].verticesNeedUpdate = true; // needed in WebGL version
		}
	}

	// render selection
	if (this.selection) {
		this.object_selection.render(this.scene, this.camera);
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
	
	//return false;
	
	var canvas;
	
	if (this.hasWebGL !== undefined) { return this.hasWebGL; };
	
	canvas = document.createElement('canvas');
	this.hasWebGL = !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
	
	return this.hasWebGL;
};



// Adapted from: https://github.com/davidpiegza/Graph-Visualization
Views.ThreeJS.prototype.init = function() {
	"use strict";
	
	// Three.js initialization
	if (this.testWebGL()) { this.renderer = new THREE.WebGLRenderer({alpha: true, antialias:true}); }
	else { this.renderer = new THREE.CanvasRenderer({alpha: true, antialias:true}); this.renderer.sortElements = true; }
	
	this.renderer.setSize( window.innerWidth, window.innerHeight );
	
	this.camera = new THREE.PerspectiveCamera(40, window.innerWidth/window.innerHeight, 1, 1000000);
	this.camera.position.z = 9000;
	
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
	
	
	
	//this.scene.add(new THREE.AmbientLight(0xffffff));
	this.light = new THREE.PointLight(0xffffff, 1, 0);
	this.scene.add(this.light);
	
	var that = this;
	
	// Node geometry
	this.nodeGeometry = new THREE.SphereGeometry( 25, 12, 12 );
	
	// Create node selection, if set
	if (this.selection) {
		this.object_selection = new THREE.ObjectSelection({
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


Views.ThreeJS.prototype.addBox = function(box) {
	"use strict";
	
	console.log("Added node in Views.ThreeJS.prototype.addBox");
	
	var renderingObj, material;
	
	if (!this.boxMaterial) { this.boxMaterial = new THREE.MeshBasicMaterial({wireframe: true, color: 'rgb(255,0,0)'}); }
	
	material = this.boxMaterial;
	
	renderingObj = new THREE.Mesh(new THREE.CubeGeometry(box.maxX - box.minX, box.maxY - box.minY, box.maxZ - box.minZ), material);
	
	renderingObj.position.x = (box.maxX - box.minX)*0.5;
	renderingObj.position.y = (box.maxY - box.minY)*0.5;
	renderingObj.position.z = (box.maxZ - box.minZ)*0.5;
	
	box.renderingObj = renderingObj;
	
};

// Adapted from: https://github.com/davidpiegza/Graph-Visualization
Views.ThreeJS.prototype.addNode = function(node) {
	"use strict";
	
	console.log("Added node in Views.ThreeJS.prototype.addNode");
	
	var renderingObj, sprite, material, materialID, maxSpriteMaterials=6, maxSphereMaterials=4;

	sprite = !this.testWebGL(); // Use a sprite or a cube to represent the node on screen
	
	if (sprite) {
		
		this.spritesCreated = (this.spritesCreated||0) + 1;
		
		//materialID = Math.floor(Math.random() * maxSpriteMaterials);
		materialID = this.spritesCreated % maxSpriteMaterials;
		
		console.log("Using sprite material #" + materialID);
			 
		
		if (!this.spriteMaterials) { 
			this.spriteMaterials = []; 
		
			this.spriteMaterials[0] = new THREE.SpriteMaterial( { map: new THREE.Texture( generateSprite(1,64,202) ), blending: THREE.NormalBlending} );
			this.spriteMaterials[1] = new THREE.SpriteMaterial( { map: new THREE.Texture( generateSprite(221,24,18) ), blending: THREE.NormalBlending} ); // Red
			this.spriteMaterials[2] = new THREE.SpriteMaterial( { map: new THREE.Texture( generateSprite(252,202,3) ), blending: THREE.NormalBlending} );
			this.spriteMaterials[3] = new THREE.SpriteMaterial( { map: new THREE.Texture( generateSprite(22,166,30) ), blending: THREE.NormalBlending} );
			this.spriteMaterials[4] = new THREE.SpriteMaterial( { map: new THREE.Texture( generateSprite(0,255,255) ), blending: THREE.NormalBlending} );
			this.spriteMaterials[5] = new THREE.SpriteMaterial( { map: new THREE.Texture( generateSprite(255,0,255) ), blending: THREE.NormalBlending} );
		}
		if (!this.spriteMaterials[materialID]) { 
			 console.log("Creating sprite material #" + materialID);
			 this.spriteMaterials[materialID] = new THREE.SpriteMaterial( { map: new THREE.Texture( generateSprite() ), blending: THREE.NormalBlending} );
		} 
		
		material = this.spriteMaterials[materialID];
		
		renderingObj = new THREE.Sprite(material);
		renderingObj.scale.x = renderingObj.scale.y = 140;
	}
	else {
		this.spheresCreated = (this.spheresCreated||0) + 1;
		
		
		materialID = this.spheresCreated % maxSphereMaterials;
		
		if (!this.sphereMaterials) { 
			this.sphereMaterials = []; 
		
			this.sphereMaterials[0] = new THREE.MeshPhongMaterial({color: 'rgb(1,64,202)', ambient:'rgb(1,64,202)', specular: 0x333333});
			this.sphereMaterials[1] = new THREE.MeshPhongMaterial({color: 'rgb(221,24,18)', ambient:'rgb(221,24,18)', specular: 0x333333});
			this.sphereMaterials[2] = new THREE.MeshPhongMaterial({color: 'rgb(252,202,3)', ambient:'rgb(252,202,3)', specular: 0x333333});
			this.sphereMaterials[3] = new THREE.MeshPhongMaterial({color: 'rgb(22,166,30)', ambient:'rgb(22,166,30)', specular: 0x333333});
		}
		if (!this.sphereMaterials[materialID]) { 
			 console.log("Creating sphere material #" + materialID);
			 var color = (new THREE.Color()).setHSL(Math.random(), 1, Math.random());
			 this.sphereMaterials[materialID] = new THREE.Mesh(this.nodeGeometry, new THREE.MeshPhongMaterial({color: color, ambient:color}));
		} 
		
		material = this.sphereMaterials[materialID];
		
		
		//renderingObj = new THREE.Mesh(this.nodeGeometry, new THREE.MeshBasicMaterial( {  color: /*Math.random() * 0xffffff*/ (new THREE.Color()).setHSL(Math.random(), 1, Math.random()) /*, opacity: 1.0*/ } ) );
		//renderingObj = new THREE.Mesh(this.nodeGeometry, new THREE.MeshLambertMaterial( {  size:20, color: /*Math.random() * 0xffffff*/ (new THREE.Color()).setHSL(Math.random(), 1, Math.random()) /*, opacity: 1.0*/ } ) );
		//renderingObj = new THREE.Mesh(this.nodeGeometry, new THREE.MeshLambertMaterial( {  size:20, color: 0xff0000 } ) );
		//renderingObj = new THREE.Mesh(this.nodeGeometry, new THREE.MeshPhongMaterial({color: 'blue', ambient:'blue'}));
		//renderingObj = new THREE.ParticleSystem( this.nodeGeometry, new THREE.ParticleBasicMaterial( { size: 1, transparent: false, vertexColors: true,  color: /*Math.random() * 0xffffff*/ (new THREE.Color()).setHSL(Math.random(), 1, Math.random())  } ) );
		//renderingObj = new THREE.ParticleSystem(this.nodeGeometry, new THREE.ParticleBasicMaterial({color: 0xFFFFFF, size: 20}));
		renderingObj = new THREE.Mesh(this.nodeGeometry, material);
		
		renderingObj.scale.x = renderingObj.scale.y = renderingObj.scale.z = 3;
		
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
function generateSprite(r, g, b, a) {
	"use strict";
	
	var canvas, context, gradient;
	
	canvas = document.createElement( 'canvas' );
	canvas.width = 128;
	canvas.height = 128;

	r = Math.max(Math.min((r!==undefined?r:Math.floor(Math.random()*255)),255),0);;
	g = Math.max(Math.min((g!==undefined?g:Math.floor(Math.random()*255)),255),0);;
	b = Math.max(Math.min((b!==undefined?b:Math.floor(Math.random()*255)),255),0);
	a = Math.max(Math.min((a!==undefined?a:1),1),0);
	
	context = canvas.getContext( '2d' );
	gradient = context.createRadialGradient( canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width / 2 );//
	gradient.addColorStop( 0, 'rgba(255,255,255,' + a + ')' );
	gradient.addColorStop( 0.2, 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')' );
	gradient.addColorStop( 0.95, 'rgba(' + Math.floor(r/4) + ',' + Math.floor(g/4) + ',' + Math.floor(b/4) + ',' + a + ')' );
	gradient.addColorStop( 0.96, 'rgba(0,0,0,0)' );

	//// Small sphere
	//gradient.addColorStop( 0, 'rgba(255,255,255,' + a + ')' );
	//gradient.addColorStop( 0.05, 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')' );
	//gradient.addColorStop( 0.20, 'rgba(' + Math.floor(r/4) + ',' + Math.floor(g/4) + ',' + Math.floor(b/4) + ',' + a + ')' );
	//gradient.addColorStop( 0.24, 'rgba(0,0,0,0)' );
	//
	//
	//// Torus
	//gradient.addColorStop( 0.66, 'rgba(0,0,0,0)' );
	//gradient.addColorStop( 0.67, 'rgba(' + Math.floor(r/4) + ',' + Math.floor(g/4) + ',' + Math.floor(b/4) + ',1)' );
	//gradient.addColorStop( 0.78, 'rgba(' + Math.floor(r/2 + 63.75) + ',' + Math.floor(g/2 + 63.75) + ',' + Math.floor(b/2 + 63.75) + ',1)' );
	//gradient.addColorStop( 0.82, 'rgba(' + Math.floor(r/4 + 192.25) + ',' + Math.floor(g/4 + 192.25) + ',' + Math.floor(b/4 + 192.25) + ',1)' );
	//gradient.addColorStop( 0.82, 'rgba(' + Math.floor(r/2 + 63.75) + ',' + Math.floor(g/2 + 63.75) + ',' + Math.floor(b/2 + 63.75) + ',1)' );
	//gradient.addColorStop( 0.96, 'rgba(' + Math.floor(r/4) + ',' + Math.floor(g/4) + ',' + Math.floor(b/4) + ',1)' );
	//gradient.addColorStop( 0.97, 'rgba(0,0,0,0)' );


	context.fillStyle = gradient;
	context.fillRect( 0, 0, canvas.width, canvas.height );

	return canvas;
}


// Adds an edge. Draws the graph edges as a single object. Main downside is, four edges are needed to make a single edge
Views.ThreeJS.prototype.drawEdgeSingleGeo = function(source, target) {
	"use strict";
	
	var geometry, line, points;
	
	if (!this.material) { 
		console.log("Created material"); 
		this.material = new THREE.LineBasicMaterial( { blending: THREE.AdditiveBlending, color: 0xffffff, opacity: 1, linewidth: 3, vertexColors: THREE.VertexColors } );
 
	}
	
	console.log("Created Edge");
	
	if (!this.lines) {
		geometry = new THREE.Geometry();
		this.points = [];
		//line = new THREE.Line(geometry, this.material, THREE.LinePieces);
		this.lines = new THREE.Line(geometry,  this.material);
		this.geometries.push(this.lines);
		this.lines.scale.x = this.lines.scale.y = this.lines.scale.z = 1;
		this.lines.originalScale = 1;
		this.scene.add(this.lines);
	
	}
	
	//this.lines.geometry.vertices.push(source.position);
	this.lines.geometry.vertices.push(source.position);
	this.lines.geometry.vertices.push(target.position);
	//this.lines.geometry.vertices.push(source.position);
	//this.lines.geometry.vertices.push(source.position);
	
	//this.lines.geometry.colors.push(new THREE.Color('rgb(0,0,0)'));
	this.lines.geometry.colors.push(new THREE.Color('rgb(64,64,64)'));	
	this.lines.geometry.colors.push(new THREE.Color('rgb(32,32,32)'));	
	//this.lines.geometry.colors.push(new THREE.Color('rgb(64,64,64)'));	
	//this.lines.geometry.colors.push(new THREE.Color('rgb(0,0,0)'));
	
	return this.lines;
};

// Adds an edge. Draws the graph edges as a single object. Main downside is, four edges are needed to make a single edge
Views.ThreeJS.prototype.drawEdgeSingleGeoBufferGeometry = function(source, target) {
	"use strict";
	
	var line, points, colors;
	
	if (!this.material) { 
		console.log("Created material"); 
		this.material = new THREE.LineBasicMaterial( { blending: THREE.AdditiveBlending, color: 0xffffff, opacity: 1, linewidth: 3, vertexColors: THREE.VertexColors } );
 
	}
	
	console.log("Created Edge");
	
	if (!this.lines) {
		this.points = [];
		this.lineColors = [];
	}
	
	this.verticesGeometry = new THREE.BufferGeometry();
	
	source.positionIndex = this.points.length;
	this.points.push(source.position.x,source.position.y,source.position.z);
	target.positionIndex = this.points.length;
	this.points.push(target.position.x,target.position.y,target.position.z);
	this.lineColors.push(0.25,0.25,0.25);
	this.lineColors.push(0.25,0.25,0.25);
	
	this.graphVertices = new Float32Array(this.points);
	colors = new Float32Array(this.lineColors);
	
	this.verticesGeometry.addAttribute( 'position', new THREE.BufferAttribute( this.graphVertices, 3 ) );
	this.verticesGeometry.addAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );
	
	if (this.lines) { this.scene.remove(this.lines); }
	
	this.lines = new THREE.Line(this.verticesGeometry, this.material, THREE.LinePieces);
		
	this.scene.add(this.lines);
	
	return this.lines;
};


// Adapted from: https://github.com/davidpiegza/Graph-Visualization
Views.ThreeJS.prototype.drawEdge = function(source, target) {
	"use strict";
	
	if (!this.material) { 
		console.log("Created material"); 
		this.material = new THREE.LineBasicMaterial({ blending: THREE.AdditiveBlending, color: 0x444444, /* opacity: 0.3,*/ linewidth: 4 }); 
	}
	
	console.log("Created Edge");
	
	var tmp_geo = new THREE.Geometry();
	tmp_geo.vertices.push(source.position);
	tmp_geo.vertices.push(target.position);
	
	var line = new THREE.Line( tmp_geo, this.material, THREE.LinePieces );
	line.scale.x = line.scale.y = line.scale.z = 1;
	line.originalScale = 1;
	line.frustumCulled = false; // This should be unnecessary, but works around a line culling issue	
	
	this.geometries.push(tmp_geo);
	
	this.scene.add(line);
	
	return line;
};

// Adapted from: https://github.com/davidpiegza/Graph-Visualization
Views.ThreeJS.prototype.animate = function() {
	"use strict";
	
	var that=this;
	
	var innerAnimate = function() {
		requestAnimationFrame(innerAnimate);
		
		that.frameNumber += 1;
		
		that.controls.update();
		
		that.light.position.copy(that.camera.position);
		
		that.render();
	
	}
	
	innerAnimate();
};

