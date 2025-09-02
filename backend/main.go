package main

import (
	"log"
	"net/http"

	"backend/pkg/monitor"
	"backend/pkg/websocket"
)

const (
	staticFilesPath = "./static" // Path to the Next.js 'out' directory
)

func main() {
	// Initialize and start the monitor
	appMonitor := monitor.NewMonitor()
	go appMonitor.StartCollection()

	// Serve static files
	fs := http.FileServer(http.Dir(staticFilesPath))
	http.Handle("/", fs)

	// WebSocket route
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		websocket.WsHandler(w, r, appMonitor)
	})

	log.Println("Server starting on port 80...")
	http.ListenAndServe("0.0.0.0:80", nil) //bind to all interfaces
}