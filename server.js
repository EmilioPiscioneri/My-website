// -- Libraries
const express = require('express');
const app = express();
const filesystem = require('fs');
const { type } = require('os');
const openUrl = require("openurl").open;
const path = require("path");

// -- Constant simple types
const port = 5123; // port for website

// -- Directories
const cacheDirectory = path.join(__dirname, "/cache/");
const publicDirectory = path.join(__dirname, "/public/")

// -- Files
const sitemapCacheFile = path.join(cacheDirectory, "sitemap.json")

// Sitemap files not to include in sitemap
// each blacklisted item must have no subdirectories in it
const sitemapFilesBlacklist = {
  "main": {},
  // blacklist tests
  "portfolio":{
    "layer1-2" : {}
  },
  "portfolio":{},
  "folder1":{
    "1-1":{}
  },
  "folder1":{
    "folder2":{
      "2-2":{
        "3":{}
      }
    }
  }
  /* e.g. 
  for portfoilio/layer1/directoryToIgnore/
  do

  "portfolio":{
    "layer1" : {
      "directoryToIgnore":{}
    }
  } 

  NOTE: this won't work if directoryToIgnore has subDirectories under it
  */
}

// -- functions 

// Get directories 
function getDirectories(directoryPath) {
  // get files under directory
  return filesystem.readdirSync(directoryPath).filter(function (directoryEntry) {
    // check if the entry is a directory
    return filesystem.statSync(directoryPath + '/' + directoryEntry).isDirectory();
  });
}

// returns whether the key exists in the object
function keyExistsInObject(key, object) {
  // takes advantage of the hashmap (dictionary)
  // only caveat is if you have object[x] = null then it won't work but why would you want that

  if (object[key] != null)
    return true
  else
    return false

  /*

  // get an array of an object's keys
  let objectKeys = Object.keys(object)

  // if the key is found
  if (objectKeys.indexOf(key) != -1)
    return true
  else
    return false
  */
}

// returns a cloned object. Normally they are just references
function cloneObject(objectToClone){
  return Object.assign({}, objectToClone)
}

// returns a cloned array. Normally they are just references
function cloneArray(arrayToClone){
  // I'm not worried about optimization cos this runs fast enough still
  return JSON.parse(JSON.stringify(arrayToClone))
}

// returns if the input directory path array and current name is blacklisted
function isDirectoryBlacklisted(pathArray, currentDirectoryName) {
  // because this is false you don't need to set it to false again
  let directoryIsBlacklisted = false;

  // start at top
  let objectToSearch = sitemapFilesBlacklist;

  // loop through the directory to search
  for (let nameIndex = 0; nameIndex < pathArray.length; nameIndex++) {
    let directoryName = pathArray[nameIndex];
    // if the sub directory is found, keep going
    if (keyExistsInObject(directoryName, objectToSearch)) {
      objectToSearch = objectToSearch[directoryName]; // set the new object to search, it will be the iterated name as that is its content
      /*
      // reached the end of path array, now you need to do final check of currentDirectoryName
      if (nameIndex == pathArray.length - 1) {
        // directoryIsBlacklisted = true
      }
      // else keep going
      else {
        objectToSearch = objectToSearch[directoryName]; // set the new object to search, it will be the iterated name as that is its content
      }*/
    } // else, the directory isn't blacklisted
    // else {
    //   directoryIsBlacklisted = false;
    // }
  }

  // one last check, reached end of path 
  if (keyExistsInObject(currentDirectoryName, objectToSearch)) {
    directoryIsBlacklisted = true;
  }

  return directoryIsBlacklisted;
}

// make public folder, static
app.use(express.static('public'))

// - generate the sitemap cache

// function to generate a sitemap object
function generateSitemapObject() {
  let sitemapObject = {}; // start of sitemap

  // recursively loop thru directories
  // topDirectoryObject is the object value for the top directory under sitemap object, think of it like a pointer that works cos of js.
  // topPathArray is an array of strings that represents the directory names it took to reach this top directory 
  function iterateDirectory(topDirectoryPath, topDirectoryObject, topDirectoryName, topPathArray) {
    let subDirectories = getDirectories(topDirectoryPath)
    // if not at start and directory isn't empty
    if (subDirectories.length != 0 && topDirectoryName != '')
      topPathArray.push(topDirectoryName)

    for (let subDirectoryName of subDirectories) {
      // console.log(topPathArray)
      // console.log(topDirectoryName)
      // console.log(subDirectoryName)

      let subDirectoryPath = path.join(topDirectoryPath, subDirectoryName);

      // if subDirectory has no subdirectories and is blacklisted
      if (getDirectories(subDirectoryPath).length == 0 && isDirectoryBlacklisted(topPathArray, subDirectoryName))
        continue; // skip
      // console.log(getDirectories(subDirectoryPath).length, isDirectoryBlacklisted(topPathArray, subDirectoryName))



      // just add an empty object, will fill in if there's anything to fill in
      var newSubDirectoryObject = {}; // will stay as a reference to the object
      topDirectoryObject[subDirectoryName] = newSubDirectoryObject;

      var newPathArray = cloneArray(topPathArray)
      iterateDirectory(subDirectoryPath, newSubDirectoryObject, subDirectoryName, newPathArray)
    }
  }

  // recursively iterate the directory
  iterateDirectory(publicDirectory, sitemapObject, '', []);

  return sitemapObject
}

// generate the sitemap
let sitemapObject = generateSitemapObject();

// print the output sitemap
console.log(sitemapObject)


// redirect to home
app.get('/', (req, res) => {
  res.redirect("/home");
})

app.get('/home', (req, res) => {
  res.sendFile(__dirname + '/public/home/site.html')
})

app.listen(port, () => {
  openUrl("http://localhost:5123")
  console.log(`Example app listening on port ${port}`)
})