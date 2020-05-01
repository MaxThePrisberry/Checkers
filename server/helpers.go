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

func RemoveElement(s []interface{}, i int) []interface{} {
	//Order will not be maintained in this operation.
	s[i] = s[len(s)-1] 	// Copy last element to index i.

	// Erase last element (write zero value).
	if _, ok := s[len(s)-1].(int); ok {
		s[len(s)-1] = 0
	} else if _, ok := s[len(s)-1].(float64); ok {
		s[len(s)-1] = 0.0
	} else if _, ok := s[len(s)-1].(bool); ok {
		s[len(s)-1] = false
	} else if _, ok := s[len(s)-1].(string); ok {
		s[len(s)-1] = ""
	} else {
		s[len(s)-1] = nil
	}

	s = s[:len(s)-1]	// Truncate slice.
	return s
}
