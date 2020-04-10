package helpers

import (
	"time"
	"math/rand"
)

func FindString(x string, y []string) int {
	for i, v := range y {
		if v == x {
			return i
		}
	}
	return -1
}

func RandString(l int) (result string) {
	rg := rand.New(rand.NewSource(time.Now().UnixNano()))
        const options = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        for i := 0; i < l; i++ {
		result += string(options[rg.Intn(len(options))])
	}
	return
}
