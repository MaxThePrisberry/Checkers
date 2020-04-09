package main

import (
	"fmt"
	"net"
	"time"
	"bufio"
)

func handleConnection(conn net.Conn) {
	if _, err := conn.Write([]byte("Hey, what's up?")); err != nil {
		fmt.Println("Writing on the connection seems to have had an error: %v", err)
		return
	}
	bufReader := bufio.NewReader(conn)
	for {
		conn.SetReadDeadline(time.Now().Add(10 * time.Second))
		response, err := bufReader.ReadBytes('\n')
		if err != nil {fmt.Println("The noob connection didn't talk a lot so we dropped it.... :/");return}
		if _, err := conn.Write(append([]byte("I think that the following sucks: ")[:],response[:]...)); err != nil {
			fmt.Println("Writing on the connection seems to have had an error: %v", err)
			return
		}
	}
//	conn.Write([]byte("You just got shut down. :)"))
//	fmt.Println("One connection just closed itself")
//	conn.Close()
}

func main() {
	listener, err := net.Listen("tcp", ":1234")
	if err != nil {
		fmt.Println("Your listener has an error")
	} else {
		for {
			conn, err := listener.Accept()
			if err != nil {
				fmt.Println("The connection has an error")
			} else {
				go handleConnection(conn)
			}
		}
	}
}
