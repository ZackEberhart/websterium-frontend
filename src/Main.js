import React from 'react';
import Magnifier from "react-magnifier";
import UIfx from 'uifx'; 
import './Main.css';
import notificationSound from './assets/message.mp3';
import correctSound from './assets/correct.wav';
import guessSound from './assets/guess.wav';
import upnextSound from './assets/upnext.wav';
import wrongSound from './assets/wrong.wav';
import cawSound from './assets/crow.mp3';
import victory1Sound from './assets/victory1.mp3';
import victory2Sound from './assets/victory2.mp3';
import victory3Sound from './assets/victory3.mp3';
import victory4Sound from './assets/victory4.mp3';
import victory5Sound from './assets/victory5.mp3';
import defeat1Sound from './assets/defeat1.mp3';
import defeat2Sound from './assets/defeat2.mp3';
import defeat3Sound from './assets/defeat3.mp3';
import defeat4Sound from './assets/defeat4.mp3';
import { config } from './Config.js'
import { IconContext } from "react-icons";
import { FaGhost, FaHome, FaEye, FaHammer, FaUserNinja} from "react-icons/fa";

const notification = new UIfx(notificationSound, {volume: 0.3});
const correct = new UIfx(correctSound, {volume: 1.0});
const guess = new UIfx(guessSound, {volume: 1.0});
const upnext = new UIfx(upnextSound, {volume: 1.0});
const wrong = new UIfx(wrongSound, {volume: 0.5,});
const caw = new UIfx(cawSound, {volume: 0.15,});
const victory1 = new UIfx(victory1Sound, {volume: 0.3,});
const victory2 = new UIfx(victory2Sound, {volume: 0.3,});
const victory3 = new UIfx(victory3Sound, {volume: 0.3,});
const victory4 = new UIfx(victory4Sound, {volume: 0.3,});
const victory5 = new UIfx(victory5Sound, {volume: 0.3,});
const defeat1 = new UIfx(defeat1Sound, {volume: 0.4,});
const defeat2 = new UIfx(defeat2Sound, {volume: 0.4,});
const defeat3 = new UIfx(defeat3Sound, {volume: 0.4,});
const defeat4 = new UIfx(defeat4Sound, {volume: 0.4,});

export default class Main extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            chatlog:[],
            chatOpen:false,
            chatMsg:"",

            ws: null,
            client_id: null,
            username:"",
            roomname:"default",
            users:{},
            joined:false,
            started:false,
            game_over:false,
            loading:false,

            image_sources:["65X9xYV", "J85fFat", "fMC79b8", "mtzum"],
            num_ravens:3,
            num_rounds:7,
            num_extra_cards:3,

            image_links:{},
            cards:{},
            stories: [],

            current_round:1,
            ravens:3,
            psychics:[],
            psychic_names:{},
            ghost:{"hand":[], 'psychics_clued':[]},

            selected:[],
            selected_psychic:0,
            selected_dream:null,
            selected_card:null,
            selected_stage:0,
        };
    }

    componentDidMount = () => {
        this.connect()
    }

//////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////Connection/////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////

    timeout = 250; 

    connect = () => {
        var ws = new WebSocket(config.url.API_URL);
        let that = this; // cache the this
        var connectInterval;

        // websocket onopen event listener
        ws.onopen = () => {
            console.log("connected websocket main component");
            this.setState({ ws: ws });
            that.timeout = 250; // reset timer to 250 on open of websocket connection 
            clearTimeout(connectInterval); // clear Interval on open of websocket connection
        };

        ws.onmessage = evt => {
            var data = JSON.parse(evt.data)
            const message = data["message"]
            if(data["type"] === "user_list"){
                this.updateUsers(message)
            }else if(data['type'] === "join"){
                this.join(message)
            }else if(data['type'] === "game_interrupted"){
                this.gameInterrupted()
            }else if(data['type'] === "client_id"){
                /*Super messy -- needs to allow changing in lobby, 
                * Pychics to have their IDs decrease,
                * And ghost to be changed to psychic at start of game
                * (in the event that the ghost role got taken while not in lobby during game_over)
                */
                if(!this.state.started || (this.state.client_id ==="ghost" && !this.state.game_over) || (this.state.client_id !=="ghost" && message<this.state.client_id)){
                    this.setState({'client_id': message})
                }
            }else if (data['type'] === "loading"){
                 this.setState({loading:message})
            }else if(data['type'] === "image_links"){
                 this.setState({'image_links': message})
            }else if(data['type'] === "stories"){
                 this.setState({'stories': message})
            }else if(data['type'] === "state"){
                 this.updateState(message)
            }else if(data['type'] === "start"){
                if(this.state.client_id !== "ghost"){
                    this.setState({'selected_psychic': parseInt(this.state.client_id)})
                }
                this.startGame(message)
            }else if(data['type'] === "chat_message"){
                 this.handleChatMessage(message)
            }else if(data['type'] === "reject"){
                 this.handleRejection(message)
            }else{
            }
        }

        ws.onclose = e => {
            console.log(
                `Socket is closed. Reconnect will be attempted in ${Math.min(
                    10000 / 1000,
                    (that.timeout + that.timeout) / 1000
                )} second.`,
                e.reason
            );
            that.timeout = that.timeout + that.timeout; //increment retry interval
            connectInterval = setTimeout(this.check, Math.min(10000, that.timeout)); //call check function after timeout
        };

        ws.onerror = err => {
            console.error(
                "Socket encountered error: ",
                err.message,
                "Closing socket"
            );
            ws.close();
        };
    }

    check = () => {
        const { ws } = this.state;
        if (!ws || ws.readyState === WebSocket.CLOSED) this.connect(); //check if websocket instance is closed, if so call `connect` function.
    }

    send = (mtype, data) => {
        if(this.state.ws){
            var message = JSON.stringify({"type": mtype, "message": data});
            this.state.ws.send(message);
        }else{
            console.log("Websocket not connected.")
        }
    }

//////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////Funcs/////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////

    updateUsers = (message) =>{
        var psychic_names = {}
        var ghost_included = false
        for(var user_id in message){
            if(message[user_id]["pid"] >= 0){
                psychic_names[message[user_id]["pid"]] = message[user_id]["name"]
            }else{
                ghost_included = true
            }
        }
        this.setState({users: message, psychic_names:psychic_names})
    }
    
    join = (message) =>{
        this.setState(state=>{
            // var log = state.chatlog
            // var msg = {"user": "system", 'text': "Joined room "+message, 'type':"system", }
            // log.unshift(msg)
            return({
                // chatlog:log,
                joined: true, roomname:message
            })
        })
    }

    sendStart = () =>{
        this.send('startGame', this.state.image_sources);
    }

    startGame = (message) =>{
        /* Attempting to preload images, not working properly
        * Probably because images are too large, literally can't preload em all.
        * Though I wonder if we could add something here to force it to wait for them to successfully load...
        * But that would cause loooong loading times. 
        * Maybe start by preloading just the first set of characters and dreams?
        */
        // for(let key in this.state.image_links['dreams']){
        //     var img=new Image();
        //     img.src=this.state.image_links['dreams'][key];
        // }
        // for(let card_links of this.state.image_links['cards']){
        //     for(let key in card_links){
        //         var img=new Image();
        //         img.src=card_links[key];
        //     }                
        // }
        this.setState({
            started: true,
            selected:[],
            ravens:3,
            selected_dream:null,
            selected_stage:0,
            cards: message,
            game_over:false
        })
        if(this.state.client_id === "ghost"){
            this.setState({
                selected_card: this.state.stories[0][0],
                selected_psychic:0
            })
        }else{
            this.setState({
                selected_card: this.state.cards["suspects"][0],
                selected_psychic:this.state.client_id,
            })
        }
    }

    gameInterrupted = () =>{
        if(this.state.client_id === "ghost"){
           this.systemMessage("All psychics disconnected.")
        }else{
           this.systemMessage("Ghost disconnected.")
        }
        wrong.play(1.0)
        this.leaveGame()
    }

    leaveGame = () =>{
        this.setState({started:false}) 
    }

    leaveRoom = () =>{
        this.send('leave', "leave")
        this.setState({joined: false})
    }

    updateState = (message) =>{
        //If it's a new round, correctly re-render view and play noises
        if(this.isNewRound(message)){
            if(this.wasCorrect(message, this.state.selected_psychic)){
                this.setState({
                    selected_stage: message['psychics'][this.state.selected_psychic]['stage'],
                })
                if(this.state.client_id === "ghost"){
                    this.setState({
                        selected_card: this.state.stories[this.state.selected_psychic][message['psychics'][this.state.selected_psychic]['stage']],
                    })
                }else{
                    const cardtype = this.state.selected_stage === 0 ? "suspects" : (this.state.selected_stage === 1 ? "places" : "things")
                    this.setState({
                        selected_card: this.state.cards[cardtype][0],
                        selected_dream: null,
                    })
                }
            }
            if(message["status"] == "won"){
                this.setState({'game_over': true})
                var r = Math.floor(Math.random() * 5);
                switch(r) {
                    case 0:
                        victory1.play(1.0)
                        break;
                    case 1:
                        victory2.play(1.0)
                        break;
                    case 2:
                        victory3.play(1.0)
                        break;
                    case 3:
                        victory4.play(1.0)
                        break;
                    case 4:
                        victory5.play(1.0)
                        break;
                }
                this.systemMessage("You win!")
            }else if(message["status"] == "lost"){ 
                this.setState({'game_over': true})
                var r = Math.floor(Math.random() * 4);
                switch(r) {
                    case 0:
                        defeat1.play(1.0)
                        break;
                    case 1:
                        defeat2.play(1.0)
                        break;
                    case 2:
                        defeat3.play(1.0)
                        break;
                    case 3:
                        defeat4.play(1.0)
                        break;
                }
                this.systemMessage("You lose!")
            }else if(this.state.client_id === "ghost"){
                upnext.play(1.0)
            }else{
                if(this.wasCorrect(message, this.state.client_id)){
                    correct.play(1.0)
                    this.systemMessage("You were... coOrRecTt!")
                }else if(this.state.psychics[this.state.client_id]['stage']<=2){
                    wrong.play(1.0)
                    this.systemMessage("You were... wrooOoOong!")
                }
            }
        //if the client has been clued, play the upnext noise
        }else if(this.clientClued(message)){
            upnext.play(1.0)
        }
        if(this.state.selected_psychic >= Object.keys(message["psychics"]).length){
            this.setState({
                selected_stage: this.state.psychics[0]['stage'],
                selected_card:this.state.psychics[0]['current_guess'],
                selected_dream:null,
                selected_psychic:0
            })
        }
        this.setState({
            psychics: message["psychics"],
            ghost: message["ghost"],
            ravens:message["ravens"],
            current_round: message['current_round']
        })
    }

    handleRejection = (message) =>{
        alert(message)
        this.setState({loading:false})
    }

    sendDreams = (psychic) =>{
        const message = {"psychic": psychic, "dreams": this.state.selected}
        this.send('sendDreams', message)
        this.setState({
            selected:[],
            selected_dream:null
        })
    }

    useRaven = () =>{
        if(this.state.selected.length>0){
            const message = {"dreams": this.state.selected}
            this.send('useRaven', message)
            this.setState(state => {
                return({
                    selected:[],
                    selected_dream:null,
                })
            })
        }else{
            alert("You must select cards to redraw.")
        }
    }

    sendChatMessage = (message) =>{
        const chatMessage = {"text":message}
        this.send('chatMessage', chatMessage)
        this.setState({chatMsg:""})
    }

    handleChatMessage = (message) =>{
        if(message["text"].includes("CAW CAW!")){
            caw.play(1.0)
        }
        else{
            notification.play(1.0)
        }
        this.setState(state=>{
            var log = state.chatlog
            var msg = {"user": message["user"], "text":message["text"], "type":message["type"]}
            log.unshift(msg)
            return({
                chatlog:log,
            })
        })
    }

    systemMessage = (message) =>{
        this.setState(state=>{
            var log = state.chatlog
            var msg = {"user": "system", 'text': message, 'type':"system", }
            log.unshift(msg)
            return({
                chatlog:log,
            })
        })
    }

    makeGuess = (card) =>{
        const message = {"psychic": this.state.client_id, "guess": card}
        this.send('makeGuess', message)
        guess.play(1.0)
    }

    isNewRound = (newState) =>{
        return this.state['current_round'] !== newState['current_round']
    }

    clientClued = (newState) =>{
        return(!this.state.ghost['psychics_clued'].includes(this.state.client_id) && newState['ghost']['psychics_clued'].includes(this.state.client_id))
    }

    wasCorrect = (newState, psychic) =>{
        if(psychic === "ghost" || newState['current_round'] === 1){
            return false;
        }else{
            return newState['psychics'][psychic]['stage'] !== this.state['psychics'][psychic]['stage']
        }
    }

    getGhostUser = () =>{
        for(var key in this.state.users){
            if(this.state.users[key]['role'] === "Ghost"){
                return this.state.users[key]['name']
            }
        }
        return ""
    }

    getPsychicUsers = () =>{
        var psychics = []
        for(var key in this.state.users){
            if(this.state.users[key]['role'] !== "Ghost"){
                psychics.push(this.state.users[key]['name'])
            }
        }
        return psychics
    }

//////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////Components/////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////Main rooms

    anteroom = () => {
        if(!this.state.joined){
            return(
                <div className="container" style={{justifyContent:"center",alignItems:"center"}}>
                    <h1>Websterium</h1>
                    <div className="nicebox" style={{padding:"20px", fontSize:"1.5em"}}>
                        <div className = "row">
                            Room name: 
                            <input type="text"  value={this.state.roomname}
                                onChange={(evt)=> {const val = evt.target.value; this.setState({roomname:val})}}
                                onKeyPress={(evt)=>{
                                    if(evt.key === 'Enter'){
                                        if(this.state.username.length > 25){
                                            alert("Go for a user name that's <=25 characters long.")
                                        }else{
                                            this.send('join', {"roomname": this.state.roomname, "username":this.state.username})
                                        }
                                    }
                                }}
                            />
                        </div>
                        <br/>
                        <div className = "row">
                            User name: 
                            <input type="text"  
                                value={this.state.username}
                                onChange={(evt)=> {const val = evt.target.value; this.setState({username:val})}}
                                onKeyPress={(evt)=>{
                                    if(evt.key === 'Enter'){
                                        if(this.state.username.length > 25){
                                            alert("Go for a user name that's <=25 characters long.")
                                        }else{
                                            this.send('join', {"roomname": this.state.roomname, "username":this.state.username})
                                        }
                                    }
                                }}
                            />
                        </div>
                        <br/>
                        <div className = "row">
                            <button type="button" 
                                onClick={() => {
                                    if(this.state.username.length > 25){
                                        alert("Go for a user name that's <=25 characters long.")
                                    }else{
                                        this.send('join', {"roomname": this.state.roomname, "username":this.state.username})
                                    }
                                }}
                            >
                                Join room
                            </button>
                        </div>
                    </div>
                </div>
            )
        }else{
            const users = <div style={{flex:1, display:'flex', flexDirection:'column'}}>
                <div style={{backgroundColor:"#791E94", color:"#F7F7F7", padding:"10px"}}>
                    <div className="row" style={{alignItems:"center", justifyContent:"space-around"}}>
                        <IconContext.Provider value={{ size:"2em", color: "white", className: "global-class-name" }}>
                            <div>
                                <FaGhost />
                            </div>
                        </IconContext.Provider>
                        <div style={{textAlign:"center"}}>
                            <h3 style={{margin:'0px'}}>Ghost</h3>
                            <div >
                                {this.getGhostUser()}
                            </div>
                        </div>
                        <IconContext.Provider value={{ size:"2em", color: "white", className: "global-class-name" }}>
                            <div>
                                <FaGhost />
                            </div>
                        </IconContext.Provider>
                    </div>
                </div>
                <div style={{flex:1, backgroundColor:"#41D3BD", padding:"10px"}}>
                    <div className="row" style={{ alignItems:"center", justifyContent:"space-around"}}>
                        <IconContext.Provider value={{ size:"2em", color: "black", className: "global-class-name" }}>
                            <div>
                                <FaEye />
                            </div>
                        </IconContext.Provider>
                        <div style={{textAlign:"center"}}>
                            <h3 style={{margin:'0px'}}>Psychics</h3>
                            <div>
                                {this.getPsychicUsers().map((username, index) => 
                                    <div key={index}>
                                        {username}
                                    </div>
                                )}
                            </div>
                        </div>
                        <IconContext.Provider value={{ size:"2em", color: "black", className: "global-class-name" }}>
                            <div>
                                <FaEye />
                            </div>
                        </IconContext.Provider>
                    </div>
                </div>
            </div>
            return(
                <div className="container">
                    <div className="row" style={{height:"100%", width:"100%"}}>
                        <div style={{display:"flex", flexDirection:"column", flex:1, height:'100%', justifyContent:"center", alignItems:"center"}}>
                            <h2>Room: {this.state.roomname}</h2>
                            <div className = "nicebox" style={{padding:'0px', display:'flex', width:"70%", minWidth:"300px", overflow: 'auto', flex:1}}>
                                {users}
                            </div>
                            <br/>
                            <div className="row" style={{padding:"10px 0px"}}>
                                <button type="button" onClick={() => this.send('setRole', 'ghost')}>
                                    <IconContext.Provider value={{ size:"2em", color: "black", className: "global-class-name" }}>
                                        <div>
                                            <FaGhost />
                                        </div>
                                    </IconContext.Provider>
                                </button>
                                <h3 style={{padding:"0px 5px"}}>Select role</h3>
                                <button type="button" onClick={() => this.send('setRole', 'psychic')}>
                                    <IconContext.Provider value={{ size:"2em", color: "black", className: "global-class-name" }}>
                                        <div>
                                            <FaEye />
                                        </div>
                                    </IconContext.Provider>
                                </button>
                            </div>
                            <div className = "row">
                                <button type="button" onClick={this.sendStart }>Start game</button>
                                <button type="button" onClick={this.leaveRoom}>Leave room</button>
                            </div>
                            <br/>
                            <div className = "nicebox" style={{display:"flex", padding:"10px"}}>
                                {false && <div style={{flex:1}}>
                                    <h4 style={{margin:"0px 0px 10px 0px"}}>
                                        Options 
                                    </h4>
                                    Presets
                                    <select onChange={(evt) => {const val = evt.target.value; this.setState({num_rounds: val})}}>
                                        {[5,6,7,8,9,10].map(x=>{return(
                                            <option value={x}>{x}</option>
                                            )
                                        })}
                                    </select>
                                    <hr/>
                                    <table>
                                        <tr>
                                            <td>
                                                <select style={{width:"100%"}} onChange={(evt) => {const val = evt.target.value; this.setState({num_rounds: val})}}>
                                                    {[5,6,7,8,9,10].map(x=>{return(
                                                        <option value={x}>{x}</option>
                                                        )
                                                    })}
                                                </select>
                                            </td>
                                            <td>
                                                #Rounds
                                            </td>
                                        </tr>
                                        <tr>
                                            
                                            <td>
                                                <select style={{width:"100%"}} onChange={(evt) => {const val = evt.target.value; this.setState({num_rounds: val})}}>
                                                    {[0, 1, 2, 3, "Unlimited"].map(x=>{return(
                                                        <option value={x}>{x}</option>
                                                        )
                                                    })}
                                                </select>
                                            </td>
                                            <td>
                                                #Ravens
                                            </td>
                                        </tr>
                                        <tr>
                                            
                                            <td>
                                                <select style={{width:"100%"}} onChange={(evt) => {const val = evt.target.value; this.setState({num_rounds: val})}}>
                                                    {[5,6,7,8,9,10].map(x=>{return(
                                                        <option value={x}>{x}</option>
                                                        )
                                                    })}
                                                </select>
                                            </td>
                                            <td>
                                                #Dreams in ghost hand
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <select style={{width:"100%"}} onChange={(evt) => {const val = evt.target.value; this.setState({num_rounds: val})}}>
                                                    {[1,2,3,4,5].map(x=>{return(
                                                        <option value={x}>{x}</option>
                                                        )
                                                    })}
                                                </select>
                                            </td>
                                            <td>
                                                #Options in each stage
                                                <br/>
                                                (#Psychics + x)
                                            </td>
                                        </tr>
                                    </table>      
                                </div>}
                                <div style={{flex:2}}>
                                    <h4 style={{margin:"0px 0px 10px 0px"}}>
                                        Image sources 
                                        <span style={{fontWeight:"normal", fontSize:".8em"}}> (Select options or paste custom Imgur album IDs. Choices will only apply if *you* start the game.)</span>
                                    </h4>
                                    <table style={{width:"100%"}}>
                                        <tr>
                                            <td>
                                                Dream source
                                            </td>
                                            <td>
                                                <select onChange={(evt) => {const val = evt.target.value; this.setState((state)=>{state.image_sources[0] = val; return(state)})}}>
                                                    <option value="vdLZg">Creepy Art</option>
                                                    <option value="oGo8Vup">Cursed Images</option>
                                                    <option value="65X9xYV" selected>Mysterium</option>
                                                    <option value="Tf4Nc">Simpsons Gifs</option>
                                                    <option value="B9ukS">Surreal Art</option>
                                                    <option value="yGUC9">Weird Gifs</option>
                                                </select>
                                            </td>
                                            <td>
                                                <input type="text" value={this.state.image_sources[0]} 
                                                    onChange={(evt)=> {const val = evt.target.value; this.setState((state)=>{state.image_sources[0] = val; return(state)})}}
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>
                                                Suspect source
                                            </td>
                                            <td>
                                                <select onChange={(evt) => {const val = evt.target.value; this.setState((state)=>{state.image_sources[1] = val; return(state)})}}>
                                                    <option value="NEoYMSr">Cursed Toys</option>
                                                    <option value="WJ0gR">Jojo Stands</option>
                                                    <option value="7d3zQ">Meme Team c. 2010</option>
                                                    <option value="ageiv">Misc. Characters</option>
                                                    <option value="J85fFat" selected>Mysterium</option>
                                                    <option value="W6FgJ">Overwatch (?)</option>
                                                    <option value="hNU02">Pokemon (Realistic)</option>
                                                    <option value="GF5ScJI">Psychedelic Portraits</option>
                                                    <option value="aZClIlk">Smash Bros.</option>
                                                    <option value="g0pzP">Snakes in Hats</option>
                                                    <option value="4W4YZ">TF2</option>
                                                    <option value="HpoSd">U.S. Presidents</option>
                                                </select>
                                            </td>
                                            <td>
                                                <input type="text" value={this.state.image_sources[1]} 
                                                    onChange={(evt)=> {const val = evt.target.value; this.setState((state)=>{state.image_sources[1] = val; return(state)})}}
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>
                                                Place source
                                            </td>
                                            <td>
                                                <select onChange={(evt) => {const val = evt.target.value; this.setState((state)=>{state.image_sources[2] = val; return(state)})}}>
                                                    <option value="VoCv2">Creepy Places 1</option>
                                                    <option value="MA55k">Creepy Places 2</option>
                                                    <option value="nZv1Czp">Environmental Storytelling</option>
                                                    <option value="9JUQg">Fighting Game Stages</option>
                                                    <option value="fMC79b8" selected>Mysterium</option>
                                                    <option value="jhxPqxh">Smash Bros. Stages</option>
                                                    <option value="RqkUd8g">Toilets</option>
                                                </select>
                                            </td>
                                            <td>
                                                <input type="text" value={this.state.image_sources[2]} 
                                                    onChange={(evt)=> {const val = evt.target.value; this.setState((state)=>{state.image_sources[2] = val; return(state)})}}
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>
                                                Weapon source
                                            </td>
                                            <td>
                                                <select onChange={(evt) => {const val = evt.target.value; this.setState((state)=>{state.image_sources[3] = val; return(state)})}}>
                                                    <option value="VyAWb">Accidents</option>
                                                    <option value="Cyqqv">Beans in Things</option>
                                                    <option value="mtzum">Bizarro World Items</option>
                                                    <option value="dzppwsZ">Household Spaceships</option>
                                                    <option value="Vpiu5It" selected>Mysterium</option>
                                                    <option value="RXFfv">Prison Inventions</option>
                                                </select>
                                            </td>
                                            <td>
                                                <input type="text" value={this.state.image_sources[3]} 
                                                    onChange={(evt)=> {const val = evt.target.value; this.setState((state)=>{state.image_sources[3] = val; return(state)})}}
                                                />
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <div style={{width:"17vw", minWidth:"150px", height:'100%', padding:'5px', boxSizing:'border-box',}}>
                            <div className="nicebox" style={{width:'100%', overflow:'auto', height:'100%', display:'flex', flexDirection:"column", alignItems:"center"}}>
                                {this.chatbox()}
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
    }

    gameroom = () => {
        const cardtype = this.state.selected_stage === 0 ? "suspects" : (this.state.selected_stage === 1 ? "places" : "things")
        const mainDisplay = this.state.selected_stage < 3 ? (
            <div className = "row" style={{overflow:'visible', minHeight: 0, flex:1}}>
                <div className="nicebox" style={{minHeight: 0, flex:2, overflow:'auto', boxSizing:"border-box",margin:'3px', padding:'3px', display:'flex', alignItems:'center', justifyContent:"center"}}>
                    {this.selecteddream()}
                </div>
                <div className="nicebox" style={{minHeight: 0, flex:2, overflow:'auto', boxSizing:"border-box",margin:'3px', padding:'3px', display:'flex', alignItems:'center', justifyContent:"center"}}>
                    {this.selectedcard()}
                </div>
            </div>
        ):(
            <div style={{overflow:'visible', minHeight: 0, flex:1}}>
                <div className="nicebox" style={{minHeight: 0, flex:2, flexDirection:"column", overflow:'auto', margin:'3px', padding:'3px', display:'flex', alignItems:'center', justifyContent:"center"}}>
                    <div className="row">
                        <div style={{width:"33%", padding:"3px", boxSizing:"border-box", textAlign:"center"}}>
                            <IconContext.Provider value={{ size:"3em", color:"black", className: "global-class-name" }}>
                                <div>
                                    <FaUserNinja />
                                </div>
                            </IconContext.Provider>
                            <br/>
                            <img 
                                alt="Confirmed Suspect"
                                style={{maxHeight:"70%", maxWidth:"100%", objectFit: "contain"}}
                                src={this.state.image_links['cards'][0][this.state.psychics[this.state.selected_psychic]["story"][0]]}
                            /> 
                        </div>
                        <div style={{width:"33%", padding:"3px", boxSizing:"border-box", textAlign:"center"}}>
                            <IconContext.Provider value={{ size:"3em", color:"black", className: "global-class-name" }}>
                                <div>
                                    <FaHome />
                                </div>
                            </IconContext.Provider>
                            <br/>
                            <img 
                                alt="Confirmed Place"
                                style={{maxHeight:"70%", maxWidth:"100%", objectFit: "contain"}}
                                src={this.state.image_links['cards'][1][this.state.psychics[this.state.selected_psychic]["story"][1]]}
                            />
                        </div>
                        <div style={{width:"33%", padding:"3px", boxSizing:"border-box", textAlign:"center"}}>
                            <IconContext.Provider value={{ size:"3em", color:"black", className: "global-class-name" }}>
                                <div>
                                    <FaHammer />
                                </div>
                            </IconContext.Provider>
                            <br/>
                            <img 
                                alt="Confirmed Thing"
                                style={{maxHeight:"70%", maxWidth:"100%", objectFit: "contain"}}
                                src={this.state.image_links['cards'][2][this.state.psychics[this.state.selected_psychic]["story"][2]]}
                            />
                        </div>
                    </div>
                    {this.state.game_over && 
                        <div className="row">
                            <button 
                                type="button" 
                                onClick={()=>{this.leaveGame()}}
                            >
                                Return to Lobby
                            </button>
                        </div>
                    }
                </div>
            </div>
        )
        const visibleCards = this.state.selected_stage < 3 ? (
            <div style={{flex:'0 1 auto'}}> 
                <h3>{cardtype}</h3>
                <div className="nicebox">
                    {this.allcards()}
                </div>
            </div>
        ):(
            <div style={{flex:'0 1 auto'}}> 
                <div className="nicebox">
                </div>
            </div>
        )

        return(
            <div className="container">
                <div className = "row" style={{height:'100%'}}>
                    <div style={{width:"17vw", minWidth:"150px", height:'100%', padding:'5px', boxSizing:'border-box',}}>
                        <div className="nicebox" style={{width:'100%', overflow:'auto', height:'100%', display:'flex', flexDirection:"column", alignItems:"center"}}>
                            {this.mainhand()}
                        </div>
                    </div>
                    <div style={{flex:1, height:'100%', display:'flex', flexDirection:"column", padding:'5px',  boxSizing:'border-box'}}>
                        <div className = "row" style={{overflow:'auto', flex:'0 1 auto'}}>
                            {this.allpsychics()}
                        </div>
                        {mainDisplay}
                        {visibleCards}
                    </div>
                    <div style={{width:"17vw", minWidth:"150px", height:'100%', padding:'5px', boxSizing:'border-box',}}>
                        <div className="nicebox" style={{width:'100%', overflow:'auto', height:'100%', display:'flex', flexDirection:"column", alignItems:"center"}}>
                            {this.chatbox()}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

///////////////////////////////////Chat

    chatbox = () =>{
        var chatBox = (this.state.started && this.state.client_id==="ghost")?
            <div>
                <div style={{fontSize:"2em", width:"100%", display:"flex", padding:"20px 0px", justifyContent:"space-around", flexDirection:"row"}}>
                    <button 
                        type="button" 
                        onClick={()=>{this.sendChatMessage("👅")}}
                    >
                        👅
                    </button>
                    <button 
                        type="button" 
                        onClick={()=>{this.sendChatMessage("🧠")}}
                    >
                        🧠
                    </button>
                    <button 
                        type="button" 
                        onClick={()=>{this.sendChatMessage("👂")}}
                    >
                        👂
                    </button>
                    <button 
                        type="button" 
                        onClick={()=>{this.sendChatMessage("👀")}}
                    >
                        👀 
                    </button>
                    <button 
                        type="button" 
                        onClick={()=>{this.sendChatMessage("👃")}}
                    >
                        👃
                    </button>
                </div>
            </div>
        :   
            <div style={{maxHeight:"50%", width:"100%"}}>
                <div style={{height:"80px", width:"100%"}}>
                    <textarea  
                        autoFocus
                        style={{height:"100%", width:"100%", boxSizing:"border-box", resize:"none"}}
                        value={this.state.chatMsg}
                        onChange={(evt)=> {const val = evt.target.value; this.setState({chatMsg:val})}}
                        onKeyPress={(evt)=>{
                            if(evt.key === 'Enter'){
                                evt.preventDefault();
                                this.sendChatMessage(this.state.chatMsg);
                            }
                        }}
                    />
                </div>
                <button 
                    type="button" 
                    style={{width:"100%"}}
                    onClick={()=>{this.sendChatMessage(this.state.chatMsg)}}
                    disabled={this.state.chatMsg.length===0}
                >
                    Send
                </button>
            </div>

        return(
            <div 
                style={{width:"100%", height:"100%", backgroundColor:"white", display:"flex", flexDirection:"column"}}
            >
                <h3 style={{textAlign:"center"}}> Chat </h3>
                <div style={{padding:"2px", flex:'1',  overflowWrap: "break-word", boxSizing:"border-box", backgroundColor:"white", minHeight: '0px', width:"100%", overflow:"auto", display:"flex", flexDirection:"column-reverse"}}>
                    {
                        this.state.chatlog.map((message, index) => {
                            var size = (message["type"] == "ghost" ? "2em" : ".8em")
                            if(message["type"] !== "system"){
                                var color = (message["user"] === this.state.username) ? "green" : "black"
                                return(
                                    <div key={index} style={{padding:"3px 0px"}}>
                                        <div style = {{fontSize:".6em", opacity:".5", color:color}}>{message["type"] == "ghost"?message["user"]+"(GHOST)":message["user"]}</div>
                                        <div style = {{fontSize:size, color:color}}>{message["text"]}</div>
                                    </div>
                                )
                            }else{
                                return(
                                    <div key={index} style={{color:"blue", padding:"5px 0px"}}>
                                        {message["text"]}
                                    </div>
                                )
                            }
                        })
                    }
                </div>
                {chatBox}
            </div>
        )
    }

///////////////////////////////////All psychics

    allpsychics = () =>{
        return this.state.client_id === "ghost" ? this.ghostallpsychics() : this.psychicallpsychics()
    }

    psychicallpsychics = () =>{
        const border = this.state.selected_psychic === this.state.client_id ? "dashed" : "solid"
        const bgcolor = this.state.psychics[this.state.client_id].current_guess !== null ? "rgba(65, 211, 189, .4)" : (this.state.ghost['psychics_clued'].includes(parseInt(this.state.client_id))? "rgba(186, 90, 49,.4)" : "transparent")         
        return(
            <div className = "hand" style={{flex:1,  justifyContent:"space-between", height:'100%', overflowX:'auto', "textAlign":'center'}}>
                <div style={{flex:1, textAlign:"left"}}>
                    {this.state.game_over?
                        <h2 style={{margin:"0px"}}>Game over!</h2>
                    :
                        <div>
                            <h3 style={{margin:"0px"}}>Round</h3>
                            <h2 style={{margin:"0px"}}>{this.state.current_round}/7</h2>
                        </div>
                    }
                </div>
                <div className = "hand">
                    <div 
                        className="card"
                        style = {{borderColor:"#41D3BD", backgroundColor:bgcolor, borderStyle:border, display:'flex', flexDirection:"column", alignItems:"stretch", justifyContent:"space-around"}}
                        onClick={()=>{
                            if(this.state.selected_psychic !== this.state.client_id){
                                this.setState({
                                    selected_stage: this.state.psychics[this.state.client_id]['stage'],
                                    selected_card:this.state.psychics[this.state.client_id]['current_guess'],
                                    selected_dream:null,
                                    selected_psychic:parseInt(this.state.client_id)
                                })
                            }
                        }}
                    >
                        <div style={{overflow:"hidden"}}>{this.state.psychic_names[this.state.client_id]}</div>
                        <div className="row" style={{justifyContent:"space-around"}}>
                                <IconContext.Provider value={{ size:"1em", color: this.state.psychics[this.state.client_id].stage===0?"#41D3BD":(this.state.psychics[this.state.client_id].stage>0?"black":"gray"), className: "global-class-name" }}>
                                    <div>
                                        <FaUserNinja />
                                    </div>
                                </IconContext.Provider>
                                <IconContext.Provider value={{ size:"1em", color: this.state.psychics[this.state.client_id].stage===1?"#41D3BD":(this.state.psychics[this.state.client_id].stage>1?"black":"gray"), className: "global-class-name" }}>
                                    <div>
                                        <FaHome />
                                    </div>
                                </IconContext.Provider>
                                <IconContext.Provider value={{ size:"1em", color: this.state.psychics[this.state.client_id].stage===2?"#41D3BD":(this.state.psychics[this.state.client_id].stage>2?"black":"gray"), className: "global-class-name" }}>
                                    <div>
                                        <FaHammer />
                                    </div>
                                </IconContext.Provider>
                            </div>
                    </div>
                    {Object.keys(this.state.psychics).map((psychic_id, index) => {
                        if(parseInt(psychic_id) !== this.state.client_id){
                            const border = this.state.selected_psychic === parseInt(psychic_id) ? "dashed" : "solid";
                            const bgcolor = this.state.psychics[psychic_id].current_guess !== null ? "rgba(65, 211, 189, .4)" : (this.state.ghost['psychics_clued'].includes(parseInt(psychic_id))? "rgba(186, 90, 49,.4)" : "transparent")
                            return(
                                <div 
                                    key={index} 
                                    className="card"
                                    style = {{backgroundColor:bgcolor, borderStyle:border, display:'flex', flexDirection:"column", alignItems:"stretch", justifyContent:"space-around"}}
                                    onClick={()=>{
                                        if(parseInt(psychic_id) !== this.state.selected_psychic){
                                            this.setState({
                                                selected_stage: this.state.psychics[psychic_id]['stage'],
                                                selected_card:this.state.psychics[psychic_id]['current_guess'],
                                                selected_dream:null,
                                                selected_psychic:parseInt(psychic_id)
                                            })
                                        }
                                    }}
                                >
                                    <div style={{overflow:"hidden"}}>{this.state.psychic_names[index]}</div>
                                    <div className="row" style={{justifyContent:"space-around"}}>
                                        <IconContext.Provider value={{ size:"1em", color: this.state.psychics[psychic_id].stage===0?"#41D3BD":(this.state.psychics[psychic_id].stage>0?"black":"gray"), className: "global-class-name" }}>
                                            <div>
                                                <FaUserNinja />
                                            </div>
                                        </IconContext.Provider>
                                        <IconContext.Provider value={{ size:"1em", color: this.state.psychics[psychic_id].stage===1?"#41D3BD":(this.state.psychics[psychic_id].stage>1?"black":"gray"), className: "global-class-name" }}>
                                            <div>
                                                <FaHome />
                                            </div>
                                        </IconContext.Provider>
                                        <IconContext.Provider value={{ size:"1em", color: this.state.psychics[psychic_id].stage===2?"#41D3BD":(this.state.psychics[psychic_id].stage>2?"black":"gray"), className: "global-class-name" }}>
                                            <div>
                                                <FaHammer />
                                            </div>
                                        </IconContext.Provider>
                                    </div>
                                </div>
                            )
                        }
                    })}
                </div>
                <div style={{flex:1, textAlign:'right'}}>
                </div>
            </div>
        )
    }

    ghostallpsychics = () =>{
        return(
            <div className = "hand" style={{flex:1,  justifyContent:"space-between", height:'100%', overflow:'auto', "textAlign":'center'}}>
                <div style={{flex:1, textAlign:"left"}}>
                    {this.state.game_over?
                        <h2 style={{margin:"0px"}}>Game over!</h2>
                    :
                        <div>
                            <h3 style={{margin:"0px"}}>Round</h3>
                            <h2 style={{margin:"0px"}}>{this.state.current_round}/7</h2>
                        </div>
                    }
                </div>
                <div className = "hand">
                    {Object.keys(this.state.psychics).map((psychic_id, index) => {
                        const border = this.state.selected_psychic === parseInt(psychic_id) ? "dashed" : "solid";
                        const bgcolor = this.state.psychics[psychic_id].current_guess !== null ? "rgba(65, 211, 189, .4)" : (this.state.ghost['psychics_clued'].includes(parseInt(psychic_id))? "rgba(186, 90, 49,.4)" : "transparent")
                        return(
                            <div 
                                key={index} 
                                className="card"
                                style = {{backgroundColor:bgcolor, borderStyle:border, display:'flex', flexDirection:"column", alignItems:"stretch", justifyContent:"space-around"}}
                                onClick={()=>{
                                    if(psychic_id !== this.state.selected_psychic){
                                        this.setState({
                                            selected_stage: this.state.psychics[psychic_id]['stage'],
                                            selected_card:this.state.stories[psychic_id][this.state.psychics[psychic_id]['stage']],
                                            selected_psychic:parseInt(psychic_id)
                                        })
                                    }
                                }}
                            >
                                <div style={{overflow:"hidden"}}>{this.state.psychic_names[index]}</div>
                                <div className="row" style={{justifyContent:"space-around"}}>
                                    <IconContext.Provider value={{ size:"1em", color: this.state.psychics[psychic_id].stage === 0?"#41D3BD":(this.state.psychics[psychic_id].stage>0?"black":"gray"), className: "global-class-name" }}>
                                        <div>
                                            <FaUserNinja />
                                        </div>
                                    </IconContext.Provider>
                                    <IconContext.Provider value={{ size:"1em", color: this.state.psychics[psychic_id].stage === 1?"#41D3BD":(this.state.psychics[psychic_id].stage>1?"black":"gray"), className: "global-class-name" }}>
                                        <div>
                                            <FaHome />
                                        </div>
                                    </IconContext.Provider>
                                    <IconContext.Provider value={{ size:"1em", color: this.state.psychics[psychic_id].stage === 2?"#41D3BD":(this.state.psychics[psychic_id].stage>2?"black":"gray"), className: "global-class-name" }}>
                                        <div>
                                            <FaHammer />
                                        </div>
                                    </IconContext.Provider>
                                </div>
                            </div>
                        )
                    })}
                </div>
                <div style={{flex:1, textAlign:'right'}}>
                </div>
            </div>
        )
    }

///////////////////////////////////Main hands

    mainhand = () =>{
        return this.state.client_id === "ghost" ? this.ghosthand() : this.psychichand()
    }

    psychichand = () =>{
        if(this.state.client_id!== null && Object.keys(this.state.psychics).length > parseInt(this.state.client_id)){
            return(
                <div style={{textAlign:'center'}}>
                    <h3>Clues</h3>
                    <div className="hand">
                        {this.state.psychics[this.state.selected_psychic]['hand'].map((card, index) => {
                            const border = card === this.state.selected_dream ? "dashed" : "solid" ;
                            return(
                                <img 
                                    alt="Dream"
                                    width="100px"
                                    height="100px"
                                    src={this.state.image_links['dreams'][card]}
                                    key={index} 
                                    className="card"
                                    style={{borderStyle: border}}
                                    onClick={(event) => {
                                        this.setState({selected_dream:card})
                                    }}
                                />
                            )
                        })}
                     </div>
                 </div>
            )
        }
    }

    ghosthand = () =>{
        if(this.state.selected_psychic!=null){
            return(
                <div style={{textAlign:'center'}} >
                    <h3>Clues</h3>
                    <div className="hand">
                        {this.state.ghost["hand"].map((card, index) => {
                            const color = this.state.selected.includes(card) ? "rgba(0,0,255,1)" : "rgba(255,0,0,0.3)";
                            const border = card === this.state.selected_dream ? "dashed" : "solid" ;
                            return(
                                <img 
                                    alt="Dream"
                                    type="button" 
                                    id = {card} 
                                    width="100px"
                                    height="100px"
                                    key={index} 
                                    className="card"
                                    style = {{borderColor:color, borderStyle:border}}
                                    src={this.state.image_links['dreams'][card]}
                                    onClick={(event) => {
                                        if(this.state.selected_dream === card){
                                            this.setState((state) =>{
                                                var selected = state.selected
                                                if(selected.includes(card)){
                                                    selected.splice(selected.indexOf(card), 1);
                                                }else{
                                                    selected.push(card)
                                                }
                                                return(
                                                    {'selected': selected}
                                                )
                                            })
                                        }else{
                                            this.setState({selected_dream:card})
                                        }
                                    }}
                                />
                            )
                        })}
                    </div>   
                    <div>
                        <button 
                            type="button" 
                            onClick={()=>this.sendDreams(this.state.selected_psychic)}
                            disabled={this.state.selected_stage>2 || this.state.ghost['psychics_clued'].includes(parseInt(this.state.selected_psychic))}
                        >
                            Send {this.state.selected.length} clues to {this.state.psychic_names[this.state.selected_psychic]}
                        </button>
                        <button 
                            type="button" 
                            onClick={()=>this.useRaven()}
                            disabled={this.state.game_over || this.state.ravens===0}
                        >
                            Redraw {this.state.selected.length} clues. ({this.state.ravens} uses)
                        </button>
                    </div>
                    <hr/>
                    <h3>{this.state.psychic_names[this.state.selected_psychic]}'s clues</h3>
                    <div className="hand">
                        {this.state.psychics[this.state.selected_psychic]['hand'].map((card, index) => {
                            const border = card === this.state.selected_dream ? "dashed" : "solid" ;
                            return(
                                <img 
                                    alt="Dream"
                                    type="button" 
                                    id = {card} 
                                    width="100px"
                                    height="100px"
                                    key={index} 
                                    className="card"
                                    style = {{borderStyle:border}}
                                    src={this.state.image_links['dreams'][card]}
                                    onClick={(event) => {
                                        this.setState({selected_dream:card})
                                    }}
                                />
                            )
                        })}
                    </div>   
                </div>
            )
        }
    }

///////////////////////////////////Selected dream

    selecteddream = () =>{
        return this.state.client_id === "ghost" ? this.ghostselecteddream() : this.psychicselecteddream()
    }

    ghostselecteddream = () =>{
        if(this.state.selected_dream!== null){
            return(
                <img 
                    src={this.state.image_links['dreams'][this.state.selected_dream]} 
                    style={{maxHeight:"100%", maxWidth:"100%",  objectFit: "contain"}} 
                />
            )
        }else{
            return(
                <div style={{height:"80%", width:"80%", backgroundColor:"#CCC", display:"flex", justifyContent:"center", alignItems:"center"}}> 
                    <h3 style={{color:"#888", textAlign:'center'}}>[Select a clue to display here]</h3>
                </div>   
            )
        }
    }

    psychicselecteddream = () =>{
        if(this.state.selected_dream!== null){
            return(
                <img 
                    style={{maxHeight:"100%", maxWidth:"100%",  objectFit: "contain"}} 
                    src={this.state.image_links['dreams'][this.state.selected_dream]}
                />
            )
        }else{
            return(
                <div style={{height:"80%", width:"80%", backgroundColor:"#CCC", display:"flex", justifyContent:"center", alignItems:"center"}}> 
                    <h3 style={{color:"#888", textAlign:'center'}}>[Select a clue to display here]</h3>
                </div>   
            )
        }
    }

///////////////////////////////////Selected card

    selectedcard = () =>{
        return this.state.client_id === "ghost" ? this.ghostselectedcard() : this.psychicselectedcard()
    }

    ghostselectedcard = () =>{
        const cardtype = this.state.selected_stage === 0 ? "suspect" : (this.state.selected_stage === 1 ? "place" : "thing")
        if(this.state.selected_card !== null){
            return(
                <img 
                    style={{maxHeight:"100%", maxWidth:"100%",  objectFit: "contain"}} 
                    src={this.state.image_links['cards'][this.state.selected_stage][this.state.selected_card]}
                />
            )
        }else{
            return(
                <div style={{height:"80%", width:"80%", backgroundColor:"#CCC", display:"flex", justifyContent:"center", alignItems:"center"}}> 
                    <h3 style={{color:"#888", textAlign:'center'}}>[Select a {cardtype} to display here]</h3>
                </div>   
            )
        }
    }

    psychicselectedcard = () =>{
        const disabled= !this.state.ghost['psychics_clued'].includes(this.state.client_id) || this.state.selected_stage !== this.state.psychics[this.state.client_id]['stage']
        const color = disabled ? "black" : "#41D3BD" ;
        const cardtype = this.state.selected_stage === 0 ? "suspects" : (this.state.selected_stage === 1 ? "places" : "things")
        if(this.state.selected_card !== null){
            return(  
                <div  style={{height:"100%", width:"100%", display:'flex', flexDirection:'column', justifyContent:'center'}}>
                    <img 
                        style={{maxHeight:"90%", maxWidth:"100%",  objectFit: "contain"}} 
                        src={this.state.image_links['cards'][this.state.selected_stage][this.state.selected_card]}
                    />
                    <div style={{textAlign:'center'}} >
                        <button 
                            type="button" 
                            disabled = {!this.cardGuessable(this.state.selected_card) || this.cardWaiting(0)}
                            onClick={()=>{
                                this.makeGuess(this.state.selected_card)
                            }}
                        >
                            Guess
                        </button>
                     </div> 
                </div>
            )
        }else{
            return(
                <div style={{height:"80%", width:"80%", backgroundColor:"#CCC", display:"flex", justifyContent:"center", alignItems:"center"}}> 
                    <h3 style={{color:"#888", textAlign:'center'}}>[Select a {cardtype.substring(0, cardtype.length-1)} to display here]</h3>
                </div>   
            )
        }
    }

///////////////////////////////////All cards

    allcards = () =>{
        return this.state.client_id === "ghost" ? this.ghostallcards() : this.psychicallcards()
    }

    ghostallcards = () =>{
        const cardtype = this.state.selected_stage === 0 ? "suspects" : (this.state.selected_stage === 1 ? "places" : "things")
        return(
            <div >
                <div className="hand" >
                {
                    this.state.cards[cardtype].map((card, index) => {
                        const color = card === this.state.stories[this.state.selected_psychic][this.state.selected_stage] ? "#41D3BD" : "black" ;
                        const current = card === this.state.stories[this.state.selected_psychic][this.state.selected_stage] ? "0 0 10px 3px rgba(65, 211, 189, .7)" : "0 0"
                        const border = this.cardSelected(card)? "dashed" : "solid" ;
                        const opacity = this.cardTaken(card)? ".4" : "1" ;
                        return(
                            <img 
                                alt={cardtype}
                                className="card" 
                                key={index}
                                src={this.state.image_links['cards'][this.state.selected_stage][card]}
                                width="100px"
                                style = {{
                                    borderColor:color, 
                                    borderStyle:border,
                                    opacity:opacity,
                                    boxShadow:current
                                }}
                                height="100px"
                                onClick={(event) => {
                                    this.setState({selected_card:card})
                                }}
                            />
                        )
                    })
                }
                </div>
            </div>
        )
    }

    psychicallcards = () =>{
        const cardtype = this.state.selected_stage === 0 ? "suspects" : (this.state.selected_stage === 1 ? "places" : "things")
        return(   
            <div>
                <div className="hand" >
                    {
                        this.state.cards[cardtype].map((card, index) => {
                            const color = this.cardGuessable(card) ? "41D3BD" : "black" ;
                            const border = this.cardSelected(card)? "dashed" : "solid" ;
                            const opacity = this.cardWaiting(card) || this.cardTaken(card)? ".4" : "1" ;
                            const current = this.cardIsGuess(card) ? "0 0 10px 3px rgba(65, 211, 189, .7)" : "0 0"
                            return(
                                <img 
                                    alt={cardtype}
                                    className="card" 
                                    key={index}
                                    style = {{
                                        borderColor:color, 
                                        borderStyle:border,
                                        opacity:opacity,
                                        boxShadow:current
                                    }}
                                    src={this.state.image_links['cards'][this.state.selected_stage][card]}
                                    width="100px"
                                    height="100px"
                                    onClick={(event) => {
                                        this.setState({selected_card:card})
                                    }}
                                />
                            )
                        })
                    }
                </div>
            </div>
        )
    }

///////////////////////////////////comp helpers

    cardIsGuess = (card) =>{
        return card === this.state.psychics[this.state.selected_psychic]["current_guess"] 
    }

    cardSelected = (card) =>{
        return card === this.state.selected_card 
    }

    cardGuessable = (card) =>{
        if(this.state.selected_psychic !== this.state.client_id || this.cardTaken(card)){
            return false
        }else{
            return true
        }
    }

    cardTaken = (card) => {
        var card_taken = false
        for(const psychic_id in this.state.psychics){
            if(this.state.psychics[psychic_id]['story'].length>this.state.selected_stage){
                if(this.state.psychics[psychic_id]['story'][this.state.selected_stage] === card){
                    card_taken = true
                }
            }
        }
        if(this.state.psychics[this.state.selected_psychic]['guesses'].includes(card) || card_taken){
            return true
        }else{
            return false
        }
    }

    cardWaiting = (card) =>{
        if(this.state.client_id !== "ghost" && !this.state.ghost['psychics_clued'].includes(this.state.selected_psychic)){
            return true
        }else{
            return false
        }
    }

///////////////////////////////////Loading

    loading = () =>{
        return(
            <div style={{borderRadius: 5, boxShadow:"0 4px 8px 0 rgba(0, 0, 0, 0.15), 0 6px 20px 0 rgba(0, 0, 0, 0.19)", display:"flex", alignItems:"center", justifyContent:"center", position:"absolute", width:"50%", height:"50%", top:"25%", left:"25%", backgroundColor:"#EEE", opacity:".8"}}>
                <h2>Loading</h2>
            </div>
        )
    }

//////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////Main render/////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////


    render(){
        var room = this.state.started ? this.gameroom() : this.anteroom();
        var loading = this.state.loading ? this.loading() :null
        return(
            <div className="container">
                {room}
                {loading}
            </div>
        )
    }
}

