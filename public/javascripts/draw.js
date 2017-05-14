var meshes = [];
var scale;
var packageHeight = 20;
var minClassSize = 20;
var padding = 20;
var box;
var classes = [];
var recorder, recording = false;
var commitsList, commitsListFirst, commitsListLast;
var commitsListFirstSelected = -1;
var commitsListLastSelected = -1;

var counter = 0;


/**
 * function that takes care of drawing the packages and classes
 * @param {object} drwPkg - the root package of the visualization to be drawn
 */
function draw(drwPkg) {

    scale = 1250 / Math.max(drwPkg.width, drwPkg.depth);
    // create the meshes for all the packages and classes
    var totalClasses = recDraw(drwPkg);

    // merge the meshes into a single new mesh; this makes the visualization faster/less computationally expensive.
    // we still have the array `meshes` with the invisible, single meshes so that we can tell them apart for callbacks and
    // other similar things
    geometry = mergeMeshes(meshes);

    // TODO best looking, but computationally expensive
    // var material = new THREE.MeshStandardMaterial({
    //     color: 0xffffff,
    //     shading: THREE.SmoothShading,
    //     vertexColors: THREE.VertexColors,
    //     visible: true
    // });

    material = new THREE.MeshPhongMaterial({
        shading: THREE.SmoothShading,
        vertexColors: THREE.VertexColors,
        visible: true
    });
    mesh = new THREE.Mesh(geometry, material);

    // bounding box to know size of total mesh; then move camera to its center, and update OrbitControls accordingly
    if (!box) {
        box = new THREE.Box3().setFromObject(mesh);
        camera.position.x -= -box.getSize().x / 2;
        camera.position.y -= -box.getSize().y / 2;
        controls.target.set(box.getSize().x / 2, box.getSize().y / 2, 0);
        controls.update();
    }

    // add the mesh to the scene and notify that the visualization is ready
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    loaded(totalClasses);
}

/**
 * cleans the scene of the current objects, to prepare for a new visualisation
 */
function clearVisualization() {
    scene.children.forEach(function (object) {
        if (object.type === "Mesh") {
            scene.remove(object);
            object.material.dispose();
            object.geometry.dispose();
            object = undefined;
        }
    });
    meshes.forEach(function (object) {
        scene.remove(object);
        object.material.dispose();
        object.geometry.dispose();
        object = undefined;
    });
    meshes = [];
}

/**
 * recursively call recDraw on child packages and draw the packages and their classes
 * @param {object} drwPkg - the root package of the visualization to be drawn
 */
function recDraw(drwPkg) {
    var totalClasses = 0;
    // if (!drwPkg.visible || (drwPkg.width === 0 && drwPkg.depth === 0)) return 0;
    if (!currentVisibles[drwPkg.pkg.name]) return totalClasses;
    // if ((drwPkg.width === 0 && drwPkg.depth === 0)) return 0;
    // recursion on the child packages, to be drawn first
    for (var i = 0; i < drwPkg.drawablePackages.length; ++i) {
        totalClasses += recDraw(drwPkg.drawablePackages[i]);
    }

    // draw the classes of pkg
    for (var j = 0; j < drwPkg.drawableClasses.length; ++j) {
        drawClass(drwPkg.drawableClasses[j]);
    }

    totalClasses += drawPackage(drwPkg, totalClasses);
    return totalClasses;
}


/**
 * creates the mesh representing the given class, with the right position, size and attributes
 * @param {object} drwCls - the object representing the class to be drawn
 */
function drawClass(drwCls) {

    if (currentVisibles) {
        if (!currentVisibles[drwCls.cls.filename]) return;
    }
    classes.push(drwCls);

    // adding 10 to attributes and methods, to have a lower bound (else we won't see the class)
    var clsHeight = (drwCls.cls.methods + minClassSize) * scale;
    var clsWidth = (drwCls.cls.attributes + minClassSize) * scale;

    var posX = drwCls.cx * scale;
    var posY = drwCls.cy * scale;
    var posZ = (drwCls.z * scale * packageHeight) + (((clsHeight / 2) + (packageHeight / 2) * scale));

    var color = drwCls.color;

    // create geometry and material for this class
    geometry = new THREE.BoxGeometry(clsWidth, clsWidth, clsHeight);
    for (var i = 0; i < geometry.faces.length; i++) {
        var face = geometry.faces[i];
        face.color.setHex(color);
    }
    material = new THREE.MeshBasicMaterial({color: color, wireframe: false});

    // invisible material allows raycasting invisible objects
    material.visible = false;

    // create the mash with the needed data
    mesh = new THREE.Mesh(geometry, material);
    mesh.name = drwCls.cls.name;
    mesh.realColor = color;
    mesh.filename = drwCls.cls.filename;
    mesh.methods = drwCls.cls.methods;
    mesh.attributes = drwCls.cls.attributes;
    mesh.linesOfCode = drwCls.cls.linesOfCode;
    mesh.type = "class";

    mesh.rotation.x = -Math.PI / 2;


    // position the mesh
    mesh.translateX(posX);
    mesh.translateY(posY);
    mesh.translateZ(posZ);

    // add mesh to the array of meshes and the scene
    meshes.push(mesh);
    scene.add(mesh);
}


/**
 * creates the mesh representing the given package, with the right position, size and attributes
 * @param {object} drwPkg - the object representing the package to be drawn
 * @param totalClasses - the number of classes contained in children packages
 */
function drawPackage(drwPkg, totalClasses) {
    // size of the package
    var width = drwPkg.width * scale;
    var depth = drwPkg.depth * scale;
    if (width === 0 || depth === 0) return 0;
    var height = packageHeight * scale;

    // position of package
    var posX = drwPkg.cx * scale;
    var posY = drwPkg.cy * scale;
    var posZ = drwPkg.z * packageHeight * scale;

    var color = drwPkg.color;

    // create geometry and material for this package
    geometry = new THREE.BoxGeometry(width, depth, height);
    for (var i = 0; i < geometry.faces.length; i++) {
        var face = geometry.faces[i];
        face.color.setHex(color);
    }
    material = new THREE.MeshBasicMaterial({color: color, wireframe: false});

    // invisible material allows raycasting invisible objects
    material.visible = false;

    // create the mash with the needed data
    mesh = new THREE.Mesh(geometry, material);
    mesh.name = drwPkg.pkg.name;
    var classes = 0;
    for (var j = 0; j < drwPkg.drawableClasses.length; ++j) {
        var cls = drwPkg.drawableClasses[j];
        if (cls.visible) classes += 1;
    }
    mesh.classes = classes;

    mesh.totalClasses = totalClasses + classes;
    mesh.width = width;
    mesh.depth = depth;
    mesh.type = "package";
    mesh.realColor = color;

    mesh.rotation.x = -Math.PI / 2;


    // position the mesh
    mesh.translateX(posX);
    mesh.translateY(posY);
    mesh.translateZ(posZ);


    // add mesh to the array of meshes and the scene
    meshes.push(mesh);
    scene.add(mesh);
    return classes;
}


var recordWorkers = [];
var videoData = [];
for (var i = 0; i < 8; ++i) {
    recordWorkers[i] = new Worker("assets/javascripts/record_workers.js");
    recordWorkers[i].onmessage = function (event) {
        var message = event.data;
        if (message.type === "ready") {
            this.postMessage({
                type: "command",
                arguments: ["-help"]
            });
        } else if (message.type === "stdout") {
            // console.log(message.data);
        } else if (message.type === "start") {
            // console.log(message.data);
        } else if (message.type === "done") {
            var buffers = message.data;
            // console.log(message);

            if (buffers.length) {
                var buffer = buffers[0];
                var arr = buffer.data;
                var byteArray = new Uint8Array(arr);
                var blob = new Blob([byteArray], {type: 'application/octet-stream'});

                if (Number.isInteger(message.name)) {
                    videoData[message.name] = {
                        "name": "vid" + message.name + ".mp4",
                        "data": byteArray
                    };
                }

                if (!containsUndefined(videoData)) {
                    this.postMessage({
                        type: "command",
                        arguments: ['-i', 'vid0.mp4', '-i', 'vid1.mp4', '-i', 'vid2.mp4', '-i', 'vid3.mp4',
                            '-i', 'vid4.mp4', '-i', 'vid5.mp4', '-i', 'vid6.mp4', '-i', 'vid7.mp4', '-filter_complex',
                            '[0:v:0] [1:v:0] [2:v:0] [3:v:0] [4:v:0] [5:v:0] [6:v:0] [7:v:0] concat=n=8:v=1 [v]',
                            '-map','[v]', repositoryName + '.mp4'],
                        files: videoData,
                        name : "concat"
                    });
                    videoData = [];
                    files = [];
                }

                if (message.name === "concat") {
                    var a = window.document.createElement('a');

                    a.href = window.URL.createObjectURL(blob);
                    a.download = buffer.name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }
            }
        }
    };
}


/**
 * readies the page when the visualization is loaded
 */
function loaded(totalClasses) {
    if (recording) {

        // fixme test if with these 3 lines it's slower
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();

        renderer.shadowMap.needsUpdate = true;
        render();
        callNext();
        return;
    }
    $("#main-content").css('display', 'none');
    $("#container").css('display', 'block');
    $("#navbar-visualization-items").css('display', 'contents');
    classesText.innerText = totalClasses;

    // notify the renderer that our html canvas has appeared
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();

    // update shadows only once
    renderer.shadowMap.needsUpdate = true;

    var commitsDropdown = $("#commits-dropdown");
    var commitsDropdownFirst = $("#commits-dropdown-first");
    var commitsDropdownLast = $("#commits-dropdown-last");
    commitsList = $("#commits-list");
    commitsListFirst = $("#commits-list-first");
    commitsListLast = $("#commits-list-last");

    commitsDropdown.on('focus', function () {
        commitsList.css('display', 'block');
    });

    commitsDropdown.on('blur', function () {
        commitsList.css('display', 'none');
    });

    commitsDropdownFirst.on('focus', function () {
        commitsListFirst.css('display', 'block');
    });

    commitsDropdownFirst.on('blur', function () {
        commitsListFirst.css('display', 'none');
    });

    commitsDropdownLast.on('focus', function () {
        commitsListLast.css('display', 'block');
    });

    commitsDropdownLast.on('blur', function () {
        commitsListLast.css('display', 'none');
    });

    commitsList.on('mousedown', function (e) {
        commitsDropdown.text(e.target.innerText.split(/\r?\n/)[0]);
        event.preventDefault();
    });

    commitsListFirst.on('mousedown', function (e) {
        commitsDropdownFirst.text(e.target.innerText.split(/\r?\n/)[0]);
        commitsListFirstSelected = commitsListFirst.children().index(e.target);
        event.preventDefault();
    });

    commitsListLast.on('mousedown', function (e) {
        commitsDropdownLast.text(e.target.innerText.split(/\r?\n/)[0]);
        commitsListLastSelected = commitsListLast.children().index(e.target);
        event.preventDefault();
    });

    setSearchResults();
    if (typeof(Worker) !== "undefined") {
        if (typeof(searchWorker) === "undefined") {
            searchWorker = new Worker("assets/javascripts/search_workers.js");

            searchWorker.addEventListener('message', function (e) {
                for (var i = 0; i < searchListItems.length; ++i) {
                    searchListItems[i].style.display = e.data[i];
                }
            }, false);
        }
    }

    // add events for visualization callbacks
    canvas.addEventListener('click', canvasClick, false);
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('click', altClick, false);
    window.addEventListener('mousemove', onMouseMove, false);
    window.addEventListener("keydown", onKeyPress, false);
    window.addEventListener('mousewheel', onWheel, false);
    render();
}

var count = 0;

var files = [];

var BASE64_MARKER = ';base64,';

function convertDataURIToBinary(dataURI) {
    var base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
    var base64 = dataURI.substring(base64Index);
    var raw = window.atob(base64);
    var rawLength = raw.length;
    var array = new Uint8Array(new ArrayBuffer(rawLength));

    for (i = 0; i < rawLength; i++) {
        array[i] = raw.charCodeAt(i);
    }
    return array;
}

var CNidx, CNlist, CNlast;

function callNext() {
    var image = renderer.domElement.toDataURL('image/jpeg');

    if (count < 10) {
        files.push({
            "name": "img00" + count++ + ".jpg",
            "data": convertDataURIToBinary(image)
        });
    }
    else if (count < 100) {
        files.push({
            "name": "img0" + count++ + ".jpg",
            "data": convertDataURIToBinary(image)
        });
    } else {
        files.push({
            "name": "img" + count++ + ".jpg",
            "data": convertDataURIToBinary(image)
        });
    }

    if (recording && (CNidx <= CNlast && CNidx < CNlist.length)) {
        CNlist[CNidx].click();
        CNidx++;
    }
    else {
        setTimeout(function () {
            if (recording) {
                recording = false;
                canvas.style.width = "100%";
                canvas.style.height = "100%";
                canvas.style.left = "0";
                renderer.setSize(canvas.clientWidth, canvas.clientHeight);
                camera.aspect = canvas.clientWidth / canvas.clientHeight;
                camera.updateProjectionMatrix();

                renderer.shadowMap.needsUpdate = true;
                render();

                var split = Math.ceil(commitsNumber / 8);
                for (var i = 0; i < 8; ++i) {
                    recordWorkers[i].postMessage({
                        type: "command",
                        arguments: ['-r', '24', '-start_number', i * split, '-i', 'img%03d.jpg', '-v', 'verbose', '-vframes', split, 'vid'+i+'.mp4'],
                        files: files,
                        name: i
                    });
                }

                $("#record-card-button").css("color", "rgba(220, 220, 220, 1)");
            }
        }, 100);
    }
}



/**
 * merges together an array of meshes
 *
 * @param {Array} meshes - the array of meshes to merge
 * @returns the combined mesh
 */
function mergeMeshes(meshes) {
    var combined = new THREE.Geometry();

    for (var i = 0; i < meshes.length; ++i) {
        meshes[i].updateMatrix();
        combined.merge(meshes[i].geometry, meshes[i].matrix);
    }

    return combined;
}