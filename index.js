'use strict';
var pkg = require('./package');
var gutil = require('gulp-util');
var through = require('through2');
var path = require('path');
var File = require('vinyl');

// consts
module.exports = function(out, options) {

  options = options || {};

  var fileList = [];
  var fileCounter = 0;

  return through.obj(function(file, enc, cb) {

    if (file.isNull()) {
      cb(null, file);
      return;
    }

    if (file.isStream()) {
      cb(new gutil.PluginError(pkg.name, 'Streams not supported'));
      return;
    }

    var filePath = "";
	var fileExt  = "";
	var fileName = ""; 
	fileName = path.basename(file.path);
	if (fileName.length){
		var pos = fileName.indexOf(".");
		if (pos >= 0){
			fileExt  = fileName.slice(pos+1);
			fileName = fileName.slice(0, pos);
		}
		else
			fileName = "";
	}
	
    if (options.absolute) {
      filePath = path.normalize(file.path);
    } else if (options.flatten) {
      filePath = path.basename(file.path);
    } else if (options.relative) {
      filePath = file.relative;
    } else {
      filePath = path.relative(file.cwd, file.path);
    }
    if (options.removeExtensions) {
      var extension = path.extname(filePath);
      if (extension.length) {
        filePath = filePath.slice(0, -extension.length);
      }
    }
    filePath = filePath.replace(/\\/g, '/');
    
    if(options.destRowTemplate) {
      var str = options.destRowTemplate.replace(/@filePath@/g, filePath); // '@filePath@'
	  str = str.replace(/@fileName@/g, fileName); 
	  str = str.replace(/@fileExt@/g, fileExt);
    str = str.replace(/@fileCounter@/g, fileCounter);

    if (options.isGzip) {
      if ((fileExt == "html") || 
          (fileExt == "htm")  || 
          (fileExt == "css")  || 
          (fileExt == "js")   || 
          (fileExt == "json") || 
          (fileExt == "xml")) {
        str = str.replace(/@isGzip@/g, "true");
      } else {
        str = str.replace(/@isGzip@/g, "false");
      }
    } else {
      str = str.replace(/@isGzip@/g, "false");
    }

    fileCounter++;
	  fileList.push(str);   
    } else {
      fileList.push(filePath);
    }    
    
    cb();
  }, function(cb) {
    var buffer = (options.destRowTemplate) ? new Buffer(fileList.join('')) : new Buffer(JSON.stringify(fileList, null, '  '));

    var fileListFile = new File({
      path: out,
      contents: buffer
    });

    this.push(fileListFile);
    cb();
  });
};
