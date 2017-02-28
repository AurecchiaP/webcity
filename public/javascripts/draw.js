function draw(data, sizeX, sizeY) {

    // drawCube( sizeX, sizeY, 20, 0, 0, 0, 0xff0000, data.name );

    if (data.classes.length != 0 && data.children.length != 0) {


    }
    else if (data.classes.length != 0) {

    }
    else if (data.children.length != 0) {
        var split = Math.floor(data.children.length / 2);
        var n = 100;
        for (var i = 0; i < n; i++) {
            for (var j = 0; j < n; j++) {
                drawCube(
                    30,
                    30,
                    30,
                    -(n*30/2)+35*i,
                    -(n*30/2)+35*j,
                    10,
                    0x220000,
                    data.name + i.toString() + "-" + j.toString()
                );
            }
        }
        var geom = mergeMeshes( meshes );
        material.visible = true;
        mesh = new THREE.Mesh( geom, material );
        scene.add(mesh);
        loaded();
    }
}

var meshes = [];

function drawCube( width, depth, height, posX, posY, posZ, color, name ) {
    geometry = new THREE.BoxGeometry( width, depth, height );
    // TODO basic material gives best performance
    material = new THREE.MeshToonMaterial( { color: color, wireframe: false } );
    // invisible material allows raycasting invisible objects
    material.visible = false;
    mesh = new THREE.Mesh( geometry, material );
    mesh.name = name;
    mesh.translateX( posX );
    mesh.translateY( posY );
    mesh.translateZ( posZ );
    meshes.push( mesh );
    scene.add( mesh );
}

function mergeMeshes (meshes) {
    var combined = new THREE.Geometry();

    for (var i = 0; i < meshes.length; i++) {
        meshes[i].updateMatrix();
        combined.merge(meshes[i].geometry, meshes[i].matrix);
    }

    return combined;
}