const prod = {
	url: {
		API_URL: 'wss://mysterium-backend.herokuapp.com/game',
	}
};

const dev = {
 url: {
  API_URL: 'ws://localhost:8002/game'
 }
};

export const config = process.env.NODE_ENV === 'development' ? dev : prod;