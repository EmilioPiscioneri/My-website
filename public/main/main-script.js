console.log("Main script loaded")

// cookie handling code

// I modified up code from https://www.w3schools.com/js/js_cookies.asp

/*function setCookie(cookieName, cookieValue, expiryDays) {
    const expiryDate = new Date();
    expiryDate.setTime(expiryDate.getTime() + (expiryDays * 24 * 60 * 60 * 1000));
    let expires = "expires=" + expiryDate.toUTCString();
    document.cookie = cookieName + "=" + cookieValue + ";" + expires + ";path=/";
}

function getCookie(cookieName) {
    let name = cookieName + "=";
    let cookiesArray = document.cookie.split(';'); // split at end of cookie character
    for (let cookieIndex = 0; cookieIndex < cookiesArray.length; cookieIndex++) {
        let iteratedCookie = cookiesArray[cookieIndex];
        iteratedCookie = iteratedCookie.trimStart(); // remove white space at front of cookie
        if (iteratedCookie.indexOf(name) == 0) 
            return iteratedCookie.substring(name.length, iteratedCookie.length); // extract the value of the cookie
        
    }
    return; // cookie not found, return null
}*/

// handle admin login

// JUST SO YOU KNOW, you need the admin cookie to do anything (server will reject). How do you generate one? Password. How do you get password? You don't and never will.

let adminLoginElement = document.getElementById("admin-login")
let adminLogoutElement = document.getElementById("admin-logout");
var userIsLoggedIntoAdmin = false; // whether or not the user is logged into admin perms
const adminEndpoint = "/secret/admin"
let adminMenuCreated = false;

function adminLoginFromUserInput(event) {
    // give the user a popup
    let userResponse = prompt();

    if (!userResponse)
        return

    // if there is a response

    // send to server and ask for admin login cookie
    let xhr = new XMLHttpRequest();

    // initialise the request
    xhr.open("POST", adminEndpoint + "/login", true);

    // configure stuff
    xhr.setRequestHeader("Content-Type", "application/json")

    let dataToSend = {
        "key": userResponse
    }

    // setup listen functions

    // handle finished n that
    xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            const status = xhr.status;
            if (status >= 200 && status < 400) {
                // The request has been completed successfully
                console.log(xhr);
                handleAdminLoginSuccess();
                alert("successfully logged in")

            } else {
                handleAdminLoginFail();
                // There has been an error with the request! 
                alert("nuh uh")
            }
        }
    };

    // xhrRequest.onload = function(){
    //     alert("logged in n that")
    // }

    // actually send the data
    xhr.send(JSON.stringify(dataToSend))

}

// returns a promise that the client is logged into admin, resolved on success and rejected on fail
function isLoggedIntoAdmin() {
    // check with server if logged in, can't do this client side as cookie is http only
    return new Promise((resolve, reject) => {
        // send to server and check for logged in
        let xhr = new XMLHttpRequest();

        // initialise the request
        xhr.open("GET", adminEndpoint + "/isLoggedIn", true);

        // setup listen functions

        // handle finished n that
        xhr.onreadystatechange = function () {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                const status = xhr.status;
                if (status >= 200 && status < 400) {
                    console.log("Logged into admin")
                    resolve(); // resolve promise
                } else {
                    reject(); // not logged in
                }
            }
        };

        // actually send the request
        xhr.send()
    })
}

// call this after logged in or if already logged in
function handleAdminLoginSuccess() {
    userIsLoggedIntoAdmin = true;
    showAdminMenu();
    // set button to just say already logged in
    adminLoginElement.onclick = function () {
        alert("Already logged in foo")
    };
}

let adminMenuDiv;



function hideAdminMenu() {
    if (adminMenuCreated)
        adminMenuDiv.display = "none"

}

// call this after log in fail or if not logged in
function handleAdminLoginFail() {
    userIsLoggedIntoAdmin = false;
    adminLoginElement.onclick = adminLoginFromUserInput; // set button to actually login
    hideAdminMenu();
}

// do a check for logged into admin and then set the behaviour of login button accordingly
isLoggedIntoAdmin()
    .then(handleAdminLoginSuccess)
    .catch(handleAdminLoginFail)


adminLogoutElement.onclick = function () {
    if (!userIsLoggedIntoAdmin) {
        alert("Mate you're not even logged in")
        return
    }

    // else, is logged in
    let xhr = new XMLHttpRequest();

    xhr.open("POST", adminEndpoint + "/logout");

    // handle finished n that
    xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            const status = xhr.status;
            if (status >= 200 && status < 400) {
                console.log("logged out of admin")
                alert("logged out of admin")

                handleAdminLoginFail();
            } else {
                console.warn("Failed to logout of admin???")
            }
        }
    };

    xhr.send();
}
// shows admin menu, creates the admin menu if it doesn't exist
function showAdminMenu() {
    if (adminMenuCreated) {
        adminMenuDiv.display = "flex"
        return;
    }

    // create the admin menu
    let mainInnerContent = document.getElementById("main-inner-content"); // grab the inner div

    adminMenuDiv = document.createElement("div");

    adminMenuDiv.id = "admin-menu-container"
    adminMenuDiv.className = "admin-menu-container"

    // items to add to menu
    let addPageBtn = document.createElement("button");
    addPageBtn.innerText = "Add page"

    addPageBtn.className = "admin-menu-item";

    addPageBtn.onclick = handleAddPage;

    // add elements to menu
    adminMenuDiv.appendChild(addPageBtn);

    // add the div to start of inner content. I hate this insert before function it be confusing ngl
    mainInnerContent.insertBefore(adminMenuDiv, mainInnerContent.firstChild)


    adminMenuCreated = true;
}

function handleAddPage() {
    //admin only
    if (!isLoggedIntoAdmin)
        return

    let sitePath = prompt("Enter site URL path e.g. /portfolio/cool-thing or /about-me")
    if (sitePath == null)
        return
    // I can't be stuffed checking if path is valid. I would have to read up on the url documentation and learn regex or smthn

    // here is my half assed fix
    sitePath = sitePath.replaceAll(" ", "").replaceAll("[","").replaceAll("]","").replaceAll("{","").replaceAll("}","")

    let siteTitle = prompt("Enter site title")
    if (siteTitle == null)
        return
    let siteDescription = prompt("Enter site description")
    if (siteDescription == null)
        return

    // null means cancelled

    // send the add page request to server

    let dataToSend = {
        sitePath: sitePath,
        siteTitle: siteTitle,
        siteDescription: siteDescription
    }

    dataToSend = JSON.stringify(dataToSend); // convert to string

    let xhr = new XMLHttpRequest();

    xhr.open("POST", adminEndpoint + "/addPage", true);

    xhr.setRequestHeader("Content-Type", "Application/json");

    // listen to change
    xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            const status = xhr.status;
            if (status >= 200 && status < 400) {
                // The request has been completed successfully

                alert("Successfully created website")

                if (!sitePath.startsWith("/"))
                    window.open("/" + sitePath, "_blank")
                else
                    window.open(sitePath, "_blank")



            } else {
                // There has been an error with the request! 
                alert("Failed")
                console.log(xhr)
            }
        }
    };

    // send data to server
    xhr.send(dataToSend)



}