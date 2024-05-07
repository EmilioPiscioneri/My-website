const express = require('express')
const app = express()
const port = 5123; // port for website
const openUrl = require("openurl").open;

// make public folder, static
app.use(express.static('public'))

// redirect to home
app.get('/', (req, res) => {
  res.redirect("/home");
})

app.get('/home', (req, res) => {
    res.sendFile(__dirname+'/public/home/main-site.html')
  })

  app.listen(port, () => {
    openUrl("http://localhost:5123")
  console.log(`Example app listening on port ${port}`)
})

//