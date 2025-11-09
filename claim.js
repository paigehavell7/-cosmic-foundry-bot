// Simple HTTP endpoint (optional)
const express = require('express');
const app = express();
app.get('/', (req,res)=>res.send('Cosmic Foundry Bot web endpoint'));
const port = process.env.PORT || 3000;
app.listen(port, ()=>console.log('Web server listening on', port));
