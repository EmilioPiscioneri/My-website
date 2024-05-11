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
    // set button to just say already logged in
    adminLoginElement.onclick = function () {
        alert("Already logged in foo")
    };
}

// call this after log in fail or if not logged in
function handleAdminLoginFail() {
    userIsLoggedIntoAdmin = false;
    adminLoginElement.onclick = adminLoginFromUserInput; // set button to actually login
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