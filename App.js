const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const qrcode_t = require('qrcode-terminal');
const qrcode = require('qrcode');
const http = require('http');
const fs = require('fs');
const port = process.env.PORT | 8000;
const { phoneNumberFormatter } = require('./helpers/formatter');

const app =  express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.urlencoded({extended:true}));

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

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessful
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on('message', msg => {
    const contact = await msg.getContact();
    const contactName = `+${contact.id.user + (contact.id.user.length < 15 ? ' '.repeat(15-contact.id.user.length) : '')} | ${(contact.shortName ?? (contact.name ?? (contact.pushname ?? 'Undefined')))}`;

    console.log(`[${datetime()}] [message] [${msg.isStatus ? 'status ' : 'private'}] ${contactName} ~> ${originalMessageBody}`);

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
    const message = req.body.message;

    const isRegistered =  await checkRegisteredNumber(number);

    if(!isRegistered) {
        return res.status(422).json({
            status : false,
            message : 'The number is not registered'
        })
    }
    client.sendMessage(number, message).then(response => {
        res.status(200).json({
            status : true,
            response : response
        })
    }).catch(err => {
        res.status(500).json({
            status : true,
            response : err
        });
    });
})

server.listen(port, function(){
    console.log('App running on *:' + port );
})