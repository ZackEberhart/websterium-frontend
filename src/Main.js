import React from 'react';
import './Main.css';

export default class Main extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            ws: null,
            started:false,
            client_id: null,
            users:{},
            cards:{},
            image_sources:["yGUC9", "cO7wvbR", "VoCv2", "mtzum"],
            image_links:{},
            stories: [],
            known_stories:[],
            selected:[],
            psychics:[],
            ghost:{"hand":[], 'psychics_clued':[]},
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
        var ws = new WebSocket("wss://mysterium-backend.herokuapp.com/game");
        // var ws = new WebSocket("wss://localhost:8002/game");
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
                this.showUserList(message)
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

    showUserList = (message) =>{
        this.setState({'users': message})
    }

    startGame = (message) =>{
        this.setState({
            started: true,
            cards: message,
        })
        if(this.state.client_id == "ghost"){
            this.setState({
                selected_card: this.state.stories[0][0]
            })
        }else{
            this.setState({
                selected_card: this.state.cards["suspects"][0]
            })
        }
    }

    updateState = (message) =>{
        this.setState({
            psychics: message["psychics"],
            ghost: message["ghost"],
        })
        //If the currently-selected psychic just advanced a round, update the view
        if(message['psychics'][this.state.selected_psychic]['stage'] != this.state.selected_stage){
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
    }

    handleRejection = (message) =>{
        console.log(message)
    }

    sendDreams = (psychic) =>{
        const message = {"psychic": psychic, "dreams": this.state.selected}
        console.log(message)
        this.send('sendDreams', message)
        this.setState({
            selected:[],
            selected_dream:null
        })
    }

    makeGuess = (card) =>{
        const message = {"psychic": this.state.client_id, "guess": card}
        console.log(message)
        this.send('makeGuess', message)
    }


//////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////Components/////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////Main rooms

    anteroom = () => {
        const users = Object.keys(this.state.users).map(key => 
            <li key={key}>
                {key}: {this.state.users[key]}
            </li>
        )

        return(
            <div className="container">
                <h1>Anteroom</h1>
                <div className = "row">
                    <div>
                        {users}
                        <button type="button" onClick={() => this.send('setRole', 'ghost')}>Ghost</button>
                        <button type="button" onClick={() => this.send('setRole', 'psychic')}>Psychic</button>
                    </div>
                    <div style={{flexGrow:1}}/>
                    <div>
                        <div>
                            Dream source
                            <input type="text" value={this.state.image_sources[0]} 
                                onChange={(evt)=> {const val = evt.target.value; this.setState((state)=>{state.image_sources[0] = val; return(state)})}}
                            />
                        </div>
                        <div>
                            Suspect source
                            <input type="text"  value={this.state.image_sources[1]}
                                onChange={(evt)=> {const val = evt.target.value; this.setState((state)=>{state.image_sources[1] = val; return(state)})}}
                            />
                        </div>
                        <div>
                            Place source
                            <input type="text" value={this.state.image_sources[2]}
                                onChange={(evt)=> {const val = evt.target.value; this.setState((state)=>{state.image_sources[2] = val; return(state)})}}
                            />
                        </div>
                        <div>
                            Thing source
                            <input type="text" value={this.state.image_sources[3]}
                                onChange={(evt)=> {const val = evt.target.value; this.setState((state)=>{state.image_sources[3] = val; return(state)})}}
                            />
                        </div>
                    </div>
                </div>
                <div className = "row">
                    <button type="button" onClick={() => this.send('startGame', this.state.image_sources)}>Start</button>
                </div>
            </div>
        )
    }

    gameroom = () => {
        return(
            <div className="container">
                <div className = "row" style={{overflow:'hidden'}}>
                    {this.allpsychics()}
                </div>
                <div className = "row" style={{overflow:'hidden', flex:1}}>
                    <div style={{flex:1, padding:'5px'}}>
                        <div style={{width:'100%', overflow:'scroll', height:'100%', display:'flex', flexDirection:"column", alignItems:"center", boxSizing:'border-box', border:"2px solid black", borderRadius:'5px'}}>
                            <h3>dreams</h3>
                            {this.mainhand()}
                        </div>
                    </div>
                    <div style={{flex:2, overflow:'scroll', padding:'5px', display:'flex', alignItems:'center', justifyContent:"center"}}>
                        {this.selecteddream()}
                    </div>
                    <div style={{flex:2, overflow:'scroll', padding:'5px', display:'flex', alignItems:'center', justifyContent:"center"}}>
                        {this.selectedcard()}
                    </div>
                </div>
                <div className="row" style = {{overflow:'scroll',}}>
                    <div>
                        {this.allcards()}
                    </div>
                </div>
                
            </div>
        )
    }

///////////////////////////////////All psychics

    allpsychics = () =>{
        return this.state.client_id == "ghost" ? this.ghostallpsychics() : this.psychicallpsychics()
    }

    psychicallpsychics = () =>{
        return(
                <div className = "hand" style={{flex:1,  height:'100%', overflow:'scroll', "textAlign":'center'}}>
                    <div 
                    className="card"
                    style = {{borderColor:this.state.selected_psychic === parseInt(this.state.client_id) ? "blue" : "black"}}
                    onClick={()=>{
                        this.setState({
                            selected_stage: this.state.psychics[this.state.client_id]['stage'],
                            selected_card:this.state.psychics[this.state.client_id]['current_guess'],
                            selected_dream:null,
                            selected_psychic:parseInt(this.state.client_id)
                        })
                    }}
                >
                    <p>Psychic {this.state.client_id}</p>
                    <p>Stage {this.state.psychics[this.state.client_id]['stage']}</p>
                </div>
                    {Object.keys(this.state.psychics).map((psychic_id, index) => {
                        if(psychic_id != this.state.client_id){
                            const color = this.state.selected_psychic === parseInt(psychic_id) ? "blue" : "black";
                            return(
                                <div 
                                    key={index} 
                                    className="card"
                                    style = {{borderColor:color}}
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
                                    <p>Psychic {index}</p>
                                    <p>Stage {this.state.psychics[psychic_id]['stage']}</p>
                                </div>
                            )
                        }
                    })}
                </div>
        )
    }

    ghostallpsychics = () =>{
        return(
            <div className = "hand" style={{flex:1,  height:'100%', overflow:'scroll', "textAlign":'center'}}>
                {Object.keys(this.state.psychics).map((psychic_id, index) => {
                    const color = this.state.selected_psychic === parseInt(psychic_id) ? "blue" : "black";
                    return(
                        <div 
                            key={index} 
                            className="card"
                            style = {{borderColor:color}}
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
                            <p>Psychic {index}</p>
                            <p>Stage {this.state.psychics[psychic_id]['stage']}</p>
                        </div>
                    )
                })}
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
            )
        }
    }

    ghosthand = () =>{
        if(this.state.selected_psychic!=null){
            return(
                <div>
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
                    <div style={{textAlign:'center'}} >
                         <button 
                            type="button" 
                            onClick={()=>this.sendDreams(this.state.selected_psychic)}
                            disabled={this.state.ghost['psychics_clued'].includes(parseInt(this.state.selected_psychic))}
                        >
                            Send {this.state.selected.length} dreams to Psychic {this.state.selected_psychic}
                        </button>
                     </div>
                </div>
            )
        }
    }

    /*
    if(this.state.selected_psychic!=null && this.state.selected_psychic != "ghost"){
            return(
                <div>
                    <div className="hand">
                        {this.state.psychics[this.state.selected_psychic]['hand'].map((card, index) => {
                            return(
                                <img 
                                    width="100px"
                                    height="100px"
                                    src={this.state.image_links['dreams'][card]}
                                    key={index} 
                                    className="card"
                                    onClick={(event) => {
                                        this.setState({selected_dream:card})
                                    }}
                                />
                            )
                        })}
                     </div>
                     <div>
                         <button 
                            type="button" 
                            onClick={()=>this.sendDreams(this.state.selected_psychic)}
                            disabled={this.state.ghost['psychics_clued'].includes(parseInt(this.state.selected_psychic))}
                        >
                            Psychic {this.state.selected_psychic} nknk
                        </button>
                     </div>
                 </div>
            )
            */


///////////////////////////////////Selected dream

    selecteddream = () =>{
        return this.state.client_id == "ghost" ? this.ghostselecteddream() : this.psychicselecteddream()
    }

    ghostselecteddream = () =>{
        return(
            <img 
                style={{maxHeight:"100%", maxWidth:"100%", objectFit: "contain"}}
                src={this.state.image_links['dreams'][this.state.selected_dream]}
            />
        )
    }

    psychicselecteddream = () =>{
        return(   
            <img 
                style={{maxHeight:"100%", maxWidth:"100%", objectFit: "contain"}}
                src={this.state.image_links['dreams'][this.state.selected_dream]}
            />
        )
    }

///////////////////////////////////Selected card

    selectedcard = () =>{
        return this.state.client_id == "ghost" ? this.ghostselectedcard() : this.psychicselectedcard()
    }

    ghostselectedcard = () =>{
        return(
            <img 
                style={{maxHeight:"100%", maxWidth:"100%", objectFit: "contain"}}
                src={this.state.image_links['cards'][this.state.selected_stage][this.state.selected_card]}
            />
        )
    }

    psychicselectedcard = () =>{
        const disabled= !this.state.ghost['psychics_clued'].includes(this.state.client_id) || this.state.selected_stage != this.state.psychics[this.state.client_id]['stage']
        const color = disabled ? "black" : "blue" ;
        const cardtype = this.state.selected_stage==0 ? "suspects" : (this.state.selected_stage==1 ? "places" : "things")
        return(  
            <img 
                style={{maxHeight:"100%", maxWidth:"100%", objectFit: "contain", borderColor:color}}
                src={this.state.image_links['cards'][this.state.selected_stage][this.state.selected_card]}
                onClick={()=>{
                    const card = this.state.selected_card
                    this.makeGuess(card)
                }}
            /> 
        )
    }

///////////////////////////////////All cards

    allcards = () =>{
        return this.state.client_id == "ghost" ? this.ghostallcards() : this.psychicallcards()
    }

    ghostallcards = () =>{
        const cardtype = this.state.selected_stage==0 ? "suspects" : (this.state.selected_stage==1 ? "places" : "things")
        return(
            <div >
                <h3>{cardtype}</h3>
                <div className="hand" >
                {
                    this.state.cards[cardtype].map((card, index) => {
                        const color = card === this.state.stories[this.state.selected_psychic][this.state.selected_stage] ? "blue" : "red" ;
                        const border = card === this.state.selected_card ? "dashed" : "solid" ;
                        return(
                            <img 
                                className="card" 
                                key={index}
                                src={this.state.image_links['cards'][this.state.selected_stage][card]}
                                width="100px"
                                style = {{borderColor:color, borderStyle:border}}
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
                <h3>{cardtype}</h3>
                <div className="hand" >
                    {
                        this.state.cards[cardtype].map((card, index) => {
                            const border = card === this.state.selected_card ? "dashed" : "solid" ;
                            return(
                                <img 
                                    className="card" 
                                    key={index}
                                    style = {{borderColor:color, borderStyle:border}}
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



//////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////Main render/////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////


    render(){
        var room = this.state.started ? this.gameroom() : this.anteroom();
        return(
            <div className="container">
                {room}
            </div>
        )
    }
}

