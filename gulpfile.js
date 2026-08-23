var gulp = require("gulp"); // gulp
var useref = require("gulp-useref"); // concat
var uglify = require("gulp-uglify"); // compress js
var gulpIf = require("gulp-if"); // if else constructions
var del = require("del"); // delete files
var htmlmin = require("gulp-htmlmin"); // html minify
var cleanCss = require("gulp-clean-css"); // css minify
var series = require("gulp-series"); // task queue
var includer = require("gulp-x-includer"); // file includer
var gzip = require("gulp-gzip"); // gzip compression
var fileList = require("gulp-filelist"); // file list
var tap = require("gulp-tap"); // pipe data modification
var path = require("path"); // file path
var newfile = require("gulp-file"); // new file creation
var rename = require("gulp-rename"); // remane file
var log = require("fancy-log"); // log messages
var concat = require("gulp-concat");
const fs = require('fs');

var ETAG_LEN = 10;

// main task for processing web file (concat, compress) ---
gulp.task("concatAndCompress", function () {
  return gulp
    .src(["app/*.html"])
    .pipe(useref()) // concat
    .pipe(gulpIf("*.js", uglify({ mangle: false }))) // compress js
    .pipe(gulpIf("*.html", htmlmin({ collapseWhitespace: true }))) // compress html
    .pipe(gulpIf("*.css", cleanCss())) // compress css
    .pipe(gulp.dest("dest"));
});

// main task for processing web file (concat, compress) with gzip ---
gulp.task("concatAndCompressGz", function () {
  return gulp
    .src(["app/*.html"])
    .pipe(useref()) // concat
    .pipe(gulpIf("*.js", uglify({ mangle: false }))) // compress js
    .pipe(gulpIf("*.html", htmlmin({ collapseWhitespace: true }))) // compress html
    .pipe(gulpIf("*.css", cleanCss())) // compress css
    .pipe(gzip({ append: false })) // compress to gzip
    .pipe(gulp.dest("dest"));
});

// copy img without any changing ---
gulp.task("copyImg", function () {
  return gulp.src(["app/*.png", "app/src/css/*.png"]).pipe(gulp.dest("dest"));
});

// clr dest directory ---
gulp.task("clean", async function (done) {
  await del("dest/**/*");
  done();
});

// Etag ---
function randomGenerate(min, max) {
  return Math.floor(Math.random()*(max-min+1)+min );
}

function etagGenerate() {
  var etag = "";
  for (var i = 0; i < ETAG_LEN; i++) {
    etag += String.fromCharCode(randomGenerate(65, 90));
  }
  return etag;
}

gulp.task("etag", function () {
  return gulp.src("dest/index.html").pipe( // get index.html to execute only one time
    newfile("etag.txt", etagGenerate()).pipe(gulp.dest("dest/"))
  );
});

// prepare bin files for mcu ---
function decToHex(n) {
  // dec to hex
  if (n < 16) return "0" + Number(n).toString(16);
  return Number(n).toString(16);
}

function hexTodec(hex) {
  // hex to dec
  return parseInt(hex, 16);
}

function strToHexStr(str, isDelLastSemicolon, isNullTerm) {
  // str to hex str
  var hexStr = "";
  for (var i = 0; i < str.length; i++) {
    hexStr += "0x" + decToHex(str.charCodeAt(i));

    if (i + 1 >= str.length) {
      if (isNullTerm) {
        hexStr += ",0x00";
      }
      if (isDelLastSemicolon == false) hexStr += ",";
    } else hexStr += ",";
  }
  return hexStr;
}

function arrToHexStr(buff) {
  // str to hex str
  var hexStr = "";
  for (var i = 0; i < buff.length; i++) {
    hexStr += "0x" + decToHex(buff[i]);

    if (i + 1 < buff.length) hexStr += ",";
  }

  return hexStr;
}

function fileToArr(file, isGzip) {
  // file to array

  var obj = { fileName: "", fileContent: "" };

  // file name create
  var fileBasePath = path.basename(file.path);
  var extPos = fileBasePath.lastIndexOf(".");
  var ext = fileBasePath.substr(extPos + 1);
  var contentType = "";
  var fileName = fileBasePath.substr(0, extPos);
  obj.fileName = fileName + "_" + ext + ".h";

  // content type
  switch (ext) {
    case "html":
    case "htm": {
      contentType = "text/html";
      break;
    }
    case "js": {
      contentType = "application/javascript";
      break;
    }
    case "json": {
      contentType = "application/json";
      break;
    }
    case "xml": {
      contentType = "application/xml";
      break;
    }
    case "css": {
      contentType = "text/css";
      break;
    }
    case "png": {
      contentType = "image/png";
      break;
    }
    case "gif": {
      contentType = "image/gif";
      break;
    }
    case "jpeg": {
      contentType = "image/jpeg";
      break;
    }
    case "ico": {
      contentType = "image/x-icon";
      break;
    }
    default: {
      contentType = "text/plain";
      break;
    }
  }

  // content create
  obj.fileContent = new Buffer.from("\n");
  obj.fileContent = Buffer.concat([
    obj.fileContent,
    new Buffer.from("const unsigned char " + fileName + "_" + ext + "_uri[] PROGMEM = {\n"),
    new Buffer.from(strToHexStr("/" + fileBasePath, true, true) + "\n"),
    new Buffer.from("};\n"),
    new Buffer.from("const unsigned char " + fileName + "_" + ext + "_content_type[] PROGMEM = {\n"),
    new Buffer.from(strToHexStr(contentType, true, true) + "\n"),
    new Buffer.from("};\n"),
    new Buffer.from("const unsigned char " + fileName + "_" + ext + "[] PROGMEM = {\n"), // array name
    new Buffer.from(arrToHexStr(file.contents) + "\n"), // file data
    new Buffer.from("};"),
  ]);
  return obj;
}

// files to bin ---
gulp.task("fileToBin", function (cb) {
  return gulp.src(["dest/*.*"]).pipe(
    tap(function (file) {
      // convert file to array
      var obj = fileToArr(file, false);

      // create new file
      return newfile(obj.fileName, obj.fileContent).pipe(gulp.dest("dest/bin/tmp"));
    })
  );
});

// files to bin with gzip ---
gulp.task("fileToBinGz", function () {
  return gulp.src(["dest/*.*"]).pipe(
    tap(function (file) {
      // convert file to array
      var obj = fileToArr(file, true);

      // create new file
      return newfile(obj.fileName, obj.fileContent).pipe(gulp.dest("dest/bin/tmp"));
    })
  );
});

// create file system emulator init ---
gulp.task("createFSEinit", function () {
  return gulp
    .src(["dest/*.*"])
    .pipe(
      fileList("fseInit.c", {
        relative: true,
        isGzip: false,
        destRowTemplate:
          "fse.obj[@fileCounter@].uri_p=&@fileName@_@fileExt@_uri[0];\nfse.obj[@fileCounter@].content_type_p=&@fileName@_@fileExt@_content_type[0];\nfse.obj[@fileCounter@].data_p=&@fileName@_@fileExt@[0];\nfse.obj[@fileCounter@].data_size=sizeof(@fileName@_@fileExt@);\nfse.obj[@fileCounter@].is_gzip=@isGzip@;\n\n",
      })
    )
    .pipe(gulp.dest("dest/bin/tmp"));
});

// create file system emulator init with gzip---
gulp.task("createFSEinitGzip", function () {
  return gulp
    .src(["dest/*.*"])
    .pipe(
      fileList("fseInit.c", {
        relative: true,
        isGzip: true,
        destRowTemplate:
          "fse.obj[@fileCounter@].uri_p=&@fileName@_@fileExt@_uri[0];\nfse.obj[@fileCounter@].content_type_p=&@fileName@_@fileExt@_content_type[0];\nfse.obj[@fileCounter@].data_p=&@fileName@_@fileExt@[0];\nfse.obj[@fileCounter@].data_size=sizeof(@fileName@_@fileExt@);\nfse.obj[@fileCounter@].is_gzip=@isGzip@;\n\n",
      })
    )
    .pipe(gulp.dest("dest/bin/tmp"));
});

// create file system emulator file header
gulp.task("createFSEheader", function () {
  return gulp.src(["dest/bin/tmp/fseInit.c"]).pipe(
    tap(function (file) {
      return newfile("fseHeader.c", '#include "http_serv_fse.h"\n\nhttp_serv_fse_t fse;').pipe(gulp.dest("dest/bin/tmp"));
    })
  );
});

// create file system emulator init start ---
gulp.task("createFSEinitStart", function () {
  return gulp.src(["dest/bin/tmp/fseInit.c"]).pipe(
    tap(function (file) {
      return newfile("fseInitStart.c", "void http_serv_fse_init(void) {").pipe(gulp.dest("dest/bin/tmp"));
    })
  );
});

// create file system init end ---
gulp.task("createFSEinitEnd", function () {
  return gulp.src(["dest/bin/tmp/fseInit.c"]).pipe(
    tap(function (file) {
      return newfile("fseInitEnd.c", "}").pipe(gulp.dest("dest/bin/tmp"));
    })
  );
});

// concat fse table content to one file ---
gulp.task("concatFSEcontent", function () {
  return gulp.src(["dest/bin/tmp/*.h"]).pipe(concat("fseContent.c")).pipe(gulp.dest("dest/bin/tmp"));
});

// concat fse to one file ---
gulp.task("concatFSE", function () {
  return gulp.src(["dest/bin/tmp/fseHeader.c", "dest/bin/tmp/fseContent.c", "dest/bin/tmp/fseInitStart.c", "dest/bin/tmp/fseInit.c", "dest/bin/tmp/fseInitEnd.c"]).pipe(concat("http_serv_fse.cpp")).pipe(gulp.dest("dest/bin"));
});

// clean tmp files ---
gulp.task("cleanTmp", async function (done) {
  await del("dest/bin/tmp");
  done();
});

// main build task ---
gulp.task("build", gulp.series([
  "clean",
  "concatAndCompress",
  "copyImg",
  "etag",
  "fileToBin",
  "createFSEinit",
  "createFSEheader",
  "createFSEinitStart",
  "createFSEinitEnd",
  "concatFSEcontent",
  "concatFSE",
  "cleanTmp"
]));

// main build task gzip ---
gulp.task("buildGz", gulp.series([
  "clean",
  "concatAndCompressGz",
  "copyImg",
  "etag",
  "fileToBinGz",
  "createFSEinitGzip",
  "createFSEheader",
  "createFSEinitStart",
  "createFSEinitEnd",
  "concatFSEcontent",
  "concatFSE",
  "cleanTmp"
]));
