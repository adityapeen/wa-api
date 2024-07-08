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
const { phoneNumberFormatter, clientIdDeformatter } = require('./helpers/formatter');

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

const app =  express();
const server = http.createServer(app);
const io = socketIO(server);
const axios = require('axios');
const token = `Basic ${Buffer.from(`${process.env.API_USER}:${process.env.API_PASSWORD}`, "utf8").toString("base64")}`;

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(fileUpload({
    debug:false
}));

app.get('/', (req, res)=> {
    res.sendFile('index.html', {root: __dirname});
});

const wwebVersion = '2.2412.54';

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
    webVersionCache:
    {
        type: 'remote', 
        remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/${wwebVersion}.html`,
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

const checkTag = (sentence) => {
    var regex = /^(?:[^.!?]*[.!?]+\s*)?(?:\.ask[.!?]?\s+)/i;
    // Test if the string matches the pattern
    return regex.test(sentence);
}

const cleanPrompt = (sentence) => {
    // Regular expression to match ".ask" at the beginning of the sentence
    var regex = /^\s*\.ask[.!?]?\s*/i;

    // Replace ".ask" with an empty string
    return sentence.replace(regex, '');
}

async function getResponse(sentence) {
    const generationConfig = {
        // stopSequences: ["cuk"],
        // maxOutputTokens: 200,
        temperature: 0.9,
        topP: 0.1,
        topK: 16,
      }

    const model = genAI.getGenerativeModel({ model: "gemini-pro", generationConfig});
  
    const prompt = cleanPrompt(sentence);
  
    const result = await model.generateContent(prompt);
    const response = await result.response;
    var text = "";

    try {
        text = response.text();
    } catch (error) {
        text = "Mohon maaf, sepertinya terdapat kata-kata yang melanggar Community Standards"
    }
    return replacedText = text.replace(/\*\*/g, "*");
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
        msg.reply('pong');
    }
    else if(msg.body.toLowerCase() == '.username') {
        var message = await getUserData(clientIdDeformatter(msg.from));
        msg.reply(message);
    }
    else if(checkTag(msg.body)){
        var message = await getResponse(msg.body);
        msg.reply(message);
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

// get User Data
const getUserData = async function (number = null){
    if(number == null) return false;

    var url = `${process.env.APP_URL}/user_profile/${number}`;

    try {
        const apiResponse = await axios.get(url,
        {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
        });

        if(apiResponse.status == 200){
            return apiResponse.data.message;
        }
        else {
            return "Can't get User Data";
        }
    } catch (error) {
        return "Oops!! There's an error";
    }
}

// Callback APP
const sendCallbackApp = async function (identifier = null){
    if(identifier == null) return false;

    var id = identifier.split(';');
    var url = `${process.env.APP_URL}/mom_status/${id[1]}/${id[0]}`;

    try {
        const apiResponse = await axios.get(url, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
        });

        if(apiResponse.status == 200){
            return true;
        }
        else {
            return false;
        }
    } catch (error) {
        return false
    }
}

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
            sendCallbackApp(req.body.id);
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
            sendCallbackApp(req.body.id);
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
    console.log([
        "App Running",
        "port : "+ process.env.PORT,
        "user : "+ process.env.API_USER,
        'password : '+ process.env.API_PASSWORD
    ])
    
})
