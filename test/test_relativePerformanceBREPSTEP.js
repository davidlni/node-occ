var occ = require('../lib/occ');
var should = require("should");
var async = require("async");
var path = require("path");

var ProgressBar = require('progress');
var remove_file = require("./helpers").remove_file;

function myReadStep(filename, done) {


    var brep_filename = require("./helpers").getTemporaryFilePath({suffix: ".brep"});

    var bar = new ProgressBar("reading file [:bar] :percent elapsed :elapseds ETA :etas", {
        complete: '=',
        incomplete: '-',
        width: 100,
        total: 1000
    });

    var solids = [];

    function progressFunc(percent) {
        bar.tick(percent);
    }

    function performMesh(solids) {
        var bar = new ProgressBar("meshing solids [:bar] :percent elapsed :elapseds  ETA :etas", {
            complete: '=',
            incomplete: '-',
            width: 100,
            total: solids.length
        });
        for (var i  in solids) {
            bar.tick();
            var solid = solids[i];
            solid.numFaces.should.be.greaterThan(1);

            solid.name = "solid_" + i;
            occ.buildSolidMesh(solid);
            var mesh = solid.mesh;
            solid.mesh.numVertices.should.be.greaterThan(3);
        }
        console.log("\n");
    }


    function chrono(async_func, message, callback) {

        var t1, t2, elapsed;
        t1 = new Date();

        async_func(function (err) {

            t2 = new Date();
            elapsed = Math.round((t2 - t1) / 10) / 100;

            console.log("\ndone " + message + " in ", elapsed, " seconds");
            callback(err);
        });
    }


    function read_original_step_file(callback) {


        t1 = new Date();
        occ.readSTEP(filename, function (err, _solids) {
            solids = _solids;
            if (err) {
                return callback(new Error(" readStep returned error = " + err.message + " while reading " + filename + " _solids =", _solids.length));
            } else {
                console.log(" read ", solids.length, " solids");
            }
            callback(err);
        }, progressFunc);

    }

    function perform_mesh_on_solids(callback) {


        // make sure we have a mesh, so it can be saved in the BREP file
        performMesh(solids);
        callback();
    }

    function write_solids_to_brep(callback) {
        occ.writeBREP(brep_filename, solids);
        callback();
    }

    function read_brep_file_again(callback) {
        occ.readBREP(brep_filename, function (err, _solids) {
            if (!err) {
                solids = _solids;
                console.log(" nb solids = ", solids.length);
            } else {
            }
            return callback(err);
        }, progressFunc);
    }

    async.series([

        chrono.bind(null, read_original_step_file, "read_original_step_file"),
        chrono.bind(null, perform_mesh_on_solids, "perform_mesh_on_solids"),
        chrono.bind(null, write_solids_to_brep, "write_solids_to_brep"),
        chrono.bind(null, read_brep_file_again, "read_brep_file_again"),
        chrono.bind(null, perform_mesh_on_solids, "perform_mesh_on_solids"),

        function (callback) {
            remove_file(brep_filename, callback);
        }
    ], done);

}

//    myReadStep("test/kuka.stp");
describe("testing relative performance of BREP and STEP I/O", function () {
    this.timeout(40000);
    it("should read kuka robot", function (done) {
        var filename = path.join(__dirname, 'kuka.stp');
        myReadStep(filename, done);
    });
});
