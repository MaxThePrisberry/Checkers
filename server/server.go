package main

import (
	"os"
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
	SC [][3]int
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
	log.Printf("Packet to %v\n", pid)
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
	log.Printf("Packet from %v\n", pid)
	return
}

func newConnection(w http.ResponseWriter, r *http.Request) {
	//Enact websocket handshakes and get connection object
	upgrader.CheckOrigin = func(r *http.Request) bool {return true} //Insecure: permits cross-site forgeries
	conn, err := upgrader.Upgrade(w, r, nil)//"conn" should be the first result here
	if err != nil {
		log.Println(err)
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
		log.Println(err)
		go KickPlayer(pid)
		return
	}

	//Call newGame()
	go newGame(pid)
}

func newGame(pid string) {
	//Wait for new player info packet to signify that the computer is ready to be put into a game
	if _, err := readUniversalPacket(pid); err != nil {
		log.Println(err)
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
		log.Println(err)
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

		//Call PlayerMove(). If "false", call KickPlayer()
		if noprob := PlayerMove(game, pid); !noprob {
			log.Printf("PlayerMove() ran into a problem talking with the player (with PID %v)\n", pid)
			go KickPlayer(pid)
			return
		}

		//Change turn in game
		game.P1Turn = !game.P1Turn
	}

	//Send a packet to each player telling them the outcome of the game
	var P1code, P2code string
	if game.P1Turn {
		P1code = "YouLose"
		P2code = "YouWin"
	} else {
		P1code = "YouWin"
		P2code = "YouLose"
	}
	if err := sendUniversalPacket(game, game.P1PID, P1code); err != nil {
		go KickPlayer(game.P1PID)
		return
	}
	if err := sendUniversalPacket(game, game.P2PID, P2code); err != nil {
		go KickPlayer(game.P2PID)
		return
	}

	//Call newGame() for both players
	go newGame(game.P1PID)
	go newGame(game.P2PID)

	//Remove the game
	if len(games) == 0 {
		games = []Game{}
	} else {
		games[gameIndex] = games[len(games)-1]
		games[len(games)-1] = Game{}
		games = games[:len(games)-1]
	}
}

func KickPlayer(pid string) {
	log.Printf("Kicking player with pid '%v'\n", pid)

	//If in game, send packet to the opposing player saying opponent disconnected -- sort out all aftermath of the dead game
	for i, game := range games {
		if game.P1PID == pid || game.P2PID == pid {//If player being kicked is in this game
			//Find active player's PID
			var otherPlayerPID string
			if game.P1PID == pid {
				otherPlayerPID = game.P2PID
			} else if game.P2PID == pid {
				otherPlayerPID = game.P1PID
			}

			//Tell active player that their opponent disconnected and send them to newGame()
			if err := sendUniversalPacket(&games[i], otherPlayerPID, "OthPlyDiscon"); err != nil {
				go KickPlayer(otherPlayerPID)
			} else {
				go newGame(otherPlayerPID)
			}

			//Remove the game
			if len(games) == 0 {
				games = []Game{}
			} else {
				games[i] = games[len(games)-1]
				games[len(games)-1] = Game{}
				games = games[:len(games)-1]
			}

			break
		}
	}

	//Remove PID entry for player
	delete(pprofs, pid)
}

func PlayerMove(game *Game, pid string) bool {
	var moveLegal bool
	for {
		//Send the player with pid a game state packet, signifying that it's their turn
		if err := sendUniversalPacket(game, pid, "YourTurn"); err != nil {
			log.Println(err)
			return false
		} else {
			//Wait for move packet. If error occurs (a.k.a. connection cut), return "false"
			upacket, err := readUniversalPacket(pid)
			if err != nil {
				log.Println(err)
				return false
			}

			//Check if move packet is legal.
			moveLegal = true
			//Find checker that moved (old and new position)
			newPos := [][3]int{}
			oldPos := [][3]int{}
			var originalCheckers [][3]int
			if game.P1Turn {
				originalCheckers = game.P1Checkers
			} else {
				originalCheckers = game.P2Checkers
				upacket.MC = flipCheckers(upacket.MC)
			}
			for _, checker := range upacket.MC {//Find new position of moved checker
				if iy := helpers.FindChecker(checker, originalCheckers); iy == -1 {
					newPos = append(newPos,checker)
				}
			}
			for _, checker := range originalCheckers {//Find new position of moved checker
				if iy := helpers.FindChecker(checker, upacket.MC); iy == -1 {
					oldPos = append(oldPos,checker)
				}
			}
			if len(newPos) != 1 || len(oldPos) != 1 {
				moveLegal = false
			}

			//Check that move was in the map
			if moveLegal && (newPos[0][0]<0 || newPos[0][0]>7 || newPos[0][1]<0 || newPos[0][1]>7) {
				moveLegal = false
			}

			//Check if move was a normal adjacent square move and if so, was it legal
			if moveLegal && (
				(oldPos[0][2] == 1 &&//If it's a king
				(oldPos[0][0]+1 == newPos[0][0] || oldPos[0][0]-1 == newPos[0][0]) &&
				(oldPos[0][1]+1 == newPos[0][1] || oldPos[0][1]-1 == newPos[0][1])) ||
				(oldPos[0][2] == 0 &&//If it's a normal P1 piece
				(oldPos[0][0]+1 == newPos[0][0] || oldPos[0][0]-1 == newPos[0][0]) &&
				(oldPos[0][1]+1 == newPos[0][1]) &&
				game.P1Turn) ||
				(oldPos[0][2] == 0 &&//If it's a normal P2 piece
				(oldPos[0][0]+1 == newPos[0][0] || oldPos[0][0]-1 == newPos[0][0]) &&
				(oldPos[0][1]-1 == newPos[0][1]) &&
				!game.P1Turn)) {
				//If the move was to an adjacent square, make sure that square was empty
				if !PositionEmpty(game, [2]int{newPos[0][0],newPos[0][1]}) {
					moveLegal = false
				}
			} else if moveLegal &&//It was a jump
				(((oldPos[0][0]+newPos[0][0]) % 2 != 0 || (oldPos[0][1]+newPos[0][1]) % 2 != 0) ||//And the jumps weren't by twos
				(game.P1Turn && oldPos[0][2] != 1 && newPos[0][1] <= oldPos[0][1]) ||//A normal P1 piece is not moving forwards
				(!game.P1Turn && oldPos[0][2] != 1 && newPos[0][1] >= oldPos[0][1]) ||//A normal P2 piece is not moving forwards
				(newPos[0][0]+newPos[0][1])%2 == 0) {//The new position is on the wrong color of square
				moveLegal = false
			}

			//Check if the checker was illegally "crowned"
			if moveLegal && !((game.P1Turn && newPos[0][1] == 7) || (!game.P1Turn && newPos[0][1] == 0)) && newPos[0][2] == 1 && oldPos[0][2] == 0 {
				moveLegal = false
			}

			//If legal, update players' checkers states in game and return "true". If not legal, do nothing and the for loop will repeat prompting the user for a move
			if moveLegal {
				if game.P1Turn {
					game.P1Checkers = upacket.MC
					for _, checker := range upacket.SC {
						game.P2Checkers = helpers.RemoveChecker(checker, game.P2Checkers)
					}
				} else {
					game.P2Checkers = upacket.MC
					upacket.SC = flipCheckers(upacket.SC)
					for _, checker := range upacket.SC {
						game.P1Checkers = helpers.RemoveChecker(checker, game.P1Checkers)
					}
				}
				return true
			}
		}
	}
}

func IsGameOver(game *Game) bool {
	//Run tests to check if P1 in given game can move or not
	//NEED TO CHECK IF THERE ARE NO CHECKERS AND IF ONE PLAYER CAN'T MAKE A MOVE BUT THE OTHER CAN
	var fCheckers, eCheckers [][3]int
	var possibleMoves [][2]int
	if game.P1Turn {
		fCheckers = game.P1Checkers
		eCheckers = game.P2Checkers
	} else {
		fCheckers = game.P2Checkers
		eCheckers = game.P1Checkers
	}
	for _, checker := range fCheckers {
		//Collect possible normal moves
		possibleJumps := [][2]int{}
		if game.P1Turn {
			possibleMoves = [][2]int{{checker[0]-1,checker[1]+1},{checker[0]+1,checker[1]+1}}
		} else {
			possibleMoves = [][2]int{{checker[0]-1,checker[1]-1},{checker[0]+1,checker[1]-1}}
		}
		if checker[2] == 1 {
			possibleMoves = [][2]int{{checker[0]-1,checker[1]+1},{checker[0]+1,checker[1]+1},{checker[0]-1,checker[1]-1},{checker[0]+1,checker[1]-1}}
		}

		//Check normal moves are on the map and aren't already filled with a checker. If filled with a checker, add to possibleJumps
		for _, move := range possibleMoves {
			if move[0]>=0 && move[0]<=7 && move[1]>=0 && move[1]<=7 {
				if PositionEmpty(game,move) {
					return false
				} else {
					possibleJumps = append(possibleJumps, [2]int{move[0]+(move[0]-checker[0]),move[1]+(move[1]-checker[1])})
				}
			}
		}

		//Check that jumps are on the board, will jump to empty spot, and that will jump ENEMY checker
		for _, jump := range possibleJumps {
			if jump[0]>=0 && jump[0]<=7 && jump[1]>=0 && jump[1]<=7 && PositionEmpty(game,jump) {
				for _, checker := range eCheckers {
					if checker[0] == (checker[0]+(jump[0]-checker[0])/2) && checker[1] == (checker[1]+(jump[1]-checker[1])/2) {
						return false
					}
				}
			}
		}
	}

	//If this code is reached, that means that the player whose turn it is doesn't have any possible moves and therefore the game is over
	return true
}

func PositionEmpty(game *Game, position [2]int) bool {//Returns if there already is a checker in the given position in the given game
	for _, checker := range game.P1Checkers {
		if checker[0] == position[0] && checker[1] == position[1] {
			return false
		}
	}
	for _, checker := range game.P2Checkers {
		if checker[0] == position[0] && checker[1] == position[1] {
			return false
		}
	}
	return true
}

func main() {
	//Get logging up and running
	f, err := os.OpenFile("LogFile.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
	    log.Fatalf("Error opening file: %v", err)
	}
	defer f.Close()
	log.SetOutput(f)

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
