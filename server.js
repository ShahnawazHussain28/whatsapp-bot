const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js')
const request = require("request")
const translate = require('translate-google')
const lang = require("translate-google/languages")
const qrcode = require('qrcode-terminal')
const fs = require('fs')
const ytdl = require('ytdl-core')
const math = require("mathjs")
const path = require("path")
const express = require("express")
const app = express()
const server = app.listen(process.env.PORT || 5000, () => console.log("Listening at port: "+5000))
const io = require("socket.io")(server)
const google = require("googlethis")
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')));


const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true }
});

client.initialize();
let authenticated = false;

io.on("connection", (socket) => {
    console.log("Socket Connected");
    socket.emit("msg", "Socket connected");
    if(authenticated) {
        socket.emit("msg", "Already Authenticated");
    }
    client.on('qr', (qr) => {
        // NOTE: This event will not be fired if a session is specified.
        qrcode.generate(qr);
        socket.emit("qr", qr);
        socket.emit("msg", "QR Received. Please scan");
        // console.log("QR Generated\n"+qr)
    });
    
    client.on('authenticated', () => {
        socket.emit("msg", "User Authenticated...");
        console.log('AUTHENTICATED');
    });
    
    client.on('auth_failure', msg => {
        // Fired if session restore was unsuccessful
        socket.emit("msg", "Authentication Failed!");
        console.error('AUTHENTICATION FAILURE', msg);
    });
    
    client.on('ready', () => {
        socket.emit("msg", "All Set, Server Ready ☺");
        authenticated = true;
        console.log('READY');
    });
})

const HELP_MSG = 
`Hi I am a WhatsApp Bot
Created by *Shahnawaz*

      What I can do?

*Search Google:*
_Google._ Your query here

*General Search:*
_Search._ Your query here
_Duckduckgo._ Your query here

*WH Questions:*
Who is Stephen Hawkins

*Get Image:*
_5 image._ Lion
_4 image._ Stephen Hawkins
_image._ sparrow

*Translation:*
_Trans._ como estas
_Trans. to spanish how are you

*Calculation:*
_Calc._ 42+38[96/(12^2)]
_Calc._ d/dx 4x^3 + sin(x)
_Calc._ if x=2,y=3 then x^2+y`;

client.on('message', (msg) => {
    if (msg.type != 'chat') return;
    let query = msg.body.toLowerCase()
    console.log(query)
    if(query == 'help' || query == 'hi' || query == 'hello'){
        client.sendMessage(msg.id.remote, HELP_MSG);
        return;
    }
    if (query.substring(0, 7) == 'google.') {
        console.log("GOOGLE")
        query = query.substring(7)
        searchGoogle(query, msg.id.remote)
    } else if (query.substring(0, 7) == 'search.' || msg.body.replace(0, 11) == 'duckduckgo.'){
        console.log("DUCK DUCK GO")
        query = query.replace(/(search.)|(duckduckgo.)/g, '')
        searchDuckDuckGo(query, msg.id.remote)
    } else if(query.substring(0, 6) == 'trans.'){
        console.log("TRANSLATION")
        query = query.substring(6);
        translateText(query, msg.id.remote);
    } else if (query.match(/\d* image./)){
        console.log("IMAGE SEARCH")
        let fPhrase = query.match(/\d* image./).join(' ')
        let count = +fPhrase.match(/\d*/).join(' ')
        query = query.replace(fPhrase, '')
        searchImage(query, count, msg.id.remote)
    } else if(query.substring(0, 5) == 'song.') {
        console.log("MUSIC SEARCH")
        query = query.substring(5);
        sendMusicLink(query, msg.id.remote);
    } else if (query.substring(0, 5) == 'calc.'){
        query = query.substring(5)
        console.log("CALCULATOR")
        calculate(query, msg.id.remote)
    } else if (query.match(/(what)|(who)|(when)|(how)|(where)/g)){
        console.log("WHAT IS")
        searchGoogle(msg.body, msg.id.remote);
    }
    
})

function searchGoogle(query, id){
    let reply = "";
    google.search(query).then(res => {
        reply += `*${res.results[0].title}* \n \n`;
        reply += `${res.results[0].description} \n \n`;
        reply += `Read more: ${res.results[0].url}`;
        client.sendMessage(id, reply);
        reply = `Didn't get your answer? \nclick here: www.google.com/search?q=${encodeURI(query)}`;
        client.sendMessage(id, reply);
    }).catch(e => {
        console.log(e)
        reply = "There was an *Error* \n Try again after some time";
        client.sendMessage(id, reply);
    })
}
function searchDuckDuckGo(query, id) {
    let reply = "";
    request({
        url: `https://api.duckduckgo.com/?q=${encodeURI(query)}&format=json`,
        json: true
    }, (err, response, body) => {
        if(err){
            reply = "There was an *Error* \n Wait while I search on Google";
            client.sendMessage(id, reply);
            searchGoogle(query, id);
            return;
        }
        if(body.AbstractText != "") {
            reply = "";
            if(body.Heading != "") reply += `*${body.Heading}* \n \n`;
            reply += `${body.AbstractText} \n \n`;
            if(body.AbstractURL != "") reply += `Read more: ${body.AbstractURL}`;
            client.sendMessage(id, reply);
            reply = `Didn't get your answer? \nclick here: www.google.com/search?q=${encodeURI(query)}`;
            client.sendMessage(id, reply);
        } else {
            searchGoogle(query, id);
        }
    });
}
async function searchImage(query, count, id){
    client.sendMessage(id, "Searching for images...");
    google.image(query).then(async (results) => {
        for(let i = 0; i < Math.min(count, 30); i++){
            const media = await MessageMedia.fromUrl(results[i].url, {unsafeMime : true});
            client.sendMessage(id, media)
        }
    }).catch(e => {
        client.sendMessage(id, "Some Error Occured");
    })
}
function translateText(query, id){
    let words = query.split(' ');
    let fromIdx = words.indexOf('from');
    let toIdx = words.indexOf('to');
    let from = "auto", to = "en";
    if(fromIdx != -1 && fromIdx < words.length-1) {
        let fromWord = words[fromIdx+1];
        for (let key in lang) {
            if(lang[key].toLocaleLowerCase() == fromWord){
                from = key;
                break;
            }
        }
    }
    if(toIdx != -1 && toIdx < words.length-1) {
        let toWord = words[toIdx+1];
        for (let key in lang) {
            if(lang[key].toLocaleLowerCase() == toWord){
                to = key;
                break;
            }
        }
    }
    if(fromIdx != -1) {words.splice(fromIdx, 2)}
    if(toIdx != -1) {words.splice(toIdx, 2)}
    query = words.join(' ');
    translate(query, {from: from, to: to}).then(res => {
        client.sendMessage(id, res);
    }).catch(err => {
        client.sendMessage(id, "There was an Error");
        console.error(err)
    })
}

function calculate(query, id){
    let qu = query.replace(/\s+/g, '').trim();
    let matched;
    try {
        if(qu.substring(0, 4) == 'd/dx'){
            qu = qu.replace('d/dx', '')
            qu = math.parse(qu)
            wrt = math.parse('x')
            let ans = math.derivative(qu, wrt).toString()
            client.sendMessage(id, `The answer is \n*${ans}*`)
        } else if (matched = qu.match(/if|then|\w=\d,?/g)){
            let values = {};
            matched.forEach(e => {
                if(e.match(/\w=\d/g)) {
                    let groups = /(\w).(\d)/g.exec(e)
                    values[groups[1]] = groups[2]
                }
                qu = qu.replace(e, '')
            });
            qu = qu.replace(/[\,\=|and|\?]/g, '');
            let ans = math.evaluate(qu, values).toString()
            client.sendMessage(id, `The answer is \n*${ans}*`)
        } else {
            let ans = math.evaluate(qu.replace(/[a-z]/g, ''))
            client.sendMessage(id, `The answer is \n*${ans}*`)
        }
    } catch (error) {
        client.sendMessage(id, "Cannot recognise your Problem. Searching on Google...");
        searchGoogle(qu, id)
    }
}

async function sendMusicLink(query, id){
    let reply = "";
    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${query}&type=video&key=${process.env.YT_DATA_API_KEY}`
    request({
        url,
        json: true
    }, async (err, response, body) => {
        if(err || body.error){
            reply = "There was an *Error*";
            client.sendMessage(id, reply);
            return;
        }
        let videoID = body.items[0].id.videoId;
        try{
            let ytLink = `http://www.youtube.com/watch?v=${videoID}`;
            let res = await ytdl.getBasicInfo(ytLink)
            let title = res.videoDetails.title;
            let artist = res.videoDetails.author.name;
            reply = `*${title}*\nBy ${artist}\n\n${ytLink}`;
        } catch (e) {
            reply = "There was an *Error*";
            client.sendMessage(id, reply);
        }
    })
}

async function downloadSong(query, id){
    const outputpath = 'files/';
    const format = '.mp3';
    let reply = "";
    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${query}&type=video&key=${process.env.YT_DATA_API_KEY}`
    request({
        url,
        json: true
    }, async (err, response, body) => {
        if(err || body.error){
            reply = "There was an *Error*";
            client.sendMessage(id, reply);
            return;
        }
        let videoID = body.items[0].id.videoId;
        try{
            let ytLink = `http://www.youtube.com/watch?v=${videoID}`;
            let res = await ytdl.getBasicInfo(ytLink)
            let fileName = res.videoDetails.title.substring(0, 70).replace(/\s/g, '_')
            let filepath = outputpath + fileName + format;
            let title = res.videoDetails.title;
            let artist = res.videoDetails.author.name;
            const video = ytdl(ytLink,{ quality: 'highestaudio', format: 'mp3' });
            video.pipe(fs.createWriteStream(filepath))
            video.on('end', () => {
                let audMedia = MessageMedia.fromFilePath(filepath.replace(/\\/g, '/'));
                sendMusic(audMedia, id, title, artist, ytLink);
            })
        } catch (e) {
            console.log(e.message)
        }
    })
}

async function sendMusic(messageMedia, id, title, artist, ytLink){
    console.log(typeof messageMedia)
    await client.sendMessage(id, messageMedia);
    let reply = `${title} \nBy ${artist} \n\nWatch on YouTube: ${ytLink}`;
    client.sendMessage(id, reply);
    fs.unlink(filepath);
}