package main

import (
	"fmt"
	"net/http"
	"github.com/gorilla/websocket"
	"log"
//	"time"
//	"bufio"
)

//func handleConnection(conn net.Conn) {
//	if _, err := conn.Write([]byte("Hey, what's up?")); err != nil {
//		fmt.Println("Writing on the connection seems to have had an error: %v", err)
//		return
//	}
//	conn.Close()
//	bufReader := bufio.NewReader(conn)
//	for {
//		conn.SetReadDeadline(time.Now().Add(10 * time.Second))
//		response, err := bufReader.ReadBytes('\n')
//		if err != nil {fmt.Println("The noob connection didn't talk a lot so we dropped it.... :/");return}
//		if _, err := conn.Write(append([]byte("I think that the following sucks: ")[:],response[:]...)); err != nil {
//			fmt.Println("Writing on the connection seems to have had an error: %v", err)
//			return
//		}
//	}
//	conn.Write([]byte("You just got shut down. :)"))
//	fmt.Println("One connection just closed itself")
//	conn.Close()
//}

var upgrader = websocket.Upgrader{}

func handler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println("Error with the upgrade. ;)")
		return
	}
	for {
	    messageType, p, err := conn.ReadMessage();
	    if err != nil {
		log.Println("Error with reading a message.")
		return
	    }
	    if err := conn.WriteMessage(messageType, p); err != nil {
		log.Println("Error with writing a message.")
		return
	    }
	}
}

func main() {
	http.HandleFunc("/", handler)
	log.Fatal(http.ListenAndServe(":1234", nil))
}
