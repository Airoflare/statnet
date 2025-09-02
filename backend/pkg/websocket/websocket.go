package websocket

import (
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	"backend/pkg/monitor"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		allowedOriginsStr := os.Getenv("ALLOWED_CORS_ORIGINS")
		if allowedOriginsStr == "" {
			allowedOriginsStr = "localhost,127.0.0.1"
		}
		allowedOrigins := strings.Split(allowedOriginsStr, ",")

		origin := r.Header.Get("Origin")

		for _, o := range allowedOrigins {
			o = strings.TrimSpace(o)
			if o == "" {
				continue
			}

			if !strings.HasPrefix(o, "http://") && !strings.HasPrefix(o, "https://") {
				o = "http://" + o
			}

			if strings.HasPrefix(origin, o) {
				return true
			}
		}
		return false
	},
}

// WebSocket handler for real-time data updates
func WsHandler(w http.ResponseWriter, r *http.Request, mon *monitor.Monitor) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade failed:", err)
		return
	}
	defer conn.Close()

	log.Println("A WebSocket client connected")

	for {
		combinedData := mon.GetCombinedData()

		err = conn.WriteJSON(combinedData)
		if err != nil {
			log.Printf("WebSocket write failed: %v", err)
			break
		}
		time.Sleep(time.Second)
	}

	log.Println("WebSocket client disconnected")
}
