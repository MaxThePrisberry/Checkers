package main

import (
	"fmt"
	"net/http"
	"github.com/gorilla/websocket"
	"log"
)

var upgrader = websocket.Upgrader{}

func handler(w http.ResponseWriter, r *http.Request) {
	upgrader.CheckOrigin = func(r *http.Request) bool {return true}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println("Error with the upgrade. ;)")
		fmt.Println(err)
		return
	}
	for {
		_, p, err := conn.ReadMessage() //The first arguement is messageType
		if err != nil {
			log.Println(err)
			return
		}
		fmt.Printf("Just recieved this message: %v\n", string(p))
		if err := conn.WriteMessage(websocket.TextMessage, append([]byte("You just sent this, right: "), p[:]...)); err != nil {
			log.Println(err)
			return
		}
	}
}

func main() {
	http.HandleFunc("/", handler)
	log.Fatal(http.ListenAndServe(":1234", nil))
}
