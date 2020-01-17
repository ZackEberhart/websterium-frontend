import React from 'react';
import './Main.css';
import UIfx from 'uifx'; 
import correctSound from './assets/correct.wav';
import guessSound from './assets/guess.wav';
import upnextSound from './assets/upnext.wav';
import wrongSound from './assets/wrong.wav';
import { IconContext } from "react-icons";
import { FaGhost, FaHome, FaEye, FaHammer, FaUserNinja} from "react-icons/fa";

const correct = new UIfx(correctSound, {volume: 1.0});
const guess = new UIfx(guessSound, {volume: 1.0});
const upnext = new UIfx(upnextSound, {volume: 1.0});
const wrong = new UIfx(wrongSound, {volume: 0.5,});

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

            image_sources:["yGUC9", "NUIuAHY", "VoCv2", "mtzum"],
            image_links:{},
            cards:{},
            stories: [],

            current_round:1,
            known_stories:[],
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
        // var ws = new WebSocket("wss://mysterium-backend.herokuapp.com/game");
        var ws = new WebSocket("ws://localhost:8002/game");
        let that = this; // cache the this
        var connectInterval;

        // websocket onopen event listener
        ws.onopen = () => {
            console.log("connected websocket main component");

            this.setState({ ws: ws });

            that.timeout = 250; // reset timer to 250 on open of websocket connection 
            clearTimeout(connectInterval); // clear Interval on on open of websocket connection
        };

        ws.onmessage = evt => {
            var data = JSON.parse(evt.data)
            const message = data["message"]
            if(data["type"] === "user_list"){
                this.setUserList(message)
                if(this.state.started){
                    wrong.play(1.0)
                    alert("One of the players left the room, so you all lose.")
                    this.setState({started:false}) 
                }
            }else if(data['type'] === "join"){
                this.setState(state=>{
                    var log = state.chatlog
                    var msg = {"user": "system", 'text': "Joined room "+message, 'type':"system", }
                    log.unshift(msg)
                    return({
                        chatlog:log,
                        joined: true, roomname:message
                    })
                })
            }else if(data['type'] === "client_id"){
                 this.setState({'client_id': message})
                 if(message != "ghost") this.setState({'selected_psychic': parseInt(message)})
            }else if(data['type'] === "image_links"){
                 this.setState({'image_links': message})
            }else if(data['type'] === "stories"){
                 this.setState({'stories': message})
            }else if(data['type'] === "state"){
                 this.updateState(message)
            }else if(data['type'] === "start"){
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
        var message = JSON.stringify({"type": mtype, "message": data});
        this.state.ws.send(message);
    }

//////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////Funcs/////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////

    setUserList = (message) =>{
        var psychic_names = {}
        for(var user_id in message){
            if(message[user_id]["pid"] >= 0){
                psychic_names[message[user_id]["pid"]] = message[user_id]["name"]
            }
        }
        this.setState({users: message, psychic_names:psychic_names})
    }

    startGame = (message) =>{
        this.setState({
            started: true,
            selected:[],
            selected_dream:null,
            selected_stage:0,
            cards: message,
        })
        if(this.state.client_id == "ghost"){
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

    leaveRoom = () =>{
        this.send('leave', "leave")
        this.setState({joined: false})
    }

    updateState = (message) =>{
        //If it's a new round, correctly re-render view and play noises
        if(message["status"] == "lost"){
            wrong.play(1.0)
            alert("You didn't make it. Better luck next time.")
            this.setState({started:false}) 
        }else if(message["status"] == "won"){
            correct.play(1.0)
            alert("You win!")
            this.setState({started:false}) 
        }else if(this.isNewRound(message)){
            if(this.wasCorrect(message, this.state.selected_psychic)){
                this.setState({
                    selected_stage: message['psychics'][this.state.selected_psychic]['stage'],
                })
                if(this.state.client_id == "ghost"){
                    this.setState({
                        selected_card: this.state.stories[this.state.selected_psychic][message['psychics'][this.state.selected_psychic]['stage']],
                    })
                }else{
                    const cardtype = this.state.selected_stage==0 ? "suspects" : (this.state.selected_stage==1 ? "places" : "things")
                    this.setState({
                        selected_card: this.state.cards[cardtype][0],
                        selected_dream: null,
                    })
                }
            }
            if(this.state.client_id == "ghost"){
                upnext.play(1.0)
            }else{
                if(this.wasCorrect(message, this.state.client_id)){
                    correct.play(1.0)
                }else if(this.state.psychics[this.state.client_id]['stage']<=2){
                    wrong.play(1.0)
                }
            }
        //if the client has been clued, play the upnext noise
        }else if(this.clientClued(message)){
            upnext.play(1.0)
        }
        this.setState({
            psychics: message["psychics"],
            ghost: message["ghost"],
            current_round: message['current_round']
        })
    }

    handleRejection = (message) =>{
        alert(message)
    }

    sendDreams = (psychic) =>{
        const message = {"psychic": psychic, "dreams": this.state.selected}
        this.send('sendDreams', message)
        this.setState({
            selected:[],
            selected_dream:null
        })
    }

    sendChatMessage = (message) =>{
        const chatMessage = {"text":message}
        this.send('chatMessage', chatMessage)
        this.setState({chatMsg:""})
    }

    handleChatMessage = (message) =>{
        this.setState(state=>{
            var log = state.chatlog
            var msg = {"user": message["user"], "text":message["text"], "type":"normal"}
            log.unshift(msg)
            return({
                chatlog:log,
            })
        })
    }

    makeGuess = (card) =>{
        const message = {"psychic": this.state.client_id, "guess": card}
        console.log(message)
        this.send('makeGuess', message)
        guess.play(1.0)
    }

    isNewRound = (newState) =>{
        return this.state['current_round'] != newState['current_round']
    }

    clientClued = (newState) =>{
        return(!this.state.ghost['psychics_clued'].includes(this.state.client_id) && newState['ghost']['psychics_clued'].includes(this.state.client_id))
    }

    wasCorrect = (newState, psychic) =>{
        console.log(newState)
        if(psychic=="ghost" || newState['current_round'] == 1){
            return false;
        }else{
            return newState['psychics'][psychic]['stage'] != this.state['psychics'][psychic]['stage']
        }
    }

    getGhostUser = () =>{
        for(var key in this.state.users){
            if(this.state.users[key]['role'] == "Ghost"){
                return this.state.users[key]['name']
            }
        }
        return ""
    }

    getPsychicUsers = () =>{
        var psychics = []
        for(var key in this.state.users){
            if(this.state.users[key]['role'] != "Ghost"){
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
                            />
                        </div>
                        <br/>
                        <div className = "row">
                            User name: 
                            <input type="text"  value={this.state.username}
                                onChange={(evt)=> {const val = evt.target.value; this.setState({username:val})}}
                            />
                        </div>
                        <br/>
                        <div className = "row">
                            <button type="button" onClick={() => this.send('join', {"roomname": this.state.roomname, "username":this.state.username})}>Join room</button>
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
                <div className="container" style={{justifyContent:"center",alignItems:"center"}}>
                    <h2>Room: {this.state.roomname}</h2>
                        <div className = "nicebox" style={{padding:'0px', display:'flex', width:"50%", minWidth:"300px", overflow: 'scroll', flex:1}}>
                            {users}
                        </div>
                        <br/>
                        <div className="row">
                                <h3>Select role:</h3>
                                <button type="button" onClick={() => this.send('setRole', 'ghost')}>
                                    <IconContext.Provider value={{ size:"2em", color: "black", className: "global-class-name" }}>
                                        <div>
                                            <FaGhost />
                                        </div>
                                    </IconContext.Provider>
                                </button>
                                <button type="button" onClick={() => this.send('setRole', 'psychic')}>
                                    <IconContext.Provider value={{ size:"2em", color: "black", className: "global-class-name" }}>
                                        <div>
                                            <FaEye />
                                        </div>
                                    </IconContext.Provider>
                                </button>
                            </div>
                        <div className = "row">
                            <button type="button" onClick={() => this.send('startGame', this.state.image_sources)}>Start game</button>
                            <button type="button" onClick={this.leaveRoom}>Leave room</button>
                        </div>
                        <br/>
                        <div className = "nicebox" style={{padding:"10px"}}>
                            <h3>
                                Image sources 
                                <span style={{fontWeight:"normal", fontSize:".8em"}}> (Must be IDs of Imgur albums. Will only apply if *you* start the game.)</span>
                            </h3>
                            <div>
                                Dream source
                                <input type="text" value={this.state.image_sources[0]} 
                                    onChange={(evt)=> {const val = evt.target.value; this.setState((state)=>{state.image_sources[0] = val; return(state)})}}
                                />
                                <button type="button"
                                    onClick={(evt)=> {this.setState((state)=>{state.image_sources[0] = "yGUC9"; return(state)})}}
                                >
                                    Weird gifs 1
                                </button>
                                <button type="button"
                                    onClick={(evt)=> {this.setState((state)=>{state.image_sources[0] = "RfnLT"; return(state)})}}
                                >
                                    Weird gifs 2
                                </button>
                                <button type="button"
                                    onClick={(evt)=> {this.setState((state)=>{state.image_sources[0] = "Tf4Nc"; return(state)})}}
                                >
                                    Simpsons
                                </button>
                                <button type="button"
                                    onClick={(evt)=> {this.setState((state)=>{state.image_sources[0] = "vdLZg"; return(state)})}}
                                >
                                    Zdzisław Beksiński
                                </button>
                            </div>
                            <div>
                                Suspect source
                                <input type="text"  value={this.state.image_sources[1]}
                                    onChange={(evt)=> {const val = evt.target.value; this.setState((state)=>{state.image_sources[1] = val; return(state)})}}
                                />
                                <button type="button"
                                    onClick={(evt)=> {this.setState((state)=>{state.image_sources[1] = "NUIuAHY"; return(state)})}}
                                >
                                    Smash Bros.
                                </button>
                                <button type="button"
                                    onClick={(evt)=> {this.setState((state)=>{state.image_sources[1] = "W6FgJ"; return(state)})}}
                                >
                                    Ovrvwatcth
                                </button>
                                <button type="button"
                                    onClick={(evt)=> {this.setState((state)=>{state.image_sources[1] = "ageiv"; return(state)})}}
                                >
                                    Misc. Characters
                                </button>
                            </div>
                            <div>
                                Place source
                                <input type="text" value={this.state.image_sources[2]}
                                    onChange={(evt)=> {const val = evt.target.value; this.setState((state)=>{state.image_sources[2] = val; return(state)})}}
                                />
                                <button type="button"
                                    onClick={(evt)=> {this.setState((state)=>{state.image_sources[2] = "VoCv2"; return(state)})}}
                                >
                                    Creepy places 1
                                </button>
                                <button type="button"
                                    onClick={(evt)=> {this.setState((state)=>{state.image_sources[2] = "MA55k"; return(state)})}}
                                >
                                    Creepy places 2
                                </button>
                                <button type="button"
                                    onClick={(evt)=> {this.setState((state)=>{state.image_sources[2] = "9JUQg"; return(state)})}}
                                >
                                    Fighting stages
                                </button>
                                <button type="button"
                                    onClick={(evt)=> {this.setState((state)=>{state.image_sources[2] = "jhxPqxh"; return(state)})}}
                                >
                                    Smash stages
                                </button>
                            </div>
                            <div>
                                Thing source
                                <input type="text" value={this.state.image_sources[3]}
                                    onChange={(evt)=> {const val = evt.target.value; this.setState((state)=>{state.image_sources[3] = val; return(state)})}}
                                />
                                <button type="button"
                                    onClick={(evt)=> {this.setState((state)=>{state.image_sources[3] = "mtzum"; return(state)})}}
                                >
                                    Bizarro items
                                </button>
                                <button type="button"
                                    onClick={(evt)=> {this.setState((state)=>{state.image_sources[3] = "RXFfv"; return(state)})}}
                                >
                                    Prison inventions
                                </button>
                                <button type="button"
                                    onClick={(evt)=> {this.setState((state)=>{state.image_sources[3] = "Cyqqv"; return(state)})}}
                                >
                                    Beans
                                </button>
                                <button type="button"
                                    onClick={(evt)=> {this.setState((state)=>{state.image_sources[3] = "VyAWb"; return(state)})}}
                                >
                                    Other ways to die
                                </button>
                            </div>
                        </div>
                </div>
            )
        }
    }

    gameroom = () => {
        const cardtype = this.state.selected_stage==0 ? "suspects" : (this.state.selected_stage==1 ? "places" : "things")
        const mainDisplay = this.state.selected_stage < 3 ? (
            <div className = "row" style={{overflow:'visible', minHeight: 0, flex:1}}>
                <div className="nicebox" style={{minHeight: 0, flex:2, overflow:'scroll', margin:'3px', padding:'3px', display:'flex', alignItems:'center', justifyContent:"center"}}>
                    {this.selecteddream()}
                </div>
                <div className="nicebox" style={{minHeight: 0, flex:2, overflow:'scroll', margin:'3px', padding:'3px', display:'flex', alignItems:'center', justifyContent:"center"}}>
                    {this.selectedcard()}
                </div>
            </div>
        ):(
            <div className = "row" style={{overflow:'visible', minHeight: 0, flex:1}}>
                <div className="nicebox" style={{minHeight: 0, flex:2, overflow:'scroll', margin:'3px', padding:'3px', display:'flex', alignItems:'center', justifyContent:"center"}}>
                    <div className="row">
                        <div style={{width:"33%", padding:"3px", boxSizing:"border-box", textAlign:"center"}}>
                            <IconContext.Provider value={{ size:"3em", color:"black", className: "global-class-name" }}>
                                <div>
                                    <FaUserNinja />
                                </div>
                            </IconContext.Provider>
                            <br/>
                            <img 
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
                                style={{maxHeight:"70%", maxWidth:"100%", objectFit: "contain"}}
                                src={this.state.image_links['cards'][2][this.state.psychics[this.state.selected_psychic]["story"][2]]}
                            />
                        </div>
                    </div>
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
                    <div style={{flex:1, height:'100%', padding:'5px', boxSizing:'border-box',}}>
                        <div className="nicebox" style={{width:'100%', overflow:'scroll', height:'100%', display:'flex', flexDirection:"column", alignItems:"center"}}>
                            {this.mainhand()}
                        </div>
                    </div>
                    <div style={{flex:4, height:'100%', display:'flex', flexDirection:"column", padding:'5px',  boxSizing:'border-box'}}>
                        <div className = "row" style={{overflow:'scroll', flex:'0 1 auto'}}>
                            {this.allpsychics()}
                        </div>
                        {mainDisplay}
                        {visibleCards}
                    </div>
                </div>
            </div>
        )
    }

///////////////////////////////////Chat

chatbox = () =>{
    var chatDiv = this.state.chatOpen?this.chatOpen():this.chatClosed()
    if(this.state.joined){
        return(
            <div 
                style={{position:"absolute", right:0, top:0, zIndex:1}}
            >
                {chatDiv}
            </div>
        )
    }
}

chatOpen = () =>{
    return(
        <div 
            style={{width:"250px", height:"500px", backgroundColor:"white", display:"flex", flexDirection:"column", fontSize:".6em"}}
        >
            <div 
                style={{width:"100%", height:"20px", backgroundColor:"green", cursor:"pointer"}}
                onClick={()=>{this.setState({chatOpen:false})}}

            >
            close chat
            </div>
            <div style={{flex:'1',  backgroundColor:"white", minHeight: '0px', width:"100%", overflow:"scroll", display:"flex", flexDirection:"column-reverse"}}>
                {
                    this.state.chatlog.map((message, index) => {
                        if(message["type"] == "normal"){
                            return(
                                <div>{message["user"]}:{message["text"]}</div>
                            )
                        }else{
                            return(
                                <div style={{color:"blue"}}>{message["text"]}</div>
                            )
                        }
                    })
                }
            </div>
            <div style={{maxHeight:"50%", width:"100%"}}>
                <textarea  
                    autoFocus
                    style={{height:"100%", width:"100%", boxSizing:"border-box", resize:"none"}}
                    value={this.state.chatMsg}
                    onChange={(evt)=> {const val = evt.target.value; this.setState({chatMsg:val})}}
                    onKeyPress={(evt)=>{
                        if(evt.key == 'Enter'){
                            evt.preventDefault();
                            this.sendChatMessage(this.state.chatMsg);
                        }
                    }}
                />
            </div>
            <button 
                type="button" 
                onClick={()=>{this.sendChatMessage(this.state.chatMsg)}}
                disabled={this.state.chatMsg.length==0}
            >
                Send {this.state.selected.length} clues to {this.state.psychic_names[this.state.selected_psychic]}
            </button>
        </div>
    )
}

chatClosed = () =>{
    return(
        <div 
            style={{width:"250px", height:"20px", backgroundColor:"green", cursor:"pointer"}}
            onClick={()=>{this.setState({chatOpen:true})}}
        >
        open chat
        </div>
    )
}

///////////////////////////////////All psychics

    allpsychics = () =>{
        return this.state.client_id == "ghost" ? this.ghostallpsychics() : this.psychicallpsychics()
    }

    psychicallpsychics = () =>{
        const border = this.state.selected_psychic === this.state.client_id ? "dashed" : "solid"
        const bgcolor = this.state.psychics[this.state.client_id].current_guess != null ? "green" : (this.state.ghost['psychics_clued'].includes(parseInt(this.state.client_id))? "orange" : "transparent")         
        return(
            <div className = "hand" style={{flex:1,  justifyContent:"space-between", height:'100%', overflow:'scroll', "textAlign":'center'}}>
                <div style={{flex:1, textAlign:"left"}}>
                    <h3 style={{margin:"0px"}}>Round</h3>
                    <h2 style={{margin:"0px"}}>{this.state.current_round}/7</h2>
                </div>
                <div className = "hand">
                    <div 
                    className="card"
                    style = {{borderColor:"blue", backgroundColor:bgcolor, borderStyle:border, display:'flex', flexDirection:"column", alignItems:"stretch", justifyContent:"space-around"}}
                    onClick={()=>{
                        this.setState({
                            selected_stage: this.state.psychics[this.state.client_id]['stage'],
                            selected_card:this.state.psychics[this.state.client_id]['current_guess'],
                            selected_dream:null,
                            selected_psychic:parseInt(this.state.client_id)
                        })
                    }}
                    >
                        <div style={{overflow:"scroll"}}>{this.state.psychic_names[this.state.client_id]}</div>
                        <div className="row" style={{justifyContent:"space-around"}}>
                                <IconContext.Provider value={{ size:"1em", color: this.state.psychics[this.state.client_id].stage==0?"blue":(this.state.psychics[this.state.client_id].stage>0?"black":"gray"), className: "global-class-name" }}>
                                    <div>
                                        <FaUserNinja />
                                    </div>
                                </IconContext.Provider>
                                <IconContext.Provider value={{ size:"1em", color: this.state.psychics[this.state.client_id].stage==1?"blue":(this.state.psychics[this.state.client_id].stage>1?"black":"gray"), className: "global-class-name" }}>
                                    <div>
                                        <FaHome />
                                    </div>
                                </IconContext.Provider>
                                <IconContext.Provider value={{ size:"1em", color: this.state.psychics[this.state.client_id].stage==2?"blue":(this.state.psychics[this.state.client_id].stage>2?"black":"gray"), className: "global-class-name" }}>
                                    <div>
                                        <FaHammer />
                                    </div>
                                </IconContext.Provider>
                            </div>
                    </div>
                    {Object.keys(this.state.psychics).map((psychic_id, index) => {
                        if(psychic_id != this.state.client_id){
                            const border = this.state.selected_psychic === parseInt(psychic_id) ? "dashed" : "solid";
                            const bgcolor = this.state.psychics[psychic_id].current_guess != null ? "green" : (this.state.ghost['psychics_clued'].includes(parseInt(psychic_id))? "orange" : "transparent")
                            return(
                                <div 
                                    key={index} 
                                    className="card"
                                    style = {{backgroundColor:bgcolor, borderStyle:border, display:'flex', flexDirection:"column", alignItems:"stretch", justifyContent:"space-around"}}
                                    onClick={()=>{
                                        if(psychic_id != this.state.selected_psychic){
                                            this.setState({
                                                selected_stage: this.state.psychics[psychic_id]['stage'],
                                                selected_card:this.state.psychics[psychic_id]['current_guess'],
                                                selected_dream:null,
                                                selected_psychic:parseInt(psychic_id)
                                            })
                                        }
                                    }}
                                >
                                    <div style={{overflow:"scroll"}}>{this.state.psychic_names[index]}</div>
                                    <div className="row" style={{justifyContent:"space-around"}}>
                                        <IconContext.Provider value={{ size:"1em", color: this.state.psychics[psychic_id].stage==0?"blue":(this.state.psychics[psychic_id].stage>0?"black":"gray"), className: "global-class-name" }}>
                                            <div>
                                                <FaUserNinja />
                                            </div>
                                        </IconContext.Provider>
                                        <IconContext.Provider value={{ size:"1em", color: this.state.psychics[psychic_id].stage==1?"blue":(this.state.psychics[psychic_id].stage>1?"black":"gray"), className: "global-class-name" }}>
                                            <div>
                                                <FaHome />
                                            </div>
                                        </IconContext.Provider>
                                        <IconContext.Provider value={{ size:"1em", color: this.state.psychics[psychic_id].stage==2?"blue":(this.state.psychics[psychic_id].stage>2?"black":"gray"), className: "global-class-name" }}>
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
            <div className = "hand" style={{flex:1,  justifyContent:"space-between", height:'100%', overflow:'scroll', "textAlign":'center'}}>
                <div style={{flex:1, textAlign:"left"}}>
                    <h3 style={{margin:"0px"}}>Round</h3>
                    <h2 style={{margin:"0px"}}>{this.state.current_round}/7</h2>
                </div>
                <div className = "hand">
                    {Object.keys(this.state.psychics).map((psychic_id, index) => {
                        const border = this.state.selected_psychic === parseInt(psychic_id) ? "dashed" : "solid";
                        const bgcolor = this.state.psychics[psychic_id].current_guess != null ? "green" : (this.state.ghost['psychics_clued'].includes(parseInt(psychic_id))? "orange" : "transparent")
                        return(
                            <div 
                                key={index} 
                                className="card"
                                style = {{backgroundColor:bgcolor, borderStyle:border, display:'flex', flexDirection:"column", alignItems:"stretch", justifyContent:"space-around"}}
                                onClick={()=>{
                                    if(psychic_id != this.state.selected_psychic){
                                        this.setState({
                                            selected_stage: this.state.psychics[psychic_id]['stage'],
                                            selected_card:this.state.stories[psychic_id][this.state.psychics[psychic_id]['stage']],
                                            selected_psychic:parseInt(psychic_id)
                                        })
                                    }
                                }}
                            >
                                <div style={{overflow:"scroll"}}>{this.state.psychic_names[index]}</div>
                                <div className="row" style={{justifyContent:"space-around"}}>
                                    <IconContext.Provider value={{ size:"1em", color: this.state.psychics[psychic_id].stage==0?"blue":(this.state.psychics[psychic_id].stage>0?"black":"gray"), className: "global-class-name" }}>
                                        <div>
                                            <FaUserNinja />
                                        </div>
                                    </IconContext.Provider>
                                    <IconContext.Provider value={{ size:"1em", color: this.state.psychics[psychic_id].stage==1?"blue":(this.state.psychics[psychic_id].stage>1?"black":"gray"), className: "global-class-name" }}>
                                        <div>
                                            <FaHome />
                                        </div>
                                    </IconContext.Provider>
                                    <IconContext.Provider value={{ size:"1em", color: this.state.psychics[psychic_id].stage==2?"blue":(this.state.psychics[psychic_id].stage>2?"black":"gray"), className: "global-class-name" }}>
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
        return this.state.client_id == "ghost" ? this.ghosthand() : this.psychichand()
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
                            const color = this.state.selected.includes(card) ? "blue" : "red";
                            const border = card === this.state.selected_dream ? "dashed" : "solid" ;
                            return(
                                <img 
                                    type="button" 
                                    id = {card} 
                                    width="100px"
                                    height="100px"
                                    key={index} 
                                    className="card"
                                    style = {{borderColor:color, borderStyle:border}}
                                    src={this.state.image_links['dreams'][card]}
                                    onClick={(event) => {
                                        if(this.state.selected_dream == card){
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
                    </div>
                    <hr/>
                    <h3>{this.state.psychic_names[this.state.selected_psychic]}'s clues</h3>
                    <div className="hand">
                        {this.state.psychics[this.state.selected_psychic]['hand'].map((card, index) => {
                            const border = card === this.state.selected_dream ? "dashed" : "solid" ;
                            return(
                                <img 
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
        return this.state.client_id == "ghost" ? this.ghostselecteddream() : this.psychicselecteddream()
    }

    ghostselecteddream = () =>{
        if(this.state.selected_dream!= null){
            return(
                <img 
                    style={{maxHeight:"100%", maxWidth:"100%", objectFit: "contain"}}
                    src={this.state.image_links['dreams'][this.state.selected_dream]}
                />
            )
        }else{
            return(
                <div style={{height:"80%", width:"80%", backgroundColor:"#CCC", display:"flex", justifyContent:"center", alignItems:"center"}}> 
                    <h3 style={{color:"#888"}}>[Select a clue to display here]</h3>
                </div>   
            )
        }
    }

    psychicselecteddream = () =>{
        if(this.state.selected_dream!= null){
            return(
                <img 
                    style={{maxHeight:"100%", maxWidth:"100%", objectFit: "contain"}}
                    src={this.state.image_links['dreams'][this.state.selected_dream]}
                />
            )
        }else{
            return(
                <div style={{height:"80%", width:"80%", backgroundColor:"#CCC", display:"flex", justifyContent:"center", alignItems:"center"}}> 
                    <h3 style={{color:"#888"}}>[Select a clue to display here]</h3>
                </div>   
            )
        }
    }

///////////////////////////////////Selected card

    selectedcard = () =>{
        return this.state.client_id == "ghost" ? this.ghostselectedcard() : this.psychicselectedcard()
    }

    ghostselectedcard = () =>{
        const cardtype = this.state.selected_stage==0 ? "suspect" : (this.state.selected_stage==1 ? "place" : "thing")
        if(this.state.selected_card != null){
            return(
                <img 
                    style={{maxHeight:"100%", maxWidth:"100%", objectFit: "contain"}}
                    src={this.state.image_links['cards'][this.state.selected_stage][this.state.selected_card]}
                />
            )
        }else{
            return(
                <div style={{height:"80%", width:"80%", backgroundColor:"#CCC", display:"flex", justifyContent:"center", alignItems:"center"}}> 
                    <h3 style={{color:"#888"}}>[Select a {cardtype} to display here]</h3>
                </div>   
            )
        }
    }

    psychicselectedcard = () =>{
        const disabled= !this.state.ghost['psychics_clued'].includes(this.state.client_id) || this.state.selected_stage != this.state.psychics[this.state.client_id]['stage']
        const color = disabled ? "black" : "blue" ;
        const cardtype = this.state.selected_stage==0 ? "suspects" : (this.state.selected_stage==1 ? "places" : "things")
        if(this.state.selected_card != null){
            return(  
                <div  style={{height:"100%", width:"100%", display:'flex', flexDirection:'column', justifyContent:'center'}}>
                    <img 
                        style={{maxHeight:"95%", maxWidth:"100%", objectFit: "contain", borderColor:color}}
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
                    <h3 style={{color:"#888"}}>[Select a {cardtype.substring(0, cardtype.length-1)} to display here]</h3>
                </div>   
            )
        }
    }

///////////////////////////////////All cards

    allcards = () =>{
        return this.state.client_id == "ghost" ? this.ghostallcards() : this.psychicallcards()
    }

    ghostallcards = () =>{
        const cardtype = this.state.selected_stage==0 ? "suspects" : (this.state.selected_stage==1 ? "places" : "things")
        return(
            <div >
                <div className="hand" >
                {
                    this.state.cards[cardtype].map((card, index) => {
                        const color = card === this.state.stories[this.state.selected_psychic][this.state.selected_stage] ? "yellow" : "black" ;
                        const border = this.cardSelected(card)? "dashed" : "solid" ;
                        const opacity = this.cardTaken(card)? ".4" : "1" ;
                        return(
                            <img 
                                className="card" 
                                key={index}
                                src={this.state.image_links['cards'][this.state.selected_stage][card]}
                                width="100px"
                                style = {{
                                    borderColor:color, 
                                    borderStyle:border,
                                    opacity:opacity,
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
        const disabled= !this.state.ghost['psychics_clued'].includes(this.state.client_id) || this.state.selected_stage != this.state.psychics[this.state.client_id]['stage']
        const color = disabled ? "black" : "blue" ;
        const cardtype = this.state.selected_stage==0 ? "suspects" : (this.state.selected_stage==1 ? "places" : "things")
        return(   
            <div>
                <div className="hand" >
                    {
                        this.state.cards[cardtype].map((card, index) => {
                            const color = this.cardGuessable(card) ? "blue" : "black" ;
                            const border = this.cardSelected(card)? "dashed" : "solid" ;
                            const opacity = this.cardWaiting(card) || this.cardTaken(card)? ".4" : "1" ;
                            const current = this.cardIsGuess(card) ? "0 0 15px 5px #8ff" : "0 0"
                            return(
                                <img 
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
    if(this.state.selected_psychic != this.state.client_id || this.cardTaken(card)){
        return false
    }else{
        return true
    }
}

cardTaken = (card) => {
    var card_taken = false
    for(const psychic_id in this.state.psychics){
        if(this.state.psychics[psychic_id]['story'].length>this.state.selected_stage){
            if(this.state.psychics[psychic_id]['story'][this.state.selected_stage] == card){
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
    if(this.state.client_id != "ghost" && !this.state.ghost['psychics_clued'].includes(this.state.selected_psychic)){
        return true
    }else{
        return false
    }
}

///////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////Main render/////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////


    render(){
        var room = this.state.started ? this.gameroom() : this.anteroom();
        return(
            <div className="container">
                {this.chatbox()}
                {room}
            </div>
        )
    }
}

