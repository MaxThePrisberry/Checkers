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

func FindChecker(checker [3]int, checkers [][3]int) int {
	for i, v := range checkers {
		if v[0] == checker[0] && v[1] == checker[1] && v[2] == checker[2] {
			return i
		}
	}
	return -1
}

func RemoveChecker(checker [3]int, checkers [][3]int) [][3]int {
	if len(checkers) <= 0 {
		return checkers
	}
	checkers[FindChecker(checker, checkers)] = checkers[len(checkers)-1]
	checkers[len(checkers)-1] = [3]int{}
	return checkers[:len(checkers)-1]
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
