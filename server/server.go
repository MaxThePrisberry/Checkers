package main

import (
	"fmt"
	"net/http"
	"github.com/gorilla/websocket"
	"log"
	"helpers"
	"errors"
	"github.com/json-iterator/go"
)

const gamePort = ":1234"

var upgrader = websocket.Upgrader{}
var games []Game //Slice of current games open or running
var pprofs map[string]*PlayerProfile //Slice of current players
var codes map[string]int

type PlayerProfile struct {
	Name string
	Conn *websocket.Conn
}

type Game struct {
	P1PID, P2PID string
	P1Turn bool
	P1Checkers, P2Checkers [][3]int //Each checker has: [x-coordinate, y-coordinate, king? (1==yes, 0==no)]
}

type ReceivedPacket struct {
	PID, Name string
	MC [][3]int
}

func flipCheckers(checkers [][3]int) [][3]int {
	var flippedCheckers [][3]int
	for _, val := range checkers {
		flippedCheckers = append(flippedCheckers, [][3]int{{7 - val[0], 7 - val[1], val[2]}}...)
	}
	return flippedCheckers
}

func sendUniversalPacket(game *Game, pid string, code string) (err error) {
	//Put together packet
	packet := make(map[string]interface{})
	packet["PID"] = pid
	if game == nil {
		packet["Name"] = nil
		packet["Code"] = nil
		packet["fC"] = nil
		packet["eC"] = nil
	} else if game.P1PID == pid {
		packet["Name"] = pprofs[game.P2PID].Name
		packet["Code"] = codes[code]
		packet["fC"] = game.P1Checkers
		packet["eC"] = game.P2Checkers
	} else { //game.P2PID == pid
		packet["Name"] = pprofs[game.P1PID].Name
		packet["Code"] = codes[code]
		//One has to flip the checkers because the board is laid out from the view of Player 1
		packet["fC"] = flipCheckers(game.P2Checkers)
		packet["eC"] = flipCheckers(game.P1Checkers)
	}

	//Send packet to user
	b, err := jsoniter.Marshal(packet)
	if err != nil {
		return
	}
	fmt.Printf("Just SENT: %v\n", string(b))
	err = pprofs[pid].Conn.WriteMessage(websocket.TextMessage,b)
	return
}

func readUniversalPacket(pid string) (upacket ReceivedPacket, err error) { //Gets, reads, and returns information received from player
	_, packet, err := pprofs[pid].Conn.ReadMessage()
	if err != nil {
		return
	}
	if err = jsoniter.Unmarshal(packet, &upacket); err != nil {
		return
	}
	if upacket.PID != pid {
		err = errors.New("PIDs don't match up in incoming packet and assigned PID.")
		return
	}
	pprofs[pid].Name = upacket.Name
	fmt.Printf("Just RECIEVED: %v\n", string(packet))
	return
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
	if err := sendUniversalPacket(nil,pid,""); err != nil {
		fmt.Println(err)
		go KickPlayer(pid)
		return
	}

	//Call newGame()
	go newGame(pid)
}

func newGame(pid string) {
	//Wait for new player info packet to signify that the computer is ready to be put into a game
	if _, err := readUniversalPacket(pid); err != nil {
		fmt.Println(err)
		go KickPlayer(pid)
		return
	}

	//Call findGame()
	go findGame(pid)
}

func findGame(pid string) {
	//Search through the slice "games" for games with only one player. If found, add player and then call runGame() and return
	for i, game := range games {
		if game.P1PID != "" && game.P2PID == "" {
			games[i].P2PID = pid
			go runGame(i)
			return
		}
	}

	//Open a new Game and append it to the slice "games"
	games = append(games, Game{P1PID:pid})
}

func runGame(gameIndex int) {
	game := &games[gameIndex]
	game.P1Turn = true
	game.P1Checkers = [][3]int{
		{1,0,0},
		{3,0,0},
		{5,0,0},
		{7,0,0},
		{0,1,0},
		{2,1,0},
		{4,1,0},
		{6,1,0},
		{1,2,0},
		{3,2,0},
		{5,2,0},
		{7,2,0},
	}
	game.P2Checkers = [][3]int{
		{0,7,0},
		{2,7,0},
		{4,7,0},
		{6,7,0},
		{1,6,0},
		{3,6,0},
		{5,6,0},
		{7,6,0},
		{0,5,0},
		{2,5,0},
		{4,5,0},
		{6,5,0},
	}

	//Send the opposing player's info packet to the player whose turn it isn't

	if err := sendUniversalPacket(game, game.P2PID, "NotTurn"); err != nil {
		fmt.Println(err)
		KickPlayer(game.P2PID)
		return
	}

	var pid string
	for !IsGameOver(game) {
		if game.P1Turn {
			pid = game.P1PID
		} else {
			pid = game.P2PID
		}

		//Check if the connection for who's turn it is is still active. If not, call KickPlayer() and return

		//Call PlayerMove(). If "false", remove all players' checkers and send the packet to the opposing player. Then remove the game, call newGame() for active player, and return
		if noprob := PlayerMove(game, pid); !noprob {
			fmt.Println("Looks like we have a problem. ;)")
			go KickPlayer(pid)
			return
		}

		//Change turn in game
		game.P1Turn = !game.P1Turn
	}
	//Send both players a board state packet to let them know the game is over

	//Call newGame() for both players
}

func KickPlayer(pid string) {
	fmt.Println("Kicking player with pid '%v'", pid)
	//Remove PID entry for player
	delete(pprofs, pid)

	//If in game, remove all players' checkers and send the packet to the opposing player -- sort out all aftermath of the dead game

	//Remove the game, call newGame() for active player, and return
}

func PlayerMove(game *Game, pid string) bool {
	var moveLegal bool
	for {
		//Send the player with pid a game state packet, signifying that it's their turn
		if err := sendUniversalPacket(game, pid, "YourTurn"); err != nil {
			fmt.Println(err)
			return false
		} else {
			//Wait for move packet. If error occurs (a.k.a. connection cut), return "false"
			upacket, err := readUniversalPacket(pid)
			if err != nil {
				fmt.Println(err)
				return false
			}

			//Check if move packet is legal.
			moveLegal = true
			//Find checker that moved (old and new position)
			//Recursively check possible moves
			//Check that actual move is in possible moves

			//If legal, update players' checkers states in game and return "true". If not legal, do nothing and the for loop will repeat prompting the user for a move
			if moveLegal {
				if game.P1Turn {
					game.P1Checkers = upacket.MC
				} else {
					game.P2Checkers = flipCheckers(upacket.MC)
				}
				return true
			}
		}
	}
}

func IsGameOver(game *Game) bool {
	//Run tests to check if given game is over or not

	return false
}

func main() {
	//Initialize the pprofs map
	pprofs = make(map[string]*PlayerProfile)
	//Initialize the codes map
	codes = map[string]int{
		"NotTurn":0,
		"YourTurn":1,
		"YouWin":2,
		"YouLose":3,
		"OthPlyDiscon":4, //Other Player Disconnected
	}
	//Have the newConnection function handle all connections
	http.HandleFunc("/", newConnection)
	//Start listening at gamePort
	log.Fatal(http.ListenAndServe(gamePort, nil))
}
