require('dotenv').config();
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const qrcode_t = require('qrcode-terminal');
const qrcode = require('qrcode');
const http = require('http');
const fileUpload = require('express-fileupload');
const port = parseInt(process.env.PORT, 10) | 5000
const fs = require('fs');
const { phoneNumberFormatter } = require('./helpers/formatter');

const app =  express();
const server = http.createServer(app);
const io = socketIO(server);
const token = `Basic ${Buffer.from(`${process.env.API_USER}:${process.env.API_PASSWORD}`, "utf8").toString("base64")}`;

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(fileUpload({
    debug:false
}));

console.log([
    "port : "+ process.env.PORT,
    "user : "+ process.env.API_USER,
    'password : '+ process.env.API_PASSWORD
])

app.get('/', (req, res)=> {
    res.sendFile('index.html', {root: __dirname});
});

const client = new Client({
    authStrategy: new LocalAuth(),
    restartOnAuthFail: true,
    puppeteer: { 
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // <- this one doesn't works in Windows
            '--disable-gpu'
          ],
        headless: true 
    },
    printQRInTerminal: true,
});


// client.on('authenticated', (session)=> {
//     console.log('AUTHENTICATED', session);
//     sessionCfg = session;
//     fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function(err){
//         if(err){
//             console.error(err);
//         }
//     });
// });

const datetime = () => {
    return new Date().toLocaleString('en-ZA', {
        timeZone: 'Asia/Jakarta',
        hour12: false
    }).replace(',', '');
}

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessful
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on('message', async msg => {
    // const contact = await msg.getContact();
    // const contactName = `+${contact.id.user + (contact.id.user.length < 15 ? ' '.repeat(15-contact.id.user.length) : '')} | ${(contact.shortName ?? (contact.name ?? (contact.pushname ?? 'Undefined')))}`;

    // console.log(`[${datetime()}] [message] [${msg.isStatus ? 'status ' : 'private'}] ${contactName} ~> ${msg.body}`);

    if (msg.body == '!ping') {
        console.log(msg.body);
        msg.reply('pong cuk');
    }
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
});

client.initialize();

// Socket IO
io.on('connection', function(socket){
    socket.emit('message', 'Connecting...');

    client.on('qr', (qr) => {
        // Generate and scan this code with your phone
        console.log('QR RECEIVED', qr);
        qrcode_t.generate(qr, {
            small: true
        });
        qrcode.toDataURL(qr, (err, url)=>{
            socket.emit('qr', url);
            socket.emit('message', 'QR Code Received');
        });
    });

    client.on('ready', () => {
        console.log('Client is ready!');
        socket.emit('message', 'Client is ready!');
    });
});

// Check Registered Number
const checkRegisteredNumber = async function (number) {
    const isRegistered = await client.isRegisteredUser(number);
    return isRegistered;
};

//Send Message
app.post('/send-message', [
    body('number').notEmpty(),
    body('message').notEmpty(),
], async (req,res)=>{
    const reqHeader = req.get('Authorization');

    if(reqHeader != token){
        return res.status(403).json({
            status : false,
            message : 'Not Authorized'
        })
    }
    
    const errors = validationResult(req).formatWith(({ msg })=>{
        return msg;
    });

    if(!errors.isEmpty()){
        return res.status(422).json({
            status : false,
            message : errors.mapped()
        })
    }

    const number = phoneNumberFormatter(req.body.number);
    const msg = req.body.message;
    
    const isRegistered =  await checkRegisteredNumber(number);

    if(!isRegistered) {
        return res.status(422).json({
            status : false,
            message : 'The number is not registered'
        })
    }

    if(req.files){       
        const file =  req.files.file;
        const media = new MessageMedia(file.mimetype, file.data.toString('base64'), file.name);
    
        client.sendMessage(number, media, {caption : msg, sendMediaAsDocument:true }).then(response => {
            res.status(200).json({
                status : true,
                response : response
            });
        }).catch(err => {
            res.status(500).json({
                status : false,
                response : err
            });
        });
    } else {
        client.sendMessage(number, msg ).then(response => {
            res.status(200).json({
                status : true,
                response : response
            });
        }).catch(err => {
            res.status(500).json({
                status : false,
                response : err
            });
        });
    }

})

app.post('/check', (req, res)=> {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Max-Age", "1800");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    return res.status(200).json({
        status : true,
        message : 'API is Online'
    })
});

server.listen(port, function(){
    console.log('App running on *:' + port );
})