// -- Libraries
const express = require('express');
const app = express();
const filesystem = require('fs');
const { type } = require('os');
const openUrl = require("openurl").open;
const path = require("path");

// -- Constant simple types
const port = 5123; // port for website
const defaultHtmlName = "site.html"; // default name for html files under page directory

// -- Directories
const cacheDirectory = path.join(__dirname, "/cache/");
const publicDirectory = path.join(__dirname, "/public/")
const templateDirectory = path.join(__dirname, "/templates/")
const dataFilesDirectory = path.join(__dirname, "/data-files/")

// -- Files

const sitemapCacheFile = path.join(cacheDirectory, "sitemap.json")
// file that has a template information.json that should be in each site directory
const templateSiteInfoFile = path.join(templateDirectory, "site/information.json");
const pageNotFoundFile = path.join(templateDirectory, "errors/page-not-found/site.html")

const navDataFile = path.join(dataFilesDirectory, "nav-data.json")

// Sitemap files not to include in sitemap
// each blacklisted item must have no subdirectories in it
const sitemapFilesBlacklist = {
  "main": {},
  // blacklist tests
  /*"portfolio": {
    "layer1-2": {}
  },
  "portfolio": {},
  "folder1": {
    "1-1": {}
  },
  "folder1": {
    "folder2": {
      "2-2": {
        "3": {}
      }
    }
  }*/
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
function cloneObject(objectToClone) {
  return Object.assign({}, objectToClone)
}

// returns a cloned array. Normally they are just references
function cloneArray(arrayToClone) {
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

// input response object and file path
function sendHTMLFile(httpResponse, filePath) {
  let finalDataToSend = filesystem.readFileSync(filePath, { encoding: "utf8" }); // string of html data

  // Now do your manipulations of each html file

  // - Dynamic nav stuff

  /*
    Demonstration code
    let str = "abcdefghij<div id=\"fart\"></div>klmnopqrstuvwxyz";
    let match = 'id="fart">'
    let pos = str.indexOf(match)
    let strStart = str.substring(0, pos+match.length);
    let strMiddle = "<p>middle</p>"
    let strEnd = str.substring(pos+match.length, str.length)
    console.log(strStart+strMiddle+strEnd)
   */

  let navMatchStr = 'id="top-nav-bar">'; // end text of nav bar in html file

  let matchPosition = finalDataToSend.indexOf(navMatchStr);

  // left part of old string
  let leftHtmlStr = finalDataToSend.substring(0, matchPosition+navMatchStr.length);

  // new string to insert
  let newStringToInsert = ""

  // get different nav items to add.
  // This data is an array of objects
  let navData = JSON.parse(filesystem.readFileSync(navDataFile, {encoding: "utf8"}));

  // loop thru the array of nav info objects
  for (let navInfoObject of navData) {
    let name = navInfoObject.name; // The text to display 
    let href = navInfoObject.link; // link relative to site (not page)

    // add a new tag for each nav item as string
    newStringToInsert += '<a class="nav-item" href="' + href + '">' + name +'</a>\n'
  }


  // right part of old string
  let rightHtmlStr = finalDataToSend.substring(matchPosition+navMatchStr.length, finalDataToSend.length);

  // combine all of them
  finalDataToSend = leftHtmlStr + newStringToInsert + rightHtmlStr

  httpResponse.send(finalDataToSend);
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

// app.get('/home', (req, res) => {
//   res.sendFile(__dirname + '/public/home/site.html')
// })

app.get('/*', (httpRequest, httpResponse) => {
  // console.log(httpRequest.url)
  // console.log(httpRequest)

  // -- Public sites handling

  // Handle pages redirecting


  let desiredPageDirectory = null; // Start as null, if is null after end of function then u got an issue

  // remove first and last slash (don't include those indexes)
  let rawUrl = httpRequest.url; // raw thang
  let urlPath; // this is the rawUrl without first and last(if included) "/"
  if (rawUrl.endsWith("/"))
    urlPath = rawUrl.substring(1, rawUrl.length - 1); // don't include last /
  else
    urlPath = rawUrl.substring(1, rawUrl.length); // no last /


  // The path of the url as an array of strings to each directory
  let urlPathArray = urlPath.split("/"); // each directory is seperated by "/". Using .url omits the last "/"

  // Check if desired page exists under public

  let currentPageObject = sitemapObject; // start at public folder (top of sitemap object), keep going from there

  for (let directoryIndex = 0; directoryIndex < urlPathArray.length; directoryIndex++) {
    let directoryName = urlPathArray[directoryIndex]

    // does directory exist under current one
    // use the sitemap cos it will be faster than disk readings

    if (keyExistsInObject(directoryName, currentPageObject)) {
      // set the iterated directory object to be the current object 
      currentPageObject = currentPageObject[directoryName];
      // if reached end of loop, set the desired page directory as it was successfully found
      if (directoryIndex == urlPathArray.length - 1) {
        // just combine the public directory with path as they will be the same location
        desiredPageDirectory = path.join(publicDirectory, urlPath);
      }
    }
  }

  // if the page was found in public directory
  if (desiredPageDirectory != null) {
    let infoFile = path.join(desiredPageDirectory, "information.json")
    let fileContents; // the file's contents as object (parsed JSON)
    // check if directorty has information.json file. This tells the server what the link should do
    if (!filesystem.existsSync(infoFile)) {
      let defaultInfoFileContents = filesystem.readFileSync(templateSiteInfoFile, { encoding: "utf8" }); // get default contents as string
      filesystem.writeFileSync(infoFile, defaultInfoFileContents); // write new stuff to file and create it
      fileContents = JSON.parse(defaultInfoFileContents); // set contents to default that you just wrote
    }
    else
      fileContents = JSON.parse(filesystem.readFileSync(infoFile, { encoding: "utf8" })); // parse existing content



    // tells the server what the page should do
    let pageAction = fileContents.behaviour.action;

    switch (pageAction) {
      case "sendFile":
        {
          let fileToSendStr = fileContents.behaviour.fileToSend;
          // the file to send as a path
          let fileToSendPath = path.join(desiredPageDirectory, fileToSendStr);

          // there are modifications done to html files
          if (fileToSendStr.endsWith(".html"))
            sendHTMLFile(httpResponse, fileToSendPath)
          else
            httpResponse.sendFile(fileToSendPath);
          break;
        }
      case "redirect":
        {
          let redirectLocation = fileContents.behaviour.location

          httpResponse.redirect(redirectLocation);
          break;
        }



      default:
        break;
    }





    // get the page html file
    // let pageHtmlFile = path.join(desiredPageDirectory, defaultHtmlName);

    // httpResponse.sendFile(pageHtmlFile);
  } else {
    // page wasn't found, send oage not found html
    sendHTMLFile(httpResponse, pageNotFoundFile);
    // httpResponse.sendFile(pageNotFoundFile);
  }

})



app.listen(port, () => {
  openUrl("http://localhost:5123")
  console.log(`Example app listening on port ${port}`)
})