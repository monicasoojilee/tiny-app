// MIDDLEWARE & SET-UP --------------------------------------------------------

const express = require("express");
const bodyParser = require("body-parser");
const cookieSession = require('cookie-session')
const bcrypt = require('bcrypt');

const app = express();
const PORT = 8080;

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
    name: 'session',
    keys: ['cookie-monster']
}));


// BUILT-IN MEMORY OBJECTS ---------------------------------------------------

const urlDatabase = {
  "b2xVn2": {
    userID: "userRandomID",
    URL: "http://www.lighthouselabs.ca",
    },
  "9sm5xK": {
    userID: "user2RandomID",
    URL: "http://www.google.com",
    }
};

const users = {
    "userRandomID": {
      id: "userRandomID",
      email: "user@example.com",
      password: bcrypt.hashSync("purple-monkey-dinosaur", 10)
    },
   "user2RandomID": {
      id: "user2RandomID",
      email: "user2@example.com",
      password: bcrypt.hashSync("dishwasher-funk", 10)
    }
};


// FUNCTIONS & VERIFICATIONS --------------------------------------------------

function generateRandomString() {
    return Math.random().toString(16).substring(2, 8);
}

function checkEmailMatch(submittedEmail) {
    for (let userId in users) {
        if (submittedEmail === users[userId].email){
            return true;
        }
    }
    return false;
}

function checkUser(idSubmitted) {
    for (let userId in users) {
        if (idSubmitted === users[userId].id) {
            return true;
        }
    }
    return false;
}

function checkCreator(idSubmitted) {
    for (let url in urlDatabase) {
        if (idSubmitted === urlDatabase[url].userID) {
            return true;
        }
    }
    return false;
}

function urlsForUser(id) {
    const userUrls = {};
    for (let url in urlDatabase) {
        if (id === urlDatabase[url].userID) {
            userUrls[url] = urlDatabase[url].URL
        }
    }
    return userUrls;
}


// PAGES ---------------------------------------------------------

app.get("/", function(req, res) {
    console.log(req.session.user_id);
    if (checkUser(req.session.user_id)) {
        res.redirect("/urls");
    } else {
        res.redirect("/register")
    }
});

// Main Page
app.get("/urls", function(req,res) {
    let urlList = urlsForUser(req.session.user_id);
    const templateVars = {
        urls: urlList,
        userObj: users[req.session.user_id]
    };
    res.render("urls_index", templateVars);
});

// Create URL Page
app.get("/urls/new", function(req, res) {
    const templateVars = {
        userObj: users[req.session.user_id]
    };

    if (checkUser(req.session.user_id)) {
        res.render("urls_new", templateVars);
    } else {
        res.redirect("/login");
    }
});

// Edit URL Page
app.get("/urls/:id", function(req, res) {
    const templateVars = {
        shortURL: req.params.id,
        longURL: urlDatabase[req.params.id],
        userObj: users[req.session.user_id]
    };

    if (checkUser(req.session.user_id) && checkCreator(req.session.user_id)) {
            res.render("url_shows", templateVars);
    } else {
        res.send("Oops! Please register or login to use TinyApp.");
    }
});

// Redirect ShortURL to LongURL
app.get("/u/:id", function(req, res) {
    if (urlsForUser((req.session.user_id))){
        res.redirect(urlDatabase[req.params.id].URL);
    } else {
        res.send("Sorry, we could not find anything there. Please check the inputted URL.")
    }
});

// Create New URL
app.post("/urls", function(req, res) {
    if (checkUser(req.session.user_id)) {
        const uniqueShortURL = generateRandomString();
        urlDatabase[uniqueShortURL] = {
            URL: req.body.longURL,
            userID: req.session.user_id
        }
        console.log("JUST CREATED NEW LINK", urlDatabase);
        res.redirect(`/urls/${uniqueShortURL}`);
    } else {
        res.send("Oops! Please register or login to use TinyApp.")
    }
});

// Edit Existing URL
app.post("/urls/:id", function(req, res) {
    if (checkUser(req.session.user_id)) {
        if (checkCreator(req.session.user_id)) {
            urlDatabase[req.params.id].URL = req.body.longURL;
            res.redirect("/urls");
        } else {
            res.send("Sorry, it looks like you cannot change that URL.")
        }
    } else {
        res.send("Oops! Please register or login to use TinyApp");
    }
});

// Delete Existing URL
app.post("/urls/:id/delete", function(req, res) {
    if (checkCreator(req.session.user_id)) {
        delete urlDatabase[req.params.id];
        res.redirect("/urls");
    } else {
        res.redirect("/login");
    }
});

// Login Page
app.get("/login", function(req, res) {
    const templateVars = {
        userObj: users[req.session.user_id]
     };
    
    if (checkUser(req.session.user_id)) {
        res.redirect("/urls");
    } else {
        res.render("login", templateVars);
    }
});

// Register Page
app.get("/register", function(req, res) {
    const templateVars = {
        userObj: users[req.session.user_id]
    }
    if (checkUser(req.session.user_id)) {
        res.redirect("/urls")
    } else {
    res.render("register", templateVars);
    }
});

// Login to Account
app.post("/login", function(req, res){
    const password = req.body.password;
    for (let userId in users) {
        if (req.body.email === users[userId].email) {
            const hashedPassword = users[userId].password; 
            if (bcrypt.compareSync(password, hashedPassword)) {
                req.session.user_id = users[userId].id;
                res.redirect("/urls");
            } else {
                res.status(403).send("Invalid email and/or password combination.");
            }
        }
    }
}); 

// Register New Account
app.post("/register", function(req, res) {
    const uniqueUserId = generateRandomString();
    if (req.body.email === "" || req.body.password === "") {
        res.status(400).send("Oops, looks like something is missing! Please include both an email and password.");
    } else if (checkEmailMatch(req.body.email)) {
        res.status(400).send("Invalid");
    } else {
        users[uniqueUserId] = {
            id: uniqueUserId,
            email: req.body.email,
            password: bcrypt.hashSync(req.body.password,10)
        };
        req.session.user_id = uniqueUserId;
        res.redirect("/urls")
    };
});

// Logout of Account
app.post("/logout", function(req, res){
    req.session = null;
    res.redirect("/urls");
});

app.listen(PORT, () => {
  console.log(`TinyApp listening on port ${PORT}!`);
});