// -- Libraries
const exp = require('constants');
const express = require('express');
const app = express();
const filesystem = require('fs');
const { type } = require('os');
const openUrl = require("openurl").open;
const path = require("path");
require('dotenv').config() // for reading in environment variables, easier than writing my own code for it
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const { match } = require('assert');

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
const footerHtmlFile = path.join(dataFilesDirectory, "footer.html"); // footer html that is shared across all sites

const adminCookiesFile = path.join(cacheDirectory, "/secret/admin-cookies.json");


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
    } else
      break;
    // else, the directory isn't blacklisted
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
  let leftHtmlStr = finalDataToSend.substring(0, matchPosition + navMatchStr.length);

  // new string to insert
  let newStringToInsert = ""

  // get different nav items to add.
  // This data is an array of objects
  let navData = JSON.parse(filesystem.readFileSync(navDataFile, { encoding: "utf8" }));

  // loop thru the array of nav info objects
  for (let navInfoObject of navData) {
    let name = navInfoObject.name; // The text to display 
    let href = navInfoObject.link; // link relative to site (not page)

    // add a new tag for each nav item as string
    newStringToInsert += '<a class="nav-item" href="' + href + '">' + name + '</a>\n'
  }


  // right part of old string
  let rightHtmlStr = finalDataToSend.substring(matchPosition + navMatchStr.length, finalDataToSend.length);

  // combine all of them
  finalDataToSend = leftHtmlStr + newStringToInsert + rightHtmlStr

  // - Add the footer html

  let footerStartMatchStr = "<footer>";

  let footerStartMatchPosition = finalDataToSend.indexOf(footerStartMatchStr); // this is the start of the footer

  leftHtmlStr = finalDataToSend.substring(0, footerStartMatchPosition + footerStartMatchStr.length); // html until strart of footer

  newStringToInsert = filesystem.readFileSync(footerHtmlFile, { encoding: "utf8" }); // get new footer html content to add

  let footerEndMatchStr = "</footer>";

  let footerEndMatchPosition = finalDataToSend.indexOf(footerEndMatchStr); // this is the end of the footer

  rightHtmlStr = finalDataToSend.substring(footerEndMatchPosition + footerEndMatchStr.length, finalDataToSend.length); // html from end of footer to end of html

  // combine all of them
  finalDataToSend = leftHtmlStr + newStringToInsert + rightHtmlStr

  httpResponse.send(finalDataToSend);
}

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
// console.log(sitemapObject)

// - different middleware cos I'm lazy

// make public folder, static
app.use(express.static('public'))

// parse json requests
app.use(express.json())

app.use(cookieParser());


// redirect to home
app.get('/', (req, res) => {
  res.redirect("/home");
})

// app.get('/home', (req, res) => {
//   res.sendFile(__dirname + '/public/home/site.html')
// })
// all of the admin stuff. Hanlde it seperately

// this link will generate a cookie for user regardless of if they have one
app.post("/secret/admin/login", (httpRequest, httpResponse) => {
  let requestData = httpRequest.body;

  // verify data is valid
  if (!requestData || typeof (requestData) != "object" || !requestData["key"]) {
    httpResponse.sendStatus(401); // error
    return
  }

  // check if the right key was sent
  let validKey = process.env.admin_key;

  // key doesn't match
  if (requestData.key != validKey) {
    httpResponse.sendStatus(401); // error
    return
  }

  // key does match, create an according cookie


  let adminCookies = JSON.parse(filesystem.readFileSync(adminCookiesFile, { encoding: "utf8" })); // an array of existing cookies
  let newCookie;
  // keep creating a cookie until there isn't one. The chance of a cookie existing is so slim but just in case
  while (adminCookies.indexOf(newCookie) != -1 || !newCookie) {
    newCookie = crypto.randomBytes(128).toString("hex"); // creates a 256 character string in hex
  }

  // apply the new cookie
  adminCookies.push(newCookie);

  // save the updated array to file
  filesystem.writeFileSync(adminCookiesFile, JSON.stringify(adminCookies));

  // Cookie expiry length (duration) in seconds
  const cookieLength = 60 * 60 * 24 * 365; // one year

  // I would add Secure tag but that means I need to setup Https
  httpResponse.setHeader("Set-Cookie", "admin_cookie=" + newCookie + "; Path=/; Max-Age=" + cookieLength + "; HttpOnly; SameSite=Strict")
  httpResponse.sendStatus(200)
})

// this link will generate a cookie for user regardless of if they have one
app.post("/secret/admin/logout", (httpRequest, httpResponse) => {
  let requestCookie = httpRequest.cookies; // get client sent cookies



  let clientAdminCookie;
  // valid data check
  if (requestCookie)
    clientAdminCookie = requestCookie["admin_cookie"];

  let existingAdminCookies = JSON.parse(filesystem.readFileSync(adminCookiesFile, { encoding: "utf8" })); // an array of existing cookies

  let adminCookieIndex = existingAdminCookies.indexOf(clientAdminCookie)

  // if cookie already exists
  if (clientAdminCookie && adminCookieIndex != -1) {
    // remove the signed out cookie
    existingAdminCookies = existingAdminCookies.splice(adminCookieIndex, 1);

    // write new data
    filesystem.writeFileSync(adminCookiesFile, JSON.stringify(existingAdminCookies))
  }

  // remove the admin cookie, cookie
  httpResponse.setHeader("Set-Cookie", "admin_cookie=; Path=/; Max-Age=-1; HttpOnly; SameSite=Strict")
  httpResponse.sendStatus(200)
})

function userAdminCookieExists(userCookie) {
  let existingAdminCookies = JSON.parse(filesystem.readFileSync(adminCookiesFile, { encoding: "utf8" })); // an array of existing cookies

  return existingAdminCookies.indexOf(userCookie) != -1
}

app.get("/secret/admin/isLoggedIn", (httpRequest, httpResponse) => {
  let requestCookie = httpRequest.cookies; // get client sent cookies

  // valid data check
  if (!requestCookie || !requestCookie["admin_cookie"]) {
    // failed
    httpResponse.sendStatus(401); // error
    return
  }

  let clientAdminCookie = requestCookie["admin_cookie"];


  if (userAdminCookieExists(clientAdminCookie))
    httpResponse.sendStatus(200)
  else
    httpResponse.sendStatus(401)

})

app.post("/secret/admin/addPage", (httpRequest, httpResponse) => {
  let requestCookie = httpRequest.cookies; // get client sent cookies
  let requestData = httpRequest.body;

  // verify data is valid
  if (!requestData || typeof (requestData) != "object" || !(requestData["sitePath"] != null && requestData["siteTitle"] != null && requestData["siteDescription"] != null)) {
    httpResponse.status(401).send("Data provided was incomplete")
    return
  }

  // valid data check
  if (!requestCookie || !requestCookie["admin_cookie"]) {
    // failed
    httpResponse.status(401).send("Provided malformed (or no) cookie, log in again")
    return
  }

  let clientAdminCookie = requestCookie["admin_cookie"];

  if (!userAdminCookieExists(clientAdminCookie))
    httpResponse.status(401).send("Provided an invalid cookie, log in again")

  // client is an admin

  let sitePathStr = ("/public/" + requestData.sitePath).toLowerCase();

  // actual path object
  let sitePath = path.join(__dirname, sitePathStr);

  // first check if it already exists
  if (filesystem.existsSync(sitePath)) {
    httpResponse.status(401).send("The site path already exists on server filesystem smh");
    return;
  }

  filesystem.mkdir(sitePath, { recursive: true }, (err) => {
    if (err) {
      httpResponse.status(401).send("Gave an invalid path");
      return;
    }

    // ok so the directory is created
    // clone contents of template site

    for (let fileStr of filesystem.readdirSync(path.join(templateDirectory, "site"), { encoding: "utf8" })) {
      let iteratedFilePath = path.join(templateDirectory, "/site/", fileStr);

      // copy the file from template dir to new dir with same name
      filesystem.copyFileSync(iteratedFilePath, path.join(sitePath, "/" + fileStr));
    }

    // Now edit certain files
    let siteHTMLFile = path.join(sitePath, "/site.html");

    let siteHtmlContents = filesystem.readFileSync(siteHTMLFile, { encoding: "utf8" })

    // edit site meta description

    let stringMatch = '<meta name="description" content="';

    let matchPosition = siteHtmlContents.indexOf(stringMatch);

    let htmlStart = siteHtmlContents.substring(0, matchPosition + stringMatch.length)

    let stringToAdd = requestData.siteDescription;

    let htmlEnd = siteHtmlContents.substring(matchPosition + stringMatch.length, siteHtmlContents.length)

    // add all of it up
    siteHtmlContents = htmlStart + stringToAdd + htmlEnd;

    // do it again
    stringMatch = '<title>';

    matchPosition = siteHtmlContents.indexOf(stringMatch);

    htmlStart = siteHtmlContents.substring(0, matchPosition + stringMatch.length)

    stringToAdd = requestData.siteTitle;

    htmlEnd = siteHtmlContents.substring(matchPosition + stringMatch.length, siteHtmlContents.length)


    // add all of it up
    siteHtmlContents = htmlStart + stringToAdd + htmlEnd;

    // write new html contents
    filesystem.writeFileSync(siteHTMLFile, siteHtmlContents);

    // now that files are copied

    // console.log("Old sitemap")
    // console.log(sitemapObject)

    // regenerate the sitemap
    sitemapObject = generateSitemapObject();

    // console.log("New sitemap")
    // console.log(sitemapObject)

    httpResponse.sendStatus(201)
  })



})

// for some reason app.delete doesn't work
app.post("/secret/admin/deletePage", (httpRequest, httpResponse) => {
  let requestCookie = httpRequest.cookies; // get client sent cookies
  let requestData = httpRequest.body;

  // verify data is valid
  if (!requestData || typeof (requestData) != "object" || !requestData["sitePath"]) {
    httpResponse.status(401).send("Data provided was incomplete")
    return
  }

  // valid data check
  if (!requestCookie || !requestCookie["admin_cookie"]) {
    // failed
    httpResponse.status(401).send("Provided malformed (or no) cookie, log in again")
    return
  }

  let clientAdminCookie = requestCookie["admin_cookie"];

  if (!userAdminCookieExists(clientAdminCookie))
    httpResponse.status(401).send("Provided an invalid cookie, log in again")

  // client is an admin

  let sitePathStr = ("/public/" + requestData.sitePath).toLowerCase();

  // actual path object
  let sitePath = path.join(__dirname, sitePathStr);

  // first check if it doesn't exist
  if (!filesystem.existsSync(sitePath)) {
    httpResponse.status(401).send("The site path doesn't exist on filesystem smh");
    return;
  }

  filesystem.rmSync(sitePath, {recursive: true})

  // regenerate the sitemap
  // sitemapObject = generateSitemapObject();

  httpResponse.sendStatus(201)



})

// Handle all public stuff

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
    } else {
      // failed to find a match, a match must be found
      break;
    }
  }



  // if the page was found in public directory
  if (desiredPageDirectory != null && filesystem.existsSync(desiredPageDirectory)) {
    let infoFile = path.join(desiredPageDirectory, "information.json")
    let fileContents; // the file's contents as object (parsed JSON)
    // check if directorty has information.json file. This tells the server what the link should do
    if (!filesystem.existsSync(infoFile)) {
      let defaultInfoFileContents = filesystem.readFileSync(templateSiteInfoFile, { encoding: "utf8" }); // get default contents as string
      filesystem.writeFileSync(infoFile, defaultInfoFileContents, {flag: "w"}); // write new stuff to file and create it
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

// console.log(process.env);
// console.log(process.env.secretAPIKey)