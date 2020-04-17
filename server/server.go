package main

import (
	"fmt"
	"net/http"
	"github.com/gorilla/websocket"
	"log"
	"helpers"
	"errors"
	"encoding/json"
)

const gamePort = ":1234"

var upgrader = websocket.Upgrader{}
var games []Game //Slice of current games open or running
var pprofs map[string]*PlayerProfile //Slice of current players

type PlayerProfile struct {
	Name string
	Conn *websocket.Conn
}

func sendPlayerPacket(pid string) (err error) {
	message := append(append(append(append([]byte("{\"PID\":\""),[]byte(pid)...),[]byte("\",\"Name\":\"")...),[]byte(pprofs[pid].Name)...),[]byte("\"}")...)
	fmt.Printf("Your message is: %v\n", string(message))
	err = pprofs[pid].Conn.WriteMessage(websocket.TextMessage,message)
	return
}

func readPlayerPacket(pid string, packet []byte) (err error) { //Reads and updates appropriate entry in pprofs
	var ppacket map[string]string
	if err = json.Unmarshal(packet, &ppacket); err != nil {
		return
	}
	if ppacket["PID"] != pid {
		return errors.New("PIDs don't match up in incomming packet and assigned PID.")
	}
	pprofs[pid].Name = ppacket["Name"]
	fmt.Printf("Just finished manipulating this packet: %v\n", string(packet))
	return
}

type Game struct {
	P1PID, P2PID, Turn string
	P1Checkers, P2Checkers [12][3]int //Each checker has: [x-coordinate, y-coordinate, king? (1==yes, 0==no)]
}

func newConnection(w http.ResponseWriter, r *http.Request) {
	//Enact websocket handshakes and get connection object
	upgrader.CheckOrigin = func(r *http.Request) bool {return true} //Insecure: permits cross-site forgeries
	conn, err := upgrader.Upgrade(w, r, nil)//"conn" should be the first result here
	if err != nil {
		fmt.Println(err)
		return
	}

	//Make new new PID and player profile
	pid := helpers.RandString(10)
	for _, found := pprofs[pid]; found; _, found = pprofs[pid] {
		pid = helpers.RandString(10)
	}
	pprofs[pid] = &PlayerProfile{Conn:conn}

	//Send new PID to computer in a player info packet
	if err := sendPlayerPacket(pid); err != nil {
		fmt.Println(err)
		return
	}

	//Call newGame()
	go newGame(pid)
}

func newGame(pid string) {
	//Wait for new player info packet to signify that the computer is ready to be put into a game
	_, packet, err := pprofs[pid].Conn.ReadMessage()
	if err != nil {
		fmt.Println(err)
		return
	}
	if err = readPlayerPacket(pid, packet); err != nil {
		fmt.Println(err)
		return
	}

	//Call findGame()
	go findGame(pid)
}

func findGame(pid string) {
	//Search through the slice "games" for games with only one player. If found, add player and then call runGame() and return
	for i, game := range games {
		if game.P1PID != "" && game.P2PID == "" {
			game.P2PID = pid
			go runGame(i)
			return
		}
	}

	//Open a new Game and append it to the slice "games"
	games = append(games, Game{P1PID:pid})
}

func runGame(gameIndex int) {
	game := games[gameIndex]
	game.Turn = game.P1PID
	game.P1Checkers = [12][3]int{
		{0,0,0},
		{2,0,0},
		{4,0,0},
		{6,0,0},
		{1,1,0},
		{3,1,0},
		{5,1,0},
		{7,1,0},
		{0,2,0},
		{2,2,0},
		{4,2,0},
		{6,2,0},
	}
	game.P2Checkers = [12][3]int{
		{1,7,0},
		{3,7,0},
		{5,7,0},
		{7,7,0},
		{0,6,0},
		{2,6,0},
		{4,6,0},
		{6,6,0},
		{1,5,0},
		{3,5,0},
		{5,5,0},
		{7,5,0},
	}
	//Send the opposing player's info packet to each player

	for len(game.P1Checkers) > 0 && len(game.P2Checkers) > 0 {
		//Check if the connection for who's turn it is is still active. If not, remove all players' checkers and send the packet to the opposing player. Then remove the game, call newGame() for active player, and return

		//Call PlayerMove(). If "false", remove all players' checkers and send the packet to the opposing player. Then remove the game, call newGame() for active player, and return

		//Change turn in game

	}
	//Send both players a board state packet to let them know the game is over

	//Call newGame() for both players
}

func PlayerMove(game *Game, pid string) bool {
	for {
		//Send the player with pid a game state packet, signifying that it's their turn

		//Wait for move packet. If error occurs (a.k.a. connection cut), return "false"

		//Check if move packet is legal. If legal, update players' checkers states in game and return "true"
	}
}

func main() {
	//Initialize the pprofs map
	pprofs = make(map[string]*PlayerProfile)
	//Have the newConnection function handle all connections
	http.HandleFunc("/", newConnection)
	//Start listening at gamePort
	log.Fatal(http.ListenAndServe(gamePort, nil))
}
