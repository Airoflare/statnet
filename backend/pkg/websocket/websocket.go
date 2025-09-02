package websocket

import (
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	"backend/pkg/monitor"
)

var (
	upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			allowedOriginsStr := os.Getenv("ALLOWED_CORS_ORIGINS")
			if allowedOriginsStr == "" {
				allowedOriginsStr = "http://localhost" // Default value
			}
			allowedOrigins := strings.Split(allowedOriginsStr, ",")

			// Add defaults: localhost + loopback IPs
			allowedOrigins = append(allowedOrigins,
				"http://localhost",
				"http://127.0.0.1",
			)

			// Allow Network Interface Ipv4 IPs: ex http://10.0.0.23:80
			ifaces, _ := net.Interfaces()
			for _, iface := range ifaces {
				addrs, _ := iface.Addrs()
				for _, addr := range addrs {
					var ip net.IP
					switch v := addr.(type) {
					case *net.IPNet:
						ip = v.IP
					case *net.IPAddr:
						ip = v.IP
					}
					if ip == nil || ip.IsLoopback() {
						continue
					}
					if ip.To4() != nil {
						allowedOrigins = append(allowedOrigins, "http://"+ip.String())
					}
				}
			}

			origin := r.Header.Get("Origin")
			for _, allowedOrigin := range allowedOrigins {
				if strings.HasPrefix(origin, allowedOrigin) {
					return true
				}
			}
			return false
		},
	}
)

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
		// Get combined data from the monitor
		combinedData := mon.GetCombinedData()

		// Send data over WebSocket
		err = conn.WriteJSON(combinedData)
		if err != nil {
			log.Printf("WebSocket write failed: %v", err)
			break // Exit loop if write fails (client disconnected)
		}
		time.Sleep(time.Second) // Send updates every second
	}

	log.Println("WebSocket client disconnected")
}
