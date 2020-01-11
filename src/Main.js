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
            image_sources:["QguRw", "1n7qV", "SHeYB", "Xv2DY"],
            image_links:{},
            stories: [],
            known_stories:[],
            selected:[],
            psychics:[],
            ghost:{"hand":[], 'psychics_clued':[]}
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
                this.showUserList(message)
            }else if(data['type'] === "start"){
                 this.startGame(message)
            }else if(data['type'] === "image_links"){
                 this.setState({'image_links': message})
            }else if(data['type'] === "state"){
                 this.updateState(message)
            }else if(data['type'] === "reject"){
                 this.handleRejection(message)
            }else if(data['type'] === "client_id"){
                 this.setState({'client_id': message})
            }else if(data['type'] === "stories"){
                 this.setState({'stories': message})
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
    }

    updateState = (message) =>{
        console.log(message)
        this.setState({
            psychics: message["psychics"],
            ghost: message["ghost"],
        })
    }

    handleRejection = (message) =>{
        console.log(message)
    }

    sendDreams = (psychic) =>{
        const message = {"psychic": psychic, "dreams": this.state.selected}
        this.send('sendDreams', message)
        this.setState({selected:[]})
    }

    makeGuess = (card) =>{
        const message = {"psychic": this.state.client_id, "guess": card}
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
                <div className = "row" style={{backgroundColor:"green", overflow:'hidden', flex:5}}>
                    <div style={{flex:1,  height:'100%', overflow:'scroll', "textAlign":'center'}}>
                        {this.allcards()}
                    </div>
                    <div style={{flex:1, height:'100%', overflow:'scroll'}}>
                        {this.allpsychics()}
                    </div>
                </div>
                <div className="row" style = {{flex:2}}>
                    {this.mainhand()}
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
                <div className="hand">
                    {this.state.psychics[this.state.client_id]['hand'].map((card, index) => {
                        return(
                            <div key={index} className="card">
                                <div>
                                    <img 
                                        width="100px"
                                        height="100px"
                                        src={this.state.image_links['dreams'][card]}
                                    />
                                </div>
                            </div>
                        )
                    })}
                 </div>
            )
        }
    }

    ghosthand = () =>{
        return(
            <div className="hand">
                {this.state.ghost["hand"].map((card, index) => {
                    const color = this.state.selected.includes(card) ? "blue" : "red";
                    return(
                            <img 
                                type="button" 
                                id = {card} 
                                width="100px"
                                height="100px"
                                key={index} 
                                className="card"
                                style = {{borderColor:color}}
                                src={this.state.image_links['dreams'][card]}
                                onClick={(event) => {
                                    card = parseInt(event.target.id)
                                    this.setState((state) =>{
                                        var selected = this.state.selected
                                        if(selected.includes(card)){
                                            selected.splice(selected.indexOf(card), 1);
                                        }else{
                                            selected.push(card)
                                        }
                                        return(
                                            {'selected': selected}
                                        )
                                    },
                                    )
                                }}
                            />
                    )
                })}
            </div>
        )
    }

///////////////////////////////////All cards

    allcards = () =>{
        return this.state.client_id == "ghost" ? this.ghostallcards() : this.psychicallcards()
    }

    ghostallcards = () =>{
        return(
            Object.keys(this.state.cards).map((cardtype, typeindex) => {
                return(
                    <div key={typeindex}>
                        <h3>{cardtype}</h3>
                        <div className="hand" >
                        {
                            this.state.cards[cardtype].map((card, index) => {
                                return(
                                    <div className="card" key={index}>
                                        <img 
                                            src={this.state.image_links['cards'][typeindex][card]}
                                            width="100px"
                                            height="100px"
                                        />
                                    </div>
                                )
                            })
                        }
                        </div>
                    </div>
                )
            })
        )
    }

    psychicallcards = () =>{
        return(
            Object.keys(this.state.cards).map((cardtype, typeindex) => {
                    const disabled= !this.state.ghost['psychics_clued'].includes(this.state.client_id) || typeindex != this.state.psychics[this.state.client_id]['stage']
                    const color = disabled ? "black" : "blue" ;

                return(
                    <div key={typeindex}>
                        <h3>{this.state.psychics[this.state.client_id] && typeindex==this.state.psychics[this.state.client_id]['stage']?cardtype+" << you are here":cardtype}</h3>
                        <div className="hand" >
                            {
                                this.state.cards[cardtype].map((card, index) => {
                                    return(
                                        <img 
                                            className="card" 
                                            key={index}
                                            style = {{borderColor:color}}
                                            onClick={(e)=>{if(!disabled) this.makeGuess(card)}}
                                            src={this.state.image_links['cards'][typeindex][card]}
                                            width="100px"
                                            height="100px"
                                        />
                                    )
                                })
                            }
                        </div>
                    </div>
                )
            })
        )
    }


///////////////////////////////////All hands

    allpsychics = () =>{
        return this.state.client_id == "ghost" ? this.ghostallpsychics() : this.psychicallpsychics()
    }

    psychicallpsychics = () =>{
        return(
            Object.keys(this.state.psychics).map((psychic_id, index) => {
                return(
                    <div key={index}>
                        <p>Psychic {index}</p>
                        <p>Scenario</p>
                        <div className="hand">
                            {
                                this.state.psychics[psychic_id]["story"].map((card, index) => {
                                    return(
                                        <div  className="card"key={index}> 
                                            <img 
                                                src={this.state.image_links['cards'][index][card]}
                                                width="100px"
                                                height="100px"
                                            />
                                        </div>
                                    )
                                })
                            }
                        </div>
                        <p>Hand</p>
                        <div className="hand">
                            {
                                this.state.psychics[psychic_id]['hand'].map((card, index) => {
                                    return(
                                        <div className="card" key={index}>
                                            <img 
                                                src={this.state.image_links['dreams'][card]}
                                                width="100px"
                                                height="100px"
                                            />
                                        </div>
                                    )
                                })
                            }
                        </div>
                    </div>
                )
            })
        )
    }

    ghostallpsychics = () =>{
        return(
            Object.keys(this.state.psychics).map((psychic_id, index) => {
                return(
                    <div key={index}>
                        <button 
                            type="button" 
                            id = {index} 
                            onClick={()=>this.sendDreams(index)}
                            disabled={this.state.ghost['psychics_clued'].includes(parseInt(psychic_id))}
                        >
                            Psychic {index} {psychic_id} nknk
                        </button>
                        <div className="hand">
                            <p>Scenario</p>
                            {
                                this.state.stories[psychic_id].map((card, index) => {
                                    return(
                                        <div className="card" key={index}>
                                            <img 
                                                src={this.state.image_links['cards'][index][card]}
                                                width="100px"
                                                height="100px"
                                            />
                                        </div>
                                    )
                                })
                            }
                        </div>
                        <div className="hand">
                            <p>Hand</p>
                            {
                                this.state.psychics[psychic_id]['hand'].map((card, index) => {
                                    return(
                                        <div className="card" key={index}>
                                            <img 
                                                src={this.state.image_links['dreams'][card]}
                                                width="100px"
                                                height="100px"
                                            />
                                        </div>
                                    )
                                })
                            }
                        </div>
                        
                    </div>
                )
            })
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

