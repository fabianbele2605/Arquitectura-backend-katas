package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
)

// Order representa una orden
type Order struct {
	ID        int       `json:"id"`
	Product   string    `json:"product"`
	Quantity  int       `json:"quantity"`
	Price     float64   `json:"price"`
	CreatedAt time.Time `json:"createdAt"`
}

// ESTADO: Slice que guarda las órdenes en memoria
var (
	orders  []Order
	nextID  = 1
	mu      sync.Mutex // CRÍTICO: Protege el acceso concurrente (sin esto hay race conditions)
)

// Crear orden
func createOrder(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var input Order
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// EFECTO SECUNDARIO: Modificamos el estado
	mu.Lock() // Bloquear: Solo UNA goroutine puede entrar aquí
	newOrder := Order{
		ID:        nextID,
		Product:   input.Product,
		Quantity:  input.Quantity,
		Price:     input.Price,
		CreatedAt: time.Now(),
	}
	nextID++
	orders = append(orders, newOrder)
	mu.Unlock() // Desbloquear: Permitir que otra goroutine entre

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newOrder)
}

// Consultar órdenes
func getOrders(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Proteger lectura también (evitar leer mientras se modifica)
	mu.Lock()
	ordersCopy := orders
	mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ordersCopy)
}

func main() {
	http.HandleFunc("/orders", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			createOrder(w, r)
		} else if r.Method == http.MethodGet {
			getOrders(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	port := ":3001"
	fmt.Printf("Server running on http://localhost%s\n", port)
	fmt.Println("Estado: EN MEMORIA con MUTEX (thread-safe)")
	http.ListenAndServe(port, nil)
}
