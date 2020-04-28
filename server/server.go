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

type Game struct {
	P1PID, P2PID string
	P1Turn bool
	P1Checkers, P2Checkers [12][3]int //Each checker has: [x-coordinate, y-coordinate, king? (1==yes, 0==no)]
}

func flipCheckers(checkers [12][3]int) [12][3]int {
	for i, _ := range checkers {
		checkers[i][0] = 7 - checkers[i][0]
		checkers[i][1] = 7 - checkers[i][1]
	}
	return checkers
}

func sendUniversalPacket(game *Game, pid string) (err error) {
	//Put together packet
	packet := make(map[string]interface{})
	packet["PID"] = pid
	if game == nil {
		packet["Name"] = nil
		packet["Turn"] = nil
		packet["fC"] = nil
		packet["eC"] = nil
	} else if game.P1PID == pid {
		packet["Name"] = pprofs[game.P2PID].Name
		packet["Turn"] = game.P1Turn
		packet["fC"] = game.P1Checkers
		packet["eC"] = game.P2Checkers
	} else { //game.P2PID == pid
		packet["Name"] = pprofs[game.P1PID].Name
		packet["Turn"] = !game.P1Turn
		//One has to flip the checkers because the board is laid out from the view of Player 1
		packet["fC"] = flipCheckers(game.P2Checkers)
		packet["eC"] = flipCheckers(game.P1Checkers)
	}

	//Send packet to user
	b, err := json.Marshal(packet)
	if err != nil {
		return
	}
	fmt.Printf("Just SENT: %v\n", string(b))
	err = pprofs[pid].Conn.WriteMessage(websocket.TextMessage,b)
	return
}

func readUniversalPacket(pid string) (upacket map[string]interface{}, err error) { //Gets, reads, and returns information received from player
	_, packet, err := pprofs[pid].Conn.ReadMessage()
	if err != nil {
		return
	}
	if err = json.Unmarshal(packet, &upacket); err != nil {
		return
	}
	if upacket["PID"] != pid {
		err = errors.New("PIDs don't match up in incomming packet and assigned PID.")
		return
	}
	playername, ok := upacket["Name"].(string)
	if !ok {
		err = errors.New("The packet recieved from the player didn't have a string as the value for the key 'Name'")
		return
	} else {
		pprofs[pid].Name = playername
	}
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
	if err := sendUniversalPacket(nil,pid); err != nil {
		fmt.Println(err)
		return
	}

	//Call newGame()
	go newGame(pid)
}

func newGame(pid string) {
	//Wait for new player info packet to signify that the computer is ready to be put into a game
	if _, err := readUniversalPacket(pid); err != nil {
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
	game.P1Checkers = [12][3]int{
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
	game.P2Checkers = [12][3]int{
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
	//Send the opposing player's info packet to each player
	if err := sendUniversalPacket(game, game.P2PID); err != nil {
		fmt.Println(err)
		KickPlayer(game, game.P2PID)
	}

	var pid string
	for len(game.P1Checkers) > 0 && len(game.P2Checkers) > 0 {
		if game.P1Turn {
			pid = game.P1PID
		} else {
			pid = game.P2PID
		}

		//Check if the connection for who's turn it is is still active. If not, call KickPlayer() and return

		//Call PlayerMove(). If "false", remove all players' checkers and send the packet to the opposing player. Then remove the game, call newGame() for active player, and return
		if noprob := PlayerMove(game, pid); !noprob {
			fmt.Println("Looks like we have a problem. ;)")
		}

		//Change turn in game
		game.P1Turn = !game.P1Turn
	}
	//Send both players a board state packet to let them know the game is over

	//Call newGame() for both players
}

func KickPlayer(game *Game, pid string) {
	//Remove PID entry for player

	//If in game, remove all players' checkers and send the packet to the opposing player

	//Remove the game, call newGame() for active player, and return
}

func PlayerMove(game *Game, pid string) bool {
	var moveLegal bool
	for {
		//Send the player with pid a game state packet, signifying that it's their turn
		if err := sendUniversalPacket(game, pid); err != nil {
			fmt.Println(err)
		} else {
			//Wait for move packet. If error occurs (a.k.a. connection cut), return "false"
			upacket, err := readUniversalPacket(pid)
			if err != nil {
				fmt.Println(err)
				return false
			}

			//Check if move packet is legal.
			moveLegal = true

			//If legal, update players' checkers states in game and return "true". If not legal, do nothing and the for loop will repeat prompting the user for a move
			if moveLegal {
				if game.P1Turn {
					game.P1Checkers = upacket[mC]
				} else {
					game.P2Checkers = upacket[mC]
				}
				return true
			}
		}
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
